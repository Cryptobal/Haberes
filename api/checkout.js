import {
  allowRate,
  hasDatabaseUrl,
  json,
  noBackend,
  rateLimited,
  readSessionToken,
  requireCompany,
} from "./_lib.js";
import { createProCheckout, hasMp } from "./_mp.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader?.("Allow", "POST");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }
  if (!allowRate(req, "checkout")) return rateLimited(res);
  if (!readSessionToken(req)) {
    return json(res, 401, { ok: false, reason: "unauthorized" });
  }
  if (!hasDatabaseUrl()) return noBackend(res);

  const company = await requireCompany(req, res);
  if (!company) return;

  if (!hasMp()) {
    return json(res, 501, { ok: false, reason: "mp_unavailable" });
  }

  try {
    const created = await createProCheckout(company);
    if (!created.ok || !created.init_point) {
      const status = created.reason === "mp_unavailable" ? 501 : 502;
      return json(res, status, { ok: false, reason: created.reason || "mp_error" });
    }
    return json(res, 200, { ok: true, init_point: created.init_point });
  } catch {
    return json(res, 502, { ok: false, reason: "mp_error" });
  }
}
