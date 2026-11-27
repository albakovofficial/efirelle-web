import type { CSSProperties, ReactNode } from "react";
import styles from "./AutoGrid.module.css";

interface AutoGridProps {
  /** Минимальная ширина колонки в px — столько колонок, сколько поместится. */
  min: number;
  gap?: number;
  rowGap?: number;
  as?: "div" | "ul";
  children: ReactNode;
}

/** Адаптивная сетка без медиазапросов. */
export function AutoGrid({ min, gap = 16, rowGap, as: Tag = "div", children }: AutoGridProps) {
  const style = {
    "--grid-min": `${min}px`,
    "--grid-gap": `${gap}px`,
    "--grid-row-gap": `${rowGap ?? gap}px`,
  } as CSSProperties;
  return (
    <Tag className={styles.grid} style={style}>
      {children}
    </Tag>
  );
}
