"use client";

import { Button } from "@/components/ui/Button/Button";
import { formatDuration } from "@/lib/format";
import styles from "./Player.module.css";

const REWIND_STEP_SECONDS = 30;

interface PlayerControlsProps {
  playing: boolean;
  muted: boolean;
  position: number;
  duration: number;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onSeek: (seconds: number) => void;
}

/** Панель управления под видео. Знает о прямом эфире: показывает отставание и кнопку «К эфиру». */
export function PlayerControls({
  playing,
  muted,
  position,
  duration,
  onTogglePlay,
  onToggleMute,
  onSeek,
}: PlayerControlsProps) {
  const behind = duration - position;
  const atLiveEdge = behind < 1;

  return (
    <div className={styles.controls}>
      <Button
        variant="dark"
        icon={playing ? "pause" : "play"}
        aria-label={playing ? "Пауза" : "Смотреть"}
        onClick={onTogglePlay}
      />
      <Button
        variant="soft"
        icon="rewind"
        aria-label={`Назад на ${REWIND_STEP_SECONDS} секунд`}
        onClick={() => onSeek(Math.max(0, position - REWIND_STEP_SECONDS))}
      />
      <Button
        variant="soft"
        icon={muted ? "mute" : "volume"}
        aria-label={muted ? "Включить звук" : "Выключить звук"}
        aria-pressed={muted}
        onClick={onToggleMute}
      />

      {atLiveEdge ? (
        <span className={styles.status}>
          <span className={styles.liveDot} aria-hidden="true" />
          Прямой эфир · {formatDuration(duration)}
        </span>
      ) : (
        <span className={styles.status}>
          −{formatDuration(behind)}
          <Button variant="primary" size="sm" onClick={() => onSeek(duration)}>
            К эфиру
          </Button>
        </span>
      )}

      <span className={styles.spacer} />

      <Button variant="soft" icon="clip" className={styles.wideOnly}>Клип 30 с</Button>
      <Button variant="soft" icon="multiview" href="/multiview" className={styles.wideOnly}>Мультиэфир</Button>
      <Button variant="soft" icon="settings" aria-label="Настройки качества" />
      <Button variant="soft" icon="fullscreen" aria-label="Во весь экран" />
    </div>
  );
}
