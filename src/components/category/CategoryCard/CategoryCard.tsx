import Link from "next/link";
import { Thumbnail } from "@/components/ui/Thumbnail/Thumbnail";
import { formatCount, VIEWER_FORMS } from "@/lib/format";
import { categoryHref } from "@/lib/routes";
import type { Category } from "@/types";
import styles from "./CategoryCard.module.css";

/** Вертикальная обложка категории с числом зрителей. */
export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link href={categoryHref(category.id)} className={styles.card}>
      <Thumbnail tone={category.tone} ratio="3/4" radius="lg" className={styles.cover}>
        <span className={styles.name}>{category.name}</span>
      </Thumbnail>
      <span className={styles.viewers}>{formatCount(category.viewers, VIEWER_FORMS)}</span>
      <span className={styles.group}>{category.group}</span>
    </Link>
  );
}
