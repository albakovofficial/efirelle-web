"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import { api } from "@/lib/api-client";
import { SLOW_MODE_OPTIONS, type ChatRules } from "@/types";
import styles from "./ChatShield.module.css";

/** «Щит» автора над полем ввода: медленный режим и «только подписчики» не уходя из эфира. */
export function ChatShield({ rules, onChange }: { rules: ChatRules; onChange: (rules: ChatRules) => void }) {
  const [busy, setBusy] = useState(false);

  async function update(patch: Partial<ChatRules>) {
    setBusy(true);
    try {
      const settings = await api.updateModeration(patch);
      onChange({ slowModeSeconds: settings.slowModeSeconds, followersOnly: settings.followersOnly });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.bar} aria-label="Защита чата">
      <span className={`${styles.chip} ${styles.dark}`}>
        <Icon name="shield" size={15} />
        Щит
      </span>
      <label className={`${styles.chip} ${rules.slowModeSeconds > 0 ? styles.on : ""}`}>
        <Icon name="hourglass" size={15} />
        <span className="visually-hidden">Медленный режим</span>
        <select
          className={styles.select}
          value={rules.slowModeSeconds}
          disabled={busy}
          onChange={(event) => update({ slowModeSeconds: Number(event.target.value) })}
        >
          {SLOW_MODE_OPTIONS.map((seconds) => (
            <option key={seconds} value={seconds}>
              {seconds === 0 ? "Медленно: выкл" : `Раз в ${seconds} с`}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className={`${styles.chip} ${rules.followersOnly ? styles.on : ""}`}
        aria-pressed={rules.followersOnly}
        disabled={busy}
        onClick={() => update({ followersOnly: !rules.followersOnly })}
      >
        <Icon name="heart" size={15} />
        Подписчики
      </button>
    </div>
  );
}
