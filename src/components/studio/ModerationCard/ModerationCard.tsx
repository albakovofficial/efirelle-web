"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon/Icon";
import { api } from "@/lib/api-client";
import { formatCount } from "@/lib/format";
import { SLOW_MODE_OPTIONS, type ModerationSettings } from "@/types";
import styles from "./ModerationCard.module.css";

const MESSAGE_FORMS = ["сообщение", "сообщения", "сообщений"] as const;

/**
 * «Сводка защиты»: сверху статус чата и сколько сообщений скрыто за эфир,
 * ниже — медленный режим, «только подписчики» и запрещённые слова. Изменения сохраняются сразу.
 */
export function ModerationCard({ initial }: { initial: ModerationSettings }) {
  const [settings, setSettings] = useState(initial);
  const [word, setWord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isProtected = settings.slowModeSeconds > 0 || settings.followersOnly || settings.blockedWords.length > 0;

  async function save(patch: Partial<Pick<ModerationSettings, "slowModeSeconds" | "followersOnly" | "blockedWords">>) {
    try {
      setSettings(await api.updateModeration(patch));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить");
    }
  }

  function addWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = word.trim().toLowerCase();
    if (next.length < 2 || settings.blockedWords.includes(next)) return;
    setWord("");
    void save({ blockedWords: [...settings.blockedWords, next] });
  }

  return (
    <section className={styles.card} aria-labelledby="moderation-title">
      <div className={styles.summary}>
        <span className={styles.summaryIcon}>
          <Icon name="shield" size={22} />
        </span>
        <span>
          <h2 id="moderation-title" className={styles.summaryTitle}>{isProtected ? "Чат защищён" : "Защита выключена"}</h2>
          <span className={styles.summaryText}>
            {settings.hiddenThisStream === 0
              ? "За эфир фильтр ничего не скрыл"
              : `За эфир скрыто ${formatCount(settings.hiddenThisStream, MESSAGE_FORMS, { compact: false })}`}
          </span>
        </span>
      </div>

      <div className={styles.rules}>
        <Rule icon="hourglass" title="Медленный режим" subtitle="Одно сообщение от зрителя раз в N секунд" on={settings.slowModeSeconds > 0}>
          <select
            className={styles.select}
            value={settings.slowModeSeconds}
            onChange={(event) => save({ slowModeSeconds: Number(event.target.value) })}
            aria-label="Медленный режим"
          >
            {SLOW_MODE_OPTIONS.map((seconds) => (
              <option key={seconds} value={seconds}>
                {seconds === 0 ? "Выкл" : `${seconds} с`}
              </option>
            ))}
          </select>
        </Rule>
        <Rule icon="heart" title="Только подписчики" subtitle="Остальные читают, но не пишут" on={settings.followersOnly}>
          <input
            type="checkbox"
            role="switch"
            className={styles.switch}
            checked={settings.followersOnly}
            onChange={(event) => save({ followersOnly: event.target.checked })}
            aria-label="Только подписчики"
          />
        </Rule>
        <Rule icon="filter" title="Запрещённые слова" subtitle="Сообщения с ними не попадут в чат; регистр и «ё» не важны" on={settings.blockedWords.length > 0} />
        <div className={styles.words}>
          {settings.blockedWords.map((item) => (
            <button
              key={item}
              type="button"
              className={styles.word}
              onClick={() => save({ blockedWords: settings.blockedWords.filter((w) => w !== item) })}
              aria-label={`Убрать «${item}»`}
            >
              {item}
              <Icon name="close" size={12} />
            </button>
          ))}
          <form onSubmit={addWord} className={styles.addWord}>
            <input
              value={word}
              onChange={(event) => setWord(event.target.value)}
              placeholder="Добавить слово"
              maxLength={40}
              className={styles.wordInput}
              aria-label="Новое запрещённое слово"
            />
          </form>
        </div>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function Rule({ icon, title, subtitle, on, children }: { icon: IconName; title: string; subtitle: string; on: boolean; children?: ReactNode }) {
  return (
    <div className={styles.rule}>
      <span className={`${styles.ruleIcon} ${on ? styles.ruleIconOn : ""}`}>
        <Icon name={icon} size={18} />
      </span>
      <span className={styles.ruleText}>
        <span className={styles.ruleTitle}>{title}</span>
        <span className={styles.ruleSubtitle}>{subtitle}</span>
      </span>
      {children}
    </div>
  );
}
