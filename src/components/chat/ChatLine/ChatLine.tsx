import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge/Badge";
import { tones, toneStyle } from "@/theme/tones";
import type { ChatEntry } from "@/types";
import { describeBadge } from "../chatBadge";
import styles from "./ChatLine.module.css";

/** Одна запись чата: сообщение участника или событие канала (рейд). `menu` — действия с сообщением. */
export function ChatLine({ entry, menu }: { entry: ChatEntry; menu?: ReactNode }) {
  if (entry.kind === "event") {
    return (
      <li className={styles.event} style={toneStyle(entry.tone)}>
        {entry.text}
        {entry.link && (
          <>
            {" "}
            <Link href={entry.link.href} className={styles.eventLink}>
              {entry.link.label}
            </Link>
          </>
        )}
      </li>
    );
  }

  const badge = entry.badge && describeBadge(entry.badge);
  return (
    <li className={styles.message}>
      <span className={styles.body}>
        {badge && (
          <span className={styles.badge}>
            <Badge variant="tone" tone={badge.tone} size="sm">{badge.label}</Badge>
          </span>
        )}
        <span className={styles.author} style={{ color: tones[entry.tone].ink }}>{entry.author}</span>{" "}
        <span className={styles.text}>{entry.text}</span>
      </span>
      {menu}
    </li>
  );
}
