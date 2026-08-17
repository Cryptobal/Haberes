import {
  allowRate,
  hasDatabaseUrl,
  json,
  noBackend,
  rateLimited,
  readJson,
  readSessionToken,
  requireCompany,
} from "./_lib.js";
import { createFlowOrder, hasFlow } from "./_flow.js";
import { createProCheckout, hasMp } from "./_mp.js";

export function configuredProviders() {
  const providers = [];
  if (hasMp()) providers.push("mp");
  if (hasFlow()) providers.push("flow");
  return providers;
}

export function normalizeProvider(raw) {
  return String(raw || "").trim().toLowerCase() === "flow" ? "flow" : "mp";
}

export async function handleCheckout(req, res, deps = {}) {
  const providersFn = deps.providers || configuredProviders;
  if (req.method === "GET" || req.method === "HEAD") {
    return json(res, 200, { ok: true, providers: providersFn() });
  }
  if (req.method !== "POST") {
    res.setHeader?.("Allow", "GET, HEAD, POST");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }
  if (!allowRate(req, "checkout")) return rateLimited(res);
  if (!readSessionToken(req)) {
    return json(res, 401, { ok: false, reason: "unauthorized" });
  }

  const hasDb = deps.hasDatabaseUrl || hasDatabaseUrl;
  if (!hasDb()) return noBackend(res);

  const requireCo = deps.requireCompany || requireCompany;
  const company = await requireCo(req, res);
  if (!company) return;

  const provider = normalizeProvider(readJson(req).provider);
  const mpOn = deps.hasMp || hasMp;
  const flowOn = deps.hasFlow || hasFlow;
  const createMp = deps.createMp || createProCheckout;
  const createFlow = deps.createFlow || createFlowOrder;

  if (provider === "flow") {
    if (!flowOn()) return json(res, 501, { ok: false, reason: "flow_unavailable" });
    try {
      const created = await createFlow(company, { req, fetchImpl: deps.fetchImpl });
      if (!created.ok || !created.init_point) {
        const status = created.reason === "flow_unavailable" ? 501 : 502;
        return json(res, status, { ok: false, reason: created.reason || "flow_error" });
      }
      return json(res, 200, { ok: true, init_point: created.init_point, provider: "flow" });
    } catch {
      return json(res, 502, { ok: false, reason: "flow_error" });
    }
  }

  if (!mpOn()) return json(res, 501, { ok: false, reason: "mp_unavailable" });
  try {
    const created = await createMp(company, { fetchImpl: deps.fetchImpl });
    if (!created.ok || !created.init_point) {
      const status = created.reason === "mp_unavailable" ? 501 : 502;
      return json(res, status, { ok: false, reason: created.reason || "mp_error" });
    }
    return json(res, 200, { ok: true, init_point: created.init_point, provider: "mp" });
  } catch {
    return json(res, 502, { ok: false, reason: "mp_error" });
  }
}

export default async function handler(req, res) {
  return handleCheckout(req, res);
}
