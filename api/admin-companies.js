import { json, readJson, withDb } from "./_lib.js";
import { requireAdmin } from "./_admin.js";
import { companyAdminPublic, summarizeSubscriptions } from "./_admin-ops.js";

const COMPANY_SELECT = `c.id, c.rut, c.email, c.razon_social, c.created_at, c.disabled_at, c.plan, c.plan_until,
                  c.mp_payment_id, c.mp_preapproval_id, c.flow_order, c.flow_commerce_order,
                  c.flow_subscription_id, c.flow_token, c.flow_customer_id,
                  (c.logo_key IS NOT NULL) AS has_logo,
                  (SELECT COUNT(*)::int FROM documentos d WHERE d.company_id = c.id) AS documentos`;

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader?.("Allow", "GET, POST");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === "GET") {
    try {
      const payload = await withDb(async (client) => {
        const found = await client.query(
          `SELECT ${COMPANY_SELECT}
           FROM companies c
           ORDER BY c.created_at DESC
           LIMIT 500`,
        );
        const plans = await client.query(`SELECT plan, plan_until FROM companies`);
        return {
          companies: found.rows.map((row) => companyAdminPublic(row)),
          summary: summarizeSubscriptions(plans.rows),
          listed: found.rows.length,
        };
      });
      if (!payload) return json(res, 503, { ok: false, reason: "db_unavailable" });
      return json(res, 200, { ok: true, ...payload });
    } catch {
      return json(res, 503, { ok: false, reason: "db_unavailable" });
    }
  }

  const body = readJson(req);
  const id = String(body.id || "").trim();
  if (!id) return json(res, 400, { ok: false, reason: "invalid_payload" });
  const disabled = body.disabled == null ? null : Boolean(body.disabled);
  const plan = body.plan == null ? null : String(body.plan).toLowerCase() === "pro" ? "pro" : "gratis";
  if (disabled == null && plan == null) {
    return json(res, 400, { ok: false, reason: "invalid_payload" });
  }

  try {
    const result = await withDb(async (client) => {
      const updated = await client.query(
        `UPDATE companies
         SET disabled_at = CASE
               WHEN $2::boolean IS NULL THEN disabled_at
               WHEN $2 THEN COALESCE(disabled_at, NOW())
               ELSE NULL
             END,
             plan = COALESCE($3, plan),
             plan_until = CASE
               WHEN $3 IS NULL THEN plan_until
               WHEN $3 = 'pro' THEN NULL
               ELSE NULL
             END,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, rut, email, razon_social, created_at, disabled_at, plan, plan_until,
                   mp_payment_id, mp_preapproval_id, flow_order, flow_commerce_order,
                   flow_subscription_id, flow_token, flow_customer_id,
                   (logo_key IS NOT NULL) AS has_logo,
                   (SELECT COUNT(*)::int FROM documentos d WHERE d.company_id = companies.id) AS documentos`,
        [id, disabled, plan],
      );
      return { row: updated.rows[0] || null };
    });
    if (!result) return json(res, 503, { ok: false, reason: "db_unavailable" });
    if (!result.row) return json(res, 404, { ok: false, reason: "not_found" });
    return json(res, 200, { ok: true, company: companyAdminPublic(result.row) });
  } catch {
    return json(res, 503, { ok: false, reason: "db_unavailable" });
  }
}
