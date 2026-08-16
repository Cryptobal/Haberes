import { clearSessionCookie, hashToken, json, readSessionToken, withDb } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader?.("Allow", "POST");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }

  const token = readSessionToken(req);
  clearSessionCookie(res);

  if (token) {
    try {
      await withDb(async (client) => {
        await client.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
      });
    } catch {
      // Cookie already cleared.
    }
  }

  return json(res, 200, { ok: true });
}
