import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext, Viewer } from "../../context.js";
import { hashPassword, randomCode, randomToken, sha256, verifyPassword } from "../../lib/crypto.js";
import { badRequest, conflict, HttpError, parse, unauthorized } from "../../lib/http.js";
import { endSession, requireViewer, startSession, viewerById } from "./sessions.js";

const TONES = ["lavender", "peach", "mint", "sky", "butter", "rose"] as const;
const RESET_MINUTES = 30;
const RESET_MAX_ATTEMPTS = 5;

const email = z.string().trim().toLowerCase().email("Некорректная почта").max(254);
const password = z.string().min(8, "Пароль — не короче 8 символов").max(128, "Слишком длинный пароль");
const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,24}$/, "Имя канала: 3–24 символа, латиница, цифры и _");
const displayName = z.string().trim().min(1, "Укажите имя").max(40, "Имя — до 40 символов");

const registerBody = z.object({ email, password, username, displayName });
const loginBody = z.object({ email, password: z.string().min(1, "Введите пароль") });
const forgotBody = z.object({ email });
const resetBody = z.object({ email, code: z.string().regex(/^\d{6}$/, "Код — 6 цифр"), password });
const deleteBody = z.object({ password: z.string().min(1, "Введите пароль") });

/** Публичное представление текущего пользователя. */
export function viewerDto(viewer: Viewer) {
  return {
    id: viewer.id,
    email: viewer.email,
    username: viewer.username,
    displayName: viewer.displayName,
    role: viewer.role,
    tone: viewer.tone,
    sparks: viewer.sparks,
  };
}

export function registerAuthRoutes(app: FastifyInstance, ctx: AppContext): void {
  const authLimit = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };

  app.post("/api/auth/register", authLimit, async (request, reply) => {
    const body = parse(registerBody, request.body);
    const role = ctx.config.adminEmails.has(body.email) ? "admin" : "user";
    const tone = TONES[Math.floor(Math.random() * TONES.length)];
    const passwordHash = await hashPassword(body.password);

    const userId = await ctx.db
      .transaction(async (client) => {
        const user = await ctx.db.one<{ id: string }>(
          `INSERT INTO users (email, password_hash, username, display_name, role, tone)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [body.email, passwordHash, body.username, body.displayName, role, tone],
          client,
        );
        await client.query("INSERT INTO channels (user_id, stream_key) VALUES ($1, $2)", [user!.id, randomToken(18)]);
        return user!.id;
      })
      .catch((error: { code?: string; constraint?: string }) => {
        if (error.code === "23505") {
          throw conflict(
            error.constraint?.includes("email") ? "Эта почта уже зарегистрирована" : "Это имя канала уже занято",
            error.constraint?.includes("email") ? "email_taken" : "username_taken",
          );
        }
        throw error;
      });

    const token = await startSession(ctx, reply, userId);
    reply.code(201);
    return { token, user: viewerDto((await viewerById(ctx, userId))!) };
  });

  app.post("/api/auth/login", authLimit, async (request, reply) => {
    const body = parse(loginBody, request.body);
    const user = await ctx.db.one<{ id: string; password_hash: string; banned_at: Date | null }>(
      "SELECT id, password_hash, banned_at FROM users WHERE email = $1",
      [body.email],
    );
    if (!user || !(await verifyPassword(body.password, user.password_hash))) {
      throw unauthorized("Неверная почта или пароль");
    }
    if (user.banned_at) throw new HttpError(403, "Аккаунт заблокирован за нарушение правил", "banned");
    const token = await startSession(ctx, reply, user.id);
    return { token, user: viewerDto((await viewerById(ctx, user.id))!) };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    await endSession(ctx, request, reply);
    return { ok: true };
  });

  app.post("/api/auth/password/forgot", authLimit, async (request) => {
    const body = parse(forgotBody, request.body);
    if (!ctx.mailer.isEnabled) {
      throw new HttpError(503, "Восстановление пароля временно недоступно — напишите на support@efirelle.ru", "mail_disabled");
    }
    const user = await ctx.db.one<{ id: string }>("SELECT id FROM users WHERE email = $1", [body.email]);
    // Ответ одинаковый для любой почты — чтобы нельзя было проверить, кто зарегистрирован.
    if (user) {
      const code = randomCode();
      await ctx.db.pool.query(
        `INSERT INTO password_resets (user_id, code_hash, expires_at) VALUES ($1, $2, now() + make_interval(mins => $3))
         ON CONFLICT (user_id) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0`,
        [user.id, sha256(code), RESET_MINUTES],
      );
      await ctx.mailer.send({
        to: body.email,
        subject: `Код для входа в Efirelle: ${code}`,
        text: `Ваш код для восстановления пароля: ${code}\n\nКод действует ${RESET_MINUTES} минут. Если вы не запрашивали восстановление, просто проигнорируйте это письмо.\n\nEfirelle`,
      });
    }
    return { ok: true };
  });

  app.post("/api/auth/password/reset", authLimit, async (request, reply) => {
    const body = parse(resetBody, request.body);
    const reset = await ctx.db.one<{ user_id: string; code_hash: string; attempts: number }>(
      `SELECT r.user_id, r.code_hash, r.attempts FROM password_resets r JOIN users u ON u.id = r.user_id
       WHERE u.email = $1 AND r.expires_at > now()`,
      [body.email],
    );
    if (!reset || reset.attempts >= RESET_MAX_ATTEMPTS) throw badRequest("Код устарел — запросите новый", "code_expired");
    if (reset.code_hash !== sha256(body.code)) {
      await ctx.db.pool.query("UPDATE password_resets SET attempts = attempts + 1 WHERE user_id = $1", [reset.user_id]);
      throw badRequest("Неверный код", "code_invalid");
    }
    const passwordHash = await hashPassword(body.password);
    await ctx.db.transaction(async (client) => {
      await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, reset.user_id]);
      await client.query("DELETE FROM password_resets WHERE user_id = $1", [reset.user_id]);
      // Смена пароля завершает все старые сессии.
      await client.query("DELETE FROM sessions WHERE user_id = $1", [reset.user_id]);
    });
    const token = await startSession(ctx, reply, reset.user_id);
    return { token, user: viewerDto((await viewerById(ctx, reset.user_id))!) };
  });

  app.get("/api/me", async (request) => {
    return { user: viewerDto(requireViewer(request)) };
  });

  /** Удаление аккаунта вместе с каналом, сообщениями и подписками (требование App Store 5.1.1). */
  app.delete("/api/me", authLimit, async (request, reply) => {
    const viewer = requireViewer(request);
    const body = parse(deleteBody, request.body);
    const user = await ctx.db.one<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [viewer.id]);
    if (!user || !(await verifyPassword(body.password, user.password_hash))) throw unauthorized("Неверный пароль");
    await ctx.db.pool.query("DELETE FROM users WHERE id = $1", [viewer.id]);
    await endSession(ctx, request, reply);
    return { ok: true };
  });
}
