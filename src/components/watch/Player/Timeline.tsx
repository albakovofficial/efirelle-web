"use client";

import type { CSSProperties } from "react";
import { formatDuration } from "@/lib/format";
import { momentMeta, tones } from "@/theme/tones";
import type { Moment } from "@/types";
import styles from "./Player.module.css";

interface TimelineProps {
  /** Текущая позиция и длина эфира в секундах. */
  position: number;
  duration: number;
  markers: Moment[];
  onSeek: (seconds: number) => void;
}

/** Шкала перемотки эфира с отметками моментов. Основа — нативный range, поэтому работает с клавиатуры. */
export function Timeline({ position, duration, markers, onSeek }: TimelineProps) {
  const percent = (seconds: number) => `${Math.min(100, (seconds / duration) * 100)}%`;

  return (
    <div className={styles.timeline} style={{ "--progress": percent(position) } as CSSProperties}>
      <input
        type="range"
        min={0}
        max={duration}
        step={1}
        value={position}
        onChange={(event) => onSeek(Number(event.target.value))}
        aria-label="Перемотка эфира"
        aria-valuetext={formatDuration(position)}
        className={styles.range}
      />
      {markers.map((marker) => (
        <button
          key={marker.id}
          type="button"
          title={marker.text}
          aria-label={`${marker.text}, ${formatDuration(marker.offsetSeconds)}`}
          className={styles.marker}
          style={{ left: percent(marker.offsetSeconds), background: tones[momentMeta[marker.kind].tone].ink }}
          onClick={() => onSeek(marker.offsetSeconds)}
        />
      ))}
    </div>
  );
}
