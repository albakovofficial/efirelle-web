import type { AppContext } from "../../context.js";
import { badRequest, notFound } from "../../lib/http.js";
import type { ChannelDto, ChannelRepository } from "../channels/repository.js";
import type { PushService } from "../push/service.js";

/** За сколько до начала напоминаем тем, кто нажал «Напомнить». */
const REMIND_BEFORE = "5 minutes";
/** Анонс остаётся в расписании ещё час после времени начала (эфир мог задержаться). */
const KEEP_AFTER_START = "1 hour";
const MAX_UPCOMING = 20;
const MAX_DAYS_AHEAD = 60;

export interface ScheduledStreamDto {
  id: string;
  channel: ChannelDto;
  title: string;
  category: string;
  categoryId: string;
  startsAt: string;
  reminders: number;
  isReminded: boolean;
}

interface ScheduledRow {
  id: string;
  channel_id: string;
  title: string;
  category_id: string;
  category_name: string;
  starts_at: Date;
  reminders: number;
  is_reminded: boolean;
}

const SELECT = `
  SELECT s.id::text, s.channel_id, s.title, s.category_id, cat.name AS category_name, s.starts_at,
         (SELECT count(*) FROM stream_reminders r WHERE r.scheduled_id = s.id)::int AS reminders,
         EXISTS (SELECT 1 FROM stream_reminders r WHERE r.scheduled_id = s.id AND r.user_id = $1) AS is_reminded
  FROM scheduled_streams s JOIN categories cat ON cat.id = s.category_id
  WHERE s.starts_at > now() - $2::interval`;

/** Расписание эфиров: анонсы автора и напоминания зрителям. */
export class ScheduleService {
  constructor(
    private readonly ctx: AppContext,
    private readonly channels: ChannelRepository,
    private readonly push: PushService,
  ) {}

  async ofChannel(channelId: string, viewerId: string | null): Promise<ScheduledStreamDto[]> {
    const rows = await this.ctx.db.rows<ScheduledRow>(`${SELECT} AND s.channel_id = $3 ORDER BY s.starts_at`, [
      viewerId,
      KEEP_AFTER_START,
      channelId,
    ]);
    return this.toDtos(rows);
  }

  /** Ближайшие анонсы всей платформы — для главной. */
  async upcoming(viewerId: string | null, limit = 10): Promise<ScheduledStreamDto[]> {
    const rows = await this.ctx.db.rows<ScheduledRow>(
      `${SELECT} AND s.starts_at > now()
         AND NOT EXISTS (SELECT 1 FROM channels c WHERE c.user_id = s.channel_id AND c.live_since IS NOT NULL)
       ORDER BY s.starts_at LIMIT $3`,
      [viewerId, KEEP_AFTER_START, limit],
    );
    return this.toDtos(rows);
  }

  async create(channelId: string, input: { title: string; categoryId: string; startsAt: Date }): Promise<ScheduledStreamDto> {
    const now = Date.now();
    if (input.startsAt.getTime() < now + 60_000) throw badRequest("Время эфира должно быть в будущем");
    if (input.startsAt.getTime() > now + MAX_DAYS_AHEAD * 86_400_000) throw badRequest(`Анонс — не дальше чем на ${MAX_DAYS_AHEAD} дней`);
    const category = await this.ctx.db.one("SELECT 1 FROM categories WHERE id = $1", [input.categoryId]);
    if (!category) throw badRequest("Нет такой категории");
    const count = await this.ctx.db.one<{ count: number }>(
      "SELECT count(*)::int AS count FROM scheduled_streams WHERE channel_id = $1 AND starts_at > now()",
      [channelId],
    );
    if ((count?.count ?? 0) >= MAX_UPCOMING) throw badRequest(`Не больше ${MAX_UPCOMING} анонсов вперёд`);
    const row = await this.ctx.db.one<{ id: string }>(
      "INSERT INTO scheduled_streams (channel_id, title, category_id, starts_at) VALUES ($1, $2, $3, $4) RETURNING id::text",
      [channelId, input.title, input.categoryId, input.startsAt],
    );
    return (await this.ofChannel(channelId, null)).find((item) => item.id === row!.id)!;
  }

  async remove(channelId: string, id: string): Promise<void> {
    const removed = await this.ctx.db.one("DELETE FROM scheduled_streams WHERE id = $1 AND channel_id = $2 RETURNING 1", [id, channelId]);
    if (!removed) throw notFound("Анонс не найден");
  }

  async setReminder(userId: string, id: string, on: boolean): Promise<{ isReminded: boolean; reminders: number }> {
    const exists = await this.ctx.db.one("SELECT 1 FROM scheduled_streams WHERE id = $1 AND starts_at > now()", [id]);
    if (!exists) throw notFound("Анонс не найден или уже прошёл");
    await this.ctx.db.pool.query(
      on
        ? "INSERT INTO stream_reminders (scheduled_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
        : "DELETE FROM stream_reminders WHERE scheduled_id = $1 AND user_id = $2",
      [id, userId],
    );
    const count = await this.ctx.db.one<{ count: number }>("SELECT count(*)::int AS count FROM stream_reminders WHERE scheduled_id = $1", [id]);
    return { isReminded: on, reminders: count?.count ?? 0 };
  }

  /** Раз в полминуты: тем, кто просил напомнить, — уведомление за несколько минут до эфира. */
  async sendDueReminders(): Promise<number> {
    const due = await this.ctx.db.rows<{ id: string; title: string; username: string; display_name: string }>(
      `UPDATE scheduled_streams s SET reminded_at = now()
       FROM users u
       WHERE u.id = s.channel_id AND s.reminded_at IS NULL
         AND s.starts_at <= now() + $1::interval AND s.starts_at > now() - $2::interval
       RETURNING s.id::text, s.title, u.username, u.display_name`,
      [REMIND_BEFORE, KEEP_AFTER_START],
    );
    let sent = 0;
    for (const item of due) {
      const users = await this.ctx.db.rows<{ user_id: string }>("SELECT user_id FROM stream_reminders WHERE scheduled_id = $1", [item.id]);
      sent += await this.push.notifyUsers(
        users.map((row) => row.user_id),
        { title: `${item.display_name} скоро в эфире`, body: item.title, channel: item.username },
      );
    }
    return sent;
  }

  private async toDtos(rows: ScheduledRow[]): Promise<ScheduledStreamDto[]> {
    const channels = new Map<string, ChannelDto>();
    const result: ScheduledStreamDto[] = [];
    for (const row of rows) {
      let channel = channels.get(row.channel_id);
      if (!channel) {
        const found = await this.channels.byId(row.channel_id);
        if (!found) continue;
        channel = this.channels.toChannel(found);
        channels.set(row.channel_id, channel);
      }
      result.push({
        id: row.id,
        channel,
        title: row.title,
        category: row.category_name,
        categoryId: row.category_id,
        startsAt: row.starts_at.toISOString(),
        reminders: row.reminders,
        isReminded: row.is_reminded,
      });
    }
    return result;
  }
}
