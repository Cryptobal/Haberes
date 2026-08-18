/** Agregación de operación (suscripciones y producto). Sin secretos. */

export const PRO_NET_CLP = 14990;
export const PRO_IVA_PCT = 19;
export const PRO_GROSS_CLP = 17838;

function nonEmpty(value) {
  return Boolean(String(value || "").trim());
}

function asIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

export function isProStored(row) {
  return String(row?.plan || "gratis").toLowerCase() === "pro";
}

export function planUntilMs(row) {
  if (!row?.plan_until) return null;
  const t = new Date(row.plan_until).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Estados que se pueden inferir de `plan` + `plan_until`.
 * No hay columna de cobro fallido: no se finge.
 */
export function classifySubscription(row, now = Date.now()) {
  const until = planUntilMs(row);
  if (until != null && until < now) return "vencida";
  if (isProStored(row)) return "pro_vigente";
  return "gratis";
}

export function paymentProvider(row) {
  const mp = nonEmpty(row?.mp_payment_id) || nonEmpty(row?.mp_preapproval_id);
  const flow =
    nonEmpty(row?.flow_order) ||
    nonEmpty(row?.flow_commerce_order) ||
    nonEmpty(row?.flow_subscription_id) ||
    nonEmpty(row?.flow_token) ||
    nonEmpty(row?.flow_customer_id);
  if (mp && flow) return "mp_flow";
  if (mp) return "mp";
  if (flow) return "flow";
  return null;
}

export function paymentIdsPublic(row) {
  const out = {};
  if (nonEmpty(row?.mp_payment_id)) out.mpPaymentId = String(row.mp_payment_id).trim();
  if (nonEmpty(row?.mp_preapproval_id)) out.mpPreapprovalId = String(row.mp_preapproval_id).trim();
  if (nonEmpty(row?.flow_order)) out.flowOrder = String(row.flow_order).trim();
  if (nonEmpty(row?.flow_commerce_order)) out.flowCommerceOrder = String(row.flow_commerce_order).trim();
  if (nonEmpty(row?.flow_subscription_id)) out.flowSubscriptionId = String(row.flow_subscription_id).trim();
  return out;
}

export function vigenciaPublic(row, status = classifySubscription(row)) {
  const until = planUntilMs(row);
  if (status === "pro_vigente" && until == null) {
    return { kind: "open", at: null };
  }
  if (until != null) {
    return {
      kind: status === "vencida" ? "expired" : "until",
      at: new Date(until).toISOString(),
    };
  }
  return { kind: "none", at: null };
}

export function summarizeSubscriptions(rows, now = Date.now()) {
  const list = Array.isArray(rows) ? rows : [];
  let pro = 0;
  let gratis = 0;
  let vencidas = 0;
  for (const row of list) {
    const status = classifySubscription(row, now);
    if (status === "pro_vigente") pro += 1;
    else if (status === "vencida") vencidas += 1;
    else gratis += 1;
  }
  return {
    total: list.length,
    pro,
    gratis,
    vencidas,
    cobroFallido: { available: false },
    ingresosEstimadosClp: pro * PRO_GROSS_CLP,
    ingresosEstimados: {
      pro,
      netoClp: PRO_NET_CLP,
      ivaPct: PRO_IVA_PCT,
      brutoUnitarioClp: PRO_GROSS_CLP,
      totalClp: pro * PRO_GROSS_CLP,
      nota: "Estimado: Pro vigentes × ($14.990 + IVA 19 % = $17.838). No es un MRR contable.",
    },
    proNuevosSemana: { available: false },
    bajasSemana: { available: false },
  };
}

export function companyAdminPublic(row, now = Date.now()) {
  if (!row) return null;
  const status = classifySubscription(row, now);
  return {
    id: row.id,
    rut: row.rut,
    email: row.email,
    razonSocial: row.razon_social,
    createdAt: asIso(row.created_at),
    disabled: Boolean(row.disabled_at),
    plan: status === "pro_vigente" ? "pro" : "gratis",
    status,
    planUntil: asIso(row.plan_until),
    vigencia: vigenciaPublic(row, status),
    provider: paymentProvider(row),
    paymentIds: paymentIdsPublic(row),
    hasLogo: Boolean(row.has_logo),
    documentos: Number(row.documentos) || 0,
  };
}

export function parseProductoPeriod(raw) {
  return Number(raw) === 7 ? 7 : 30;
}

export function parseTraficoPeriod(raw) {
  return Number(raw) === 7 ? 7 : 28;
}

export function periodSinceIso(days, now = Date.now()) {
  const n = Number(days);
  const safe = Number.isFinite(n) && n > 0 ? n : 30;
  return new Date(now - safe * 24 * 60 * 60 * 1000).toISOString();
}

export function productoFromCounts(counts, periodDays, since) {
  return {
    periodDays,
    since,
    accountsNew: Number(counts?.accountsNew) || 0,
    documents: Number(counts?.documents) || 0,
    movements: Number(counts?.movements) || 0,
    envios: Number(counts?.envios) || 0,
    checkoutsStarted: { available: false },
    checkoutsPaid: { available: false },
  };
}
