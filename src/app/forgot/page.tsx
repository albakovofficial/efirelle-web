import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/AuthForms";
import { FormPage } from "@/components/forms/FormCard/FormCard";

export const metadata: Metadata = { title: "Восстановление пароля", robots: { index: false } };

export default function ForgotPage() {
  return (
    <FormPage>
      <ResetPasswordForm />
    </FormPage>
  );
}
