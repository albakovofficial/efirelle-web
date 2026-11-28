import type { AppContext } from "../../context.js";
import type { StreamDto } from "../channels/repository.js";

/** Что известно о вкусах зрителя. У гостя всё пустое — тогда решают популярность и свежесть. */
export interface Taste {
  followed: Set<string>;
  blocked: Set<string>;
  /** Интерес к категории от 0 до 1: по подпискам и чатам, в которых зритель писал за месяц. */
  categories: Map<string, number>;
}

export const EMPTY_TASTE: Taste = { followed: new Set(), blocked: new Set(), categories: new Map() };

/** Вес каждого сигнала в итоговой оценке эфира. */
const WEIGHTS = {
  followed: 3,
  category: 2,
  popularity: 1,
  justStarted: 0.4,
  smallChannel: 0.2,
} as const;
/** Эфир моложе этого считается только что начавшимся — успеть к началу. */
const JUST_STARTED_SECONDS = 20 * 60;
/** Канал с меньшим числом зрителей получает небольшую прибавку, чтобы его находили. */
const SMALL_CHANNEL_VIEWERS = 10;
/** Каждый следующий эфир той же категории подряд в выдаче весит меньше — лента не однообразна. */
const SAME_CATEGORY_DECAY = 0.85;

/**
 * Порядок эфиров для зрителя: подписки и любимые категории выше, затем популярность (по логарифму —
 * большие каналы не забирают всё), прибавка только начавшимся и маленьким каналам, разнообразие категорий.
 * Заблокированные зрителем каналы не показываются.
 */
export function rankStreams(streams: StreamDto[], taste: Taste): StreamDto[] {
  const maxViewers = Math.max(1, ...streams.map((s) => s.viewers));
  const scored = streams
    .filter((s) => !taste.blocked.has(s.channel.slug))
    .map((stream) => {
      const score =
        WEIGHTS.followed * (taste.followed.has(stream.channel.slug) ? 1 : 0) +
        WEIGHTS.category * (taste.categories.get(stream.categoryId) ?? 0) +
        WEIGHTS.popularity * (Math.log1p(stream.viewers) / Math.log1p(maxViewers)) +
        WEIGHTS.justStarted * (stream.durationSeconds < JUST_STARTED_SECONDS ? 1 : 0) +
        WEIGHTS.smallChannel * (stream.viewers < SMALL_CHANNEL_VIEWERS ? 1 : 0);
      return { stream, score };
    });

  // Жадно берём лучший с учётом того, сколько эфиров его категории уже выше в выдаче.
  const ranked: StreamDto[] = [];
  const perCategory = new Map<string, number>();
  while (scored.length > 0) {
    let best = 0;
    let bestValue = -Infinity;
    scored.forEach(({ stream, score }, index) => {
      const value = score * SAME_CATEGORY_DECAY ** (perCategory.get(stream.categoryId) ?? 0);
      if (value > bestValue) {
        bestValue = value;
        best = index;
      }
    });
    const [{ stream }] = scored.splice(best, 1) as [{ stream: StreamDto; score: number }];
    ranked.push(stream);
    perCategory.set(stream.categoryId, (perCategory.get(stream.categoryId) ?? 0) + 1);
  }
  return ranked;
}

/** Собирает вкусы зрителя одним запросом. */
export async function loadTaste(ctx: AppContext, viewerId: string | null): Promise<Taste> {
  if (!viewerId) return EMPTY_TASTE;
  const row = await ctx.db.one<{ followed: string[] | null; blocked: string[] | null; categories: Record<string, number> | null }>(
    `SELECT
       (SELECT array_agg(u.username) FROM follows f JOIN users u ON u.id = f.channel_id WHERE f.follower_id = $1) AS followed,
       (SELECT array_agg(u.username) FROM blocks b JOIN users u ON u.id = b.blocked_id WHERE b.user_id = $1) AS blocked,
       (SELECT jsonb_object_agg(category_id, weight) FROM (
          SELECT category_id, sum(weight)::float AS weight FROM (
            SELECT c.category_id, 1 AS weight FROM follows f JOIN channels c ON c.user_id = f.channel_id WHERE f.follower_id = $1
            UNION ALL
            SELECT s.category_id, 1 FROM stream_sessions s
            WHERE EXISTS (
              SELECT 1 FROM chat_messages m
              WHERE m.user_id = $1 AND m.channel_id = s.channel_id
                AND m.created_at BETWEEN s.started_at AND COALESCE(s.ended_at, now())
            ) AND s.started_at > now() - interval '30 days'
          ) signals GROUP BY category_id
       ) weights) AS categories`,
    [viewerId],
  );
  const weights = Object.entries(row?.categories ?? {});
  const max = Math.max(1, ...weights.map(([, weight]) => weight));
  return {
    followed: new Set(row?.followed ?? []),
    blocked: new Set(row?.blocked ?? []),
    categories: new Map(weights.map(([id, weight]) => [id, weight / max])),
  };
}
