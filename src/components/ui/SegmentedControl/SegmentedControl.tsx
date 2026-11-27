"use client";

import styles from "./SegmentedControl.module.css";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Подпись группы для скринридера. */
  label: string;
  variant?: "pills" | "tray";
}

/** Переключатель из нескольких вариантов: фильтры ленты, вкладки чата. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  variant = "pills",
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`${styles.group} ${styles[variant]}`}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`${styles.option} ${selected ? styles.selected : ""}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
