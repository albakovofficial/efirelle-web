/**
 * Слой доступа к данным. Страницы и компоненты получают данные только отсюда.
 * Сейчас функции читают тестовые данные; при подключении API меняется тело функций,
 * сигнатуры остаются прежними.
 */
import "server-only";
import type { Category, ChatEntry, Moment, Prediction, Stream, Viewer } from "@/types";
import {
  activePredictions,
  categories,
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
