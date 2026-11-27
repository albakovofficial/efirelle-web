"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, mainNav } from "@/config/navigation";
import styles from "./Header.module.css";

/** Навигация в шапке. Клиентская только ради подсветки текущего раздела. */
export function MainNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Основная навигация" className={styles.nav}>
      {mainNav.map((item) => {
        const active = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
