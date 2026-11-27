import type { ReactNode } from "react";
import styles from "./PageShell.module.css";

interface PageShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  /** Правая колонка (чат на странице эфира). */
  aside?: ReactNode;
  /** Плотная раскладка — меньше воздуха между блоками (страница эфира). */
  dense?: boolean;
}

/** Общая раскладка страниц: боковая панель, основная колонка, необязательная правая колонка. */
export function PageShell({ sidebar, children, aside, dense = false }: PageShellProps) {
  return (
    <div className={styles.shell}>
      {sidebar}
      <main className={`${styles.main} ${dense ? styles.dense : ""}`}>{children}</main>
      {aside}
    </div>
  );
}
