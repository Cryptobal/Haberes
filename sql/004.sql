-- Plan Gratis/Pro and monthly document movements. Incremental; safe to re-run.
-- No payment provider. Plan is an operator flag (default gratis).

ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'gratis';

CREATE TABLE IF NOT EXISTS movimientos (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  trabajador_key TEXT NOT NULL,
  periodo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS movimientos_unique_mes
  ON movimientos (company_id, periodo, tipo, trabajador_key);

CREATE INDEX IF NOT EXISTS movimientos_company_periodo_idx
  ON movimientos (company_id, periodo);
