import { json } from "./_lib.js";
import { hasR2 } from "./_r2.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader?.("Allow", "GET");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }
  return json(res, 200, { ok: true, storage: hasR2() });
}
