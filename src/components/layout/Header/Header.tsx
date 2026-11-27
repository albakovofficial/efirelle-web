import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Button } from "@/components/ui/Button/Button";
import { SparksBalance } from "@/components/ui/SparksBalance/SparksBalance";
import type { Viewer } from "@/types";
import { Logo } from "../Logo/Logo";
import { MainNav } from "./MainNav";
import { SearchField } from "./SearchField";
import styles from "./Header.module.css";

export function Header({ viewer }: { viewer: Viewer }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Logo />
        <MainNav />
        <SearchField />
        <div className={styles.actions}>
          <span className={styles.sparks}>
            <SparksBalance amount={viewer.sparks} withLabel />
          </span>
          <Button icon="search" aria-label="Поиск" href="/search" className={styles.mobileOnly} />
          <Button icon="bell" aria-label="Уведомления" />
          <Button variant="dark" className={styles.desktopOnly}>
            <span className={styles.liveDot} aria-hidden="true" />
            В эфир
          </Button>
          <Avatar initials={viewer.initials} tone={viewer.tone} size="lg" shape="rounded" label={`Профиль: ${viewer.name}`} />
        </div>
      </div>
    </header>
  );
}
