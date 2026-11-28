/** Куда вернуть после входа: только адреса этого сайта (защита от перехода на чужой домен). */
export function safeNext(value: string | string[] | null | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
