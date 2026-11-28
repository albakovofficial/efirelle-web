import type { ChatRules } from "@/types";

/** Подсказка о правилах чата: «Медленный режим 10 с · только подписчики»; `null` — правил нет. */
export function rulesHint(rules: ChatRules): string | null {
  const parts = [
    rules.slowModeSeconds > 0 ? `медленный режим ${rules.slowModeSeconds} с` : null,
    rules.followersOnly ? "только подписчики" : null,
  ].filter((part): part is string => part !== null);
  if (parts.length === 0) return null;
  const text = parts.join(" · ");
  return text[0]!.toUpperCase() + text.slice(1);
}
