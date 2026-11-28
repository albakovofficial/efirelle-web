"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button/Button";
import { SparksBalance } from "@/components/ui/SparksBalance/SparksBalance";
import styles from "./ChatComposer.module.css";

const MAX_MESSAGE_LENGTH = 500;

interface ChatComposerProps {
  sparks: number;
  /** Вернёт false, если сообщение не ушло (нет связи) — тогда текст остаётся в поле. */
  onSend: (text: string) => boolean;
}

/** Поле ввода сообщения и баланс искр. */
export function ChatComposer({ sparks, onSend }: ChatComposerProps) {
  const [text, setText] = useState("");
  const trimmed = text.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmed && onSend(trimmed)) setText("");
  }

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <label className={styles.field}>
          <span className="visually-hidden">Сообщение в чат</span>
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Сообщение в чат"
            autoComplete="off"
            className={styles.input}
          />
        </label>
        <Button type="submit" variant="primary" icon="send" aria-label="Отправить" disabled={!trimmed} />
      </div>
      <div className={styles.footer}>
        <SparksBalance amount={sparks} withLabel />
      </div>
    </form>
  );
}
