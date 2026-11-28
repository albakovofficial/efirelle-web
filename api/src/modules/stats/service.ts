import type { AppContext } from "../../context.js";

/** Сколько точек в графике эфира — достаточно для мини-графика и для большого. */
const CHART_POINTS = 24;
/** Сколько последних эфиров в ленте статистики. */
const STREAMS_LIMIT = 20;
/** Подписки в течение этого времени после эфира засчитываются эфиру. */
const FOLLOW_ATTRIBUTION = "30 minutes";

/** Четыре главные цифры: эта неделя и прошлая — для сравнения. */
export interface StatsSummary {
  followers: number;
  newFollowers: { week: number; previousWeek: number };
  avgViewers: { week: number; previousWeek: number };
  peak: { viewers: number; at: string | null };
  hoursLive: { week: number; previousWeek: number };
}

/** Один прошедший эфир в ленте статистики. */
export interface StreamStats {
  id: string;
  title: string;
  category: string;
  startedAt: string;
  durationSeconds: number;
  peakViewers: number;
  avgViewers: number;
  newFollowers: number;
  /** Зрители по ходу эфира, равными отрезками времени. */
  points: number[];
}

export interface ChannelStats {
  summary: StatsSummary;
  streams: StreamStats[];
}

/** Статистика канала для студии: сводка за неделю и лента прошедших эфиров. */
export class StatsService {
  constructor(private readonly ctx: AppContext) {}

  /** Запоминает текущее число зрителей идущих эфиров (вызывается по таймеру). */
  async sample(sessions: { sessionId: string; viewers: number }[]): Promise<void> {
    if (sessions.length === 0) return;
    await this.ctx.db.pool.query(
      `INSERT INTO stream_viewer_samples (session_id, viewers)
       SELECT * FROM unnest($1::bigint[], $2::int[]) ON CONFLICT DO NOTHING`,
      [sessions.map((s) => s.sessionId), sessions.map((s) => s.viewers)],
    );
  }

  async channel(channelId: string): Promise<ChannelStats> {
    const [summary, streams] = await Promise.all([this.summary(channelId), this.streams(channelId)]);
    return { summary, streams };
  }

  private async summary(channelId: string): Promise<StatsSummary> {
    const row = await this.ctx.db.one<{
      followers: number;
      followers_week: number;
      followers_prev: number;
      avg_week: number | null;
      avg_prev: number | null;
      peak: number | null;
      peak_at: Date | null;
      hours_week: number;
      hours_prev: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM follows WHERE channel_id = $1) AS followers,
         (SELECT count(*)::int FROM follows WHERE channel_id = $1 AND created_at > now() - interval '7 days') AS followers_week,
         (SELECT count(*)::int FROM follows WHERE channel_id = $1
            AND created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days') AS followers_prev,
         (SELECT round(avg(v.viewers))::int FROM stream_viewer_samples v JOIN stream_sessions s ON s.id = v.session_id
            WHERE s.channel_id = $1 AND v.at > now() - interval '7 days') AS avg_week,
         (SELECT round(avg(v.viewers))::int FROM stream_viewer_samples v JOIN stream_sessions s ON s.id = v.session_id
            WHERE s.channel_id = $1 AND v.at BETWEEN now() - interval '14 days' AND now() - interval '7 days') AS avg_prev,
         p.peak_viewers AS peak, p.started_at AS peak_at,
         (SELECT COALESCE(sum(EXTRACT(EPOCH FROM COALESCE(ended_at, now()) - started_at)), 0) / 3600
            FROM stream_sessions WHERE channel_id = $1 AND started_at > now() - interval '7 days')::float AS hours_week,
         (SELECT COALESCE(sum(EXTRACT(EPOCH FROM COALESCE(ended_at, now()) - started_at)), 0) / 3600
            FROM stream_sessions WHERE channel_id = $1
              AND started_at BETWEEN now() - interval '14 days' AND now() - interval '7 days')::float AS hours_prev
       FROM (SELECT 1) one
       LEFT JOIN LATERAL (
         SELECT peak_viewers, started_at FROM stream_sessions
         WHERE channel_id = $1 AND peak_viewers > 0 ORDER BY peak_viewers DESC, started_at DESC LIMIT 1
       ) p ON true`,
      [channelId],
    );
    const hours = (value: number) => Math.round(value * 10) / 10;
    return {
      followers: row!.followers,
      newFollowers: { week: row!.followers_week, previousWeek: row!.followers_prev },
      avgViewers: { week: row!.avg_week ?? 0, previousWeek: row!.avg_prev ?? 0 },
      peak: { viewers: row!.peak ?? 0, at: row!.peak_at?.toISOString() ?? null },
      hoursLive: { week: hours(row!.hours_week), previousWeek: hours(row!.hours_prev) },
    };
  }

  /** Завершённые эфиры длиннее минуты, новые первыми. */
  private async streams(channelId: string): Promise<StreamStats[]> {
    const sessions = await this.ctx.db.rows<{
      id: string;
      title: string;
      category: string;
      started_at: Date;
      duration: number;
      peak_viewers: number;
      avg_viewers: number | null;
      new_followers: number;
    }>(
      `SELECT s.id::text, s.title, c.name AS category, s.started_at,
              EXTRACT(EPOCH FROM s.ended_at - s.started_at)::int AS duration, s.peak_viewers,
              (SELECT round(avg(viewers))::int FROM stream_viewer_samples WHERE session_id = s.id) AS avg_viewers,
              (SELECT count(*)::int FROM follows f WHERE f.channel_id = s.channel_id
                 AND f.created_at BETWEEN s.started_at AND s.ended_at + $3::interval) AS new_followers
       FROM stream_sessions s JOIN categories c ON c.id = s.category_id
       WHERE s.channel_id = $1 AND s.ended_at IS NOT NULL AND s.ended_at - s.started_at > interval '1 minute'
       ORDER BY s.started_at DESC LIMIT $2`,
      [channelId, STREAMS_LIMIT, FOLLOW_ATTRIBUTION],
    );
    const points = await this.points(sessions.map((s) => s.id));
    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      category: s.category,
      startedAt: s.started_at.toISOString(),
      durationSeconds: s.duration,
      peakViewers: s.peak_viewers,
      avgViewers: s.avg_viewers ?? 0,
      newFollowers: s.new_followers,
      points: points.get(s.id) ?? [],
    }));
  }

  private async points(sessionIds: string[]): Promise<Map<string, number[]>> {
    const rows = await this.ctx.db.rows<{ session_id: string; viewers: number }>(
      `SELECT session_id::text, round(avg(viewers))::int AS viewers FROM (
         SELECT session_id, viewers, ntile($2) OVER (PARTITION BY session_id ORDER BY at) AS bucket
         FROM stream_viewer_samples WHERE session_id = ANY($1::bigint[])
       ) t GROUP BY session_id, bucket ORDER BY session_id, bucket`,
      [sessionIds, CHART_POINTS],
    );
    const result = new Map<string, number[]>();
    for (const row of rows) result.set(row.session_id, [...(result.get(row.session_id) ?? []), row.viewers]);
    return result;
  }
}
