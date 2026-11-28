import type { ReactNode } from "react";

/** Единый реестр иконок. Новая иконка добавляется только сюда. */
const icons = {
  search: { body: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></> },
  home: { body: <path d="M4 10.5L12 4l8 6.5V20h-5v-6h-6v6H4z" /> },
  grid: { body: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></> },
  heart: { body: <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" /> },
  plus: { body: <path d="M12 5v14M5 12h14" /> },
  more: { filled: true, body: <><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></> },
  scissors: { body: <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12" /></> },
  close: { body: <path d="M6 6l12 12M18 6L6 18" /> },
  multiview: { body: <><rect x="3" y="4" width="8" height="7" rx="2" /><rect x="13" y="4" width="8" height="7" rx="2" /><rect x="3" y="13" width="8" height="7" rx="2" /><rect x="13" y="13" width="8" height="7" rx="2" /></> },
  volume: { body: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16.5 8.5a5 5 0 010 7" /></> },
  mute: { body: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M17 9l4 6M21 9l-4 6" /></> },
  settings: { body: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></> },
  fullscreen: { body: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /> },
  chevronLeft: { body: <path d="M15 5l-7 7 7 7" /> },
  chevronRight: { body: <path d="M9 5l7 7-7 7" /> },
  send: { body: <path d="M5 12h14M13 6l6 6-6 6" /> },
  play: { filled: true, body: <path d="M7 4.5v15l13-7.5z" /> },
  pause: { filled: true, body: <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> },
  spark: { filled: true, body: <path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" /> },
  // Значки категорий на обложках.
  chat: { body: <><path d="M4 6a2 2 0 012-2h9a2 2 0 012 2v6a2 2 0 01-2 2H9l-4 3V6z" /><path d="M17 9h1a2 2 0 012 2v8l-3-2h-6a2 2 0 01-2-2v-1" /></> },
  gamepad: { body: <><path d="M7 8h10a4 4 0 014 4l-.6 3.6a2.5 2.5 0 01-4.3 1.2L14.5 15h-5l-1.6 1.8a2.5 2.5 0 01-4.3-1.2L3 12a4 4 0 014-4z" /><path d="M8 11v3M6.5 12.5h3M15.5 12h.01M17.5 13.5h.01" /></> },
  crown: { body: <path d="M4 18h16M5 15l-1-8 5 4 3-6 3 6 5-4-1 8z" /> },
  crosshair: { body: <><circle cx="12" cy="12" r="8" /><path d="M12 2v5M12 17v5M2 12h5M17 12h5" /></> },
  music: { body: <><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></> },
  palette: { body: <><path d="M12 3a9 9 0 100 18c1.1 0 1.6-.9 1.2-1.8l-.4-.8a1.6 1.6 0 011.5-2.4H17a4 4 0 004-4c0-5-4-9-9-9z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7.5" r="1" /></> },
  utensils: { body: <path d="M6 3v7a2 2 0 002 2v9M10 3v7a2 2 0 01-2 2M8 3v6M17 21V3c-2 1-3 3-3 6v4h3" /> },
  plane: { body: <path d="M10.5 13.5L4 11l1.5-1.5 7 1 4-4.5a2 2 0 013 3L15 13l1 7-1.5 1.5-2.5-6.5L9 18v2.5L7.5 22 6 18l-4-1.5L3.5 15H6z" /> },
  graduation: { body: <><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c2 2 10 2 12 0v-5M22 9v6" /></> },
  run: { body: <><circle cx="14" cy="4.5" r="2" /><path d="M5 21l4-6 3 2 1-5 3 3h3M8 9l3-2 4 1-2 4" /></> },
  verified: { filled: true, body: <path d="M12 2l2.6 2.2 3.4-.4.9 3.3 3 1.7-1.3 3.2 1.3 3.2-3 1.7-.9 3.3-3.4-.4L12 22l-2.6-2.2-3.4.4-.9-3.3-3-1.7L3.4 12 2.1 8.8l3-1.7.9-3.3 3.4.4z" /> },
} satisfies Record<string, { body: ReactNode; filled?: boolean }>;

export type IconName = keyof typeof icons;

interface IconProps {
  name: IconName;
  size?: number;
  /** Если задан — иконка озвучивается скринридером, иначе декоративная. */
  label?: string;
  className?: string;
}

export function Icon({ name, size = 20, label, className }: IconProps) {
  const icon: { body: ReactNode; filled?: boolean } = icons[name];
  const paint = icon.filled
    ? { fill: "currentColor" }
    : { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      {...paint}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {icon.body}
    </svg>
  );
}
