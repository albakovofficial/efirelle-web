import Link from "next/link";
import { contacts } from "@/config/contacts";
import styles from "./Footer.module.css";

const links = [
  { href: "/rules", label: "Правила сообщества" },
  { href: "/privacy", label: "Конфиденциальность" },
  { href: "/support", label: "Поддержка" },
];

/** Подвал сайта: правовые страницы и контакты. */
export function Footer() {
  return (
    <footer className={styles.footer}>
      <nav aria-label="Информация" className={styles.links}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={styles.link}>
            {link.label}
          </Link>
        ))}
      </nav>
      <p className={styles.meta}>
        © {new Date().getFullYear()} Efirelle ·{" "}
        <a href={`mailto:${contacts.info}`} className={styles.link}>
          {contacts.info}
        </a>
      </p>
    </footer>
  );
}
