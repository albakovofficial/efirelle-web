/** Построение адресов страниц — чтобы схема URL жила в одном месте. */

export function channelHref(slug: string): string {
  return `/live/${encodeURIComponent(slug)}`;
}

export function categoryHref(id: string): string {
  return `/browse/${encodeURIComponent(id)}`;
}
