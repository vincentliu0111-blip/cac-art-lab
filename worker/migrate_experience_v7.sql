-- Apply this to the existing D1 database before deploying the v7 Worker.
-- The original 60-pair choices table and its records are untouched.
CREATE TABLE IF NOT EXISTS experience_choices (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  round_id TEXT NOT NULL,
  dataset_version TEXT NOT NULL,
  pair_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 10),
  left_artwork_id TEXT NOT NULL,
  right_artwork_id TEXT NOT NULL,
  choice TEXT NOT NULL CHECK (choice IN ('A','B','skip')),
  layout TEXT NOT NULL CHECK (layout IN ('side-by-side','stacked')),
  source TEXT NOT NULL,
  mood TEXT NOT NULL,
  interests_json TEXT NOT NULL,
  language TEXT NOT NULL,
  shown_at TEXT NOT NULL,
  chosen_at TEXT NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  received_at TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('production','test')),
  payload_json TEXT NOT NULL,
  UNIQUE (session_id,round_id,pair_id),
  UNIQUE (session_id,round_id,position)
);
CREATE INDEX IF NOT EXISTS experience_community
  ON experience_choices (environment,dataset_version,pair_id,choice);
CREATE INDEX IF NOT EXISTS experience_export
  ON experience_choices (environment,dataset_version,received_at,id);
