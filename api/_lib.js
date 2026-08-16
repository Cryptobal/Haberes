import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { hash as argon2Hash, verify as argon2Verify, Algorithm } from "@node-rs/argon2";
import { normalizeRut, validarRut } from "../js/format.js";

export const MIN_PASSWORD_LENGTH = 10;
export const TOKEN_TTL_MS = 30 * 60 * 1000;
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE = "haberes_session";
export const RATE_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };

const ARGON2_OPTS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

const INLINE_SCHEMA = `
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  rut TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS password_reset_tokens_company_id_idx
  ON password_reset_tokens (company_id);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_company_id_idx ON sessions (company_id);
`;

let schemaReady = false;
let dummyHashPromise = null;
const rateHits = new Map();

export function hasDatabaseUrl() {
  return Boolean(String(process.env.DATABASE_URL || "").trim());
}

export function databaseUrl() {
  return String(process.env.DATABASE_URL || "").trim();
}

export function migrateDatabaseUrl() {
  return String(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "").trim();
}

export function json(res, status, payload) {
  res.setHeader?.("Content-Type", "application/json; charset=utf-8");
  res.setHeader?.("Cache-Control", "no-store");
  return res.status(status).json(payload);
}

export function noBackend(res) {
  return json(res, 501, { ok: false, reason: "no_backend" });
}

export function readJson(req) {
  const body = req?.body;
  if (body && typeof body === "object" && !Buffer.isBuffer(body)) return body;
  if (typeof body === "string" && body.trim()) {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return {};
}

export function hashToken(token) {
  return createHash("sha256").update(String(token), "utf8").digest("hex");
}

export function newSecretToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function newResetToken() {
  const { token, tokenHash } = newSecretToken();
  return { token, tokenHash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) };
}

export async function hashPassword(password) {
  return argon2Hash(String(password), ARGON2_OPTS);
}

export async function verifyPassword(password, passwordHash) {
  try {
    return await argon2Verify(String(passwordHash || ""), String(password), ARGON2_OPTS);
  } catch {
    return false;
  }
}

async function dummyVerify(password) {
  if (!dummyHashPromise) dummyHashPromise = hashPassword("0123456789");
  const dummy = await dummyHashPromise;
  await verifyPassword(password || "0123456789", dummy);
}

export async function verifyCompanyPassword(password, passwordHash) {
  if (!passwordHash) {
    await dummyVerify(password);
    return false;
  }
  return verifyPassword(password, passwordHash);
}

export function parseRut(raw) {
  const rut = normalizeRut(raw);
  if (!rut || !validarRut(rut)) return "";
  return rut;
}

export function parseEmail(raw) {
  const email = String(raw || "").trim().toLowerCase();
  if (email.length < 5 || email.length > 254) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  return email;
}

export function parseNewPassword(body) {
  const raw =
    typeof body?.newPassword === "string"
      ? body.newPassword
      : typeof body?.password === "string"
        ? body.password
        : typeof body?.clave === "string"
          ? body.clave
          : "";
  if (raw.length < MIN_PASSWORD_LENGTH) return "";
  return raw;
}

export function parseRazonSocial(raw) {
  const name = String(raw || "").trim();
  if (!name || name.length > 200) return "";
  return name;
}

export function clientIp(req) {
  const xf = String(req?.headers?.["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  if (xf) return xf.slice(0, 128);
  const real = String(req?.headers?.["x-real-ip"] || "").trim();
  if (real) return real.slice(0, 128);
  return String(req?.socket?.remoteAddress || "unknown").slice(0, 128);
}

export function rateLimit(key) {
  const now = Date.now();
  const list = (rateHits.get(key) || []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (list.length >= RATE_LIMIT.max) {
    rateHits.set(key, list);
    return false;
  }
  list.push(now);
  rateHits.set(key, list);
  if (rateHits.size > 10_000) {
    for (const [k, times] of rateHits) {
      const keep = times.filter((t) => now - t < RATE_LIMIT.windowMs);
      if (!keep.length) rateHits.delete(k);
      else rateHits.set(k, keep);
    }
  }
  return true;
}

export function allowRate(req, bucket) {
  return rateLimit(`${bucket}:${clientIp(req)}`);
}

export function rateLimited(res) {
  return json(res, 429, { ok: false, reason: "rate_limited" });
}

function sslFor(url) {
  if (/localhost|127\.0\.0\.1/i.test(url)) return false;
  return { rejectUnauthorized: false };
}

function loadSchemaSql() {
  try {
    return readFileSync(fileURLToPath(new URL("../sql/001.sql", import.meta.url)), "utf8");
  } catch {
    return INLINE_SCHEMA;
  }
}

async function pgClient(url) {
  const pg = await import("pg");
  const Client = pg.default?.Client || pg.Client;
  if (!Client) return null;
  const client = new Client({
    connectionString: url,
    ssl: sslFor(url),
  });
  await client.connect();
  return client;
}

async function ensureSchema() {
  if (schemaReady) return true;
  const url = migrateDatabaseUrl();
  if (!url) return false;
  const client = await pgClient(url);
  if (!client) return false;
  try {
    await client.query(loadSchemaSql());
    schemaReady = true;
    return true;
  } finally {
    await client.end().catch(() => {});
  }
}

export async function withDb(fn) {
  const url = databaseUrl();
  if (!url) return null;
  const ok = await ensureSchema();
  if (!ok) return null;
  const client = await pgClient(url);
  if (!client) return null;
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

export function companyPublic(row) {
  if (!row) return null;
  return {
    id: row.id,
    rut: row.rut,
    email: row.email,
    razonSocial: row.razon_social,
  };
}

export function newId() {
  return randomUUID();
}

export async function insertSession(client, companyId) {
  const { token, tokenHash } = newSecretToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await client.query(
    `INSERT INTO sessions (id, company_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [newId(), companyId, tokenHash, expiresAt.toISOString()],
  );
  return { token, expiresAt };
}

export function setSessionCookie(res, token) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  res.setHeader?.(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`,
  );
}

export function clearSessionCookie(res) {
  res.setHeader?.(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
  );
}

export function readSessionToken(req) {
  const raw = String(req?.headers?.cookie || "");
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === SESSION_COOKIE) return rest.join("=").trim();
  }
  return "";
}

export async function loadSessionCompany(client, token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const found = await client.query(
    `SELECT c.id, c.rut, c.email, c.razon_social, s.id AS session_id
     FROM sessions s
     JOIN companies c ON c.id = s.company_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  );
  return found.rows[0] || null;
}

export function publicOrigin() {
  const origin = String(process.env.PUBLIC_ORIGIN || "").trim();
  return origin || "https://www.haberes.cl";
}

export function mailConfigured() {
  return Boolean(String(process.env.RESEND_API_KEY || "").trim());
}

export async function sendResetEmail({ to, token }) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!apiKey || !to || !token) return false;
  const from = String(process.env.RESEND_FROM || "").trim() || "Haberes <noreply@haberes.cl>";
  const link = `${publicOrigin()}/reset?token=${encodeURIComponent(token)}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Cambiar su clave en Haberes",
      text:
        "Si pidió cambiar la clave de su empresa en Haberes, use este enlace. Vale 30 minutos y es de un solo uso.\n\n" +
        link +
        "\n\nSi usted no lo pidió, ignore este correo. Haberes nunca envía la clave, solo un enlace temporal.",
    }),
  });
  return res.ok;
}
