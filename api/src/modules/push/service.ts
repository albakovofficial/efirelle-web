import type { AppContext } from "../../context.js";
import { createApnsSender, type ApnsCredentials, type PushDevice, type PushMessage, type PushSender } from "./apns.js";

/** Приложение iOS — получатель уведомлений. */
export const APNS_TOPIC = "com.efirelle.app";
/** Повторный эфир в течение этого времени (переподключение OBS) уведомление не рассылает. */
const LIVE_PUSH_COOLDOWN = "30 minutes";
/** Сколько уведомлений отправляется одновременно. */
const BATCH_SIZE = 50;
const SETTINGS_KEY = "apns";

export interface PushStatus {
  configured: boolean;
  keyId: string | null;
  teamId: string | null;
  updatedAt: string | null;
}

/**
 * Уведомления на iPhone. Ключ APNs хранится в настройках (вводится в админке сайта),
 * без него уведомления просто не отправляются.
 */
export class PushService {
  private sender: PushSender | null = null;
  private loaded = false;

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

  /** Подписчикам канала: «начал эфир». Не чаще раза в полчаса на канал. */
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
    const devices = await this.ctx.db.rows<PushDevice>(
      `SELECT d.token, d.environment FROM devices d
       JOIN follows f ON f.follower_id = d.user_id
       JOIN users u ON u.id = d.user_id
       WHERE f.channel_id = $1 AND u.push_live AND u.banned_at IS NULL`,
      [channelId],
    );
    return this.send(devices, {
      title: channel.display_name,
      body: channel.title ? `В эфире: ${channel.title}` : "Начал(а) эфир — заходите!",
      channel: channel.username,
    });
  }

  /** Уведомление выбранным пользователям (напоминания о запланированных эфирах). */
  async notifyUsers(userIds: string[], message: PushMessage): Promise<number> {
    if (userIds.length === 0) return 0;
    const devices = await this.ctx.db.rows<PushDevice>(
      `SELECT d.token, d.environment FROM devices d JOIN users u ON u.id = d.user_id
       WHERE d.user_id = ANY($1::uuid[]) AND u.banned_at IS NULL`,
      [userIds],
    );
    return this.send(devices, message);
  }

  /** Проверочное уведомление на свои устройства — из админки. */
  async sendTest(userId: string, channel: string): Promise<{ devices: number; sent: number }> {
    const devices = await this.ctx.db.rows<PushDevice>("SELECT token, environment FROM devices WHERE user_id = $1", [userId]);
    const sent = await this.send(devices, { title: "Efirelle", body: "Уведомления работают", channel });
    return { devices: devices.length, sent };
  }

  close(): void {
    this.sender?.close();
  }

  /** Возвращает, сколько уведомлений доставлено в APNs. Отключённые устройства забываются. */
  private async send(devices: PushDevice[], message: PushMessage): Promise<number> {
    const sender = await this.resolveSender();
    if (!sender || devices.length === 0) return 0;
    let sent = 0;
    for (let start = 0; start < devices.length; start += BATCH_SIZE) {
      const batch = devices.slice(start, start + BATCH_SIZE);
      const results = await Promise.all(batch.map((device) => sender.send(device, message)));
      const gone = batch.filter((_, index) => results[index] === "unregistered").map((device) => device.token);
      sent += results.filter((result) => result === "sent").length;
      if (gone.length) await this.ctx.db.pool.query("DELETE FROM devices WHERE token = ANY($1)", [gone]);
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
