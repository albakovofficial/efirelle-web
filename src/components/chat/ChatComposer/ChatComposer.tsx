"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button/Button";
import { SparksBalance } from "@/components/ui/SparksBalance/SparksBalance";
import type { ChatMessage, Emote } from "@/types";
import styles from "./ChatComposer.module.css";

const MAX_MESSAGE_LENGTH = 500;

interface ChatComposerProps {
  sparks: number;
  emotes: Emote[];
  /** Сообщение, на которое отвечают; `null` — обычное сообщение. */
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  /** Правила чата для зрителя, например «Медленный режим 10 с». */
  hint?: string | null;
  /** Вернёт false, если сообщение не ушло (нет связи) — тогда текст остаётся в поле. */
  onSend: (text: string) => boolean;
}

/** Поле ввода: ответ на сообщение, эмодзи канала, баланс искр. */
export function ChatComposer({ sparks, emotes, replyTo, onCancelReply, hint, onSend }: ChatComposerProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = text.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmed && onSend(trimmed)) setText("");
  }

  function insertEmote(code: string) {
    setText((current) => `${current}${current && !current.endsWith(" ") ? " " : ""}:${code}: `.slice(0, MAX_MESSAGE_LENGTH));
    inputRef.current?.focus();
  }

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      {replyTo && (
        <div className={styles.reply}>
          <span className={styles.replyText}>
            Ответ <strong>{replyTo.author}</strong>: {replyTo.text}
          </span>
          <Button variant="ghost" size="sm" icon="close" aria-label="Не отвечать" onClick={onCancelReply} />
        </div>
      )}
      <div className={styles.row}>
        <label className={styles.field}>
          <span className="visually-hidden">Сообщение в чат</span>
          <input
            ref={inputRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={replyTo ? `Ответить ${replyTo.author}` : (hint ?? "Сообщение в чат")}
            autoComplete="off"
            className={styles.input}
          />
        </label>
        <Button type="submit" variant="primary" icon="send" aria-label="Отправить" disabled={!trimmed} />
      </div>
      <div className={styles.footer}>
        {emotes.length > 0 && (
          <div className={styles.emotes} aria-label="Эмодзи канала">
            {emotes.map((emote) => (
              <button key={emote.code} type="button" className={styles.emote} title={`:${emote.code}:`} onClick={() => insertEmote(emote.code)}>
                <img src={emote.url} alt={`:${emote.code}:`} />
              </button>
            ))}
          </div>
        )}
        <SparksBalance amount={sparks} withLabel />
      </div>
    </form>
  );
}
