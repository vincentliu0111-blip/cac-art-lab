CREATE TABLE IF NOT EXISTS test_sessions (
  session_id TEXT PRIMARY KEY,
  registered_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS choices (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  round_id TEXT NOT NULL,
  dataset_version TEXT NOT NULL,
  pair_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  a_artwork_id TEXT NOT NULL,
  b_artwork_id TEXT NOT NULL,
  choice TEXT NOT NULL CHECK (choice IN ('A', 'B')),
  layout TEXT NOT NULL CHECK (layout IN ('side-by-side', 'stacked')),
  shown_at TEXT NOT NULL,
  chosen_at TEXT NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  received_at TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('production', 'test')),
  payload_json TEXT NOT NULL,
  UNIQUE (session_id, round_id, pair_id),
  UNIQUE (session_id, round_id, position)
);

CREATE INDEX IF NOT EXISTS choices_export_order
  ON choices (environment, dataset_version, received_at, id);
