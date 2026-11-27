import Link from "next/link";
import { LiveBadge } from "@/components/ui/Badge/Badge";
import { Thumbnail } from "@/components/ui/Thumbnail/Thumbnail";
import { formatCompact } from "@/lib/format";
import { channelHref } from "@/lib/routes";
import type { Stream } from "@/types";
import styles from "./StreamListItem.module.css";

/** Компактная строка эфира: маленькое превью и подпись. Для списков рекомендаций. */
export function StreamListItem({ stream, highlighted = false }: { stream: Stream; highlighted?: boolean }) {
  return (
    <Link href={channelHref(stream.channel.slug)} className={`${styles.item} ${highlighted ? styles.highlighted : ""}`}>
      <span className={styles.thumb}>
        <Thumbnail tone={stream.tone} ratio="free" radius="md">
          <span className={styles.badge}><LiveBadge short size="sm" /></span>
        </Thumbnail>
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{stream.title}</span>
        <span className={styles.meta}>
          {stream.channel.name} · {formatCompact(stream.viewers)}
        </span>
      </span>
    </Link>
  );
}
