import type { ReactNode } from "react";
import { toneStyle } from "@/theme/tones";
import type { Tone } from "@/types";
import styles from "./Tag.module.css";

/** Тег эфира или категории. Без тона — нейтральный серый. */
export function Tag({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`${styles.tag} ${tone ? styles.toned : ""}`} style={tone ? toneStyle(tone) : undefined}>
      {children}
    </span>
  );
}

export function TagList({ tags }: { tags: string[] }) {
  return (
    <span className={styles.list}>
      {tags.map((tag) => (
        <Tag key={tag}>{tag}</Tag>
      ))}
    </span>
  );
}
