"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon/Icon";
import { isNavActive, mainNav } from "@/config/navigation";
import styles from "./MobileNav.module.css";

/** Плавающая нижняя панель — только на телефоне. Кнопка эфира в центре. */
export function MobileNav() {
  const pathname = usePathname();
  const [first, ...rest] = mainNav;
  const renderLink = (item: (typeof mainNav)[number]) => {
    const active = isNavActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={`${styles.item} ${active ? styles.active : ""}`}
      >
        <Icon name={item.icon} size={22} />
      </Link>
    );
  };

  return (
    <nav aria-label="Нижняя навигация" className={styles.bar}>
      {first && renderLink(first)}
      <button type="button" aria-label="Начать эфир" className={styles.goLive}>
        <Icon name="plus" size={20} />
      </button>
      {rest.map(renderLink)}
    </nav>
  );
}
