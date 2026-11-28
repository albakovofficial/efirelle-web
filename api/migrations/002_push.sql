-- Push-уведомления в приложении iOS.

-- Присылать ли уведомление, когда отслеживаемый канал начинает эфир.
ALTER TABLE users ADD COLUMN push_live boolean NOT NULL DEFAULT true;

-- Когда подписчикам последний раз ушло уведомление о начале эфира: при переподключении OBS не дублируем.
ALTER TABLE channels ADD COLUMN live_push_at timestamptz;

-- Устройства для уведомлений. Токен переходит к тому, кто вошёл на устройстве последним.
CREATE TABLE devices (
  token text PRIMARY KEY CHECK (token ~ '^[0-9a-f]{32,200}$'),
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  -- production — TestFlight и App Store, sandbox — сборки из Xcode.
  environment text NOT NULL CHECK (environment IN ('production', 'sandbox')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX devices_user_idx ON devices (user_id);

-- Настройки сервиса, которые задаются из админки (ключ APNs). Значения наружу не отдаются.
CREATE TABLE settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
