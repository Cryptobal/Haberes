/**
 * Feriados legales nacionales de Chile, conteo del feriado anual (art. 67 y 69)
 * del permiso pagado del padre (art. 195 inc. 2), del permiso por
 * matrimonio o acuerdo de unión civil (art. 207 bis) y del permiso por
 * fallecimiento de un familiar (art. 66).
 *
 * Días hábiles del feriado anual, del permiso de paternidad, del permiso
 * por matrimonio o AUC y de los cupos hábiles del art. 66 (estimación
 * lun–vie de oficina): lunes a viernes, excluyendo feriados legales. El
 * sábado es siempre inhábil para este conteo (art. 69); no se inventa
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

/** Cupo del permiso pagado por matrimonio o AUC (art. 207 bis). */
export const PERMISO_MATRIMONIO_DIAS = 5;

function emptyPermisoMatrimonio({
  fechaEvento = "",
  fechaInicio = "",
  ubicacion = "dia",
  remuneracion = 0,
  motivo = "",
  fechaAviso = "",
  fechaCertificado = "",
} = {}) {
  const rem = Math.max(0, Number(remuneracion) || 0);
  const valorDia = rem / 30;
  return {
    ok: false,
    motivo,
    fechaEvento,
    fechaInicio,
    fechaTermino: "",
    fechaReintegro: "",
    ubicacion,
    incluyeEvento: false,
    diasHabiles: PERMISO_MATRIMONIO_DIAS,
    diasHabilesConsumidos: 0,
    diasCorridos: 0,
    diasCalendario: 0,
    remuneracion: rem,
    valorDia,
    goceRemuneracion: Math.round(valorDia * PERMISO_MATRIMONIO_DIAS),
    fechaAviso,
    fechaCertificado,
    dias: [],
    feriados: [],
    domingos: [],
    sabados: [],
  };
}

function nextHabil(parts) {
  let cursor = addDays(parts, 1);
  let steps = 0;
  while (!esDiaHabilFeriadoAnual(isoOf(cursor)) && steps < MAX_STEPS) {
    cursor = addDays(cursor, 1);
    steps += 1;
  }
  return cursor;
}

function listarInhabiles(desde, hastaExclusive) {
  const feriados = [];
  const domingos = [];
  const sabados = [];
  let scan = { ...desde };
  while (daysBetween(scan, hastaExclusive) > 0) {
    const iso = isoOf(scan);
    const festivo = feriadoLegal(iso);
    const dow = weekday(scan);
    if (festivo) feriados.push({ fecha: iso, nombre: festivo.nombre });
    else if (dow === 0) domingos.push({ fecha: iso, nombre: "Domingo" });
    else if (dow === 6) sabados.push({ fecha: iso, nombre: "Sábado" });
    scan = addDays(scan, 1);
  }
  return { feriados, domingos, sabados };
}

/**
 * Permiso pagado por matrimonio o acuerdo de unión civil (art. 207 bis).
 *
 * Norma (Ley 20.764, texto sustituido por Ley 21.042): cinco días hábiles
 * continuos de permiso pagado, adicional al feriado anual, sin requisito de
 * antigüedad. El trabajador los usa, a su elección, el día de la celebración
 * y en los días inmediatamente anteriores o posteriores. El lapso es continuo
 * y debe incluir el día del matrimonio o AUC; no se fracciona ni se goza en
 * otra fecha (ORD. N°5845/132 y ORD. N°343).
 *
 * Cómputo DT (ORD. N°5845/132, que reitera ORD. N°3342/048; ORD. N°343):
 * excluir domingo y festivos; el sábado es siempre inhábil porque el permiso
 * es adicional al feriado anual (art. 69). Haberes usa el mismo calendario
 * de hábiles que /feriado-anual (lun–vie, sin feriados regionales).
 *
 * Estimación educativa del costo para el empleador:
 * 5 × (remuneración mensual / 30). No es liquidación ni Previred.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-113958.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-123778.html
 */
export function calcularPermisoMatrimonio({
  fechaEvento = "",
  fechaInicio = "",
  ubicacion = "dia",
  remuneracion = 0,
} = {}) {
  const rem = Math.max(0, Number(remuneracion) || 0);
  const modoRaw = String(ubicacion || "dia");
  const modo = modoRaw === "antes" || modoRaw === "inicio" || modoRaw === "despues" ? modoRaw : "dia";
  const evento = parseIsoFecha(fechaEvento);
  if (!evento) {
    return emptyPermisoMatrimonio({
      fechaInicio,
      ubicacion: modo,
      remuneracion: rem,
      motivo: "sin_evento",
    });
  }

  const eventoIso = isoOf(evento);
  const fechaAviso = isoOf(addDays(evento, -30));
  const fechaCertificado = isoOf(addDays(evento, 30));

  let inicio = null;
  let termino = null;
  let dias = [];

  if (modo === "antes") {
    const collected = [];
    let cursor = { ...evento };
    let steps = 0;
    while (collected.length < PERMISO_MATRIMONIO_DIAS && steps < MAX_STEPS) {
      const iso = isoOf(cursor);
      if (esDiaHabilFeriadoAnual(iso)) collected.push(iso);
      cursor = addDays(cursor, -1);
      steps += 1;
    }
    if (collected.length < PERMISO_MATRIMONIO_DIAS) {
      return emptyPermisoMatrimonio({
        fechaEvento: eventoIso,
        ubicacion: modo,
        remuneracion: rem,
        motivo: "sin_cupo",
        fechaAviso,
        fechaCertificado,
      });
    }
    collected.reverse();
    dias = collected;
    inicio = parseIsoFecha(collected[0]);
    termino = { ...evento };
  } else if (modo === "inicio") {
    const elegido = parseIsoFecha(fechaInicio);
    if (!elegido) {
      return emptyPermisoMatrimonio({
        fechaEvento: eventoIso,
        ubicacion: modo,
        remuneracion: rem,
        motivo: "sin_inicio",
        fechaAviso,
        fechaCertificado,
      });
    }
    if (daysBetween(elegido, evento) < 0) {
      return emptyPermisoMatrimonio({
        fechaEvento: eventoIso,
        fechaInicio: isoOf(elegido),
        ubicacion: modo,
        remuneracion: rem,
        motivo: "evento_antes_inicio",
        fechaAviso,
        fechaCertificado,
      });
    }
    inicio = elegido;
    let cursor = { ...inicio };
    let steps = 0;
    while (dias.length < PERMISO_MATRIMONIO_DIAS && steps < MAX_STEPS) {
      const iso = isoOf(cursor);
      if (esDiaHabilFeriadoAnual(iso)) dias.push(iso);
      cursor = addDays(cursor, 1);
      steps += 1;
    }
    if (dias.length < PERMISO_MATRIMONIO_DIAS) {
      return emptyPermisoMatrimonio({
        fechaEvento: eventoIso,
        fechaInicio: isoOf(inicio),
        ubicacion: modo,
        remuneracion: rem,
        motivo: "sin_cupo",
        fechaAviso,
        fechaCertificado,
      });
    }
    const lastHabil = parseIsoFecha(dias[dias.length - 1]);
    if (daysBetween(lastHabil, evento) > 0) {
      let probe = addDays(lastHabil, 1);
      let extraHabil = false;
      while (daysBetween(probe, evento) >= 0) {
        if (esDiaHabilFeriadoAnual(isoOf(probe))) {
          extraHabil = true;
          break;
        }
        probe = addDays(probe, 1);
      }
      if (extraHabil) {
        return emptyPermisoMatrimonio({
          fechaEvento: eventoIso,
          fechaInicio: isoOf(inicio),
          ubicacion: modo,
          remuneracion: rem,
          motivo: "no_incluye_evento",
          fechaAviso,
          fechaCertificado,
        });
      }
      termino = { ...evento };
    } else {
      termino = lastHabil;
    }
  } else {
    // "dia" y "despues": el tramo empieza el día de la celebración y sigue
    // con los días posteriores. Un tramo solo posterior, sin ese día, no
    // procede (ORD. N°5845/132).
    inicio = { ...evento };
    let cursor = { ...inicio };
    let steps = 0;
    while (dias.length < PERMISO_MATRIMONIO_DIAS && steps < MAX_STEPS) {
      const iso = isoOf(cursor);
      if (esDiaHabilFeriadoAnual(iso)) dias.push(iso);
      cursor = addDays(cursor, 1);
      steps += 1;
    }
    if (dias.length < PERMISO_MATRIMONIO_DIAS) {
      return emptyPermisoMatrimonio({
        fechaEvento: eventoIso,
        fechaInicio: isoOf(inicio),
        ubicacion: modo,
        remuneracion: rem,
        motivo: "sin_cupo",
        fechaAviso,
        fechaCertificado,
      });
    }
    termino = parseIsoFecha(dias[dias.length - 1]);
  }

  const incluyeEvento = daysBetween(inicio, evento) >= 0 && daysBetween(evento, termino) >= 0;
  if (!incluyeEvento) {
    return emptyPermisoMatrimonio({
      fechaEvento: eventoIso,
      fechaInicio: isoOf(inicio),
      ubicacion: modo,
      remuneracion: rem,
      motivo: "no_incluye_evento",
      fechaAviso,
      fechaCertificado,
    });
  }

  const reintegro = nextHabil(termino);
  const { feriados, domingos, sabados } = listarInhabiles(inicio, addDays(termino, 1));
  const valorDia = rem / 30;
  return {
    ok: true,
    motivo: "",
    fechaEvento: eventoIso,
    fechaInicio: isoOf(inicio),
    fechaTermino: isoOf(termino),
    fechaReintegro: isoOf(reintegro),
    ubicacion: modo,
    incluyeEvento: true,
    diasHabiles: PERMISO_MATRIMONIO_DIAS,
    diasHabilesConsumidos: dias.length,
    diasCorridos: daysBetween(inicio, reintegro),
    diasCalendario: daysBetween(inicio, termino) + 1,
    remuneracion: rem,
    valorDia,
    goceRemuneracion: Math.round(valorDia * PERMISO_MATRIMONIO_DIAS),
    fechaAviso,
    fechaCertificado,
    dias,
    feriados,
    domingos,
    sabados,
  };
}

/**
 * Cupos del permiso pagado por fallecimiento (art. 66 CT).
 * Texto vigente: Ley 21.371 (hijo 10 corridos, cónyuge/AUC 7 corridos,
 * hijo en gestación 7 hábiles) + Ley 21.441 (hermano, padre o madre: 4 hábiles).
 */
export const PERMISO_FALLECIMIENTO_REGLAS = {
  hijo: {
    dias: 10,
    tipo: "corridos",
    fuero: true,
    etiqueta: "hijo o hija",
  },
  conyuge: {
    dias: 7,
    tipo: "corridos",
    fuero: true,
    etiqueta: "cónyuge o conviviente civil",
  },
  hijo_gestacion: {
    dias: 7,
    tipo: "habiles",
    fuero: false,
    etiqueta: "hijo o hija en período de gestación",
  },
  padre_madre: {
    dias: 4,
    tipo: "habiles",
    fuero: false,
    etiqueta: "padre o madre",
  },
  hermano: {
    dias: 4,
    tipo: "habiles",
    fuero: false,
    etiqueta: "hermano o hermana",
  },
};

export function normaVinculoFallecimiento(vinculo) {
  const s = String(vinculo || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (s === "hijo" || s === "hija") return "hijo";
  if (s === "conyuge" || s === "auc" || s === "conviviente" || s === "conyuge_auc") return "conyuge";
  if (s === "hijo_gestacion" || s === "gestacion" || s === "fetal") return "hijo_gestacion";
  if (s === "padre_madre" || s === "padre" || s === "madre") return "padre_madre";
  if (s === "hermano" || s === "hermana") return "hermano";
  return "";
}

function emptyPermisoFallecimiento({
  vinculo = "",
  fechaFallecimiento = "",
  remuneracion = 0,
  motivo = "",
  diasPermiso = 0,
  tipoDias = "",
  fuero = false,
  etiqueta = "",
} = {}) {
  const rem = Math.max(0, Number(remuneracion) || 0);
  const valorDia = rem / 30;
  return {
    ok: false,
    motivo,
    vinculo,
    etiqueta,
    fechaFallecimiento,
    fechaInicio: "",
    fechaTermino: "",
    fechaReintegro: "",
    fechaFueroHasta: "",
    tipoDias,
    diasPermiso,
    diasHabilesConsumidos: 0,
    diasCorridos: 0,
    diasCalendario: 0,
    fuero,
    remuneracion: rem,
    valorDia,
    goceRemuneracion: Math.round(valorDia * diasPermiso),
    dias: [],
    feriados: [],
    domingos: [],
    sabados: [],
  };
}

/**
 * Permiso pagado por fallecimiento de un familiar (art. 66).
 *
 * Norma vigente (Ley 21.371 + Ley 21.441):
 * - hijo: 10 días corridos;
 * - cónyuge o conviviente civil: 7 días corridos;
 * - hijo en período de gestación: 7 días hábiles, desde la acreditación
 *   con certificado de defunción fetal;
 * - hermano, padre o madre: 4 días hábiles.
 * Adicional al feriado anual, no compensable en dinero. Se hace efectivo
 * desde el día del fallecimiento (salvo gestación). Fuero de un mes solo
 * en los casos del inciso 1º (hijo, cónyuge o AUC): informativo, no input.
 *
 * Días corridos: calendario continuo, incluidos sábados, domingos y feriados
 * (ORD. N°853/16). Días hábiles: mismo calendario que /feriado-anual
 * (lun–vie, sábado inhábil art. 69, feriados nacionales no consumen).
 * Una consulta DT sobre padre/madre/hermano habla de «lunes a sábado»;
 * Haberes no usa esa regla para no romper el criterio de las otras
 * calculadoras de hábiles.
 *
 * Estimación educativa: N × (remuneración mensual / 30). No es liquidación.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1165684
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1175780
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-122236.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-122332.html
 * @see https://www.dt.gob.cl/portal/1628/w3-article-94885.html
 */
export function calcularPermisoFallecimiento({
  vinculo = "",
  fechaFallecimiento = "",
  remuneracion = 0,
} = {}) {
  const rem = Math.max(0, Number(remuneracion) || 0);
  const key = normaVinculoFallecimiento(vinculo);
  const regla = key ? PERMISO_FALLECIMIENTO_REGLAS[key] : null;
  if (!regla) {
    return emptyPermisoFallecimiento({
      vinculo,
      fechaFallecimiento,
      remuneracion: rem,
      motivo: "sin_vinculo",
    });
  }

  const valorDia = rem / 30;
  const goce = Math.round(valorDia * regla.dias);
  const inicio = parseIsoFecha(fechaFallecimiento);
  if (!inicio) {
    return {
      ok: true,
      motivo: "",
      vinculo: key,
      etiqueta: regla.etiqueta,
      fechaFallecimiento: "",
      fechaInicio: "",
      fechaTermino: "",
      fechaReintegro: "",
      fechaFueroHasta: "",
      tipoDias: regla.tipo,
      diasPermiso: regla.dias,
      diasHabilesConsumidos: regla.tipo === "habiles" ? regla.dias : 0,
      diasCorridos: regla.tipo === "corridos" ? regla.dias : 0,
      diasCalendario: 0,
      fuero: regla.fuero,
      remuneracion: rem,
      valorDia,
      goceRemuneracion: goce,
      dias: [],
      feriados: [],
      domingos: [],
      sabados: [],
    };
  }

  const inicioIso = isoOf(inicio);
  const fechaFueroHasta = regla.fuero ? isoOf(addCalendarMonths(inicio, 1)) : "";
  let termino = null;
  let dias = [];
  let diasHabilesConsumidos = 0;

  if (regla.tipo === "corridos") {
    termino = addDays(inicio, regla.dias - 1);
    let scan = { ...inicio };
    while (daysBetween(scan, termino) >= 0) {
      dias.push(isoOf(scan));
      scan = addDays(scan, 1);
    }
  } else {
    let cursor = { ...inicio };
    let steps = 0;
    while (dias.length < regla.dias && steps < MAX_STEPS) {
      const iso = isoOf(cursor);
      if (esDiaHabilFeriadoAnual(iso)) dias.push(iso);
      cursor = addDays(cursor, 1);
      steps += 1;
    }
    if (dias.length < regla.dias) {
      return emptyPermisoFallecimiento({
        vinculo: key,
        fechaFallecimiento: inicioIso,
        remuneracion: rem,
        motivo: "sin_cupo",
        diasPermiso: regla.dias,
        tipoDias: regla.tipo,
        fuero: regla.fuero,
        etiqueta: regla.etiqueta,
      });
    }
    termino = parseIsoFecha(dias[dias.length - 1]);
    diasHabilesConsumidos = dias.length;
  }

  const reintegro = nextHabil(termino);
  const { feriados, domingos, sabados } = listarInhabiles(inicio, addDays(termino, 1));
  return {
    ok: true,
    motivo: "",
    vinculo: key,
    etiqueta: regla.etiqueta,
    fechaFallecimiento: inicioIso,
    fechaInicio: inicioIso,
    fechaTermino: isoOf(termino),
    fechaReintegro: isoOf(reintegro),
    fechaFueroHasta,
    tipoDias: regla.tipo,
    diasPermiso: regla.dias,
    diasHabilesConsumidos: regla.tipo === "habiles" ? diasHabilesConsumidos || dias.length : 0,
    diasCorridos: daysBetween(inicio, reintegro),
    diasCalendario: daysBetween(inicio, termino) + 1,
    fuero: regla.fuero,
    remuneracion: rem,
    valorDia,
    goceRemuneracion: goce,
    dias,
    feriados,
    domingos,
    sabados,
  };
}
