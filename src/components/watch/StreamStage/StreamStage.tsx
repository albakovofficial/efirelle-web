"use client";

import type { ReactNode } from "react";
import { Thumbnail } from "@/components/ui/Thumbnail/Thumbnail";
import { Player } from "../Player/Player";
import { StreamMoments } from "../StreamMoments/StreamMoments";
import { useWatchRoom } from "../WatchRoom/WatchRoom";
import styles from "./StreamStage.module.css";

/** Сцена эфира: плеер (или заставка «не в сети»), блок канала, моменты. */
export function StreamStage({ children }: { children?: ReactNode }) {
  const { watch, viewers, markers } = useWatchRoom();
  const { stream, channel } = watch;

  return (
    <>
      {stream ? (
        <Player stream={stream} viewers={viewers} />
      ) : (
        <div className={styles.offline}>
          <Thumbnail tone={channel.tone} radius="lg">
            <span className={styles.offlineText}>
              <strong>{channel.name} сейчас не в эфире</strong>
              <span>Страница обновится сама, когда эфир начнётся</span>
            </span>
          </Thumbnail>
        </div>
      )}
      {children}
      {stream && <StreamMoments markers={markers} />}
    </>
  );
}
