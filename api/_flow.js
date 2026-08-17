import { createHmac, randomBytes } from "node:crypto";
import { publicOrigin } from "./_lib.js";
import { PRO_AMOUNT_CLP, PRO_DAYS, header, queryParam } from "./_mp.js";

export const FLOW_API_PROD = "https://www.flow.cl/api";
export const FLOW_API_SANDBOX = "https://sandbox.flow.cl/api";
export const FLOW_STATUS_PENDING = 1;
export const FLOW_STATUS_PAID = 2;
export const FLOW_STATUS_REJECTED = 3;
export const FLOW_STATUS_CANCELED = 4;
export const FLOW_STATUS_REFUNDED = 5;

function envFirst(...names) {
  for (const name of names) {
    const value = String(process.env[name] || "").trim();
    if (value) return value;
  }
  const wanted = new Set(names.map((n) => n.toLowerCase()));
  for (const [key, value] of Object.entries(process.env)) {
    if (!wanted.has(String(key).toLowerCase())) continue;
    const trimmed = String(value || "").trim();
    if (trimmed) return trimmed;
  }
  return "";
}

export const FLOW_API_KEY_ENV = [
  "FLOW_API_KEY",
  "flow_api_key",
  "FLOW_APIKEY",
  "FLOW_KEY",
  "API_KEY",
  "FLOW_API_KEY_PROD",
  "FLOW_APIKEY_PROD",
  "FLOW_API_KEEY",
  "FLOW_API_YKEY",
];

export const FLOW_SECRET_KEY_ENV = [
  "FLOW_SECRET_KEY",
  "flow_secret_key",
  "FLOW_SECRET",
  "SECRET_KEY",
  "FLOW_SECRET_KEY_PROD",
  "FLOW_SECRETKEY",
  "FLOW_SECREY_KEY",
];

export function flowApiKey() {
  return envFirst(...FLOW_API_KEY_ENV);
}

export function flowSecretKey() {
  return envFirst(...FLOW_SECRET_KEY_ENV);
}

export function flowApiBase() {
  const explicit = envFirst("FLOW_API_URL", "FLOW_BASE_URL", "flow_api_url", "flow_base_url");
  if (explicit) return explicit.replace(/\/+$/, "");
  const sandbox = envFirst("FLOW_SANDBOX", "flow_sandbox");
  if (sandbox === "1" || /^true|yes$/i.test(sandbox)) return FLOW_API_SANDBOX;
  return FLOW_API_PROD;
}

export function hasFlow() {
  return Boolean(flowApiKey() && flowSecretKey());
}

export function flowConfig() {
  const apiKey = flowApiKey();
  const secretKey = flowSecretKey();
  if (!apiKey || !secretKey) return null;
  return { apiKey, secretKey, apiBase: flowApiBase() };
}

/** Firma oficial Flow: claves ordenadas, key+value sin separadores, HMAC-SHA256 hex. */
export function flowSign(params, secretKey) {
  const key = String(secretKey || "");
  const src = params && typeof params === "object" ? params : {};
  const keys = Object.keys(src)
    .filter((k) => k !== "s" && src[k] != null)
    .sort();
  let toSign = "";
  for (const name of keys) toSign += name + src[name];
  return createHmac("sha256", key).update(toSign, "utf8").digest("hex");
}

export function flowFormBody(params, secretKey) {
  const signed = { ...params, s: flowSign(params, secretKey) };
  const encoded = new URLSearchParams();
  for (const [k, v] of Object.entries(signed)) {
    if (v == null) continue;
    encoded.append(k, String(v));
  }
  return encoded.toString();
}

export function flowRedirectUrl(url, token) {
  const base = String(url || "").trim();
  const t = String(token || "").trim();
  if (!base || !t) return "";
  return `${base}?token=${t}`;
}

function requestOrigin(req) {
  const host = (header(req, "x-forwarded-host") || header(req, "host")).split(",")[0].trim();
  if (host && !/^(localhost|127\.0\.0\.1)(:|$)/i.test(host)) {
    const proto = header(req, "x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }
  return publicOrigin() || "https://www.haberes.cl";
}

export function flowCheckoutUrls(req) {
  const origin = requestOrigin(req);
  return {
    origin,
    confirmation: `${origin}/api/flow-webhook`,
    returnUrl: `${origin}/empresa?pago=ok`,
  };
}

export function newCommerceOrder(companyId) {
  const id = String(companyId || "").trim();
  const nonce = randomBytes(4).toString("hex");
  return `pro-${id}-${Date.now()}-${nonce}`;
}

export function companyIdFromStatus(status) {
  const optional = status?.optional;
  if (optional && typeof optional === "object") {
    const id = String(optional.company_id || optional.companyId || "").trim();
    if (id) return id;
  }
  if (typeof optional === "string" && optional.trim()) {
    try {
      const parsed = JSON.parse(optional);
      const id = String(parsed?.company_id || parsed?.companyId || "").trim();
      if (id) return id;
    } catch {
      // optional may be a raw string from Flow
    }
  }
  const commerce = String(status?.commerceOrder || "").trim();
  const m = commerce.match(
    /^pro-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-/i,
  );
  return m ? m[1] : "";
}

export function flowStatusCode(status) {
  const n = Number(status?.status);
  return Number.isFinite(n) ? n : 0;
}

export function readFlowToken(req) {
  const q = queryParam(req, "token");
  if (q) return q;
  const body = req?.body;
  if (body && typeof body === "object" && !Buffer.isBuffer(body)) {
    const raw = body.token;
    return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
  }
  if (typeof body === "string" && body.trim()) {
    try {
      return String(new URLSearchParams(body).get("token") || "").trim();
    } catch {
      return "";
    }
  }
  if (Buffer.isBuffer(body) && body.length) {
    return String(new URLSearchParams(body.toString("utf8")).get("token") || "").trim();
  }
  return "";
}

export async function flowRequest(path, params, { method = "POST", fetchImpl = fetch } = {}) {
  const cfg = flowConfig();
  if (!cfg) return { ok: false, status: 501, data: null, reason: "flow_unavailable" };
  const payload = { ...params, apiKey: cfg.apiKey };
  const encoded = flowFormBody(payload, cfg.secretKey);
  const url =
    method === "GET" ? `${cfg.apiBase}${path}?${encoded}` : `${cfg.apiBase}${path}`;
  const res = await fetchImpl(url, {
    method,
    headers:
      method === "GET"
        ? { Accept: "application/json" }
        : {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
    body: method === "GET" ? undefined : encoded,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

export async function createFlowOrder(company, { req, fetchImpl = fetch } = {}) {
  if (!hasFlow()) return { ok: false, reason: "flow_unavailable" };
  const email = String(company?.email || "").trim();
  const companyId = String(company?.id || "").trim();
  if (!email || !companyId) return { ok: false, reason: "invalid_payload" };
  const urls = flowCheckoutUrls(req);
  const commerceOrder = newCommerceOrder(companyId);
  const result = await flowRequest(
    "/payment/create",
    {
      commerceOrder,
      subject: "Haberes Pro — 1 mes",
      currency: "CLP",
      amount: PRO_AMOUNT_CLP,
      email,
      paymentMethod: 9,
      urlConfirmation: urls.confirmation,
      urlReturn: urls.returnUrl,
      optional: JSON.stringify({ company_id: companyId }),
    },
    { method: "POST", fetchImpl },
  );
  const token = String(result.data?.token || "").trim();
  const url = String(result.data?.url || "").trim();
  const init_point = flowRedirectUrl(url, token);
  if (!result.ok || !init_point) {
    return { ok: false, reason: "flow_error", status: result.status };
  }
  return {
    ok: true,
    init_point,
    token,
    flowOrder: result.data?.flowOrder ?? null,
    commerceOrder,
    kind: "flow",
  };
}

export async function getPaymentStatus(token, { fetchImpl = fetch } = {}) {
  const t = String(token || "").trim();
  if (!t) return { ok: false, reason: "invalid_payload" };
  return flowRequest("/payment/getStatus", { token: t }, { method: "GET", fetchImpl });
}

function addDays(from, days) {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export async function applyFetchedFlowStatus(client, status, token) {
  const companyId = companyIdFromStatus(status);
  const flowToken = String(token || "").trim();
  const flowOrder = status?.flowOrder != null ? String(status.flowOrder).trim() : "";
  const commerceOrder = String(status?.commerceOrder || "").trim();
  const code = flowStatusCode(status);
  if (!client || !companyId || !flowToken) return { applied: false, reason: "invalid" };

  if (code === FLOW_STATUS_PAID) {
    const amount = Number(status.amount);
    const currency = String(status.currency || "CLP").toUpperCase();
    if (currency !== "CLP") return { applied: false, reason: "currency" };
    if (Number.isFinite(amount) && amount + 0.5 < PRO_AMOUNT_CLP) {
      return { applied: false, reason: "amount" };
    }
    const found = await client.query(
      `SELECT id, plan, flow_token, plan_until FROM companies WHERE id = $1 LIMIT 1`,
      [companyId],
    );
    const row = found.rows[0];
    if (!row) return { applied: false, reason: "not_found" };
    if (String(row.flow_token || "") === flowToken && String(row.plan || "").toLowerCase() === "pro") {
      return { applied: true, reason: "idempotent", plan: "pro" };
    }
    const now = new Date();
    const currentUntil = row.plan_until ? new Date(row.plan_until) : null;
    const start =
      currentUntil && Number.isFinite(currentUntil.getTime()) && currentUntil > now ? currentUntil : now;
    const until = addDays(start, PRO_DAYS);
    await client.query(
      `UPDATE companies
       SET plan = 'pro', flow_token = $2, flow_order = $3, flow_commerce_order = $4,
           plan_until = $5, updated_at = NOW()
       WHERE id = $1`,
      [companyId, flowToken, flowOrder || null, commerceOrder || null, until.toISOString()],
    );
    return { applied: true, plan: "pro", until: until.toISOString() };
  }

  if (code === FLOW_STATUS_REJECTED || code === FLOW_STATUS_CANCELED || code === FLOW_STATUS_REFUNDED) {
    const updated = await client.query(
      `UPDATE companies
       SET plan = 'gratis', plan_until = NULL, updated_at = NOW()
       WHERE id = $1 AND flow_token = $2
       RETURNING id`,
      [companyId, flowToken],
    );
    return { applied: updated.rowCount > 0, plan: "gratis" };
  }

  return { applied: false, reason: "ignored" };
}
