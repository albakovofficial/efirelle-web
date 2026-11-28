import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { parse } from "../../lib/http.js";
import { requireViewer } from "../auth/sessions.js";
import { MAX_BLOCKED_WORDS, SLOW_MODE_OPTIONS, type ModerationService } from "./service.js";

const patchBody = z
  .object({
    slowModeSeconds: z
      .number()
      .int()
      .refine((value): value is (typeof SLOW_MODE_OPTIONS)[number] => (SLOW_MODE_OPTIONS as readonly number[]).includes(value), {
        message: "Медленный режим: 0, 5, 10, 30 или 60 секунд",
      }),
    followersOnly: z.boolean(),
    blockedWords: z.array(z.string().trim().min(2, "Слово — от 2 символов").max(40, "Слово — до 40 символов")).max(MAX_BLOCKED_WORDS),
  })
  .partial();

/** Модерация чата своего канала — из студии и из щита в чате. */
export function registerModerationRoutes(app: FastifyInstance, moderation: ModerationService): void {
  app.get("/api/studio/moderation", async (request) => {
    const viewer = requireViewer(request);
    return moderation.settings(viewer.id);
  });

  app.patch("/api/studio/moderation", async (request) => {
    const viewer = requireViewer(request);
    return moderation.update(viewer.id, parse(patchBody, request.body));
  });
}
