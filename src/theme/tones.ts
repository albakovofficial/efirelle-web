import type { CSSProperties } from "react";
import type { MomentKind, Tone } from "@/types";

/** Пастельная палитра: фон, более глубокий оттенок для декора и цвет текста поверх. */
export const tones: Record<Tone, { surface: string; shade: string; ink: string }> = {
  ink: { surface: "#16151C", shade: "#2A2833", ink: "#FFFFFF" },
  lavender: { surface: "#E8E3FF", shade: "#D6CCFF", ink: "#3D2FA8" },
  peach: { surface: "#FFE4D6", shade: "#FFCDB4", ink: "#8A3B17" },
  mint: { surface: "#DDF1E8", shade: "#C3E6D6", ink: "#1F6B4A" },
  sky: { surface: "#DCEBFF", shade: "#C2DAFF", ink: "#1E4E99" },
  butter: { surface: "#FFF1C9", shade: "#FFE39A", ink: "#7A5A00" },
  rose: { surface: "#F7DDEB", shade: "#EFC3DA", ink: "#8E2A5E" },
};

type ToneVars = CSSProperties & Record<`--${string}`, string>;

/**
 * CSS-переменные тона. Компоненты читают `--tone-surface`, `--tone-shade`, `--tone-ink`
 * в своих стилях, поэтому цвет задаётся одной строкой, а не в каждом элементе.
 */
export function toneStyle(tone: Tone): ToneVars {
  const t = tones[tone];
  return { "--tone-surface": t.surface, "--tone-shade": t.shade, "--tone-ink": t.ink };
}

/** Подписи и тона для типов моментов — используются в ленте, на таймлайне и в чипах. */
export const momentMeta: Record<MomentKind, { label: string; tone: Tone }> = {
  raid: { label: "Рейд", tone: "rose" },
  prediction: { label: "Прогноз", tone: "sky" },
  chatPeak: { label: "Пик чата", tone: "butter" },
  giveaway: { label: "Розыгрыш", tone: "mint" },
  highlight: { label: "Момент", tone: "lavender" },
};
