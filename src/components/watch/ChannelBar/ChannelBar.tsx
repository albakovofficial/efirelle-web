import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { Tag, TagList } from "@/components/ui/Tag/Tag";
import { formatCount } from "@/lib/format";
import type { Stream } from "@/types";
import { FollowButton } from "./FollowButton";
import styles from "./ChannelBar.module.css";

const FOLLOWER_FORMS = ["отслеживает", "отслеживают", "отслеживают"] as const;

/** Канал под плеером: автор, название эфира, категория, действия. */
export function ChannelBar({ stream }: { stream: Stream }) {
  const { channel } = stream;
  return (
    <div className={styles.bar}>
      <Avatar initials={channel.initials} tone={channel.tone} size="xl" ring="live" />
      <div className={styles.info}>
        <p className={styles.channel}>
          {channel.name}
          {channel.verified && <Icon name="verified" size={16} label="Подтверждённый канал" className={styles.verified} />}
          <span className={styles.followers}>{formatCount(channel.followers, FOLLOWER_FORMS)}</span>
        </p>
        <h1 className={styles.title}>{stream.title}</h1>
        <span className={styles.tags}>
          <Tag tone={stream.tone}>{stream.category}</Tag>
          <TagList tags={stream.tags} />
        </span>
      </div>
      <div className={styles.actions}>
        <FollowButton channelName={channel.name} />
        <Button size="lg">Подписка</Button>
      </div>
    </div>
  );
}
