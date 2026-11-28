import type { Config } from "../../config.js";
import type { Database, Queryable } from "../../db/database.js";
import { initials } from "../../lib/text.js";
import type { ChatHub } from "../../realtime/hub.js";

/** Строка канала вместе с владельцем и категорией. */
export interface ChannelRow {
  id: string;
  username: string;
  display_name: string;
  tone: string;
  title: string;
  category_id: string;
  category_name: string;
  category_tone: string;
  tags: string[];
  live_since: Date | null;
  current_session_id: string | null;
  followers: number;
}

export interface ChannelDto {
  slug: string;
  name: string;
  initials: string;
  tone: string;
  followers: number;
  verified: boolean;
}

export interface StreamDto {
  id: string;
  channel: ChannelDto;
  title: string;
  category: string;
  categoryId: string;
  tags: string[];
  viewers: number;
  durationSeconds: number;
  quality: string;
  latencySeconds: number;
  status: string;
  tone: string;
  playbackUrl: string;
}

export interface ChannelStatusDto {
  channel: ChannelDto;
  stream: StreamDto | null;
}

const SELECT = `
  SELECT u.id, u.username, u.display_name, u.tone,
         c.title, c.category_id, cat.name AS category_name, cat.tone AS category_tone, c.tags,
         c.live_since, c.current_session_id::text AS current_session_id,
         (SELECT count(*) FROM follows f WHERE f.channel_id = u.id)::int AS followers
  FROM users u
  JOIN channels c ON c.user_id = u.id
  JOIN categories cat ON cat.id = c.category_id
  WHERE u.banned_at IS NULL`;

/** Запросы и преобразования каналов. Единственное место, где канал превращается в ответ API. */
export class ChannelRepository {
  constructor(
    private readonly db: Database,
    private readonly hub: ChatHub,
    private readonly config: Config,
  ) {}

  toChannel(row: ChannelRow): ChannelDto {
    return {
      slug: row.username,
      name: row.display_name,
      initials: initials(row.display_name),
      tone: row.tone,
      followers: row.followers,
      verified: false,
    };
  }

  toStream(row: ChannelRow): StreamDto | null {
    if (!row.live_since || !row.current_session_id) return null;
    const title = row.title || `Эфир ${row.display_name}`;
    return {
      id: row.current_session_id,
      channel: this.toChannel(row),
      title,
      category: row.category_name,
      categoryId: row.category_id,
      tags: row.tags,
      viewers: this.hub.viewers(row.id),
      durationSeconds: Math.max(0, Math.round((Date.now() - row.live_since.getTime()) / 1000)),
      quality: "Источник",
      latencySeconds: 3,
      status: title,
      tone: row.category_tone,
      playbackUrl: `${this.config.publicUrl}/hls/live/${row.username}/index.m3u8`,
    };
  }

  toStatus(row: ChannelRow): ChannelStatusDto {
    return { channel: this.toChannel(row), stream: this.toStream(row) };
  }

  async bySlug(slug: string, client?: Queryable): Promise<ChannelRow | null> {
    return this.db.one<ChannelRow>(`${SELECT} AND u.username = $1`, [slug.toLowerCase()], client);
  }

  async byId(id: string): Promise<ChannelRow | null> {
    return this.db.one<ChannelRow>(`${SELECT} AND u.id = $1`, [id]);
  }

  /** Идущие эфиры, самые смотрибельные первыми. */
  async live(options: { categoryId?: string; limit?: number } = {}): Promise<StreamDto[]> {
    const rows = await this.db.rows<ChannelRow>(
      `${SELECT} AND c.live_since IS NOT NULL AND ($1::text IS NULL OR c.category_id = $1) ORDER BY c.live_since`,
      [options.categoryId ?? null],
    );
    return rows
      .map((row) => this.toStream(row))
      .filter((stream): stream is StreamDto => stream !== null)
      .sort((a, b) => b.viewers - a.viewers || b.durationSeconds - a.durationSeconds)
      .slice(0, options.limit ?? 100);
  }

  /** Каналы, на которые подписан пользователь: сначала в эфире, затем остальные. */
  async following(userId: string): Promise<ChannelStatusDto[]> {
    const rows = await this.db.rows<ChannelRow>(
      `${SELECT} AND u.id IN (SELECT channel_id FROM follows WHERE follower_id = $1)
       ORDER BY c.live_since IS NULL, u.display_name`,
      [userId],
    );
    return rows.map((row) => this.toStatus(row));
  }

  async search(pattern: string, limit = 20): Promise<ChannelStatusDto[]> {
    const rows = await this.db.rows<ChannelRow>(
      `${SELECT} AND (translate(lower(u.username), 'ё', 'е') LIKE $1
                   OR translate(lower(u.display_name), 'ё', 'е') LIKE $1
                   OR translate(lower(c.title), 'ё', 'е') LIKE $1)
       ORDER BY c.live_since IS NULL, followers DESC LIMIT $2`,
      [pattern, limit],
    );
    return rows.map((row) => this.toStatus(row));
  }

  async isFollowing(followerId: string, channelId: string): Promise<boolean> {
    const row = await this.db.one("SELECT 1 FROM follows WHERE follower_id = $1 AND channel_id = $2", [followerId, channelId]);
    return row !== null;
  }
}
