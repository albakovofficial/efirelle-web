import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../../context.js";
import { randomToken } from "../../lib/crypto.js";
import { badRequest, notFound, parse } from "../../lib/http.js";
import { isTextAllowed } from "../../lib/profanity.js";
import { requireViewer } from "../auth/sessions.js";
import type { ChannelRepository } from "../channels/repository.js";
import type { ChatService } from "../chat/service.js";
import type { MomentService } from "../moments/service.js";
import type { PredictionService } from "../predictions/service.js";
import type { ProfileService } from "../profile/service.js";
import type { ScheduleService } from "../schedule/service.js";

const cleanText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .max(max, `Не длиннее ${max} символов`)
    .refine(isTextAllowed, "Текст нарушает правила сообщества");

const settingsBody = z.object({
  title: z.string().trim().max(140, "Название — до 140 символов").refine(isTextAllowed, "Название нарушает правила сообщества"),
  categoryId: z.string().max(40),
  tags: z.array(z.string().trim().min(1).max(24).refine(isTextAllowed, "Тег нарушает правила")).max(5, "Не больше 5 тегов"),
});
const predictionBody = z.object({
  question: cleanText(120, "Задайте вопрос"),
  outcomes: z.array(cleanText(40, "Заполните вариант")).min(2, "Нужно два варианта").max(4, "Не больше 4 вариантов"),
  durationSeconds: z.number().int().min(30, "Минимум 30 секунд").max(1800, "Максимум 30 минут"),
});
const resolveBody = z.object({ outcomeId: z.string().regex(/^\d+$/) });
const momentBody = z.object({ text: cleanText(140, "Опишите момент") });
const banBody = z.object({
  username: z.string().trim().toLowerCase().max(24),
  minutes: z.number().int().min(1).max(60 * 24 * 30).nullable(),
});
const raidBody = z.object({ target: z.string().trim().toLowerCase().max(24) });

/** Студия автора: настройки эфира, ключ для OBS, прогнозы, моменты, модерация, рейды. */
export function registerStudioRoutes(
  app: FastifyInstance,
  ctx: AppContext,
  channels: ChannelRepository,
  services: {
    predictions: PredictionService;
    moments: MomentService;
    chat: ChatService;
    profile: ProfileService;
    schedule: ScheduleService;
  },
): void {
  const { predictions, moments, chat, profile, schedule } = services;
  app.get("/api/studio", async (request) => {
    const viewer = requireViewer(request);
    const channel = await channels.byId(viewer.id);
    if (!channel) throw notFound("Канал не найден");
    const key = await ctx.db.one<{ stream_key: string }>("SELECT stream_key FROM channels WHERE user_id = $1", [viewer.id]);
    const bans = await ctx.db.rows<{ username: string; display_name: string; until: Date | null }>(
      `SELECT u.username, u.display_name, b.until FROM chat_bans b JOIN users u ON u.id = b.user_id
       WHERE b.channel_id = $1 AND (b.until IS NULL OR b.until > now()) ORDER BY b.created_at DESC`,
      [viewer.id],
    );
    return {
      ...channels.toStatus(channel),
      settings: { title: channel.title, categoryId: channel.category_id, tags: channel.tags },
      ingest: {
        server: ctx.config.rtmpUrl,
        // OBS: «Сервер» — server, «Ключ потока» — streamKey.
        streamKey: `${viewer.username}?key=${key!.stream_key}`,
      },
      prediction: await predictions.current(viewer.id, viewer.id),
      bans: bans.map((b) => ({ slug: b.username, name: b.display_name, until: b.until?.toISOString() ?? null })),
      about: await profile.about(viewer.id),
      emotes: await profile.emotes(viewer.id),
      schedule: await schedule.ofChannel(viewer.id, viewer.id),
    };
  });

  app.patch("/api/studio", async (request) => {
    const viewer = requireViewer(request);
    const body = parse(settingsBody, request.body);
    const category = await ctx.db.one("SELECT 1 FROM categories WHERE id = $1", [body.categoryId]);
    if (!category) throw badRequest("Нет такой категории");
    await ctx.db.pool.query("UPDATE channels SET title = $1, category_id = $2, tags = $3 WHERE user_id = $4", [
      body.title,
      body.categoryId,
      [...new Set(body.tags)],
      viewer.id,
    ]);
    return channels.toStatus((await channels.byId(viewer.id))!);
  });

  /** Новый ключ эфира: старый сразу перестаёт работать. */
  app.post("/api/studio/stream-key", async (request) => {
    const viewer = requireViewer(request);
    const key = randomToken(18);
    await ctx.db.pool.query("UPDATE channels SET stream_key = $1 WHERE user_id = $2", [key, viewer.id]);
    return { streamKey: `${viewer.username}?key=${key}` };
  });

  app.post("/api/studio/predictions", async (request, reply) => {
    const viewer = requireViewer(request);
    const body = parse(predictionBody, request.body);
    reply.code(201);
    return { prediction: await predictions.create(viewer.id, body.question, body.outcomes, body.durationSeconds) };
  });

  app.post<{ Params: { id: string } }>("/api/studio/predictions/:id/resolve", async (request) => {
    const viewer = requireViewer(request);
    const { outcomeId } = parse(resolveBody, request.body);
    return { prediction: await predictions.resolve(viewer.id, request.params.id, outcomeId) };
  });

  app.post<{ Params: { id: string } }>("/api/studio/predictions/:id/cancel", async (request) => {
    const viewer = requireViewer(request);
    return { prediction: await predictions.cancel(viewer.id, request.params.id) };
  });

  app.post("/api/studio/moments", async (request, reply) => {
    const viewer = requireViewer(request);
    const { text } = parse(momentBody, request.body);
    const moment = await moments.create(viewer.id, "highlight", text);
    if (!moment) throw badRequest("Отмечать моменты можно только во время эфира", "not_live");
    reply.code(201);
    return { moment };
  });

  app.post("/api/studio/bans", async (request) => {
    const viewer = requireViewer(request);
    const body = parse(banBody, request.body);
    const target = await ctx.db.one<{ id: string }>("SELECT id FROM users WHERE username = $1", [body.username]);
    if (!target) throw notFound("Пользователь не найден");
    await chat.ban(viewer.id, target.id, body.minutes);
    return { ok: true };
  });

  app.delete<{ Params: { username: string } }>("/api/studio/bans/:username", async (request) => {
    const viewer = requireViewer(request);
    const target = await ctx.db.one<{ id: string }>("SELECT id FROM users WHERE username = $1", [request.params.username.toLowerCase()]);
    if (target) await chat.unban(viewer.id, target.id);
    return { ok: true };
  });

  /** Рейд: зрители эфира переходят на другой идущий эфир, у него появляется момент «Рейд». */
  app.post("/api/studio/raid", async (request) => {
    const viewer = requireViewer(request);
    const { target } = parse(raidBody, request.body);
    const source = await channels.byId(viewer.id);
    const destination = await channels.bySlug(target);
    if (!source?.live_since) throw badRequest("Рейд возможен только во время эфира", "not_live");
    if (!destination?.live_since) throw badRequest("Этот канал сейчас не в эфире", "target_offline");
    if (destination.id === source.id) throw badRequest("Нельзя рейдить себя");

    const viewers = ctx.hub.viewers(source.id);
    ctx.hub.broadcast(source.id, { type: "raid", target: destination.username, targetName: destination.display_name });
    await moments.create(destination.id, "raid", `${source.display_name} привёл(а) зрителей: ${viewers}`);
    return { ok: true, viewers };
  });
}
