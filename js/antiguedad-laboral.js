import { hoyChileIso } from "./contrato-plazo-fijo.js";
import { parseIsoFecha, ymdIso } from "./feriados.js";

/**
 * Antigüedad laboral: conteo civil de fecha a fecha.
 *
 * Toma la fecha de inicio del contrato y la fecha de término (o «hoy» en
 * America/Santiago) y devuelve la antigüedad en años, meses y días, en ese
 * orden, como un «diff» de calendario real (sin años de 360 días):
 *
 *   anosCompletos   = aniversarios cumplidos entre inicio y término
 *   mesesRemanentes = meses completos después del último aniversario
 *   diasRemanentes  = días restantes después de esos meses
 *
 * Derivados:
 *   anosIAS          = anosCompletos (años de servicio cumplidos; la fracción
 *                      de meses/días se muestra como contexto, no sube el
 *                      conteo; nunca «6 meses exactos = 1 año»)
 *   anosConFraccion  = anosIAS + 1 si la fracción es estrictamente mayor a
 *                      seis meses (regla del inciso 2° del art. 163 que ya
 *                      aplica /indemnizacion-anos-servicio vía aniosServicio);
 *                      solo informativo, sin tope de 11 años
 *   mesesFeriado     = anosCompletos × 12 + mesesRemanentes (orientativo para
 *                      feriado / vacaciones proporcionales; los días sueltos
 *                      no suman un mes)
 *
 * Solo cuenta tiempo. No calcula montos de IAS, aviso, feriado ni finiquito;
 * eso vive en /indemnizacion-anos-servicio, /finiquito y
 * /vacaciones-proporcionales. No modela suspensiones, jornadas especiales ni
 * el cómputo casuístico de la DT.
 *
 * Gold 2026:
 *   2020-01-15 → 2026-07-15 = 6 años, 6 meses, 0 días; anosIAS 6; mesesFeriado 78
 *   2020-01-15 → 2026-01-14 = 5 años, 11 meses, 30 días; anosIAS 5 (no 6);
 *                              anosConFraccion 6 (fracción > 6 meses)
 *   2024-03-01 → 2024-03-01 = 0 años, 0 meses, 0 días; anosIAS 0; mesesFeriado 0
 *   término < inicio → { ok: false, motivo: "orden" }
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 */

export const ANTIGUEDAD_MOTIVOS = Object.freeze({
  inicio: "inicio",
  termino: "termino",
  orden: "orden",
});

function toDate({ y, mo, d }) {
  return new Date(y, mo - 1, d);
}

function ultimoDiaDelMes(y, mo) {
  return new Date(y, mo, 0).getDate();
}

/**
 * Suma meses calendario a una fecha ISO; el día se recorta al último día
 * del mes destino (31-ene + 1 mes = 28/29-feb).
 */
export function sumarMesesIso(iso, meses) {
  const parts = parseIsoFecha(iso);
  const n = Math.trunc(Number(meses));
  if (!parts || !Number.isFinite(n)) return "";
  const total = parts.mo - 1 + n;
  const y = parts.y + Math.floor(total / 12);
  const mo = ((total % 12) + 12) % 12 + 1;
  const d = Math.min(parts.d, ultimoDiaDelMes(y, mo));
  return ymdIso(y, mo, d);
}

/** Días calendario entre dos fechas ISO (b − a); negativo si b < a. */
export function diasEntreIso(a, b) {
  const pa = parseIsoFecha(a);
  const pb = parseIsoFecha(b);
  if (!pa || !pb) return 0;
  return Math.round((toDate(pb).getTime() - toDate(pa).getTime()) / 86400000);
}

function vacio({ fechaInicio = "", fechaTermino = "", motivo = "" } = {}) {
  return {
    ok: false,
    motivo,
    fechaInicio,
    fechaTermino,
    anosCompletos: 0,
    mesesRemanentes: 0,
    diasRemanentes: 0,
    anosIAS: 0,
    anosConFraccion: 0,
    fraccionSuperiorSeisMeses: false,
    mesesFeriado: 0,
    diasCalendario: 0,
    ultimoAniversario: "",
    ancla: "",
  };
}

/** Regla del art. 163: fracción estrictamente mayor a seis meses (6 meses exactos no). */
export function esFraccionSuperiorSeisMeses(mesesRemanentes, diasRemanentes) {
  const m = Number(mesesRemanentes) || 0;
  const d = Number(diasRemanentes) || 0;
  return m > 6 || (m === 6 && d > 0);
}

/**
 * @param {object} input
 * @param {string} input.fechaInicio YYYY-MM-DD
 * @param {string} [input.fechaTermino] YYYY-MM-DD; vacío = hoy (America/Santiago)
 * @param {string} [input.fechaHoy] YYYY-MM-DD (tests); default = hoy en Chile
 */
export function calcularAntiguedadLaboral(input = {}) {
  const fechaInicio = String(input.fechaInicio || "").trim();
  const hoy = parseIsoFecha(input.fechaHoy) ? String(input.fechaHoy).trim() : hoyChileIso();
  const terminoRaw = String(input.fechaTermino || "").trim();
  const fechaTermino = terminoRaw || hoy;

  const inicio = parseIsoFecha(fechaInicio);
  if (!inicio) return vacio({ fechaInicio, fechaTermino, motivo: ANTIGUEDAD_MOTIVOS.inicio });
  const termino = parseIsoFecha(fechaTermino);
  if (!termino) return vacio({ fechaInicio, fechaTermino, motivo: ANTIGUEDAD_MOTIVOS.termino });

  const diasCalendario = diasEntreIso(fechaInicio, fechaTermino);
  if (diasCalendario < 0) {
    return vacio({ fechaInicio, fechaTermino, motivo: ANTIGUEDAD_MOTIVOS.orden });
  }

  // Años: aniversarios cumplidos (el aniversario se recorta si cae en 29-feb).
  let anosCompletos = Math.max(0, termino.y - inicio.y);
  while (anosCompletos > 0 && diasEntreIso(sumarMesesIso(fechaInicio, anosCompletos * 12), fechaTermino) < 0) {
    anosCompletos -= 1;
  }
  const ultimoAniversario = sumarMesesIso(fechaInicio, anosCompletos * 12);

  // Meses: completos después del último aniversario (0–11).
  let mesesRemanentes = 0;
  while (
    mesesRemanentes < 11 &&
    diasEntreIso(sumarMesesIso(fechaInicio, anosCompletos * 12 + mesesRemanentes + 1), fechaTermino) >= 0
  ) {
    mesesRemanentes += 1;
  }
  const ancla = sumarMesesIso(fechaInicio, anosCompletos * 12 + mesesRemanentes);

  // Días: lo que sobra desde el ancla (aniversario + meses completos).
  const diasRemanentes = Math.max(0, diasEntreIso(ancla, fechaTermino));
  const fraccionSuperiorSeisMeses = esFraccionSuperiorSeisMeses(mesesRemanentes, diasRemanentes);

  return {
    ok: true,
    motivo: "",
    fechaInicio,
    fechaTermino,
    terminoEsHoy: !terminoRaw,
    anosCompletos,
    mesesRemanentes,
    diasRemanentes,
    anosIAS: anosCompletos,
    anosConFraccion: anosCompletos + (fraccionSuperiorSeisMeses ? 1 : 0),
    fraccionSuperiorSeisMeses,
    mesesFeriado: anosCompletos * 12 + mesesRemanentes,
    diasCalendario,
    ultimoAniversario,
    ancla,
  };
}

function plural(n, uno, varios) {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** «6 años, 6 meses, 0 días». */
export function textoAntiguedad(calc) {
  if (!calc || calc.ok !== true) return "—";
  return [
    plural(calc.anosCompletos, "año", "años"),
    plural(calc.mesesRemanentes, "mes", "meses"),
    plural(calc.diasRemanentes, "día", "días"),
  ].join(", ");
}
