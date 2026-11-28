import type { AppContext } from "../../context.js";
import { timeAgo } from "../../lib/text.js";
import type { ChannelDto, ChannelRepository } from "../channels/repository.js";

export type MomentKind = "raid" | "prediction" | "chatPeak" | "giveaway" | "highlight";

export interface MomentDto {
  id: string;
  kind: MomentKind;
  text: string;
  channel: ChannelDto;
  when: string;
  offsetSeconds: number;
}

interface MomentRow {
  id: string;
  kind: MomentKind;
  text: string;
  offset_seconds: number;
  created_at: Date;
  channel_id: string;
}

/** Не чаще одного автоматического «пика чата» за это время. */
const PEAK_COOLDOWN_MS = 5 * 60 * 1000;
/** Сообщений за минуту, после которых чат считается «взорвавшимся». */
const PEAK_MIN_MESSAGES = 20;

/** Моменты эфира: отметки на таймлайне и лента «Живые моменты». */
export class MomentService {
  private readonly recentMessages = new Map<string, number[]>();
  private readonly lastPeak = new Map<string, number>();

  constructor(
    private readonly ctx: AppContext,
    private readonly channels: ChannelRepository,
  ) {}

  /** Создаёт момент в текущем эфире канала и рассылает его зрителям. Вне эфира ничего не делает. */
  async create(channelId: string, kind: MomentKind, text: string): Promise<MomentDto | null> {
    const row = await this.ctx.db.one<MomentRow>(
      `INSERT INTO moments (channel_id, session_id, kind, text, offset_seconds)
       SELECT c.user_id, c.current_session_id, $2, $3, GREATEST(0, EXTRACT(EPOCH FROM now() - c.live_since))::int
       FROM channels c WHERE c.user_id = $1 AND c.current_session_id IS NOT NULL
       RETURNING id::text, kind, text, offset_seconds, created_at, channel_id`,
      [channelId, kind, text.slice(0, 140)],
    );
    if (!row) return null;
    const channel = await this.channels.byId(channelId);
    if (!channel) return null;
    const moment = this.toDto(row, this.channels.toChannel(channel));
    this.ctx.hub.broadcast(channelId, { type: "moment", moment });
    return moment;
  }

  /** Отметки текущего эфира канала — для таймлайна плеера. */
  async ofCurrentSession(channelId: string): Promise<MomentDto[]> {
    const channel = await this.channels.byId(channelId);
    if (!channel?.current_session_id) return [];
    const rows = await this.ctx.db.rows<MomentRow>(
      `SELECT id::text, kind, text, offset_seconds, created_at, channel_id FROM moments
       WHERE session_id = $1 ORDER BY offset_seconds`,
      [channel.current_session_id],
    );
    const dto = this.channels.toChannel(channel);
    return rows.map((row) => this.toDto(row, dto));
  }

  /** Свежие моменты идущих эфиров — для главной. */
  async live(limit = 12): Promise<MomentDto[]> {
    const rows = await this.ctx.db.rows<MomentRow>(
      `SELECT m.id::text, m.kind, m.text, m.offset_seconds, m.created_at, m.channel_id
       FROM moments m JOIN channels c ON c.user_id = m.channel_id AND c.current_session_id = m.session_id
       ORDER BY m.created_at DESC LIMIT $1`,
      [limit],
    );
    const result: MomentDto[] = [];
    for (const row of rows) {
      const channel = await this.channels.byId(row.channel_id);
      if (channel) result.push(this.toDto(row, this.channels.toChannel(channel)));
    }
    return result;
  }

  /** Учитывает сообщение чата; при резком всплеске создаёт момент «Пик чата». */
  async trackMessage(channelId: string, now = Date.now()): Promise<void> {
    const minuteAgo = now - 60_000;
    const times = (this.recentMessages.get(channelId) ?? []).filter((t) => t > minuteAgo);
    times.push(now);
    this.recentMessages.set(channelId, times);

    const viewers = this.ctx.hub.viewers(channelId);
    const threshold = Math.max(PEAK_MIN_MESSAGES, viewers);
    if (times.length < threshold) return;
    if (now - (this.lastPeak.get(channelId) ?? 0) < PEAK_COOLDOWN_MS) return;
    this.lastPeak.set(channelId, now);
    await this.create(channelId, "chatPeak", "Пик чата: зрители не могут молчать");
  }

  private toDto(row: MomentRow, channel: ChannelDto): MomentDto {
    return {
      id: row.id,
      kind: row.kind,
      text: row.text,
      channel,
      when: timeAgo(row.created_at),
      offsetSeconds: row.offset_seconds,
    };
  }
}
