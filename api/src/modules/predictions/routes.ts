import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { parse } from "../../lib/http.js";
import { requireViewer } from "../auth/sessions.js";
import type { PredictionService } from "./service.js";

const voteBody = z.object({ outcomeId: z.string().regex(/^\d+$/, "Некорректный вариант") });

/** Ответ зрителя на прогноз. Участие бесплатное. */
export function registerPredictionRoutes(app: FastifyInstance, predictions: PredictionService): void {
  app.post<{ Params: { id: string } }>("/api/predictions/:id/vote", async (request) => {
    const viewer = requireViewer(request);
    const { outcomeId } = parse(voteBody, request.body);
    return { prediction: await predictions.vote(request.params.id, outcomeId, viewer.id) };
  });
}
