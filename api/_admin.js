import {
  hashToken,
  hasDatabaseUrl,
  json,
  newId,
  newSecretToken,
  readSessionTokenNamed,
  verifyPassword,
  withDb,
} from "./_lib.js";

export const ADMIN_COOKIE = "haberes_admin";
export const ADMIN_TTL_MS = 8 * 60 * 60 * 1000;

export function adminEmails() {
  return String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes("@"));
}

export function adminPasswordHash() {
  const hash = String(process.env.ADMIN_PASSWORD_HASH || "").trim();
  if (!hash.startsWith("$argon2id$")) return "";
  return hash;
}

export function adminConfigured() {
  return adminEmails().length > 0 && Boolean(adminPasswordHash());
}

export function adminUnavailable(res) {
  return json(res, 503, { ok: false, reason: "admin_unavailable" });
}

export async function insertAdminSession(client, email) {
  const { token, tokenHash } = newSecretToken();
  const expiresAt = new Date(Date.now() + ADMIN_TTL_MS);
  await client.query(
    `INSERT INTO admin_sessions (id, email, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [newId(), email, tokenHash, expiresAt.toISOString()],
  );
  return { token, expiresAt };
}

export function setAdminCookie(res, token) {
  const maxAge = Math.floor(ADMIN_TTL_MS / 1000);
  res.setHeader?.(
    "Set-Cookie",
    `${ADMIN_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`,
  );
}

export function clearAdminCookie(res) {
  res.setHeader?.(
    "Set-Cookie",
    `${ADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
  );
}

export function readAdminToken(req) {
  return readSessionTokenNamed(req, ADMIN_COOKIE);
}

export async function loadAdminSession(client, token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const found = await client.query(
    `SELECT id, email, expires_at
     FROM admin_sessions
     WHERE token_hash = $1 AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  );
  const row = found.rows[0];
  if (!row) return null;
  const allowed = adminEmails();
  if (!allowed.includes(String(row.email || "").toLowerCase())) return null;
  return { id: row.id, email: row.email };
}

export async function verifyAdminPassword(password) {
  const hash = adminPasswordHash();
  if (!hash) return false;
  return verifyPassword(password, hash);
}

export async function requireAdmin(req, res) {
  if (!adminConfigured()) {
    adminUnavailable(res);
    return null;
  }
  if (!hasDatabaseUrl()) {
    json(res, 503, { ok: false, reason: "db_unavailable" });
    return null;
  }
  const token = readAdminToken(req);
  if (!token) {
    json(res, 401, { ok: false, reason: "unauthorized" });
    return null;
  }
  try {
    let connected = false;
    const row = await withDb(async (client) => {
      connected = true;
      return loadAdminSession(client, token);
    });
    if (!connected) {
      json(res, 503, { ok: false, reason: "db_unavailable" });
      return null;
    }
    if (!row) {
      json(res, 401, { ok: false, reason: "unauthorized" });
      return null;
    }
    return row;
  } catch {
    json(res, 503, { ok: false, reason: "db_unavailable" });
    return null;
  }
}
