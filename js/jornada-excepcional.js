import {
  JORNADA_EXCEPCIONAL_DIAS_EXTRA_41,
  JORNADA_EXCEPCIONAL_DIAS_EXTRA_42,
  JORNADA_EXCEPCIONAL_HORIZONTE_2026,
  JORNADA_EXCEPCIONAL_HORIZONTE_2028,
  JORNADA_EXCEPCIONAL_HORIZONTE_SITIO,
  JORNADA_EXCEPCIONAL_PHSC_41_H,
  JORNADA_EXCEPCIONAL_TOLERANCIA_H,
  JORNADA_EXCEPCIONAL_TOPE_AUTORIZABLE_H,
  JORNADA_EXCEPCIONAL_TOPE_ORDINARIO_2026_H,
  JORNADA_EXCEPCIONAL_TOPE_ORDINARIO_2028_H,
} from "./constants.js";
import { topeJornadaOrdinaria } from "./sueldo.js";

/**
 * Sistema excepcional de distribución de jornada y descansos
 * (art. 38 incisos 7°–9° CT + DS N°48/2023 Mintrab).
 *
 * PHSC = (horas_trabajo_ciclo / dias_ciclo) × 7.
 * Estimación educativa: no aprueba ni simula el trámite ante la DT.
 * No es el pacto 4×3 del art. 28 (`/pacto-4x3`), ni el tope gradual
 * 44/42/40 (`/jornada-40-horas`), ni el promedio del art. 22 bis.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1191554
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1202792
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-128281.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-propertyvalue-193335.html
 */

export const JORNADA_EXCEPCIONAL_REGIMEN = Object.freeze({
  error: "error",
  supera_tope: "supera_tope",
  dentro_ordinario: "dentro_ordinario",
  inciso_8: "inciso_8",
});

function horizonteNormalizado(raw) {
  if (raw === JORNADA_EXCEPCIONAL_HORIZONTE_2028) {
    return JORNADA_EXCEPCIONAL_HORIZONTE_2028;
  }
  if (raw === JORNADA_EXCEPCIONAL_HORIZONTE_2026) {
    return JORNADA_EXCEPCIONAL_HORIZONTE_2026;
  }
  return JORNADA_EXCEPCIONAL_HORIZONTE_SITIO;
}

/**
 * Tope ordinario art. 22 según horizonte educativo (2026=42 / 2028=40)
 * o la fecha de referencia del sitio.
 *
 * @param {string} [horizonte]
 * @param {string} [fecha]
 */
export function topeOrdinarioHorizonte(horizonte, fecha) {
  const h = horizonteNormalizado(horizonte);
  if (h === JORNADA_EXCEPCIONAL_HORIZONTE_2028) {
    return JORNADA_EXCEPCIONAL_TOPE_ORDINARIO_2028_H;
  }
  if (h === JORNADA_EXCEPCIONAL_HORIZONTE_2026) {
    return JORNADA_EXCEPCIONAL_TOPE_ORDINARIO_2026_H;
  }
  return topeJornadaOrdinaria(fecha);
}

export function redondearPhsc(n) {
  return Math.round(Number(n) * 100) / 100;
}

/**
 * Días adicionales del inciso 8° / DS 48 art. 7: solo 0 / 4,5 / 9.
 * El margen 41/42 sobre el ordinario de 40 rige hacia 2028 (o si el
 * horizonte fuerza 40 h). En 2026, con ordinario=42, el extra es 0.
 */
export function diasAdicionalesInciso8(phsc, topeOrdinario) {
  const t = JORNADA_EXCEPCIONAL_TOLERANCIA_H;
  const p = Number(phsc);
  const tope = Number(topeOrdinario);
  if (!Number.isFinite(p) || p - JORNADA_EXCEPCIONAL_TOPE_AUTORIZABLE_H > t) {
    return 0;
  }
  if (!Number.isFinite(tope) || p - tope <= t) {
    return 0;
  }
  if (p - JORNADA_EXCEPCIONAL_PHSC_41_H <= t) {
    return JORNADA_EXCEPCIONAL_DIAS_EXTRA_41;
  }
  return JORNADA_EXCEPCIONAL_DIAS_EXTRA_42;
}

function vacio({
  motivo = "datos",
  horizonte = JORNADA_EXCEPCIONAL_HORIZONTE_SITIO,
  topeOrdinarioH = JORNADA_EXCEPCIONAL_TOPE_ORDINARIO_2026_H,
  diasTrabajo = 0,
  diasDescanso = 0,
  horasDiarias = 0,
  diasCiclo = 0,
  horasCiclo = 0,
} = {}) {
  return {
    ok: false,
    motivo,
    regimen: JORNADA_EXCEPCIONAL_REGIMEN.error,
    phsc: 0,
    phscRedondeado: 0,
    horasCiclo,
    diasCiclo,
    diasTrabajo,
    diasDescanso,
    horasDiarias,
    topeOrdinarioH,
    topeAutorizableH: JORNADA_EXCEPCIONAL_TOPE_AUTORIZABLE_H,
    dentroTopeOrdinario: false,
    calificaInciso8: false,
    diasAdicionales: 0,
    horizonte,
  };
}

function ciclosDe(input) {
  if (Array.isArray(input.subciclos) && input.subciclos.length > 0) {
    return input.subciclos;
  }
  return [
    {
      diasTrabajo: input.diasTrabajo,
      diasDescanso: input.diasDescanso,
      horasDiarias: input.horasDiarias,
    },
  ];
}

/**
 * @param {{
 *   diasTrabajo?: number,
 *   diasDescanso?: number,
 *   horasDiarias?: number,
 *   diasCiclo?: number,
 *   horizonte?: "sitio" | "2026" | "2028",
 *   fecha?: string,
 *   subciclos?: Array<{ diasTrabajo?: number, diasDescanso?: number, horasDiarias?: number }>,
 * }} [input]
 */
export function calcularJornadaExcepcional(input = {}) {
  const horizonte = horizonteNormalizado(input.horizonte);
  const topeOrdinarioH = topeOrdinarioHorizonte(horizonte, input.fecha);
  const base = { horizonte, topeOrdinarioH };
  const ciclos = ciclosDe(input);

  let diasTrabajo = 0;
  let diasDescanso = 0;
  let horasCiclo = 0;

  for (const c of ciclos) {
    const dt = Number(c.diasTrabajo);
    const dd = c.diasDescanso == null || c.diasDescanso === ""
      ? 0
      : Number(c.diasDescanso);
    const hd = Number(c.horasDiarias);

    if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(hd) || hd <= 0) {
      return vacio({
        ...base,
        motivo: "datos",
        diasTrabajo: Number.isFinite(dt) ? dt : 0,
        diasDescanso: Number.isFinite(dd) ? dd : 0,
        horasDiarias: Number.isFinite(hd) ? hd : 0,
      });
    }
    if (!Number.isFinite(dd) || dd < 0) {
      return vacio({
        ...base,
        motivo: "descanso",
        diasTrabajo: dt,
        diasDescanso: Number.isFinite(dd) ? dd : 0,
        horasDiarias: hd,
      });
    }

    diasTrabajo += dt;
    diasDescanso += dd;
    horasCiclo += hd * dt;
  }

  const diasCiclo = diasTrabajo + diasDescanso;
  const horasDiarias = diasTrabajo > 0 ? horasCiclo / diasTrabajo : 0;

  if (input.diasCiclo != null && input.diasCiclo !== "") {
    const declarado = Number(input.diasCiclo);
    if (
      !Number.isFinite(declarado) ||
      Math.abs(declarado - diasCiclo) > JORNADA_EXCEPCIONAL_TOLERANCIA_H
    ) {
      return vacio({
        ...base,
        motivo: "ciclo",
        diasTrabajo,
        diasDescanso,
        horasDiarias,
        diasCiclo,
        horasCiclo,
      });
    }
  }

  if (diasCiclo <= 0) {
    return vacio({
      ...base,
      motivo: "ciclo",
      diasTrabajo,
      diasDescanso,
      horasDiarias,
    });
  }

  const phsc = (horasCiclo / diasCiclo) * 7;
  const phscRedondeado = redondearPhsc(phsc);
  const t = JORNADA_EXCEPCIONAL_TOLERANCIA_H;
  const supera = phsc - JORNADA_EXCEPCIONAL_TOPE_AUTORIZABLE_H > t;
  const dentroOrdinario = phsc - topeOrdinarioH <= t;
  const calificaInciso8 = !supera && !dentroOrdinario;
  const diasAdicionales = diasAdicionalesInciso8(phsc, topeOrdinarioH);

  const comun = {
    phsc,
    phscRedondeado,
    horasCiclo,
    diasCiclo,
    diasTrabajo,
    diasDescanso,
    horasDiarias,
    topeOrdinarioH,
    topeAutorizableH: JORNADA_EXCEPCIONAL_TOPE_AUTORIZABLE_H,
    dentroTopeOrdinario: !supera && dentroOrdinario,
    calificaInciso8,
    diasAdicionales,
    horizonte,
  };

  if (supera) {
    return {
      ...comun,
      ok: false,
      motivo: "supera_tope",
      regimen: JORNADA_EXCEPCIONAL_REGIMEN.supera_tope,
      dentroTopeOrdinario: false,
      calificaInciso8: false,
      diasAdicionales: 0,
    };
  }

  return {
    ...comun,
    ok: true,
    motivo: "",
    regimen: calificaInciso8
      ? JORNADA_EXCEPCIONAL_REGIMEN.inciso_8
      : JORNADA_EXCEPCIONAL_REGIMEN.dentro_ordinario,
  };
}
