"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Button } from "@/components/ui/Button/Button";
import { formatCompact } from "@/lib/format";
import { channelHref } from "@/lib/routes";
import type { Stream } from "@/types";
import styles from "./FollowingSidebar.module.css";

interface FollowingSidebarProps {
  streams: Stream[];
  /** На странице эфира панель по умолчанию свёрнута до узкой полосы аватаров. */
  defaultCollapsed?: boolean;
  activeSlug?: string;
}

/** Отслеживаемые каналы в эфире. Разворачивается в список и сворачивается в полосу. */
export function FollowingSidebar({ streams, defaultCollapsed = false, activeSlug }: FollowingSidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <aside
      aria-label="Отслеживаемые каналы"
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}
    >
      <div className={styles.head}>
        {!collapsed && <span className={styles.caption}>В СЕТИ · {streams.length}</span>}
        <Button
          variant="ghost"
          size="sm"
          icon={collapsed ? "chevronRight" : "chevronLeft"}
          aria-label={collapsed ? "Развернуть панель" : "Свернуть панель"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        />
      </div>

      <ul className={styles.list}>
        {streams.map((stream) => {
          const { channel } = stream;
          const active = channel.slug === activeSlug;
          return (
            <li key={stream.id}>
              <Link
                href={channelHref(channel.slug)}
                aria-current={active ? "page" : undefined}
                aria-label={collapsed ? `${channel.name}, ${formatCompact(stream.viewers)} зрителей` : undefined}
                className={`${styles.row} ${active ? styles.rowActive : ""}`}
              >
                <Avatar
                  initials={channel.initials}
                  tone={channel.tone}
                  size={collapsed ? "lg" : "md"}
                  live
                  ring={collapsed && active ? "active" : undefined}
                />
                {!collapsed && (
                  <span className={styles.meta}>
                    <span className={styles.line}>
                      <span className={styles.name}>{channel.name}</span>
                      <span className={styles.viewers}>{formatCompact(stream.viewers)}</span>
                    </span>
                    <span className={styles.status}>{stream.status}</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {!collapsed && (
        <div className={styles.promo}>
          <span className={styles.promoTitle}>Мультиэфир</span>
          <p className={styles.promoText}>Смотрите до 4 каналов на одном экране — звук переключается кликом.</p>
          <Link href="/multiview" className={styles.promoLink}>
            Собрать экран
          </Link>
        </div>
      )}
    </aside>
  );
}
