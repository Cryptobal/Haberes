import { FALLBACK_UF, SALUD_TASA, TOPE_AFP_SALUD_UF, UF_MAX, UF_MIN } from "./constants.js";
import { roundPeso } from "./sueldo.js";

/**
 * Diferencia de un plan Isapre sobre la cotización legal de salud (7 %).
 *
 * Misma rama de salud que `calcularSueldo` (js/sueldo.js):
 *   baseAfpSalud = min(imponible, TOPE_AFP_SALUD_UF × uf)
 *   saludLegal   = roundPeso(baseAfpSalud × SALUD_TASA)
 *   planPesos    = roundPeso(planUf × uf)   o el plan ya en CLP
 *   saludIsapre  = max(saludLegal, planPesos)
 *   diferencia   = saludIsapre − saludLegal   (siempre ≥ 0)
 *   fonasa       = saludLegal
 *
 * `roundPeso` es Math.round al peso (no redondeo del banquero). Con
 * FALLBACK_UF = 40854.01 los gold quedan exactos:
 *   4,5 UF → 183.843; 1,0 UF → 40.854; 10 UF → 408.540;
 *   90 × UF × 0,07 → 257.380.
 *
 * No calcula el líquido (vive en /sueldo) ni compara coberturas.
 * El exceso de cotización (empleador pagó más que max(plan, 7 % con tope))
 * es otro concepto y no se simula aquí.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=7147
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1203779
 * @see https://www.superdesalud.gob.cl/tax-temas-de-orientacion/exceso-de-cotizacion-4015/
 */

export function ufDiferenciaValida(uf) {
  const n = Number(uf);
  return Number.isFinite(n) && n >= UF_MIN && n <= UF_MAX;
}

function salidaCero(motivo, extra = {}) {
  return {
    ok: false,
    motivo,
    imponible: 0,
    uf: 0,
    topeUf: TOPE_AFP_SALUD_UF,
    topePesos: 0,
    baseAfpSalud: 0,
    saludLegal: 0,
    planUf: 0,
    planClp: 0,
    planPesos: 0,
    planFuente: "ninguno",
    saludIsapre: 0,
    diferencia: 0,
    fonasa: 0,
    extraMensual: 0,
    extraAnual: 0,
    ...extra,
  };
}

export function calcularDiferenciaIsapre(input = {}) {
  const ufRaw = input.uf == null || input.uf === "" ? FALLBACK_UF : Number(input.uf);
  if (!ufDiferenciaValida(ufRaw)) {
    return salidaCero("uf", { uf: Number.isFinite(Number(ufRaw)) ? Number(ufRaw) : 0 });
  }
  const uf = ufRaw;

  const imponibleRaw = Number(input.imponible);
  if (!Number.isFinite(imponibleRaw) || imponibleRaw < 0) {
    return salidaCero("imponible", { uf });
  }
  const imponible = roundPeso(imponibleRaw);

  const planUfDado = !(input.planUf == null || input.planUf === "");
  const planClpDado = !(input.planClp == null || input.planClp === "");
  const planUfRaw = planUfDado ? Number(input.planUf) : null;
  const planClpRaw = planClpDado ? Number(input.planClp) : null;
  if (planUfRaw != null && (!Number.isFinite(planUfRaw) || planUfRaw < 0)) {
    return salidaCero("plan", { uf, imponible });
  }
  if (planClpRaw != null && (!Number.isFinite(planClpRaw) || planClpRaw < 0)) {
    return salidaCero("plan", { uf, imponible });
  }

  const topePesos = TOPE_AFP_SALUD_UF * uf;
  const baseAfpSalud = Math.min(imponible, topePesos);
  const saludLegal = roundPeso(baseAfpSalud * SALUD_TASA);

  let planUf = 0;
  let planClp = 0;
  let planPesos = 0;
  let planFuente = "ninguno";
  if (planUfRaw != null) {
    planUf = planUfRaw;
    planPesos = roundPeso(planUf * uf);
    planFuente = "uf";
  } else if (planClpRaw != null) {
    planClp = roundPeso(planClpRaw);
    planPesos = planClp;
    planFuente = "clp";
  }

  const saludIsapre = Math.max(saludLegal, planPesos);
  const diferencia = saludIsapre - saludLegal;

  return {
    ok: true,
    motivo: "",
    imponible,
    uf,
    topeUf: TOPE_AFP_SALUD_UF,
    topePesos,
    baseAfpSalud,
    saludLegal,
    planUf,
    planClp,
    planPesos,
    planFuente,
    saludIsapre,
    diferencia,
    fonasa: saludLegal,
    extraMensual: diferencia,
    extraAnual: diferencia * 12,
  };
}
