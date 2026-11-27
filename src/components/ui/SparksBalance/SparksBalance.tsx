import { formatNumber } from "@/lib/format";
import { Icon } from "../Icon/Icon";
import styles from "./SparksBalance.module.css";

/** Баланс «искр» — внутренней валюты канала (ставки в прогнозах, награды). */
export function SparksBalance({ amount, withLabel = false }: { amount: number; withLabel?: boolean }) {
  return (
    <span className={styles.balance} aria-label={`Искры: ${formatNumber(amount)}`}>
      <Icon name="spark" size={16} className={styles.icon} />
      <span aria-hidden="true">
        {formatNumber(amount)}
        {withLabel && " искр"}
      </span>
    </span>
  );
}
