import type { Metadata } from "next";
import { CategoryCard } from "@/components/category/CategoryCard/CategoryCard";
import { FollowingSidebar } from "@/components/layout/FollowingSidebar/FollowingSidebar";
import { PageShell } from "@/components/layout/PageShell/PageShell";
import { StreamCard } from "@/components/stream/StreamCard/StreamCard";
import { AutoGrid } from "@/components/ui/AutoGrid/AutoGrid";
import { PageHeader } from "@/components/ui/PageHeader/PageHeader";
import { Section, SectionEmpty } from "@/components/ui/Section/Section";
import { getAllCategories, getFollowingLive, getLiveStreams } from "@/data/api";
import { formatCount, STREAM_FORMS, VIEWER_FORMS } from "@/lib/format";

export const metadata: Metadata = {
  title: "Обзор",
  description: "Все категории и эфиры, которые идут на Efirelle прямо сейчас.",
};

/** Обзор: все категории и все эфиры, самые популярные первыми. */
export default async function BrowsePage() {
  const [following, categories, streams] = await Promise.all([
    getFollowingLive(),
    getAllCategories(),
    getLiveStreams(),
  ]);
  const totalViewers = streams.reduce((sum, s) => sum + s.viewers, 0);

  return (
    <PageShell sidebar={<FollowingSidebar streams={following} />}>
      <PageHeader
        title="Обзор"
        subtitle={`Сейчас идёт ${formatCount(streams.length, STREAM_FORMS)}, их смотрят ${formatCount(totalViewers, VIEWER_FORMS)}`}
      />

      <Section id="browse-categories" title="Категории">
        <AutoGrid min={140}>
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </AutoGrid>
      </Section>

      <Section id="browse-streams" title="Все эфиры" subtitle="Самые популярные — первыми">
        {streams.length > 0 ? (
          <AutoGrid min={280} gap={20} rowGap={28}>
            {streams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </AutoGrid>
        ) : (
          <SectionEmpty>Сейчас никто не в эфире — загляните чуть позже.</SectionEmpty>
        )}
      </Section>
    </PageShell>
  );
}
