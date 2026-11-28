import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatPanel } from "@/components/chat/ChatPanel/ChatPanel";
import { FollowingSidebar } from "@/components/layout/FollowingSidebar/FollowingSidebar";
import { PageShell } from "@/components/layout/PageShell/PageShell";
import { ChannelBar } from "@/components/watch/ChannelBar/ChannelBar";
import { StreamStage } from "@/components/watch/StreamStage/StreamStage";
import { WatchRoomProvider } from "@/components/watch/WatchRoom/WatchRoom";
import { getChannelWatch, getCurrentViewer, getFollowingLive } from "@/data/api";

interface WatchPageProps {
  params: Promise<{ channel: string }>;
}

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const watch = await getChannelWatch((await params).channel);
  if (!watch) return { title: "Канал не найден" };
  const { channel, stream } = watch;
  return stream
    ? { title: `${channel.name} — ${stream.title}`, description: `${stream.category} · в эфире на Efirelle` }
    : { title: channel.name, description: `Канал ${channel.name} на Efirelle` };
}

/** Страница канала: эфир с чатом или заставка «не в сети». */
export default async function WatchPage({ params }: WatchPageProps) {
  const { channel } = await params;
  const [watch, viewer, following] = await Promise.all([getChannelWatch(channel), getCurrentViewer(), getFollowingLive()]);
  if (!watch) notFound();

  return (
    <WatchRoomProvider watch={watch} viewer={viewer}>
      <PageShell
        dense
        sidebar={<FollowingSidebar streams={following} defaultCollapsed activeSlug={watch.channel.slug} />}
        aside={<ChatPanel />}
      >
        <StreamStage>
          <ChannelBar />
        </StreamStage>
      </PageShell>
    </WatchRoomProvider>
  );
}
