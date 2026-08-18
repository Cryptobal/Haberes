import { json } from "./_lib.js";
import { requireAdmin } from "./_admin.js";
import { parseTraficoPeriod } from "./_admin-ops.js";
import { ga4NotConfiguredBody, loadGa4Report } from "./_ga4.js";

export async function handleAdminTrafico(req, res, deps = {}) {
  if (req.method !== "GET") {
    res.setHeader?.("Allow", "GET");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }
  const require = deps.requireAdmin || requireAdmin;
  const admin = await require(req, res);
  if (!admin) return;

  const url = typeof req.url === "string" ? req.url : "";
  const qs = url.includes("?") ? new URLSearchParams(url.slice(url.indexOf("?") + 1)) : new URLSearchParams();
  const periodDays = parseTraficoPeriod(qs.get("period") || req.query?.period);
  const load = deps.loadGa4Report || loadGa4Report;
  const report = await load({
    periodDays,
    env: deps.env,
    fetchImpl: deps.fetchImpl,
    getAccessToken: deps.getAccessToken,
    readFileSync: deps.readFileSync,
    now: deps.now,
  });

  if (report?.reason === "ga4_not_configured") {
    return json(res, 200, report.ok ? report : ga4NotConfiguredBody());
  }
  if (report?.ok) return json(res, 200, report);
  return json(res, 200, {
    ok: false,
    connected: true,
    reason: report?.reason || "ga4_error",
    error: report?.error || "GA4 no pudo devolver el informe.",
  });
}

export default async function handler(req, res) {
  return handleAdminTrafico(req, res);
}
