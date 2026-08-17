import { createHmac, timingSafeEqual } from "node:crypto";
import { publicOrigin } from "./_lib.js";

export const PRO_NET_CLP = 14990;
export const PRO_IVA_RATE = 0.19;
export const PRO_AMOUNT_CLP = 17838;
export const PRO_DAYS = 31;
export const MP_API = "https://api.mercadopago.com";

function envFirst(...names) {
  for (const name of names) {
    const value = String(process.env[name] || "").trim();
    if (value) return value;
  }
  return "";
}

export const MP_TOKEN_ENV = [
  "Mp:access_token",
  "mp_access",
  "MP_ACCESS_TOKEN",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MP_ACCESS_TOKEN_PROD",
  "MP_ACCESS",
];

export function mpAccessToken() {
  return envFirst(...MP_TOKEN_ENV);
}

export function mpWebhookSecret() {
  return envFirst("MP_WEBHOOK_SECRET", "MERCADOPAGO_WEBHOOK_SECRET");
}

export function hasMp() {
  return Boolean(mpAccessToken());
}

export function header(req, name) {
  const h = req?.headers || {};
  const key = String(name).toLowerCase();
  const raw = h[key] ?? h[name];
  if (Array.isArray(raw)) return String(raw[0] || "").trim();
  return String(raw || "").trim();
}

export function queryParam(req, name) {
  const q = req?.query;
  if (q && Object.prototype.hasOwnProperty.call(q, name) && q[name] != null) {
    const raw = q[name];
    return String(Array.isArray(raw) ? raw[0] : raw).trim();
  }
  try {
    const url = new URL(String(req?.url || ""), "https://www.haberes.cl");
    return String(url.searchParams.get(name) || "").trim();
  } catch {
    return "";
  }
}

export function parseMpSignature(raw) {
  const out = { ts: "", v1: "" };
  for (const part of String(raw || "").split(",")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === "ts") out.ts = v;
    if (k === "v1") out.v1 = v;
  }
  return out;
}

export function mpManifest({ dataId, requestId, ts }) {
  const parts = [];
  if (dataId) parts.push(`id:${String(dataId).toLowerCase()}`);
  if (requestId) parts.push(`request-id:${requestId}`);
  if (ts) parts.push(`ts:${ts}`);
  return `${parts.join(";")};`;
}

function safeEqualHex(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (!left || !right || left.length !== right.length) return false;
  try {
    return timingSafeEqual(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
  } catch {
    return false;
  }
}

export function verifyMpSignature({ secret, xSignature, xRequestId, dataId }) {
  const key = String(secret || "").trim();
  if (!key) return false;
  const { ts, v1 } = parseMpSignature(xSignature);
  if (!ts || !v1) return false;
  const manifest = mpManifest({ dataId, requestId: String(xRequestId || "").trim(), ts });
  const digest = createHmac("sha256", key).update(manifest, "utf8").digest("hex");
  return safeEqualHex(digest, v1);
}

export async function mpRequest(path, { method = "GET", body, fetchImpl = fetch } = {}) {
  const token = mpAccessToken();
  if (!token) return { ok: false, status: 501, data: null, reason: "mp_unavailable" };
  const res = await fetchImpl(`${MP_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

function checkoutUrls() {
  const origin = publicOrigin() || "https://www.haberes.cl";
  return {
    origin,
    success: `${origin}/empresa?pago=ok`,
    failure: `${origin}/empresa?pago=fail`,
    pending: `${origin}/empresa?pago=pending`,
    notification: `${origin}/api/mp-webhook`,
  };
}

function preferencePayload(company) {
  const urls = checkoutUrls();
  return {
    items: [
      {
        id: "haberes-pro-mes",
        title: "Haberes Pro (1 mes)",
        description: "Plan Pro: carga masiva, plantillas de pago y movimientos sin tope. $14.990 + IVA.",
        quantity: 1,
        unit_price: PRO_AMOUNT_CLP,
        currency_id: "CLP",
      },
    ],
    payer: { email: String(company?.email || "").trim() },
    external_reference: String(company?.id || ""),
    back_urls: {
      success: urls.success,
      failure: urls.failure,
      pending: urls.pending,
    },
    auto_return: "approved",
    notification_url: urls.notification,
    statement_descriptor: "HABERES PRO",
    metadata: { company_id: String(company?.id || "") },
  };
}

function preapprovalPayload(company) {
  const urls = checkoutUrls();
  return {
    reason: "Haberes Pro",
    external_reference: String(company?.id || ""),
    payer_email: String(company?.email || "").trim(),
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: PRO_AMOUNT_CLP,
      currency_id: "CLP",
    },
    back_url: urls.success,
    status: "pending",
    notification_url: urls.notification,
  };
}

export async function createPreapproval(company, { fetchImpl = fetch } = {}) {
  const email = String(company?.email || "").trim();
  if (!email || !company?.id) return { ok: false, reason: "invalid_payload" };
  const result = await mpRequest("/preapproval", {
    method: "POST",
    body: preapprovalPayload(company),
    fetchImpl,
  });
  const init_point = result.data?.init_point || result.data?.sandbox_init_point || "";
  if (!result.ok || !init_point) return { ok: false, reason: "mp_error", status: result.status };
  return { ok: true, init_point, kind: "preapproval" };
}

export async function createPreference(company, { fetchImpl = fetch } = {}) {
  if (!company?.id) return { ok: false, reason: "invalid_payload" };
  const result = await mpRequest("/checkout/preferences", {
    method: "POST",
    body: preferencePayload(company),
    fetchImpl,
  });
  const init_point = result.data?.init_point || result.data?.sandbox_init_point || "";
  if (!result.ok || !init_point) return { ok: false, reason: "mp_error", status: result.status };
  return { ok: true, init_point, kind: "preference" };
}

export async function createProCheckout(company, { fetchImpl = fetch } = {}) {
  if (!hasMp()) return { ok: false, reason: "mp_unavailable" };
  const sub = await createPreapproval(company, { fetchImpl });
  if (sub.ok) return sub;
  return createPreference(company, { fetchImpl });
}

function addDays(from, days) {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export async function applyFetchedPayment(client, payment) {
  const companyId = String(payment?.external_reference || "").trim();
  const paymentId = String(payment?.id || "").trim();
  const status = String(payment?.status || "").toLowerCase();
  if (!client || !companyId || !paymentId) return { applied: false, reason: "invalid" };

  if (status === "approved") {
    const amount = Number(payment.transaction_amount);
    const currency = String(payment.currency_id || "CLP").toUpperCase();
    if (currency !== "CLP") return { applied: false, reason: "currency" };
    if (Number.isFinite(amount) && amount + 0.5 < PRO_AMOUNT_CLP) {
      return { applied: false, reason: "amount" };
    }
    const found = await client.query(
      `SELECT id, plan, mp_payment_id, plan_until FROM companies WHERE id = $1 LIMIT 1`,
      [companyId],
    );
    const row = found.rows[0];
    if (!row) return { applied: false, reason: "not_found" };
    if (String(row.mp_payment_id || "") === paymentId && String(row.plan || "").toLowerCase() === "pro") {
      return { applied: true, reason: "idempotent", plan: "pro" };
    }
    const now = new Date();
    const currentUntil = row.plan_until ? new Date(row.plan_until) : null;
    const start =
      currentUntil && Number.isFinite(currentUntil.getTime()) && currentUntil > now ? currentUntil : now;
    const until = addDays(start, PRO_DAYS);
    await client.query(
      `UPDATE companies
       SET plan = 'pro', mp_payment_id = $2, plan_until = $3, updated_at = NOW()
       WHERE id = $1`,
      [companyId, paymentId, until.toISOString()],
    );
    return { applied: true, plan: "pro", until: until.toISOString() };
  }

  if (status === "refunded" || status === "cancelled" || status === "charged_back") {
    const updated = await client.query(
      `UPDATE companies
       SET plan = 'gratis', plan_until = NULL, updated_at = NOW()
       WHERE id = $1 AND mp_payment_id = $2
       RETURNING id`,
      [companyId, paymentId],
    );
    return { applied: updated.rowCount > 0, plan: "gratis" };
  }

  return { applied: false, reason: "ignored" };
}

export async function applyFetchedPreapproval(client, preapproval) {
  const companyId = String(preapproval?.external_reference || "").trim();
  const preId = String(preapproval?.id || "").trim();
  const status = String(preapproval?.status || "").toLowerCase();
  if (!client || !companyId || !preId) return { applied: false, reason: "invalid" };

  if (status === "authorized") {
    await client.query(
      `UPDATE companies
       SET plan = 'pro', mp_preapproval_id = $2, plan_until = NULL, updated_at = NOW()
       WHERE id = $1`,
      [companyId, preId],
    );
    return { applied: true, plan: "pro" };
  }

  if (status === "cancelled" || status === "paused" || status === "expired") {
    const updated = await client.query(
      `UPDATE companies
       SET plan = 'gratis', updated_at = NOW()
       WHERE id = $1 AND mp_preapproval_id = $2
       RETURNING id`,
      [companyId, preId],
    );
    return { applied: updated.rowCount > 0, plan: "gratis" };
  }

  return { applied: false, reason: "ignored" };
}

export function notificationIds(req, body) {
  const dataId = queryParam(req, "data.id") || String(body?.data?.id || "").trim();
  const type = (
    queryParam(req, "type") ||
    queryParam(req, "topic") ||
    String(body?.type || body?.action || "")
  ).toLowerCase();
  const legacyId = queryParam(req, "id");
  return { dataId: dataId || legacyId, type, queryDataId: queryParam(req, "data.id") };
}
