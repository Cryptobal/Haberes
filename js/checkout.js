import { apiGet, apiPost, authErrorMessage, isNoBackend } from "./api.js";
import { isPro } from "./plan.js";
import { empresaActual } from "./storage.js";

export const CHECKOUT_FLAG = "haberes:wantPro";
export const CHECKOUT_PROVIDER_FLAG = "haberes:wantProProvider";

export function normalizeCheckoutProvider(raw) {
  return String(raw || "").trim().toLowerCase() === "flow" ? "flow" : "mp";
}

export function rememberCheckoutIntent(provider) {
  try {
    sessionStorage.setItem(CHECKOUT_FLAG, "1");
    const p = normalizeCheckoutProvider(provider);
    sessionStorage.setItem(CHECKOUT_PROVIDER_FLAG, p);
  } catch {
    // sessionStorage can be blocked.
  }
}

export function consumeCheckoutIntent() {
  try {
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get("checkout") === "1";
    const fromStore = sessionStorage.getItem(CHECKOUT_FLAG) === "1";
    const provider = normalizeCheckoutProvider(
      params.get("provider") || sessionStorage.getItem(CHECKOUT_PROVIDER_FLAG) || "mp",
    );
    if (fromStore) sessionStorage.removeItem(CHECKOUT_FLAG);
    sessionStorage.removeItem(CHECKOUT_PROVIDER_FLAG);
    return { wanted: fromQuery || fromStore, provider };
  } catch {
    const params = new URLSearchParams(location.search);
    return {
      wanted: params.get("checkout") === "1",
      provider: normalizeCheckoutProvider(params.get("provider") || "mp"),
    };
  }
}

export function checkoutErrorMessage(data, status) {
  return authErrorMessage(data, status);
}

export function checkoutBusyLabel(provider) {
  return normalizeCheckoutProvider(provider) === "flow" ? "Abriendo Flow…" : "Abriendo Mercado Pago…";
}

export async function loadCheckoutProviders() {
  const me = await apiGet("/api/me");
  const fromMe = Array.isArray(me.data?.providers) ? me.data.providers : null;
  const loggedPro = Boolean(me.data?.ok && me.data.company?.plan === "pro");
  if (fromMe) {
    return {
      providers: fromMe.filter((p) => p === "mp" || p === "flow"),
      loggedPro,
    };
  }
  const chk = await apiGet("/api/checkout");
  const fromChk = Array.isArray(chk.data?.providers) ? chk.data.providers : [];
  return {
    providers: fromChk.filter((p) => p === "mp" || p === "flow"),
    loggedPro,
  };
}

/**
 * Inicia el cobro Pro (Mercado Pago o Flow). No marca Pro en el cliente: eso lo hace el webhook.
 * Sin sesión, va a /empresa para registrar o entrar y luego cobrar.
 */
export async function startProCheckout({ provider = "mp", onError } = {}) {
  const chosen = normalizeCheckoutProvider(provider);
  const emp = empresaActual();
  if (emp && isPro(emp)) {
    onError?.("Esta empresa ya es Pro.");
    return { ok: false, reason: "already_pro" };
  }

  const me = await apiGet("/api/me");
  if (me.status === 401 || me.data?.reason === "unauthorized") {
    rememberCheckoutIntent(chosen);
    location.href = `/empresa?checkout=1&provider=${encodeURIComponent(chosen)}`;
    return { ok: false, reason: "unauthorized" };
  }
  if (isNoBackend(me.status, me.data) && me.data?.reason !== "mp_unavailable" && me.data?.reason !== "flow_unavailable") {
    onError?.("No hay servidor de cuentas. El cobro no se puede iniciar en este navegador.");
    return { ok: false, reason: "no_backend" };
  }
  if (me.data?.ok && me.data.company?.plan === "pro") {
    onError?.("Esta empresa ya es Pro.");
    return { ok: false, reason: "already_pro" };
  }

  const { status, data } = await apiPost("/api/checkout", { provider: chosen });
  if (status === 401 || data?.reason === "unauthorized") {
    rememberCheckoutIntent(chosen);
    location.href = `/empresa?checkout=1&provider=${encodeURIComponent(chosen)}`;
    return { ok: false, reason: "unauthorized" };
  }
  if (data?.ok && data.init_point) {
    location.href = data.init_point;
    return { ok: true };
  }
  onError?.(checkoutErrorMessage(data, status));
  return { ok: false, reason: data?.reason || (chosen === "flow" ? "flow_error" : "mp_error") };
}
