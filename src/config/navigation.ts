import type { IconName } from "@/components/ui/Icon/Icon";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

/** Разделы сайта. Используются в шапке и в нижней панели на телефоне. */
export const mainNav: NavItem[] = [
  { href: "/", label: "Главная", icon: "home" },
  { href: "/browse", label: "Обзор", icon: "grid" },
  { href: "/following", label: "Отслеживаемые", icon: "heart" },
];

/** Раздел активен, если путь совпадает или вложен в него (кроме корня). */
export function isNavActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
