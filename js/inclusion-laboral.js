import {
  CUOTA_INCLUSION_LABORAL,
  DONACION_INCLUSION_IMM_ANUAL,
  IMM,
  UMBRAL_INCLUSION_LABORAL,
} from "./constants.js";
import { roundPeso } from "./sueldo.js";

/**
 * Cuota del 1 % de inclusión laboral (Ley 21.015 / arts. 157 bis y 157 ter).
 * Redondeo: DS N°64 art. 6 c) y ORD. N°1513/42 DT — entero inferior.
 * Donación orientativa: 24 IMM × gap (piso art. 157 ter N°4).
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1103997
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1114287
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-125364.html
 */

function enteroNoNegativo(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.floor(v);
}

export function cuotaInclusionLaboral(dotacion) {
  const dota = enteroNoNegativo(dotacion);
  if (dota < UMBRAL_INCLUSION_LABORAL) return 0;
  return Math.floor(dota * CUOTA_INCLUSION_LABORAL);
}

export function calcularInclusionLaboral(input = {}) {
  const dotacion = enteroNoNegativo(input.dotacion);
  const contratados = enteroNoNegativo(input.contratados);
  const immIn = Number(input.imm);
  const imm = immIn > 0 && Number.isFinite(immIn) ? roundPeso(immIn) : IMM;
  const aplica = dotacion >= UMBRAL_INCLUSION_LABORAL;
  const cuota = aplica ? Math.floor(dotacion * CUOTA_INCLUSION_LABORAL) : 0;
  const gap = aplica ? Math.max(0, cuota - contratados) : 0;
  const donacionUnitaria = roundPeso(DONACION_INCLUSION_IMM_ANUAL * imm);
  const donacion = roundPeso(gap * donacionUnitaria);
  return {
    ok: true,
    aplica,
    dotacion,
    contratados,
    cuota,
    gap,
    imm,
    donacionUnitaria,
    donacion,
    umbral: UMBRAL_INCLUSION_LABORAL,
    tasa: CUOTA_INCLUSION_LABORAL,
    immPorPersona: DONACION_INCLUSION_IMM_ANUAL,
  };
}
