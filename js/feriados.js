/**
 * Feriados legales nacionales de Chile y conteo del feriado anual (art. 67 y 69).
 *
 * Días hábiles del feriado: lunes a viernes, excluyendo feriados legales.
 * El sábado es siempre inhábil para este conteo (art. 69); no se inventa
 * otra regla de sábado. El reintegro es el primer hábil siguiente al término.
 *
 * Listado 2025–2027: calendario civil publicado (16 nacionales en 2026).
 * No incluye feriados regionales (p. ej. 7 jun Arica, 20 ago Chillán).
 */

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function ymdIso(y, mo, d) {
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

export function parseIsoFecha(iso) {
  const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const y = Number(match[1]);
  const mo = Number(match[2]);
  const d = Number(match[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return { y, mo, d };
}

function toDate({ y, mo, d }) {
  return new Date(y, mo - 1, d);
}

function fromDate(dt) {
  return { y: dt.getFullYear(), mo: dt.getMonth() + 1, d: dt.getDate() };
}

function addDays(parts, n) {
  const dt = toDate(parts);
  dt.setDate(dt.getDate() + n);
  return fromDate(dt);
}

function isoOf(parts) {
  return ymdIso(parts.y, parts.mo, parts.d);
}

function daysBetween(a, b) {
  const ta = Date.UTC(a.y, a.mo - 1, a.d);
  const tb = Date.UTC(b.y, b.mo - 1, b.d);
  return Math.round((tb - ta) / 86400000);
}

/** weekday: 0 domingo … 6 sábado (Date#getDay). */
function weekday(parts) {
  return toDate(parts).getDay();
}

/**
 * Feriados legales nacionales. Fuente: calendario 2026 (1 ene, viernes/sábado
 * santo, 1 may, 21 may, solsticio pueblos indígenas, 29 jun, 16 jul, 15 ago,
 * 18–19 sep, 12 oct, 31 oct, 1 nov, 8 dic, 25 dic).
 */
export const FERIADOS_LEGALES_CL = [
  { fecha: "2025-01-01", nombre: "Año Nuevo" },
  { fecha: "2025-04-18", nombre: "Viernes Santo" },
  { fecha: "2025-04-19", nombre: "Sábado Santo" },
  { fecha: "2025-05-01", nombre: "Día Nacional del Trabajo" },
  { fecha: "2025-05-21", nombre: "Día de las Glorias Navales" },
  { fecha: "2025-06-20", nombre: "Día Nacional de los Pueblos Indígenas" },
  { fecha: "2025-06-29", nombre: "San Pedro y San Pablo" },
  { fecha: "2025-07-16", nombre: "Virgen del Carmen" },
  { fecha: "2025-08-15", nombre: "Asunción de la Virgen" },
  { fecha: "2025-09-18", nombre: "Independencia Nacional" },
  { fecha: "2025-09-19", nombre: "Día de las Glorias del Ejército" },
  { fecha: "2025-10-12", nombre: "Encuentro de Dos Mundos" },
  { fecha: "2025-10-31", nombre: "Día de las Iglesias Evangélicas y Protestantes" },
  { fecha: "2025-11-01", nombre: "Día de Todos los Santos" },
  { fecha: "2025-12-08", nombre: "Inmaculada Concepción" },
  { fecha: "2025-12-25", nombre: "Navidad" },
  { fecha: "2026-01-01", nombre: "Año Nuevo" },
  { fecha: "2026-04-03", nombre: "Viernes Santo" },
  { fecha: "2026-04-04", nombre: "Sábado Santo" },
  { fecha: "2026-05-01", nombre: "Día Nacional del Trabajo" },
  { fecha: "2026-05-21", nombre: "Día de las Glorias Navales" },
  { fecha: "2026-06-21", nombre: "Día Nacional de los Pueblos Indígenas" },
  { fecha: "2026-06-29", nombre: "San Pedro y San Pablo" },
  { fecha: "2026-07-16", nombre: "Virgen del Carmen" },
  { fecha: "2026-08-15", nombre: "Asunción de la Virgen" },
  { fecha: "2026-09-18", nombre: "Independencia Nacional" },
  { fecha: "2026-09-19", nombre: "Día de las Glorias del Ejército" },
  { fecha: "2026-10-12", nombre: "Encuentro de Dos Mundos" },
  { fecha: "2026-10-31", nombre: "Día de las Iglesias Evangélicas y Protestantes" },
  { fecha: "2026-11-01", nombre: "Día de Todos los Santos" },
  { fecha: "2026-12-08", nombre: "Inmaculada Concepción" },
  { fecha: "2026-12-25", nombre: "Navidad" },
  { fecha: "2027-01-01", nombre: "Año Nuevo" },
  { fecha: "2027-03-26", nombre: "Viernes Santo" },
  { fecha: "2027-03-27", nombre: "Sábado Santo" },
  { fecha: "2027-05-01", nombre: "Día Nacional del Trabajo" },
  { fecha: "2027-05-21", nombre: "Día de las Glorias Navales" },
  { fecha: "2027-06-21", nombre: "Día Nacional de los Pueblos Indígenas" },
  { fecha: "2027-06-29", nombre: "San Pedro y San Pablo" },
  { fecha: "2027-07-16", nombre: "Virgen del Carmen" },
  { fecha: "2027-08-15", nombre: "Asunción de la Virgen" },
  { fecha: "2027-09-18", nombre: "Independencia Nacional" },
  { fecha: "2027-09-19", nombre: "Día de las Glorias del Ejército" },
  { fecha: "2027-10-12", nombre: "Encuentro de Dos Mundos" },
  { fecha: "2027-10-31", nombre: "Día de las Iglesias Evangélicas y Protestantes" },
  { fecha: "2027-11-01", nombre: "Día de Todos los Santos" },
  { fecha: "2027-12-08", nombre: "Inmaculada Concepción" },
  { fecha: "2027-12-25", nombre: "Navidad" },
];

const FERIADO_POR_FECHA = new Map(FERIADOS_LEGALES_CL.map((f) => [f.fecha, f]));

export function feriadoLegal(iso) {
  return FERIADO_POR_FECHA.get(String(iso || "")) || null;
}

/**
 * Hábil para el feriado anual: lunes a viernes y no feriado legal.
 * El sábado no cuenta (art. 69).
 */
export function esDiaHabilFeriadoAnual(iso) {
  const parts = parseIsoFecha(iso);
  if (!parts) return false;
  const dow = weekday(parts);
  if (dow === 0 || dow === 6) return false;
  return !feriadoLegal(isoOf(parts));
}

const MAX_HABLES = 90;
const MAX_STEPS = 400;

function emptyResult({ fechaInicio = "", diasHabiles = 0, diasProgresivos = 0, diasATomar = 0 } = {}) {
  return {
    ok: false,
    fechaInicio,
    fechaTermino: "",
    fechaReintegro: "",
    diasHabiles,
    diasProgresivos,
    diasATomar,
    diasHabilesConsumidos: 0,
    diasCorridos: 0,
    domingos: [],
    feriados: [],
  };
}

/**
 * Conteo del feriado anual (vacaciones legales).
 *
 * No calcula pesos (eso es vacaciones proporcionales). No calcula días
 * progresivos por antigüedad: el extra del art. 68 lo indica el usuario.
 *
 * @param {object} opts
 * @param {string} opts.fechaInicio YYYY-MM-DD
 * @param {number} [opts.diasHabiles=15] cupo art. 67 (15, o 20 extremo sur)
 * @param {number} [opts.diasProgresivos=0] extra art. 68 ya conocido
 */
export function calcularFeriadoAnual({
  fechaInicio = "",
  diasHabiles = 15,
  diasProgresivos = 0,
} = {}) {
  const inicio = parseIsoFecha(fechaInicio);
  const base = Math.max(0, Math.floor(Number(diasHabiles) || 0));
  const extra = Math.max(0, Math.floor(Number(diasProgresivos) || 0));
  const diasATomar = Math.min(MAX_HABLES, base + extra);
  if (!inicio || diasATomar <= 0) {
    return emptyResult({
      fechaInicio: inicio ? isoOf(inicio) : "",
      diasHabiles: base,
      diasProgresivos: extra,
      diasATomar,
    });
  }

  let cursor = { ...inicio };
  let consumed = 0;
  let lastHabil = null;
  let steps = 0;

  while (consumed < diasATomar && steps < MAX_STEPS) {
    const iso = isoOf(cursor);
    if (esDiaHabilFeriadoAnual(iso)) {
      consumed += 1;
      lastHabil = { ...cursor };
    }
    cursor = addDays(cursor, 1);
    steps += 1;
  }

  if (!lastHabil || consumed < diasATomar) {
    return emptyResult({
      fechaInicio: isoOf(inicio),
      diasHabiles: base,
      diasProgresivos: extra,
      diasATomar,
    });
  }

  let reintegro = addDays(lastHabil, 1);
  let reSteps = 0;
  while (!esDiaHabilFeriadoAnual(isoOf(reintegro)) && reSteps < MAX_STEPS) {
    reintegro = addDays(reintegro, 1);
    reSteps += 1;
  }

  const domingos = [];
  const feriados = [];
  let scan = { ...inicio };
  while (daysBetween(scan, reintegro) > 0) {
    const iso = isoOf(scan);
    const festivo = feriadoLegal(iso);
    const dow = weekday(scan);
    if (festivo) feriados.push({ fecha: iso, nombre: festivo.nombre });
    else if (dow === 0) domingos.push({ fecha: iso, nombre: "Domingo" });
    scan = addDays(scan, 1);
  }

  return {
    ok: true,
    fechaInicio: isoOf(inicio),
    fechaTermino: isoOf(lastHabil),
    fechaReintegro: isoOf(reintegro),
    diasHabiles: base,
    diasProgresivos: extra,
    diasATomar,
    diasHabilesConsumidos: consumed,
    diasCorridos: daysBetween(inicio, reintegro),
    domingos,
    feriados,
  };
}
