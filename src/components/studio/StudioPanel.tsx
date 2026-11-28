"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/forms/Field/Field";
import { FormCard } from "@/components/forms/FormCard/FormCard";
import { Button } from "@/components/ui/Button/Button";
import { api } from "@/lib/api-client";
import { formatCount, formatDuration, VIEWER_FORMS } from "@/lib/format";
import { channelHref } from "@/lib/routes";
import { useSubmit } from "@/lib/useSubmit";
import type { Category, Studio } from "@/types";
import { AppearanceCard, EmotesCard, ScheduleStudioCard } from "./StudioChannelCards";
import styles from "./StudioPanel.module.css";

const PREDICTION_DURATIONS = [
  { seconds: 60, label: "1 минута" },
  { seconds: 120, label: "2 минуты" },
  { seconds: 300, label: "5 минут" },
  { seconds: 600, label: "10 минут" },
];

/** Студия автора: подключение OBS, настройки и оформление, расписание, прогнозы, моменты, рейд, эмодзи, баны. */
export function StudioPanel({ studio, categories }: { studio: Studio; categories: Category[] }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const { channel, stream } = studio;

  return (
    <div className={styles.grid}>
      <FormCard
        as="div"
        title={stream ? "Вы в эфире" : "Эфир не идёт"}
        subtitle={
          stream
            ? `${formatCount(stream.viewers, VIEWER_FORMS, { compact: false })} · идёт ${formatDuration(stream.durationSeconds)}`
            : "Эфир начнётся сам, как только OBS начнёт трансляцию с вашим ключом"
        }
      >
        <div className={styles.actions}>
          <Button href={channelHref(channel.slug)} variant="dark">
            Открыть мой канал
          </Button>
        </div>
      </FormCard>

      <IngestCard ingest={studio.ingest} />
      <SettingsCard settings={studio.settings} categories={categories} onSaved={refresh} />
      <AppearanceCard studio={studio} onChange={refresh} />
      <ScheduleStudioCard studio={studio} categories={categories} onChange={refresh} />
      <PredictionCardStudio studio={studio} onChange={refresh} />
      {stream && <LiveToolsCard />}
      <EmotesCard studio={studio} onChange={refresh} />
      <BansCard bans={studio.bans} onChange={refresh} />
    </div>
  );
}

function IngestCard({ ingest }: { ingest: Studio["ingest"] }) {
  const [streamKey, setStreamKey] = useState(ingest.streamKey);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value).catch(() => undefined);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  async function rotate() {
    if (!window.confirm("Создать новый ключ? Старый перестанет работать — его нужно будет заменить в OBS.")) return;
    setStreamKey((await api.rotateStreamKey()).streamKey);
    setVisible(true);
  }

  return (
    <FormCard
      as="div"
      title="Подключение OBS"
      subtitle="OBS → Настройки → Трансляция: сервис «Настраиваемый», вставьте сервер и ключ. Ключ никому не показывайте"
    >
      <div className={styles.secret}>
        <span className={styles.secretLabel}>Сервер</span>
        <code className={styles.code}>{ingest.server}</code>
        <Button size="sm" onClick={() => copy("server", ingest.server)}>
          {copied === "server" ? "Скопировано" : "Копировать"}
        </Button>
      </div>
      <div className={styles.secret}>
        <span className={styles.secretLabel}>Ключ потока</span>
        <code className={styles.code}>{visible ? streamKey : "•".repeat(24)}</code>
        <Button size="sm" onClick={() => setVisible((value) => !value)}>
          {visible ? "Скрыть" : "Показать"}
        </Button>
        <Button size="sm" onClick={() => copy("key", streamKey)}>
          {copied === "key" ? "Скопировано" : "Копировать"}
        </Button>
      </div>
      <p className={styles.hint}>
        Рекомендуем: 1080p или 720p, 30–60 кадров, битрейт 3000–6000 Кбит/с, ключевой кадр каждые 2 с.{" "}
        <button type="button" className={styles.linkButton} onClick={rotate}>
          Создать новый ключ
        </button>
      </p>
    </FormCard>
  );
}

function SettingsCard({ settings, categories, onSaved }: { settings: Studio["settings"]; categories: Category[]; onSaved: () => void }) {
  const { busy, message, onSubmit } = useSubmit(async ({ title = "", categoryId = "", tags = "" }) => {
    await api.updateStudio({
      title: title.trim(),
      categoryId,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 5),
    });
    onSaved();
    return "Сохранено";
  });

  return (
    <FormCard title="Об эфире" subtitle="Видно зрителям в карточке эфира и под плеером" message={message} onSubmit={onSubmit}>
      <Field label="Название" name="title" defaultValue={settings.title} maxLength={140} required />
      <div className={styles.selectField}>
        <label htmlFor="studio-category" className={styles.selectLabel}>
          Категория
        </label>
        <select id="studio-category" name="categoryId" defaultValue={settings.categoryId} className={styles.select}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <Field label="Теги" name="tags" defaultValue={settings.tags.join(", ")} hint="Через запятую, до пяти" />
      <Button type="submit" variant="dark" disabled={busy}>
        {busy ? "Сохраняем…" : "Сохранить"}
      </Button>
    </FormCard>
  );
}

function PredictionCardStudio({ studio, onChange }: { studio: Studio; onChange: () => void }) {
  const prediction = studio.prediction;
  const [outcomeCount, setOutcomeCount] = useState(2);
  const [busy, setBusy] = useState(false);

  const create = useSubmit(async (fields) => {
    const outcomes = Array.from({ length: outcomeCount }, (_, i) => (fields[`outcome${i}`] ?? "").trim());
    await api.createPrediction({
      question: (fields.question ?? "").trim(),
      outcomes,
      durationSeconds: Number(fields.duration),
    });
    onChange();
  });

  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      onChange();
    } finally {
      setBusy(false);
    }
  }

  if (prediction && (prediction.status === "open" || prediction.status === "locked")) {
    return (
      <FormCard
        as="div"
        title="Прогноз идёт"
        subtitle={`«${prediction.question}» · ${prediction.status === "open" ? "приём ответов открыт" : "приём закрыт — выберите верный вариант"}`}
      >
        <p className={styles.hint}>Каждый, кто угадал, получит 100 искр. Искры нельзя купить или вывести.</p>
        <div className={styles.outcomes}>
          {prediction.outcomes.map((outcome) => (
            <Button key={outcome.id} disabled={busy} onClick={() => act(() => api.resolvePrediction(prediction.id, outcome.id))}>
              Верно: {outcome.label} · {outcome.percent}%
            </Button>
          ))}
        </div>
        <Button variant="ghost" disabled={busy} onClick={() => act(() => api.cancelPrediction(prediction.id))}>
          Отменить прогноз
        </Button>
      </FormCard>
    );
  }

  return (
    <FormCard
      title="Прогноз для зрителей"
      subtitle="Бесплатный: зрители угадывают исход, за верный ответ — 100 искр. Никаких ставок и денег"
      message={create.message}
      onSubmit={create.onSubmit}
    >
      <Field label="Вопрос" name="question" maxLength={140} required placeholder="Пройдём босса с первой попытки?" />
      {Array.from({ length: outcomeCount }, (_, i) => (
        <Field key={i} label={`Вариант ${i + 1}`} name={`outcome${i}`} maxLength={40} required />
      ))}
      <div className={styles.actions}>
        {outcomeCount < 4 && (
          <Button size="sm" onClick={() => setOutcomeCount((n) => n + 1)}>
            Добавить вариант
          </Button>
        )}
        {outcomeCount > 2 && (
          <Button size="sm" variant="ghost" onClick={() => setOutcomeCount((n) => n - 1)}>
            Убрать вариант
          </Button>
        )}
      </div>
      <div className={styles.selectField}>
        <label htmlFor="prediction-duration" className={styles.selectLabel}>
          Приём ответов
        </label>
        <select id="prediction-duration" name="duration" defaultValue="120" className={styles.select}>
          {PREDICTION_DURATIONS.map((item) => (
            <option key={item.seconds} value={item.seconds}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="dark" disabled={create.busy || !studio.stream}>
        {studio.stream ? "Запустить прогноз" : "Прогноз можно запустить во время эфира"}
      </Button>
    </FormCard>
  );
}

function LiveToolsCard() {
  const moment = useSubmit(async ({ text = "" }) => {
    await api.addMoment(text.trim());
    return "Момент отмечен — он появился в ленте «Живые моменты»";
  });
  const raid = useSubmit(async ({ target = "" }) => {
    const result = await api.raid(target.trim().toLowerCase());
    return `Рейд отправлен: зрителей — ${result.viewers}`;
  });

  return (
    <>
      <FormCard title="Отметить момент" subtitle="Зрители увидят его в ленте и в списке моментов эфира" message={moment.message} onSubmit={moment.onSubmit}>
        <Field label="Что происходит" name="text" maxLength={140} required placeholder="Финал турнира начинается!" />
        <Button type="submit" disabled={moment.busy}>
          Отметить
        </Button>
      </FormCard>
      <FormCard title="Рейд" subtitle="Предложите зрителям перейти к другому автору в конце эфира" message={raid.message} onSubmit={raid.onSubmit}>
        <Field label="Адрес канала" name="target" required placeholder="например, mira" />
        <Button type="submit" disabled={raid.busy}>
          Отправить рейд
        </Button>
      </FormCard>
    </>
  );
}

function BansCard({ bans, onChange }: { bans: Studio["bans"]; onChange: () => void }) {
  const add = useSubmit(async ({ username = "", minutes = "" }) => {
    await api.ban(username.trim().toLowerCase(), minutes ? Number(minutes) : null);
    onChange();
    return "Готово";
  });

  return (
    <FormCard title="Запрет писать в чат" subtitle="Сообщения пользователя сразу скрываются из вашего чата" message={add.message} onSubmit={add.onSubmit}>
      {bans.length > 0 && (
        <ul className={styles.bans}>
          {bans.map((ban) => (
            <li key={ban.slug} className={styles.ban}>
              <Link href={channelHref(ban.slug)}>{ban.name}</Link>
              <span className={styles.hint}>{ban.until ? `до ${new Date(ban.until).toLocaleString("ru-RU")}` : "навсегда"}</span>
              <Button size="sm" onClick={() => api.unban(ban.slug).then(onChange)}>
                Снять
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Field label="Адрес канала пользователя" name="username" required />
      <div className={styles.selectField}>
        <label htmlFor="ban-minutes" className={styles.selectLabel}>
          Срок
        </label>
        <select id="ban-minutes" name="minutes" defaultValue="10" className={styles.select}>
          <option value="10">10 минут</option>
          <option value="60">1 час</option>
          <option value="1440">1 день</option>
          <option value="">Навсегда</option>
        </select>
      </div>
      <Button type="submit" disabled={add.busy}>
        Запретить
      </Button>
    </FormCard>
  );
}
