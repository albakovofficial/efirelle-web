"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SegmentedControl, type SegmentOption } from "@/components/ui/SegmentedControl/SegmentedControl";
import type { ChatEntry, Prediction, Viewer } from "@/types";
import { isImportant } from "../chatBadge";
import { ChatComposer } from "../ChatComposer/ChatComposer";
import { ChatLine } from "../ChatLine/ChatLine";
import { PredictionCard } from "../PredictionCard/PredictionCard";
import styles from "./ChatPanel.module.css";

type ChatView = "all" | "important";

const viewOptions: readonly SegmentOption<ChatView>[] = [
  { value: "all", label: "Все" },
  { value: "important", label: "Важное" },
];

interface ChatPanelProps {
  initialEntries: ChatEntry[];
  prediction: Prediction | null;
  viewer: Viewer;
}

/**
 * Чат эфира. Сейчас сообщения живут в локальном состоянии;
 * подключение к серверу (WebSocket) добавляется сюда, не затрагивая дочерние компоненты.
 */
export function ChatPanel({ initialEntries, prediction, viewer }: ChatPanelProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [view, setView] = useState<ChatView>("all");
  const listRef = useRef<HTMLOListElement>(null);

  const visible = useMemo(
    () => (view === "all" ? entries : entries.filter((e) => e.kind === "event" || isImportant(e.badge))),
    [entries, view],
  );

  // Держим ленту прокрученной к последнему сообщению.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [visible]);

  function handleSend(text: string) {
    setEntries((current) => [
      ...current,
      { kind: "message", id: crypto.randomUUID(), author: viewer.name, tone: viewer.tone, text },
    ]);
  }

  return (
    <aside aria-label="Чат эфира" className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>Чат</h2>
        <SegmentedControl label="Что показывать в чате" options={viewOptions} value={view} onChange={setView} variant="tray" />
      </div>

      {prediction && (
        <div className={styles.prediction}>
          <PredictionCard prediction={prediction} />
        </div>
      )}

      <ol ref={listRef} className={styles.list} aria-live="polite" aria-relevant="additions">
        {visible.map((entry) => (
          <ChatLine key={entry.id} entry={entry} />
        ))}
      </ol>

      <ChatComposer sparks={viewer.sparks} onSend={handleSend} />
    </aside>
  );
}
