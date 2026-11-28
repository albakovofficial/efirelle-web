"use client";

import { Button } from "@/components/ui/Button/Button";
import { formatDuration } from "@/lib/format";
import { ClipButton } from "../ClipButton/ClipButton";
import styles from "./Player.module.css";

interface PlayerControlsProps {
  paused: boolean;
  muted: boolean;
  /** Сколько секунд идёт эфир. */
  duration: number;
  /** Зритель ставил на паузу и смотрит с отставанием. */
  behindLive: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onJumpToLive: () => void;
  onToggleFullscreen: () => void;
  /** Канал — для кнопки «Клип»; без входа кнопки нет. */
  clipChannel: string | null;
  qualities: { label: string; url: string }[];
  /** Адрес выбранного качества. */
  quality: string;
  onQualityChange: (url: string) => void;
}

/** Панель управления под видео: пауза, звук, возврат к прямому эфиру, качество, клип, полный экран. */
export function PlayerControls({
  paused,
  muted,
  duration,
  behindLive,
  onTogglePlay,
  onToggleMute,
  onJumpToLive,
  onToggleFullscreen,
  clipChannel,
  qualities,
  quality,
  onQualityChange,
}: PlayerControlsProps) {
  return (
    <div className={styles.controls}>
      <Button variant="dark" icon={paused ? "play" : "pause"} aria-label={paused ? "Смотреть" : "Пауза"} onClick={onTogglePlay} />
      <Button
        variant="soft"
        icon={muted ? "mute" : "volume"}
        aria-label={muted ? "Включить звук" : "Выключить звук"}
        aria-pressed={muted}
        onClick={onToggleMute}
      />

      {behindLive ? (
        <span className={styles.status}>
          С отставанием
          <Button variant="primary" size="sm" onClick={onJumpToLive}>
            К эфиру
          </Button>
        </span>
      ) : (
        <span className={styles.status}>
          <span className={styles.liveDot} aria-hidden="true" />
          Прямой эфир · {formatDuration(duration)}
        </span>
      )}

      <span className={styles.spacer} />

      {qualities.length > 1 && (
        <label className={styles.quality}>
          <span className="visually-hidden">Качество</span>
          <select value={quality} onChange={(event) => onQualityChange(event.target.value)} className={styles.qualitySelect}>
            {qualities.map((q) => (
              <option key={q.url} value={q.url}>
                {q.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {clipChannel && <ClipButton channelSlug={clipChannel} />}
      <Button variant="soft" icon="multiview" href="/multiview" className={styles.wideOnly}>Мультиэфир</Button>
      <Button variant="soft" icon="fullscreen" aria-label="Во весь экран" onClick={onToggleFullscreen} />
    </div>
  );
}
