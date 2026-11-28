import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { formatCount } from "@/lib/format";
import { clipHref } from "@/lib/routes";
import type { Clip } from "@/types";
import styles from "./ClipCard.module.css";

const VIEW_FORMS = ["просмотр", "просмотра", "просмотров"] as const;

/** Карточка клипа: первый кадр видео, название, канал и просмотры. */
export function ClipCard({ clip }: { clip: Clip }) {
  return (
    <Link href={clipHref(clip.id)} className={styles.card}>
      <span className={styles.frame}>
        {clip.url ? (
          <video src={`${clip.url}#t=0.5`} preload="metadata" muted playsInline className={styles.video} aria-hidden="true" />
        ) : (
          <span className={styles.pending}>Клип готовится…</span>
        )}
        <span className={styles.duration}>0:{String(clip.durationSeconds).padStart(2, "0")}</span>
      </span>
      <span className={styles.title}>{clip.title}</span>
      <span className={styles.meta}>
        <Avatar initials={clip.channel.initials} tone={clip.channel.tone} imageUrl={clip.channel.avatarUrl} size="sm" />
        {clip.channel.name} · {formatCount(clip.views, VIEW_FORMS)}
      </span>
    </Link>
  );
}
