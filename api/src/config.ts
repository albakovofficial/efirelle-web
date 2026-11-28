/** Настройки API из переменных окружения. Читаются один раз при запуске. */
export interface Config {
  port: number;
  host: string;
  databaseUrl: string;
  /** Публичный адрес сайта: из него строятся ссылки на видео и письма. */
  publicUrl: string;
  /** Адреса сайта, с которых принимаются изменения по cookie: основной и с www. */
  allowedOrigins: Set<string>;
  /** Адрес приёма эфиров для OBS. */
  rtmpUrl: string;
  /** API медиасервера MediaMTX — для сверки, какие эфиры реально идут. */
  mediaApiUrl: string;
  /** Почты, которые при регистрации получают роль администратора. */
  adminEmails: Set<string>;
  smtp: SmtpConfig | null;
  isProduction: boolean;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Не задана переменная окружения ${name}`);
  return value;
}

function readSmtp(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!host || !user || !password) return null;
  return {
    host,
    port: Number(process.env.SMTP_PORT ?? 465),
    user,
    password,
    from: process.env.SMTP_FROM ?? `Efirelle <${user}>`,
  };
}

export function loadConfig(): Config {
  const publicUrl = required("PUBLIC_URL", "http://localhost:3000").replace(/\/$/, "");
  const url = new URL(publicUrl);
  return {
    port: Number(process.env.PORT ?? 4000),
    host: process.env.HOST ?? "127.0.0.1",
    databaseUrl: required("DATABASE_URL"),
    publicUrl,
    allowedOrigins: new Set([publicUrl, `${url.protocol}//www.${url.host}`]),
    rtmpUrl: process.env.RTMP_URL ?? `rtmp://${url.hostname}/live`,
    mediaApiUrl: process.env.MEDIA_API_URL ?? "http://127.0.0.1:9997",
    adminEmails: new Set(
      (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
    smtp: readSmtp(),
    isProduction: process.env.NODE_ENV === "production",
  };
}
