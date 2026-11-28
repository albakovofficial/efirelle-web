import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/AuthForms";
import { FormPage } from "@/components/forms/FormCard/FormCard";
import { getCurrentViewer } from "@/data/api";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Вход", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentViewer()) redirect(next);
  return (
    <FormPage>
      <LoginForm next={next} />
    </FormPage>
  );
}
