import { json, readJson, withDb } from "./_lib.js";
import {
  applyFetchedPayment,
  applyFetchedPreapproval,
  hasMp,
  header,
  mpRequest,
  mpWebhookSecret,
  notificationIds,
  verifyMpSignature,
} from "./_mp.js";

export async function handleMpWebhook(req, res, deps = {}) {
  if (req.method === "GET" || req.method === "HEAD") {
    return json(res, 200, { ok: true });
  }
  if (req.method !== "POST") {
    res.setHeader?.("Allow", "GET, HEAD, POST");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }

  const body = readJson(req);
  const { dataId, type, queryDataId } = notificationIds(req, body);
  const secret = mpWebhookSecret();
  if (secret) {
    const okSig = verifyMpSignature({
      secret,
      xSignature: header(req, "x-signature"),
      xRequestId: header(req, "x-request-id"),
      dataId: queryDataId || dataId,
    });
    if (!okSig) return json(res, 401, { ok: false, reason: "unauthorized" });
  }

  if (!hasMp()) return json(res, 501, { ok: false, reason: "mp_unavailable" });
  if (!dataId) return json(res, 200, { ok: true });

  const fetchImpl = deps.fetchImpl || fetch;
  const applyPayment = deps.applyPayment || applyFetchedPayment;
  const applyPreapproval = deps.applyPreapproval || applyFetchedPreapproval;
  const db = deps.withDb || withDb;

  try {
    const kind = String(type || "payment");
    if (kind.includes("preapproval") || kind.includes("subscription")) {
      const fetched = await mpRequest(`/preapproval/${encodeURIComponent(dataId)}`, { fetchImpl });
      if (!fetched.ok || !fetched.data) return json(res, 200, { ok: true });
      await db(async (client) => applyPreapproval(client, fetched.data));
      return json(res, 200, { ok: true });
    }

    if (kind.includes("merchant_order")) {
      const fetched = await mpRequest(`/merchant_orders/${encodeURIComponent(dataId)}`, { fetchImpl });
      const payments = Array.isArray(fetched.data?.payments) ? fetched.data.payments : [];
      for (const item of payments) {
        const pid = String(item?.id || "").trim();
        if (!pid) continue;
        const pay = await mpRequest(`/v1/payments/${encodeURIComponent(pid)}`, { fetchImpl });
        if (pay.ok && pay.data) {
          await db(async (client) => applyPayment(client, pay.data));
        }
      }
      return json(res, 200, { ok: true });
    }

    const fetched = await mpRequest(`/v1/payments/${encodeURIComponent(dataId)}`, { fetchImpl });
    if (!fetched.ok || !fetched.data) return json(res, 200, { ok: true });
    await db(async (client) => applyPayment(client, fetched.data));
    return json(res, 200, { ok: true });
  } catch {
    return json(res, 200, { ok: true });
  }
}

export default async function handler(req, res) {
  return handleMpWebhook(req, res);
}
