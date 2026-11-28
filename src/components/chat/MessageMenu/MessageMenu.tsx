"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { api } from "@/lib/api-client";
import type { ChatMessage, ReportReason } from "@/types";
import styles from "./MessageMenu.module.css";

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Спам или реклама" },
  { value: "harassment", label: "Оскорбления, травля" },
  { value: "hate", label: "Разжигание ненависти" },
  { value: "sexual", label: "Сексуальный контент" },
  { value: "violence", label: "Насилие или угрозы" },
  { value: "other", label: "Другое" },
];

interface MessageMenuProps {
  message: ChatMessage;
  /** Автор эфира — может запретить писать в своём чате. */
  isChannelOwner: boolean;
  /** Автор эфира или модератор платформы — может удалить сообщение. */
  canDelete: boolean;
  onDeleted: () => void;
  onBlocked: () => void;
}

type View = "actions" | "report" | "done";

/** Действия с чужим сообщением: жалоба, скрыть автора, удалить, запрет писать. */
export function MessageMenu({ message, isChannelOwner, canDelete, onDeleted, onBlocked }: MessageMenuProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("actions");
  const [status, setStatus] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function toggle() {
    setOpen((value) => !value);
    setView("actions");
    setStatus(null);
  }

  async function run(action: () => Promise<unknown>, done: string, after?: () => void) {
    try {
      await action();
      setStatus(done);
      setView("done");
      after?.();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не получилось. Попробуйте ещё раз");
      setView("done");
    }
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <Button variant="ghost" size="sm" icon="more" aria-label={`Действия с сообщением ${message.author}`} aria-expanded={open} onClick={toggle} />
      {open && (
        <div className={styles.menu} role="menu">
          {view === "actions" && (
            <>
              <button type="button" role="menuitem" className={styles.item} onClick={() => setView("report")}>
                Пожаловаться
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.item}
                onClick={() => run(() => api.block(message.authorSlug), `Сообщения ${message.author} скрыты. Вернуть можно в настройках`, onBlocked)}
              >
                Скрыть все сообщения автора
              </button>
              {canDelete && (
                <button type="button" role="menuitem" className={styles.item} onClick={() => run(() => api.deleteMessage(message.id), "Сообщение удалено", onDeleted)}>
                  Удалить сообщение
                </button>
              )}
              {isChannelOwner && (
                <>
                  <button type="button" role="menuitem" className={styles.item} onClick={() => run(() => api.ban(message.authorSlug, 10), `${message.author} не сможет писать 10 минут`)}>
                    Запретить писать на 10 минут
                  </button>
                  <button type="button" role="menuitem" className={styles.item} onClick={() => run(() => api.ban(message.authorSlug, null), `${message.author} больше не сможет писать в вашем чате`, onBlocked)}>
                    Запретить писать навсегда
                  </button>
                </>
              )}
            </>
          )}
          {view === "report" && (
            <>
              <p className={styles.caption}>Что не так с сообщением?</p>
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason.value}
                  type="button"
                  role="menuitem"
                  className={styles.item}
                  onClick={() => run(() => api.report(message.id, reason.value), "Жалоба отправлена — модераторы рассмотрят её в течение 24 часов")}
                >
                  {reason.label}
                </button>
              ))}
            </>
          )}
          {view === "done" && <p className={styles.caption}>{status}</p>}
        </div>
      )}
    </div>
  );
}
