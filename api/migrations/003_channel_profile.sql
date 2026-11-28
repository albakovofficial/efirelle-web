-- Страница канала, расписание эфиров, ответы и эмодзи в чате.

ALTER TABLE users ADD COLUMN avatar_url text;

ALTER TABLE channels
  ADD COLUMN description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  -- [{ "title": "...", "url": "https://..." }], не больше пяти.
  ADD COLUMN links jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN banner_url text;

-- Анонсы эфиров. reminded_at — когда разослали напоминание «скоро эфир».
CREATE TABLE scheduled_streams (
  id bigserial PRIMARY KEY,
  channel_id uuid NOT NULL REFERENCES channels ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 140),
  category_id text NOT NULL REFERENCES categories,
  starts_at timestamptz NOT NULL,
  reminded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scheduled_streams_starts_idx ON scheduled_streams (starts_at);
CREATE INDEX scheduled_streams_channel_idx ON scheduled_streams (channel_id, starts_at);

CREATE TABLE stream_reminders (
  scheduled_id bigint NOT NULL REFERENCES scheduled_streams ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  PRIMARY KEY (scheduled_id, user_id)
);

ALTER TABLE chat_messages ADD COLUMN reply_to_id bigint REFERENCES chat_messages ON DELETE SET NULL;

-- Эмодзи канала: в чате пишутся как :code:.
CREATE TABLE emotes (
  id bigserial PRIMARY KEY,
  channel_id uuid NOT NULL REFERENCES channels ON DELETE CASCADE,
  code text NOT NULL CHECK (code ~ '^[a-z0-9_]{2,20}$'),
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, code)
);
