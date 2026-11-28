/** Общий разбор ответов API — для сервера (data/api.ts) и для браузера (lib/api-client.ts). */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(url, { ...init, headers });
  const body = (await response.json().catch(() => null)) as ({ message?: string; error?: string } & T) | null;
  if (!response.ok) {
    throw new ApiError(response.status, body?.message ?? "Сервис временно недоступен", body?.error ?? "error");
  }
  return body as T;
}
