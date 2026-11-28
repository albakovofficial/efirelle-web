import type { FastifyReply, FastifyRequest } from "fastify";
import type { AppContext, Viewer } from "../../context.js";
import { randomToken, sha256 } from "../../lib/crypto.js";
import { forbidden, unauthorized } from "../../lib/http.js";

export const SESSION_COOKIE = "efirelle_session";
const SESSION_DAYS = 90;

interface ViewerRow {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: "user" | "admin";
  tone: string;
  sparks: number;
  created_at: Date;
}

const VIEWER_COLUMNS = "u.id, u.email, u.username, u.display_name, u.role, u.tone, u.sparks, u.created_at";

function toViewer(row: ViewerRow): Viewer {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    tone: row.tone,
    sparks: row.sparks,
    createdAt: row.created_at,
  };
}

/** Токен из заголовка `Authorization: Bearer …` (приложение) или из cookie (сайт). */
export function sessionToken(request: FastifyRequest): { token: string; fromCookie: boolean } | null {
  const header = request.headers.authorization;
  if (header?.startsWith("Bearer ")) return { token: header.slice(7).trim(), fromCookie: false };
  const cookie = request.cookies[SESSION_COOKIE];
  return cookie ? { token: cookie, fromCookie: true } : null;
}

export async function findViewer(ctx: AppContext, token: string): Promise<Viewer | null> {
  const row = await ctx.db.one<ViewerRow>(
    `SELECT ${VIEWER_COLUMNS}
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND u.banned_at IS NULL`,
    [sha256(token)],
  );
  return row ? toViewer(row) : null;
}

export async function viewerById(ctx: AppContext, userId: string): Promise<Viewer | null> {
  const row = await ctx.db.one<ViewerRow>(`SELECT ${VIEWER_COLUMNS} FROM users u WHERE u.id = $1`, [userId]);
  return row ? toViewer(row) : null;
}

/** Создаёт сессию, ставит cookie для сайта и возвращает токен для приложения. */
export async function startSession(ctx: AppContext, reply: FastifyReply, userId: string): Promise<string> {
  const token = randomToken();
  await ctx.db.pool.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))`,
    [sha256(token), userId, SESSION_DAYS],
  );
  reply.setCookie(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: ctx.config.isProduction,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return token;
}

export async function endSession(ctx: AppContext, request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const session = sessionToken(request);
  if (session) await ctx.db.pool.query("DELETE FROM sessions WHERE token_hash = $1", [sha256(session.token)]);
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function requireViewer(request: FastifyRequest): Viewer {
  if (!request.viewer) throw unauthorized();
  return request.viewer;
}

/** Только для администраторов платформы (модерация, настройки сервиса). */
export function requireAdmin(request: FastifyRequest): Viewer {
  const viewer = requireViewer(request);
  if (viewer.role !== "admin") throw forbidden();
  return viewer;
}
