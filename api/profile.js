import {
  companyPublic,
  json,
  parseDireccion,
  parseGiro,
  parseRazonSocial,
  requireCompany,
  withDb,
} from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST" && req.method !== "PUT") {
    res.setHeader?.("Allow", "GET, POST, PUT");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }

  const company = await requireCompany(req, res);
  if (!company) return;

  if (req.method === "GET") {
    return json(res, 200, { ok: true, company: companyPublic(company) });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const giro = parseGiro(body.giro);
  const direccion = parseDireccion(body.direccion);
  if (giro == null || direccion == null) {
    return json(res, 400, { ok: false, reason: "invalid_payload" });
  }
  const razon = parseRazonSocial(body.razonSocial ?? body.razon_social ?? company.razon_social);
  if (!razon) return json(res, 400, { ok: false, reason: "invalid_payload" });

  try {
    const row = await withDb(async (client) => {
      const updated = await client.query(
        `UPDATE companies
         SET giro = $1, direccion = $2, razon_social = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [giro, direccion, razon, company.id],
      );
      return updated.rows[0];
    });
    if (!row) return json(res, 503, { ok: false, reason: "db_unavailable" });
    return json(res, 200, { ok: true, company: companyPublic(row) });
  } catch {
    return json(res, 503, { ok: false, reason: "db_unavailable" });
  }
}
