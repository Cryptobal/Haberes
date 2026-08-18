import { json, publicOrigin, withDb } from "./_lib.js";
import { header } from "./_mp.js";
import {
  applyFetchedFlowInvoice,
  applyFetchedFlowStatus,
  applyFetchedFlowSubscription,
  applyFlowCardRegistered,
  getInvoice,
  getPaymentStatus,
  getRegisterStatus,
  getSubscription,
  hasFlow,
  readFlowField,
  readFlowToken,
} from "./_flow.js";

function wantsRedirect(req) {
  const accept = header(req, "accept").toLowerCase();
  return accept.includes("text/html");
}

function finish(req, res, payload = { ok: true }) {
  if (wantsRedirect(req) && typeof res.redirect === "function") {
    return res.redirect(303, `${publicOrigin()}/empresa?pago=ok`);
  }
  if (wantsRedirect(req)) {
    res.setHeader?.("Location", `${publicOrigin()}/empresa?pago=ok`);
    if (typeof res.status === "function") {
      res.status(303);
      return res.end?.() ?? json(res, 303, payload);
    }
    res.statusCode = 303;
    return res.end?.() ?? json(res, 303, payload);
  }
  return json(res, 200, payload);
}

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
  const invoiceId = readFlowField(req, "invoiceId");
  const subscriptionId = readFlowField(req, "subscriptionId");
  if (!token && !invoiceId && !subscriptionId) return json(res, 200, { ok: true });

  const fetchImpl = deps.fetchImpl || fetch;
  const applyStatus = deps.applyStatus || applyFetchedFlowStatus;
  const applyRegister = deps.applyRegister || applyFlowCardRegistered;
  const applyInvoice = deps.applyInvoice || applyFetchedFlowInvoice;
  const applySub = deps.applySubscription || applyFetchedFlowSubscription;
  const getStatus = deps.getPaymentStatus || getPaymentStatus;
  const getReg = deps.getRegisterStatus || getRegisterStatus;
  const getInv = deps.getInvoice || getInvoice;
  const getSub = deps.getSubscription || getSubscription;
  const db = deps.withDb || withDb;

  try {
    if (invoiceId) {
      const fetched = await getInv(invoiceId, { fetchImpl });
      if (fetched.ok && fetched.data) {
        await db(async (client) => applyInvoice(client, fetched.data));
      }
      return finish(req, res);
    }

    if (subscriptionId) {
      const fetched = await getSub(subscriptionId, { fetchImpl });
      if (fetched.ok && fetched.data) {
        await db(async (client) => applySub(client, fetched.data));
      }
      return finish(req, res);
    }

    const registered = await getReg(token, { fetchImpl });
    if (registered.ok && registered.data?.customerId && String(registered.data.status) === "1") {
      await db(async (client) => applyRegister(client, registered.data, { fetchImpl }));
      return finish(req, res);
    }

    const fetched = await getStatus(token, { fetchImpl });
    if (!fetched.ok || !fetched.data) return json(res, 200, { ok: true });
    await db(async (client) => applyStatus(client, fetched.data, token));
    return finish(req, res);
  } catch {
    return json(res, 200, { ok: true });
  }
}

export default async function handler(req, res) {
  return handleFlowWebhook(req, res);
}
