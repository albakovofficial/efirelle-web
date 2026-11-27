import { Button } from "@/components/ui/Button/Button";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Здесь пока тихо</h1>
      <p className={styles.text}>Такой страницы или канала нет — возможно, эфир уже закончился.</p>
      <Button href="/" variant="dark" size="lg">На главную</Button>
    </main>
  );
}
