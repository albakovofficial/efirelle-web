"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { formatCount, formatDuration } from "@/lib/format";
import { toneStyle } from "@/theme/tones";
import type { Prediction } from "@/types";
import styles from "./PredictionCard.module.css";

const PARTICIPANT_FORMS = ["участник", "участника", "участников"] as const;
const STAKE_SPARKS = 100;

/** Прогноз зрителей: таймер, варианты с долей голосов, выбор варианта. */
export function PredictionCard({ prediction }: { prediction: Prediction }) {
  const [secondsLeft, setSecondsLeft] = useState(prediction.endsInSeconds);
  const [choice, setChoice] = useState<string | null>(null);
  const closed = secondsLeft <= 0;

  useEffect(() => {
    if (closed) return;
    const timer = setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [closed]);

  return (
    <div className={styles.card} role="group" aria-labelledby={`prediction-${prediction.id}`}>
      <div className={styles.head}>
        <span>ПРОГНОЗ</span>
        <span>{closed ? "приём ставок закрыт" : `ещё ${formatDuration(secondsLeft)}`}</span>
      </div>
      <p id={`prediction-${prediction.id}`} className={styles.question}>{prediction.question}</p>

      {prediction.outcomes.map((outcome) => {
        const selected = choice === outcome.id;
        return (
          <button
            key={outcome.id}
            type="button"
            disabled={closed || (choice !== null && !selected)}
            aria-pressed={selected}
            className={`${styles.outcome} ${selected ? styles.selected : ""}`}
            style={{ ...toneStyle(outcome.tone), "--share": `${outcome.percent}%` } as CSSProperties}
            onClick={() => setChoice(outcome.id)}
          >
            <span className={styles.fill} aria-hidden="true" />
            <span className={styles.label}>{outcome.label}</span>
            <span className={styles.percent}>{outcome.percent}%</span>
          </button>
        );
      })}

      <p className={styles.footer}>
        {choice ? `Ставка принята · ${STAKE_SPARKS} искр` : `Ставка в искрах · ${formatCount(prediction.participants, PARTICIPANT_FORMS, { compact: false })}`}
      </p>
    </div>
  );
}
