import type { ApnsPush } from "./apns.js";

/** Обычное уведомление. */
export interface PushMessage {
  title: string;
  body: string;
  /** Адрес канала — приложение откроет его по нажатию. */
  channel: string;
}

/** Канал в Live Activity — неизменная часть (LiveStreamAttributes в приложении). */
export interface ActivityChannel {
  slug: string;
  name: string;
}

/** Меняющаяся часть Live Activity (LiveStreamAttributes.ContentState в приложении). */
export interface ActivityState {
  title: string;
  viewers: number;
  isLive: boolean;
}

/** Имя типа ActivityAttributes в приложении — по нему iOS понимает, какую Live Activity запустить. */
const ATTRIBUTES_TYPE = "LiveStreamAttributes";
/** Через сколько закончившаяся Live Activity уходит с экрана блокировки. */
const END_DISMISSAL_SECONDS = 15 * 60;
/** Если обновления перестали приходить, iOS через это время пометит данные как устаревшие. */
const STALE_SECONDS = 10 * 60;

const now = () => Math.floor(Date.now() / 1000);

export function alertPush(message: PushMessage): ApnsPush {
  return {
    type: "alert",
    priority: 10,
    payload: { aps: { alert: { title: message.title, body: message.body }, sound: "default" }, channel: message.channel },
  };
}

/** Запуск Live Activity на устройстве (iOS 17.2+) — вместо обычного уведомления «начал эфир». */
export function activityStartPush(channel: ActivityChannel, state: ActivityState, message: PushMessage): ApnsPush {
  return {
    type: "liveactivity",
    priority: 10,
    payload: {
      aps: {
        timestamp: now(),
        event: "start",
        "content-state": state,
        "stale-date": now() + STALE_SECONDS,
        "attributes-type": ATTRIBUTES_TYPE,
        attributes: channel,
        alert: { title: message.title, body: message.body, sound: "default" },
      },
    },
  };
}

/** Зрители и название идущего эфира — без звука и с низким приоритетом. */
export function activityUpdatePush(state: ActivityState): ApnsPush {
  return {
    type: "liveactivity",
    priority: 5,
    payload: { aps: { timestamp: now(), event: "update", "content-state": state, "stale-date": now() + STALE_SECONDS } },
  };
}

/** Эфир закончился: Live Activity показывает итог и вскоре исчезает. */
export function activityEndPush(state: ActivityState): ApnsPush {
  return {
    type: "liveactivity",
    priority: 10,
    payload: { aps: { timestamp: now(), event: "end", "content-state": state, "dismissal-date": now() + END_DISMISSAL_SECONDS } },
  };
}
