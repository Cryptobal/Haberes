import {
  companyPublic,
  hasDatabaseUrl,
  json,
  loadSessionCompany,
  newId,
  noBackend,
  readJson,
  readSessionToken,
  requireCompany,
  withDb,
} from "./_lib.js";

export const GRATIS_LIMITE = 5;

export function periodoMes(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function isProPlan(row) {
  return String(row?.plan || "gratis").toLowerCase() === "pro";
}

export async function countMovimientos(client, companyId, periodo) {
  const found = await client.query(
    `SELECT COUNT(*)::int AS n FROM movimientos WHERE company_id = $1 AND periodo = $2`,
    [companyId, periodo],
  );
  return Number(found.rows[0]?.n) || 0;
}

export function normalizeKeys(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const key = String(item || "").trim().slice(0, 80);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out.slice(0, 200);
}

export async function applyMovimientos(client, company, { tipo, keys, commit = true }) {
  const periodo = periodoMes();
  const pro = isProPlan(company);
  const usados = await countMovimientos(client, company.id, periodo);
  if (!pro && keys.length > 1) {
    return { status: 403, body: { ok: false, reason: "uno_a_uno", usados, limite: GRATIS_LIMITE } };
  }
  let inserted = 0;
  for (const key of keys) {
    const exists = await client.query(
      `SELECT 1 FROM movimientos WHERE company_id = $1 AND periodo = $2 AND tipo = $3 AND trabajador_key = $4 LIMIT 1`,
      [company.id, periodo, tipo, key],
    );
    if (exists.rowCount) continue;
    if (!pro && usados + inserted + 1 > GRATIS_LIMITE) {
      return {
        status: 403,
        body: { ok: false, reason: "limite_gratis", usados: usados + inserted, limite: GRATIS_LIMITE },
      };
    }
    if (commit) {
      await client.query(
        `INSERT INTO movimientos (id, company_id, tipo, trabajador_key, periodo)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (company_id, periodo, tipo, trabajador_key) DO NOTHING`,
        [newId(), company.id, tipo, key, periodo],
      );
    }
    inserted += 1;
  }
  const total = commit ? await countMovimientos(client, company.id, periodo) : usados + inserted;
  return {
    status: 200,
    body: {
      ok: true,
      plan: company.plan || "gratis",
      movimientosMes: total,
      limite: pro ? null : GRATIS_LIMITE,
      company: companyPublic(company),
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader?.("Allow", "GET, POST");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }
  if (!hasDatabaseUrl()) return noBackend(res);

  if (req.method === "GET") {
    const token = readSessionToken(req);
    if (!token) return json(res, 401, { ok: false, reason: "unauthorized" });
    try {
      const payload = await withDb(async (client) => {
        const row = await loadSessionCompany(client, token);
        if (!row) return { status: 401, body: { ok: false, reason: "unauthorized" } };
        const periodo = periodoMes();
        const usados = await countMovimientos(client, row.id, periodo);
        return {
          status: 200,
          body: {
            ok: true,
            company: companyPublic(row),
            plan: row.plan || "gratis",
            movimientosMes: usados,
            limite: isProPlan(row) ? null : GRATIS_LIMITE,
          },
        };
      });
      if (!payload) return noBackend(res);
      return json(res, payload.status, payload.body);
    } catch {
      return json(res, 503, { ok: false, reason: "db_unavailable" });
    }
  }

  const company = await requireCompany(req, res);
  if (!company) return;

  const body = readJson(req);
  const tipo = body.tipo === "finiquito" ? "finiquito" : body.tipo === "liquidacion" ? "liquidacion" : "";
  if (!tipo) return json(res, 400, { ok: false, reason: "invalid_payload" });
  const keys = normalizeKeys(body.keys);
  if (!keys.length) return json(res, 400, { ok: false, reason: "invalid_payload" });

  try {
    const result = await withDb(async (client) => applyMovimientos(client, company, { tipo, keys, commit: true }));
    if (!result) return noBackend(res);
    return json(res, result.status, result.body);
  } catch {
    return json(res, 503, { ok: false, reason: "db_unavailable" });
  }
}
