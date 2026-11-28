import { Button } from "@/components/ui/Button/Button";
import styles from "./GoLiveBanner.module.css";

/** Когда никто не в эфире: приглашение начать свой эфир из OBS или с iPhone. */
export function GoLiveBanner() {
  return (
    <section aria-labelledby="go-live" className={styles.banner}>
      <div className={styles.text}>
        <h2 id="go-live" className={styles.title}>Сейчас тихо</h2>
        <p className={styles.subtitle}>Начните эфир: из OBS по адресу и ключу из студии или прямо с камеры iPhone в приложении Efirelle.</p>
      </div>
      <Button href="/studio" variant="live" icon="play">
        В эфир
      </Button>
    </section>
  );
}
