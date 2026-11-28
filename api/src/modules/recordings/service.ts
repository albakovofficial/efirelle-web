import type { AppContext } from "../../context.js";
import { badRequest, forbidden, notFound, tooManyRequests } from "../../lib/http.js";
import type { ChannelDto, ChannelRepository, ChannelRow } from "../channels/repository.js";

/** Записи эфиров хранит медиасервер столько (см. recordDeleteAfter в deploy/provision.sh). */
const RECORDINGS_KEEP_HOURS = 72;
/** Клип — последние N секунд эфира. Задержка эфира ~5 с, её тоже отматываем. */
export const CLIP_SECONDS = 30;
const LATENCY_SECONDS = 5;
/** Запись дописывается кусками по секунде: ждём, прежде чем вырезать клип. */
const CLIP_SETTLE_MS = 8_000;
const CLIPS_PER_USER_PER_DAY = 20;
const CLIP_MAX_BYTES = 80 * 1024 * 1024;

export interface RecordingDto {
  id: string;
  title: string;
  category: string;
  startedAt: string;
  durationSeconds: number;
  peakViewers: number;
  url: string;
}

export interface ClipDto {
  id: string;
  title: string;
  channel: ChannelDto;
  author: string | null;
  status: "processing" | "ready" | "failed";
  url: string | null;
  durationSeconds: number;
  views: number;
  createdAt: string;
}

interface ClipRow {
  id: string;
  channel_id: string;
  title: string;
  author: string | null;
  status: ClipDto["status"];
  url: string | null;
  duration_seconds: number;
  views: number;
  created_at: Date;
}

const CLIP_SELECT = `
  SELECT c.id::text, c.channel_id, c.title, u.display_name AS author, c.status, c.url, c.duration_seconds, c.views, c.created_at
  FROM clips c LEFT JOIN users u ON u.id = c.creator_id`;

/** Записи эфиров (из медиасервера) и клипы (вырезанные файлы). */
export class RecordingService {
  private processing = false;

  constructor(
    private readonly ctx: AppContext,
    private readonly channels: ChannelRepository,
  ) {}

  /** Завершённые эфиры канала, записи которых ещё хранятся. */
  async recordings(channel: ChannelRow): Promise<RecordingDto[]> {
    const rows = await this.ctx.db.rows<{ id: string; title: string; category: string; started_at: Date; ended_at: Date; peak_viewers: number }>(
      `SELECT s.id::text, s.title, cat.name AS category, s.started_at, s.ended_at, s.peak_viewers
       FROM stream_sessions s JOIN categories cat ON cat.id = s.category_id
       WHERE s.channel_id = $1 AND s.ended_at IS NOT NULL AND s.started_at > now() - make_interval(hours => $2)
         AND s.ended_at - s.started_at > interval '1 minute'
       ORDER BY s.started_at DESC LIMIT 20`,
      [channel.id, RECORDINGS_KEEP_HOURS],
    );
    return rows.map((row) => {
      const duration = Math.round((row.ended_at.getTime() - row.started_at.getTime()) / 1000);
      return {
        id: row.id,
        title: row.title || `Эфир ${channel.display_name}`,
        category: row.category,
        startedAt: row.started_at.toISOString(),
        durationSeconds: duration,
        peakViewers: row.peak_viewers,
        url: this.playbackLink(channel.username, row.started_at, duration),
      };
    });
  }

  async clipsOfChannel(channelId: string, limit = 12): Promise<ClipDto[]> {
    const rows = await this.ctx.db.rows<ClipRow>(
      `${CLIP_SELECT} WHERE c.channel_id = $1 AND c.status <> 'failed' ORDER BY c.created_at DESC LIMIT $2`,
      [channelId, limit],
    );
    return this.toDtos(rows);
  }

  /** Свежие популярные клипы платформы — для главной. */
  async popularClips(limit = 12): Promise<ClipDto[]> {
    const rows = await this.ctx.db.rows<ClipRow>(
      `${CLIP_SELECT} WHERE c.status = 'ready' AND c.created_at > now() - interval '7 days'
       ORDER BY c.views DESC, c.created_at DESC LIMIT $1`,
      [limit],
    );
    return this.toDtos(rows);
  }

  async clip(id: string): Promise<ClipDto> {
    const row = await this.ctx.db.one<ClipRow>(`${CLIP_SELECT} WHERE c.id = $1 AND c.status <> 'failed'`, [id]);
    if (!row) throw notFound("Клип не найден");
    return (await this.toDtos([row]))[0]!;
  }

  /** Клип последних 30 секунд идущего эфира. Файл готовится в фоне. */
  async createClip(creatorId: string, channel: ChannelRow, title: string): Promise<ClipDto> {
    if (!channel.live_since || !channel.current_session_id) throw badRequest("Клип можно сделать только во время эфира", "not_live");
    const today = await this.ctx.db.one<{ count: number }>(
      "SELECT count(*)::int AS count FROM clips WHERE creator_id = $1 AND created_at > now() - interval '1 day'",
      [creatorId],
    );
    if ((today?.count ?? 0) >= CLIPS_PER_USER_PER_DAY) throw tooManyRequests("На сегодня клипов хватит — попробуйте завтра");
    const liveFor = (Date.now() - channel.live_since.getTime()) / 1000;
    const duration = Math.max(5, Math.min(CLIP_SECONDS, Math.floor(liveFor - LATENCY_SECONDS)));
    const startAt = new Date(Date.now() - (duration + LATENCY_SECONDS) * 1000);
    const row = await this.ctx.db.one<{ id: string }>(
      `INSERT INTO clips (channel_id, session_id, creator_id, title, start_at, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id::text`,
      [channel.id, channel.current_session_id, creatorId, title, startAt, duration],
    );
    setTimeout(() => void this.processPending().catch(() => undefined), CLIP_SETTLE_MS).unref();
    return this.clip(row!.id);
  }

  async deleteClip(actor: { id: string; role: string }, id: string): Promise<void> {
    const clip = await this.ctx.db.one<{ channel_id: string; creator_id: string | null; url: string | null }>(
      "SELECT channel_id, creator_id, url FROM clips WHERE id = $1",
      [id],
    );
    if (!clip) throw notFound("Клип не найден");
    if (actor.role !== "admin" && actor.id !== clip.channel_id && actor.id !== clip.creator_id) throw forbidden();
    await this.ctx.db.pool.query("DELETE FROM clips WHERE id = $1", [id]);
    await this.ctx.uploads.remove(clip.url);
  }

  async countView(id: string): Promise<void> {
    await this.ctx.db.pool.query("UPDATE clips SET views = views + 1 WHERE id = $1", [id]);
  }

  /** Вырезает файлы для ожидающих клипов. Вызывается после создания клипа и раз в полминуты. */
  async processPending(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      const pending = await this.ctx.db.rows<{ id: string; username: string; start_at: Date; duration_seconds: number; created_at: Date }>(
        `SELECT c.id::text, u.username, c.start_at, c.duration_seconds, c.created_at
         FROM clips c JOIN users u ON u.id = c.channel_id
         WHERE c.status = 'processing' AND c.created_at < now() - make_interval(secs => $1)
         ORDER BY c.id LIMIT 10`,
        [CLIP_SETTLE_MS / 1000 - 1],
      );
      for (const clip of pending) {
        const url = await this.cut(clip.username, clip.start_at, clip.duration_seconds).catch(() => null);
        // Через 10 минут без записи клип считается неудачным (запись могла быть выключена).
        const expired = Date.now() - clip.created_at.getTime() > 10 * 60_000;
        if (url) await this.ctx.db.pool.query("UPDATE clips SET status = 'ready', url = $1 WHERE id = $2", [url, clip.id]);
        else if (expired) await this.ctx.db.pool.query("UPDATE clips SET status = 'failed' WHERE id = $1", [clip.id]);
      }
    } finally {
      this.processing = false;
    }
  }

  /** Публичная ссылка на отрезок записи: nginx передаёт /playback/ медиасерверу. */
  private playbackLink(username: string, start: Date, durationSeconds: number): string {
    const query = new URLSearchParams({ path: `live/${username}`, start: start.toISOString(), duration: String(durationSeconds) });
    return `${this.ctx.config.publicUrl}/playback/get?${query}`;
  }

  private async cut(username: string, start: Date, durationSeconds: number): Promise<string | null> {
    const query = new URLSearchParams({ path: `live/${username}`, start: start.toISOString(), duration: String(durationSeconds), format: "mp4" });
    const response = await fetch(`${this.ctx.config.playbackUrl}/get?${query}`, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) return null;
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length < 1024 || body.length > CLIP_MAX_BYTES) return null;
    return this.ctx.uploads.saveClip(body);
  }

  private async toDtos(rows: ClipRow[]): Promise<ClipDto[]> {
    const channels = new Map<string, ChannelDto | null>();
    const result: ClipDto[] = [];
    for (const row of rows) {
      if (!channels.has(row.channel_id)) {
        const found = await this.channels.byId(row.channel_id);
        channels.set(row.channel_id, found ? this.channels.toChannel(found) : null);
      }
      const channel = channels.get(row.channel_id);
      if (!channel) continue;
      result.push({
        id: row.id,
        title: row.title,
        channel,
        author: row.author,
        status: row.status,
        url: row.url,
        durationSeconds: row.duration_seconds,
        views: row.views,
        createdAt: row.created_at.toISOString(),
      });
    }
    return result;
  }
}
