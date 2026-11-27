import type { ReactNode } from "react";
import { toneStyle } from "@/theme/tones";
import type { Tone } from "@/types";
import styles from "./Badge.module.css";

type BadgeProps = {
  children: ReactNode;
  size?: "sm" | "md";
} & (
  | { variant: "live" | "glass" | "dark" }
  | { variant: "tone"; tone: Tone }
);

/** Короткая метка: «В ЭФИРЕ», число зрителей поверх превью, тип момента и т. п. */
export function Badge(props: BadgeProps) {
  const { children, size = "md", variant } = props;
  return (
    <span
      className={`${styles.badge} ${styles[variant]} ${styles[size]}`}
      style={props.variant === "tone" ? toneStyle(props.tone) : undefined}
    >
      {children}
    </span>
  );
}

/** Готовый бейдж эфира — чтобы текст и стиль не расходились по проекту. */
export function LiveBadge({ short = false, size = "md" }: { short?: boolean; size?: "sm" | "md" }) {
  return (
    <Badge variant="live" size={size}>
      {short ? "LIVE" : "В ЭФИРЕ"}
    </Badge>
  );
}
