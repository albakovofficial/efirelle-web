import { Icon } from "@/components/ui/Icon/Icon";
import styles from "./Header.module.css";

/** Поле поиска. Отправляет GET-запрос на /search?q=… */
export function SearchField() {
  return (
    <form role="search" action="/search" className={styles.search}>
      <label htmlFor="site-search" className="visually-hidden">
        Поиск
      </label>
      <Icon name="search" size={18} />
      <input
        id="site-search"
        name="q"
        type="search"
        placeholder="Каналы, игры, моменты"
        autoComplete="off"
        className={styles.searchInput}
      />
    </form>
  );
}
