-- Registro de envío de documentos por correo. Incremental; safe to re-run.
CREATE TABLE IF NOT EXISTS envios (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  documento_id TEXT REFERENCES documentos (id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  trabajador_key TEXT NOT NULL,
  email TEXT NOT NULL,
  periodo TEXT,
  status TEXT NOT NULL,
  provider_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS envios_company_created_idx ON envios (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS envios_company_trabajador_idx ON envios (company_id, trabajador_key);
