import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge/Badge";
import { tones, toneStyle } from "@/theme/tones";
import type { ChatEntry, Emote } from "@/types";
import { describeBadge } from "../chatBadge";
import { ChatText, mentions } from "../ChatText/ChatText";
import styles from "./ChatLine.module.css";

interface ChatLineProps {
  entry: ChatEntry;
  /** Действия с сообщением (меню «⋯»). */
  menu?: ReactNode;
  emotes: Emote[];
  /** Адрес канала зрителя — его упоминания подсвечиваются. */
  username?: string;
}

/** Одна запись чата: сообщение участника (с ответом, эмодзи и упоминаниями) или событие канала (рейд). */
export function ChatLine({ entry, menu, emotes, username }: ChatLineProps) {
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
    <li className={`${styles.message} ${mentions(entry.text, username) ? styles.mentioned : ""}`}>
      <span className={styles.body}>
        {entry.replyTo && (
          <span className={styles.reply}>
            ↪ {entry.replyTo.author}: {entry.replyTo.text}
          </span>
        )}
        {badge && (
          <span className={styles.badge}>
            <Badge variant="tone" tone={badge.tone} size="sm">{badge.label}</Badge>
          </span>
        )}
        <span className={styles.author} style={{ color: tones[entry.tone].ink }}>{entry.author}</span>{" "}
        <span className={styles.text}>
          <ChatText text={entry.text} emotes={emotes} username={username} />
        </span>
      </span>
      {menu}
    </li>
  );
}
