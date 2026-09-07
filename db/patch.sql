-- db/patch.sql
-- Applies the v1.1 schema changes for articles, events, and team image_base64

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS image_base64 TEXT;

CREATE TABLE IF NOT EXISTS events (
  id             SERIAL PRIMARY KEY,
  title          TEXT NOT NULL,
  date           TEXT NOT NULL,
  description    TEXT,
  guest          TEXT,
  image_base64   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS articles (
  id             TEXT PRIMARY KEY,
  type           TEXT DEFAULT 'internal',
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  title          TEXT NOT NULL,
  author         TEXT NOT NULL,
  date           TEXT,
  excerpt        TEXT,
  color          TEXT,
  body           JSONB,
  submitted_by   TEXT,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at    TIMESTAMPTZ,
  image_base64   TEXT
);
