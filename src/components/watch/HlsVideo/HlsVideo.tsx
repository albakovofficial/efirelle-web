"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import styles from "./HlsVideo.module.css";

export interface HlsVideoHandle {
  /** Вернуться к прямому эфиру после паузы. */
  jumpToLive: () => void;
  element: HTMLVideoElement | null;
}

interface HlsVideoProps {
  src: string;
  muted: boolean;
  paused?: boolean;
  label: string;
  /** Поток пропал (эфир закончился или сеть) — родитель решает, что показать. */
  onStatusChange?: (status: "loading" | "playing" | "error") => void;
}

/**
 * Видео прямого эфира по HLS. Safari и iOS играют HLS сами,
 * остальным браузерам поток подаёт hls.js (подгружается только когда нужен).
 */
export const HlsVideo = forwardRef<HlsVideoHandle, HlsVideoProps>(function HlsVideo(
  { src, muted, paused = false, label, onStatusChange },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveEdgeRef = useRef<() => number | null>(() => null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");

  useImperativeHandle(ref, () => ({
    get element() {
      return videoRef.current;
    },
    jumpToLive() {
      const video = videoRef.current;
      if (!video) return;
      const edge = liveEdgeRef.current() ?? (video.seekable.length > 0 ? video.seekable.end(video.seekable.length - 1) : null);
      if (edge !== null) video.currentTime = Math.max(0, edge - 1);
      void video.play().catch(() => undefined);
    },
  }));

  useEffect(() => onStatusChange?.(status), [status, onStatusChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let destroyed = false;
    let cleanup = () => {};
    setStatus("loading");

    const onPlaying = () => setStatus("playing");
    video.addEventListener("playing", onPlaying);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      const onError = () => setStatus("error");
      video.addEventListener("error", onError);
      video.src = src;
      cleanup = () => {
        video.removeEventListener("error", onError);
        video.removeAttribute("src");
        video.load();
      };
    } else {
      void import("hls.js").then(({ default: Hls }) => {
        if (destroyed) return;
        if (!Hls.isSupported()) {
          setStatus("error");
          return;
        }
        const hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 3 });
        liveEdgeRef.current = () => hls.liveSyncPosition ?? null;
        let networkRetries = 0;
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          // Сеть: несколько попыток догрузить поток; иначе — эфир недоступен.
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 5) {
            networkRetries += 1;
            setTimeout(() => !destroyed && hls.startLoad(), 2000 * networkRetries);
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setStatus("error");
          }
        });
        hls.on(Hls.Events.FRAG_LOADED, () => {
          networkRetries = 0;
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        cleanup = () => {
          liveEdgeRef.current = () => null;
          hls.destroy();
        };
      });
    }

    return () => {
      destroyed = true;
      video.removeEventListener("playing", onPlaying);
      cleanup();
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Браузеры разрешают автозапуск только без звука; если звук включён и запуск запрещён — пробуем без него.
    if (paused) video.pause();
    else void video.play().catch(() => {
      if (!video.muted) {
        video.muted = true;
        void video.play().catch(() => undefined);
      }
    });
  }, [paused, src]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  return <video ref={videoRef} className={styles.video} data-state={status} playsInline autoPlay muted={muted} aria-label={label} />;
});
