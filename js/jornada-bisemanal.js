import {
  JORNADA_BISEMANAL_MAX_DIAS_TRABAJO,
  JORNADA_BISEMANAL_MIN_DIAS_DESCANSO,
  JORNADA_BISEMANAL_TOLERANCIA_H,
  JORNADA_EXCEPCIONAL_HORIZONTE_SITIO,
} from "./constants.js";
import { topeOrdinarioHorizonte } from "./jornada-excepcional.js";

/**
 * Jornada bisemanal (art. 39 Código del Trabajo).
 *
 * Hasta 12 días continuos de trabajo y, al término, mínimo 3 días de
 * descanso consecutivos. Promedio semanal del ciclo:
 * promedio = (horas_ciclo × 7) / dias_ciclo, con dias_ciclo = trabajo + descanso.
 * Se compara con el tope ordinario del art. 22 según horizonte
 * (42 h en 2026, 40 h en 2028 o la fecha del sitio).
 *
 * Estimación educativa: no es el sistema excepcional del art. 38 / DS 48
 * (`/jornada-excepcional`), ni el pacto 4×3 del art. 28 (`/pacto-4x3`),
 * ni el tope gradual de `/jornada-40-horas`. No es asesoría legal.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1191554
 */

export const JORNADA_BISEMANAL_REGIMEN = Object.freeze({
  error: "error",
  invalido_art39: "invalido_art39",
  dentro_ordinario: "dentro_ordinario",
  supera_tope: "supera_tope",
});

export function redondearPromedio(n) {
  return Math.round(Number(n) * 100) / 100;
}

function vacio({
  motivo = "datos",
  horizonte = JORNADA_EXCEPCIONAL_HORIZONTE_SITIO,
  topeOrdinarioH = 0,
  diasTrabajo = 0,
  diasDescanso = 0,
  horasCiclo = 0,
} = {}) {
  return {
    ok: false,
    motivo,
    regimen: JORNADA_BISEMANAL_REGIMEN.error,
    diasTrabajo,
    diasDescanso,
    horasCiclo,
    diasCiclo: 0,
    horasDiariasPromedio: 0,
    promedioSemanal: 0,
    promedioSemanalRedondeado: 0,
    topeOrdinarioH,
    maxDiasTrabajo: JORNADA_BISEMANAL_MAX_DIAS_TRABAJO,
    minDiasDescanso: JORNADA_BISEMANAL_MIN_DIAS_DESCANSO,
    cumpleDiasTrabajo: false,
    cumpleDescanso: false,
    cumpleArt39: false,
    dentroTopeOrdinario: false,
    horizonte,
  };
}

/**
 * @param {{
 *   diasTrabajo?: number,
 *   diasDescanso?: number,
 *   horasCiclo?: number,
 *   horizonte?: "sitio" | "2026" | "2028",
 *   fecha?: string,
 * }} [input]
 */
export function calcularJornadaBisemanal(input = {}) {
  const topeOrdinarioH = topeOrdinarioHorizonte(input.horizonte, input.fecha);
  const horizonte = input.horizonte === "2026" || input.horizonte === "2028"
    ? input.horizonte
    : JORNADA_EXCEPCIONAL_HORIZONTE_SITIO;
  const base = { horizonte, topeOrdinarioH };

  const dt = Number(input.diasTrabajo);
  const dd = input.diasDescanso == null || input.diasDescanso === ""
    ? 0
    : Number(input.diasDescanso);
  const hc = Number(input.horasCiclo);

  if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(hc) || hc <= 0) {
    return vacio({
      ...base,
      motivo: "datos",
      diasTrabajo: Number.isFinite(dt) ? dt : 0,
      diasDescanso: Number.isFinite(dd) ? dd : 0,
      horasCiclo: Number.isFinite(hc) ? hc : 0,
    });
  }
  if (!Number.isFinite(dd) || dd < 0) {
    return vacio({
      ...base,
      motivo: "descanso",
      diasTrabajo: dt,
      diasDescanso: Number.isFinite(dd) ? dd : 0,
      horasCiclo: hc,
    });
  }
  if (!Number.isInteger(dt) || !Number.isInteger(dd)) {
    return vacio({
      ...base,
      motivo: "dias",
      diasTrabajo: dt,
      diasDescanso: dd,
      horasCiclo: hc,
    });
  }

  const diasCiclo = dt + dd;
  const promedioSemanal = (hc * 7) / diasCiclo;
  const promedioSemanalRedondeado = redondearPromedio(promedioSemanal);
  const horasDiariasPromedio = hc / dt;

  const cumpleDiasTrabajo = dt <= JORNADA_BISEMANAL_MAX_DIAS_TRABAJO;
  const cumpleDescanso = dd >= JORNADA_BISEMANAL_MIN_DIAS_DESCANSO;
  const cumpleArt39 = cumpleDiasTrabajo && cumpleDescanso;
  const dentroTopeOrdinario = promedioSemanal - topeOrdinarioH <= JORNADA_BISEMANAL_TOLERANCIA_H;

  const comun = {
    diasTrabajo: dt,
    diasDescanso: dd,
    horasCiclo: hc,
    diasCiclo,
    horasDiariasPromedio,
    promedioSemanal,
    promedioSemanalRedondeado,
    topeOrdinarioH,
    maxDiasTrabajo: JORNADA_BISEMANAL_MAX_DIAS_TRABAJO,
    minDiasDescanso: JORNADA_BISEMANAL_MIN_DIAS_DESCANSO,
    cumpleDiasTrabajo,
    cumpleDescanso,
    cumpleArt39,
    dentroTopeOrdinario,
    horizonte,
  };

  if (!cumpleArt39) {
    return {
      ...comun,
      ok: false,
      motivo: cumpleDiasTrabajo ? "art39_descanso" : "art39_dias",
      regimen: JORNADA_BISEMANAL_REGIMEN.invalido_art39,
    };
  }
  if (!dentroTopeOrdinario) {
    return {
      ...comun,
      ok: false,
      motivo: "supera_tope",
      regimen: JORNADA_BISEMANAL_REGIMEN.supera_tope,
    };
  }
  return {
    ...comun,
    ok: true,
    motivo: "",
    regimen: JORNADA_BISEMANAL_REGIMEN.dentro_ordinario,
  };
}
