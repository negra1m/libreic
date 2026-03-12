-- LibreIC — Initial Migration
-- Run: psql $DATABASE_URL -f lib/db/migrations/0000_init.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enums
DO $$ BEGIN
  CREATE TYPE plan AS ENUM ('free', 'pro', 'creator');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE source_type AS ENUM ('link', 'youtube', 'reel', 'pdf', 'audio', 'image', 'note', 'internal');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE status AS ENUM ('saved', 'pending', 'seen', 'summarized', 'applied', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE relation_type AS ENUM ('complementa', 'aprofunda', 'originou', 'contradiz', 'generaliza');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  image               TEXT,
  email_verified      TIMESTAMPTZ,
  password            TEXT,
  plan                plan NOT NULL DEFAULT 'free',
  storage_limit_bytes BIGINT NOT NULL DEFAULT 524288000,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NextAuth
CREATE TABLE IF NOT EXISTS accounts (
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                 TEXT NOT NULL,
  provider             TEXT NOT NULL,
  provider_account_id  TEXT NOT NULL,
  refresh_token        TEXT,
  access_token         TEXT,
  expires_at           INTEGER,
  token_type           TEXT,
  scope                TEXT,
  id_token             TEXT,
  session_state        TEXT,
  PRIMARY KEY (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  session_token TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires       TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token      TEXT NOT NULL,
  expires    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Themes
CREATE TABLE IF NOT EXISTS themes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES themes(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  icon       TEXT,
  color      TEXT DEFAULT '#6366f1',
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_themes_user ON themes(user_id, parent_id);

-- Blocks
CREATE TABLE IF NOT EXISTS blocks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  source_url       TEXT,
  source_type      source_type NOT NULL,
  thumbnail_url    TEXT,
  body_text        TEXT,
  personal_note    TEXT,
  summary          TEXT,
  main_insight     TEXT,
  action_item      TEXT,
  importance       SMALLINT NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  status           status NOT NULL DEFAULT 'saved',
  file_path        TEXT,
  file_name        TEXT,
  file_size_bytes  BIGINT,
  duration         INTEGER,
  review_due_at    TIMESTAMPTZ,
  last_reviewed_at TIMESTAMPTZ,
  review_count     INTEGER NOT NULL DEFAULT 0,
  is_public        BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blocks_user_status  ON blocks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_blocks_user_type    ON blocks(user_id, source_type);
CREATE INDEX IF NOT EXISTS idx_blocks_user_created ON blocks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_review       ON blocks(user_id, review_due_at) WHERE review_due_at IS NOT NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_blocks_fts ON blocks USING GIN (
  to_tsvector('portuguese',
    coalesce(title, '') || ' ' ||
    coalesce(body_text, '') || ' ' ||
    coalesce(personal_note, '') || ' ' ||
    coalesce(summary, '') || ' ' ||
    coalesce(main_insight, '')
  )
);

-- Trigram index para busca parcial no título
CREATE INDEX IF NOT EXISTS idx_blocks_title_trgm ON blocks USING GIN (title gin_trgm_ops);

-- Block ↔ Theme
CREATE TABLE IF NOT EXISTS block_themes (
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  PRIMARY KEY (block_id, theme_id)
);
CREATE INDEX IF NOT EXISTS idx_block_themes_theme ON block_themes(theme_id);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  UNIQUE (user_id, name)
);
CREATE INDEX IF NOT EXISTS idx_tags_user_name ON tags(user_id, name);
CREATE INDEX IF NOT EXISTS idx_tags_name_trgm ON tags USING GIN (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS block_tags (
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (block_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_block_tags_tag ON block_tags(tag_id);

-- Block Connections
CREATE TABLE IF NOT EXISTS block_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  target_id     UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  relation_type relation_type NOT NULL DEFAULT 'complementa',
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_id <> target_id)
);
CREATE INDEX IF NOT EXISTS idx_connections_source ON block_connections(source_id);
CREATE INDEX IF NOT EXISTS idx_connections_target ON block_connections(target_id);

-- Collections
CREATE TABLE IF NOT EXISTS collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collection_blocks (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  block_id      UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, block_id)
);
