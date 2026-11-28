"use client";

import type { ReactNode } from "react";
import { ChannelAbout } from "@/components/channel/ChannelAbout/ChannelAbout";
import { RecordingsSection } from "@/components/clips/RecordingsSection/RecordingsSection";
import { Thumbnail } from "@/components/ui/Thumbnail/Thumbnail";
import { Player } from "../Player/Player";
import { StreamMoments } from "../StreamMoments/StreamMoments";
import { useWatchRoom } from "../WatchRoom/WatchRoom";
import styles from "./StreamStage.module.css";

/** Сцена канала: плеер (или заставка «не в сети»), блок канала, моменты, расписание, «О канале», клипы и записи. */
export function StreamStage({ children }: { children?: ReactNode }) {
  const { watch, viewer, viewers, markers } = useWatchRoom();
  const { stream, channel } = watch;

  return (
    <>
      {stream ? (
        <Player stream={stream} viewers={viewers} canClip={viewer !== null} />
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
      <ChannelAbout name={channel.name} about={watch.about} schedule={watch.schedule} signedIn={viewer !== null} />
      <RecordingsSection recordings={watch.recordings} clips={watch.clips} />
    </>
  );
}
