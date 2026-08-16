import { createHash, randomBytes, scryptSync } from "node:crypto";
import { normalizeRut, validarRut } from "../js/format.js";

const TOKEN_TTL_MS = 30 * 60 * 1000;
const SCRYPT_KEYLEN = 32;

export function hasDatabaseUrl() {
  return Boolean(String(process.env.DATABASE_URL || "").trim());
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

export function newResetToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) };
}

export function saltPassword(clave) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(clave), salt, SCRYPT_KEYLEN).toString("hex");
  return { salt, hash };
}

export function parseRut(raw) {
  const rut = normalizeRut(raw);
  if (!rut || !validarRut(rut)) return "";
  return rut;
}

export async function withDb(fn) {
  let pg;
  try {
    pg = await import("pg");
  } catch {
    return null;
  }
  const Client = pg.default?.Client || pg.Client;
  if (!Client) return null;
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await ensureSchema(client);
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

async function ensureSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS haberes_credentials (
      rut TEXT PRIMARY KEY,
      email TEXT,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS haberes_password_resets (
      token_hash TEXT PRIMARY KEY,
      rut TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS haberes_password_resets_rut_idx
    ON haberes_password_resets (rut)
  `);
}

export async function sendResetEmail({ to, token }) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!apiKey || !to) return false;
  const from = String(process.env.RESEND_FROM || "").trim() || "Haberes <noreply@haberes.cl>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Código para cambiar su clave en Haberes",
      text:
        "Este código vale 30 minutos y es de un solo uso.\n\n" +
        token +
        "\n\nSi usted no lo pidió, ignore este correo. Haberes no envía la clave, solo un código temporal.",
    }),
  });
  return res.ok;
}
