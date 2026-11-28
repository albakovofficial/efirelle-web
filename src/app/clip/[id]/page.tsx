import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipPlayer } from "@/components/clips/ClipPlayer";
import { FollowingSidebar } from "@/components/layout/FollowingSidebar/FollowingSidebar";
import { PageShell } from "@/components/layout/PageShell/PageShell";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { PageHeader } from "@/components/ui/PageHeader/PageHeader";
import { getClip, getFollowingLive } from "@/data/api";
import { formatCount } from "@/lib/format";
import { channelHref } from "@/lib/routes";
import styles from "./clip.module.css";

const VIEW_FORMS = ["просмотр", "просмотра", "просмотров"] as const;

interface ClipPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ClipPageProps): Promise<Metadata> {
  const clip = await getClip((await params).id);
  if (!clip) return { title: "Клип не найден" };
  const title = `${clip.title} — ${clip.channel.name}`;
  return {
    title,
    description: `Клип с эфира ${clip.channel.name} на Efirelle`,
    openGraph: { title, type: "video.other", ...(clip.url ? { videos: [{ url: clip.url, type: "video/mp4" }] } : {}) },
  };
}

/** Страница клипа — ей делятся ссылкой. */
export default async function ClipPage({ params }: ClipPageProps) {
  const { id } = await params;
  const [clip, following] = await Promise.all([getClip(id), getFollowingLive()]);
  if (!clip) notFound();

  return (
    <PageShell sidebar={<FollowingSidebar streams={following} />}>
      <PageHeader title={clip.title} subtitle={`Клип ${clip.durationSeconds} с · ${formatCount(clip.views, VIEW_FORMS)}${clip.author ? ` · сохранил(а) ${clip.author}` : ""}`} />
      <ClipPlayer clip={clip} />
      <Link href={channelHref(clip.channel.slug)} className={styles.channel}>
        <Avatar initials={clip.channel.initials} tone={clip.channel.tone} imageUrl={clip.channel.avatarUrl} size="lg" />
        <span>
          <strong>{clip.channel.name}</strong>
          <span>Перейти на канал</span>
        </span>
      </Link>
    </PageShell>
  );
}
