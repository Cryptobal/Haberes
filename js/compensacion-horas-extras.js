import {
  COMPENSACION_HE_AVISO_HORAS,
  COMPENSACION_HE_JORNADA_DIARIA_DEFAULT,
  COMPENSACION_HE_PLAZO_MESES,
  COMPENSACION_HE_RECARGO,
  COMPENSACION_HE_TOLERANCIA,
  COMPENSACION_HE_TOPE_DIAS,
} from "./constants.js";
import { valorHoraExtra } from "./sueldo.js";

/**
 * Compensación de horas extraordinarias por días adicionales de feriado
 * (art. 32 inc. 4° CT / Ley 21.561).
 *
 * horas_feriado = HE × 1,5
 * días equivalentes = horas_feriado / jornada_diaria
 * días completos = piso (ORD. N°199/5: no medios días; ORD. N°387/11:
 * hace falta el equivalente a la jornada del día a compensar).
 * Tope anual: 5 días hábiles; el resto se pagaría en dinero.
 *
 * La equivalencia en pesos (sueldo opcional) usa la misma fórmula DT
 * de `/horas-extras`: sueldo / 30 × 28 / (jornada semanal × 4) × 1,5,
 * con jornada semanal = jornada diaria × 5.
 *
 * Estimación educativa. Requiere pacto escrito. No es el pago de
 * `/horas-extras` ni el feriado anual de `/feriado-anual`.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1191554
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-125559.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-125738.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-127877.html
 */

function vacio({
  motivo = "horas",
  horasExtra = 0,
  horasJornadaDiaria = COMPENSACION_HE_JORNADA_DIARIA_DEFAULT,
  sueldoMensual = 0,
} = {}) {
  const jornada = Number.isFinite(horasJornadaDiaria) && horasJornadaDiaria > 0
    ? horasJornadaDiaria
    : COMPENSACION_HE_JORNADA_DIARIA_DEFAULT;
  return {
    ok: false,
    motivo,
    horasExtra: Number.isFinite(horasExtra) ? horasExtra : 0,
    horasJornadaDiaria: jornada,
    horasFeriado: 0,
    diasEquivalentes: 0,
    diasCompletos: 0,
    horasRestantes: 0,
    diasDentroTope: 0,
    diasFueraTope: 0,
    horasDentroTope: 0,
    horasFueraTope: 0,
    topeDias: COMPENSACION_HE_TOPE_DIAS,
    recargo: COMPENSACION_HE_RECARGO,
    plazoMeses: COMPENSACION_HE_PLAZO_MESES,
    avisoHoras: COMPENSACION_HE_AVISO_HORAS,
    sueldoMensual,
    jornadaSemanal: jornada * 5,
    valorHoraExtra: 0,
    equivalenciaPago: 0,
    equivalenciaFueraTope: 0,
  };
}

function horasNoNegativa(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function jornadaPositiva(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function limpiaHoras(n) {
  const v = Math.round(n * 1e6) / 1e6;
  return Math.abs(v) < 1e-6 ? 0 : v;
}

/**
 * @param {{
 *   horasExtra?: number,
 *   horasJornadaDiaria?: number,
 *   sueldoMensual?: number,
 * }} [input]
 */
export function calcularCompensacionHorasExtras(input = {}) {
  const horasExtra = horasNoNegativa(input.horasExtra);
  const horasJornadaDiaria = jornadaPositiva(
    input.horasJornadaDiaria == null || input.horasJornadaDiaria === ""
      ? COMPENSACION_HE_JORNADA_DIARIA_DEFAULT
      : input.horasJornadaDiaria,
  );
  const sueldoRaw = Number(input.sueldoMensual);
  const sueldoMensual = Number.isFinite(sueldoRaw) && sueldoRaw > 0 ? sueldoRaw : 0;

  if (horasJornadaDiaria == null) {
    return vacio({
      motivo: "jornada",
      horasExtra: horasExtra ?? 0,
      sueldoMensual,
    });
  }

  if (horasExtra == null) {
    return vacio({
      motivo: "horas",
      horasJornadaDiaria,
      sueldoMensual,
    });
  }

  if (horasExtra === 0) {
    return vacio({
      motivo: "horas",
      horasExtra: 0,
      horasJornadaDiaria,
      sueldoMensual,
    });
  }

  const horasFeriado = horasExtra * COMPENSACION_HE_RECARGO;
  const diasEquivalentes = horasFeriado / horasJornadaDiaria;
  const diasCompletos = Math.floor(diasEquivalentes + COMPENSACION_HE_TOLERANCIA);
  const horasRestantes = limpiaHoras(horasFeriado - diasCompletos * horasJornadaDiaria);
  const diasDentroTope = Math.min(diasCompletos, COMPENSACION_HE_TOPE_DIAS);
  const diasFueraTope = Math.max(0, diasCompletos - COMPENSACION_HE_TOPE_DIAS);
  const horasTope = COMPENSACION_HE_TOPE_DIAS * horasJornadaDiaria;
  const horasDentroTope = Math.min(horasFeriado, horasTope);
  const horasFueraTope = limpiaHoras(Math.max(0, horasFeriado - horasTope));
  const jornadaSemanal = horasJornadaDiaria * 5;
  const unit = sueldoMensual > 0 ? valorHoraExtra(sueldoMensual, jornadaSemanal) : 0;
  const equivalenciaPago = unit * horasExtra;
  const horasExtraFueraTope = COMPENSACION_HE_RECARGO > 0
    ? horasFueraTope / COMPENSACION_HE_RECARGO
    : 0;

  return {
    ok: true,
    motivo: "",
    horasExtra,
    horasJornadaDiaria,
    horasFeriado,
    diasEquivalentes,
    diasCompletos,
    horasRestantes,
    diasDentroTope,
    diasFueraTope,
    horasDentroTope,
    horasFueraTope,
    topeDias: COMPENSACION_HE_TOPE_DIAS,
    recargo: COMPENSACION_HE_RECARGO,
    plazoMeses: COMPENSACION_HE_PLAZO_MESES,
    avisoHoras: COMPENSACION_HE_AVISO_HORAS,
    sueldoMensual,
    jornadaSemanal,
    valorHoraExtra: unit,
    equivalenciaPago,
    equivalenciaFueraTope: unit * horasExtraFueraTope,
  };
}
