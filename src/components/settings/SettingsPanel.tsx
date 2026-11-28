"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/forms/Field/Field";
import { FormCard } from "@/components/forms/FormCard/FormCard";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Button } from "@/components/ui/Button/Button";
import { SparksBalance } from "@/components/ui/SparksBalance/SparksBalance";
import { api } from "@/lib/api-client";
import { channelHref } from "@/lib/routes";
import { useSubmit } from "@/lib/useSubmit";
import type { BlockedUser, Viewer } from "@/types";
import styles from "./SettingsPanel.module.css";

/** Профиль: данные аккаунта, скрытые пользователи, выход и удаление аккаунта. */
export function SettingsPanel({ viewer, blocked: initialBlocked }: { viewer: Viewer; blocked: BlockedUser[] }) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(initialBlocked);

  async function logout() {
    await api.logout().catch(() => undefined);
    router.replace("/");
    router.refresh();
  }

  async function unblock(user: BlockedUser) {
    await api.unblock(user.slug);
    setBlocked((current) => current.filter((item) => item.id !== user.id));
  }

  const deletion = useSubmit(async ({ password = "" }) => {
    await api.deleteAccount(password);
    router.replace("/");
    router.refresh();
  });

  return (
    <div className={styles.grid}>
      <FormCard as="div" title="Аккаунт">
        <div className={styles.profile}>
          <Avatar initials={viewer.initials} tone={viewer.tone} size="xl" />
          <div className={styles.who}>
            <strong>{viewer.displayName}</strong>
            <span>@{viewer.username} · {viewer.email}</span>
            <SparksBalance amount={viewer.sparks} withLabel />
          </div>
        </div>
        <div className={styles.actions}>
          <Button href={channelHref(viewer.username)}>Мой канал</Button>
          <Button href="/studio">Студия</Button>
          {viewer.role === "admin" && <Button href="/admin">Администрирование</Button>}
          <Button variant="ghost" onClick={logout}>
            Выйти
          </Button>
        </div>
      </FormCard>

      <FormCard as="div" title="Скрытые пользователи" subtitle="Их сообщения в чатах вам не показываются">
        {blocked.length === 0 ? (
          <p className={styles.muted}>Вы никого не скрывали</p>
        ) : (
          <ul className={styles.list}>
            {blocked.map((user) => (
              <li key={user.id} className={styles.row}>
                <Link href={channelHref(user.slug)}>{user.name}</Link>
                <Button size="sm" onClick={() => unblock(user)}>
                  Вернуть
                </Button>
              </li>
            ))}
          </ul>
        )}
      </FormCard>

      <FormCard
        title="Удаление аккаунта"
        subtitle="Аккаунт, канал, сообщения и подписки удалятся навсегда. Отменить это нельзя"
        message={deletion.message}
        onSubmit={deletion.onSubmit}
      >
        <Field label="Пароль для подтверждения" name="password" type="password" autoComplete="current-password" required />
        <Button type="submit" variant="secondary" disabled={deletion.busy} className={styles.danger}>
          {deletion.busy ? "Удаляем…" : "Удалить аккаунт навсегда"}
        </Button>
      </FormCard>
    </div>
  );
}
