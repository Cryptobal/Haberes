/**
 * Feriados legales nacionales de Chile, conteo del feriado anual (art. 67 y 69)
 * y del permiso pagado del padre (art. 195 inc. 2).
 *
 * Días hábiles del feriado anual y del permiso de paternidad (estimación
 * lun–vie de oficina): lunes a viernes, excluyendo feriados legales.
 * El sábado es siempre inhábil para este conteo (art. 69 / descanso semanal);
 * no se inventa otra regla de sábado. El reintegro es el primer hábil
 * siguiente al término.
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

/** Cupo del permiso pagado del padre (art. 195 inc. 2). */
export const PERMISO_PATERNIDAD_DIAS = 5;

function addCalendarMonths(parts, months) {
  const dt = toDate(parts);
  const day = dt.getDate();
  dt.setDate(1);
  dt.setMonth(dt.getMonth() + months);
  const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  dt.setDate(Math.min(day, last));
  return fromDate(dt);
}

function emptyPermisoPaternidad({
  fechaParto = "",
  fechaInicio = "",
  goce = "continuo",
  remuneracion = 0,
  motivo = "",
  ventanaDesde = "",
  ventanaHasta = "",
} = {}) {
  const rem = Math.max(0, Number(remuneracion) || 0);
  const valorDia = rem / 30;
  return {
    ok: false,
    motivo,
    fechaParto,
    fechaInicio,
    fechaTermino: "",
    fechaReintegro: "",
    goce,
    diasHabiles: PERMISO_PATERNIDAD_DIAS,
    diasHabilesConsumidos: 0,
    diasCorridos: 0,
    dentroDelMes: false,
    ventanaDesde,
    ventanaHasta,
    remuneracion: rem,
    valorDia,
    goceRemuneracion: Math.round(valorDia * PERMISO_PATERNIDAD_DIAS),
    dias: [],
    feriados: [],
    domingos: [],
  };
}

/**
 * Permiso pagado del padre por nacimiento de un hijo (art. 195 inc. 2).
 *
 * Norma: cinco días, a elección (i) continuos desde el parto, excluyendo el
 * descanso semanal, o (ii) distribuidos dentro del primer mes desde el
 * nacimiento (continuos o fraccionados). Irrenunciable. No aumenta por
 * partos múltiples. También aplica en adopción (no se modela aquí).
 *
 * Lectura DT: ORD. N°3827/103 (02.09.2005) y ORD. N°864/10 (16.02.2011).
 * El cupo se usa en días de la jornada, no en el descanso semanal (legal o
 * convencional). El ORD. 864/10 ilustra el «mes» como del día siguiente al
 * parto hasta la misma fecha del mes siguiente (p. ej. 15 sep → 16 sep a
 * 16 oct).
 *
 * Estimación educativa de Haberes (jornada lun–vie de oficina):
 * - día que consume = lunes a viernes que no sea feriado legal nacional
 *   (mismo calendario que /feriado-anual);
 * - sábado no consume (descanso semanal; analogía art. 69);
 * - feriado legal nacional lun–vie no consume el cupo de 5.
 * No se modela el art. 38 (domingo/festivo laborable y descanso compensatorio).
 * El goce es 5 × (remuneración / 30): el permiso es con remuneración, no un
 * descuento. Un tramo fraccionado se estima como un bloque continuo de 5
 * hábiles desde la fecha de inicio; no arma cinco días aislados.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-98859.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-87127.html
 */
export function calcularPermisoPaternidad({
  fechaParto = "",
  fechaInicio = "",
  goce = "continuo",
  remuneracion = 0,
} = {}) {
  const rem = Math.max(0, Number(remuneracion) || 0);
  const modo = String(goce || "continuo") === "fraccionado" ? "fraccionado" : "continuo";
  const parto = parseIsoFecha(fechaParto);
  if (!parto) {
    return emptyPermisoPaternidad({
      fechaInicio,
      goce: modo,
      remuneracion: rem,
      motivo: "sin_parto",
    });
  }

  const partoIso = isoOf(parto);
  const diaSiguiente = addDays(parto, 1);
  const ventanaDesde = modo === "fraccionado" ? diaSiguiente : parto;
  const ventanaHasta = addCalendarMonths(ventanaDesde, 1);
  const ventanaDesdeIso = isoOf(ventanaDesde);
  const ventanaHastaIso = isoOf(ventanaHasta);

  let inicio = parto;
  if (modo === "fraccionado") {
    const elegido = parseIsoFecha(fechaInicio);
    if (!elegido) {
      return emptyPermisoPaternidad({
        fechaParto: partoIso,
        goce: modo,
        remuneracion: rem,
        motivo: "sin_inicio",
        ventanaDesde: ventanaDesdeIso,
        ventanaHasta: ventanaHastaIso,
      });
    }
    if (daysBetween(parto, elegido) < 0) {
      return emptyPermisoPaternidad({
        fechaParto: partoIso,
        fechaInicio: isoOf(elegido),
        goce: modo,
        remuneracion: rem,
        motivo: "inicio_antes_parto",
        ventanaDesde: ventanaDesdeIso,
        ventanaHasta: ventanaHastaIso,
      });
    }
    if (daysBetween(elegido, ventanaHasta) < 0) {
      return emptyPermisoPaternidad({
        fechaParto: partoIso,
        fechaInicio: isoOf(elegido),
        goce: modo,
        remuneracion: rem,
        motivo: "fuera_del_mes",
        ventanaDesde: ventanaDesdeIso,
        ventanaHasta: ventanaHastaIso,
      });
    }
    inicio = elegido;
  }

  const inicioIso = isoOf(inicio);
  let cursor = { ...inicio };
  let consumed = 0;
  let lastHabil = null;
  let steps = 0;
  const dias = [];
  let dentroDelMes = true;

  while (consumed < PERMISO_PATERNIDAD_DIAS && steps < MAX_STEPS) {
    const iso = isoOf(cursor);
    if (esDiaHabilFeriadoAnual(iso)) {
      consumed += 1;
      lastHabil = { ...cursor };
      dias.push(iso);
      if (daysBetween(cursor, ventanaHasta) < 0) dentroDelMes = false;
    }
    cursor = addDays(cursor, 1);
    steps += 1;
  }

  if (!lastHabil || consumed < PERMISO_PATERNIDAD_DIAS) {
    return emptyPermisoPaternidad({
      fechaParto: partoIso,
      fechaInicio: inicioIso,
      goce: modo,
      remuneracion: rem,
      motivo: "sin_cupo",
      ventanaDesde: ventanaDesdeIso,
      ventanaHasta: ventanaHastaIso,
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

  const valorDia = rem / 30;
  return {
    ok: true,
    motivo: "",
    fechaParto: partoIso,
    fechaInicio: inicioIso,
    fechaTermino: isoOf(lastHabil),
    fechaReintegro: isoOf(reintegro),
    goce: modo,
    diasHabiles: PERMISO_PATERNIDAD_DIAS,
    diasHabilesConsumidos: consumed,
    diasCorridos: daysBetween(inicio, reintegro),
    dentroDelMes,
    ventanaDesde: ventanaDesdeIso,
    ventanaHasta: ventanaHastaIso,
    remuneracion: rem,
    valorDia,
    goceRemuneracion: Math.round(valorDia * PERMISO_PATERNIDAD_DIAS),
    dias,
    feriados,
    domingos,
  };
}
