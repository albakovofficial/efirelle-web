"use client";

import { useState } from "react";
import { Badge, LiveBadge } from "@/components/ui/Badge/Badge";
import { Thumbnail } from "@/components/ui/Thumbnail/Thumbnail";
import { formatCount, VIEWER_FORMS } from "@/lib/format";
import type { Moment, Stream } from "@/types";
import { PlayerControls } from "./PlayerControls";
import { Timeline } from "./Timeline";
import styles from "./Player.module.css";

interface PlayerProps {
  stream: Stream;
  markers: Moment[];
  position: number;
  onSeek: (seconds: number) => void;
}

/**
 * Плеер эфира. Видеопоток подключается на месте <Thumbnail> (например, HLS через <video>);
 * воспроизведение и звук — локальное состояние плеера, позиция — от родителя,
 * потому что перематывать могут и внешние элементы (список моментов).
 */
export function Player({ stream, markers, position, onSeek }: PlayerProps) {
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);

  return (
    <div className={styles.player}>
      <Thumbnail tone={stream.tone} radius="lg">
        <span className={styles.overlayLeft}>
          <LiveBadge />
          <Badge variant="glass">{formatCount(stream.viewers, VIEWER_FORMS, { compact: false })}</Badge>
        </span>
        <span className={styles.overlayRight}>
          <Badge variant="glass">
            {stream.quality} · задержка {stream.latencySeconds.toLocaleString("ru-RU")} с
          </Badge>
        </span>
      </Thumbnail>

      <div className={styles.panel}>
        <Timeline position={position} duration={stream.durationSeconds} markers={markers} onSeek={onSeek} />
        <PlayerControls
          playing={playing}
          muted={muted}
          position={position}
          duration={stream.durationSeconds}
          onTogglePlay={() => setPlaying((value) => !value)}
          onToggleMute={() => setMuted((value) => !value)}
          onSeek={onSeek}
        />
      </div>
    </div>
  );
}
