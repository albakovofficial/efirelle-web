"use client";

import { useState, type FormEvent } from "react";

type Message = { tone: "error" | "success"; text: string } | null;

/**
 * Отправка формы: собирает поля в объект, блокирует повторную отправку,
 * превращает ошибку API в сообщение для пользователя.
 */
export function useSubmit(action: (fields: Record<string, string>) => Promise<string | void>) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const fields = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
    setBusy(true);
    setMessage(null);
    try {
      const success = await action(fields);
      if (success) setMessage({ tone: "success", text: success });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Не получилось. Попробуйте ещё раз" });
    } finally {
      setBusy(false);
    }
  }

  return { busy, message, setMessage, onSubmit };
}
