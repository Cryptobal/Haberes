-- Haberes company profile (Postgres). Incremental; safe to re-run.
-- Structured data only. Logo and PDF bytes live in R2; here we store object keys.
-- Apply with DATABASE_URL or DATABASE_URL_UNPOOLED, or it runs on first API request.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS giro TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_key TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_content_type TEXT;

CREATE TABLE IF NOT EXISTS documentos (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  object_key TEXT NOT NULL,
  content_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documentos_company_id_idx ON documentos (company_id);
CREATE INDEX IF NOT EXISTS documentos_created_at_idx ON documentos (created_at);
