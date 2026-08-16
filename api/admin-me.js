import { json } from "./_lib.js";
import { requireAdmin } from "./_admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader?.("Allow", "GET");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  return json(res, 200, { ok: true, admin: { email: admin.email } });
}
