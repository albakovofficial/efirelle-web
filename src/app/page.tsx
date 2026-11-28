import { CategoryCard } from "@/components/category/CategoryCard/CategoryCard";
import { FeaturedHero } from "@/components/home/FeaturedHero/FeaturedHero";
import { FollowingStrip } from "@/components/home/FollowingStrip/FollowingStrip";
import { StreamsForYou } from "@/components/home/StreamsForYou/StreamsForYou";
import { FollowingSidebar } from "@/components/layout/FollowingSidebar/FollowingSidebar";
import { PageShell } from "@/components/layout/PageShell/PageShell";
import { MomentCard } from "@/components/moments/MomentCard/MomentCard";
import { ScheduleCard } from "@/components/schedule/ScheduleCard";
import { AutoGrid } from "@/components/ui/AutoGrid/AutoGrid";
import { Button } from "@/components/ui/Button/Button";
import { Section, SectionEmpty } from "@/components/ui/Section/Section";
import { getCurrentViewer, getHomeFeed } from "@/data/api";

/** Главная: витрина, ближайшие анонсы, живые моменты, категории, персональная лента. */
export default async function HomePage() {
  const [feed, viewer] = await Promise.all([getHomeFeed(), getCurrentViewer()]);
  const following = feed.following.flatMap((status) => (status.stream ? [status.stream] : []));
  const [mainStream, ...otherFeatured] = feed.featured;

  return (
    <PageShell sidebar={<FollowingSidebar streams={following} />}>
      <FollowingStrip streams={following} />

      {mainStream ? (
        <FeaturedHero main={mainStream} others={otherFeatured.slice(0, 4)} />
      ) : (
        <Section id="empty" title="Сейчас никто не в эфире">
          <SectionEmpty>Станьте первым: в студии есть адрес сервера и ключ для OBS или любого приложения с RTMP.</SectionEmpty>
          <Button href="/studio" variant="dark">
            Открыть студию
          </Button>
        </Section>
      )}

      {feed.upcoming.length > 0 && (
        <Section id="upcoming" title="Скоро в эфире" subtitle="Анонсы авторов — нажмите «Напомнить», и мы пришлём уведомление">
          <AutoGrid min={240}>
            {feed.upcoming.map((item) => (
              <ScheduleCard key={item.id} item={item} signedIn={viewer !== null} />
            ))}
          </AutoGrid>
        </Section>
      )}

      {feed.moments.length > 0 && (
        <Section
          id="moments"
          title="Живые моменты"
          subtitle="Что происходит в эфирах прямо сейчас — подключайтесь в самый разгар"
        >
          <AutoGrid min={230}>
            {feed.moments.map((moment) => (
              <MomentCard key={moment.id} moment={moment} />
            ))}
          </AutoGrid>
        </Section>
      )}

      <Section id="categories" title="Категории" action={{ label: "Смотреть все", href: "/browse" }}>
        <AutoGrid min={140}>
          {feed.categories.slice(0, 8).map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </AutoGrid>
      </Section>

      {feed.forYou.length > 0 && <StreamsForYou streams={feed.forYou} />}
    </PageShell>
  );
}
