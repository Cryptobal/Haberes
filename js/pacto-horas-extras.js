import { JORNADA_DEFAULT, PACTO_HE_TOPE_DIARIO } from "./constants.js";
import { valorHoraExtra, valorHoraOrdinaria } from "./sueldo.js";

/**
 * Pago educativo de horas extraordinarias con o sin pacto escrito
 * (Código del Trabajo, arts. 31 y 32).
 *
 * Reutiliza la fórmula DT de `/horas-extras`:
 * sueldo / 30 × 28 / (jornada × 4) = hora ordinaria; × 1,5 = hora extra.
 *
 * El monto no cambia si falta el escrito: la guía del repo recuerda que,
 * con conocimiento del empleador, igual son extras. Sí se marca
 * `faltaPactoEscrito` (art. 31). El tope de 2 h en el día más largo es
 * orientativo; no cubre excepciones legales (p. ej. art. 29).
 *
 * No calcula AFP, salud ni IUSC.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/portal/1628/w3-article-95182.html
 */

function noNegativo(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function jornadaUsada(raw) {
  if (raw == null || raw === "") return JORNADA_DEFAULT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

/**
 * @param {unknown} raw
 * @returns {number | null} null si el día más largo no se informó
 */
function diaMasLargo(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * @param {{
 *   remuneracion?: number,
 *   jornadaSemanal?: number,
 *   horasExtras?: number,
 *   hayPacto?: boolean,
 *   horasDiaMasLargo?: number | null,
 * }} [input]
 */
export function calcularPactoHorasExtras(input = {}) {
  const remuneracion = noNegativo(input.remuneracion);
  const jornadaSemanal = jornadaUsada(input.jornadaSemanal);
  const horasExtras = noNegativo(input.horasExtras);
  const hayPacto = input.hayPacto === true;
  const horasDia = diaMasLargo(input.horasDiaMasLargo);
  const valorHora = valorHoraOrdinaria(remuneracion, jornadaSemanal || JORNADA_DEFAULT);
  const valorExtra = valorHoraExtra(remuneracion, jornadaSemanal || JORNADA_DEFAULT);
  const baseOk = remuneracion > 0 && jornadaSemanal > 0;
  const horaOrdinaria = baseOk ? valorHora : 0;
  const horaExtra = baseOk ? valorExtra : 0;
  const total = horaExtra * horasExtras;

  return {
    ok: baseOk,
    remuneracion,
    jornadaSemanal,
    horasExtras,
    hayPacto,
    faltaPactoEscrito: !hayPacto && horasExtras > 0,
    horasDiaMasLargo: horasDia,
    excedeTopeDiario: horasDia != null && horasDia > PACTO_HE_TOPE_DIARIO,
    topeDiario: PACTO_HE_TOPE_DIARIO,
    valorHoraOrdinaria: horaOrdinaria,
    valorHoraExtra: horaExtra,
    total,
  };
}
