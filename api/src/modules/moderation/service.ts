import type { AppContext, Viewer } from "../../context.js";
import { badRequest, HttpError } from "../../lib/http.js";

/** Допустимые значения медленного режима, секунд; 0 — выключен. */
export const SLOW_MODE_OPTIONS = [0, 5, 10, 30, 60] as const;
export type SlowModeSeconds = (typeof SLOW_MODE_OPTIONS)[number];
export const MAX_BLOCKED_WORDS = 50;

/** Правила чата, которые видят зрители (подсказка у поля ввода). */
export interface ChatRules {
  slowModeSeconds: number;
  followersOnly: boolean;
}

/** Настройки модерации в студии. */
export interface ModerationSettings extends ChatRules {
  blockedWords: string[];
  /** Сколько сообщений фильтр скрыл за текущий (или последний) эфир. */
  hiddenThisStream: number;
}

interface RulesRow {
  slow_mode_seconds: number;
  followers_only: boolean;
  blocked_words: string[];
}

/** Слова сравниваются без регистра и без разницы между «е» и «ё». */
export function normalizeWord(word: string): string {
  return word.trim().toLowerCase().replaceAll("ё", "е");
}

/**
 * Модерация чата канала: медленный режим, «только подписчики», запрещённые слова.
 * Автор канала и администраторы пишут без ограничений.
 */
export class ModerationService {
  constructor(private readonly ctx: AppContext) {}

  async rules(channelId: string): Promise<ChatRules> {
    const row = await this.row(channelId);
    return { slowModeSeconds: row.slow_mode_seconds, followersOnly: row.followers_only };
  }

  async settings(channelId: string): Promise<ModerationSettings> {
    const row = await this.row(channelId);
    const hidden = await this.ctx.db.one<{ hidden_messages: number }>(
      "SELECT hidden_messages FROM stream_sessions WHERE channel_id = $1 ORDER BY started_at DESC LIMIT 1",
      [channelId],
    );
    return {
      slowModeSeconds: row.slow_mode_seconds,
      followersOnly: row.followers_only,
      blockedWords: row.blocked_words,
      hiddenThisStream: hidden?.hidden_messages ?? 0,
    };
  }

  /** Меняет только переданные настройки; зрители в чате сразу получают новые правила. */
  async update(
    channelId: string,
    patch: { slowModeSeconds?: SlowModeSeconds; followersOnly?: boolean; blockedWords?: string[] },
  ): Promise<ModerationSettings> {
    const words = patch.blockedWords && [...new Set(patch.blockedWords.map(normalizeWord).filter(Boolean))];
    if (words && words.length > MAX_BLOCKED_WORDS) throw badRequest(`Не больше ${MAX_BLOCKED_WORDS} слов`);
    await this.ctx.db.pool.query(
      `UPDATE channels SET
         slow_mode_seconds = COALESCE($2, slow_mode_seconds),
         followers_only = COALESCE($3, followers_only),
         blocked_words = COALESCE($4, blocked_words)
       WHERE user_id = $1`,
      [channelId, patch.slowModeSeconds ?? null, patch.followersOnly ?? null, words ?? null],
    );
    const settings = await this.settings(channelId);
    this.ctx.hub.broadcast(channelId, {
      type: "rules",
      rules: { slowModeSeconds: settings.slowModeSeconds, followersOnly: settings.followersOnly },
    });
    return settings;
  }

  /** Проверка перед отправкой: бросает понятную ошибку, если сообщение не пройдёт. */
  async check(viewer: Viewer, channelId: string, text: string): Promise<void> {
    if (viewer.id === channelId || viewer.role === "admin") return;
    const row = await this.row(channelId);

    if (row.followers_only) {
      const follows = await this.ctx.db.one("SELECT 1 FROM follows WHERE follower_id = $1 AND channel_id = $2", [viewer.id, channelId]);
      if (!follows) throw new HttpError(403, "Писать в этом чате могут только подписчики канала", "followers_only");
    }

    if (row.slow_mode_seconds > 0) {
      const last = await this.ctx.db.one<{ wait: number }>(
        `SELECT CEIL(EXTRACT(EPOCH FROM (created_at + make_interval(secs => $3) - now())))::int AS wait
         FROM chat_messages WHERE channel_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1`,
        [channelId, viewer.id, row.slow_mode_seconds],
      );
      if (last && last.wait > 0) {
        throw new HttpError(429, `Медленный режим: следующее сообщение через ${last.wait} с`, "slow_mode");
      }
    }

    if (row.blocked_words.length > 0) {
      const normalized = normalizeWord(text);
      if (row.blocked_words.some((word) => normalized.includes(word))) {
        await this.ctx.db.pool.query(
          "UPDATE stream_sessions SET hidden_messages = hidden_messages + 1 WHERE id = (SELECT current_session_id FROM channels WHERE user_id = $1)",
          [channelId],
        );
        throw badRequest("Сообщение не прошло фильтр канала", "blocked_word");
      }
    }
  }

  private async row(channelId: string): Promise<RulesRow> {
    const row = await this.ctx.db.one<RulesRow>(
      "SELECT slow_mode_seconds, followers_only, blocked_words FROM channels WHERE user_id = $1",
      [channelId],
    );
    return row ?? { slow_mode_seconds: 0, followers_only: false, blocked_words: [] };
  }
}
