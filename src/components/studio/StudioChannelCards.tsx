"use client";

import { useState, type ChangeEvent } from "react";
import { Field } from "@/components/forms/Field/Field";
import { FormCard } from "@/components/forms/FormCard/FormCard";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Button } from "@/components/ui/Button/Button";
import { api } from "@/lib/api-client";
import { formatScheduleDate } from "@/lib/format";
import { useSubmit } from "@/lib/useSubmit";
import type { Category, ChannelLink, Studio } from "@/types";
import styles from "./StudioPanel.module.css";

const IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/gif";
const MAX_LINKS = 5;

/** Выбор файла картинки: вызывает `onFile` и сбрасывает поле, чтобы тот же файл можно было выбрать снова. */
function ImagePicker({ label, onFile, disabled }: { label: string; onFile: (file: File) => void; disabled?: boolean }) {
  function handle(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onFile(file);
  }
  return (
    <label className={`${styles.filePicker} ${disabled ? styles.filePickerDisabled : ""}`}>
      {label}
      <input type="file" accept={IMAGE_TYPES} onChange={handle} disabled={disabled} className="visually-hidden" />
    </label>
  );
}

/** Оформление: фото, баннер, описание и ссылки канала. */
export function AppearanceCard({ studio, onChange }: { studio: Studio; onChange: () => void }) {
  const [avatarUrl, setAvatarUrl] = useState(studio.channel.avatarUrl);
  const [bannerUrl, setBannerUrl] = useState(studio.about.bannerUrl);
  const [links, setLinks] = useState<ChannelLink[]>(studio.about.links);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function uploadImage(action: () => Promise<void>) {
    setUploading(true);
    setUploadError(null);
    try {
      await action();
      onChange();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Не удалось загрузить");
    } finally {
      setUploading(false);
    }
  }

  const save = useSubmit(async ({ description = "" }) => {
    const cleanLinks = links.filter((link) => link.title.trim() || link.url.trim());
    await api.updateAbout({ description, links: cleanLinks });
    setLinks(cleanLinks);
    onChange();
    return "Сохранено";
  });

  function updateLink(index: number, field: keyof ChannelLink, value: string) {
    setLinks((current) => current.map((link, i) => (i === index ? { ...link, [field]: value } : link)));
  }

  return (
    <FormCard title="Оформление канала" subtitle="Фото, баннер, описание и ссылки видны на странице канала" message={save.message} onSubmit={save.onSubmit}>
      <div className={styles.media}>
        <Avatar initials={studio.channel.initials} tone={studio.channel.tone} imageUrl={avatarUrl} size="xl" />
        <div className={styles.actions}>
          <ImagePicker label="Загрузить фото" disabled={uploading} onFile={(file) => uploadImage(async () => setAvatarUrl((await api.uploadAvatar(file)).avatarUrl))} />
          {avatarUrl && (
            <Button size="sm" variant="ghost" disabled={uploading} onClick={() => uploadImage(async () => setAvatarUrl((await api.removeAvatar()).avatarUrl))}>
              Убрать
            </Button>
          )}
        </div>
      </div>
      {bannerUrl && <img src={bannerUrl} alt="Баннер канала" className={styles.bannerPreview} />}
      <div className={styles.actions}>
        <ImagePicker label={bannerUrl ? "Заменить баннер" : "Загрузить баннер"} disabled={uploading} onFile={(file) => uploadImage(async () => setBannerUrl((await api.uploadBanner(file)).bannerUrl))} />
        {bannerUrl && (
          <Button size="sm" variant="ghost" disabled={uploading} onClick={() => uploadImage(async () => setBannerUrl((await api.removeBanner()).bannerUrl))}>
            Убрать баннер
          </Button>
        )}
      </div>
      <p className={styles.hint}>Фото — до 2 МБ, баннер — до 4 МБ, лучше 1600×400. PNG, JPEG, WebP или GIF.</p>
      {uploadError && <p className={styles.error}>{uploadError}</p>}

      <div className={styles.selectField}>
        <label htmlFor="channel-description" className={styles.selectLabel}>
          Описание
        </label>
        <textarea id="channel-description" name="description" defaultValue={studio.about.description} maxLength={1000} rows={4} className={styles.textarea} />
      </div>

      <div className={styles.selectField}>
        <span className={styles.selectLabel}>Ссылки</span>
        {links.map((link, index) => (
          <div key={index} className={styles.linkRow}>
            <input aria-label={`Подпись ссылки ${index + 1}`} placeholder="Telegram" value={link.title} maxLength={40} onChange={(e) => updateLink(index, "title", e.target.value)} className={styles.input} />
            <input aria-label={`Адрес ссылки ${index + 1}`} placeholder="https://t.me/…" value={link.url} maxLength={300} onChange={(e) => updateLink(index, "url", e.target.value)} className={styles.input} />
            <Button size="sm" variant="ghost" icon="close" aria-label="Убрать ссылку" onClick={() => setLinks((current) => current.filter((_, i) => i !== index))} />
          </div>
        ))}
        {links.length < MAX_LINKS && (
          <Button size="sm" onClick={() => setLinks((current) => [...current, { title: "", url: "" }])}>
            Добавить ссылку
          </Button>
        )}
      </div>
      <Button type="submit" variant="dark" disabled={save.busy}>
        {save.busy ? "Сохраняем…" : "Сохранить"}
      </Button>
    </FormCard>
  );
}

/** Расписание: анонсы будущих эфиров с напоминаниями для зрителей. */
export function ScheduleStudioCard({ studio, categories, onChange }: { studio: Studio; categories: Category[]; onChange: () => void }) {
  const create = useSubmit(async ({ title = "", categoryId = "", startsAt = "" }) => {
    if (!startsAt) throw new Error("Укажите дату и время");
    await api.schedule({ title: title.trim(), categoryId, startsAt: new Date(startsAt).toISOString() });
    onChange();
    return "Анонс опубликован";
  });

  return (
    <FormCard title="Расписание" subtitle="Анонс появится на главной и странице канала; зрители смогут нажать «Напомнить»" message={create.message} onSubmit={create.onSubmit}>
      {studio.schedule.length > 0 && (
        <ul className={styles.bans}>
          {studio.schedule.map((item) => (
            <li key={item.id} className={styles.ban}>
              <span>{formatScheduleDate(item.startsAt)}</span>
              <span className={styles.hint}>
                {item.title} · напомнить просили: {item.reminders}
              </span>
              <Button size="sm" variant="ghost" onClick={() => api.unschedule(item.id).then(onChange)}>
                Удалить
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Field label="Название" name="title" maxLength={140} required placeholder="Финал турнира" />
      <div className={styles.selectField}>
        <label htmlFor="schedule-category" className={styles.selectLabel}>
          Категория
        </label>
        <select id="schedule-category" name="categoryId" defaultValue={studio.settings.categoryId} className={styles.select}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <Field label="Дата и время" name="startsAt" type="datetime-local" required />
      <Button type="submit" variant="dark" disabled={create.busy}>
        Опубликовать анонс
      </Button>
    </FormCard>
  );
}

/** Эмодзи канала: картинка и код, в чате пишется как :код:. */
export function EmotesCard({ studio, onChange }: { studio: Studio; onChange: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const add = useSubmit(async ({ code = "" }) => {
    if (!file) throw new Error("Выберите картинку");
    await api.addEmote(code.trim().toLowerCase(), file);
    setFile(null);
    onChange();
    return `Эмодзи :${code.trim().toLowerCase()}: добавлено`;
  });

  return (
    <FormCard title="Эмодзи канала" subtitle="Зрители вставляют их в чат кнопкой под полем ввода или пишут :код:" message={add.message} onSubmit={add.onSubmit}>
      {studio.emotes.length > 0 && (
        <ul className={styles.emoteList}>
          {studio.emotes.map((emote) => (
            <li key={emote.code} className={styles.emoteItem}>
              <img src={emote.url} alt="" />
              <span>:{emote.code}:</span>
              <Button size="sm" variant="ghost" icon="close" aria-label={`Удалить :${emote.code}:`} onClick={() => api.removeEmote(emote.code).then(onChange)} />
            </li>
          ))}
        </ul>
      )}
      <Field label="Код" name="code" required minLength={2} maxLength={20} pattern="[a-zA-Z0-9_]{2,20}" placeholder="wave" hint="2–20 латинских букв, цифр или _" />
      <div className={styles.actions}>
        <ImagePicker label={file ? `Выбрано: ${file.name}` : "Выбрать картинку"} onFile={setFile} />
      </div>
      <p className={styles.hint}>Квадратная картинка, до 256 КБ. Лучше 112×112 с прозрачным фоном.</p>
      <Button type="submit" variant="dark" disabled={add.busy}>
        Добавить эмодзи
      </Button>
    </FormCard>
  );
}
