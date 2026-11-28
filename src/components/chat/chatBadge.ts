import type { ChatBadge, Tone } from "@/types";

/** Текст и тон значка участника чата. */
export function describeBadge(badge: ChatBadge): { label: string; tone: Tone } {
  switch (badge.type) {
    case "broadcaster":
      return { label: "АВТОР", tone: "rose" };
    case "moderator":
      return { label: "МОД", tone: "mint" };
    case "newcomer":
      return { label: "НОВЫЙ", tone: "sky" };
  }
}

/** «Важные» сообщения: от автора эфира и модераторов, а также события канала. */
export function isImportant(badge: ChatBadge | undefined): boolean {
  return badge?.type === "broadcaster" || badge?.type === "moderator";
}
