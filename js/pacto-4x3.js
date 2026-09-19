import {
  PACTO_4X3_DIAS_MAX,
  PACTO_4X3_DIAS_MIN,
  PACTO_4X3_DIAS_SEMANA,
  PACTO_4X3_TOLERANCIA_H,
  PACTO_4X3_TOPE_DIARIO_H,
  PACTO_4X3_TOPE_SEMANAL_H,
  PACTO_4X3_VIGENCIA_GENERAL,
} from "./constants.js";

/**
 * Pacto 4×3 (Ley 21.561): estimar si una jornada ordinaria de hasta 40 h
 * semanales puede repartirse en 4 días de trabajo y 3 de descanso.
 *
 * Estimación educativa. El pacto es voluntario y escrito; no es automático
 * por la rebaja a 42 h de abril de 2026. No es el tope gradual 44/42/40
 * (`/jornada-40-horas`), ni el promedio del art. 22 bis, ni las bandas
 * horarias de cuidado familiar (`/bandas-horarias`).
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1191554
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-125559.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-125561.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-128951.html
 * @see https://www.mintrab.gob.cl/40horas/
 */

export const PACTO_4X3_ELEGIBILIDAD = Object.freeze({
  ahora: "ahora",
  desde_2028: "desde_2028",
  no_aplica: "no_aplica",
});

function vacio({
  motivo = "horas",
  elegibilidad = PACTO_4X3_ELEGIBILIDAD.no_aplica,
  horasSemanales = 0,
  diasTrabajo = PACTO_4X3_DIAS_MIN,
  reduccionAnticipada = false,
} = {}) {
  const dias = Number.isFinite(diasTrabajo) && diasTrabajo > 0
    ? diasTrabajo
    : PACTO_4X3_DIAS_MIN;
  return {
    ok: false,
    motivo,
    elegibilidad,
    horasSemanales,
    horasParaReparto: 0,
    diasTrabajo: dias,
    diasDescanso: PACTO_4X3_DIAS_SEMANA - dias,
    horasDiarias: 0,
    cabeEnTopeDiario: false,
    topeDiarioH: PACTO_4X3_TOPE_DIARIO_H,
    topeSemanalH: PACTO_4X3_TOPE_SEMANAL_H,
    diasMin: PACTO_4X3_DIAS_MIN,
    diasMax: PACTO_4X3_DIAS_MAX,
    vigenciaGeneral: PACTO_4X3_VIGENCIA_GENERAL,
    reduccionAnticipada: Boolean(reduccionAnticipada),
  };
}

function horasPositiva(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

function diasEntero(raw) {
  if (raw == null || raw === "") return PACTO_4X3_DIAS_MIN;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

/**
 * @param {{
 *   horasSemanales?: number,
 *   diasTrabajo?: number,
 *   reduccionAnticipada?: boolean,
 * }} [input]
 */
export function calcularPacto4x3(input = {}) {
  const horasSemanales = horasPositiva(input.horasSemanales);
  const reduccionAnticipada = Boolean(input.reduccionAnticipada);
  const diasTrabajo = diasEntero(input.diasTrabajo);

  if (diasTrabajo == null || diasTrabajo < 1) {
    return vacio({
      motivo: "dias",
      horasSemanales,
      reduccionAnticipada,
    });
  }

  const baseDias = {
    diasTrabajo,
    reduccionAnticipada,
    horasSemanales,
  };

  if (horasSemanales <= 0) {
    return vacio({
      ...baseDias,
      motivo: "horas",
    });
  }

  const superaSinReduccion =
    horasSemanales - PACTO_4X3_TOPE_SEMANAL_H > PACTO_4X3_TOLERANCIA_H &&
    !reduccionAnticipada;

  if (superaSinReduccion) {
    return {
      ...vacio({
        ...baseDias,
        motivo: "supera_40",
        elegibilidad: PACTO_4X3_ELEGIBILIDAD.desde_2028,
      }),
      horasSemanales,
      diasTrabajo,
      diasDescanso: PACTO_4X3_DIAS_SEMANA - diasTrabajo,
      horasDiarias: 0,
      reduccionAnticipada,
    };
  }

  const horasParaReparto =
    horasSemanales > PACTO_4X3_TOPE_SEMANAL_H && reduccionAnticipada
      ? PACTO_4X3_TOPE_SEMANAL_H
      : horasSemanales;
  const horasDiarias = horasParaReparto / diasTrabajo;
  const cabeEnTopeDiario =
    horasDiarias - PACTO_4X3_TOPE_DIARIO_H <= PACTO_4X3_TOLERANCIA_H;
  const diasEnRango =
    diasTrabajo >= PACTO_4X3_DIAS_MIN && diasTrabajo <= PACTO_4X3_DIAS_MAX;

  const comun = {
    horasSemanales,
    horasParaReparto,
    diasTrabajo,
    diasDescanso: PACTO_4X3_DIAS_SEMANA - diasTrabajo,
    horasDiarias,
    cabeEnTopeDiario,
    topeDiarioH: PACTO_4X3_TOPE_DIARIO_H,
    topeSemanalH: PACTO_4X3_TOPE_SEMANAL_H,
    diasMin: PACTO_4X3_DIAS_MIN,
    diasMax: PACTO_4X3_DIAS_MAX,
    vigenciaGeneral: PACTO_4X3_VIGENCIA_GENERAL,
    reduccionAnticipada,
  };

  if (!cabeEnTopeDiario) {
    return {
      ...comun,
      ok: false,
      motivo: "tope",
      elegibilidad: PACTO_4X3_ELEGIBILIDAD.no_aplica,
    };
  }

  if (!diasEnRango) {
    return {
      ...comun,
      ok: false,
      motivo: "dias",
      elegibilidad: PACTO_4X3_ELEGIBILIDAD.no_aplica,
    };
  }

  return {
    ...comun,
    ok: true,
    motivo: "",
    elegibilidad: PACTO_4X3_ELEGIBILIDAD.ahora,
  };
}
