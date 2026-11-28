import type { Viewer } from "./context.js";

declare module "fastify" {
  interface FastifyRequest {
    /** Пользователь, если запрос пришёл с действующей сессией; иначе null. */
    viewer: Viewer | null;
  }
}
