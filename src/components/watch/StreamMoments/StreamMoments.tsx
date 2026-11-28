import { AutoGrid } from "@/components/ui/AutoGrid/AutoGrid";
import { Section } from "@/components/ui/Section/Section";
import { formatDuration } from "@/lib/format";
import { momentMeta, toneStyle } from "@/theme/tones";
import type { Moment } from "@/types";
import styles from "./StreamMoments.module.css";

/** Отмеченные моменты текущего эфира: пики чата, рейды, прогнозы, отметки автора. */
export function StreamMoments({ markers }: { markers: Moment[] }) {
  if (markers.length === 0) return null;

  return (
    <Section id="stream-moments" title="Моменты эфира" subtitle="Отмечаются автоматически и автором эфира" size="sm">
      <AutoGrid min={200} gap={12}>
        {markers.map((marker) => (
          <div key={marker.id} className={styles.chip} style={toneStyle(momentMeta[marker.kind].tone)}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.text}>
              <span className={styles.label}>{marker.text}</span>
              <span className={styles.time}>на {formatDuration(marker.offsetSeconds)} эфира</span>
            </span>
          </div>
        ))}
      </AutoGrid>
    </Section>
  );
}
