import type { CSSProperties } from "react";
import type { MomentKind, Tone } from "@/types";

/**
 * Пастельные тона: фон, более глубокий оттенок для декора и цвет текста поверх.
 * Сами цвета — CSS-переменные в globals.css (`--tone-<имя>-surface/shade/ink`), у каждой есть
 * значение для тёмной темы «Графит», поэтому тон меняется вместе с темой без JavaScript.
 */
export const tones: Record<Tone, { surface: string; shade: string; ink: string }> = Object.fromEntries(
  (["ink", "lavender", "peach", "mint", "sky", "butter", "rose"] as const).map((tone) => [
    tone,
    { surface: `var(--tone-${tone}-surface)`, shade: `var(--tone-${tone}-shade)`, ink: `var(--tone-${tone}-ink)` },
  ]),
) as Record<Tone, { surface: string; shade: string; ink: string }>;

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
