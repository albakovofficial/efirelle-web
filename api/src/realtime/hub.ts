import type { WebSocket } from "ws";

/** Подключённый к чату канала зритель. Анонимный зритель только читает. */
export interface ChatClient {
  socket: WebSocket;
  userId: string | null;
  /** Авторы, которых зритель заблокировал: их сообщения ему не отправляются. */
  blockedIds: Set<string>;
}

export type ServerEvent =
  | { type: "message"; message: unknown }
  | { type: "deleted"; id: string }
  | { type: "viewers"; count: number }
  | { type: "live"; live: boolean }
  | { type: "prediction"; prediction: unknown }
  | { type: "moment"; moment: unknown }
  | { type: "raid"; target: string; targetName: string }
  | { type: "error"; message: string };

/**
 * Комнаты чата в памяти процесса: кто смотрит какой канал.
 * Число подключений к комнате — это и есть число зрителей эфира.
 */
export class ChatHub {
  private readonly rooms = new Map<string, Set<ChatClient>>();

  join(channelId: string, client: ChatClient): void {
    let room = this.rooms.get(channelId);
    if (!room) {
      room = new Set();
      this.rooms.set(channelId, room);
    }
    room.add(client);
    this.broadcastViewers(channelId);
  }

  leave(channelId: string, client: ChatClient): void {
    const room = this.rooms.get(channelId);
    if (!room) return;
    room.delete(client);
    if (room.size === 0) this.rooms.delete(channelId);
    this.broadcastViewers(channelId);
  }

  viewers(channelId: string): number {
    return this.rooms.get(channelId)?.size ?? 0;
  }

  /** Отправить событие всем в комнате. `authorId` — чьё это сообщение: заблокировавшие автора его не получат. */
  broadcast(channelId: string, event: ServerEvent, authorId?: string): void {
    const room = this.rooms.get(channelId);
    if (!room) return;
    const payload = JSON.stringify(event);
    for (const client of room) {
      if (authorId && client.blockedIds.has(authorId)) continue;
      send(client.socket, payload);
    }
  }

  /** Обновить список блокировок у всех открытых подключений пользователя. */
  updateBlocks(userId: string, blockedIds: Set<string>): void {
    for (const room of this.rooms.values()) {
      for (const client of room) {
        if (client.userId === userId) client.blockedIds = new Set(blockedIds);
      }
    }
  }

  private broadcastViewers(channelId: string): void {
    this.broadcast(channelId, { type: "viewers", count: this.viewers(channelId) });
  }
}

export function send(socket: WebSocket, payload: string | ServerEvent): void {
  if (socket.readyState !== socket.OPEN) return;
  socket.send(typeof payload === "string" ? payload : JSON.stringify(payload));
}
