-- Live Activities: идущий эфир канала на экране блокировки и в Dynamic Island.

-- Токен, которым сервер сам запускает Live Activity на устройстве (iOS 17.2+).
-- Есть токен — вместо уведомления «начал эфир» устройство получает Live Activity.
ALTER TABLE devices ADD COLUMN activity_start_token text CHECK (activity_start_token ~ '^[0-9a-f]{32,400}$');

-- Запущенные Live Activities: по их токенам обновляются зрители и приходит конец эфира.
CREATE TABLE live_activities (
  token text PRIMARY KEY CHECK (token ~ '^[0-9a-f]{32,400}$'),
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES channels ON DELETE CASCADE,
  environment text NOT NULL CHECK (environment IN ('production', 'sandbox')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_activities_channel_idx ON live_activities (channel_id);
