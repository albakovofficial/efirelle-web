import type { FastifyInstance } from "fastify";
import { requireViewer } from "../auth/sessions.js";
import type { StatsService } from "./service.js";

/** Статистика своего канала. */
export function registerStatsRoutes(app: FastifyInstance, stats: StatsService): void {
  app.get("/api/studio/stats", async (request) => {
    const viewer = requireViewer(request);
    return stats.channel(viewer.id);
  });
}
