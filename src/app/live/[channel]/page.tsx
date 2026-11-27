import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatPanel } from "@/components/chat/ChatPanel/ChatPanel";
import { FollowingSidebar } from "@/components/layout/FollowingSidebar/FollowingSidebar";
import { PageShell } from "@/components/layout/PageShell/PageShell";
import { ChannelBar } from "@/components/watch/ChannelBar/ChannelBar";
import { StreamStage } from "@/components/watch/StreamStage/StreamStage";
import {
  getActivePrediction,
  getChatHistory,
  getCurrentViewer,
  getFollowingLive,
  getStreamByChannel,
  getStreamMarkers,
} from "@/data/api";

interface WatchPageProps {
  params: Promise<{ channel: string }>;
}

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { channel } = await params;
  const stream = await getStreamByChannel(channel);
  if (!stream) return { title: "Канал не найден" };
  return { title: `${stream.channel.name} — ${stream.title}`, description: `${stream.category} · в эфире на Efirelle` };
}

/** Страница эфира: плеер с перемоткой и моментами, информация о канале, чат. */
export default async function WatchPage({ params }: WatchPageProps) {
  const { channel } = await params;
  const stream = await getStreamByChannel(channel);
  if (!stream) notFound();

  const [markers, chat, prediction, following, viewer] = await Promise.all([
    getStreamMarkers(channel),
    getChatHistory(stream.id),
    getActivePrediction(stream.id),
    getFollowingLive(),
    getCurrentViewer(),
  ]);

  return (
    <PageShell
      dense
      sidebar={<FollowingSidebar streams={following} defaultCollapsed activeSlug={channel} />}
      aside={<ChatPanel initialEntries={chat} prediction={prediction} viewer={viewer} />}
    >
      <StreamStage stream={stream} markers={markers}>
        <ChannelBar stream={stream} />
      </StreamStage>
    </PageShell>
  );
}
