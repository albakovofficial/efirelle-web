import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Button } from "@/components/ui/Button/Button";
import { SparksBalance } from "@/components/ui/SparksBalance/SparksBalance";
import type { Viewer } from "@/types";
import { Logo } from "../Logo/Logo";
import { MainNav } from "./MainNav";
import { SearchField } from "./SearchField";
import styles from "./Header.module.css";

/** Шапка: навигация, поиск; для вошедшего — искры, студия и профиль, иначе — вход. */
export function Header({ viewer }: { viewer: Viewer | null }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Logo />
        <MainNav />
        <SearchField />
        <div className={styles.actions}>
          <Button icon="search" aria-label="Поиск" href="/search" className={styles.mobileOnly} />
          {viewer ? (
            <>
              <span className={styles.sparks}>
                <SparksBalance amount={viewer.sparks} withLabel />
              </span>
              <Button href="/studio" variant="dark" className={styles.desktopOnly}>
                <span className={styles.liveDot} aria-hidden="true" />
                В эфир
              </Button>
              <Link href="/settings" aria-label={`Профиль: ${viewer.displayName}`}>
                <Avatar initials={viewer.initials} tone={viewer.tone} imageUrl={viewer.avatarUrl} size="lg" shape="rounded" />
              </Link>
            </>
          ) : (
            <>
              <Button href="/login" className={styles.desktopOnly}>
                Войти
              </Button>
              <Button href="/register" variant="dark">
                Регистрация
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
