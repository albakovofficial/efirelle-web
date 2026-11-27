import type { Metadata } from "next";
import { FollowingSidebar } from "@/components/layout/FollowingSidebar/FollowingSidebar";
import { PageShell } from "@/components/layout/PageShell/PageShell";
import { MultiviewBoard } from "@/components/multiview/MultiviewBoard/MultiviewBoard";
import { PageHeader } from "@/components/ui/PageHeader/PageHeader";
import { MULTIVIEW_MAX } from "@/config/multiview";
import { getFollowingLive, getLiveStreams } from "@/data/api";

export const metadata: Metadata = {
  title: "Мультиэфир",
  description: `До ${MULTIVIEW_MAX} эфиров на одном экране.`,
};

interface MultiviewPageProps {
  searchParams: Promise<{ c?: string | string[] }>;
}

/** Каналы из ?c=slug1,slug2 — только те, что сейчас в эфире, без повторов, не больше лимита. */
function readSlugs(value: string | string[] | undefined, liveSlugs: Set<string>): string[] {
  const raw = (Array.isArray(value) ? value.join(",") : (value ?? "")).split(",");
  const unique = [...new Set(raw.map((slug) => slug.trim()))];
  return unique.filter((slug) => liveSlugs.has(slug)).slice(0, MULTIVIEW_MAX);
}

/** Мультиэфир: сетка до четырёх эфиров, звук у одного. Без выбора в адресе — первые два из подписок. */
export default async function MultiviewPage({ searchParams }: MultiviewPageProps) {
  const [{ c }, following, streams] = await Promise.all([searchParams, getFollowingLive(), getLiveStreams()]);
  const fromUrl = readSlugs(c, new Set(streams.map((s) => s.channel.slug)));
  const initialSlugs = fromUrl.length > 0 ? fromUrl : following.slice(0, 2).map((s) => s.channel.slug);

  return (
    <PageShell dense sidebar={<FollowingSidebar streams={following} defaultCollapsed />}>
      <PageHeader
        title="Мультиэфир"
        subtitle={`До ${MULTIVIEW_MAX} эфиров на одном экране. Звук идёт от одного — переключайте его на плитке.`}
      />
      <MultiviewBoard streams={streams} initialSlugs={initialSlugs} />
    </PageShell>
  );
}
