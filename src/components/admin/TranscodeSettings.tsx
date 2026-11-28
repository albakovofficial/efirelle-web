"use client";

import { useState } from "react";
import { FormCard } from "@/components/forms/FormCard/FormCard";
import { api } from "@/lib/api-client";
import styles from "./PushSettings.module.css";

/** Переключатель перекодирования в 720p/480p. Каждый эфир кодируется ещё дважды — нужен запас процессора. */
export function TranscodeSettings({ enabled: initial }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      setEnabled((await api.setTranscode(next)).enabled);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.grid}>
      <FormCard
        as="div"
        title="Качество эфиров"
        subtitle="Зрители смогут выбрать 720p или 480p. Каждый эфир кодируется ещё дважды: на текущем сервере (2 ядра по 20%) потянет один-два эфира, для большего нужен сервер мощнее."
      >
        <label className={styles.toggle}>
          <input type="checkbox" role="switch" checked={enabled} disabled={busy} onChange={(event) => toggle(event.target.checked)} />
          <span>{enabled ? "Перекодирование включено — действует для новых эфиров" : "Перекодирование выключено"}</span>
        </label>
      </FormCard>
    </div>
  );
}
