import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { LiveBadge } from "@/components/ui/Badge/Badge";
import { Icon } from "@/components/ui/Icon/Icon";
import { formatCount, FOLLOWER_FORMS, VIEWER_FORMS } from "@/lib/format";
import { channelHref } from "@/lib/routes";
import type { ChannelStatus } from "@/types";
import styles from "./ChannelCard.module.css";

/**
 * Карточка канала: аватар, имя, подписчики и статус.
 * Канал в эфире — ссылка на эфир; канал не в сети — просто карточка (страницы канала пока нет).
 */
export function ChannelCard({ channel, stream }: ChannelStatus) {
  const live = stream !== null;
  const content = (
    <>
      <Avatar initials={channel.initials} tone={channel.tone} size="xl" ring={live ? "live" : undefined} />
      <span className={styles.text}>
        <span className={styles.name}>
          {channel.name}
          {channel.verified && <Icon name="verified" size={16} label="Подтверждённый канал" className={styles.verified} />}
        </span>
        <span className={styles.meta}>{formatCount(channel.followers, FOLLOWER_FORMS)}</span>
        {live ? (
          <span className={styles.status}>
            <LiveBadge short size="sm" />
            <span className={styles.statusText}>
              {stream.status} · {formatCount(stream.viewers, VIEWER_FORMS)}
            </span>
          </span>
        ) : (
          <span className={styles.offline}>Не в сети</span>
        )}
      </span>
    </>
  );

  return live ? (
    <Link href={channelHref(channel.slug)} className={`${styles.card} ${styles.link}`}>
      {content}
    </Link>
  ) : (
    <div className={`${styles.card} ${styles.idle}`}>{content}</div>
  );
}
