import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../../context.js";
import { notFound, parse } from "../../lib/http.js";
import { escapeLike, normalizeQuery } from "../../lib/text.js";
import type { ChannelRepository, StreamDto } from "../channels/repository.js";
import type { MomentService } from "../moments/service.js";

interface CategoryRow {
  id: string;
  name: string;
  group_name: string;
  tone: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  group: string;
  tone: string;
  viewers: number;
  liveCount: number;
}

const searchQuery = z.object({ q: z.string().trim().max(80).default("") });
const liveQuery = z.object({
  category: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(48),
});

/** Витрина: главная, идущие эфиры, категории, поиск. Всё доступно без входа. */
export function registerDiscoveryRoutes(app: FastifyInstance, ctx: AppContext, channels: ChannelRepository, moments: MomentService): void {
  async function categories(live: StreamDto[]): Promise<CategoryDto[]> {
    const rows = await ctx.db.rows<CategoryRow>("SELECT id, name, group_name, tone FROM categories ORDER BY position");
    return rows
      .map((row) => {
        const streams = live.filter((s) => s.categoryId === row.id);
        return {
          id: row.id,
          name: row.name,
          group: row.group_name,
          tone: row.tone,
          viewers: streams.reduce((sum, s) => sum + s.viewers, 0),
          liveCount: streams.length,
        };
      })
      .sort((a, b) => b.viewers - a.viewers || b.liveCount - a.liveCount);
  }

  app.get("/api/home", async (request) => {
    const live = await channels.live();
    return {
      following: request.viewer ? (await channels.following(request.viewer.id)).filter((c) => c.stream) : [],
      featured: live.slice(0, 5),
      moments: await moments.live(),
      categories: await categories(live),
      forYou: live,
    };
  });

  app.get("/api/streams/live", async (request) => {
    const query = parse(liveQuery, request.query);
    return { streams: await channels.live({ categoryId: query.category, limit: query.limit }) };
  });

  app.get("/api/categories", async () => {
    return { categories: await categories(await channels.live()) };
  });

  app.get<{ Params: { id: string } }>("/api/categories/:id", async (request) => {
    const all = await categories(await channels.live());
    const category = all.find((c) => c.id === request.params.id);
    if (!category) throw notFound("Категория не найдена");
    return { category, streams: await channels.live({ categoryId: category.id }) };
  });

  app.get("/api/search", async (request) => {
    const { q } = parse(searchQuery, request.query);
    const needle = normalizeQuery(q);
    if (!needle) return { query: q, streams: [], channels: [], categories: [] };
    const pattern = `%${escapeLike(needle)}%`;
    const found = await channels.search(pattern);
    const allCategories = await categories(await channels.live());
    return {
      query: q,
      streams: found.flatMap((status) => (status.stream ? [status.stream] : [])),
      channels: found.map((status) => status.channel),
      categories: allCategories.filter((c) => normalizeQuery(c.name).includes(needle)),
    };
  });
}
