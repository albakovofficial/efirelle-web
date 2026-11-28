"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { Tag, TagList } from "@/components/ui/Tag/Tag";
import { formatCount } from "@/lib/format";
import { channelHref, loginHref } from "@/lib/routes";
import { useWatchRoom } from "../WatchRoom/WatchRoom";
import { FollowButton } from "./FollowButton";
import styles from "./ChannelBar.module.css";

const FOLLOWER_FORMS = ["отслеживает", "отслеживают", "отслеживают"] as const;

/** Канал под плеером: автор, название эфира, категория, действия. */
export function ChannelBar() {
  const { watch, viewer } = useWatchRoom();
  const { channel, stream } = watch;
  const [followers, setFollowers] = useState(channel.followers);

  return (
    <div className={styles.bar}>
      <Avatar initials={channel.initials} tone={channel.tone} size="xl" ring={stream ? "live" : undefined} />
      <div className={styles.info}>
        <p className={styles.channel}>
          {channel.name}
          {channel.verified && <Icon name="verified" size={16} label="Подтверждённый канал" className={styles.verified} />}
          <span className={styles.followers}>{formatCount(followers, FOLLOWER_FORMS)}</span>
        </p>
        {stream && (
          <>
            <h1 className={styles.title}>{stream.title}</h1>
            <span className={styles.tags}>
              <Tag tone={stream.tone}>{stream.category}</Tag>
              <TagList tags={stream.tags} />
            </span>
          </>
        )}
      </div>
      <div className={styles.actions}>
        {watch.isOwner ? (
          <Button href="/studio" size="lg" icon="settings">
            Студия
          </Button>
        ) : viewer ? (
          <FollowButton slug={channel.slug} channelName={channel.name} initial={watch.isFollowing} onChange={setFollowers} />
        ) : (
          <Button href={loginHref(channelHref(channel.slug))} variant="primary" size="lg" icon="heart">
            Отслеживать
          </Button>
        )}
      </div>
    </div>
  );
}
