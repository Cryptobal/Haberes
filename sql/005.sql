-- Mercado Pago Checkout Pro: ids de cobro y vigencia del mes Pro.
-- Incremental; safe to re-run. No card data. No secrets.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS mp_preapproval_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS companies_mp_payment_id_idx ON companies (mp_payment_id);
CREATE INDEX IF NOT EXISTS companies_mp_preapproval_id_idx ON companies (mp_preapproval_id);
CREATE INDEX IF NOT EXISTS companies_plan_until_idx ON companies (plan_until);
