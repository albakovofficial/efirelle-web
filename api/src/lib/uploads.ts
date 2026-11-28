import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { badRequest } from "./http.js";

/** Форматы картинок, которые принимаются, и их сигнатуры (по первым байтам, а не по заголовку запроса). */
const FORMATS: { ext: string; matches: (b: Buffer) => boolean }[] = [
  { ext: "png", matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "jpg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "webp", matches: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
  { ext: "gif", matches: (b) => b.subarray(0, 4).toString("latin1") === "GIF8" },
];

export const IMAGE_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Картинки пользователей: аватары, баннеры, эмодзи. Лежат на диске, раздаёт их nginx по /media/. */
export class Uploads {
  constructor(
    private readonly dir: string,
    private readonly publicUrl: string,
  ) {}

  /** Сохраняет картинку и возвращает её публичный адрес. */
  async saveImage(body: unknown, maxBytes: number): Promise<string> {
    if (!Buffer.isBuffer(body) || body.length === 0) throw badRequest("Пришлите картинку: PNG, JPEG, WebP или GIF");
    if (body.length > maxBytes) throw badRequest(`Картинка больше ${Math.round(maxBytes / 1024)} КБ`, "too_large");
    const format = FORMATS.find((f) => f.matches(body));
    if (!format) throw badRequest("Поддерживаются PNG, JPEG, WebP и GIF", "bad_image");
    await mkdir(this.dir, { recursive: true });
    const name = `${randomBytes(16).toString("hex")}.${format.ext}`;
    await writeFile(join(this.dir, name), body);
    return `${this.publicUrl}/media/${name}`;
  }

  /** Удаляет файл, если адрес наш. Чужие адреса и уже удалённые файлы пропускаются. */
  async remove(url: string | null | undefined): Promise<void> {
    const prefix = `${this.publicUrl}/media/`;
    if (!url?.startsWith(prefix)) return;
    const name = url.slice(prefix.length);
    if (!/^[0-9a-f]{32}\.(png|jpg|webp|gif)$/.test(name)) return;
    await unlink(join(this.dir, name)).catch(() => undefined);
  }
}
