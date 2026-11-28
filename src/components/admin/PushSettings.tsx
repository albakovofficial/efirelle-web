"use client";

import { useState } from "react";
import { Field } from "@/components/forms/Field/Field";
import { FormCard } from "@/components/forms/FormCard/FormCard";
import { Button } from "@/components/ui/Button/Button";
import { api } from "@/lib/api-client";
import { useSubmit } from "@/lib/useSubmit";
import type { PushStatus } from "@/types";
import styles from "./PushSettings.module.css";

/** Ключ APNs для уведомлений в приложении iOS. Вставляется один раз; сервер хранит его и не показывает. */
export function PushSettings({ status: initial }: { status: PushStatus }) {
  const [status, setStatus] = useState(initial);

  const save = useSubmit(async ({ keyId = "", teamId = "", privateKey = "" }) => {
    setStatus(await api.savePushKey({ keyId: keyId.trim().toUpperCase(), teamId: teamId.trim().toUpperCase(), privateKey }));
    return "Ключ сохранён — уведомления включены";
  });

  const test = useSubmit(async () => {
    const result = await api.testPush();
    if (result.devices === 0) return "К вашему аккаунту не привязан ни один iPhone — войдите в приложении и разрешите уведомления";
    return `Отправлено на устройства: ${result.sent} из ${result.devices}`;
  });

  return (
    <div className={styles.grid}>
      <FormCard
        title="Уведомления на iPhone"
        subtitle={
          status.configured
            ? `Работают. Ключ ${status.keyId}, команда ${status.teamId}. Чтобы заменить ключ, вставьте новый.`
            : "Не работают: нужен ключ APNs. Apple Developer → Certificates, Identifiers & Profiles → Keys → «+» → Apple Push Notifications service (APNs), скачайте файл .p8"
        }
        message={save.message}
        onSubmit={save.onSubmit}
      >
        <Field label="Key ID" name="keyId" defaultValue={status.keyId ?? ""} maxLength={10} required autoComplete="off" />
        <Field label="Team ID" name="teamId" defaultValue={status.teamId ?? ""} maxLength={10} required autoComplete="off" />
        <div className={styles.field}>
          <label htmlFor="push-key" className={styles.label}>
            Содержимое файла AuthKey_….p8
          </label>
          <textarea
            id="push-key"
            name="privateKey"
            required
            rows={6}
            spellCheck={false}
            autoComplete="off"
            placeholder="-----BEGIN PRIVATE KEY-----"
            className={styles.textarea}
          />
        </div>
        <Button type="submit" variant="dark" disabled={save.busy}>
          {save.busy ? "Сохраняем…" : "Сохранить ключ"}
        </Button>
      </FormCard>

      {status.configured && (
        <FormCard title="Проверка" subtitle="Пришлём уведомление на iPhone, где вы вошли в приложение" message={test.message} onSubmit={test.onSubmit}>
          <Button type="submit" disabled={test.busy}>
            Отправить проверочное уведомление
          </Button>
        </FormCard>
      )}
    </div>
  );
}
