-- Envíos outbound (outreach). Incremental; safe to re-run.
-- No se guardan claves de Resend ni tasas de apertura inventadas.

CREATE TABLE IF NOT EXISTS outbound_sends (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  empresa TEXT,
  email TEXT NOT NULL,
  rubro TEXT,
  resend_id TEXT,
  lote DATE,
  estado TEXT NOT NULL DEFAULT 'unknown',
  baja BOOLEAN NOT NULL DEFAULT FALSE,
  responded BOOLEAN,
  utm_content TEXT
);

CREATE INDEX IF NOT EXISTS outbound_sends_created_at_idx ON outbound_sends (created_at DESC);
CREATE INDEX IF NOT EXISTS outbound_sends_email_idx ON outbound_sends (email);
CREATE INDEX IF NOT EXISTS outbound_sends_resend_id_idx ON outbound_sends (resend_id);
CREATE INDEX IF NOT EXISTS outbound_sends_lote_idx ON outbound_sends (lote);
