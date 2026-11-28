import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { forbidden, parse, unauthorized } from "../../lib/http.js";
import { usernameFromPath, type LiveService } from "./service.js";
import { variantFromPath, type Transcoder } from "./transcoder.js";

/**
 * Запрос MediaMTX при подключении (authMethod: http). publish — автор выходит в эфир,
 * read/playback — зритель смотрит. Ключ приходит в query: `key=…`.
 */
const authBody = z.object({
  action: z.string(),
  path: z.string().default(""),
  query: z.string().default(""),
});
const pathQuery = z.object({ path: z.string() });

/** Служебные адреса для медиасервера. nginx их наружу не пропускает, а здесь — проверка адреса. */
function requireLocal(request: FastifyRequest): void {
  if (request.ip !== "127.0.0.1" && request.ip !== "::1" && request.ip !== "::ffff:127.0.0.1") throw forbidden();
}

export function registerMediaRoutes(app: FastifyInstance, live: LiveService, transcoder: Transcoder): void {
  app.post("/api/internal/media/auth", async (request, reply) => {
    requireLocal(request);
    const body = parse(authBody, request.body);
    if (body.action === "read" || body.action === "playback") return reply.code(200).send();
    if (body.action !== "publish") throw unauthorized();

    // Перекодированные качества публикует только наш ffmpeg — с внутренним ключом.
    if (variantFromPath(body.path)) {
      if (new URLSearchParams(body.query).get("key") !== transcoder.internalKey) throw unauthorized();
      return reply.code(200).send();
    }

    const username = usernameFromPath(body.path);
    const key = new URLSearchParams(body.query).get("key");
    if (!username || !key || !(await live.canPublish(username, key))) throw unauthorized("Неверный ключ эфира");
    return reply.code(200).send();
  });

  app.post("/api/internal/media/ready", async (request) => {
    requireLocal(request);
    const username = usernameFromPath(parse(pathQuery, request.query).path);
    if (username) await live.start(username);
    return { ok: true };
  });

  app.post("/api/internal/media/not-ready", async (request) => {
    requireLocal(request);
    const username = usernameFromPath(parse(pathQuery, request.query).path);
    if (username) await live.stop(username);
    return { ok: true };
  });
}
