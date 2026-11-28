"use client";

import { useState, type CSSProperties } from "react";
import { api } from "@/lib/api-client";
import { formatCount, formatDuration } from "@/lib/format";
import { useElapsedSeconds } from "@/lib/useElapsedSeconds";
import { toneStyle } from "@/theme/tones";
import type { Prediction } from "@/types";
import styles from "./PredictionCard.module.css";

const PARTICIPANT_FORMS = ["участник", "участника", "участников"] as const;
/** Награда за верный прогноз (api/src/modules/predictions). Участие бесплатное — искры не списываются. */
const REWARD_SPARKS = 100;

interface PredictionCardProps {
  prediction: Prediction;
  /** Голосовать могут вошедшие зрители, но не автор эфира. */
  canVote: boolean;
  onVoted: (prediction: Prediction) => void;
}

/** Прогноз зрителей: таймер, варианты с долей голосов, выбор варианта, итог. */
export function PredictionCard({ prediction, canVote, onVoted }: PredictionCardProps) {
  const elapsed = useElapsedSeconds(`${prediction.id}:${prediction.endsInSeconds}`);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const secondsLeft = Math.max(0, prediction.endsInSeconds - elapsed);
  const open = prediction.status === "open" && secondsLeft > 0;
  const choice = prediction.myOutcomeId;

  async function vote(outcomeId: string) {
    setBusy(true);
    setError(null);
    try {
      onVoted((await api.vote(prediction.id, outcomeId)).prediction);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось принять прогноз");
    } finally {
      setBusy(false);
    }
  }

  const headStatus =
    prediction.status === "resolved" ? "итог подведён" : open ? `ещё ${formatDuration(secondsLeft)}` : "приём прогнозов закрыт";

  function footer(): string {
    if (error) return error;
    if (prediction.status === "resolved") {
      if (!choice) return `Прогноз завершён · ${formatCount(prediction.participants, PARTICIPANT_FORMS, { compact: false })}`;
      return choice === prediction.winningOutcomeId ? `Верно! +${REWARD_SPARKS} искр` : "В этот раз не угадали";
    }
    if (choice) return `Прогноз принят · за верный ответ +${REWARD_SPARKS} искр`;
    return `Бесплатно · за верный ответ +${REWARD_SPARKS} искр · ${formatCount(prediction.participants, PARTICIPANT_FORMS, { compact: false })}`;
  }

  return (
    <div className={styles.card} role="group" aria-labelledby={`prediction-${prediction.id}`}>
      <div className={styles.head}>
        <span>ПРОГНОЗ</span>
        <span>{headStatus}</span>
      </div>
      <p id={`prediction-${prediction.id}`} className={styles.question}>{prediction.question}</p>

      {prediction.outcomes.map((outcome) => {
        const selected = choice === outcome.id || prediction.winningOutcomeId === outcome.id;
        return (
          <button
            key={outcome.id}
            type="button"
            disabled={!open || !canVote || busy || choice !== null}
            aria-pressed={choice === outcome.id}
            className={`${styles.outcome} ${selected ? styles.selected : ""}`}
            style={{ ...toneStyle(outcome.tone), "--share": `${outcome.percent}%` } as CSSProperties}
            onClick={() => vote(outcome.id)}
          >
            <span className={styles.fill} aria-hidden="true" />
            <span className={styles.label}>
              {outcome.label}
              {prediction.winningOutcomeId === outcome.id && " ✓"}
            </span>
            <span className={styles.percent}>{outcome.percent}%</span>
          </button>
        );
      })}

      <p className={styles.footer}>{footer()}</p>
    </div>
  );
}
