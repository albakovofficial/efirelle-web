import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { parse } from "../../lib/http.js";
import { isTextAllowed } from "../../lib/profanity.js";
import { requireViewer } from "../auth/sessions.js";
import type { ScheduleService } from "./service.js";

const createBody = z.object({
  title: z.string().trim().min(1, "Назовите эфир").max(140, "Название — до 140 символов").refine(isTextAllowed, "Название нарушает правила"),
  categoryId: z.string().min(1),
  startsAt: z.string().datetime({ offset: true, message: "Укажите дату и время" }),
});

type IdParams = { Params: { id: string } };

/** Анонсы в студии и напоминания для зрителей. */
export function registerScheduleRoutes(app: FastifyInstance, schedule: ScheduleService): void {
  app.post("/api/studio/schedule", async (request) => {
    const viewer = requireViewer(request);
    const body = parse(createBody, request.body);
    return { scheduled: await schedule.create(viewer.id, { ...body, startsAt: new Date(body.startsAt) }) };
  });

  app.delete<IdParams>("/api/studio/schedule/:id", async (request) => {
    const viewer = requireViewer(request);
    await schedule.remove(viewer.id, request.params.id);
    return { ok: true };
  });

  app.put<IdParams>("/api/schedule/:id/remind", async (request) => {
    const viewer = requireViewer(request);
    return schedule.setReminder(viewer.id, request.params.id, true);
  });

  app.delete<IdParams>("/api/schedule/:id/remind", async (request) => {
    const viewer = requireViewer(request);
    return schedule.setReminder(viewer.id, request.params.id, false);
  });
}
