import type { Metadata } from "next";
import { ChannelCard } from "@/components/channel/ChannelCard/ChannelCard";
import { FollowingSidebar } from "@/components/layout/FollowingSidebar/FollowingSidebar";
import { PageShell } from "@/components/layout/PageShell/PageShell";
import { StreamCard } from "@/components/stream/StreamCard/StreamCard";
import { AutoGrid } from "@/components/ui/AutoGrid/AutoGrid";
import { Button } from "@/components/ui/Button/Button";
import { PageHeader } from "@/components/ui/PageHeader/PageHeader";
import { MULTIVIEW_MAX } from "@/config/multiview";
import { Section, SectionEmpty } from "@/components/ui/Section/Section";
import { getCurrentViewer, getFollowedChannels } from "@/data/api";
import { CHANNEL_FORMS, formatCount } from "@/lib/format";
import { loginHref, multiviewHref } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Отслеживаемые",
  description: "Каналы, на которые вы подписаны: кто сейчас в эфире и кто не в сети.",
};

/** Отслеживаемые: эфиры подписок крупно, ниже — все каналы со статусом. */
export default async function FollowingPage() {
  const [viewer, followed] = await Promise.all([getCurrentViewer(), getFollowedChannels()]);
  const live = followed.flatMap((item) => (item.stream ? [item.stream] : []));

  if (!viewer) {
    return (
      <PageShell sidebar={<FollowingSidebar streams={[]} />}>
        <PageHeader title="Отслеживаемые" subtitle="Каналы, на которые вы подписаны" />
        <SectionEmpty>Войдите, чтобы отслеживать каналы и видеть, кто из них сейчас в эфире.</SectionEmpty>
        <Button href={loginHref("/following")} variant="dark">
          Войти
        </Button>
      </PageShell>
    );
  }

  const offline = followed.filter((item) => item.stream === null);
  const slugsForMultiview = live.slice(0, MULTIVIEW_MAX).map((s) => s.channel.slug);

  return (
    <PageShell sidebar={<FollowingSidebar streams={live} />}>
      <PageHeader
        title="Отслеживаемые"
        subtitle={`${formatCount(followed.length, CHANNEL_FORMS, { compact: false })} в подписках, в эфире — ${live.length}`}
        aside={
          slugsForMultiview.length > 1 && (
            <Button href={multiviewHref(slugsForMultiview)} icon="multiview">
              Смотреть вместе
            </Button>
          )
        }
      />

      <Section id="following-live" title="Сейчас в эфире">
        {live.length > 0 ? (
          <AutoGrid min={280} gap={20} rowGap={28}>
            {live.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </AutoGrid>
        ) : (
          <SectionEmpty>Никто из ваших каналов сейчас не в эфире.</SectionEmpty>
        )}
      </Section>

      <Section id="following-channels" title="Все каналы" subtitle={offline.length > 0 ? `Не в сети: ${offline.length}` : undefined}>
        {followed.length > 0 ? (
          <AutoGrid min={260} gap={12}>
            {followed.map((item) => (
              <ChannelCard key={item.channel.slug} {...item} />
            ))}
          </AutoGrid>
        ) : (
          <SectionEmpty>Вы пока ни на кого не подписаны — найдите каналы в «Обзоре».</SectionEmpty>
        )}
      </Section>
    </PageShell>
  );
}
