import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./Section.module.css";

interface SectionProps {
  /** id заголовка — секция ссылается на него через aria-labelledby. */
  id: string;
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
  /** Элементы справа от заголовка (например, фильтры). */
  aside?: ReactNode;
  size?: "md" | "sm";
  children: ReactNode;
}

/** Смысловой блок страницы: заголовок с действиями и содержимое с единым отступом. */
export function Section({ id, title, subtitle, action, aside, size = "md", children }: SectionProps) {
  return (
    <section aria-labelledby={id} className={styles.section}>
      <div className={styles.header}>
        <div className={styles.titles}>
          <h2 id={id} className={`${styles.title} ${styles[size]}`}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {action && (
          <Link href={action.href} className={styles.action}>
            {action.label}
          </Link>
        )}
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Сообщение-заглушка, когда в секции нечего показать. */
export function SectionEmpty({ children }: { children: ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}
