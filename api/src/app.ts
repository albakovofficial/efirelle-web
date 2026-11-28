import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import Fastify, { type FastifyInstance } from "fastify";
import type { AppContext } from "./context.js";
import { forbidden, HttpError } from "./lib/http.js";
import { IMAGE_CONTENT_TYPES } from "./lib/uploads.js";
import { registerAdminRoutes } from "./modules/admin/routes.js";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { findViewer, sessionToken } from "./modules/auth/sessions.js";
import { ChannelRepository } from "./modules/channels/repository.js";
import { registerChannelRoutes } from "./modules/channels/routes.js";
import { registerChatRoutes } from "./modules/chat/routes.js";
import { ChatService } from "./modules/chat/service.js";
import { registerDiscoveryRoutes } from "./modules/discovery/routes.js";
import { registerMediaRoutes } from "./modules/media/routes.js";
import { LiveService } from "./modules/media/service.js";
import { MomentService } from "./modules/moments/service.js";
import { registerPredictionRoutes } from "./modules/predictions/routes.js";
import { registerProfileRoutes } from "./modules/profile/routes.js";
import { ProfileService } from "./modules/profile/service.js";
import { registerPushRoutes } from "./modules/push/routes.js";
import { registerRecordingRoutes } from "./modules/recordings/routes.js";
import { RecordingService } from "./modules/recordings/service.js";
import { PushService } from "./modules/push/service.js";
import { PredictionService } from "./modules/predictions/service.js";
import { registerScheduleRoutes } from "./modules/schedule/routes.js";
import { ScheduleService } from "./modules/schedule/service.js";
import { registerStudioRoutes } from "./modules/studio/routes.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export interface Services {
  live: LiveService;
  push: PushService;
  schedule: ScheduleService;
  recordings: RecordingService;
}

/** Собирает приложение: плагины, определение пользователя, все модули. Используется сервером и тестами. */
export async function buildApp(ctx: AppContext, options: { logger?: boolean } = {}): Promise<{ app: FastifyInstance; services: Services }> {
  const app = Fastify({
    logger: options.logger ?? false,
    // Доверяем только nginx на этой же машине: подделать адрес через X-Forwarded-For снаружи нельзя.
    trustProxy: ["127.0.0.1", "::1"],
    bodyLimit: 64 * 1024,
  });

  await app.register(cookie);
  await app.register(websocket, { options: { maxPayload: 4096 } });
  await app.register(rateLimit, { global: false });

  app.decorateRequest("viewer", null);
  // Картинки (аватар, баннер, эмодзи) приходят телом запроса как есть; формат проверяется по содержимому.
  app.addContentTypeParser(IMAGE_CONTENT_TYPES, { parseAs: "buffer", bodyLimit: 4 * 1024 * 1024 }, (_request, body, done) => {
    done(null, body);
  });

  app.addHook("onRequest", async (request) => {
    const session = sessionToken(request);
    if (!session) return;
    // Защита от CSRF для сайта: изменения по cookie принимаются только со своего домена.
    if (session.fromCookie && !SAFE_METHODS.has(request.method)) {
      const origin = request.headers.origin;
      if (origin && !ctx.config.allowedOrigins.has(origin)) throw forbidden("Запрос с чужого сайта");
    }
    request.viewer = await findViewer(ctx, session.token);
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      return reply.code(error.status).send({ error: error.code, message: error.message });
    }
    const pgCode = (error as { code?: string }).code;
    if (pgCode === "22P02") return reply.code(404).send({ error: "not_found", message: "Не найдено" });
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 429) return reply.code(429).send({ error: "rate_limited", message: "Слишком много попыток, подождите минуту" });
    if (status && status >= 400 && status < 500) {
      return reply.code(status).send({ error: "bad_request", message: "Некорректный запрос" });
    }
    request.log.error(error);
    return reply.code(500).send({ error: "internal", message: "Что-то пошло не так. Попробуйте ещё раз" });
  });

  const channels = new ChannelRepository(ctx.db, ctx.hub, ctx.config);
  const moments = new MomentService(ctx, channels);
  const predictions = new PredictionService(ctx, moments);
  const chat = new ChatService(ctx, moments);
  const push = new PushService(ctx);
  const live = new LiveService(ctx, push);
  const profile = new ProfileService(ctx);
  const schedule = new ScheduleService(ctx, channels, push);
  const recordings = new RecordingService(ctx, channels);

  app.get("/api/health", async () => ({ ok: true }));
  registerAuthRoutes(app, ctx);
  registerDiscoveryRoutes(app, ctx, channels, moments, schedule, recordings);
  registerChannelRoutes(app, ctx, channels, { moments, predictions, chat, profile, schedule, recordings });
  registerChatRoutes(app, ctx, channels, chat);
  registerPredictionRoutes(app, predictions);
  registerStudioRoutes(app, ctx, channels, { predictions, moments, chat, profile, schedule });
  registerAdminRoutes(app, ctx);
  registerMediaRoutes(app, live);
  registerPushRoutes(app, ctx, push);
  registerProfileRoutes(app, ctx, profile);
  registerScheduleRoutes(app, schedule);
  registerRecordingRoutes(app, channels, recordings);
  app.addHook("onClose", async () => push.close());

  return { app, services: { live, push, schedule, recordings } };
}
