-- Клипы: короткие отрывки эфира, сохранённые навсегда отдельным файлом.
CREATE TABLE clips (
  id bigserial PRIMARY KEY,
  channel_id uuid NOT NULL REFERENCES channels ON DELETE CASCADE,
  session_id bigint REFERENCES stream_sessions ON DELETE SET NULL,
  creator_id uuid REFERENCES users ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  -- Начало отрывка в записи эфира и его длина.
  start_at timestamptz NOT NULL,
  duration_seconds integer NOT NULL CHECK (duration_seconds BETWEEN 5 AND 60),
  -- processing — ждём, пока запись допишется; ready — файл готов; failed — записи нет.
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  url text,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clips_channel_idx ON clips (channel_id, created_at DESC);
CREATE INDEX clips_recent_idx ON clips (created_at DESC) WHERE status = 'ready';
