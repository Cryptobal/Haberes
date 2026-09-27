import {
  FERIADOS_LEGALES_CL,
  addDiasHabilesPosteriores,
  esDiaHabilFeriadoAnual,
  feriadoLegal,
  parseIsoFecha,
  ymdIso,
} from "./feriados.js";

/**
 * Contador general de días hábiles. No es el cupo del feriado anual
 * (art. 67) ni un plazo judicial o del SII.
 *
 * Hábil = lo que ya define `esDiaHabilFeriadoAnual`: lunes a viernes y
 * no feriado legal nacional. El sábado es siempre inhábil (art. 69).
 * No hay otra lista de feriados ni feriados regionales.
 *
 * Convención «entre fechas» de `contarDiasHabiles`: se incluyen el día
 * desde y el día hasta cuando cada uno es hábil. No es el plazo del
 * art. 48 del Código Civil (ese corre desde el día siguiente): eso lo
 * hace `sumarDiasHabiles` vía `addDiasHabilesPosteriores`.
 *
 * Días corridos = calendario inclusive (hasta − desde + 1).
 */

const MAX_DIAS = 20000;

function vacioContar(desde = "", hasta = "") {
  return {
    ok: false,
    modo: "contar",
    desde,
    hasta,
    diasHabiles: 0,
    diasCorridos: 0,
    feriados: [],
    fechas: [],
  };
}

function vacioSumar(ancla = "", n = 0) {
  return {
    ok: false,
    modo: "sumar",
    ancla,
    n,
    fecha: "",
    diasHabiles: 0,
  };
}

function isoDe(parts) {
  return ymdIso(parts.y, parts.mo, parts.d);
}

function addIsoDays(iso, n) {
  const p = parseIsoFecha(iso);
  if (!p) return "";
  const dt = new Date(Date.UTC(p.y, p.mo - 1, p.d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return ymdIso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function diasCorridosInclusive(desde, hasta) {
  const a = parseIsoFecha(desde);
  const b = parseIsoFecha(hasta);
  if (!a || !b) return 0;
  const ta = Date.UTC(a.y, a.mo - 1, a.d);
  const tb = Date.UTC(b.y, b.mo - 1, b.d);
  return Math.round((tb - ta) / 86400000) + 1;
}

/**
 * @param {object} [opts]
 * @param {string} [opts.desde] YYYY-MM-DD, inclusive si es hábil
 * @param {string} [opts.hasta] YYYY-MM-DD, inclusive si es hábil
 */
export function contarDiasHabiles({ desde = "", hasta = "" } = {}) {
  const a = parseIsoFecha(desde);
  const b = parseIsoFecha(hasta);
  if (!a || !b) return vacioContar();
  const isoA = isoDe(a);
  const isoB = isoDe(b);
  if (isoA > isoB) return vacioContar(isoA, isoB);

  const corridos = diasCorridosInclusive(isoA, isoB);
  if (corridos <= 0 || corridos > MAX_DIAS) return vacioContar(isoA, isoB);

  const fechas = [];
  let cursor = isoA;
  for (let i = 0; i < corridos; i += 1) {
    if (esDiaHabilFeriadoAnual(cursor)) fechas.push(cursor);
    cursor = addIsoDays(cursor, 1);
  }

  const feriados = [];
  for (const row of FERIADOS_LEGALES_CL) {
    if (row.fecha < isoA || row.fecha > isoB) continue;
    const legal = feriadoLegal(row.fecha);
    if (legal) feriados.push({ fecha: legal.fecha, nombre: legal.nombre });
  }

  return {
    ok: true,
    modo: "contar",
    desde: isoA,
    hasta: isoB,
    diasHabiles: fechas.length,
    diasCorridos: corridos,
    feriados,
    fechas,
  };
}

/**
 * N-ésimo hábil posterior a `ancla`. El ancla no se consume
 * (`addDiasHabilesPosteriores`, art. 48 del Código Civil).
 *
 * N = 0, negativo o fecha inválida → resultado vacío, sin lanzar.
 *
 * @param {object} [opts]
 * @param {string} [opts.ancla] YYYY-MM-DD
 * @param {number} [opts.n]
 */
export function sumarDiasHabiles({ ancla = "", n = 0 } = {}) {
  const parts = parseIsoFecha(ancla);
  const raw = Number(n);
  const cupo = Number.isFinite(raw) ? Math.floor(raw) : 0;
  const iso = parts ? isoDe(parts) : "";
  if (!parts || cupo <= 0) return vacioSumar(iso, cupo);
  const fecha = addDiasHabilesPosteriores(iso, cupo);
  return {
    ok: Boolean(fecha),
    modo: "sumar",
    ancla: iso,
    n: cupo,
    fecha,
    diasHabiles: fecha ? cupo : 0,
  };
}
