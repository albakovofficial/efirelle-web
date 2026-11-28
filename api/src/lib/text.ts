/** Инициалы для аватара: «Мира Вольская» → «МВ», «kai» → «KA». */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length >= 2 ? words[0]![0]! + words[1]![0]! : name.trim().slice(0, 2);
  return letters.toUpperCase();
}

/** «2 мин назад», «3 ч назад» — для ленты моментов. */
export function timeAgo(date: Date, now = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return "только что";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  return `${Math.round(hours / 24)} дн назад`;
}

/** Нормализация для поиска: регистр и «ё» не важны. */
export function normalizeQuery(text: string): string {
  return text.toLocaleLowerCase("ru-RU").replaceAll("ё", "е").trim();
}

/** Экранирует % и _ для LIKE. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}
