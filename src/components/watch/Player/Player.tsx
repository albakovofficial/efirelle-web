"use client";

import { useRef, useState } from "react";
import { Badge, LiveBadge } from "@/components/ui/Badge/Badge";
import { Thumbnail } from "@/components/ui/Thumbnail/Thumbnail";
import { formatCount, VIEWER_FORMS } from "@/lib/format";
import { useElapsedSeconds } from "@/lib/useElapsedSeconds";
import type { Stream } from "@/types";
import { HlsVideo, type HlsVideoHandle } from "../HlsVideo/HlsVideo";
import { PlayerControls } from "./PlayerControls";
import styles from "./Player.module.css";

interface PlayerProps {
  stream: Stream;
  /** Зрители из чата в реальном времени; до первого события — из ответа сервера. */
  viewers: number;
}

/** Плеер прямого эфира: видео, бейджи поверх, управление снизу. */
export function Player({ stream, viewers }: PlayerProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HlsVideoHandle>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [behindLive, setBehindLive] = useState(false);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");
  const duration = stream.durationSeconds + useElapsedSeconds(stream.id);

  function togglePlay() {
    if (paused) setPaused(false);
    else {
      setPaused(true);
      setBehindLive(true);
    }
  }

  function jumpToLive() {
    videoRef.current?.jumpToLive();
    setPaused(false);
    setBehindLive(false);
  }

  function toggleFullscreen() {
    const frame = frameRef.current;
    const video = videoRef.current?.element as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (frame?.requestFullscreen) void frame.requestFullscreen();
    else video?.webkitEnterFullscreen?.();
  }

  return (
    <div className={styles.player}>
      <div ref={frameRef} className={styles.frame}>
        <Thumbnail tone={stream.tone} radius="lg">
          <HlsVideo
            ref={videoRef}
            src={stream.playbackUrl}
            muted={muted}
            paused={paused}
            label={`Эфир ${stream.channel.name}`}
            onStatusChange={setStatus}
          />
          <span className={styles.overlayLeft}>
            <LiveBadge />
            <Badge variant="glass">{formatCount(viewers, VIEWER_FORMS, { compact: false })}</Badge>
          </span>
          {status !== "playing" && (
            <span className={styles.notice}>
              {status === "error" ? "Не удаётся загрузить эфир. Попробуйте обновить страницу" : "Подключаемся к эфиру…"}
            </span>
          )}
        </Thumbnail>
      </div>

      <div className={styles.panel}>
        <PlayerControls
          paused={paused}
          muted={muted}
          duration={duration}
          behindLive={behindLive}
          onTogglePlay={togglePlay}
          onToggleMute={() => setMuted((value) => !value)}
          onJumpToLive={jumpToLive}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>
    </div>
  );
}
