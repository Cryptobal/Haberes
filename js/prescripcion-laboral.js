import {
  PRESCRIPCION_ANIOS_GENERALES,
  PRESCRIPCION_DIAS_HABILES_168,
  PRESCRIPCION_DIAS_HABILES_168_TOPE_RECLAMO,
  PRESCRIPCION_GOLD,
  PRESCRIPCION_MESES_HORAS_EXTRAS,
  PRESCRIPCION_MESES_NULIDAD_162,
  PRESCRIPCION_MESES_POST_TERMINO,
  PRESCRIPCION_MODOS,
  PRESCRIPCION_POR_VENCER_DIAS,
  PRESCRIPCION_TOPE_ANIOS_RECLAMO,
} from "./constants.js";
import {
  addDiasHabilesPosteriores,
  parseIsoFecha,
  rangoAniosFeriadosLegales,
  ymdIso,
} from "./feriados.js";

export const PRESCRIPCION_ETIQUETAS = Object.freeze({
  generales: "Derechos generales (contrato vigente o derecho patrimonial)",
  post_termino: "Acción post-término",
  horas_extras: "Horas extraordinarias",
  nulidad_162: "Nulidad del despido (art. 162)",
  art_168: "Impugnación del despido (art. 168)",
});

export const PRESCRIPCION_ANCLA_LABEL = Object.freeze({
  generales: "Fecha en que el derecho se hizo exigible",
  post_termino: "Fecha de terminación de los servicios",
  horas_extras: "Fecha en que las horas extras debieron pagarse",
  nulidad_162: "Fecha de suspensión de los servicios",
  art_168: "Fecha de separación (despido)",
});

function hoyIso() {
  const n = new Date();
  return ymdIso(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

function addCalendarMonthsIso(iso, months) {
  const parts = parseIsoFecha(iso);
  if (!parts) return "";
  const dt = new Date(parts.y, parts.mo - 1, 1);
  dt.setMonth(dt.getMonth() + months);
  const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  dt.setDate(Math.min(parts.d, last));
  return ymdIso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

function diffDaysIso(a, b) {
  const pa = parseIsoFecha(a);
  const pb = parseIsoFecha(b);
  if (!pa || !pb) return 0;
  const ta = Date.UTC(pa.y, pa.mo - 1, pa.d);
  const tb = Date.UTC(pb.y, pb.mo - 1, pb.d);
  return Math.round((tb - ta) / 86400000);
}

export function normaModoPrescripcion(value) {
  const raw = String(value || "").trim();
  if (raw === PRESCRIPCION_MODOS.post_termino) return "post_termino";
  if (raw === PRESCRIPCION_MODOS.horas_extras) return "horas_extras";
  if (raw === PRESCRIPCION_MODOS.nulidad_162) return "nulidad_162";
  if (raw === PRESCRIPCION_MODOS.art_168) return "art_168";
  return "generales";
}

function vacio({ modo = "generales", fechaAncla = "", fechaReclamoDt = "", fechaHoy = "", motivo = "" } = {}) {
  return {
    ok: false,
    motivo,
    modo,
    etiquetaModo: PRESCRIPCION_ETIQUETAS[modo] || PRESCRIPCION_ETIQUETAS.generales,
    norma: "",
    tipoPlazo: "",
    plazoValor: 0,
    fechaAncla,
    fechaLimite: "",
    fechaHoy,
    diasRestantes: 0,
    estado: "",
    fechaReclamoDt,
    suspensionReclamo: false,
    topeUnAnio: "",
    tope90Habiles: "",
    hermana: "",
    calendarioMin: 0,
    calendarioMax: 0,
  };
}

function fechaLimiteDeModo(modo, fechaAncla) {
  if (modo === "generales") {
    return {
      fechaLimite: addCalendarMonthsIso(fechaAncla, PRESCRIPCION_ANIOS_GENERALES * 12),
      norma: "art. 510 inc. 1°",
      tipoPlazo: "anios",
      plazoValor: PRESCRIPCION_ANIOS_GENERALES,
      hermana: "",
    };
  }
  if (modo === "post_termino") {
    return {
      fechaLimite: addCalendarMonthsIso(fechaAncla, PRESCRIPCION_MESES_POST_TERMINO),
      norma: "art. 510 inc. 2°",
      tipoPlazo: "meses",
      plazoValor: PRESCRIPCION_MESES_POST_TERMINO,
      hermana: "/finiquito",
    };
  }
  if (modo === "horas_extras") {
    return {
      fechaLimite: addCalendarMonthsIso(fechaAncla, PRESCRIPCION_MESES_HORAS_EXTRAS),
      norma: "art. 510 (horas extraordinarias)",
      tipoPlazo: "meses",
      plazoValor: PRESCRIPCION_MESES_HORAS_EXTRAS,
      hermana: "/horas-extras",
    };
  }
  if (modo === "nulidad_162") {
    return {
      fechaLimite: addCalendarMonthsIso(fechaAncla, PRESCRIPCION_MESES_NULIDAD_162),
      norma: "art. 510 (nulidad del despido art. 162)",
      tipoPlazo: "meses",
      plazoValor: PRESCRIPCION_MESES_NULIDAD_162,
      hermana: "/nulidad-despido",
    };
  }
  return {
    fechaLimite: addDiasHabilesPosteriores(fechaAncla, PRESCRIPCION_DIAS_HABILES_168),
    norma: "art. 168",
    tipoPlazo: "habiles",
    plazoValor: PRESCRIPCION_DIAS_HABILES_168,
    hermana: "/despido-injustificado",
  };
}

function estadoDe(diasRestantes, suspensionReclamo) {
  if (suspensionReclamo) return "indeterminado";
  if (diasRestantes < 0) return "vencido";
  if (diasRestantes <= PRESCRIPCION_POR_VENCER_DIAS) return "por_vencer";
  return "vigente";
}

/**
 * Estima la fecha límite educativa de prescripción (art. 510) o del
 * plazo de impugnación del despido (art. 168, 60 días hábiles).
 * No calcula pesos. El reclamo DT, si se indica, no mueve la fecha límite
 * (falta la notificación del resultado) y el estado queda indeterminado:
 * no se declara vencido mientras la suspensión no se puede cerrar.
 *
 * @param {object} input
 * @param {string} [input.modo]
 * @param {string} [input.fechaAncla] YYYY-MM-DD
 * @param {string} [input.fechaReclamoDt] YYYY-MM-DD opcional
 * @param {string} [input.fechaHoy] YYYY-MM-DD (tests); default = hoy local
 */
export function calcularPrescripcionLaboral(input = {}) {
  const modo = normaModoPrescripcion(input.modo);
  const fechaAncla = String(input.fechaAncla || "").trim();
  const fechaReclamoDtRaw = String(input.fechaReclamoDt || "").trim();
  const fechaHoy = parseIsoFecha(input.fechaHoy) ? String(input.fechaHoy).trim() : hoyIso();
  const reclamo = parseIsoFecha(fechaReclamoDtRaw) ? fechaReclamoDtRaw : "";

  const base = vacio({ modo, fechaAncla, fechaReclamoDt: reclamo, fechaHoy });

  if (!parseIsoFecha(fechaAncla)) {
    return { ...base, motivo: "sin_fecha" };
  }

  const meta = fechaLimiteDeModo(modo, fechaAncla);
  const cal = rangoAniosFeriadosLegales();
  if (!meta.fechaLimite) {
    return {
      ...base,
      motivo: modo === "art_168" ? "fuera_calendario_habiles" : "sin_limite",
      norma: meta.norma,
      tipoPlazo: meta.tipoPlazo,
      plazoValor: meta.plazoValor,
      hermana: meta.hermana,
      calendarioMin: cal.min,
      calendarioMax: cal.max,
    };
  }

  const diasRestantes = diffDaysIso(fechaHoy, meta.fechaLimite);
  const suspensionReclamo = Boolean(reclamo);
  const tieneTermino =
    modo === "post_termino" || modo === "nulidad_162" || modo === "art_168";
  const topeUnAnio = tieneTermino
    ? addCalendarMonthsIso(fechaAncla, PRESCRIPCION_TOPE_ANIOS_RECLAMO * 12)
    : "";
  const tope90Habiles =
    modo === "art_168"
      ? addDiasHabilesPosteriores(fechaAncla, PRESCRIPCION_DIAS_HABILES_168_TOPE_RECLAMO)
      : "";

  return {
    ok: true,
    motivo: "",
    modo,
    etiquetaModo: PRESCRIPCION_ETIQUETAS[modo],
    norma: meta.norma,
    tipoPlazo: meta.tipoPlazo,
    plazoValor: meta.plazoValor,
    fechaAncla,
    fechaLimite: meta.fechaLimite,
    fechaHoy,
    diasRestantes,
    estado: estadoDe(diasRestantes, suspensionReclamo),
    fechaReclamoDt: reclamo,
    suspensionReclamo,
    topeUnAnio,
    tope90Habiles,
    hermana: meta.hermana,
    calendarioMin: cal.min,
    calendarioMax: cal.max,
  };
}

export {
  PRESCRIPCION_DIAS_HABILES_168,
  PRESCRIPCION_GOLD,
  PRESCRIPCION_MODOS,
  PRESCRIPCION_POR_VENCER_DIAS,
};
