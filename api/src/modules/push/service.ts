import type { AppContext } from "../../context.js";
import { createApnsSender, type ApnsCredentials, type ApnsPush, type PushDevice, type PushSender } from "./apns.js";
import { activityEndPush, activityStartPush, activityUpdatePush, alertPush, type ActivityState, type PushMessage } from "./payloads.js";

/** Приложение iOS — получатель уведомлений. */
export const APNS_TOPIC = "com.efirelle.app";
/** Повторный эфир в течение этого времени (переподключение OBS) уведомление не рассылает. */
const LIVE_PUSH_COOLDOWN = "30 minutes";
/** Сколько уведомлений отправляется одновременно. */
const BATCH_SIZE = 50;
const SETTINGS_KEY = "apns";
/** Зрители в Live Activity обновляются не чаще раза в минуту — у Apple лимит на обновления. */
const ACTIVITY_UPDATE_INTERVAL_MS = 60_000;

/** Куда деваются токены, которые APNs больше не принимает. */
const FORGET = {
  device: "DELETE FROM devices WHERE token = ANY($1)",
  activityStart: "UPDATE devices SET activity_start_token = NULL WHERE activity_start_token = ANY($1)",
  activity: "DELETE FROM live_activities WHERE token = ANY($1)",
} as const;

export interface PushStatus {
  configured: boolean;
  keyId: string | null;
  teamId: string | null;
  updatedAt: string | null;
}

/**
 * Уведомления и Live Activities на iPhone. Ключ APNs хранится в настройках (вводится в админке сайта),
 * без него ничего не отправляется.
 */
export class PushService {
  private sender: PushSender | null = null;
  private loaded = false;
  /** Что последним ушло в Live Activities канала — чтобы не слать одно и то же. */
  private readonly activityUpdates = new Map<string, { viewers: number; title: string; at: number }>();

  constructor(private readonly ctx: AppContext) {}

  async status(): Promise<PushStatus> {
    const row = await this.ctx.db.one<{ value: ApnsCredentials; updated_at: Date }>(
      "SELECT value, updated_at FROM settings WHERE key = $1",
      [SETTINGS_KEY],
    );
    return {
      configured: row !== null,
      keyId: row?.value.keyId ?? null,
      teamId: row?.value.teamId ?? null,
      updatedAt: row?.updated_at.toISOString() ?? null,
    };
  }

  /** Сохраняет ключ. Неверный ключ отклоняется ещё до сохранения. */
  async configure(credentials: ApnsCredentials): Promise<void> {
    const sender = this.ctx.pushTransport ?? createApnsSender(credentials, APNS_TOPIC);
    await this.ctx.db.pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [SETTINGS_KEY, credentials],
    );
    if (this.sender !== this.ctx.pushTransport) this.sender?.close();
    this.sender = sender;
    this.loaded = true;
  }

  /**
   * Подписчикам канала: «начал эфир». Не чаще раза в полчаса на канал.
   * На iPhone с включёнными Live Activities вместо уведомления запускается Live Activity.
   */
  async notifyLive(channelId: string): Promise<number> {
    const channel = await this.ctx.db.one<{ username: string; display_name: string; title: string }>(
      `UPDATE channels c SET live_push_at = now()
       FROM users u
       WHERE c.user_id = $1 AND u.id = c.user_id
         AND (c.live_push_at IS NULL OR c.live_push_at < now() - $2::interval)
       RETURNING u.username, u.display_name, c.title`,
      [channelId, LIVE_PUSH_COOLDOWN],
    );
    if (!channel) return 0;
    const devices = await this.ctx.db.rows<PushDevice & { activity_start_token: string | null }>(
      `SELECT d.token, d.environment, d.activity_start_token FROM devices d
       JOIN follows f ON f.follower_id = d.user_id
       JOIN users u ON u.id = d.user_id
       WHERE f.channel_id = $1 AND u.push_live AND u.banned_at IS NULL`,
      [channelId],
    );
    const message: PushMessage = {
      title: channel.display_name,
      body: channel.title ? `В эфире: ${channel.title}` : "Начал(а) эфир — заходите!",
      channel: channel.username,
    };
    const starters = devices.flatMap((d) => (d.activity_start_token ? [{ token: d.activity_start_token, environment: d.environment }] : []));
    const others = devices.filter((d) => !d.activity_start_token);
    const state: ActivityState = { title: channel.title, viewers: 0, isLive: true };
    const [alerts, activities] = await Promise.all([
      this.send(others, alertPush(message), FORGET.device),
      this.send(starters, activityStartPush({ slug: channel.username, name: channel.display_name }, state, message), FORGET.activityStart),
    ]);
    return alerts + activities;
  }

  /** Обновляет зрителей и название в Live Activities идущих эфиров. Вызывается по таймеру. */
  async updateActivities(): Promise<void> {
    const rows = await this.ctx.db.rows<PushDevice & { channel_id: string; title: string }>(
      `SELECT a.token, a.environment, a.channel_id::text, c.title FROM live_activities a
       JOIN channels c ON c.user_id = a.channel_id WHERE c.live_since IS NOT NULL`,
    );
    const byChannel = new Map<string, typeof rows>();
    for (const row of rows) byChannel.set(row.channel_id, [...(byChannel.get(row.channel_id) ?? []), row]);
    for (const [channelId, activities] of byChannel) {
      const state: ActivityState = { title: activities[0]!.title, viewers: this.ctx.hub.viewers(channelId), isLive: true };
      const last = this.activityUpdates.get(channelId);
      const changed = !last || last.viewers !== state.viewers || last.title !== state.title;
      if (!changed || (last && Date.now() - last.at < ACTIVITY_UPDATE_INTERVAL_MS)) continue;
      this.activityUpdates.set(channelId, { viewers: state.viewers, title: state.title, at: Date.now() });
      await this.send(activities, activityUpdatePush(state), FORGET.activity);
    }
  }

  /** Эфир закончился: Live Activities канала показывают итог и закрываются. */
  async endActivities(channelId: string): Promise<number> {
    this.activityUpdates.delete(channelId);
    const activities = await this.ctx.db.rows<PushDevice & { title: string }>(
      `DELETE FROM live_activities a USING channels c
       WHERE a.channel_id = $1 AND c.user_id = a.channel_id
       RETURNING a.token, a.environment, c.title`,
      [channelId],
    );
    if (activities.length === 0) return 0;
    return this.send(activities, activityEndPush({ title: activities[0]!.title, viewers: 0, isLive: false }), FORGET.activity);
  }

  /** Уведомление выбранным пользователям (напоминания о запланированных эфирах). */
  async notifyUsers(userIds: string[], message: PushMessage): Promise<number> {
    if (userIds.length === 0) return 0;
    const devices = await this.ctx.db.rows<PushDevice>(
      `SELECT d.token, d.environment FROM devices d JOIN users u ON u.id = d.user_id
       WHERE d.user_id = ANY($1::uuid[]) AND u.banned_at IS NULL`,
      [userIds],
    );
    return this.send(devices, alertPush(message), FORGET.device);
  }

  /** Проверочное уведомление на свои устройства — из админки. */
  async sendTest(userId: string, channel: string): Promise<{ devices: number; sent: number }> {
    const devices = await this.ctx.db.rows<PushDevice>("SELECT token, environment FROM devices WHERE user_id = $1", [userId]);
    const sent = await this.send(devices, alertPush({ title: "Efirelle", body: "Уведомления работают", channel }), FORGET.device);
    return { devices: devices.length, sent };
  }

  close(): void {
    this.sender?.close();
  }

  /** Возвращает, сколько уведомлений доставлено в APNs. Токены, которые APNs отверг, забываются через `forget`. */
  private async send(devices: PushDevice[], push: ApnsPush, forget: (typeof FORGET)[keyof typeof FORGET]): Promise<number> {
    const sender = await this.resolveSender();
    if (!sender || devices.length === 0) return 0;
    let sent = 0;
    for (let start = 0; start < devices.length; start += BATCH_SIZE) {
      const batch = devices.slice(start, start + BATCH_SIZE);
      const results = await Promise.all(batch.map((device) => sender.send(device, push)));
      const gone = batch.filter((_, index) => results[index] === "unregistered").map((device) => device.token);
      sent += results.filter((result) => result === "sent").length;
      if (gone.length) await this.ctx.db.pool.query(forget, [gone]);
    }
    return sent;
  }

  private async resolveSender(): Promise<PushSender | null> {
    if (this.ctx.pushTransport) return this.ctx.pushTransport;
    if (!this.loaded) {
      this.loaded = true;
      const row = await this.ctx.db.one<{ value: ApnsCredentials }>("SELECT value FROM settings WHERE key = $1", [SETTINGS_KEY]);
      if (row) this.sender = createApnsSender(row.value, APNS_TOPIC);
    }
    return this.sender;
  }
}
