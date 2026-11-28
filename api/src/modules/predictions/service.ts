import type { AppContext } from "../../context.js";
import { badRequest, conflict, notFound } from "../../lib/http.js";
import type { MomentService } from "../moments/service.js";

/** Искры за верный прогноз. Искры не покупаются и не выводятся — это только награда. */
export const PREDICTION_REWARD = 100;
const OUTCOME_TONES = ["sky", "peach", "mint", "lavender"] as const;

export interface PredictionDto {
  id: string;
  question: string;
  status: "open" | "locked" | "resolved" | "cancelled";
  endsInSeconds: number;
  participants: number;
  outcomes: { id: string; label: string; percent: number; votes: number; tone: string }[];
  myOutcomeId: string | null;
  winningOutcomeId: string | null;
}

interface PredictionRow {
  id: string;
  channel_id: string;
  question: string;
  closes_at: Date;
  winning_outcome_id: string | null;
  cancelled_at: Date | null;
}

interface OutcomeRow {
  id: string;
  label: string;
  votes: number;
}

/** Прогнозы зрителей: участие бесплатное, верный ответ приносит искры. */
export class PredictionService {
  constructor(
    private readonly ctx: AppContext,
    private readonly moments: MomentService,
  ) {}

  /** Последний прогноз канала, если он ещё не закрыт окончательно или закрыт недавно. */
  async current(channelId: string, viewerId: string | null): Promise<PredictionDto | null> {
    const row = await this.ctx.db.one<PredictionRow>(
      `SELECT id::text, channel_id, question, closes_at, winning_outcome_id::text, cancelled_at FROM predictions
       WHERE channel_id = $1 AND cancelled_at IS NULL
         AND (winning_outcome_id IS NULL OR created_at > now() - interval '10 minutes')
       ORDER BY created_at DESC LIMIT 1`,
      [channelId],
    );
    return row ? this.toDto(row, viewerId) : null;
  }

  async create(channelId: string, question: string, outcomes: string[], durationSeconds: number): Promise<PredictionDto> {
    const open = await this.ctx.db.one(
      "SELECT 1 FROM predictions WHERE channel_id = $1 AND winning_outcome_id IS NULL AND cancelled_at IS NULL",
      [channelId],
    );
    if (open) throw conflict("Сначала завершите текущий прогноз", "prediction_active");

    const prediction = await this.ctx.db.transaction(async (client) => {
      const row = await this.ctx.db.one<PredictionRow>(
        `INSERT INTO predictions (channel_id, question, closes_at) VALUES ($1, $2, now() + make_interval(secs => $3))
         RETURNING id::text, channel_id, question, closes_at, winning_outcome_id::text, cancelled_at`,
        [channelId, question, durationSeconds],
        client,
      );
      for (const [index, label] of outcomes.entries()) {
        await client.query("INSERT INTO prediction_outcomes (prediction_id, label, position) VALUES ($1, $2, $3)", [row!.id, label, index]);
      }
      return row!;
    });
    await this.moments.create(channelId, "prediction", question);
    return this.publish(prediction);
  }

  async vote(predictionId: string, outcomeId: string, userId: string): Promise<PredictionDto> {
    const prediction = await this.find(predictionId);
    if (prediction.cancelled_at || prediction.winning_outcome_id) throw badRequest("Прогноз уже завершён", "prediction_closed");
    if (prediction.closes_at.getTime() <= Date.now()) throw badRequest("Приём ответов закрыт", "prediction_locked");
    const outcome = await this.ctx.db.one("SELECT 1 FROM prediction_outcomes WHERE id = $1 AND prediction_id = $2", [outcomeId, predictionId]);
    if (!outcome) throw notFound("Вариант не найден");
    const inserted = await this.ctx.db.one(
      `INSERT INTO prediction_votes (prediction_id, user_id, outcome_id) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING RETURNING 1`,
      [predictionId, userId, outcomeId],
    );
    if (!inserted) throw conflict("Вы уже ответили", "already_voted");
    return this.publish(prediction, userId);
  }

  /** Подводит итог: верно ответившие получают искры. */
  async resolve(channelId: string, predictionId: string, outcomeId: string): Promise<PredictionDto> {
    const prediction = await this.find(predictionId, channelId);
    if (prediction.cancelled_at || prediction.winning_outcome_id) throw badRequest("Прогноз уже завершён", "prediction_closed");
    const outcome = await this.ctx.db.one("SELECT 1 FROM prediction_outcomes WHERE id = $1 AND prediction_id = $2", [outcomeId, predictionId]);
    if (!outcome) throw notFound("Вариант не найден");
    await this.ctx.db.transaction(async (client) => {
      await client.query("UPDATE predictions SET winning_outcome_id = $1, closes_at = LEAST(closes_at, now()) WHERE id = $2", [outcomeId, predictionId]);
      await client.query(
        `UPDATE users SET sparks = sparks + $1
         WHERE id IN (SELECT user_id FROM prediction_votes WHERE prediction_id = $2 AND outcome_id = $3)`,
        [PREDICTION_REWARD, predictionId, outcomeId],
      );
    });
    return this.publish(await this.find(predictionId));
  }

  async cancel(channelId: string, predictionId: string): Promise<PredictionDto> {
    const prediction = await this.find(predictionId, channelId);
    if (prediction.cancelled_at || prediction.winning_outcome_id) throw badRequest("Прогноз уже завершён", "prediction_closed");
    await this.ctx.db.pool.query("UPDATE predictions SET cancelled_at = now() WHERE id = $1", [predictionId]);
    return this.publish(await this.find(predictionId));
  }

  private async find(predictionId: string, channelId?: string): Promise<PredictionRow> {
    const row = await this.ctx.db.one<PredictionRow>(
      `SELECT id::text, channel_id, question, closes_at, winning_outcome_id::text, cancelled_at
       FROM predictions WHERE id = $1 AND ($2::uuid IS NULL OR channel_id = $2)`,
      [predictionId, channelId ?? null],
    );
    if (!row) throw notFound("Прогноз не найден");
    return row;
  }

  /** Рассылает обновлённый прогноз зрителям (без личного голоса) и возвращает версию для `viewerId`. */
  private async publish(row: PredictionRow, viewerId: string | null = null): Promise<PredictionDto> {
    this.ctx.hub.broadcast(row.channel_id, { type: "prediction", prediction: await this.toDto(row, null) });
    return this.toDto(row, viewerId);
  }

  private async toDto(row: PredictionRow, viewerId: string | null): Promise<PredictionDto> {
    const outcomes = await this.ctx.db.rows<OutcomeRow>(
      `SELECT o.id::text, o.label, count(v.user_id)::int AS votes
       FROM prediction_outcomes o LEFT JOIN prediction_votes v ON v.outcome_id = o.id
       WHERE o.prediction_id = $1 GROUP BY o.id ORDER BY o.position`,
      [row.id],
    );
    const total = outcomes.reduce((sum, o) => sum + o.votes, 0);
    const mine = viewerId
      ? await this.ctx.db.one<{ outcome_id: string }>(
          "SELECT outcome_id::text FROM prediction_votes WHERE prediction_id = $1 AND user_id = $2",
          [row.id, viewerId],
        )
      : null;
    const secondsLeft = Math.max(0, Math.round((row.closes_at.getTime() - Date.now()) / 1000));
    const status = row.cancelled_at ? "cancelled" : row.winning_outcome_id ? "resolved" : secondsLeft > 0 ? "open" : "locked";
    return {
      id: row.id,
      question: row.question,
      status,
      endsInSeconds: status === "open" ? secondsLeft : 0,
      participants: total,
      outcomes: outcomes.map((o, index) => ({
        id: o.id,
        label: o.label,
        votes: o.votes,
        percent: total ? Math.round((o.votes / total) * 100) : 0,
        tone: OUTCOME_TONES[index % OUTCOME_TONES.length]!,
      })),
      myOutcomeId: mine?.outcome_id ?? null,
      winningOutcomeId: row.winning_outcome_id,
    };
  }
}
