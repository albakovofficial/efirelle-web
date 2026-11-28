import type { FastifyInstance } from "fastify";
import type { AppContext } from "../../context.js";
import { badRequest, notFound } from "../../lib/http.js";
import { requireViewer } from "../auth/sessions.js";
import type { ChatService } from "../chat/service.js";
import type { MomentService } from "../moments/service.js";
import type { PredictionService } from "../predictions/service.js";
import type { ChannelRepository, ChannelRow } from "./repository.js";

type SlugParams = { Params: { slug: string } };

/** Страница канала и всё, что зрителю нужно для просмотра эфира. */
export function registerChannelRoutes(
  app: FastifyInstance,
  ctx: AppContext,
  channels: ChannelRepository,
  moments: MomentService,
  predictions: PredictionService,
  chat: ChatService,
): void {
  async function channelOr404(slug: string): Promise<ChannelRow> {
    const channel = await channels.bySlug(slug);
    if (!channel) throw notFound("Канал не найден");
    return channel;
  }

  app.get<SlugParams>("/api/channels/:slug", async (request) => {
    const channel = await channelOr404(request.params.slug);
    const viewer = request.viewer;
    return {
      ...channels.toStatus(channel),
      isFollowing: viewer ? await channels.isFollowing(viewer.id, channel.id) : false,
      isOwner: viewer?.id === channel.id,
    };
  });

  /** Всё для страницы эфира одним запросом: канал, отметки, прогноз, история чата. */
  app.get<SlugParams>("/api/channels/:slug/watch", async (request) => {
    const channel = await channelOr404(request.params.slug);
    const viewerId = request.viewer?.id ?? null;
    return {
      ...channels.toStatus(channel),
      isFollowing: viewerId ? await channels.isFollowing(viewerId, channel.id) : false,
      isOwner: viewerId === channel.id,
      markers: await moments.ofCurrentSession(channel.id),
      prediction: await predictions.current(channel.id, viewerId),
      chat: await chat.history(channel.id, viewerId),
    };
  });

  app.put<SlugParams>("/api/channels/:slug/follow", async (request) => {
    const viewer = requireViewer(request);
    const channel = await channelOr404(request.params.slug);
    if (channel.id === viewer.id) throw badRequest("Нельзя подписаться на свой канал");
    await ctx.db.pool.query("INSERT INTO follows (follower_id, channel_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [viewer.id, channel.id]);
    return { isFollowing: true, followers: (await channelOr404(channel.username)).followers };
  });

  app.delete<SlugParams>("/api/channels/:slug/follow", async (request) => {
    const viewer = requireViewer(request);
    const channel = await channelOr404(request.params.slug);
    await ctx.db.pool.query("DELETE FROM follows WHERE follower_id = $1 AND channel_id = $2", [viewer.id, channel.id]);
    return { isFollowing: false, followers: (await channelOr404(channel.username)).followers };
  });

  app.get("/api/me/following", async (request) => {
    const viewer = requireViewer(request);
    return { channels: await channels.following(viewer.id) };
  });
}
