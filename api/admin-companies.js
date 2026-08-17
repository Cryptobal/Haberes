import { effectivePlan, json, readJson, withDb } from "./_lib.js";
import { requireAdmin } from "./_admin.js";

function companyAdminPublic(row) {
  if (!row) return null;
  return {
    id: row.id,
    rut: row.rut,
    email: row.email,
    razonSocial: row.razon_social,
    createdAt: row.created_at,
    disabled: Boolean(row.disabled_at),
    plan: effectivePlan(row),
    planUntil: row.plan_until ? new Date(row.plan_until).toISOString() : null,
    hasLogo: Boolean(row.has_logo),
    documentos: Number(row.documentos) || 0,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader?.("Allow", "GET, POST");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === "GET") {
    try {
      const rows = await withDb(async (client) => {
        const found = await client.query(
          `SELECT c.id, c.rut, c.email, c.razon_social, c.created_at, c.disabled_at, c.plan, c.plan_until,
                  (c.logo_key IS NOT NULL) AS has_logo,
                  (SELECT COUNT(*)::int FROM documentos d WHERE d.company_id = c.id) AS documentos
           FROM companies c
           ORDER BY c.created_at DESC
           LIMIT 500`,
        );
        return found.rows;
      });
      if (!rows) return json(res, 503, { ok: false, reason: "db_unavailable" });
      return json(res, 200, { ok: true, companies: rows.map(companyAdminPublic) });
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
