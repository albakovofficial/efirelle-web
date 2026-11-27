import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Badge, LiveBadge } from "@/components/ui/Badge/Badge";
import { TagList } from "@/components/ui/Tag/Tag";
import { Thumbnail } from "@/components/ui/Thumbnail/Thumbnail";
import { formatCount, formatDuration, VIEWER_FORMS } from "@/lib/format";
import { channelHref } from "@/lib/routes";
import type { Stream } from "@/types";
import styles from "./StreamCard.module.css";

/** Карточка эфира в сетке: превью, канал, название, теги. */
export function StreamCard({ stream }: { stream: Stream }) {
  const { channel } = stream;
  return (
    <Link href={channelHref(channel.slug)} className={styles.card}>
      <Thumbnail tone={stream.tone}>
        <span className={styles.topLeft}><LiveBadge short size="sm" /></span>
        <span className={styles.bottomLeft}>
          <Badge variant="glass" size="sm">{formatCount(stream.viewers, VIEWER_FORMS)}</Badge>
        </span>
        <span className={styles.bottomRight}>
          <Badge variant="dark" size="sm">{formatDuration(stream.durationSeconds)}</Badge>
        </span>
      </Thumbnail>
      <span className={styles.body}>
        <Avatar initials={channel.initials} tone={channel.tone} />
        <span className={styles.text}>
          <span className={styles.title}>{stream.title}</span>
          <span className={styles.meta}>{channel.name} · {stream.category}</span>
          <TagList tags={stream.tags} />
        </span>
      </span>
    </Link>
  );
}
