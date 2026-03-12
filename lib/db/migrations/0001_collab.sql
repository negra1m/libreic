-- LibreIC — Migration 0001: Collaborative features
-- Run in Supabase SQL Editor

-- Username handle para perfis públicos
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Membros de coleções colaborativas
CREATE TABLE IF NOT EXISTS collection_members (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_members_user ON collection_members(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_members_col  ON collection_members(collection_id);

-- Convites pendentes (por link ou email)
CREATE TABLE IF NOT EXISTS collection_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  invited_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email         TEXT,                          -- convite por email
  token         TEXT NOT NULL UNIQUE,          -- convite por link
  role          TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON collection_invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON collection_invites(email);
