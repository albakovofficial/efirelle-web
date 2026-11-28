import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import type { Config } from "../src/config.js";
import type { AppContext } from "../src/context.js";
import { Database } from "../src/db/database.js";
import { migrate } from "../src/db/migrate.js";
import type { Mail, Mailer } from "../src/lib/mailer.js";
import { ChatHub } from "../src/realtime/hub.js";
import type { LiveService } from "../src/modules/media/service.js";
import type { PushDevice, PushMessage, PushResult, PushSender } from "../src/modules/push/apns.js";

export interface TestApp {
  app: FastifyInstance;
  ctx: AppContext;
  live: LiveService;
  mails: Mail[];
  /** Уведомления, «отправленные» в APNs. */
  pushes: { device: PushDevice; message: PushMessage }[];
  /** Что ответит APNs на токен (по умолчанию — доставлено). */
  pushResults: Map<string, PushResult>;
  close(): Promise<void>;
}

/** Приложение на чистой базе: схема пересоздаётся перед каждым набором тестов. */
export async function createTestApp(): Promise<TestApp> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Для тестов нужна DATABASE_URL");
  const db = new Database(databaseUrl);
  await db.pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await migrate(db);

  const mails: Mail[] = [];
  const mailer: Mailer = {
    isEnabled: true,
    async send(mail) {
      mails.push(mail);
    },
  };
  const config: Config = {
    port: 0,
    host: "127.0.0.1",
    databaseUrl,
    publicUrl: "https://efirelle.test",
    allowedOrigins: new Set(["https://efirelle.test"]),
    rtmpUrl: "rtmp://efirelle.test/live",
    mediaApiUrl: "http://127.0.0.1:1",
    adminEmails: new Set(["admin@efirelle.test"]),
    smtp: null,
    isProduction: false,
  };
  const pushes: TestApp["pushes"] = [];
  const pushResults = new Map<string, PushResult>();
  const pushTransport: PushSender = {
    async send(device, message) {
      pushes.push({ device, message });
      return pushResults.get(device.token) ?? "sent";
    },
    close() {},
  };
  const ctx: AppContext = { config, db, hub: new ChatHub(), mailer, pushTransport };
  const { app, services } = await buildApp(ctx);
  await app.ready();
  return {
    app,
    ctx,
    live: services.live,
    mails,
    pushes,
    pushResults,
    async close() {
      await app.close();
      await db.close();
    },
  };
}

export interface TestUser {
  token: string;
  id: string;
  username: string;
}

let counter = 0;

/** Регистрирует пользователя и возвращает его токен. */
export async function registerUser(app: FastifyInstance, overrides: Partial<{ email: string; username: string; displayName: string }> = {}): Promise<TestUser> {
  counter += 1;
  const username = overrides.username ?? `user_${counter}_${Date.now() % 100000}`;
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      email: overrides.email ?? `${username}@efirelle.test`,
      password: "very-secret-1",
      username,
      displayName: overrides.displayName ?? `Пользователь ${counter}`,
    },
  });
  if (response.statusCode !== 201) throw new Error(`Регистрация не удалась: ${response.body}`);
  const body = response.json() as { token: string; user: { id: string; username: string } };
  return { token: body.token, id: body.user.id, username: body.user.username };
}

export function auth(user: TestUser) {
  return { authorization: `Bearer ${user.token}` };
}

/** Ключ эфира канала из студии: часть после `?key=`. */
export async function streamKey(app: FastifyInstance, user: TestUser): Promise<string> {
  const studio = (await app.inject({ method: "GET", url: "/api/studio", headers: auth(user) })).json() as {
    ingest: { streamKey: string };
  };
  return studio.ingest.streamKey.split("?key=")[1]!;
}
