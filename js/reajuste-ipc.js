import { roundPeso } from "./sueldo.js";

/**
 * Reajuste de un sueldo (u otra remuneración en pesos) por una variación
 * porcentual del IPC. En el sector privado chileno no es automático por ley:
 * depende del contrato, convenio o pacto.
 *
 * El porcentaje efectivo puede ingresarse a mano o componerse con variaciones
 * mensuales (unidad Porcentaje de mindicador.cl/api/ipc):
 * factor = ∏(1 + v_i/100); pct = (factor − 1) × 100.
 * No suma los porcentajes crudos. No es UTM, UF, zona extrema ni el
 * reajuste por mora del art. 63.
 *
 * reajustado = roundPeso(sueldo × (1 + pct/100))
 */

export function porcentajeAcumulado(variaciones = []) {
  let factor = 1;
  const lista = Array.isArray(variaciones) ? variaciones : [];
  for (const raw of lista) {
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;
    factor *= 1 + v / 100;
  }
  return (factor - 1) * 100;
}

export function calcularReajusteIpc(input = {}) {
  const sueldoActual = roundPeso(Math.max(0, Number(input.sueldoActual) || 0));
  const serie = Array.isArray(input.variacionesMensuales) ? input.variacionesMensuales : null;
  const manual = Number(input.porcentaje);
  const porcentajeEfectivo =
    serie && serie.length
      ? porcentajeAcumulado(serie)
      : Number.isFinite(manual)
        ? manual
        : 0;
  const sueldoReajustado = roundPeso(sueldoActual * (1 + porcentajeEfectivo / 100));
  return {
    sueldoActual,
    porcentajeEfectivo,
    sueldoReajustado,
    deltaPesos: sueldoReajustado - sueldoActual,
  };
}

/** Normaliza la serie de mindicador.cl (`ipc`, unidad Porcentaje). */
export function serieIpcDesdeJson(json) {
  const serie = Array.isArray(json?.serie) ? json.serie : Array.isArray(json) ? json : [];
  const out = [];
  for (const item of serie) {
    const fecha = String(item?.fecha || "");
    const valor = Number(item?.valor);
    if (!/^\d{4}-\d{2}/.test(fecha) || !Number.isFinite(valor)) continue;
    out.push({ fecha, valor });
  }
  return out;
}

function yyyymm(fecha) {
  const m = /^(\d{4})-(\d{2})/.exec(String(fecha || ""));
  return m ? `${m[1]}-${m[2]}` : "";
}

/**
 * Variaciones mensuales inclusivas entre dos meses YYYY-MM.
 * Si falta un mes en la serie, no inventa el valor.
 */
export function variacionesEnRango(serie, desde, hasta) {
  const a = String(desde || "").slice(0, 7);
  const b = String(hasta || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(a) || !/^\d{4}-\d{2}$/.test(b)) {
    return { ok: false, motivo: "rango", variaciones: [], faltantes: [], desde: a, hasta: b };
  }
  const ini = a <= b ? a : b;
  const fin = a <= b ? b : a;
  const byMonth = new Map();
  for (const item of Array.isArray(serie) ? serie : []) {
    const key = yyyymm(item?.fecha || item?.mes);
    const valor = Number(item?.valor);
    if (key && Number.isFinite(valor)) byMonth.set(key, valor);
  }
  const variaciones = [];
  const faltantes = [];
  let y = Number(ini.slice(0, 4));
  let m = Number(ini.slice(5, 7));
  const endY = Number(fin.slice(0, 4));
  const endM = Number(fin.slice(5, 7));
  let guard = 0;
  while ((y < endY || (y === endY && m <= endM)) && guard < 600) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    if (byMonth.has(key)) variaciones.push(byMonth.get(key));
    else faltantes.push(key);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    guard += 1;
  }
  if (faltantes.length) {
    return { ok: false, motivo: "serie_incompleta", variaciones: [], faltantes, desde: ini, hasta: fin };
  }
  return { ok: true, motivo: "", variaciones, faltantes, desde: ini, hasta: fin };
}
