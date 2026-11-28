import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { Database } from "./db/database.js";
import { migrate } from "./db/migrate.js";
import { createMailer } from "./lib/mailer.js";
import { Uploads } from "./lib/uploads.js";
import { ChatHub } from "./realtime/hub.js";

/** Как часто сверять идущие эфиры с медиасервером и записывать пики зрителей. */
const RECONCILE_INTERVAL_MS = 30_000;

const config = loadConfig();
const db = new Database(config.databaseUrl);
const applied = await migrate(db);

const ctx = { config, db, hub: new ChatHub(), mailer: createMailer(config.smtp), uploads: new Uploads(config.uploadDir, config.publicUrl) };
const { app, services } = await buildApp(ctx, { logger: true });
if (applied.length) app.log.info({ applied }, "Применены миграции");
if (!ctx.mailer.isEnabled) app.log.warn("SMTP не настроен: письма восстановления пароля не отправляются");

await services.live.reconcile();
const timer = setInterval(() => {
  services.live.reconcile().catch((error: unknown) => app.log.error(error));
  services.live.recordPeaks().catch((error: unknown) => app.log.error(error));
  services.push.updateActivities().catch((error: unknown) => app.log.error(error));
  services.schedule.sendDueReminders().catch((error: unknown) => app.log.error(error));
  services.recordings.processPending().catch((error: unknown) => app.log.error(error));
}, RECONCILE_INTERVAL_MS);

async function shutdown(): Promise<void> {
  clearInterval(timer);
  await app.close();
  await db.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

await app.listen({ port: config.port, host: config.host });
