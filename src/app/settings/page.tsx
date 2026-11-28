import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FollowingSidebar } from "@/components/layout/FollowingSidebar/FollowingSidebar";
import { PageShell } from "@/components/layout/PageShell/PageShell";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { PageHeader } from "@/components/ui/PageHeader/PageHeader";
import { getBlockedUsers, getCurrentViewer, getFollowingLive } from "@/data/api";
import { loginHref } from "@/lib/routes";

export const metadata: Metadata = { title: "Профиль", robots: { index: false } };

export default async function SettingsPage() {
  const viewer = await getCurrentViewer();
  if (!viewer) redirect(loginHref("/settings"));
  const [blocked, following] = await Promise.all([getBlockedUsers(), getFollowingLive()]);

  return (
    <PageShell sidebar={<FollowingSidebar streams={following} />}>
      <PageHeader title="Профиль" subtitle="Аккаунт, скрытые пользователи и удаление аккаунта" />
      <SettingsPanel viewer={viewer} blocked={blocked} />
    </PageShell>
  );
}
