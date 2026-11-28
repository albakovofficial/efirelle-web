/** Построение адресов страниц — чтобы схема URL жила в одном месте. */

export function channelHref(slug: string): string {
  return `/live/${encodeURIComponent(slug)}`;
}

export function categoryHref(id: string): string {
  return `/browse/${encodeURIComponent(id)}`;
}

export function searchHref(query: string): string {
  const q = query.trim();
  return q ? `/search?q=${encodeURIComponent(q)}` : "/search";
}

/** Мультиэфир с выбранными каналами: /multiview?c=slug1,slug2. */
export function multiviewHref(slugs: readonly string[]): string {
  return slugs.length > 0 ? `/multiview?c=${slugs.map(encodeURIComponent).join(",")}` : "/multiview";
}

/** Вход с возвратом на текущую страницу после него. */
export function loginHref(next?: string): string {
  return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
}

export function clipHref(id: string): string {
  return `/clip/${id}`;
}
