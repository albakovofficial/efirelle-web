"use client";

import { AutoGrid } from "@/components/ui/AutoGrid/AutoGrid";
import { Section } from "@/components/ui/Section/Section";
import { formatDuration } from "@/lib/format";
import { momentMeta, toneStyle } from "@/theme/tones";
import type { Moment } from "@/types";
import styles from "./StreamMoments.module.css";

/** Список отмеченных моментов эфира. Нажатие перематывает плеер. */
export function StreamMoments({ markers, onSeek }: { markers: Moment[]; onSeek: (seconds: number) => void }) {
  if (markers.length === 0) return null;

  return (
    <Section id="stream-moments" title="Моменты эфира" subtitle="Отмечаются автоматически — нажмите, чтобы перемотать" size="sm">
      <AutoGrid min={200} gap={12}>
        {markers.map((marker) => (
          <button
            key={marker.id}
            type="button"
            className={styles.chip}
            style={toneStyle(momentMeta[marker.kind].tone)}
            onClick={() => onSeek(marker.offsetSeconds)}
          >
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.text}>
              <span className={styles.label}>{marker.text}</span>
              <span className={styles.time}>{formatDuration(marker.offsetSeconds)}</span>
            </span>
          </button>
        ))}
      </AutoGrid>
    </Section>
  );
}
