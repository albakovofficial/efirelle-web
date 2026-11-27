import type { Metadata } from "next";
import { CategoryCard } from "@/components/category/CategoryCard/CategoryCard";
import { ChannelCard } from "@/components/channel/ChannelCard/ChannelCard";
import { FollowingSidebar } from "@/components/layout/FollowingSidebar/FollowingSidebar";
import { PageShell } from "@/components/layout/PageShell/PageShell";
import { StreamCard } from "@/components/stream/StreamCard/StreamCard";
import { AutoGrid } from "@/components/ui/AutoGrid/AutoGrid";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { PageHeader } from "@/components/ui/PageHeader/PageHeader";
import { Section, SectionEmpty } from "@/components/ui/Section/Section";
import { getAllCategories, getFollowingLive, search } from "@/data/api";
import styles from "./search.module.css";

interface SearchPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

function readQuery(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const query = readQuery((await searchParams).q);
  return { title: query ? `«${query}» — поиск` : "Поиск", robots: { index: false } };
}

/** Поиск по эфирам, каналам и категориям. Запрос приходит из шапки как ?q=… */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = readQuery((await searchParams).q);
  const [following, results, categories] = await Promise.all([
    getFollowingLive(),
    search(query),
    getAllCategories(),
  ]);
  const found = results.streams.length + results.channels.length + results.categories.length;

  return (
    <PageShell sidebar={<FollowingSidebar streams={following} />}>
      <PageHeader
        title={query ? `«${query}»` : "Поиск"}
        eyebrow={query ? "Поиск" : undefined}
        subtitle={query ? (found > 0 ? `Найдено: ${found}` : "Ничего не нашлось") : "Каналы, эфиры и категории"}
      />

      {/* Отдельное поле нужно на телефоне: там в шапке только кнопка-лупа. */}
      <form role="search" action="/search" className={styles.form}>
        <label htmlFor="page-search" className="visually-hidden">
          Поиск
        </label>
        <Icon name="search" size={20} />
        <input
          id="page-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Например, «музыка» или «Мира»"
          autoComplete="off"
          className={styles.input}
        />
        <Button type="submit" variant="dark">
          Найти
        </Button>
      </form>

      {query && found === 0 && (
        <SectionEmpty>
          По запросу «{query}» ничего нет. Проверьте написание или загляните в категории ниже.
        </SectionEmpty>
      )}

      {results.channels.length > 0 && (
        <Section id="search-channels" title="Каналы" size="sm">
          <AutoGrid min={260} gap={12}>
            {results.channels.map((item) => (
              <ChannelCard key={item.channel.slug} {...item} />
            ))}
          </AutoGrid>
        </Section>
      )}

      {results.streams.length > 0 && (
        <Section id="search-streams" title="Эфиры" size="sm">
          <AutoGrid min={280} gap={20} rowGap={28}>
            {results.streams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </AutoGrid>
        </Section>
      )}

      {(results.categories.length > 0 || found === 0) && (
        <Section
          id="search-categories"
          title={results.categories.length > 0 ? "Категории" : "Популярные категории"}
          size="sm"
        >
          <AutoGrid min={140}>
            {(results.categories.length > 0 ? results.categories : categories).map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </AutoGrid>
        </Section>
      )}
    </PageShell>
  );
}
