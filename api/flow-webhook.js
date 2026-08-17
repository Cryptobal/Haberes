import { json, withDb } from "./_lib.js";
import {
  applyFetchedFlowStatus,
  getPaymentStatus,
  hasFlow,
  readFlowToken,
} from "./_flow.js";

export async function handleFlowWebhook(req, res, deps = {}) {
  if (req.method === "GET" || req.method === "HEAD") {
    return json(res, 200, { ok: true });
  }
  if (req.method !== "POST") {
    res.setHeader?.("Allow", "GET, HEAD, POST");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }

  const flowOn = deps.hasFlow || hasFlow;
  if (!flowOn()) return json(res, 501, { ok: false, reason: "flow_unavailable" });

  const token = readFlowToken(req);
  if (!token) return json(res, 200, { ok: true });

  const fetchImpl = deps.fetchImpl || fetch;
  const applyStatus = deps.applyStatus || applyFetchedFlowStatus;
  const getStatus = deps.getPaymentStatus || getPaymentStatus;
  const db = deps.withDb || withDb;

  try {
    const fetched = await getStatus(token, { fetchImpl });
    if (!fetched.ok || !fetched.data) return json(res, 200, { ok: true });
    await db(async (client) => applyStatus(client, fetched.data, token));
    return json(res, 200, { ok: true });
  } catch {
    return json(res, 200, { ok: true });
  }
}

export default async function handler(req, res) {
  return handleFlowWebhook(req, res);
}
