import type { ReactNode } from "react";

/** Единый реестр иконок. Новая иконка добавляется только сюда. */
const icons = {
  search: { body: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></> },
  bell: { body: <><path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 004 0" /></> },
  home: { body: <path d="M4 10.5L12 4l8 6.5V20h-5v-6h-6v6H4z" /> },
  grid: { body: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></> },
  heart: { body: <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" /> },
  plus: { body: <path d="M12 5v14M5 12h14" /> },
  close: { body: <path d="M6 6l12 12M18 6L6 18" /> },
  clip: { body: <path d="M6 4v16M18 4v16M6 9h12M6 15h12" /> },
  multiview: { body: <><rect x="3" y="4" width="8" height="7" rx="2" /><rect x="13" y="4" width="8" height="7" rx="2" /><rect x="3" y="13" width="8" height="7" rx="2" /><rect x="13" y="13" width="8" height="7" rx="2" /></> },
  rewind: { body: <><path d="M4 12a8 8 0 108-8H7" /><path d="M9 1L6 4l3 3" /></> },
  volume: { body: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16.5 8.5a5 5 0 010 7" /></> },
  mute: { body: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M17 9l4 6M21 9l-4 6" /></> },
  settings: { body: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></> },
  fullscreen: { body: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /> },
  chevronLeft: { body: <path d="M15 5l-7 7 7 7" /> },
  chevronRight: { body: <path d="M9 5l7 7-7 7" /> },
  send: { body: <path d="M5 12h14M13 6l6 6-6 6" /> },
  smile: { body: <><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 007 0M9 10h.01M15 10h.01" /></> },
  play: { filled: true, body: <path d="M7 4.5v15l13-7.5z" /> },
  pause: { filled: true, body: <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> },
  spark: { filled: true, body: <path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" /> },
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
