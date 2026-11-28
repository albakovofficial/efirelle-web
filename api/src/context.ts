import type { Config } from "./config.js";
import type { Database } from "./db/database.js";
import type { Mailer } from "./lib/mailer.js";
import type { ChatHub } from "./realtime/hub.js";

/** Общие зависимости, которые получают все модули API. */
export interface AppContext {
  config: Config;
  db: Database;
  hub: ChatHub;
  mailer: Mailer;
}

/** Текущий пользователь запроса. */
export interface Viewer {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: "user" | "admin";
  tone: string;
  sparks: number;
  createdAt: Date;
}
