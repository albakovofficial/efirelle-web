import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Badge, LiveBadge } from "@/components/ui/Badge/Badge";
import { Icon } from "@/components/ui/Icon/Icon";
import { Thumbnail } from "@/components/ui/Thumbnail/Thumbnail";
import { StreamListItem } from "@/components/stream/StreamListItem/StreamListItem";
import { formatCompact } from "@/lib/format";
import { channelHref } from "@/lib/routes";
import type { Stream } from "@/types";
import styles from "./FeaturedHero.module.css";

/** Витрина: главный эфир крупно и список «Рекомендуем сейчас» рядом. */
export function FeaturedHero({ main, others }: { main: Stream; others: Stream[] }) {
  const { channel } = main;
  return (
    <section aria-label="Рекомендуемые эфиры" className={styles.hero}>
      <Link href={channelHref(channel.slug)} className={styles.main}>
        <Thumbnail tone={main.tone} ratio="free" radius="xl">
          <span className={styles.badges}>
            <LiveBadge />
            <Badge variant="glass">{formatCompact(main.viewers)}</Badge>
          </span>
          <span className={styles.play} aria-hidden="true">
            <Icon name="play" size={28} />
          </span>
          <span className={styles.caption}>
            <Avatar initials={channel.initials} tone={channel.tone} size="lg" />
            <span className={styles.captionText}>
              <span className={styles.title}>{main.title}</span>
              <span className={styles.meta}>{channel.name} · {main.category}</span>
            </span>
          </span>
        </Thumbnail>
      </Link>

      <div className={styles.side}>
        <span className={styles.sideCaption}>РЕКОМЕНДУЕМ СЕЙЧАС</span>
        {others.map((stream) => (
          <StreamListItem key={stream.id} stream={stream} />
        ))}
      </div>
    </section>
  );
}
