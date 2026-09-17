import {
  CONTRATO_PLAZO_FIJO_TOLERANCIA_DIAS,
  CONTRATO_PLAZO_FIJO_TOPE_GENERAL_MESES,
  CONTRATO_PLAZO_FIJO_TOPE_TITULO_MESES,
} from "./constants.js";
import { parseIsoFecha, ymdIso } from "./feriados.js";

/**
 * Contrato a plazo fijo (art. 159 N°4 CT).
 *
 * Precedencia de duración: si hay `fechaTermino` válida (YYYY-MM-DD), se usa
 * esa fecha explícita. Si no, se calcula con `plazoMeses` (>0) desde
 * `fechaInicio`.
 *
 * Tope: 12 meses; 24 si gerente o título profesional/técnico de institución
 * de educación superior del Estado o reconocida por éste. Esta página estima
 * el tramo actual (no suma un plazo original previo). Dictamen DT 65/1:
 * el máximo rige el contrato inicial y su prórroga.
 *
 * Transformación a indefinido: continuidad tras el vencimiento con
 * conocimiento del empleador, o agotamiento de la única renovación
 * permitida (no hay segunda renovación a plazo fijo).
 *
 * No calcula finiquito, IAS, aviso previo ni feriado.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-102862.html
 * @see https://www.dt.gob.cl/portal/1628/w3-article-60792.html
 */

export const MOTIVO_INDEFINIDO = Object.freeze({
  ninguno: "ninguno",
  renovacion_agotada: "renovacion_agotada",
  continuidad_tras_vencimiento: "continuidad_tras_vencimiento",
  renovacion_agotada_y_continuidad: "renovacion_agotada_y_continuidad",
});

export const MOTIVO_INDEFINIDO_LABEL = Object.freeze({
  ninguno: "No se transforma",
  renovacion_agotada: "Renovación agotada",
  continuidad_tras_vencimiento: "Continuidad tras el vencimiento",
  renovacion_agotada_y_continuidad: "Renovación agotada y continuidad",
});

export const FUENTE_PLAZO = Object.freeze({
  ninguna: "ninguna",
  fechaTermino: "fechaTermino",
  plazoMeses: "plazoMeses",
});

export function hoyChileIso(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addCalendarMonthsIso(iso, months) {
  const parts = parseIsoFecha(iso);
  const n = Number(months);
  if (!parts || !Number.isFinite(n)) return "";
  const whole = Math.trunc(n);
  const frac = n - whole;
  const dt = new Date(parts.y, parts.mo - 1, 1);
  dt.setMonth(dt.getMonth() + whole);
  const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  dt.setDate(Math.min(parts.d, last));
  if (frac > 1e-9) {
    const daysIn = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
    dt.setDate(dt.getDate() + Math.round(frac * daysIn));
  }
  return ymdIso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

export function diffDaysIso(a, b) {
  const pa = parseIsoFecha(a);
  const pb = parseIsoFecha(b);
  if (!pa || !pb) return 0;
  const ta = Date.UTC(pa.y, pa.mo - 1, pa.d);
  const tb = Date.UTC(pb.y, pb.mo - 1, pb.d);
  return Math.round((tb - ta) / 86400000);
}

export function calendarMonthsBetween(isoA, isoB) {
  const a = parseIsoFecha(isoA);
  const b = parseIsoFecha(isoB);
  if (!a || !b) return 0;
  const lastDayB = new Date(Date.UTC(b.y, b.mo, 0)).getUTCDate();
  return (b.y - a.y) * 12 + (b.mo - a.mo) + (b.d - a.d) / lastDayB;
}

function asBool(v) {
  return v === true || v === 1 || v === "1" || v === "true" || v === "on";
}

function vacio({
  fechaInicio = "",
  fechaTermino = "",
  fechaReferencia = "",
  plazoMeses = 0,
  fuentePlazo = FUENTE_PLAZO.ninguna,
  topeLegalMeses = CONTRATO_PLAZO_FIJO_TOPE_GENERAL_MESES,
  esTituloProfesionalOTecnico = false,
  esGerente = false,
  esRenovacion = false,
  continuaTrasVencimiento = false,
  motivo = "",
} = {}) {
  return {
    ok: false,
    motivo,
    fechaInicio,
    fechaTermino,
    fechaReferencia,
    plazoMeses,
    fuentePlazo,
    duracionMeses: 0,
    duracionDias: 0,
    topeLegalMeses,
    topeFecha: "",
    cumpleTope: false,
    vencido: false,
    diasRestantes: 0,
    esTituloProfesionalOTecnico,
    esGerente,
    esRenovacion,
    continuaTrasVencimiento,
    seTransformaEnIndefinido: false,
    motivoIndefinido: MOTIVO_INDEFINIDO.ninguno,
    toleranciaDias: CONTRATO_PLAZO_FIJO_TOLERANCIA_DIAS,
  };
}

export function calcularContratoPlazoFijo(input = {}) {
  const fechaInicio = parseIsoFecha(input.fechaInicio) ? String(input.fechaInicio).trim() : "";
  const fechaTerminoIn = parseIsoFecha(input.fechaTermino) ? String(input.fechaTermino).trim() : "";
  const plazoMesesRaw = Number(input.plazoMeses);
  const hasPlazo = Number.isFinite(plazoMesesRaw) && plazoMesesRaw > 0;
  const esTituloProfesionalOTecnico = asBool(input.esTituloProfesionalOTecnico);
  const esGerente = asBool(input.esGerente);
  const esRenovacion = asBool(input.esRenovacion);
  const continuaTrasVencimiento = asBool(input.continuaTrasVencimiento);
  const topeLegalMeses =
    esTituloProfesionalOTecnico || esGerente
      ? CONTRATO_PLAZO_FIJO_TOPE_TITULO_MESES
      : CONTRATO_PLAZO_FIJO_TOPE_GENERAL_MESES;
  const fechaReferencia = parseIsoFecha(input.fechaReferencia)
    ? String(input.fechaReferencia).trim()
    : hoyChileIso();

  const base = {
    fechaInicio,
    fechaReferencia,
    plazoMeses: hasPlazo ? plazoMesesRaw : 0,
    esTituloProfesionalOTecnico,
    esGerente,
    esRenovacion,
    continuaTrasVencimiento,
    topeLegalMeses,
  };

  if (!fechaInicio) {
    return vacio({ ...base, motivo: "fecha_inicio" });
  }

  let fuentePlazo = FUENTE_PLAZO.ninguna;
  let fechaTermino = "";
  let duracionMeses = 0;
  if (fechaTerminoIn) {
    fuentePlazo = FUENTE_PLAZO.fechaTermino;
    fechaTermino = fechaTerminoIn;
    duracionMeses = calendarMonthsBetween(fechaInicio, fechaTermino);
  } else if (hasPlazo) {
    fuentePlazo = FUENTE_PLAZO.plazoMeses;
    duracionMeses = plazoMesesRaw;
    fechaTermino = addCalendarMonthsIso(fechaInicio, plazoMesesRaw);
  } else {
    return vacio({ ...base, motivo: "plazo", fuentePlazo });
  }

  if (!fechaTermino || diffDaysIso(fechaInicio, fechaTermino) < 0) {
    return vacio({
      ...base,
      fechaTermino,
      fuentePlazo,
      motivo: "fecha_termino",
    });
  }

  const topeFecha = addCalendarMonthsIso(fechaInicio, topeLegalMeses);
  const diasSobreTope = diffDaysIso(topeFecha, fechaTermino);
  const cumpleTope = diasSobreTope <= CONTRATO_PLAZO_FIJO_TOLERANCIA_DIAS;
  const duracionDias = diffDaysIso(fechaInicio, fechaTermino);
  const diasHastaTermino = diffDaysIso(fechaReferencia, fechaTermino);
  const vencido = diasHastaTermino < 0;
  const diasRestantes = Math.max(0, diasHastaTermino);
  const porContinuidad = continuaTrasVencimiento;
  const porRenovacion = esRenovacion && (vencido || continuaTrasVencimiento);
  let motivoIndefinido = MOTIVO_INDEFINIDO.ninguno;
  if (porRenovacion && porContinuidad) {
    motivoIndefinido = MOTIVO_INDEFINIDO.renovacion_agotada_y_continuidad;
  } else if (porRenovacion) {
    motivoIndefinido = MOTIVO_INDEFINIDO.renovacion_agotada;
  } else if (porContinuidad) {
    motivoIndefinido = MOTIVO_INDEFINIDO.continuidad_tras_vencimiento;
  }

  return {
    ok: true,
    motivo: "",
    fechaInicio,
    fechaTermino,
    fechaReferencia,
    plazoMeses: hasPlazo ? plazoMesesRaw : duracionMeses,
    fuentePlazo,
    duracionMeses,
    duracionDias,
    topeLegalMeses,
    topeFecha,
    cumpleTope,
    vencido,
    diasRestantes,
    esTituloProfesionalOTecnico,
    esGerente,
    esRenovacion,
    continuaTrasVencimiento,
    seTransformaEnIndefinido: porRenovacion || porContinuidad,
    motivoIndefinido,
    toleranciaDias: CONTRATO_PLAZO_FIJO_TOLERANCIA_DIAS,
  };
}
