import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon/Icon";
import { Thumbnail } from "@/components/ui/Thumbnail/Thumbnail";
import { formatCount, VIEWER_FORMS } from "@/lib/format";
import { categoryHref } from "@/lib/routes";
import type { Category } from "@/types";
import styles from "./CategoryCard.module.css";

/** Значок на обложке; новая категория без своего значка получает искру. */
const CATEGORY_ICONS: Record<string, IconName> = {
  talk: "chat",
  games: "gamepad",
  strategy: "crown",
  shooters: "crosshair",
  music: "music",
  art: "palette",
  food: "utensils",
  travel: "plane",
  education: "graduation",
  sport: "run",
};

/** Вертикальная обложка категории, как в Twitch: значок и название на обложке, под ней — зрители и группа. */
export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link href={categoryHref(category.id)} className={styles.card}>
      <Thumbnail tone={category.tone} ratio="3/4" radius="lg" className={styles.cover}>
        <span className={styles.icon}>
          <Icon name={CATEGORY_ICONS[category.id] ?? "spark"} size={34} />
        </span>
        <span className={styles.name}>{category.name}</span>
      </Thumbnail>
      {category.liveCount > 0 ? (
        <span className={styles.viewers}>
          <span className={styles.dot} aria-hidden="true" />
          {formatCount(category.viewers, VIEWER_FORMS)}
        </span>
      ) : (
        <span className={styles.offline}>Не в эфире</span>
      )}
      <span className={styles.group}>{category.group}</span>
    </Link>
  );
}
