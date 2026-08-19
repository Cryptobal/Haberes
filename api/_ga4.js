import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DATA_API = "https://analyticsdata.googleapis.com/v1beta";
const CACHE_MS = 10 * 60 * 1000;
const TOKEN_TTL_MS = 50 * 60 * 1000;

const reportCache = new Map();
const tokenCache = { key: "", token: "", exp: 0 };

function envTrim(env, name) {
  return String(env?.[name] || "").trim();
}

function firstNonEmpty(env, names) {
  for (const name of names) {
    const value = envTrim(env, name);
    if (value) return value;
  }
  return "";
}

export function ga4PropertyId(env = process.env) {
  const raw = firstNonEmpty(env, [
    "GA4_PROPERTY_ID",
    "GOOGLE_ANALYTICS_PROPERTY_ID",
    "GA4_PROPERTY",
    "ANALYTICS_PROPERTY_ID",
  ]);
  if (!raw) return "";
  const id = raw.replace(/^properties\//i, "").trim();
  // Un contenedor GTM no es el ID numérico de la Data API.
  if (!id || /^GTM-/i.test(id)) return "";
  return id;
}

export function parseServiceAccountJson(raw) {
  const text = String(raw || "").trim();
  if (!text.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(text);
    const email = String(parsed.client_email || "").trim();
    const key = String(parsed.private_key || "").trim();
    if (!email.includes("@") || !key.includes("BEGIN")) return null;
    return {
      client_email: email,
      private_key: key,
      token_uri: String(parsed.token_uri || TOKEN_URL).trim() || TOKEN_URL,
    };
  } catch {
    return null;
  }
}

export function ga4ServiceAccount(env = process.env, io = {}) {
  const readFile = io.readFileSync || readFileSync;
  const jsonFirst = firstNonEmpty(env, [
    "GA4_SERVICE_ACCOUNT_JSON",
    "GOOGLE_APPLICATION_CREDENTIALS_JSON",
    "GOOGLE_SERVICE_ACCOUNT_JSON",
    "GCLOUD_SERVICE_ACCOUNT_JSON",
  ]);
  if (jsonFirst) return parseServiceAccountJson(jsonFirst);

  const adc = firstNonEmpty(env, ["GOOGLE_APPLICATION_CREDENTIALS"]);
  if (!adc) return null;
  if (adc.startsWith("{")) return parseServiceAccountJson(adc);
  try {
    return parseServiceAccountJson(readFile(adc, "utf8"));
  } catch {
    return null;
  }
}

export function ga4Configured(env = process.env, io = {}) {
  return Boolean(ga4PropertyId(env) && ga4ServiceAccount(env, io));
}

export function mapGa4Channel(name) {
  const n = String(name || "").trim().toLowerCase();
  if (!n) return "other";
  if (n.includes("organic")) return "organic";
  if (n.includes("direct")) return "direct";
  if (n.includes("referral")) return "referral";
  if (
    n.includes("paid") ||
    n.includes("cpc") ||
    n === "display" ||
    n.includes("cross-network") ||
    n.includes("paid search") ||
    n.includes("paid social")
  ) {
    return "paid";
  }
  return "other";
}

export function foldChannels(rows) {
  const buckets = { organic: 0, direct: 0, referral: 0, paid: 0, other: 0 };
  for (const row of rows || []) {
    const key = mapGa4Channel(row.name);
    buckets[key] += Number(row.sessions) || 0;
  }
  return buckets;
}

function metricInt(row, index = 0) {
  const raw = row?.metricValues?.[index]?.value;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function dimName(row, index = 0) {
  return String(row?.dimensionValues?.[index]?.value || "").trim();
}

function topList(report, limit = 8) {
  const rows = [];
  for (const row of report?.rows || []) {
    const name = dimName(row);
    if (!name || name === "(not set)" || name === "(not provided)") continue;
    rows.push({ name, sessions: metricInt(row) });
  }
  return rows.slice(0, limit);
}

export function parseGa4Batch(payload) {
  const reports = payload?.reports || [];
  const totals = reports[0]?.rows?.[0];
  const channelRows = (reports[1]?.rows || []).map((row) => ({
    name: dimName(row),
    sessions: metricInt(row),
  }));
  return {
    sessions: totals ? metricInt(totals, 0) : 0,
    users: totals ? metricInt(totals, 1) : 0,
    channels: foldChannels(channelRows),
    cities: topList(reports[2], 8),
    countries: topList(reports[3], 8),
    landings: topList(reports[4], 10),
  };
}

export function ga4OperatorError(err, status = 0) {
  const code = Number(err?.error?.code || status) || 0;
  const gStatus = String(err?.error?.status || "").toUpperCase();
  if (code === 401 || gStatus === "UNAUTHENTICATED") {
    return "Las credenciales de GA4 no son válidas o expiraron.";
  }
  if (code === 403 || gStatus === "PERMISSION_DENIED") {
    return "GA4 rechazó el acceso. Comparta la propiedad con la cuenta de servicio (rol Lector).";
  }
  if (code === 404 || gStatus === "NOT_FOUND") {
    return "No se encontró la propiedad de GA4. Revise el ID en Vercel.";
  }
  if (code === 400 || gStatus === "INVALID_ARGUMENT") {
    return "GA4 rechazó la consulta. Revise el ID de la propiedad.";
  }
  return "GA4 no pudo devolver el informe.";
}

function b64urlJson(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

export function signServiceAccountJwt(sa, nowSec = Math.floor(Date.now() / 1000)) {
  const header = { alg: "RS256", typ: "JWT" };
  const aud = sa.token_uri || TOKEN_URL;
  const claim = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud,
    iat: nowSec,
    exp: nowSec + 3600,
    scope: SCOPE,
  };
  const unsigned = `${b64urlJson(header)}.${b64urlJson(claim)}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const sig = signer.sign(sa.private_key);
  return `${unsigned}.${Buffer.from(sig).toString("base64url")}`;
}

async function readJsonResponse(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchAccessToken(sa, fetchImpl = fetch) {
  const cacheKey = sa.client_email;
  if (tokenCache.key === cacheKey && tokenCache.token && tokenCache.exp > Date.now()) {
    return { ok: true, token: tokenCache.token };
  }
  const jwt = signServiceAccountJwt(sa);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });
  let res;
  try {
    res = await fetchImpl(sa.token_uri || TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch {
    return { ok: false, error: "No se pudo contactar a Google para autenticar GA4." };
  }
  const data = await readJsonResponse(res);
  const token = String(data?.access_token || "").trim();
  if (!res.ok || !token) {
    return { ok: false, error: ga4OperatorError(data, res.status) };
  }
  tokenCache.key = cacheKey;
  tokenCache.token = token;
  tokenCache.exp = Date.now() + TOKEN_TTL_MS;
  return { ok: true, token };
}

function reportRequest(startDate) {
  const dateRanges = [{ startDate, endDate: "yesterday" }];
  const sessions = { name: "sessions" };
  return [
    { dateRanges, metrics: [sessions, { name: "activeUsers" }] },
    {
      dateRanges,
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [sessions],
      limit: 20,
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    },
    {
      dateRanges,
      dimensions: [{ name: "city" }],
      metrics: [sessions],
      limit: 10,
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    },
    {
      dateRanges,
      dimensions: [{ name: "country" }],
      metrics: [sessions],
      limit: 10,
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    },
    {
      dateRanges,
      dimensions: [{ name: "landingPage" }],
      metrics: [sessions],
      limit: 12,
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    },
  ];
}

export function clearGa4Cache() {
  reportCache.clear();
  tokenCache.key = "";
  tokenCache.token = "";
  tokenCache.exp = 0;
}

export const GA4_WILL_SHOW = [
  "sesiones",
  "usuarios",
  "canal (orgánico, directo, referral, pago, otro)",
  "ciudad",
  "país",
  "página de entrada",
];

export function ga4NotConfiguredBody() {
  return {
    ok: true,
    connected: false,
    reason: "ga4_not_configured",
    willShow: GA4_WILL_SHOW,
    howTo:
      "En Vercel, agregue GA4_PROPERTY_ID (ID numérico de la propiedad de datos; no el contenedor GTM) y GA4_SERVICE_ACCOUNT_JSON (JSON de una cuenta de servicio con permiso de lectura). No suba esas claves al repositorio.",
  };
}

export async function loadGa4Report(opts = {}) {
  const env = opts.env || process.env;
  const io = { readFileSync: opts.readFileSync || readFileSync };
  const fetchImpl = opts.fetchImpl || fetch;
  const periodDays = opts.periodDays === 7 ? 7 : 28;
  const now = opts.now || Date.now();

  const propertyId = ga4PropertyId(env);
  const sa = ga4ServiceAccount(env, io);
  if (!propertyId || !sa) return { ...ga4NotConfiguredBody() };

  const cacheKey = `${propertyId}:${periodDays}`;
  const hit = reportCache.get(cacheKey);
  if (hit && hit.exp > now) {
    return { ...hit.body, cached: true };
  }

  const tokenFn = opts.getAccessToken || fetchAccessToken;
  const auth = await tokenFn(sa, fetchImpl);
  if (!auth?.ok) {
    return {
      ok: false,
      connected: true,
      reason: "ga4_error",
      error: auth?.error || "Las credenciales de GA4 no son válidas o expiraron.",
    };
  }

  const startDate = periodDays === 7 ? "7daysAgo" : "28daysAgo";
  let res;
  try {
    res = await fetchImpl(`${DATA_API}/properties/${encodeURIComponent(propertyId)}:batchRunReports`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests: reportRequest(startDate) }),
    });
  } catch {
    return {
      ok: false,
      connected: true,
      reason: "ga4_error",
      error: "No se pudo contactar a Google Analytics.",
    };
  }

  const data = await readJsonResponse(res);
  if (!res.ok) {
    return {
      ok: false,
      connected: true,
      reason: "ga4_error",
      error: ga4OperatorError(data, res.status),
    };
  }
  if (!data || !Array.isArray(data.reports)) {
    return {
      ok: false,
      connected: true,
      reason: "ga4_error",
      error: "GA4 respondió en un formato inesperado.",
    };
  }

  const parsed = parseGa4Batch(data);
  const body = {
    ok: true,
    connected: true,
    periodDays,
    range: { startDate, endDate: "yesterday" },
    ...parsed,
    cached: false,
  };
  reportCache.set(cacheKey, { exp: now + CACHE_MS, body });
  return body;
}
