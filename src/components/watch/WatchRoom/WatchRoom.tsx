"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { chatSocketUrl } from "@/lib/api-client";
import { channelHref } from "@/lib/routes";
import type { ChannelWatch, ChatEntry, ChatMessage, Moment, Prediction, Viewer } from "@/types";

const MAX_ENTRIES = 200;
const RECONNECT_MAX_MS = 15_000;

/** События сервера — совпадают с api/src/realtime/hub.ts. */
type ServerEvent =
  | { type: "message"; message: ChatMessage }
  | { type: "deleted"; id: string }
  | { type: "viewers"; count: number }
  | { type: "live"; live: boolean }
  | { type: "prediction"; prediction: Prediction }
  | { type: "moment"; moment: Moment }
  | { type: "raid"; target: string; targetName: string }
  | { type: "error"; message: string };

interface WatchRoomState {
  watch: ChannelWatch;
  viewer: Viewer | null;
  viewers: number;
  entries: ChatEntry[];
  markers: Moment[];
  prediction: Prediction | null;
  connected: boolean;
  /** Последняя ошибка чата («слишком часто», «сообщение не прошло фильтр»). */
  notice: string | null;
  send: (text: string) => boolean;
  setPrediction: (prediction: Prediction) => void;
  removeMessage: (id: string) => void;
  hideAuthor: (authorId: string) => void;
  dismissNotice: () => void;
}

const WatchRoomContext = createContext<WatchRoomState | null>(null);

export function useWatchRoom(): WatchRoomState {
  const state = useContext(WatchRoomContext);
  if (!state) throw new Error("useWatchRoom вне WatchRoomProvider");
  return state;
}

/**
 * Комната эфира: одно WebSocket-подключение на страницу. Отдаёт чат, число зрителей,
 * прогноз и моменты всем частям страницы — плееру, чату, списку моментов.
 */
export function WatchRoomProvider({ watch, viewer, children }: { watch: ChannelWatch; viewer: Viewer | null; children: ReactNode }) {
  const router = useRouter();
  const slug = watch.channel.slug;
  const [viewers, setViewers] = useState(watch.stream?.viewers ?? 0);
  const [entries, setEntries] = useState<ChatEntry[]>(watch.chat);
  const [markers, setMarkers] = useState(watch.markers);
  const [prediction, setPredictionState] = useState(watch.prediction);
  const [connected, setConnected] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Новые данные с сервера (router.refresh после начала или конца эфира).
  useEffect(() => {
    setEntries(watch.chat);
    setMarkers(watch.markers);
    setPredictionState(watch.prediction);
  }, [watch]);

  const setPrediction = useCallback((next: Prediction) => {
    // Рассылка сервера общая для всех и не знает, за что голосовал этот зритель — сохраняем свой выбор.
    setPredictionState((current) => ({
      ...next,
      myOutcomeId: next.myOutcomeId ?? (current?.id === next.id ? current.myOutcomeId : null),
    }));
  }, []);

  const handleEvent = useCallback(
    (event: ServerEvent) => {
      switch (event.type) {
        case "message":
          setEntries((current) => [...current, event.message].slice(-MAX_ENTRIES));
          break;
        case "deleted":
          setEntries((current) => current.filter((entry) => entry.id !== event.id));
          break;
        case "viewers":
          setViewers(event.count);
          break;
        case "live":
          router.refresh();
          break;
        case "prediction":
          setPrediction(event.prediction);
          break;
        case "moment":
          setMarkers((current) => [...current.filter((m) => m.id !== event.moment.id), event.moment]);
          break;
        case "raid":
          setEntries((current) => [
            ...current,
            {
              kind: "event",
              id: crypto.randomUUID(),
              tone: "rose",
              text: `Рейд: эфир продолжается у ${event.targetName}`,
              link: { href: channelHref(event.target), label: "Перейти" },
            },
          ]);
          break;
        case "error":
          setNotice(event.message);
          break;
      }
    },
    [router, setPrediction],
  );

  useEffect(() => {
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    function connect() {
      const socket = new WebSocket(chatSocketUrl(slug));
      socketRef.current = socket;
      socket.onopen = () => {
        attempt = 0;
        setConnected(true);
      };
      socket.onmessage = (message) => {
        try {
          handleEvent(JSON.parse(String(message.data)) as ServerEvent);
        } catch {
          // Повреждённое событие пропускаем — следующее придёт целым.
        }
      };
      socket.onclose = () => {
        setConnected(false);
        if (stopped) return;
        attempt += 1;
        timer = setTimeout(connect, Math.min(RECONNECT_MAX_MS, 1000 * 2 ** (attempt - 1)));
      };
    }

    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [slug, handleEvent]);

  const send = useCallback((text: string) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setNotice("Нет связи с чатом. Переподключаемся…");
      return false;
    }
    socket.send(JSON.stringify({ type: "send", text }));
    return true;
  }, []);

  const value = useMemo<WatchRoomState>(
    () => ({
      watch,
      viewer,
      viewers,
      entries,
      markers,
      prediction,
      connected,
      notice,
      send,
      setPrediction,
      removeMessage: (id) => setEntries((current) => current.filter((entry) => entry.id !== id)),
      hideAuthor: (authorId) =>
        setEntries((current) => current.filter((entry) => entry.kind !== "message" || entry.authorId !== authorId)),
      dismissNotice: () => setNotice(null),
    }),
    [watch, viewer, viewers, entries, markers, prediction, connected, notice, send, setPrediction],
  );

  return <WatchRoomContext.Provider value={value}>{children}</WatchRoomContext.Provider>;
}
