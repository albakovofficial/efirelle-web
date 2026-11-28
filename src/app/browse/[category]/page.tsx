import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FollowingSidebar } from "@/components/layout/FollowingSidebar/FollowingSidebar";
import { PageShell } from "@/components/layout/PageShell/PageShell";
import { StreamCard } from "@/components/stream/StreamCard/StreamCard";
import { AutoGrid } from "@/components/ui/AutoGrid/AutoGrid";
import { Button } from "@/components/ui/Button/Button";
import { PageHeader } from "@/components/ui/PageHeader/PageHeader";
import { MULTIVIEW_MAX } from "@/config/multiview";
import { Section, SectionEmpty } from "@/components/ui/Section/Section";
import { Thumbnail } from "@/components/ui/Thumbnail/Thumbnail";
import { getCategoryWithStreams, getFollowingLive } from "@/data/api";
import { formatCount, STREAM_FORMS, VIEWER_FORMS } from "@/lib/format";
import { multiviewHref } from "@/lib/routes";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: id } = await params;
  const found = await getCategoryWithStreams(id);
  if (!found) return { title: "Категория не найдена" };
  const { category } = found;
  return { title: category.name, description: `${category.name}: эфиры, которые идут сейчас на Efirelle.` };
}

/** Категория: обложка, сколько зрителей, эфиры внутри. */
export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: id } = await params;
  const [found, following] = await Promise.all([getCategoryWithStreams(id), getFollowingLive()]);
  if (!found) notFound();
  const { category, streams } = found;
  const slugsForMultiview = streams.slice(0, MULTIVIEW_MAX).map((s) => s.channel.slug);

  return (
    <PageShell sidebar={<FollowingSidebar streams={following} />}>
      <PageHeader
        eyebrow={category.group}
        title={category.name}
        subtitle={`${formatCount(category.viewers, VIEWER_FORMS)} · ${formatCount(streams.length, STREAM_FORMS)} сейчас`}
        media={<Thumbnail tone={category.tone} ratio="3/4" radius="md" />}
        aside={
          slugsForMultiview.length > 1 && (
            <Button href={multiviewHref(slugsForMultiview)} icon="multiview">
              Открыть в мультиэфире
            </Button>
          )
        }
      />

      <Section id="category-streams" title="В эфире">
        {streams.length > 0 ? (
          <AutoGrid min={280} gap={20} rowGap={28}>
            {streams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </AutoGrid>
        ) : (
          <SectionEmpty>В этой категории сейчас никого нет — загляните в «Обзор».</SectionEmpty>
        )}
      </Section>
    </PageShell>
  );
}
