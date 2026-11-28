/** Доменные типы платформы. Совпадают с ответами API (api/src/modules). */

export type Tone = "ink" | "lavender" | "peach" | "mint" | "sky" | "butter" | "rose";

export interface Channel {
  slug: string;
  name: string;
  initials: string;
  tone: Tone;
  avatarUrl: string | null;
  followers: number;
  verified?: boolean;
}

export interface Stream {
  id: string;
  channel: Channel;
  title: string;
  category: string;
  categoryId: string;
  tags: string[];
  viewers: number;
  /** Сколько секунд идёт эфир. */
  durationSeconds: number;
  quality: string;
  latencySeconds: number;
  /** Короткая строка о том, что происходит сейчас (для боковой панели). */
  status: string;
  /** Тон обложки, пока нет кадра-превью. */
  tone: Tone;
  /** Адрес HLS-потока. */
  playbackUrl: string;
  /** Доступные качества; первое — исходное. */
  qualities: { label: string; url: string }[];
}

export type MomentKind = "raid" | "prediction" | "chatPeak" | "giveaway" | "highlight";

/** Событие внутри эфира: попадает и в ленту «Живые моменты», и на таймлайн плеера. */
export interface Moment {
  id: string;
  kind: MomentKind;
  text: string;
  channel: Channel;
  /** Человекочитаемое время: «2 мин назад». */
  when: string;
  /** Смещение от начала эфира — для перемотки. */
  offsetSeconds: number;
}

/** Канал вместе с его текущим эфиром; `stream === null` — канал не в сети. */
export interface ChannelStatus {
  channel: Channel;
  stream: Stream | null;
}

export interface Category {
  id: string;
  name: string;
  group: string;
  viewers: number;
  liveCount: number;
  tone: Tone;
}

export type ChatBadge = { type: "broadcaster" } | { type: "moderator" } | { type: "newcomer" };

export interface ChatMessage {
  kind: "message";
  id: string;
  author: string;
  authorSlug: string;
  authorId: string;
  tone: Tone;
  badge?: ChatBadge;
  text: string;
  /** Ответ на сообщение: кому и начало исходного текста. */
  replyTo?: { id: string; author: string; text: string };
  createdAt: string;
}

/** Служебное событие в ленте чата (рейд, начало эфира). Живёт только на экране. */
export interface ChatEvent {
  kind: "event";
  id: string;
  tone: Tone;
  text: string;
  /** Ссылка из события — например, на канал, куда ушёл рейд. */
  link?: { href: string; label: string };
}

export type ChatEntry = ChatMessage | ChatEvent;

export interface PredictionOutcome {
  id: string;
  label: string;
  percent: number;
  votes: number;
  tone: Tone;
}

export interface Prediction {
  id: string;
  question: string;
  /** open — идёт приём ответов; locked — время вышло, ждём итог; resolved — итог подведён. */
  status: "open" | "locked" | "resolved" | "cancelled";
  endsInSeconds: number;
  participants: number;
  outcomes: PredictionOutcome[];
  myOutcomeId: string | null;
  winningOutcomeId: string | null;
}

/** Вошедший пользователь. */
export interface Viewer {
  id: string;
  email: string;
  username: string;
  displayName: string;
  initials: string;
  role: "user" | "admin";
  tone: Tone;
  sparks: number;
  avatarUrl: string | null;
}

export interface SearchResults {
  query: string;
  streams: Stream[];
  channels: ChannelStatus[];
  categories: Category[];
}

/** Всё для страницы эфира одним запросом. */
export interface ChannelWatch extends ChannelStatus {
  isFollowing: boolean;
  isOwner: boolean;
  markers: Moment[];
  prediction: Prediction | null;
  chat: ChatMessage[];
  about: ChannelAbout;
  emotes: Emote[];
  schedule: ScheduledStream[];
  recordings: Recording[];
  clips: Clip[];
  chatRules: ChatRules;
}

/** Правила чата канала, которые видят зрители. */
export interface ChatRules {
  /** Секунд между сообщениями одного зрителя; 0 — выключен. */
  slowModeSeconds: number;
  followersOnly: boolean;
}

export const SLOW_MODE_OPTIONS = [0, 5, 10, 30, 60] as const;

/** Настройки модерации в студии. */
export interface ModerationSettings extends ChatRules {
  blockedWords: string[];
  /** Сколько сообщений фильтр скрыл за текущий или последний эфир. */
  hiddenThisStream: number;
}

/** Статистика канала: сводка за неделю против прошлой и лента прошедших эфиров. */
export interface ChannelStats {
  summary: {
    followers: number;
    newFollowers: { week: number; previousWeek: number };
    avgViewers: { week: number; previousWeek: number };
    peak: { viewers: number; at: string | null };
    hoursLive: { week: number; previousWeek: number };
  };
  streams: {
    id: string;
    title: string;
    category: string;
    startedAt: string;
    durationSeconds: number;
    peakViewers: number;
    avgViewers: number;
    newFollowers: number;
    points: number[];
  }[];
}

/** Запись завершённого эфира (хранится 3 дня). */
export interface Recording {
  id: string;
  title: string;
  category: string;
  startedAt: string;
  durationSeconds: number;
  peakViewers: number;
  url: string;
}

/** Клип — 30 секунд эфира отдельным файлом. */
export interface Clip {
  id: string;
  title: string;
  channel: Channel;
  author: string | null;
  status: "processing" | "ready" | "failed";
  url: string | null;
  durationSeconds: number;
  views: number;
  createdAt: string;
}

export interface ChannelLink {
  title: string;
  url: string;
}

/** Оформление канала. */
export interface ChannelAbout {
  description: string;
  links: ChannelLink[];
  bannerUrl: string | null;
}

/** Эмодзи канала: в чате пишется как :code:. */
export interface Emote {
  code: string;
  url: string;
}

/** Анонс эфира. */
export interface ScheduledStream {
  id: string;
  channel: Channel;
  title: string;
  category: string;
  categoryId: string;
  startsAt: string;
  reminders: number;
  isReminded: boolean;
}

export interface HomeFeed {
  following: ChannelStatus[];
  featured: Stream[];
  moments: Moment[];
  categories: Category[];
  forYou: Stream[];
  upcoming: ScheduledStream[];
  clips: Clip[];
}

export interface Studio extends ChannelStatus {
  settings: { title: string; categoryId: string; tags: string[] };
  ingest: { server: string; streamKey: string };
  prediction: Prediction | null;
  bans: { slug: string; name: string; until: string | null }[];
  about: ChannelAbout;
  emotes: Emote[];
  schedule: ScheduledStream[];
  moderation: ModerationSettings;
}

export type ReportReason = "spam" | "harassment" | "hate" | "sexual" | "violence" | "other";

export interface AdminReport {
  id: string;
  reason: ReportReason;
  messageText: string | null;
  messageId: string | null;
  createdAt: string;
  target: { id: string; slug: string; name: string };
  reporter: string | null;
  channel: string | null;
}

export interface BlockedUser {
  id: string;
  slug: string;
  name: string;
}

/** Ключ APNs для уведомлений на iPhone. Сам ключ сервер не отдаёт. */
export interface PushStatus {
  configured: boolean;
  keyId: string | null;
  teamId: string | null;
  updatedAt: string | null;
}
