"use client";

import { useState, type ReactNode } from "react";
import type { Moment, Stream } from "@/types";
import { Player } from "../Player/Player";
import { StreamMoments } from "../StreamMoments/StreamMoments";

interface StreamStageProps {
  stream: Stream;
  markers: Moment[];
  /** Блок между плеером и моментами (информация о канале). */
  children?: ReactNode;
}

/** Хранит позицию просмотра и связывает плеер со списком моментов. */
export function StreamStage({ stream, markers, children }: StreamStageProps) {
  const [position, setPosition] = useState(stream.durationSeconds);

  return (
    <>
      <Player stream={stream} markers={markers} position={position} onSeek={setPosition} />
      {children}
      <StreamMoments markers={markers} onSeek={setPosition} />
    </>
  );
}
