import { parseIsoFecha } from "./feriados.js";
import {
  addCalendarMonthsIso,
  calendarMonthsBetween,
  diffDaysIso,
} from "./contrato-plazo-fijo.js";

/**
 * Término anticipado de un contrato a plazo fijo (art. 159 N°4 CT).
 *
 * Estima la remuneración remanente —los salarios que se habrían percibido
 * hasta el vencimiento pactado— cuando el empleador pone término antes de
 * esa fecha, sin una causal del art. 160. Es una orientación educativa
 * alineada con la práctica jurisprudencial consolidada; el tribunal del
 * caso concreto puede diferir. No calcula finiquito, IAS, aviso, recargo
 * del art. 168 ni el tope de duración de `/contrato-plazo-fijo`.
 *
 * Precedencia del plazo: si hay `fechaTerminoPactada` válida (YYYY-MM-DD),
 * se usa esa fecha. Si no, se proyecta con `mesesRemanentes` (>0) desde
 * `fechaTerminoAnticipado` (mismos meses de calendario que el tope de
 * `/contrato-plazo-fijo`).
 *
 * Fórmula:
 *   meses_remanentes = calendarMonthsBetween(anticipado, pactada)
 *     = Δaños×12 + Δmeses + (Δdías / último_día_del_mes_pactado)
 *   días_remanentes = diffDaysIso(anticipado, pactada)
 *   remuneración_remanente = round(meses_remanentes × sueldo_mensual)
 *
 * Gold 2026: $800.000; 1-abr-2026 → 1-jul-2026 → 3,00 meses → $2.400.000.
 * No usa (días / 30) × sueldo: ese tramo son 91 días y daría $2.426.667.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 */

export const FUENTE_PLAZO_REMANENTE = Object.freeze({
  ninguna: "ninguna",
  fechaTerminoPactada: "fechaTerminoPactada",
  mesesRemanentes: "mesesRemanentes",
});

function vacio({
  motivo = "sueldo",
  sueldoMensual = 0,
  fechaTerminoAnticipado = "",
  fechaTerminoPactada = "",
  mesesRemanentesInput = 0,
  fuentePlazo = FUENTE_PLAZO_REMANENTE.ninguna,
} = {}) {
  return {
    ok: false,
    motivo,
    sueldoMensual,
    fechaTerminoAnticipado,
    fechaTerminoPactada,
    mesesRemanentesInput,
    fuentePlazo,
    diasRemanentes: 0,
    mesesRemanentes: 0,
    remuneracionRemanente: 0,
  };
}

/**
 * @param {{
 *   sueldoMensual?: number,
 *   fechaTerminoAnticipado?: string,
 *   fechaTerminoPactada?: string,
 *   mesesRemanentes?: number,
 * }} [input]
 */
export function calcularTerminoAnticipadoPlazoFijo(input = {}) {
  const sueldoRaw = Number(input.sueldoMensual);
  const sueldoMensual = Number.isFinite(sueldoRaw) && sueldoRaw > 0 ? sueldoRaw : 0;
  const fechaAnticipado = parseIsoFecha(input.fechaTerminoAnticipado)
    ? String(input.fechaTerminoAnticipado).trim()
    : "";
  const fechaPactadaIn = parseIsoFecha(input.fechaTerminoPactada)
    ? String(input.fechaTerminoPactada).trim()
    : "";
  const mesesRaw = Number(input.mesesRemanentes);
  const hasMeses = Number.isFinite(mesesRaw) && mesesRaw > 0;

  const base = {
    sueldoMensual,
    fechaTerminoAnticipado: fechaAnticipado,
    mesesRemanentesInput: hasMeses ? mesesRaw : 0,
  };

  if (!sueldoMensual) {
    return vacio({ ...base, motivo: "sueldo" });
  }
  if (!fechaAnticipado) {
    return vacio({ ...base, motivo: "fecha_anticipado" });
  }

  let fuentePlazo = FUENTE_PLAZO_REMANENTE.ninguna;
  let fechaTerminoPactada = "";
  if (fechaPactadaIn) {
    fuentePlazo = FUENTE_PLAZO_REMANENTE.fechaTerminoPactada;
    fechaTerminoPactada = fechaPactadaIn;
  } else if (hasMeses) {
    fuentePlazo = FUENTE_PLAZO_REMANENTE.mesesRemanentes;
    fechaTerminoPactada = addCalendarMonthsIso(fechaAnticipado, mesesRaw);
  } else {
    return vacio({ ...base, motivo: "plazo", fuentePlazo });
  }

  const diasHasta = diffDaysIso(fechaAnticipado, fechaTerminoPactada);
  if (!fechaTerminoPactada || diasHasta < 0) {
    return vacio({
      ...base,
      fechaTerminoPactada,
      fuentePlazo,
      motivo: "fecha_termino",
    });
  }

  const mesesRemanentes = calendarMonthsBetween(fechaAnticipado, fechaTerminoPactada);
  const remuneracionRemanente = Math.round(mesesRemanentes * sueldoMensual);

  return {
    ok: true,
    motivo: "",
    sueldoMensual,
    fechaTerminoAnticipado: fechaAnticipado,
    fechaTerminoPactada,
    mesesRemanentesInput: hasMeses ? mesesRaw : 0,
    fuentePlazo,
    diasRemanentes: diasHasta,
    mesesRemanentes,
    remuneracionRemanente,
  };
}
