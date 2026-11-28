import { readdir, readFile } from "node:fs/promises";
import type { Database } from "./database.js";

/** api/migrations — путь от скомпилированного файла dist/src/db/migrate.js. */
const MIGRATIONS_DIR = new URL("../../../migrations/", import.meta.url);

/** Применяет по порядку SQL-файлы, которых ещё нет в таблице schema_migrations. Возвращает применённые. */
export async function migrate(db: Database): Promise<string[]> {
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);

  const files = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith(".sql")).sort();
  const applied = new Set((await db.rows<{ version: string }>("SELECT version FROM schema_migrations")).map((r) => r.version));

  const done: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(new URL(file, MIGRATIONS_DIR), "utf8");
    await db.transaction(async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
    });
    done.push(file);
  }
  return done;
}
