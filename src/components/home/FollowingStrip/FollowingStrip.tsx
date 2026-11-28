import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { channelHref } from "@/lib/routes";
import type { Stream } from "@/types";
import styles from "./FollowingStrip.module.css";

/** Горизонтальная лента отслеживаемых в эфире — замена боковой панели на телефоне. */
export function FollowingStrip({ streams }: { streams: Stream[] }) {
  return (
    <section aria-labelledby="following-strip" className={styles.strip}>
      <h2 id="following-strip" className={styles.caption}>В СЕТИ</h2>
      <ul className={styles.list}>
        {streams.map(({ id, channel }) => (
          <li key={id}>
            <Link href={channelHref(channel.slug)} className={styles.item}>
              <Avatar initials={channel.initials} tone={channel.tone} imageUrl={channel.avatarUrl} size="xl" ring="live" />
              <span className={styles.name}>{channel.name.split(" ")[0]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
