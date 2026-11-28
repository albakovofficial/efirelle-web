-- Модерация чата и статистика канала.

-- Медленный режим (секунд между сообщениями одного зрителя; 0 — выключен),
-- «писать могут только подписчики» и запрещённые слова канала.
ALTER TABLE channels
  ADD COLUMN slow_mode_seconds integer NOT NULL DEFAULT 0 CHECK (slow_mode_seconds IN (0, 5, 10, 30, 60)),
  ADD COLUMN followers_only boolean NOT NULL DEFAULT false,
  ADD COLUMN blocked_words text[] NOT NULL DEFAULT '{}' CHECK (cardinality(blocked_words) <= 50);

-- Сколько сообщений за эфир не попало в чат из-за фильтра слов.
ALTER TABLE stream_sessions ADD COLUMN hidden_messages integer NOT NULL DEFAULT 0;

-- Число зрителей эфира раз в полминуты — для графика и среднего.
CREATE TABLE stream_viewer_samples (
  session_id bigint NOT NULL REFERENCES stream_sessions ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  viewers integer NOT NULL CHECK (viewers >= 0),
  PRIMARY KEY (session_id, at)
);

-- Быстрый поиск последнего сообщения зрителя в чате — для медленного режима.
CREATE INDEX chat_messages_author_idx ON chat_messages (channel_id, user_id, created_at DESC);
-- Новые подписчики за период.
CREATE INDEX follows_channel_created_idx ON follows (channel_id, created_at);
