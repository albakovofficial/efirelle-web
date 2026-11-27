import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader/PageHeader";
import { Prose } from "@/components/ui/Prose/Prose";
import styles from "./TextPage.module.css";

interface TextPageProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Каркас текстовой страницы (правила, политика, поддержка): без боковой панели, текст по центру. */
export function TextPage({ title, subtitle, children }: TextPageProps) {
  return (
    <main className={styles.page}>
      <PageHeader title={title} subtitle={subtitle} />
      <Prose>{children}</Prose>
    </main>
  );
}
