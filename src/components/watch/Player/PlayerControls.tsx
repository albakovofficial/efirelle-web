"use client";

import { Button } from "@/components/ui/Button/Button";
import { formatDuration } from "@/lib/format";
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
}

/** Панель управления под видео: пауза, звук, возврат к прямому эфиру, полный экран. */
export function PlayerControls({
  paused,
  muted,
  duration,
  behindLive,
  onTogglePlay,
  onToggleMute,
  onJumpToLive,
  onToggleFullscreen,
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

      <Button variant="soft" icon="multiview" href="/multiview" className={styles.wideOnly}>Мультиэфир</Button>
      <Button variant="soft" icon="fullscreen" aria-label="Во весь экран" onClick={onToggleFullscreen} />
    </div>
  );
}
