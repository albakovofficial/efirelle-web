import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../../context.js";
import { HttpError, notFound, parse } from "../../lib/http.js";
import { send, type ChatClient } from "../../realtime/hub.js";
import { requireViewer } from "../auth/sessions.js";
import type { ChannelRepository } from "../channels/repository.js";
import { MAX_MESSAGE_LENGTH, REPORT_REASONS, type ChatService } from "./service.js";

const replyTo = z.string().regex(/^\d{1,18}$/).optional();
const clientMessage = z.object({ type: z.literal("send"), text: z.string().max(MAX_MESSAGE_LENGTH * 2), replyTo });
const sendBody = z.object({ text: z.string().max(MAX_MESSAGE_LENGTH * 2), replyTo });
const reportBody = z.object({ reason: z.enum(REPORT_REASONS, { message: "Выберите причину жалобы" }) });
const blockParams = z.object({ username: z.string().trim().toLowerCase().max(24) });

type SlugParams = { Params: { slug: string } };
type IdParams = { Params: { id: string } };

/** Чат: подключение в реальном времени, отправка, жалобы, блокировки. */
export function registerChatRoutes(app: FastifyInstance, ctx: AppContext, channels: ChannelRepository, chat: ChatService): void {
  app.get<SlugParams>("/api/channels/:slug/chat", async (request) => {
    const channel = await channels.bySlug(request.params.slug);
    if (!channel) throw notFound("Канал не найден");
    return { messages: await chat.history(channel.id, request.viewer?.id ?? null) };
  });

  /** Отправка без WebSocket — для клиентов, которые сначала шлют, а потом слушают. */
  app.post<SlugParams>("/api/channels/:slug/chat", async (request, reply) => {
    const viewer = requireViewer(request);
    const channel = await channels.bySlug(request.params.slug);
    if (!channel) throw notFound("Канал не найден");
    const { text, replyTo: replyToId } = parse(sendBody, request.body);
    reply.code(201);
    return { message: await chat.send(viewer, channel.id, text, replyToId) };
  });

  /**
   * WebSocket чата. Сразу после подключения приходит число зрителей; затем события
   * message / deleted / viewers / live / prediction / moment / raid. Писать могут только вошедшие.
   */
  app.get<SlugParams>("/api/channels/:slug/ws", { websocket: true }, async (socket, request) => {
    const channel = await channels.bySlug(request.params.slug);
    if (!channel) {
      send(socket, { type: "error", message: "Канал не найден" });
      socket.close(4404, "not found");
      return;
    }
    const viewer = request.viewer;
    const client: ChatClient = {
      socket,
      userId: viewer?.id ?? null,
      blockedIds: viewer ? await chat.blockedIds(viewer.id) : new Set(),
    };
    ctx.hub.join(channel.id, client);

    socket.on("message", async (data) => {
      if (!viewer) {
        send(socket, { type: "error", message: "Войдите, чтобы писать в чат" });
        return;
      }
      try {
        const payload = parse(clientMessage, JSON.parse(String(data)));
        await chat.send(viewer, channel.id, payload.text, payload.replyTo);
      } catch (error) {
        const message = error instanceof HttpError ? error.message : "Не удалось отправить сообщение";
        send(socket, { type: "error", message });
      }
    });
    socket.on("close", () => ctx.hub.leave(channel.id, client));
    // Пока шли запросы к базе, зритель мог уже отключиться — тогда «close» не придёт.
    if (socket.readyState !== socket.OPEN) ctx.hub.leave(channel.id, client);
  });

  app.delete<IdParams>("/api/chat/messages/:id", async (request) => {
    await chat.delete(requireViewer(request), request.params.id);
    return { ok: true };
  });

  app.post<IdParams>("/api/chat/messages/:id/report", async (request, reply) => {
    const viewer = requireViewer(request);
    const { reason } = parse(reportBody, request.body);
    await chat.report(viewer, request.params.id, reason);
    reply.code(201);
    return { ok: true };
  });

  app.get("/api/me/blocks", async (request) => {
    const viewer = requireViewer(request);
    const users = await chat.blockedUsers(viewer.id);
    return { users: users.map((u) => ({ id: u.id, slug: u.username, name: u.display_name })) };
  });

  app.put<{ Params: { username: string } }>("/api/me/blocks/:username", async (request) => {
    const viewer = requireViewer(request);
    const { username } = parse(blockParams, request.params);
    const target = await ctx.db.one<{ id: string }>("SELECT id FROM users WHERE username = $1", [username]);
    if (!target) throw notFound("Пользователь не найден");
    await chat.block(viewer.id, target.id);
    return { ok: true };
  });

  app.delete<{ Params: { username: string } }>("/api/me/blocks/:username", async (request) => {
    const viewer = requireViewer(request);
    const { username } = parse(blockParams, request.params);
    const target = await ctx.db.one<{ id: string }>("SELECT id FROM users WHERE username = $1", [username]);
    if (target) await chat.unblock(viewer.id, target.id);
    return { ok: true };
  });
}
