import {
  JORNADA_ORDINARIA_MAX_H,
  JORNADA_ORDINARIA_MIN_H,
  JORNADA_PARCIAL_FERIADO_BASE_DIAS,
  JORNADA_PARCIAL_FRACCION_TOPE,
  JORNADA_PARCIAL_TOLERANCIA_H,
} from "./constants.js";
import { roundPeso } from "./sueldo.js";

/**
 * Jornada parcial (art. 40 bis CT): tope de 2/3 de la jornada ordinaria
 * de la empresa, sueldo proporcional orientativo y feriado en días
 * (15 hábiles art. 67 × horas/ordinaria).
 *
 * No calcula IAS, finiquito, cotizaciones ni impuesto.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1191554
 */

function horasNoNegativa(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return v;
}

export function maxHorasParcial(jornadaOrdinariaSemanal) {
  const ordinaria = horasNoNegativa(jornadaOrdinariaSemanal);
  if (ordinaria <= 0) return 0;
  return JORNADA_PARCIAL_FRACCION_TOPE * ordinaria;
}

export function calcularJornadaParcial(input = {}) {
  let jornadaOrdinariaSemanal = horasNoNegativa(input.jornadaOrdinariaSemanal);
  if (jornadaOrdinariaSemanal > 0) {
    jornadaOrdinariaSemanal = Math.min(
      JORNADA_ORDINARIA_MAX_H,
      Math.max(JORNADA_ORDINARIA_MIN_H, jornadaOrdinariaSemanal),
    );
  }
  const horasParcialContrato = horasNoNegativa(input.horasParcialContrato);
  const sueldoOrdinarioReferencia = roundPeso(
    Math.max(0, Number(input.sueldoOrdinarioReferencia) || 0),
  );
  const maxParcialHoras = maxHorasParcial(jornadaOrdinariaSemanal);
  const cumpleTope =
    jornadaOrdinariaSemanal > 0 &&
    horasParcialContrato - maxParcialHoras <= JORNADA_PARCIAL_TOLERANCIA_H;
  const porcentajeJornada =
    jornadaOrdinariaSemanal > 0 ? (100 * horasParcialContrato) / jornadaOrdinariaSemanal : 0;
  const sueldoParcial =
    jornadaOrdinariaSemanal > 0
      ? roundPeso((sueldoOrdinarioReferencia * horasParcialContrato) / jornadaOrdinariaSemanal)
      : 0;
  const diasFeriado =
    jornadaOrdinariaSemanal > 0
      ? (JORNADA_PARCIAL_FERIADO_BASE_DIAS * horasParcialContrato) / jornadaOrdinariaSemanal
      : 0;
  return {
    ok: true,
    jornadaOrdinariaSemanal,
    horasParcialContrato,
    sueldoOrdinarioReferencia,
    maxParcialHoras,
    cumpleTope,
    porcentajeJornada,
    sueldoParcial,
    diasFeriado,
    toleranciaHoras: JORNADA_PARCIAL_TOLERANCIA_H,
    fraccionTope: JORNADA_PARCIAL_FRACCION_TOPE,
    feriadoBaseDias: JORNADA_PARCIAL_FERIADO_BASE_DIAS,
  };
}
