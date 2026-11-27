import Link from "next/link";
import { Badge } from "@/components/ui/Badge/Badge";
import { channelHref } from "@/lib/routes";
import { momentMeta } from "@/theme/tones";
import type { Moment } from "@/types";
import styles from "./MomentCard.module.css";

/** Карточка «живого момента»: что происходит в эфире прямо сейчас. */
export function MomentCard({ moment }: { moment: Moment }) {
  const meta = momentMeta[moment.kind];
  return (
    <Link href={channelHref(moment.channel.slug)} className={styles.card}>
      <span className={styles.top}>
        <Badge variant="tone" tone={meta.tone}>{meta.label}</Badge>
        <span className={styles.when}>{moment.when}</span>
      </span>
      <span className={styles.text}>{moment.text}</span>
      <span className={styles.channel}>{moment.channel.name}</span>
    </Link>
  );
}
