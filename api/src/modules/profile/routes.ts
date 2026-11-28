import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../../context.js";
import { badRequest, conflict, notFound, parse } from "../../lib/http.js";
import { isTextAllowed } from "../../lib/profanity.js";
import { requireViewer } from "../auth/sessions.js";
import type { ProfileService } from "./service.js";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const BANNER_MAX_BYTES = 4 * 1024 * 1024;
const EMOTE_MAX_BYTES = 256 * 1024;
const MAX_EMOTES = 30;

const link = z.object({
  title: z.string().trim().min(1, "Подпишите ссылку").max(40, "Подпись ссылки — до 40 символов").refine(isTextAllowed, "Подпись нарушает правила"),
  url: z
    .string()
    .trim()
    .max(300, "Слишком длинная ссылка")
    .refine((value) => /^https?:\/\/[^\s]+\.[^\s]+$/i.test(value), "Ссылка должна начинаться с https://"),
});
const profileBody = z.object({
  description: z.string().trim().max(1000, "Описание — до 1000 символов").refine(isTextAllowed, "Описание нарушает правила сообщества"),
  links: z.array(link).max(5, "Не больше пяти ссылок"),
});
const emoteQuery = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{2,20}$/, "Код эмодзи: 2–20 латинских букв, цифр или _")
    .refine(isTextAllowed, "Такой код занять нельзя"),
});

/** Аватар пользователя, оформление канала и эмодзи. Картинки приходят телом запроса (image/png и т. п.). */
export function registerProfileRoutes(app: FastifyInstance, ctx: AppContext, profile: ProfileService): void {
  app.put("/api/me/avatar", async (request) => {
    const viewer = requireViewer(request);
    const url = await ctx.uploads.saveImage(request.body, AVATAR_MAX_BYTES);
    await ctx.db.pool.query("UPDATE users SET avatar_url = $1 WHERE id = $2", [url, viewer.id]);
    await ctx.uploads.remove(viewer.avatarUrl);
    return { avatarUrl: url };
  });

  app.delete("/api/me/avatar", async (request) => {
    const viewer = requireViewer(request);
    await ctx.db.pool.query("UPDATE users SET avatar_url = NULL WHERE id = $1", [viewer.id]);
    await ctx.uploads.remove(viewer.avatarUrl);
    return { avatarUrl: null };
  });

  app.put("/api/studio/banner", async (request) => {
    const viewer = requireViewer(request);
    const url = await ctx.uploads.saveImage(request.body, BANNER_MAX_BYTES);
    const previous = await ctx.db.one<{ banner_url: string | null }>(
      "UPDATE channels c SET banner_url = $1 FROM channels old WHERE c.user_id = $2 AND old.user_id = c.user_id RETURNING old.banner_url",
      [url, viewer.id],
    );
    await ctx.uploads.remove(previous?.banner_url);
    return { bannerUrl: url };
  });

  app.delete("/api/studio/banner", async (request) => {
    const viewer = requireViewer(request);
    const previous = (await profile.about(viewer.id)).bannerUrl;
    await ctx.db.pool.query("UPDATE channels SET banner_url = NULL WHERE user_id = $1", [viewer.id]);
    await ctx.uploads.remove(previous);
    return { bannerUrl: null };
  });

  app.patch("/api/studio/profile", async (request) => {
    const viewer = requireViewer(request);
    const body = parse(profileBody, request.body);
    await ctx.db.pool.query("UPDATE channels SET description = $1, links = $2 WHERE user_id = $3", [
      body.description,
      JSON.stringify(body.links),
      viewer.id,
    ]);
    return profile.about(viewer.id);
  });

  app.post("/api/studio/emotes", async (request) => {
    const viewer = requireViewer(request);
    const { code } = parse(emoteQuery, request.query);
    const count = await ctx.db.one<{ count: number }>("SELECT count(*)::int AS count FROM emotes WHERE channel_id = $1", [viewer.id]);
    if ((count?.count ?? 0) >= MAX_EMOTES) throw badRequest(`Не больше ${MAX_EMOTES} эмодзи на канал`, "emote_limit");
    const exists = await ctx.db.one("SELECT 1 FROM emotes WHERE channel_id = $1 AND code = $2", [viewer.id, code]);
    if (exists) throw conflict(`Эмодзи :${code}: уже есть`, "emote_exists");
    const url = await ctx.uploads.saveImage(request.body, EMOTE_MAX_BYTES);
    await ctx.db.pool.query("INSERT INTO emotes (channel_id, code, url) VALUES ($1, $2, $3)", [viewer.id, code, url]);
    return { emote: { code, url } };
  });

  app.delete<{ Params: { code: string } }>("/api/studio/emotes/:code", async (request) => {
    const viewer = requireViewer(request);
    const removed = await ctx.db.one<{ url: string }>("DELETE FROM emotes WHERE channel_id = $1 AND code = $2 RETURNING url", [
      viewer.id,
      request.params.code.toLowerCase(),
    ]);
    if (!removed) throw notFound("Эмодзи не найдено");
    await ctx.uploads.remove(removed.url);
    return { ok: true };
  });
}
