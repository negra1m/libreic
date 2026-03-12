-- Adiciona visibilidade nos temas
ALTER TABLE themes ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

-- Membros de temas privados (grupos)
CREATE TABLE IF NOT EXISTS theme_members (
  theme_id   UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (theme_id, user_id)
);

-- Convites para temas privados
CREATE TABLE IF NOT EXISTS theme_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id    UUID NOT NULL REFERENCES themes(id)  ON DELETE CASCADE,
  invited_by  UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL DEFAULT 'member',
  expires_at  TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
