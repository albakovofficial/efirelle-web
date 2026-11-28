import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PushSettings } from "@/components/admin/PushSettings";
import { ReportsQueue } from "@/components/admin/ReportsQueue";
import { FollowingSidebar } from "@/components/layout/FollowingSidebar/FollowingSidebar";
import { PageShell } from "@/components/layout/PageShell/PageShell";
import { PageHeader } from "@/components/ui/PageHeader/PageHeader";
import { getAdminReports, getFollowingLive, getPushStatus } from "@/data/api";

export const metadata: Metadata = { title: "Администрирование", robots: { index: false } };

/** Администрирование: уведомления на iPhone и открытые жалобы. Только для администраторов, остальным — «не найдено». */
export default async function AdminPage() {
  const [reports, push, following] = await Promise.all([getAdminReports(), getPushStatus(), getFollowingLive()]);
  if (!reports || !push) notFound();

  return (
    <PageShell sidebar={<FollowingSidebar streams={following} />}>
      <PageHeader title="Администрирование" subtitle={`Жалоб открыто: ${reports.length} — рассматривайте каждую в течение 24 часов`} />
      <PushSettings status={push} />
      <ReportsQueue reports={reports} />
    </PageShell>
  );
}
