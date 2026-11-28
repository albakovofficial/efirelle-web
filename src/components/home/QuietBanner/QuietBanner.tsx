import styles from "./QuietBanner.module.css";

/** Когда никто не в эфире: спокойная карточка с «дышащими» полосками уровня звука из логотипа. */
export function QuietBanner() {
  return (
    <section aria-labelledby="quiet" className={styles.banner}>
      <span className={styles.bars} aria-hidden="true">
        <span className={styles.bar} />
        <span className={`${styles.bar} ${styles.wave}`} />
        <span className={styles.bar} />
      </span>
      <span className={styles.text}>
        <h2 id="quiet" className={styles.title}>Эфиров сейчас нет</h2>
        <p className={styles.subtitle}>Пришлём уведомление, когда ваши стримеры начнут трансляцию</p>
      </span>
    </section>
  );
}
