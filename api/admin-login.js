import {
  allowRate,
  hasDatabaseUrl,
  json,
  parseEmail,
  rateLimited,
  readJson,
  withDb,
} from "./_lib.js";
import {
  adminConfigured,
  adminEmails,
  adminUnavailable,
  insertAdminSession,
  setAdminCookie,
  verifyAdminPassword,
} from "./_admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader?.("Allow", "POST");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }
  if (!allowRate(req, "admin-login")) return rateLimited(res);
  if (!adminConfigured()) return adminUnavailable(res);
  if (!hasDatabaseUrl()) return json(res, 503, { ok: false, reason: "db_unavailable" });

  const body = readJson(req);
  const email = parseEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return json(res, 400, { ok: false, reason: "invalid_payload" });
  }

  try {
    const allowed = adminEmails().includes(email);
    const ok = await verifyAdminPassword(password);
    if (!allowed || !ok) {
      return json(res, 401, { ok: false, reason: "invalid_credentials" });
    }
    const result = await withDb(async (client) => {
      const session = await insertAdminSession(client, email);
      return session;
    });
    if (!result) return json(res, 503, { ok: false, reason: "db_unavailable" });
    setAdminCookie(res, result.token);
    return json(res, 200, { ok: true, admin: { email } });
  } catch {
    return json(res, 503, { ok: false, reason: "db_unavailable" });
  }
}
