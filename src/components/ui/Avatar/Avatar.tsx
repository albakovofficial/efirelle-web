import { toneStyle } from "@/theme/tones";
import type { Tone } from "@/types";
import styles from "./Avatar.module.css";

interface AvatarProps {
  initials: string;
  tone: Tone;
  size?: "sm" | "md" | "lg" | "xl";
  shape?: "circle" | "rounded";
  /** Красная точка «в эфире» в углу. */
  live?: boolean;
  /** Кольцо вокруг: красное для эфира, тёмное для выбранного канала. */
  ring?: "live" | "active";
  /** Подпись для скринридера; без неё аватар декоративный. */
  label?: string;
}

export function Avatar({ initials, tone, size = "md", shape = "circle", live, ring, label }: AvatarProps) {
  const className = [styles.avatar, styles[size], styles[shape], ring && styles[`ring-${ring}`]]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={className}
      style={toneStyle(tone)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {initials}
      {live && <span className={styles.liveDot} />}
    </span>
  );
}
