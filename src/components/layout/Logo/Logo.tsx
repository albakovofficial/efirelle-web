import Link from "next/link";
import styles from "./Logo.module.css";

/** Логотип Efirelle: двойная «ll» нарисована как индикатор громкости. */
export function Logo() {
  return (
    <Link href="/" className={styles.logo} aria-label="Efirelle — на главную">
      <span className={styles.word} aria-hidden="true">
        efire
        <span className={`${styles.bar} ${styles.barTall}`} />
        <span className={`${styles.bar} ${styles.barShort}`} />e
      </span>
    </Link>
  );
}
