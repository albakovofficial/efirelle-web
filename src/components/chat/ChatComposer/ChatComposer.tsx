"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { SparksBalance } from "@/components/ui/SparksBalance/SparksBalance";
import styles from "./ChatComposer.module.css";

const MAX_MESSAGE_LENGTH = 500;

interface ChatComposerProps {
  sparks: number;
  onSend: (text: string) => void;
}

/** Поле ввода сообщения и баланс искр. */
export function ChatComposer({ sparks, onSend }: ChatComposerProps) {
  const [text, setText] = useState("");
  const trimmed = text.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
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
          <Icon name="smile" size={20} className={styles.emote} />
        </label>
        <Button type="submit" variant="primary" icon="send" aria-label="Отправить" disabled={!trimmed} />
      </div>
      <div className={styles.footer}>
        <SparksBalance amount={sparks} withLabel />
        <Button variant="soft" size="sm">Награды канала</Button>
      </div>
    </form>
  );
}
