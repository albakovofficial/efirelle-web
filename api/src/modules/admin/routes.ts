import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../../context.js";
import { notFound, parse } from "../../lib/http.js";
import { requireAdmin } from "../auth/sessions.js";
import type { Transcoder } from "../media/transcoder.js";

const resolveBody = z.object({
  action: z.enum(["dismiss", "delete_message", "ban_user"], { message: "Выберите действие" }),
});

interface ReportRow {
  id: string;
  reason: string;
  message_text: string | null;
  message_id: string | null;
  created_at: Date;
  target_id: string;
  target_username: string;
  target_name: string;
  reporter_username: string | null;
  channel_username: string | null;
}

/** Модерация платформы: жалобы рассматриваются администратором (по правилам — в течение 24 часов). */
const transcodeBody = z.object({ enabled: z.boolean() });

export function registerAdminRoutes(app: FastifyInstance, ctx: AppContext, transcoder: Transcoder): void {
  /** Перекодирование в 720p/480p: нагружает процессор, поэтому включается вручную. */
  app.get("/api/admin/transcode", async (request) => {
    requireAdmin(request);
    return { enabled: await transcoder.isEnabled() };
  });

  app.put("/api/admin/transcode", async (request) => {
    requireAdmin(request);
    const { enabled } = parse(transcodeBody, request.body);
    await transcoder.setEnabled(enabled);
    return { enabled };
  });

  app.get("/api/admin/reports", async (request) => {
    requireAdmin(request);
    const rows = await ctx.db.rows<ReportRow>(
      `SELECT r.id::text, r.reason, r.message_text, r.message_id::text, r.created_at,
              t.id AS target_id, t.username AS target_username, t.display_name AS target_name,
              rp.username AS reporter_username, ch.username AS channel_username
       FROM reports r
       JOIN users t ON t.id = r.target_user_id
       LEFT JOIN users rp ON rp.id = r.reporter_id
       LEFT JOIN users ch ON ch.id = r.channel_id
       WHERE r.status = 'open' ORDER BY r.created_at LIMIT 200`,
    );
    return {
      reports: rows.map((r) => ({
        id: r.id,
        reason: r.reason,
        messageText: r.message_text,
        messageId: r.message_id,
        createdAt: r.created_at.toISOString(),
        target: { id: r.target_id, slug: r.target_username, name: r.target_name },
        reporter: r.reporter_username,
        channel: r.channel_username,
      })),
    };
  });

  app.post<{ Params: { id: string } }>("/api/admin/reports/:id/resolve", async (request) => {
    requireAdmin(request);
    const { action } = parse(resolveBody, request.body);
    const report = await ctx.db.one<{ target_user_id: string; message_id: string | null; channel_id: string | null }>(
      "SELECT target_user_id, message_id::text, channel_id FROM reports WHERE id = $1 AND status = 'open'",
      [request.params.id],
    );
    if (!report) throw notFound("Жалоба не найдена или уже рассмотрена");

    await ctx.db.transaction(async (client) => {
      if (action === "delete_message" && report.message_id) {
        await client.query("UPDATE chat_messages SET deleted_at = now() WHERE id = $1", [report.message_id]);
      }
      if (action === "ban_user") {
        // Бан на платформе: вход и все сессии закрыты, сообщения скрыты.
        await client.query("UPDATE users SET banned_at = now() WHERE id = $1", [report.target_user_id]);
        await client.query("DELETE FROM sessions WHERE user_id = $1", [report.target_user_id]);
        await client.query("UPDATE chat_messages SET deleted_at = now() WHERE user_id = $1 AND deleted_at IS NULL", [report.target_user_id]);
      }
      // Все открытые жалобы на того же автора по тому же сообщению закрываются вместе.
      await client.query(
        `UPDATE reports SET status = 'resolved', resolution = $1, resolved_at = now()
         WHERE status = 'open' AND (id = $2 OR (message_id IS NOT NULL AND message_id = $3))`,
        [action, request.params.id, report.message_id],
      );
    });
    if (action === "delete_message" && report.message_id && report.channel_id) {
      ctx.hub.broadcast(report.channel_id, { type: "deleted", id: report.message_id });
    }
    return { ok: true };
  });
}
