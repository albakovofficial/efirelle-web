/** Форматирование чисел и времени для русского интерфейса. */

const compactFormatter = new Intl.NumberFormat("ru-RU", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const numberFormatter = new Intl.NumberFormat("ru-RU");

/** Выбор формы слова: pluralRu(5, ["зритель", "зрителя", "зрителей"]) → «зрителей». */
export function pluralRu(n: number, forms: readonly [one: string, few: string, many: string]): string {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

/** 18700 → «18,7 тыс.», 950 → «950». */
export function formatCompact(n: number): string {
  return compactFormatter.format(n);
}

/** 18702 → «18 702». */
export function formatNumber(n: number): string {
  return numberFormatter.format(n);
}

/**
 * Число со словом. При сокращении до «тыс.»/«млн» по-русски всегда родительный падеж мн. числа,
 * поэтому форма слова зависит от того, сокращено ли число.
 */
export function formatCount(
  n: number,
  forms: readonly [string, string, string],
  { compact = true }: { compact?: boolean } = {},
): string {
  const shortened = compact && n >= 1000;
  const value = shortened ? formatCompact(n) : formatNumber(n);
  return `${value} ${shortened ? forms[2] : pluralRu(n, forms)}`;
}

export const VIEWER_FORMS = ["зритель", "зрителя", "зрителей"] as const;

/** 13690 → «3:48:10», 754 → «12:34». */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = String(minutes).padStart(hours > 0 ? 2 : 1, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
