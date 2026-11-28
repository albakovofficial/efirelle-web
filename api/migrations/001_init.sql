-- Efirelle: начальная схема базы данных.

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 40),
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  tone text NOT NULL DEFAULT 'sky',
  -- Искры: награда за верные прогнозы. Не покупаются и не выводятся.
  sparks integer NOT NULL DEFAULT 500 CHECK (sparks >= 0),
  banned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE password_resets (
  user_id uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0
);

CREATE TABLE categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  group_name text NOT NULL,
  tone text NOT NULL,
  position integer NOT NULL
);

INSERT INTO categories (id, name, group_name, tone, position) VALUES
  ('talk', 'Просто общение', 'IRL', 'mint', 1),
  ('games', 'Игры', 'Игры', 'sky', 2),
  ('strategy', 'Стратегии', 'Игры', 'sky', 3),
  ('shooters', 'Шутеры', 'Игры', 'butter', 4),
  ('music', 'Музыка', 'Творчество', 'lavender', 5),
  ('art', 'Искусство', 'Творчество', 'rose', 6),
  ('food', 'Кулинария', 'IRL', 'peach', 7),
  ('travel', 'Путешествия', 'IRL', 'sky', 8),
  ('education', 'Обучение', 'Знания', 'lavender', 9),
  ('sport', 'Спорт', 'IRL', 'mint', 10);

-- Канал есть у каждого пользователя (1:1).
CREATE TABLE channels (
  user_id uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE,
  title text NOT NULL DEFAULT '' CHECK (char_length(title) <= 140),
  category_id text NOT NULL DEFAULT 'talk' REFERENCES categories,
  tags text[] NOT NULL DEFAULT '{}',
  stream_key text NOT NULL UNIQUE,
  live_since timestamptz,
  current_session_id bigint
);

CREATE TABLE stream_sessions (
  id bigserial PRIMARY KEY,
  channel_id uuid NOT NULL REFERENCES channels ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  title text NOT NULL,
  category_id text NOT NULL REFERENCES categories,
  peak_viewers integer NOT NULL DEFAULT 0
);
CREATE INDEX stream_sessions_channel_idx ON stream_sessions (channel_id, started_at DESC);

ALTER TABLE channels
  ADD CONSTRAINT channels_current_session_fk FOREIGN KEY (current_session_id) REFERENCES stream_sessions ON DELETE SET NULL;

CREATE TABLE follows (
  follower_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES channels ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, channel_id),
  CHECK (follower_id <> channel_id)
);
CREATE INDEX follows_channel_idx ON follows (channel_id);

CREATE TABLE chat_messages (
  id bigserial PRIMARY KEY,
  channel_id uuid NOT NULL REFERENCES channels ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX chat_messages_channel_idx ON chat_messages (channel_id, id DESC);

CREATE TABLE chat_bans (
  channel_id uuid NOT NULL REFERENCES channels ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE blocks (
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, blocked_id),
  CHECK (user_id <> blocked_id)
);

CREATE TABLE reports (
  id bigserial PRIMARY KEY,
  reporter_id uuid REFERENCES users ON DELETE SET NULL,
  target_user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  channel_id uuid REFERENCES channels ON DELETE CASCADE,
  message_id bigint REFERENCES chat_messages ON DELETE SET NULL,
  message_text text,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX reports_open_idx ON reports (created_at) WHERE status = 'open';

CREATE TABLE predictions (
  id bigserial PRIMARY KEY,
  channel_id uuid NOT NULL REFERENCES channels ON DELETE CASCADE,
  question text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 120),
  closes_at timestamptz NOT NULL,
  winning_outcome_id bigint,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX predictions_channel_idx ON predictions (channel_id, created_at DESC);

CREATE TABLE prediction_outcomes (
  id bigserial PRIMARY KEY,
  prediction_id bigint NOT NULL REFERENCES predictions ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 40),
  position integer NOT NULL
);

ALTER TABLE predictions
  ADD CONSTRAINT predictions_winner_fk FOREIGN KEY (winning_outcome_id) REFERENCES prediction_outcomes ON DELETE SET NULL;

CREATE TABLE prediction_votes (
  prediction_id bigint NOT NULL REFERENCES predictions ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  outcome_id bigint NOT NULL REFERENCES prediction_outcomes ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (prediction_id, user_id)
);

CREATE TABLE moments (
  id bigserial PRIMARY KEY,
  channel_id uuid NOT NULL REFERENCES channels ON DELETE CASCADE,
  session_id bigint NOT NULL REFERENCES stream_sessions ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('raid', 'prediction', 'chatPeak', 'giveaway', 'highlight')),
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 140),
  offset_seconds integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX moments_session_idx ON moments (session_id, offset_seconds);
CREATE INDEX moments_recent_idx ON moments (created_at DESC);
