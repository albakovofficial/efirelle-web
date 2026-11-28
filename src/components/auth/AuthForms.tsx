"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/forms/Field/Field";
import { FormCard } from "@/components/forms/FormCard/FormCard";
import { Button } from "@/components/ui/Button/Button";
import { contacts } from "@/config/contacts";
import { api, ApiError } from "@/lib/api-client";
import { useSubmit } from "@/lib/useSubmit";
import styles from "./AuthForms.module.css";

/** После входа: на страницу, с которой пришли, и с новыми данными (шапка, подписки). */
function useFinishAuth(next: string) {
  const router = useRouter();
  return () => {
    router.replace(next);
    router.refresh();
  };
}

export function LoginForm({ next }: { next: string }) {
  const finish = useFinishAuth(next);
  const { busy, message, onSubmit } = useSubmit(async ({ email = "", password = "" }) => {
    await api.login({ email, password });
    finish();
  });

  return (
    <FormCard
      title="Вход"
      subtitle="Войдите, чтобы писать в чат, отслеживать каналы и вести эфиры"
      message={message}
      onSubmit={onSubmit}
      footer={
        <>
          <Link href={`/register?next=${encodeURIComponent(next)}`}>Создать аккаунт</Link>
          <Link href="/forgot">Забыли пароль?</Link>
        </>
      }
    >
      <Field label="Почта" name="email" type="email" autoComplete="email" required />
      <Field label="Пароль" name="password" type="password" autoComplete="current-password" required />
      <Button type="submit" variant="dark" size="lg" disabled={busy}>
        {busy ? "Входим…" : "Войти"}
      </Button>
    </FormCard>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const finish = useFinishAuth(next);
  const { busy, message, onSubmit } = useSubmit(async ({ displayName = "", username = "", email = "", password = "", agree }) => {
    if (!agree) throw new Error("Чтобы создать аккаунт, примите правила сообщества");
    await api.register({ displayName, username: username.toLowerCase(), email, password });
    finish();
  });

  return (
    <FormCard
      title="Регистрация"
      subtitle="Аккаунт бесплатный. Канал для эфиров создаётся сразу"
      message={message}
      onSubmit={onSubmit}
      footer={<Link href={`/login?next=${encodeURIComponent(next)}`}>Уже есть аккаунт? Войти</Link>}
    >
      <Field label="Имя" name="displayName" autoComplete="nickname" maxLength={40} required hint="Так вас увидят в чате" />
      <Field
        label="Адрес канала"
        name="username"
        autoComplete="username"
        minLength={3}
        maxLength={24}
        pattern="[a-zA-Z0-9_]{3,24}"
        required
        hint="Латиница, цифры и «_», от 3 до 24 знаков: efirelle.ru/live/адрес"
      />
      <Field label="Почта" name="email" type="email" autoComplete="email" required />
      <Field label="Пароль" name="password" type="password" autoComplete="new-password" minLength={8} required hint="Не меньше 8 знаков" />
      <label className={styles.agree}>
        <input type="checkbox" name="agree" value="1" />
        <span>
          Принимаю <Link href="/rules">правила сообщества</Link> и <Link href="/privacy">политику конфиденциальности</Link>. На
          Efirelle нет места оскорблениям и недопустимому контенту — за нарушения аккаунт блокируется.
        </span>
      </label>
      <Button type="submit" variant="dark" size="lg" disabled={busy}>
        {busy ? "Создаём…" : "Создать аккаунт"}
      </Button>
    </FormCard>
  );
}

/** Восстановление пароля: почта → код из письма и новый пароль. */
export function ResetPasswordForm() {
  const finish = useFinishAuth("/");
  const [email, setEmail] = useState<string | null>(null);

  const request = useSubmit(async ({ email: value = "" }) => {
    try {
      await api.forgotPassword(value);
    } catch (error) {
      if (error instanceof ApiError && error.code === "mail_disabled") {
        throw new Error(`Восстановление по почте временно недоступно. Напишите нам: ${contacts.support}`);
      }
      throw error;
    }
    setEmail(value);
  });

  const reset = useSubmit(async ({ code = "", password = "" }) => {
    await api.resetPassword({ email: email ?? "", code: code.trim(), password });
    finish();
  });

  if (email === null) {
    return (
      <FormCard
        title="Восстановление пароля"
        subtitle="Пришлём код на почту, указанную при регистрации"
        message={request.message}
        onSubmit={request.onSubmit}
        footer={<Link href="/login">Вспомнили пароль? Войти</Link>}
      >
        <Field label="Почта" name="email" type="email" autoComplete="email" required />
        <Button type="submit" variant="dark" size="lg" disabled={request.busy}>
          {request.busy ? "Отправляем…" : "Получить код"}
        </Button>
      </FormCard>
    );
  }

  return (
    <FormCard
      title="Новый пароль"
      subtitle={`Если аккаунт с почтой ${email} есть, мы отправили на неё код. Он действует 30 минут`}
      message={reset.message}
      onSubmit={reset.onSubmit}
      footer={
        <button type="button" className={styles.linkButton} onClick={() => setEmail(null)}>
          Другая почта
        </button>
      }
    >
      <Field label="Код из письма" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
      <Field label="Новый пароль" name="password" type="password" autoComplete="new-password" minLength={8} required hint="Не меньше 8 знаков" />
      <Button type="submit" variant="dark" size="lg" disabled={reset.busy}>
        {reset.busy ? "Сохраняем…" : "Сохранить и войти"}
      </Button>
    </FormCard>
  );
}
