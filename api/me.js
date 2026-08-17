import {
  companyPublic,
  hasDatabaseUrl,
  json,
  loadSessionCompany,
  noBackend,
  readSessionToken,
  withDb,
} from "./_lib.js";
import { hasR2 } from "./_r2.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader?.("Allow", "GET");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }
  if (!hasDatabaseUrl()) return noBackend(res);

  const token = readSessionToken(req);
  if (!token) return json(res, 401, { ok: false, reason: "unauthorized" });

  try {
    let connected = false;
    const result = await withDb(async (client) => {
      connected = true;
      const row = await loadSessionCompany(client, token);
      if (!row) return { row: null, movimientosMes: 0 };
      const periodo = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      const found = await client.query(
        `SELECT COUNT(*)::int AS n FROM movimientos WHERE company_id = $1 AND periodo = $2`,
        [row.id, periodo],
      );
      return { row, movimientosMes: Number(found.rows[0]?.n) || 0 };
    });
    if (!connected) return noBackend(res);
    if (!result?.row) return json(res, 401, { ok: false, reason: "unauthorized" });
    return json(res, 200, {
      ok: true,
      company: companyPublic(result.row),
      movimientosMes: result.movimientosMes,
      limite: String(result.row.plan || "gratis").toLowerCase() === "pro" ? null : 5,
      storage: hasR2(),
    });
  } catch {
    return json(res, 503, { ok: false, reason: "db_unavailable" });
  }
}
