import { apiGet, apiPost, authErrorMessage, isNoBackend } from "./api.js";
import { isPro } from "./plan.js";
import { empresaActual } from "./storage.js";

export const CHECKOUT_FLAG = "haberes:wantPro";

export function rememberCheckoutIntent() {
  try {
    sessionStorage.setItem(CHECKOUT_FLAG, "1");
  } catch {
    // sessionStorage can be blocked.
  }
}

export function consumeCheckoutIntent() {
  try {
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get("checkout") === "1";
    const fromStore = sessionStorage.getItem(CHECKOUT_FLAG) === "1";
    if (fromStore) sessionStorage.removeItem(CHECKOUT_FLAG);
    return fromQuery || fromStore;
  } catch {
    return new URLSearchParams(location.search).get("checkout") === "1";
  }
}

export function checkoutErrorMessage(data, status) {
  if (data?.reason === "mp_unavailable" || (status === 501 && data?.reason === "mp_unavailable")) {
    return authErrorMessage(data, status);
  }
  return authErrorMessage(data, status);
}

/**
 * Inicia Checkout Pro. No marca Pro en el cliente: eso lo hace el webhook.
 * Sin sesión, va a /empresa para registrar o entrar y luego cobrar.
 */
export async function startProCheckout({ onError } = {}) {
  const emp = empresaActual();
  if (emp && isPro(emp)) {
    onError?.("Esta empresa ya es Pro.");
    return { ok: false, reason: "already_pro" };
  }

  const me = await apiGet("/api/me");
  if (me.status === 401 || me.data?.reason === "unauthorized") {
    rememberCheckoutIntent();
    location.href = "/empresa?checkout=1";
    return { ok: false, reason: "unauthorized" };
  }
  if (isNoBackend(me.status, me.data) && me.data?.reason !== "mp_unavailable") {
    onError?.("No hay servidor de cuentas. El cobro no se puede iniciar en este navegador.");
    return { ok: false, reason: "no_backend" };
  }
  if (me.data?.ok && me.data.company?.plan === "pro") {
    onError?.("Esta empresa ya es Pro.");
    return { ok: false, reason: "already_pro" };
  }

  const { status, data } = await apiPost("/api/checkout", {});
  if (status === 401 || data?.reason === "unauthorized") {
    rememberCheckoutIntent();
    location.href = "/empresa?checkout=1";
    return { ok: false, reason: "unauthorized" };
  }
  if (data?.ok && data.init_point) {
    location.href = data.init_point;
    return { ok: true };
  }
  onError?.(checkoutErrorMessage(data, status));
  return { ok: false, reason: data?.reason || "mp_error" };
}
