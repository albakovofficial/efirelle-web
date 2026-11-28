"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Badge, LiveBadge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { Section, SectionEmpty } from "@/components/ui/Section/Section";
import { Thumbnail } from "@/components/ui/Thumbnail/Thumbnail";
import { HlsVideo } from "@/components/watch/HlsVideo/HlsVideo";
import { MULTIVIEW_MAX } from "@/config/multiview";
import { formatCompact, formatCount, VIEWER_FORMS } from "@/lib/format";
import { channelHref, multiviewHref } from "@/lib/routes";
import type { Stream } from "@/types";
import styles from "./MultiviewBoard.module.css";

interface MultiviewBoardProps {
  /** Все эфиры, которые можно добавить. */
  streams: Stream[];
  /** Выбранные каналы при открытии страницы (уже проверены на сервере). */
  initialSlugs: string[];
}

/**
 * Сетка мультиэфира и список для добавления. Выбор хранится в адресе (?c=…),
 * чтобы экран можно было обновить или отправить ссылкой. Звук — только у одной плитки, которую выбрал зритель.
 */
export function MultiviewBoard({ streams, initialSlugs }: MultiviewBoardProps) {
  const router = useRouter();
  const [slugs, setSlugs] = useState(initialSlugs);
  // Браузер не даёт включить звук без нажатия, поэтому сначала все плитки без звука.
  const [audioSlug, setAudioSlug] = useState<string | null>(null);

  const bySlug = useMemo(() => new Map(streams.map((s) => [s.channel.slug, s])), [streams]);
  const selected = slugs.flatMap((slug) => bySlug.get(slug) ?? []);
  const available = streams.filter((s) => !slugs.includes(s.channel.slug));
  const full = slugs.length >= MULTIVIEW_MAX;

  function update(next: string[]) {
    setSlugs(next);
    router.replace(multiviewHref(next), { scroll: false });
  }

  function add(slug: string) {
    if (full || slugs.includes(slug)) return;
    update([...slugs, slug]);
    if (audioSlug === null) setAudioSlug(slug);
  }

  function remove(slug: string) {
    const next = slugs.filter((s) => s !== slug);
    update(next);
    if (audioSlug === slug) setAudioSlug(next[0] ?? null);
  }

  return (
    <>
      {selected.length > 0 ? (
        <ul className={styles.grid} data-count={selected.length} aria-label="Эфиры на экране">
          {selected.map((stream) => {
            const { channel } = stream;
            const hasAudio = channel.slug === audioSlug;
            return (
              <li key={stream.id} className={`${styles.tile} ${hasAudio ? styles.tileAudio : ""}`}>
                <Thumbnail tone={stream.tone} radius="lg">
                  <HlsVideo src={stream.playbackUrl} muted={!hasAudio} label={`Эфир ${channel.name}`} />
                  <span className={styles.topLeft}>
                    <LiveBadge short size="sm" />
                    <Badge variant="glass" size="sm">{formatCount(stream.viewers, VIEWER_FORMS)}</Badge>
                  </span>
                  <span className={styles.topRight}>
                    <Button
                      variant="glass"
                      size="sm"
                      icon={hasAudio ? "volume" : "mute"}
                      aria-label={hasAudio ? `Звук: ${channel.name}` : `Включить звук: ${channel.name}`}
                      aria-pressed={hasAudio}
                      onClick={() => setAudioSlug(channel.slug)}
                    />
                    <Button
                      variant="glass"
                      size="sm"
                      icon="close"
                      aria-label={`Убрать с экрана: ${channel.name}`}
                      onClick={() => remove(channel.slug)}
                    />
                  </span>
                  <Link href={channelHref(channel.slug)} className={styles.caption}>
                    <Avatar initials={channel.initials} tone={channel.tone} imageUrl={channel.avatarUrl} size="sm" />
                    <span className={styles.captionText}>
                      <span className={styles.captionName}>{channel.name}</span>
                      <span className={styles.captionTitle}>{stream.title}</span>
                    </span>
                  </Link>
                </Thumbnail>
              </li>
            );
          })}
        </ul>
      ) : (
        <SectionEmpty>Экран пуст — добавьте эфиры из списка ниже.</SectionEmpty>
      )}

      <Section
        id="multiview-add"
        title="Добавить эфир"
        subtitle={full ? `На экране максимум — ${MULTIVIEW_MAX}. Уберите плитку, чтобы добавить другую.` : `На экране ${slugs.length} из ${MULTIVIEW_MAX}`}
        size="sm"
      >
        {available.length > 0 ? (
          <ul className={styles.picker}>
            {available.map((stream) => (
              <li key={stream.id}>
                <button
                  type="button"
                  className={styles.option}
                  disabled={full}
                  aria-label={`Добавить на экран: ${stream.channel.name}`}
                  onClick={() => add(stream.channel.slug)}
                >
                  <Avatar initials={stream.channel.initials} tone={stream.channel.tone} imageUrl={stream.channel.avatarUrl} live />
                  <span className={styles.optionText}>
                    <span className={styles.optionName}>{stream.channel.name}</span>
                    <span className={styles.optionMeta}>
                      {stream.category} · {formatCompact(stream.viewers)}
                    </span>
                  </span>
                  <Icon name="plus" size={18} className={styles.optionIcon} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <SectionEmpty>Все эфиры уже на экране.</SectionEmpty>
        )}
      </Section>
    </>
  );
}
