/**
 * Слой доступа к данным для серверных компонентов. Страницы получают данные только отсюда.
 * Запросы идут во внутренний API (`API_INTERNAL_URL`), cookie сессии пробрасывается,
 * поэтому API знает, кто смотрит страницу.
 */
import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { apiRequest, ApiError } from "@/lib/api-request";
import type {
  AdminReport,
  BlockedUser,
  Category,
  ChannelStatus,
  ChannelWatch,
  Clip,
  HomeFeed,
  PushStatus,
  SearchResults,
  Stream,
  Studio,
  Viewer,
} from "@/types";

const API_URL = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000";

async function get<T>(path: string): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  return apiRequest<T>(`${API_URL}${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });
}

/** null вместо ошибки для «не найдено» и «не вошёл» — страницы решают сами, что показать. */
async function getOrNull<T>(path: string): Promise<T | null> {
  try {
    return await get<T>(path);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 401 || error.status === 403)) return null;
    throw error;
  }
}

export const getCurrentViewer = cache(async (): Promise<Viewer | null> => {
  return (await getOrNull<{ user: Viewer }>("/api/me"))?.user ?? null;
});

export const getHomeFeed = cache(() => get<HomeFeed>("/api/home"));

/** Отслеживаемые каналы в эфире — для боковой панели. Без входа список пуст. */
export const getFollowingLive = cache(async (): Promise<Stream[]> => {
  if (!(await getCurrentViewer())) return [];
  return (await getFollowedChannels()).flatMap((status) => (status.stream ? [status.stream] : []));
});

/** Все отслеживаемые каналы: сначала те, кто в эфире. */
export const getFollowedChannels = cache(async (): Promise<ChannelStatus[]> => {
  return (await getOrNull<{ channels: ChannelStatus[] }>("/api/me/following"))?.channels ?? [];
});

/** Все эфиры, которые идут сейчас, — самые популярные первыми. */
export async function getLiveStreams(): Promise<Stream[]> {
  return (await get<{ streams: Stream[] }>("/api/streams/live")).streams;
}

export async function getAllCategories(): Promise<Category[]> {
  return (await get<{ categories: Category[] }>("/api/categories")).categories;
}

export async function getCategoryWithStreams(id: string): Promise<{ category: Category; streams: Stream[] } | null> {
  return getOrNull(`/api/categories/${encodeURIComponent(id)}`);
}

export const getChannelWatch = cache(async (slug: string): Promise<ChannelWatch | null> => {
  return getOrNull<ChannelWatch>(`/api/channels/${encodeURIComponent(slug)}/watch`);
});

export async function search(query: string): Promise<SearchResults> {
  return get<SearchResults>(`/api/search?q=${encodeURIComponent(query)}`);
}

export async function getStudio(): Promise<Studio | null> {
  return getOrNull<Studio>("/api/studio");
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  return (await getOrNull<{ users: BlockedUser[] }>("/api/me/blocks"))?.users ?? [];
}

export async function getAdminReports(): Promise<AdminReport[] | null> {
  return (await getOrNull<{ reports: AdminReport[] }>("/api/admin/reports"))?.reports ?? null;
}

export async function getPushStatus(): Promise<PushStatus | null> {
  return getOrNull<PushStatus>("/api/admin/push");
}

export const getClip = cache(async (id: string): Promise<Clip | null> => {
  return (await getOrNull<{ clip: Clip }>(`/api/clips/${encodeURIComponent(id)}`))?.clip ?? null;
});

export async function getTranscode(): Promise<boolean | null> {
  return (await getOrNull<{ enabled: boolean }>("/api/admin/transcode"))?.enabled ?? null;
}
