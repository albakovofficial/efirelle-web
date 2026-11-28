import { CategoryCard } from "@/components/category/CategoryCard/CategoryCard";
import { ClipCard } from "@/components/clips/ClipCard/ClipCard";
import { FeaturedHero } from "@/components/home/FeaturedHero/FeaturedHero";
import { QuietBanner } from "@/components/home/QuietBanner/QuietBanner";
import { StreamsForYou } from "@/components/home/StreamsForYou/StreamsForYou";
import { FollowingSidebar } from "@/components/layout/FollowingSidebar/FollowingSidebar";
import { PageShell } from "@/components/layout/PageShell/PageShell";
import { MomentCard } from "@/components/moments/MomentCard/MomentCard";
import { ScheduleCard } from "@/components/schedule/ScheduleCard";
import { StreamCard } from "@/components/stream/StreamCard/StreamCard";
import { AutoGrid } from "@/components/ui/AutoGrid/AutoGrid";
import { Section } from "@/components/ui/Section/Section";
import { getCurrentViewer, getHomeFeed } from "@/data/api";

/**
 * Главная: отслеживаемые каналы в эфире, витрина (или «Эфиров сейчас нет»), категории-обложки,
 * анонсы, живые моменты, клипы и персональная лента.
 */
export default async function HomePage() {
  const [feed, viewer] = await Promise.all([getHomeFeed(), getCurrentViewer()]);
  const following = feed.following.flatMap((status) => (status.stream ? [status.stream] : []));
  const [mainStream, ...otherFeatured] = feed.featured;
  // Где сейчас смотрят больше всего — первыми (сортировка устойчивая: при равенстве порядок сервера).
  const categories = [...feed.categories].sort((a, b) => b.viewers - a.viewers);

  return (
    <PageShell sidebar={<FollowingSidebar streams={following} />}>
      {following.length > 0 && (
        <Section id="following-live" title="Ваши каналы в эфире" action={{ label: "Все подписки", href: "/following" }}>
          <AutoGrid min={280}>
            {following.slice(0, 4).map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </AutoGrid>
        </Section>
      )}

      {mainStream ? <FeaturedHero main={mainStream} others={otherFeatured.slice(0, 4)} /> : <QuietBanner />}

      <Section id="categories" title="Категории" action={{ label: "Смотреть все", href: "/browse" }}>
        <AutoGrid min={150}>
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </AutoGrid>
      </Section>

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

      {feed.clips.length > 0 && (
        <Section id="clips" title="Популярные клипы" subtitle="Лучшие моменты недели — сохранили зрители">
          <AutoGrid min={220}>
            {feed.clips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} />
            ))}
          </AutoGrid>
        </Section>
      )}

      {feed.forYou.length > 0 && <StreamsForYou streams={feed.forYou} />}
    </PageShell>
  );
}
