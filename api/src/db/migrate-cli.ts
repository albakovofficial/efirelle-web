import { loadConfig } from "../config.js";
import { Database } from "./database.js";
import { migrate } from "./migrate.js";

const db = new Database(loadConfig().databaseUrl);
try {
  const applied = await migrate(db);
  console.log(applied.length ? `Применены миграции: ${applied.join(", ")}` : "Новых миграций нет");
} finally {
  await db.close();
}
