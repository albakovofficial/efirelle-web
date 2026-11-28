import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/AuthForms";
import { FormPage } from "@/components/forms/FormCard/FormCard";
import { getCurrentViewer } from "@/data/api";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Регистрация", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentViewer()) redirect(next);
  return (
    <FormPage>
      <RegisterForm next={next} />
    </FormPage>
  );
}
