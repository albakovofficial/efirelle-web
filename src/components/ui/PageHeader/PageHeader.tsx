import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** Надзаголовок: раздел или группа («Обзор», «Игры»). */
  eyebrow?: string;
  /** Элемент слева от заголовка — обложка категории, аватар. */
  media?: ReactNode;
  /** Элементы справа — кнопки, переключатели. */
  aside?: ReactNode;
}

/** Заголовок страницы (h1). Один на страницу; внутри страницы блоки — через Section. */
export function PageHeader({ title, subtitle, eyebrow, media, aside }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      {media && <div className={styles.media}>{media}</div>}
      <div className={styles.titles}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {aside && <div className={styles.aside}>{aside}</div>}
    </header>
  );
}
