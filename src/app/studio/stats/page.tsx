import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FollowingSidebar } from "@/components/layout/FollowingSidebar/FollowingSidebar";
import { PageShell } from "@/components/layout/PageShell/PageShell";
import { ChannelStatsView } from "@/components/stats/ChannelStatsView/ChannelStatsView";
import { PageHeader } from "@/components/ui/PageHeader/PageHeader";
import { getFollowingLive, getStudioStats } from "@/data/api";
import { loginHref } from "@/lib/routes";

export const metadata: Metadata = { title: "Статистика канала", robots: { index: false } };

/** Статистика своего канала: сводка за неделю и лента прошедших эфиров. */
export default async function StudioStatsPage() {
  const [stats, following] = await Promise.all([getStudioStats(), getFollowingLive()]);
  if (!stats) redirect(loginHref("/studio/stats"));

  return (
    <PageShell sidebar={<FollowingSidebar streams={following} />}>
      <PageHeader title="Статистика" subtitle="Эта неделя в сравнении с прошлой и все ваши эфиры" />
      <ChannelStatsView stats={stats} />
    </PageShell>
  );
}
