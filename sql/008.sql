-- Flow.cl suscripciones: ids de plan, cliente y suscripción.
-- Incremental; safe to re-run. No card data. No secrets.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS flow_customer_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS flow_subscription_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS flow_plan_id TEXT;

CREATE INDEX IF NOT EXISTS companies_flow_customer_id_idx ON companies (flow_customer_id);
CREATE INDEX IF NOT EXISTS companies_flow_subscription_id_idx ON companies (flow_subscription_id);
