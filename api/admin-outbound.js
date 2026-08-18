import { json, newId, readJson, withDb } from "./_lib.js";
import { requireAdmin } from "./_admin.js";
import { parseProductoPeriod, periodSinceIso } from "./_admin-ops.js";
import {
  countAltasMismoCorreo,
  fetchResendEmailStatus,
  outboundPublic,
  parseOutboundPayload,
  resendApiKey,
  summarizeOutbound,
} from "./_outbound.js";

const REFRESH_LIMIT = 25;

async function maybeRefreshEstados(client, rows, deps) {
  if (!resendApiKey(deps.env || process.env)) {
    return { refreshed: 0, attempted: false };
  }
  const pending = (rows || []).filter((row) => {
    const estado = String(row.estado || "");
    return row.resend_id && (estado === "sent" || estado === "unknown");
  }).slice(0, REFRESH_LIMIT);
  let refreshed = 0;
  for (const row of pending) {
    const next = await fetchResendEmailStatus(row.resend_id, deps);
    if (!next || next === row.estado) continue;
    await client.query(
      `UPDATE outbound_sends SET estado = $2, updated_at = NOW() WHERE id = $1`,
      [row.id, next],
    );
    row.estado = next;
    refreshed += 1;
  }
  return { refreshed, attempted: true };
}

export async function handleAdminOutbound(req, res, deps = {}) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader?.("Allow", "GET, POST");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }
  const require = deps.requireAdmin || requireAdmin;
  const admin = await require(req, res);
  if (!admin) return;
  const db = deps.withDb || withDb;

  if (req.method === "POST") {
    const payload = parseOutboundPayload(readJson(req));
    if (!payload) return json(res, 400, { ok: false, reason: "invalid_payload" });
    try {
      const saved = await db(async (client) => {
        const id = newId();
        const inserted = await client.query(
          `INSERT INTO outbound_sends
             (id, empresa, email, rubro, resend_id, lote, estado, baja, responded, utm_content)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id, created_at, empresa, email, rubro, lote, estado, baja, responded, utm_content`,
          [
            id,
            payload.empresa || null,
            payload.email,
            payload.rubro || null,
            payload.resendId,
            payload.lote,
            payload.estado,
            payload.baja,
            payload.responded,
            payload.utmContent || null,
          ],
        );
        return inserted.rows[0] || null;
      });
      if (!saved) return json(res, 503, { ok: false, reason: "db_unavailable" });
      return json(res, 200, { ok: true, send: outboundPublic(saved) });
    } catch {
      return json(res, 503, { ok: false, reason: "db_unavailable" });
    }
  }

  const url = typeof req.url === "string" ? req.url : "";
  const qs = url.includes("?") ? new URLSearchParams(url.slice(url.indexOf("?") + 1)) : new URLSearchParams();
  const periodDays = parseProductoPeriod(qs.get("period") || req.query?.period);
  const now = deps.now || Date.now();
  const since = periodSinceIso(periodDays, now);

  try {
    const payload = await db(async (client) => {
      const found = await client.query(
        `SELECT id, created_at, empresa, email, rubro, resend_id, lote, estado, baja, responded, utm_content
         FROM outbound_sends
         WHERE created_at >= $1
         ORDER BY created_at DESC
         LIMIT 200`,
        [since],
      );
      const refresh = await maybeRefreshEstados(client, found.rows, deps);
      const emails = await client.query(
        `SELECT DISTINCT lower(c.email) AS email
         FROM companies c
         INNER JOIN outbound_sends o ON lower(c.email) = lower(o.email)
         WHERE o.created_at >= $1`,
        [since],
      );
      const summary = summarizeOutbound(found.rows);
      summary.altasMismoCorreo = countAltasMismoCorreo(found.rows, emails.rows.map((row) => row.email));
      return {
        summary,
        sends: found.rows.map(outboundPublic),
        listed: found.rows.length,
        resend: { refresh: refresh.attempted, refreshed: refresh.refreshed },
      };
    });
    if (!payload) return json(res, 503, { ok: false, reason: "db_unavailable" });
    return json(res, 200, { ok: true, periodDays, since, ...payload });
  } catch {
    return json(res, 503, { ok: false, reason: "db_unavailable" });
  }
}

export default async function handler(req, res) {
  return handleAdminOutbound(req, res);
}
