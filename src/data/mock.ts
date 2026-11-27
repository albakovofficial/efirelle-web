/**
 * Тестовые данные. Импортируются ТОЛЬКО из `src/data/api.ts`,
 * чтобы при подключении настоящего бэкенда менять один файл.
 */
import type { Category, Channel, ChatEntry, Moment, Prediction, Stream, Viewer } from "@/types";

const channel = (c: Channel): Channel => c;

export const channels = {
  timur: channel({ slug: "timur-sever", name: "Тимур Север", initials: "ТС", tone: "ink", followers: 312_000, verified: true }),
  mira: channel({ slug: "mira", name: "Мира Вольская", initials: "МВ", tone: "mint", followers: 486_000, verified: true }),
  alisa: channel({ slug: "alisa-green", name: "Алиса Грин", initials: "АГ", tone: "rose", followers: 74_000 }),
  kitchen: channel({ slug: "dom-kulinara", name: "Дом Кулинара", initials: "ДК", tone: "peach", followers: 128_000 }),
  soundLab: channel({ slug: "sound-lab", name: "Лаборатория Звука", initials: "ЛЗ", tone: "lavender", followers: 96_000 }),
  marat: channel({ slug: "marat-put", name: "Марат Путь", initials: "МП", tone: "butter", followers: 41_000 }),
  nika: channel({ slug: "nika-leto", name: "Ника Лето", initials: "НЛ", tone: "mint", followers: 22_000 }),
  sonya: channel({ slug: "sonya-ri", name: "Соня Ри", initials: "СР", tone: "rose", followers: 18_000 }),
  kai: channel({ slug: "kai-vetrov", name: "Кай Ветров", initials: "КВ", tone: "butter", followers: 205_000 }),
  veterFm: channel({ slug: "veter-fm", name: "Ветер FM", initials: "ВF", tone: "lavender", followers: 154_000 }),
  lev: channel({ slug: "lev-orlov", name: "Лев Орлов", initials: "ЛО", tone: "sky", followers: 63_000 }),
  eva: channel({ slug: "eva-cinema", name: "Ева Синема", initials: "ЕС", tone: "peach", followers: 35_000 }),
} as const;

const stream = (s: Stream): Stream => s;

export const streams: Stream[] = [
  stream({
    id: "s-timur", channel: channels.timur, title: "Финал сезона — играем до победы. Прогноз в чате!",
    category: "Стратегии", tags: ["Русский", "Соревновательно"], viewers: 18_702, durationSeconds: 13_690,
    quality: "1080p60", latencySeconds: 1.2, status: "Финал сезона · стратегии", tone: "sky",
  }),
  stream({
    id: "s-mira", channel: channels.mira, title: "Ночная сессия: живой рояль и ваши заявки",
    category: "Музыка", tags: ["Фортепиано", "Русский"], viewers: 12_418, durationSeconds: 6_120,
    quality: "4K HDR", latencySeconds: 2, status: "Рояль по заявкам", tone: "mint",
  }),
  stream({
    id: "s-alisa", channel: channels.alisa, title: "Акварель с нуля: рисуем зимний Петербург",
    category: "Искусство", tags: ["Рисование", "Обучение"], viewers: 3_204, durationSeconds: 3_300,
    quality: "1080p", latencySeconds: 1.5, status: "Акварель · Петербург", tone: "rose",
  }),
  stream({
    id: "s-kitchen", channel: channels.kitchen, title: "Готовим хачапури по-аджарски",
    category: "Кулинария", tags: ["Рецепт", "Русский"], viewers: 5_610, durationSeconds: 2_160,
    quality: "1080p", latencySeconds: 1.4, status: "Хачапури по-аджарски", tone: "peach",
  }),
  stream({
    id: "s-sound", channel: channels.soundLab, title: "Собираем синтезатор вживую",
    category: "Музыка", tags: ["Железо", "DIY"], viewers: 4_820, durationSeconds: 7_400,
    quality: "1080p60", latencySeconds: 1.1, status: "Собираем синтезатор", tone: "lavender",
  }),
  stream({
    id: "s-marat", channel: channels.marat, title: "Пешком по Казани: старый город",
    category: "Путешествия", tags: ["IRL", "Прогулка"], viewers: 2_310, durationSeconds: 4_800,
    quality: "1080p", latencySeconds: 2.4, status: "Пешком по Казани", tone: "butter",
  }),
  stream({
    id: "s-nika", channel: channels.nika, title: "Утренний кофе и разговор о дизайне",
    category: "Просто общение", tags: ["Дизайн", "Русский"], viewers: 1_120, durationSeconds: 8_040,
    quality: "1080p", latencySeconds: 1.3, status: "Кофе и дизайн", tone: "mint",
  }),
  stream({
    id: "s-sonya", channel: channels.sonya, title: "Скетчинг персонажей: вопросы и ответы",
    category: "Искусство", tags: ["Рисование", "Обучение"], viewers: 1_930, durationSeconds: 2_880,
    quality: "1080p", latencySeconds: 1.6, status: "Скетчинг персонажей", tone: "rose",
  }),
  stream({
    id: "s-kai", channel: channels.kai, title: "Ранговые до рассвета",
    category: "Шутеры", tags: ["Соревновательно", "Русский"], viewers: 6_240, durationSeconds: 19_860,
    quality: "1080p60", latencySeconds: 0.9, status: "Ранговые до рассвета", tone: "butter",
  }),
  stream({
    id: "s-veter", channel: channels.veterFm, title: "Лофай-сет для работы и учёбы",
    category: "Музыка", tags: ["Фон", "Без слов"], viewers: 9_400, durationSeconds: 39_720,
    quality: "1080p", latencySeconds: 3, status: "Лофай для работы", tone: "lavender",
  }),
];

/** Отслеживаемые каналы. Те, у кого нет эфира в `streams`, сейчас не в сети. */
export const followingSlugs = [
  "timur-sever", "mira", "alisa-green", "dom-kulinara", "sound-lab", "marat-put", "lev-orlov", "eva-cinema",
];
export const featuredIds = ["s-timur", "s-mira", "s-alisa", "s-sound", "s-kitchen"];
export const forYouIds = ["s-nika", "s-sonya", "s-kai", "s-veter", "s-marat", "s-kitchen"];

export const liveMoments: Moment[] = [
  { id: "m1", kind: "raid", text: "Алиса Грин привела 3 200 зрителей к Ника Лето", channel: channels.nika, when: "2 мин назад", offsetSeconds: 8_000 },
  { id: "m2", kind: "prediction", text: "Возьмёт ли Тимур финальную карту? 61% верят в победу", channel: channels.timur, when: "идёт сейчас", offsetSeconds: 13_600 },
  { id: "m3", kind: "chatPeak", text: "Чат взорвался: Мира сыграла заявку с первой ноты", channel: channels.mira, when: "4 мин назад", offsetSeconds: 5_880 },
  { id: "m4", kind: "giveaway", text: "Синтезатор от Лаборатории Звука — участвуйте за искры", channel: channels.soundLab, when: "через 10 мин", offsetSeconds: 7_400 },
];

/** Отметки внутри эфира по slug канала. */
export const streamMarkers: Record<string, Moment[]> = {
  "timur-sever": [
    { id: "t1", kind: "highlight", text: "Начало финала", channel: channels.timur, when: "", offsetSeconds: 760 },
    { id: "t2", kind: "highlight", text: "Камбэк на второй карте", channel: channels.timur, when: "", offsetSeconds: 5_465 },
    { id: "t3", kind: "chatPeak", text: "Пик чата", channel: channels.timur, when: "", offsetSeconds: 10_042 },
    { id: "t4", kind: "raid", text: "Рейд от Алисы Грин", channel: channels.timur, when: "", offsetSeconds: 13_258 },
  ],
};

export const categories: Category[] = [
  { id: "strategy", name: "Стратегии", group: "Игры", viewers: 42_000, tone: "sky" },
  { id: "music", name: "Музыка", group: "Творчество", viewers: 31_000, tone: "lavender" },
  { id: "talk", name: "Просто общение", group: "IRL", viewers: 58_000, tone: "mint" },
  { id: "art", name: "Искусство", group: "Творчество", viewers: 9_000, tone: "rose" },
  { id: "food", name: "Кулинария", group: "IRL", viewers: 7_000, tone: "peach" },
  { id: "shooters", name: "Шутеры", group: "Игры", viewers: 64_000, tone: "butter" },
  { id: "travel", name: "Путешествия", group: "IRL", viewers: 5_000, tone: "sky" },
];

export const chatHistory: ChatEntry[] = [
  { kind: "message", id: "c1", author: "Аня", tone: "rose", badge: { type: "subscriber", months: 12 }, text: "этот камбэк войдёт в историю" },
  { kind: "message", id: "c2", author: "Дмитрий", tone: "sky", badge: { type: "newcomer" }, text: "первый раз тут, атмосфера топ" },
  { kind: "message", id: "c3", author: "Ильдар", tone: "lavender", badge: { type: "moderator" }, text: "Прогноз открыт, выбирайте вариант" },
  { kind: "message", id: "c4", author: "Лиза", tone: "mint", badge: { type: "vip" }, text: "Тимур, следи за левым флангом" },
  { kind: "message", id: "c5", author: "Георгий", tone: "butter", badge: { type: "subscriber", months: 3 }, text: "GG, если возьмёт эту карту" },
  { kind: "message", id: "c6", author: "Катя", tone: "peach", badge: { type: "newcomer" }, text: "а клип второй карты уже есть?" },
  { kind: "message", id: "c7", author: "Ильдар", tone: "lavender", badge: { type: "moderator" }, text: "Да, в «Моментах эфира» под плеером" },
  { kind: "event", id: "c8", tone: "rose", text: "Рейд: Алиса Грин и 3 200 зрителей заходят в эфир" },
];

/** Активные прогнозы по id эфира. */
export const activePredictions: Record<string, Prediction> = {
  "s-timur": {
    id: "p1",
    question: "Возьмёт ли Тимур финальную карту?",
    endsInSeconds: 84,
    participants: 4_812,
    outcomes: [
      { id: "yes", label: "Да, забирает", percent: 61, tone: "mint" },
      { id: "no", label: "Нет, проиграет", percent: 39, tone: "peach" },
    ],
  },
};

export const currentViewer: Viewer = { name: "Ибрагим", initials: "ИА", tone: "peach", sparks: 2_480 };
