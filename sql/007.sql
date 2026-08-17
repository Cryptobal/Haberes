-- Flow.cl: ids de cobro de un mes Pro. Incremental; safe to re-run. No card data. No secrets.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS flow_token TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS flow_order TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS flow_commerce_order TEXT;

CREATE INDEX IF NOT EXISTS companies_flow_token_idx ON companies (flow_token);
CREATE INDEX IF NOT EXISTS companies_flow_commerce_order_idx ON companies (flow_commerce_order);
