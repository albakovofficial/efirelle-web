/**
 * Фильтр мата и оскорблений для чата. Та же логика, что в iOS (ContentFilter.swift):
 * приложение проверяет до отправки, сервер — окончательно.
 * Слово запрещено, если начинается с корня — сразу или после приставки.
 */
const ROOTS = [
  "хуй", "хуе", "хуя", "хуи", "пизд", "ебан", "ебат", "ебал", "ебло", "ебуч", "ебну",
  "бляд", "блят", "сука", "суки", "сучк", "сучар", "мудак", "мудил", "пидор", "пидар", "пидр",
  "гандон", "шлюх", "залуп",
  "fuck", "shit", "bitch", "cunt", "nigg", "fagg",
];

/** Отдельные слова, которые нельзя ловить по корню без ложных срабатываний. */
const BANNED_WORDS = new Set(["бля", "еблан", "уебан", "уебок"]);

const PREFIXES = [
  "", "за", "на", "по", "от", "вы", "у", "при", "под", "раз", "рас", "с", "съ", "до", "про",
  "пере", "недо", "не", "о", "об", "из", "вз", "въ",
];

function tokens(text: string): string[] {
  return text.toLowerCase().replaceAll("ё", "е").split(/[^\p{L}]+/u).filter(Boolean);
}

function isForbidden(word: string): boolean {
  if (BANNED_WORDS.has(word)) return true;
  return PREFIXES.some((prefix) => word.startsWith(prefix) && ROOTS.some((root) => word.slice(prefix.length).startsWith(root)));
}

export function isTextAllowed(text: string): boolean {
  return !tokens(text).some(isForbidden);
}
