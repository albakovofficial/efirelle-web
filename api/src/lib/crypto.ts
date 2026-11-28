import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number, options: object) => Promise<Buffer>;

/** Параметры scrypt: N=2^15 — около 50 мс на хэш, 32 МБ памяти. */
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;

/** Хэш пароля в формате `scrypt$<соль>$<ключ>` (base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LENGTH, SCRYPT);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltText, keyText] = stored.split("$");
  if (scheme !== "scrypt" || !saltText || !keyText) return false;
  const expected = Buffer.from(keyText, "base64url");
  const actual = await scryptAsync(password, Buffer.from(saltText, "base64url"), expected.length, SCRYPT);
  return timingSafeEqual(expected, actual);
}

/** Случайный токен для сессий и ключей эфира. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Шестизначный код для восстановления пароля. */
export function randomCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** В базе храним только хэш токена: утечка таблицы не даёт войти. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
