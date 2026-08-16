import {
  allowRate,
  companyPublic,
  hasDatabaseUrl,
  insertSession,
  json,
  noBackend,
  parseRut,
  rateLimited,
  readJson,
  setSessionCookie,
  verifyCompanyPassword,
  withDb,
} from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader?.("Allow", "POST");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }
  if (!allowRate(req, "login")) return rateLimited(res);
  if (!hasDatabaseUrl()) return noBackend(res);

  const body = readJson(req);
  const rut = parseRut(body.rut);
  const password =
    typeof body.password === "string" ? body.password : typeof body.clave === "string" ? body.clave : "";
  if (!rut || !password) {
    return json(res, 400, { ok: false, reason: "invalid_payload" });
  }

  try {
    const result = await withDb(async (client) => {
      const found = await client.query(
        `SELECT id, rut, email, razon_social, password_hash, giro, direccion, logo_key, logo_content_type,
                firma_key, firma_content_type, disabled_at
         FROM companies
         WHERE rut = $1
         LIMIT 1`,
        [rut],
      );
      const row = found.rows[0];
      const ok = await verifyCompanyPassword(password, row?.password_hash);
      if (!ok || !row) {
        return { status: 401, payload: { ok: false, reason: "invalid_credentials" } };
      }
      if (row.disabled_at) {
        return { status: 403, payload: { ok: false, reason: "disabled" } };
      }
      const session = await insertSession(client, row.id);
      return {
        status: 200,
        token: session.token,
        payload: { ok: true, company: companyPublic(row) },
      };
    });

    if (!result) return noBackend(res);
    if (result.token) setSessionCookie(res, result.token);
    return json(res, result.status, result.payload);
  } catch {
    return json(res, 503, { ok: false, reason: "db_unavailable" });
  }
}
