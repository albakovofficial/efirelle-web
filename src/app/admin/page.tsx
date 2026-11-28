import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PushSettings } from "@/components/admin/PushSettings";
import { ReportsQueue } from "@/components/admin/ReportsQueue";
import { TranscodeSettings } from "@/components/admin/TranscodeSettings";
import { FollowingSidebar } from "@/components/layout/FollowingSidebar/FollowingSidebar";
import { PageShell } from "@/components/layout/PageShell/PageShell";
import { PageHeader } from "@/components/ui/PageHeader/PageHeader";
import { getAdminReports, getFollowingLive, getPushStatus, getTranscode } from "@/data/api";

export const metadata: Metadata = { title: "Администрирование", robots: { index: false } };

/** Администрирование: уведомления на iPhone, качество эфиров и открытые жалобы. Только для администраторов, остальным — «не найдено». */
export default async function AdminPage() {
  const [reports, push, transcode, following] = await Promise.all([getAdminReports(), getPushStatus(), getTranscode(), getFollowingLive()]);
  if (!reports || !push || transcode === null) notFound();

  return (
    <PageShell sidebar={<FollowingSidebar streams={following} />}>
      <PageHeader title="Администрирование" subtitle={`Жалоб открыто: ${reports.length} — рассматривайте каждую в течение 24 часов`} />
      <PushSettings status={push} />
      <TranscodeSettings enabled={transcode} />
      <ReportsQueue reports={reports} />
    </PageShell>
  );
}
