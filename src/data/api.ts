/**
 * Слой доступа к данным. Страницы и компоненты получают данные только отсюда.
 * Сейчас функции читают тестовые данные; при подключении API меняется тело функций,
 * сигнатуры остаются прежними.
 */
import "server-only";
import type {
  Category,
  Channel,
  ChannelStatus,
  ChatEntry,
  Moment,
  Prediction,
  SearchResults,
  Stream,
  Viewer,
} from "@/types";
import {
  activePredictions,
  categories,
  channels,
  chatHistory,
  currentViewer,
  featuredIds,
  followingSlugs,
  forYouIds,
  liveMoments,
  streamMarkers,
  streams,
} from "./mock";

function pickByIds(ids: string[]): Stream[] {
  return ids.flatMap((id) => streams.find((s) => s.id === id) ?? []);
}

const allChannels: Channel[] = Object.values(channels);

function withStatus(channel: Channel): ChannelStatus {
  return { channel, stream: streams.find((s) => s.channel.slug === channel.slug) ?? null };
}

function byViewersDesc(a: Stream, b: Stream): number {
  return b.viewers - a.viewers;
}

/** Нормализация для поиска: регистр и «ё» не важны. */
function normalize(text: string): string {
  return text.toLocaleLowerCase("ru-RU").replaceAll("ё", "е").trim();
}

export async function getCurrentViewer(): Promise<Viewer> {
  return currentViewer;
}

/** Отслеживаемые каналы, которые сейчас в эфире. */
export async function getFollowingLive(): Promise<Stream[]> {
  return followingSlugs.flatMap((slug) => streams.find((s) => s.channel.slug === slug) ?? []);
}

/** Первый элемент — главный эфир витрины, остальные — список «Рекомендуем сейчас». */
export async function getFeaturedStreams(): Promise<Stream[]> {
  return pickByIds(featuredIds);
}

export async function getStreamsForYou(): Promise<Stream[]> {
  return pickByIds(forYouIds);
}

export async function getLiveMoments(): Promise<Moment[]> {
  return liveMoments;
}

export async function getTopCategories(): Promise<Category[]> {
  return categories;
}

export async function getStreamByChannel(slug: string): Promise<Stream | null> {
  return streams.find((s) => s.channel.slug === slug) ?? null;
}

export async function getStreamMarkers(slug: string): Promise<Moment[]> {
  return streamMarkers[slug] ?? [];
}

export async function getChatHistory(_streamId: string): Promise<ChatEntry[]> {
  return chatHistory;
}

export async function getActivePrediction(streamId: string): Promise<Prediction | null> {
  return activePredictions[streamId] ?? null;
}

/** Все эфиры, которые идут сейчас, — самые популярные первыми. */
export async function getLiveStreams(): Promise<Stream[]> {
  return [...streams].sort(byViewersDesc);
}

/** Все категории — самые популярные первыми. */
export async function getAllCategories(): Promise<Category[]> {
  return [...categories].sort((a, b) => b.viewers - a.viewers);
}

export async function getCategory(id: string): Promise<Category | null> {
  return categories.find((c) => c.id === id) ?? null;
}

export async function getStreamsByCategory(id: string): Promise<Stream[]> {
  const category = categories.find((c) => c.id === id);
  if (!category) return [];
  return streams.filter((s) => s.category === category.name).sort(byViewersDesc);
}

/** Все отслеживаемые каналы с текущим статусом: сначала те, кто в эфире. */
export async function getFollowedChannels(): Promise<ChannelStatus[]> {
  return followingSlugs
    .flatMap((slug) => allChannels.find((c) => c.slug === slug) ?? [])
    .map(withStatus)
    .sort((a, b) => Number(b.stream !== null) - Number(a.stream !== null));
}

/** Поиск по эфирам (название, канал, категория, теги), каналам и категориям. */
export async function search(rawQuery: string): Promise<SearchResults> {
  const query = rawQuery.trim();
  const q = normalize(query);
  if (!q) return { query, streams: [], channels: [], categories: [] };
  const matches = (...fields: string[]) => fields.some((field) => normalize(field).includes(q));

  return {
    query,
    streams: streams
      .filter((s) => matches(s.title, s.channel.name, s.category, ...s.tags))
      .sort(byViewersDesc),
    channels: allChannels
      .filter((c) => matches(c.name, c.slug))
      .map(withStatus)
      .sort((a, b) => b.channel.followers - a.channel.followers),
    categories: categories.filter((c) => matches(c.name, c.group)),
  };
}
