"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { api } from "@/lib/api-client";
import type { Clip } from "@/types";
import styles from "./ClipPlayer.module.css";

const REFRESH_MS = 5_000;

/** Видео клипа и «Скопировать ссылку». Пока клип готовится, страница обновляется сама. */
export function ClipPlayer({ clip }: { clip: Clip }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (clip.status !== "processing") return;
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [clip.status, router]);

  useEffect(() => {
    if (clip.status === "ready") void api.viewClip(clip.id).catch(() => undefined);
  }, [clip.id, clip.status]);

  async function copy() {
    await navigator.clipboard.writeText(window.location.href).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={styles.root}>
      {clip.url ? (
        <video src={clip.url} controls autoPlay playsInline className={styles.video} />
      ) : (
        <div className={`${styles.video} ${styles.pending}`}>Клип готовится — это займёт около полуминуты…</div>
      )}
      <div className={styles.actions}>
        <Button variant="primary" icon="send" onClick={copy}>
          {copied ? "Ссылка скопирована" : "Скопировать ссылку"}
        </Button>
      </div>
    </div>
  );
}
