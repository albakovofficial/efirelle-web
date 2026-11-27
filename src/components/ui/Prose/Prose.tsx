import type { ReactNode } from "react";
import styles from "./Prose.module.css";

/** Текстовые страницы (правила, политика): читаемая ширина строки и отступы для h2, p, ul. */
export function Prose({ children }: { children: ReactNode }) {
  return <article className={styles.prose}>{children}</article>;
}
