"use client";

import { useState } from "react";
import { ClipCard } from "@/components/clips/ClipCard/ClipCard";
import { AutoGrid } from "@/components/ui/AutoGrid/AutoGrid";
import { Section } from "@/components/ui/Section/Section";
import { formatDuration, formatScheduleDate } from "@/lib/format";
import type { Clip, Recording } from "@/types";
import styles from "./RecordingsSection.module.css";

/** Записи прошлых эфиров (смотрятся здесь же) и клипы канала. */
export function RecordingsSection({ recordings, clips }: { recordings: Recording[]; clips: Clip[] }) {
  const [playing, setPlaying] = useState<Recording | null>(null);

  return (
    <>
      {clips.length > 0 && (
        <Section id="clips" title="Клипы" subtitle="Лучшие моменты, которые сохранили зрители" size="sm">
          <AutoGrid min={220} gap={16}>
            {clips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} />
            ))}
          </AutoGrid>
        </Section>
      )}
      {recordings.length > 0 && (
        <Section id="recordings" title="Записи эфиров" subtitle="Хранятся 3 дня после эфира" size="sm">
          {playing && (
            <div className={styles.player}>
              <video key={playing.id} src={playing.url} controls autoPlay playsInline className={styles.video} />
              <p className={styles.playingTitle}>{playing.title}</p>
            </div>
          )}
          <ul className={styles.list}>
            {recordings.map((recording) => (
              <li key={recording.id}>
                <button
                  type="button"
                  className={`${styles.row} ${playing?.id === recording.id ? styles.active : ""}`}
                  aria-pressed={playing?.id === recording.id}
                  onClick={() => setPlaying(recording)}
                >
                  <span className={styles.play} aria-hidden="true">▶</span>
                  <span className={styles.text}>
                    <strong>{recording.title}</strong>
                    <span>
                      {formatScheduleDate(recording.startedAt)} · {formatDuration(recording.durationSeconds)} · {recording.category}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
