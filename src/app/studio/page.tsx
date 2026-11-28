import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FollowingSidebar } from "@/components/layout/FollowingSidebar/FollowingSidebar";
import { PageShell } from "@/components/layout/PageShell/PageShell";
import { StudioPanel } from "@/components/studio/StudioPanel";
import { PageHeader } from "@/components/ui/PageHeader/PageHeader";
import { getAllCategories, getFollowingLive, getStudio } from "@/data/api";
import { loginHref } from "@/lib/routes";

export const metadata: Metadata = { title: "Студия", robots: { index: false } };

/** Студия автора: всё для эфира в одном месте. */
export default async function StudioPage() {
  const [studio, categories, following] = await Promise.all([getStudio(), getAllCategories(), getFollowingLive()]);
  if (!studio) redirect(loginHref("/studio"));

  return (
    <PageShell sidebar={<FollowingSidebar streams={following} />}>
      <PageHeader title="Студия" subtitle="Подключение, настройки эфира, прогнозы и модерация чата" />
      <StudioPanel studio={studio} categories={categories} />
    </PageShell>
  );
}
