import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { notFound, parse } from "../../lib/http.js";
import { isTextAllowed } from "../../lib/profanity.js";
import { requireViewer } from "../auth/sessions.js";
import type { ChannelRepository } from "../channels/repository.js";
import type { RecordingService } from "./service.js";

const clipBody = z.object({
  title: z.string().trim().min(1, "Назовите клип").max(100, "Название — до 100 символов").refine(isTextAllowed, "Название нарушает правила"),
});

type SlugParams = { Params: { slug: string } };
type IdParams = { Params: { id: string } };

/** Записи эфиров и клипы. */
export function registerRecordingRoutes(app: FastifyInstance, channels: ChannelRepository, recordings: RecordingService): void {
  app.get<SlugParams>("/api/channels/:slug/recordings", async (request) => {
    const channel = await channels.bySlug(request.params.slug);
    if (!channel) throw notFound("Канал не найден");
    return { recordings: await recordings.recordings(channel), clips: await recordings.clipsOfChannel(channel.id) };
  });

  app.post<SlugParams>("/api/channels/:slug/clips", async (request) => {
    const viewer = requireViewer(request);
    const channel = await channels.bySlug(request.params.slug);
    if (!channel) throw notFound("Канал не найден");
    const { title } = parse(clipBody, request.body);
    return { clip: await recordings.createClip(viewer.id, channel, title) };
  });

  app.get("/api/clips", async () => ({ clips: await recordings.popularClips() }));

  app.get<IdParams>("/api/clips/:id", async (request) => ({ clip: await recordings.clip(request.params.id) }));

  /** Просмотр клипа: счётчик для «популярных». */
  app.post<IdParams>("/api/clips/:id/view", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request) => {
    await recordings.countView(request.params.id);
    return { ok: true };
  });

  app.delete<IdParams>("/api/clips/:id", async (request) => {
    const viewer = requireViewer(request);
    await recordings.deleteClip(viewer, request.params.id);
    return { ok: true };
  });
}
