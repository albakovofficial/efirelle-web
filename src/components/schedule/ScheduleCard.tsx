"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Button } from "@/components/ui/Button/Button";
import { api } from "@/lib/api-client";
import { formatScheduleDate } from "@/lib/format";
import { channelHref, loginHref } from "@/lib/routes";
import type { ScheduledStream } from "@/types";
import styles from "./ScheduleCard.module.css";

interface ScheduleCardProps {
  item: ScheduledStream;
  /** Без входа кнопка ведёт на страницу входа. */
  signedIn: boolean;
  /** На странице своего канала напоминание не нужно. */
  showChannel?: boolean;
}

/** Анонс эфира: когда, о чём, кнопка «Напомнить». */
export function ScheduleCard({ item, signedIn, showChannel = true }: ScheduleCardProps) {
  const [reminded, setReminded] = useState(item.isReminded);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      setReminded((await api.remind(item.id, !reminded)).isReminded);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={styles.card}>
      <p className={styles.when}>{formatScheduleDate(item.startsAt)}</p>
      <h3 className={styles.title}>{item.title}</h3>
      {showChannel ? (
        <Link href={channelHref(item.channel.slug)} className={styles.channel}>
          <Avatar initials={item.channel.initials} tone={item.channel.tone} imageUrl={item.channel.avatarUrl} size="sm" />
          {item.channel.name} · {item.category}
        </Link>
      ) : (
        <p className={styles.channel}>{item.category}</p>
      )}
      {signedIn ? (
        <Button size="sm" variant={reminded ? "secondary" : "primary"} aria-pressed={reminded} disabled={busy} onClick={toggle}>
          {reminded ? "Напомним за 5 минут" : "Напомнить"}
        </Button>
      ) : (
        <Button size="sm" variant="primary" href={loginHref(channelHref(item.channel.slug))}>
          Напомнить
        </Button>
      )}
    </article>
  );
}
