import type { AppContext } from "../../context.js";
import type { PushService } from "../push/service.js";
import type { Transcoder } from "./transcoder.js";

/** Эфиры приходят в медиасервер по адресу live/<имя канала>. */
const PATH_PATTERN = /^live\/([a-z0-9_]{3,24})$/;

export function usernameFromPath(path: string): string | null {
  return PATH_PATTERN.exec(path)?.[1] ?? null;
}

/** Состояние эфиров: начало, окончание и сверка с медиасервером. */
export class LiveService {
  constructor(
    private readonly ctx: AppContext,
    private readonly push: PushService,
    private readonly transcoder: Transcoder,
  ) {}

  /** Проверка ключа при подключении OBS. */
  async canPublish(username: string, key: string): Promise<boolean> {
    const row = await this.ctx.db.one(
      `SELECT 1 FROM channels c JOIN users u ON u.id = c.user_id
       WHERE u.username = $1 AND c.stream_key = $2 AND u.banned_at IS NULL`,
      [username, key],
    );
    return row !== null;
  }

  async start(username: string): Promise<void> {
    const channelId = await this.ctx.db.transaction(async (client) => {
      const channel = await this.ctx.db.one<{ user_id: string; title: string; category_id: string; live_since: Date | null }>(
        `SELECT c.user_id, c.title, c.category_id, c.live_since FROM channels c JOIN users u ON u.id = c.user_id
         WHERE u.username = $1 FOR UPDATE OF c`,
        [username],
        client,
      );
      if (!channel || channel.live_since) return null;
      const session = await this.ctx.db.one<{ id: string }>(
        "INSERT INTO stream_sessions (channel_id, title, category_id) VALUES ($1, $2, $3) RETURNING id::text",
        [channel.user_id, channel.title, channel.category_id],
        client,
      );
      await client.query("UPDATE channels SET live_since = now(), current_session_id = $1 WHERE user_id = $2", [session!.id, channel.user_id]);
      return channel.user_id;
    });
    // После перезапуска API эфир уже числится идущим — перекодирование всё равно нужно поднять.
    await this.transcoder.start(username);
    if (!channelId) return;
    this.ctx.hub.broadcast(channelId, { type: "live", live: true });
    // Уведомления не задерживают ответ медиасерверу: ошибка APNs эфир не ломает.
    this.push.notifyLive(channelId).catch(() => undefined);
  }

  async stop(username: string): Promise<void> {
    this.transcoder.stop(username);
    const row = await this.ctx.db.one<{ user_id: string }>(
      `WITH ended AS (
         UPDATE stream_sessions s SET ended_at = now()
         FROM channels c JOIN users u ON u.id = c.user_id
         WHERE u.username = $1 AND s.id = c.current_session_id
         RETURNING c.user_id
       )
       UPDATE channels SET live_since = NULL, current_session_id = NULL
       WHERE user_id = (SELECT user_id FROM ended) RETURNING user_id`,
      [username],
    );
    if (!row) return;
    this.ctx.hub.broadcast(row.user_id, { type: "live", live: false });
    this.push.endActivities(row.user_id).catch(() => undefined);
  }

  /**
   * Сверка с медиасервером: эфиры, которых в нём больше нет, завершаются.
   * Нужна после перезапуска API или медиасервера, когда сигнал об окончании мог потеряться.
   */
  async reconcile(): Promise<void> {
    let ready: Set<string>;
    try {
      const response = await fetch(`${this.ctx.config.mediaApiUrl}/v3/paths/list`, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) return;
      const body = (await response.json()) as { items?: { name: string; ready: boolean }[] };
      ready = new Set((body.items ?? []).filter((p) => p.ready).flatMap((p) => usernameFromPath(p.name) ?? []));
    } catch {
      return; // Медиасервер недоступен — ничего не меняем.
    }
    const live = await this.ctx.db.rows<{ username: string }>(
      "SELECT u.username FROM channels c JOIN users u ON u.id = c.user_id WHERE c.live_since IS NOT NULL",
    );
    for (const { username } of live) {
      if (!ready.has(username)) await this.stop(username);
    }
    for (const username of ready) await this.start(username);
  }

  /** Обновляет пик зрителей у идущих эфиров. */
  async recordPeaks(): Promise<void> {
    const live = await this.ctx.db.rows<{ user_id: string; current_session_id: string }>(
      "SELECT user_id, current_session_id::text FROM channels WHERE current_session_id IS NOT NULL",
    );
    for (const row of live) {
      await this.ctx.db.pool.query("UPDATE stream_sessions SET peak_viewers = GREATEST(peak_viewers, $1) WHERE id = $2", [
        this.ctx.hub.viewers(row.user_id),
        row.current_session_id,
      ]);
    }
  }
}
