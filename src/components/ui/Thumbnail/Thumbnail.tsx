import type { ReactNode } from "react";
import { toneStyle } from "@/theme/tones";
import type { Tone } from "@/types";
import styles from "./Thumbnail.module.css";

interface ThumbnailProps {
  tone: Tone;
  /** Пропорция: превью эфира 16/9, обложка категории 3/4. */
  ratio?: "16/9" | "3/4" | "free";
  radius?: "md" | "lg" | "xl";
  className?: string;
  /** Метки поверх превью (бейджи, кнопки плеера). */
  children?: ReactNode;
}

/**
 * Обложка в пастельном тоне. Пока у эфира нет кадра-превью, показываем
 * мягкую композицию из кругов; позже сюда добавится <Image>.
 */
export function Thumbnail({ tone, ratio = "16/9", radius = "lg", className, children }: ThumbnailProps) {
  const classes = [styles.thumb, styles[`ratio-${ratio.replace("/", "-")}`], styles[`radius-${radius}`], className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={classes} style={toneStyle(tone)}>
      <span className={styles.orbLarge} aria-hidden="true" />
      <span className={styles.orbSmall} aria-hidden="true" />
      {children}
    </span>
  );
}
