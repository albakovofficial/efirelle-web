import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportsQueue } from "@/components/admin/ReportsQueue";
import { FollowingSidebar } from "@/components/layout/FollowingSidebar/FollowingSidebar";
import { PageShell } from "@/components/layout/PageShell/PageShell";
import { PageHeader } from "@/components/ui/PageHeader/PageHeader";
import { getAdminReports, getFollowingLive } from "@/data/api";

export const metadata: Metadata = { title: "Жалобы", robots: { index: false } };

/** Модерация: открытые жалобы. Только для администраторов, остальным — «не найдено». */
export default async function AdminPage() {
  const [reports, following] = await Promise.all([getAdminReports(), getFollowingLive()]);
  if (!reports) notFound();

  return (
    <PageShell sidebar={<FollowingSidebar streams={following} />}>
      <PageHeader title="Жалобы" subtitle={`Открыто: ${reports.length}. Рассматривайте каждую в течение 24 часов`} />
      <ReportsQueue reports={reports} />
    </PageShell>
  );
}
