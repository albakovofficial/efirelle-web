import { spawn, type ChildProcess } from "node:child_process";
import type { AppContext } from "../../context.js";
import { randomToken } from "../../lib/crypto.js";

/** Качества, которые делает перекодирование, кроме исходного. */
export const VARIANTS = [
  { name: "720", label: "720p", height: 720, video: "2500k", maxrate: "2800k", bufsize: "5000k", audio: "128k" },
  { name: "480", label: "480p", height: 480, video: "1000k", maxrate: "1200k", bufsize: "2000k", audio: "96k" },
] as const;

/** Перекодированные варианты публикуются сюда; авторизация — внутренним ключом. */
const VARIANT_PATH = /^variants\/([a-z0-9_]{3,24})\/(\d{3})$/;
const SETTINGS_KEY = "transcode";
const RTMP = "rtmp://127.0.0.1:1935";

export function variantFromPath(path: string): { username: string; variant: string } | null {
  const match = VARIANT_PATH.exec(path);
  return match ? { username: match[1]!, variant: match[2]! } : null;
}

/**
 * Перекодирование эфиров в 720p и 480p через ffmpeg. Включается в админке: на слабом сервере
 * два дополнительных кодирования могут не успевать, поэтому по умолчанию выключено.
 */
export class Transcoder {
  /** Внутренний ключ публикации вариантов; меняется при каждом запуске API. */
  readonly internalKey = randomToken(24);
  private readonly processes = new Map<string, ChildProcess>();
  private enabled: boolean | null = null;

  constructor(private readonly ctx: AppContext) {}

  async isEnabled(): Promise<boolean> {
    if (this.enabled === null) {
      const row = await this.ctx.db.one<{ value: { enabled: boolean } }>("SELECT value FROM settings WHERE key = $1", [SETTINGS_KEY]);
      this.enabled = row?.value.enabled ?? false;
    }
    return this.enabled;
  }

  async setEnabled(enabled: boolean): Promise<void> {
    await this.ctx.db.pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [SETTINGS_KEY, { enabled }],
    );
    this.enabled = enabled;
    if (!enabled) this.stopAll();
  }

  /** Перекодирование этого эфира идёт — значит, есть 720p и 480p. */
  isActive(username: string): boolean {
    return this.processes.has(username);
  }

  /** Запускает ffmpeg для эфира, если включено и ещё не запущено. */
  async start(username: string): Promise<void> {
    if (this.processes.has(username) || !(await this.isEnabled())) return;
    const args = ["-hide_banner", "-loglevel", "error", "-rw_timeout", "10000000", "-i", `${RTMP}/live/${username}`];
    const split = VARIANTS.map((v) => `[s${v.name}]scale=-2:${v.height}[v${v.name}]`).join(";");
    args.push("-filter_complex", `[0:v]split=${VARIANTS.length}${VARIANTS.map((v) => `[s${v.name}]`).join("")};${split}`);
    for (const v of VARIANTS) {
      args.push(
        "-map", `[v${v.name}]`, "-map", "0:a?",
        "-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency",
        "-b:v", v.video, "-maxrate", v.maxrate, "-bufsize", v.bufsize,
        "-g", "60", "-keyint_min", "60", "-sc_threshold", "0",
        "-c:a", "aac", "-b:a", v.audio,
        "-f", "flv", `${RTMP}/variants/${username}/${v.name}?key=${this.internalKey}`,
      );
    }
    const child = spawn("ffmpeg", args, { stdio: "ignore" });
    this.processes.set(username, child);
    const forget = () => {
      if (this.processes.get(username) === child) this.processes.delete(username);
    };
    child.on("exit", forget);
    child.on("error", forget); // ffmpeg не установлен — просто без вариантов.
  }

  stop(username: string): void {
    this.processes.get(username)?.kill("SIGTERM");
    this.processes.delete(username);
  }

  stopAll(): void {
    for (const username of [...this.processes.keys()]) this.stop(username);
  }
}
