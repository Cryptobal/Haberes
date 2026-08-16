import { hashToken, json, withDb } from "./_lib.js";
import { clearAdminCookie, readAdminToken } from "./_admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader?.("Allow", "POST");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }
  const token = readAdminToken(req);
  if (token) {
    try {
      await withDb(async (client) => {
        await client.query(`DELETE FROM admin_sessions WHERE token_hash = $1`, [hashToken(token)]);
      });
    } catch {
      // Cookie is cleared anyway.
    }
  }
  clearAdminCookie(res);
  return json(res, 200, { ok: true });
}
