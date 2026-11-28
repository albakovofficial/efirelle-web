import type { AppContext, Viewer } from "../../context.js";
import { badRequest, forbidden, HttpError, notFound, tooManyRequests } from "../../lib/http.js";
import { isTextAllowed } from "../../lib/profanity.js";
import type { MomentService } from "../moments/service.js";

export const MAX_MESSAGE_LENGTH = 500;
const HISTORY_SIZE = 60;
/** Минимальный интервал между сообщениями одного зрителя. */
const MESSAGE_INTERVAL_MS = 1000;
const NEWCOMER_DAYS = 7;

export type ChatBadgeDto = { type: "broadcaster" } | { type: "moderator" } | { type: "newcomer" };

export interface ChatMessageDto {
  kind: "message";
  id: string;
  author: string;
  authorSlug: string;
  authorId: string;
  tone: string;
  badge?: ChatBadgeDto;
  text: string;
  /** Ответ на сообщение: кому и начало исходного текста. */
  replyTo?: { id: string; author: string; text: string };
  createdAt: string;
}

interface MessageRow {
  id: string;
  channel_id: string;
  user_id: string;
  text: string;
  created_at: Date;
  username: string;
  display_name: string;
  tone: string;
  role: "user" | "admin";
  user_created_at: Date;
  reply_id: string | null;
  reply_author: string | null;
  reply_text: string | null;
}

const MESSAGE_SELECT = `
  SELECT m.id::text, m.channel_id, m.user_id, m.text, m.created_at,
         u.username, u.display_name, u.tone, u.role, u.created_at AS user_created_at,
         r.id::text AS reply_id, ru.display_name AS reply_author, r.text AS reply_text
  FROM chat_messages m JOIN users u ON u.id = m.user_id
  LEFT JOIN chat_messages r ON r.id = m.reply_to_id AND r.deleted_at IS NULL
  LEFT JOIN users ru ON ru.id = r.user_id`;

/** Сколько символов исходного сообщения показывать над ответом. */
const REPLY_PREVIEW_LENGTH = 80;

export const REPORT_REASONS = ["spam", "harassment", "hate", "sexual", "violence", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Чат эфира: история, отправка с проверками, удаление, баны, жалобы и блокировки. */
export class ChatService {
  private readonly lastMessageAt = new Map<string, number>();

  constructor(
    private readonly ctx: AppContext,
    private readonly moments: MomentService,
  ) {}

  async history(channelId: string, viewerId: string | null): Promise<ChatMessageDto[]> {
    const rows = await this.ctx.db.rows<MessageRow>(
      `${MESSAGE_SELECT}
       WHERE m.channel_id = $1 AND m.deleted_at IS NULL AND u.banned_at IS NULL
         AND ($2::uuid IS NULL OR m.user_id NOT IN (SELECT blocked_id FROM blocks WHERE user_id = $2))
       ORDER BY m.id DESC LIMIT $3`,
      [channelId, viewerId, HISTORY_SIZE],
    );
    return rows.reverse().map((row) => this.toDto(row));
  }

  async send(viewer: Viewer, channelId: string, rawText: string, replyToId?: string): Promise<ChatMessageDto> {
    const text = rawText.trim();
    if (!text) throw badRequest("Пустое сообщение");
    if (text.length > MAX_MESSAGE_LENGTH) throw badRequest(`Сообщение — до ${MAX_MESSAGE_LENGTH} символов`);
    if (!isTextAllowed(text)) throw badRequest("Сообщение нарушает правила чата", "profanity");

    const ban = await this.ctx.db.one(
      "SELECT 1 FROM chat_bans WHERE channel_id = $1 AND user_id = $2 AND (until IS NULL OR until > now())",
      [channelId, viewer.id],
    );
    if (ban) throw new HttpError(403, "Вам запрещено писать в этом чате", "chat_banned");

    // Отвечать можно только на живое сообщение этого же чата.
    let replyTo: string | null = null;
    if (replyToId) {
      const original = await this.ctx.db.one<{ id: string }>(
        "SELECT id::text FROM chat_messages WHERE id = $1 AND channel_id = $2 AND deleted_at IS NULL",
        [replyToId, channelId],
      );
      if (!original) throw badRequest("Сообщение, на которое вы отвечаете, удалено");
      replyTo = original.id;
    }

    const now = Date.now();
    if (now - (this.lastMessageAt.get(viewer.id) ?? 0) < MESSAGE_INTERVAL_MS) throw tooManyRequests("Не так быстро");

    this.lastMessageAt.set(viewer.id, now);
    const inserted = await this.ctx.db.one<{ id: string }>(
      "INSERT INTO chat_messages (channel_id, user_id, text, reply_to_id) VALUES ($1, $2, $3, $4) RETURNING id::text",
      [channelId, viewer.id, text, replyTo],
    );
    const message = await this.byId(inserted!.id);
    this.ctx.hub.broadcast(channelId, { type: "message", message }, viewer.id);
    await this.moments.trackMessage(channelId);
    return message;
  }

  /** Удалить сообщение может владелец канала или администратор. */
  async delete(actor: Viewer, messageId: string): Promise<void> {
    const row = await this.ctx.db.one<{ channel_id: string }>("SELECT channel_id FROM chat_messages WHERE id = $1", [messageId]);
    if (!row) throw notFound("Сообщение не найдено");
    if (row.channel_id !== actor.id && actor.role !== "admin") throw forbidden();
    await this.ctx.db.pool.query("UPDATE chat_messages SET deleted_at = now() WHERE id = $1", [messageId]);
    this.ctx.hub.broadcast(row.channel_id, { type: "deleted", id: messageId });
  }

  /** Бан в чате канала: `minutes = null` — навсегда. Сообщения автора в этом чате скрываются. */
  async ban(channelId: string, userId: string, minutes: number | null): Promise<void> {
    if (channelId === userId) throw badRequest("Нельзя забанить себя");
    await this.ctx.db.pool.query(
      `INSERT INTO chat_bans (channel_id, user_id, until)
       VALUES ($1, $2, CASE WHEN $3::int IS NULL THEN NULL ELSE now() + make_interval(mins => $3::int) END)
       ON CONFLICT (channel_id, user_id) DO UPDATE SET until = EXCLUDED.until, created_at = now()`,
      [channelId, userId, minutes],
    );
    const hidden = await this.ctx.db.rows<{ id: string }>(
      "UPDATE chat_messages SET deleted_at = now() WHERE channel_id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING id::text",
      [channelId, userId],
    );
    for (const { id } of hidden) this.ctx.hub.broadcast(channelId, { type: "deleted", id });
  }

  async unban(channelId: string, userId: string): Promise<void> {
    await this.ctx.db.pool.query("DELETE FROM chat_bans WHERE channel_id = $1 AND user_id = $2", [channelId, userId]);
  }

  async report(reporter: Viewer, messageId: string, reason: ReportReason): Promise<void> {
    const message = await this.ctx.db.one<{ user_id: string; channel_id: string; text: string }>(
      "SELECT user_id, channel_id, text FROM chat_messages WHERE id = $1",
      [messageId],
    );
    if (!message) throw notFound("Сообщение не найдено");
    if (message.user_id === reporter.id) throw badRequest("Нельзя пожаловаться на себя");
    await this.ctx.db.pool.query(
      `INSERT INTO reports (reporter_id, target_user_id, channel_id, message_id, message_text, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [reporter.id, message.user_id, message.channel_id, messageId, message.text, reason],
    );
  }

  async blockedIds(userId: string): Promise<Set<string>> {
    const rows = await this.ctx.db.rows<{ blocked_id: string }>("SELECT blocked_id FROM blocks WHERE user_id = $1", [userId]);
    return new Set(rows.map((row) => row.blocked_id));
  }

  async block(userId: string, blockedId: string): Promise<void> {
    if (userId === blockedId) throw badRequest("Нельзя заблокировать себя");
    await this.ctx.db.pool.query("INSERT INTO blocks (user_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, blockedId]);
    this.ctx.hub.updateBlocks(userId, await this.blockedIds(userId));
  }

  async unblock(userId: string, blockedId: string): Promise<void> {
    await this.ctx.db.pool.query("DELETE FROM blocks WHERE user_id = $1 AND blocked_id = $2", [userId, blockedId]);
    this.ctx.hub.updateBlocks(userId, await this.blockedIds(userId));
  }

  async blockedUsers(userId: string) {
    return this.ctx.db.rows<{ id: string; username: string; display_name: string }>(
      `SELECT u.id, u.username, u.display_name FROM blocks b JOIN users u ON u.id = b.blocked_id
       WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
      [userId],
    );
  }

  private async byId(id: string): Promise<ChatMessageDto> {
    const row = await this.ctx.db.one<MessageRow>(`${MESSAGE_SELECT} WHERE m.id = $1`, [id]);
    return this.toDto(row!);
  }

  private toDto(row: MessageRow): ChatMessageDto {
    const isNewcomer = Date.now() - row.user_created_at.getTime() < NEWCOMER_DAYS * 24 * 3600 * 1000;
    const badge: ChatBadgeDto | undefined =
      row.user_id === row.channel_id
        ? { type: "broadcaster" }
        : row.role === "admin"
          ? { type: "moderator" }
          : isNewcomer
            ? { type: "newcomer" }
            : undefined;
    return {
      kind: "message",
      id: row.id,
      author: row.display_name,
      authorSlug: row.username,
      authorId: row.user_id,
      tone: row.tone,
      ...(badge ? { badge } : {}),
      text: row.text,
      ...(row.reply_id && row.reply_author && row.reply_text
        ? { replyTo: { id: row.reply_id, author: row.reply_author, text: row.reply_text.slice(0, REPLY_PREVIEW_LENGTH) } }
        : {}),
      createdAt: row.created_at.toISOString(),
    };
  }
}
