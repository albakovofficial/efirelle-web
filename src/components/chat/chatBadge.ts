import type { ChatBadge, Tone } from "@/types";

/** Текст и тон значка участника чата. */
export function describeBadge(badge: ChatBadge): { label: string; tone: Tone } {
  switch (badge.type) {
    case "moderator":
      return { label: "МОД", tone: "mint" };
    case "vip":
      return { label: "VIP", tone: "butter" };
    case "newcomer":
      return { label: "НОВЫЙ", tone: "sky" };
    case "subscriber":
      return { label: `${badge.months} МЕС`, tone: "lavender" };
  }
}

/** «Важные» сообщения: от модераторов и VIP, а также события канала. */
export function isImportant(badge: ChatBadge | undefined): boolean {
  return badge?.type === "moderator" || badge?.type === "vip";
}
