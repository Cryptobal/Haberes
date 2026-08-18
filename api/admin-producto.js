import { json, withDb } from "./_lib.js";
import { requireAdmin } from "./_admin.js";
import { parseProductoPeriod, periodSinceIso, productoFromCounts } from "./_admin-ops.js";

export async function handleAdminProducto(req, res, deps = {}) {
  if (req.method !== "GET") {
    res.setHeader?.("Allow", "GET");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }
  const require = deps.requireAdmin || requireAdmin;
  const admin = await require(req, res);
  if (!admin) return;

  const url = typeof req.url === "string" ? req.url : "";
  const qs = url.includes("?") ? new URLSearchParams(url.slice(url.indexOf("?") + 1)) : new URLSearchParams();
  const periodDays = parseProductoPeriod(qs.get("period") || req.query?.period);
  const now = deps.now || Date.now();
  const since = periodSinceIso(periodDays, now);
  const db = deps.withDb || withDb;

  try {
    const counts = await db(async (client) => {
      const [accounts, documents, movements, envios] = await Promise.all([
        client.query(`SELECT COUNT(*)::int AS n FROM companies WHERE created_at >= $1`, [since]),
        client.query(`SELECT COUNT(*)::int AS n FROM documentos WHERE created_at >= $1`, [since]),
        client.query(`SELECT COUNT(*)::int AS n FROM movimientos WHERE created_at >= $1`, [since]),
        client.query(`SELECT COUNT(*)::int AS n FROM envios WHERE created_at >= $1`, [since]),
      ]);
      return {
        accountsNew: accounts.rows[0]?.n,
        documents: documents.rows[0]?.n,
        movements: movements.rows[0]?.n,
        envios: envios.rows[0]?.n,
      };
    });
    if (!counts) return json(res, 503, { ok: false, reason: "db_unavailable" });
    return json(res, 200, { ok: true, producto: productoFromCounts(counts, periodDays, since) });
  } catch {
    return json(res, 503, { ok: false, reason: "db_unavailable" });
  }
}

export default async function handler(req, res) {
  return handleAdminProducto(req, res);
}
