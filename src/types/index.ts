/** Доменные типы платформы. Единственный источник правды для формы данных. */

export type Tone = "ink" | "lavender" | "peach" | "mint" | "sky" | "butter" | "rose";

export interface Channel {
  slug: string;
  name: string;
  initials: string;
  tone: Tone;
  followers: number;
  verified?: boolean;
}

export interface Stream {
  id: string;
  channel: Channel;
  title: string;
  category: string;
  tags: string[];
  viewers: number;
  /** Сколько секунд идёт эфир. */
  durationSeconds: number;
  quality: string;
  latencySeconds: number;
  /** Короткая строка о том, что происходит сейчас (для боковой панели). */
  status: string;
  /** Тон обложки, пока нет настоящего превью. */
  tone: Tone;
}

export type MomentKind = "raid" | "prediction" | "chatPeak" | "giveaway" | "highlight";

/** Событие внутри эфира: попадает и в ленту «Живые моменты», и на таймлайн плеера. */
export interface Moment {
  id: string;
  kind: MomentKind;
  text: string;
  channel: Channel;
  /** Человекочитаемое время: «2 мин назад», «идёт сейчас». */
  when: string;
  /** Смещение от начала эфира — для перемотки. */
  offsetSeconds: number;
}

export interface Category {
  id: string;
  name: string;
  group: string;
  viewers: number;
  tone: Tone;
}

export type ChatBadge =
  | { type: "moderator" }
  | { type: "vip" }
  | { type: "newcomer" }
  | { type: "subscriber"; months: number };

export type ChatEntry =
  | { kind: "message"; id: string; author: string; tone: Tone; badge?: ChatBadge; text: string }
  | { kind: "event"; id: string; tone: Tone; text: string };

export interface PredictionOutcome {
  id: string;
  label: string;
  percent: number;
  tone: Tone;
}

export interface Prediction {
  id: string;
  question: string;
  endsInSeconds: number;
  participants: number;
  outcomes: PredictionOutcome[];
}

export interface Viewer {
  name: string;
  initials: string;
  tone: Tone;
  sparks: number;
}
