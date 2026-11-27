import { CategoryCard } from "@/components/category/CategoryCard/CategoryCard";
import { FeaturedHero } from "@/components/home/FeaturedHero/FeaturedHero";
import { FollowingStrip } from "@/components/home/FollowingStrip/FollowingStrip";
import { StreamsForYou } from "@/components/home/StreamsForYou/StreamsForYou";
import { FollowingSidebar } from "@/components/layout/FollowingSidebar/FollowingSidebar";
import { PageShell } from "@/components/layout/PageShell/PageShell";
import { MomentCard } from "@/components/moments/MomentCard/MomentCard";
import { AutoGrid } from "@/components/ui/AutoGrid/AutoGrid";
import { Section } from "@/components/ui/Section/Section";
import {
  getFeaturedStreams,
  getFollowingLive,
  getLiveMoments,
  getStreamsForYou,
  getTopCategories,
} from "@/data/api";

/** Главная: витрина, живые моменты, категории, персональная лента. */
export default async function HomePage() {
  const [following, featured, moments, categories, forYou] = await Promise.all([
    getFollowingLive(),
    getFeaturedStreams(),
    getLiveMoments(),
    getTopCategories(),
    getStreamsForYou(),
  ]);
  const [mainStream, ...otherFeatured] = featured;

  return (
    <PageShell sidebar={<FollowingSidebar streams={following} />}>
      <FollowingStrip streams={following} />

      {mainStream && <FeaturedHero main={mainStream} others={otherFeatured.slice(0, 4)} />}

      <Section
        id="moments"
        title="Живые моменты"
        subtitle="Что происходит в эфирах прямо сейчас — подключайтесь в самый разгар"
      >
        <AutoGrid min={230}>
          {moments.map((moment) => (
            <MomentCard key={moment.id} moment={moment} />
          ))}
        </AutoGrid>
      </Section>

      <Section id="categories" title="Категории" action={{ label: "Смотреть все", href: "/browse" }}>
        <AutoGrid min={140}>
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </AutoGrid>
      </Section>

      <StreamsForYou streams={forYou} />
    </PageShell>
  );
}
