-- Admin sessions, company disable flag, and legal signature object key.
-- Incremental; safe to re-run. Signature bytes live in R2; here only the key.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS firma_key TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS firma_content_type TEXT;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_sessions_token_hash_idx ON admin_sessions (token_hash);
CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx ON admin_sessions (expires_at);
