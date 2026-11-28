"use client";

import { useEffect, useState } from "react";

/** Секунды, прошедшие с момента появления компонента (или смены `resetKey`). Тикает раз в секунду. */
export function useElapsedSeconds(resetKey?: unknown): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [resetKey]);
  return elapsed;
}
