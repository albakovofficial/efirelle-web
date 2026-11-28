"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useWatchRoom } from "@/components/watch/WatchRoom/WatchRoom";
import { Button } from "@/components/ui/Button/Button";
import { SegmentedControl, type SegmentOption } from "@/components/ui/SegmentedControl/SegmentedControl";
import { channelHref, loginHref } from "@/lib/routes";
import type { ChatMessage } from "@/types";
import { isImportant } from "../chatBadge";
import { ChatComposer } from "../ChatComposer/ChatComposer";
import { ChatLine } from "../ChatLine/ChatLine";
import { MessageMenu } from "../MessageMenu/MessageMenu";
import { PredictionCard } from "../PredictionCard/PredictionCard";
import styles from "./ChatPanel.module.css";

type ChatView = "all" | "important";

const viewOptions: readonly SegmentOption<ChatView>[] = [
  { value: "all", label: "Все" },
  { value: "important", label: "Важное" },
];

const NOTICE_SECONDS = 5;

/** Чат эфира: лента в реальном времени, прогноз, поле ввода. Данные — из комнаты эфира. */
export function ChatPanel() {
  const room = useWatchRoom();
  const { watch, viewer, entries, prediction, notice, dismissNotice } = room;
  const [view, setView] = useState<ChatView>("all");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const canDelete = watch.isOwner || viewer?.role === "admin";

  const visible = useMemo(
    () => (view === "all" ? entries : entries.filter((e) => e.kind === "event" || isImportant(e.badge))),
    [entries, view],
  );

  // Держим ленту прокрученной к последнему сообщению.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [visible]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(dismissNotice, NOTICE_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [notice, dismissNotice]);

  return (
    <aside aria-label="Чат эфира" className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>Чат{!room.connected && <span className={styles.offline}> · подключение…</span>}</h2>
        <SegmentedControl label="Что показывать в чате" options={viewOptions} value={view} onChange={setView} variant="tray" />
      </div>

      {prediction && (prediction.status === "open" || prediction.status === "locked" || prediction.status === "resolved") && (
        <div className={styles.prediction}>
          <PredictionCard prediction={prediction} canVote={viewer !== null && !watch.isOwner} onVoted={room.setPrediction} />
        </div>
      )}

      <ol ref={listRef} className={styles.list} aria-live="polite" aria-relevant="additions">
        {visible.length === 0 && <li className={styles.empty}>Сообщений пока нет — напишите первым</li>}
        {visible.map((entry) => (
          <ChatLine
            key={entry.id}
            entry={entry}
            emotes={watch.emotes}
            username={viewer?.username}
            menu={
              viewer && entry.kind === "message" && entry.authorId !== viewer.id ? (
                <MessageMenu
                  message={entry}
                  isChannelOwner={watch.isOwner}
                  canDelete={canDelete}
                  onDeleted={() => room.removeMessage(entry.id)}
                  onBlocked={() => room.hideAuthor(entry.authorId)}
                  onReply={() => setReplyTo(entry)}
                />
              ) : undefined
            }
          />
        ))}
      </ol>

      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}

      {viewer ? (
        <ChatComposer
          sparks={viewer.sparks}
          emotes={watch.emotes}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSend={(text) => {
            const sent = room.send(text, replyTo?.id);
            if (sent) setReplyTo(null);
            return sent;
          }}
        />
      ) : (
        <div className={styles.guest}>
          <p>Войдите, чтобы писать в чат и участвовать в прогнозах</p>
          <Button href={loginHref(channelHref(watch.channel.slug))} variant="primary">
            Войти
          </Button>
        </div>
      )}
    </aside>
  );
}
