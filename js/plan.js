import { apiGet, apiPost, isNoBackend } from "./api.js";
import { empresaActual, guardarEmpresa } from "./storage.js";

export const PLAN_GRATIS = "gratis";
export const PLAN_PRO = "pro";
export const GRATIS_LIMITE = 5;

export const MSG_LIMITE =
  "Ya usó 5 movimientos este mes. El sexto (y la carga masiva) son del plan Pro: $14.990 + IVA / mes. Escríbanos a contacto@lx3.ai.";
export const MSG_UNO_A_UNO =
  "En Gratis se emite de a uno. Para varios trabajadores a la vez necesita Pro ($14.990 + IVA / mes).";
export const MSG_CARGA_PRO =
  "La carga masiva CSV/XLSX es del plan Pro ($14.990 + IVA / mes). En Gratis agregue trabajadores uno por uno. Escríbanos a contacto@lx3.ai.";
export const MSG_PAGO_PRO =
  "Las plantillas XLSX de pago masivo son del plan Pro ($14.990 + IVA / mes). Escríbanos a contacto@lx3.ai.";

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function isPro(emp) {
  return String(emp?.plan || PLAN_GRATIS).toLowerCase() === PLAN_PRO;
}

export function movimientosDelMes(emp) {
  const mes = monthKey();
  const list = emp?.movimientos?.[mes];
  return Array.isArray(list) ? list : [];
}

export function usadosMes(emp) {
  return movimientosDelMes(emp).length;
}

export function workerKey(t) {
  return String(t?.rut || t?.id || "").trim() || `id:${t?.id || ""}`;
}

function uniqueKeys(emp, tipo, keys) {
  const have = new Set(movimientosDelMes(emp).filter((m) => m.tipo === tipo).map((m) => m.key));
  return keys.filter((k) => k && !have.has(k));
}

export function puedeEmitir(emp, { tipo, keys }) {
  const list = (keys || []).filter(Boolean);
  if (!list.length) return { ok: false, reason: "sin_trabajadores" };
  if (isPro(emp)) return { ok: true, nuevos: list };
  if (list.length > 1) return { ok: false, reason: "uno_a_uno", message: MSG_UNO_A_UNO };
  const nuevos = uniqueKeys(emp, tipo, list);
  if (!nuevos.length) return { ok: true, nuevos: [], yaContado: true };
  if (usadosMes(emp) + nuevos.length > GRATIS_LIMITE) {
    return { ok: false, reason: "limite_gratis", message: MSG_LIMITE, usados: usadosMes(emp) };
  }
  return { ok: true, nuevos };
}

export function puedeCargaMasiva(emp) {
  if (isPro(emp)) return { ok: true };
  return { ok: false, message: MSG_CARGA_PRO };
}

export function puedePagoMasivo(emp) {
  if (isPro(emp)) return { ok: true };
  return { ok: false, message: MSG_PAGO_PRO };
}

export function registrarMovimientosLocal(emp, { tipo, keys }) {
  if (!emp) return emp;
  const mes = monthKey();
  const nuevos = uniqueKeys(emp, tipo, keys);
  if (!nuevos.length) return emp;
  const prev = emp.movimientos && typeof emp.movimientos === "object" ? emp.movimientos : {};
  const list = Array.isArray(prev[mes]) ? [...prev[mes]] : [];
  const at = new Date().toISOString();
  for (const key of nuevos) list.push({ tipo, key, at });
  emp.movimientos = { ...prev, [mes]: list };
  guardarEmpresa(emp);
  return emp;
}

export function aplicarPlanServidor(emp, data) {
  if (!emp || !data) return emp;
  if (data.plan === PLAN_PRO || data.plan === PLAN_GRATIS) emp.plan = data.plan;
  if (Number.isFinite(Number(data.movimientosMes))) {
    const mes = monthKey();
    const n = Number(data.movimientosMes);
    const have = movimientosDelMes(emp);
    if (n > have.length) {
      const extra = [];
      for (let i = have.length; i < n; i += 1) {
        extra.push({ tipo: "sync", key: `srv-${i}`, at: new Date().toISOString() });
      }
      const prev = emp.movimientos && typeof emp.movimientos === "object" ? emp.movimientos : {};
      emp.movimientos = { ...prev, [mes]: [...have, ...extra] };
    }
  }
  guardarEmpresa(emp);
  return emp;
}

export async function syncPlanRemoto() {
  const { status, data } = await apiGet("/api/me");
  if (isNoBackend(status, data) || !data?.ok) return { remote: false, data };
  const emp = empresaActual();
  if (emp) aplicarPlanServidor(emp, { plan: data.company?.plan, movimientosMes: data.movimientosMes });
  return { remote: true, data };
}

export async function registrarMovimientosRemoto({ tipo, keys }) {
  const { status, data } = await apiPost("/api/movimiento", { tipo, keys });
  if (isNoBackend(status, data)) return { remote: false, data };
  return { remote: true, status, data };
}

export function textoCupo(emp) {
  if (isPro(emp)) return "Plan Pro · sin tope de movimientos este mes.";
  const n = usadosMes(emp);
  return `Plan Gratis · ${n} de ${GRATIS_LIMITE} movimientos este mes.`;
}
