import type { z } from "zod";

/** Ошибка с HTTP-кодом и понятным пользователю сообщением. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string = "error",
  ) {
    super(message);
  }
}

export const badRequest = (message: string, code = "bad_request") => new HttpError(400, message, code);
export const unauthorized = (message = "Нужно войти в аккаунт") => new HttpError(401, message, "unauthorized");
export const forbidden = (message = "Недостаточно прав") => new HttpError(403, message, "forbidden");
export const notFound = (message = "Не найдено") => new HttpError(404, message, "not_found");
export const conflict = (message: string, code = "conflict") => new HttpError(409, message, code);
export const tooManyRequests = (message: string) => new HttpError(429, message, "rate_limited");

/** Проверяет тело или параметры запроса схемой; первая ошибка становится ответом 400. */
export function parse<Schema extends z.ZodTypeAny>(schema: Schema, value: unknown): z.infer<Schema> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw badRequest(issue?.message ?? "Некорректные данные", "validation");
  }
  return result.data;
}
