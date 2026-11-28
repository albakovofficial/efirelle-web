import type { FormEvent, ReactNode } from "react";
import styles from "./FormCard.module.css";

interface FormCardProps {
  title: string;
  subtitle?: ReactNode;
  /** Ошибка или итог отправки — показывается над кнопкой. */
  message?: { tone: "error" | "success"; text: string } | null;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  children?: ReactNode;
  /** Ссылки под формой («Нет аккаунта? Зарегистрироваться»). */
  footer?: ReactNode;
  as?: "form" | "div";
}

/** Карточка с формой: заголовок, поля, сообщение, кнопки, ссылки под ней. */
export function FormCard({ title, subtitle, message, onSubmit, children, footer, as = "form" }: FormCardProps) {
  const body = (
    <>
      <div className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {children}
      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={`${styles.message} ${styles[message.tone]}`}>
          {message.text}
        </p>
      )}
      {footer && <div className={styles.footer}>{footer}</div>}
    </>
  );
  return as === "form" ? (
    <form className={styles.card} onSubmit={onSubmit} noValidate>
      {body}
    </form>
  ) : (
    <div className={styles.card}>{body}</div>
  );
}

/** Узкая колонка по центру — для страниц входа и регистрации. */
export function FormPage({ children }: { children: ReactNode }) {
  return <main className={styles.page}>{children}</main>;
}
