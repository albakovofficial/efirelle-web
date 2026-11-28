import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../../context.js";
import { badRequest, notFound, parse } from "../../lib/http.js";
import { requireAdmin, requireViewer } from "../auth/sessions.js";
import { parsePrivateKey } from "./apns.js";
import type { PushService } from "./service.js";

const deviceBody = z.object({
  token: z.string().trim().toLowerCase().regex(/^[0-9a-f]{32,200}$/, "Некорректный токен устройства"),
  environment: z.enum(["production", "sandbox"]),
});
const pushToken = z.string().trim().toLowerCase().regex(/^[0-9a-f]{32,400}$/, "Некорректный токен");
/** Токен запуска Live Activity; `null` — пользователь выключил Live Activities для приложения. */
const activityStartBody = z.object({ startToken: pushToken.nullish() });
const activityBody = z.object({
  token: pushToken,
  channel: z.string().trim().toLowerCase(),
  environment: z.enum(["production", "sandbox"]),
});
const preferencesBody = z.object({ live: z.boolean() });
const apnsBody = z.object({
  keyId: z.string().trim().regex(/^[A-Z0-9]{10}$/, "Key ID — 10 латинских букв и цифр"),
  teamId: z.string().trim().regex(/^[A-Z0-9]{10}$/, "Team ID — 10 латинских букв и цифр"),
  privateKey: z.string().trim().min(100, "Вставьте содержимое файла .p8 целиком").max(4000),
});

/** Устройства, Live Activities и настройки уведомлений пользователя; ключ APNs — в админке. */
export function registerPushRoutes(app: FastifyInstance, ctx: AppContext, push: PushService): void {
  /** Приложение сообщает токен после входа и при каждом запуске (Apple может его сменить). */
  app.put("/api/me/devices", async (request) => {
    const viewer = requireViewer(request);
    const { token, environment } = parse(deviceBody, request.body);
    await ctx.db.pool.query(
      `INSERT INTO devices (token, user_id, environment) VALUES ($1, $2, $3)
       ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, environment = EXCLUDED.environment, updated_at = now()`,
      [token, viewer.id, environment],
    );
    return { ok: true };
  });

  /** Перед выходом из аккаунта приложение отвязывает устройство. */
  app.delete<{ Params: { token: string } }>("/api/me/devices/:token", async (request) => {
    const viewer = requireViewer(request);
    await ctx.db.pool.query("DELETE FROM devices WHERE token = $1 AND user_id = $2", [request.params.token.toLowerCase(), viewer.id]);
    return { ok: true };
  });

  /** iOS 17.2+: токен, которым сервер запускает Live Activity «канал в эфире» вместо обычного уведомления. */
  app.put<{ Params: { token: string } }>("/api/me/devices/:token/live-activity", async (request) => {
    const viewer = requireViewer(request);
    const { startToken } = parse(activityStartBody, request.body);
    const updated = await ctx.db.pool.query("UPDATE devices SET activity_start_token = $1 WHERE token = $2 AND user_id = $3", [
      startToken ?? null,
      request.params.token.toLowerCase(),
      viewer.id,
    ]);
    if (updated.rowCount === 0) throw notFound("Устройство не найдено");
    return { ok: true };
  });

  /** Запущенная Live Activity сообщает свой токен — по нему придут зрители и конец эфира. */
  app.put("/api/me/live-activities", async (request) => {
    const viewer = requireViewer(request);
    const { token, channel, environment } = parse(activityBody, request.body);
    const saved = await ctx.db.pool.query(
      `INSERT INTO live_activities (token, user_id, channel_id, environment)
       SELECT $1, $2, c.user_id, $4 FROM channels c JOIN users u ON u.id = c.user_id WHERE u.username = $3
       ON CONFLICT (token) DO UPDATE SET channel_id = EXCLUDED.channel_id, user_id = EXCLUDED.user_id`,
      [token, viewer.id, channel, environment],
    );
    if (saved.rowCount === 0) throw notFound("Канал не найден");
    return { ok: true };
  });

  app.get("/api/me/notifications", async (request) => {
    const viewer = requireViewer(request);
    const row = await ctx.db.one<{ push_live: boolean }>("SELECT push_live FROM users WHERE id = $1", [viewer.id]);
    return { live: row?.push_live ?? true };
  });

  app.put("/api/me/notifications", async (request) => {
    const viewer = requireViewer(request);
    const { live } = parse(preferencesBody, request.body);
    await ctx.db.pool.query("UPDATE users SET push_live = $1 WHERE id = $2", [live, viewer.id]);
    return { live };
  });

  app.get("/api/admin/push", async (request) => {
    requireAdmin(request);
    return push.status();
  });

  /** Ключ сохраняется, но никогда не отдаётся обратно — только Key ID и Team ID. */
  app.put("/api/admin/push", async (request) => {
    requireAdmin(request);
    const credentials = parse(apnsBody, request.body);
    try {
      parsePrivateKey(credentials.privateKey);
    } catch {
      throw badRequest("Это не ключ APNs: вставьте содержимое файла AuthKey_….p8 целиком", "invalid_key");
    }
    await push.configure(credentials);
    return push.status();
  });

  app.post("/api/admin/push/test", async (request) => {
    const viewer = requireAdmin(request);
    return push.sendTest(viewer.id, viewer.username);
  });
}
