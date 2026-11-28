"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button/Button";
import { api } from "@/lib/api-client";
import { clipHref } from "@/lib/routes";
import styles from "./ClipButton.module.css";

/** «Клип»: сохраняет последние 30 секунд эфира. Файл готовится около полуминуты. */
export function ClipButton({ channelSlug }: { channelSlug: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ id?: string; error?: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const { clip } = await api.createClip(channelSlug, title.trim());
      setResult({ id: clip.id });
      setTitle("");
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Не получилось сделать клип" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={styles.root}>
      <Button
        variant="soft"
        icon="scissors"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          setResult(null);
        }}
      >
        Клип
      </Button>
      {open && (
        <div className={styles.popover}>
          {result?.id ? (
            <p className={styles.text}>
              Клип готовится — через полминуты он будет по ссылке:{" "}
              <Link href={clipHref(result.id)} className={styles.link}>
                открыть клип
              </Link>
            </p>
          ) : (
            <form onSubmit={submit} className={styles.form}>
              <label className={styles.text} htmlFor="clip-title">
                Сохраним последние 30 секунд эфира
              </label>
              <input
                id="clip-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={100}
                placeholder="Название клипа"
                autoFocus
                className={styles.input}
              />
              {result?.error && <p className={styles.error}>{result.error}</p>}
              <Button type="submit" variant="primary" size="sm" disabled={busy || !title.trim()}>
                {busy ? "Сохраняем…" : "Сделать клип"}
              </Button>
            </form>
          )}
        </div>
      )}
    </span>
  );
}
