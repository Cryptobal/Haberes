/** Agregación y normalización de envíos outbound. Sin secretos. */

export const OUTBOUND_ESTADOS = ["sent", "delivered", "bounced", "complained", "unknown"];

export function resendApiKey(env = process.env) {
  return String(env.RESEND_API_KEY || env.resend_api_key || "").trim();
}

export function normalizeOutboundEstado(raw) {
  const s = String(raw || "")
    .toLowerCase()
    .trim();
  if (OUTBOUND_ESTADOS.includes(s)) return s;
  if (s === "delivery_delayed" || s === "queued" || s === "scheduled") return "sent";
  if (s === "opened" || s === "clicked") return "delivered";
  return "unknown";
}

function isBaja(row) {
  return row?.baja === true || row?.baja === "t" || row?.baja === 1 || row?.baja === "1";
}

export function summarizeOutbound(rows) {
  const list = Array.isArray(rows) ? rows : [];
  let entregados = 0;
  let rebotes = 0;
  let bajas = 0;
  for (const row of list) {
    const estado = normalizeOutboundEstado(row?.estado);
    if (estado === "delivered") entregados += 1;
    if (estado === "bounced") rebotes += 1;
    if (isBaja(row)) bajas += 1;
  }
  const enviados = list.length;
  return {
    enviados,
    entregados,
    rebotes,
    bajas,
    tasaEntrega: enviados === 0 ? 0 : entregados / enviados,
    opens: { available: false },
    clicks: { available: false },
  };
}

export function countAltasMismoCorreo(sends, companyEmails) {
  const companies = new Set(
    (companyEmails || []).map((email) => String(email || "").trim().toLowerCase()).filter(Boolean),
  );
  const seen = new Set();
  let n = 0;
  for (const row of sends || []) {
    const email = String(row?.email || "")
      .trim()
      .toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    if (companies.has(email)) n += 1;
  }
  return n;
}

export function outboundPublic(row) {
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    empresa: row.empresa || "",
    email: row.email || "",
    rubro: row.rubro || "",
    estado: normalizeOutboundEstado(row.estado),
    baja: isBaja(row),
    responded: row.responded == null ? null : Boolean(row.responded),
    lote: row.lote ? String(row.lote).slice(0, 10) : null,
    utmContent: row.utm_content || "",
  };
}

export function parseLote(raw) {
  const s = String(raw || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

export function parseOutboundPayload(body) {
  const email = String(body?.email || "")
    .trim()
    .toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return null;
  return {
    empresa: String(body.empresa || "").trim().slice(0, 200),
    email,
    rubro: String(body.rubro || "").trim().slice(0, 120),
    resendId: String(body.resend_id || body.resendId || "").trim().slice(0, 120) || null,
    lote: parseLote(body.lote),
    estado: normalizeOutboundEstado(body.estado),
    baja: Boolean(body.baja),
    responded: body.responded == null ? null : Boolean(body.responded),
    utmContent: String(body.utm_content || body.utmContent || "").trim().slice(0, 120),
  };
}

export function mapResendLastEvent(payload) {
  return normalizeOutboundEstado(payload?.last_event || payload?.lastEvent);
}

export async function fetchResendEmailStatus(resendId, deps = {}) {
  const id = String(resendId || "").trim();
  const key = resendApiKey(deps.env || process.env);
  if (!id || !key) return null;
  const fetchImpl = deps.fetchImpl || fetch;
  try {
    const res = await fetchImpl(`https://api.resend.com/emails/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return mapResendLastEvent(data);
  } catch {
    return null;
  }
}
