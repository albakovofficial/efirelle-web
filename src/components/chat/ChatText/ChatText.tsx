import type { ReactNode } from "react";
import type { Emote } from "@/types";
import styles from "./ChatText.module.css";

/** :код: эмодзи канала и @упоминания. */
const TOKEN = /(:[a-z0-9_]{2,20}:|@[a-z0-9_]{3,24})/g;

/** Упоминает ли сообщение пользователя — такое сообщение подсвечивается. */
export function mentions(text: string, username: string | undefined): boolean {
  return username !== undefined && new RegExp(`(^|\\W)@${username}(\\W|$)`, "i").test(text);
}

/** Текст сообщения: эмодзи канала картинками, упоминания выделены. Остальное — обычный текст. */
export function ChatText({ text, emotes, username }: { text: string; emotes: Emote[]; username?: string }) {
  const byCode = new Map(emotes.map((emote) => [emote.code, emote.url]));
  const parts: ReactNode[] = text.split(TOKEN).map((part, index) => {
    if (part.startsWith(":") && part.endsWith(":") && part.length > 2) {
      const url = byCode.get(part.slice(1, -1));
      if (url) return <img key={index} src={url} alt={part} title={part} className={styles.emote} />;
    }
    if (part.startsWith("@") && part.length > 1) {
      const isMe = part.slice(1).toLowerCase() === username;
      return (
        <span key={index} className={isMe ? styles.mentionMe : styles.mention}>
          {part}
        </span>
      );
    }
    return part;
  });
  return <>{parts}</>;
}
