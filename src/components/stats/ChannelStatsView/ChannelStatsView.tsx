import { formatCount, formatDuration, formatNumber } from "@/lib/format";
import type { ChannelStats } from "@/types";
import styles from "./ChannelStatsView.module.css";

const SUBSCRIBER_FORMS = ["подписчик", "подписчика", "подписчиков"] as const;
const DATE = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "Europe/Moscow" });

/** Изменение к прошлой неделе: «+18% к прошлой неделе»; `null`, если сравнивать не с чем. */
function change(week: number, previous: number): string | null {
  if (week === 0 && previous === 0) return null;
  if (previous === 0) return "впервые на этой неделе";
  const percent = Math.round(((week - previous) / previous) * 100);
  if (percent === 0) return "как на прошлой неделе";
  return `${percent > 0 ? "+" : "−"}${Math.abs(percent)}% к прошлой неделе`;
}

/** Статистика канала: «Сводка» — четыре цифры и график последнего эфира, ниже «Лента эфиров». */
export function ChannelStatsView({ stats }: { stats: ChannelStats }) {
  const { summary, streams } = stats;
  const [last] = streams;
  return (
    <div className={styles.page}>
      <div className={styles.tiles}>
        <Metric title="Средне зрителей" value={formatNumber(summary.avgViewers.week)} note={change(summary.avgViewers.week, summary.avgViewers.previousWeek)} />
        <Metric
          title="Рекорд зрителей"
          value={formatNumber(summary.peak.viewers)}
          note={summary.peak.at ? DATE.format(new Date(summary.peak.at)) : null}
        />
        <Metric
          title="Новых подписчиков"
          value={`+${formatNumber(summary.newFollowers.week)}`}
          note={`всего ${formatCount(summary.followers, SUBSCRIBER_FORMS, { compact: false })}`}
        />
        <Metric
          title="Часов в эфире"
          value={summary.hoursLive.week.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}
          note={change(summary.hoursLive.week, summary.hoursLive.previousWeek) ?? "за 7 дней"}
        />
      </div>

      {last && last.points.length > 1 && (
        <section className={styles.card} aria-label="Зрители последнего эфира">
          <span className={styles.caption}>Последний эфир · зрители</span>
          <ViewersChart points={last.points} className={styles.chart} />
        </section>
      )}

      <h2 className={styles.heading}>Эфиры</h2>
      {streams.length === 0 ? (
        <section className={`${styles.card} ${styles.empty}`}>
          <svg viewBox="0 0 300 56" className={styles.ghost} aria-hidden="true">
            <polyline points="0,48 43,40 86,43 129,29 172,34 215,20 258,25 300,8" />
          </svg>
          <h3 className={styles.emptyTitle}>Пока нечего сравнивать</h3>
          <p className={styles.emptyText}>
            Каждый эфир будет сохраняться здесь с графиком зрителей, пиком и новыми подписчиками — и вы увидите, какой прошёл лучше.
          </p>
        </section>
      ) : (
        <ul className={styles.streams}>
          {streams.map((stream) => (
            <li key={stream.id} className={styles.stream}>
              <span className={styles.streamText}>
                <span className={styles.streamTitle}>{stream.title || "Эфир без названия"}</span>
                <span className={styles.streamMeta}>
                  {DATE.format(new Date(stream.startedAt))} · {formatDuration(stream.durationSeconds)} · пик {stream.peakViewers} · в среднем{" "}
                  {stream.avgViewers} · +{formatCount(stream.newFollowers, SUBSCRIBER_FORMS, { compact: false })}
                </span>
              </span>
              {stream.points.length > 1 && <ViewersChart points={stream.points} className={styles.spark} compact />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Metric({ title, value, note }: { title: string; value: string; note: string | null }) {
  const tone = note?.startsWith("−") ? styles.down : note?.startsWith("+") ? styles.up : "";
  return (
    <div className={styles.metric}>
      <span className={styles.caption}>{title}</span>
      <span className={styles.value}>{value}</span>
      {note && <span className={`${styles.note} ${tone}`}>{note}</span>}
    </div>
  );
}

/** Линия зрителей по ходу эфира; в полном размере — с мягкой заливкой. */
function ViewersChart({ points, className, compact = false }: { points: number[]; className: string; compact?: boolean }) {
  const width = 300;
  const height = compact ? 40 : 120;
  const max = Math.max(1, ...points);
  const coords = points.map((value, index) => [
    (index / (points.length - 1)) * width,
    height - 4 - (value / max) * (height - 8),
  ]);
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={className} role="img" aria-label={`Зрители: от ${Math.min(...points)} до ${max}`}>
      {!compact && <polygon points={`0,${height} ${line} ${width},${height}`} className={styles.area} />}
      <polyline points={line} className={styles.line} />
    </svg>
  );
}
