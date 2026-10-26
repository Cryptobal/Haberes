import { roundPeso } from "./sueldo.js";

/**
 * Bono por hijo nacido vivo o adoptado (Ley 20.255, arts. 74-78 y
 * art. 24 transitorio). Estimación: el IPS usa el índice In/Ii que
 * informa la Superintendencia de Pensiones (Compendio, cap. VI). Esa
 * serie no está publicada como tabla cerrada, así que la rentabilidad
 * es un supuesto nominal anual compuesto, explícito en `rentabilidadAnual`.
 *
 * BHi = round(0,10 × 18 × IM × (1 + r) ^ (meses / 12))
 *
 * meses = mes del índice de término − mes del índice de inicio
 * (el compendio usa el índice del mes anterior al cumpleaños 65,
 * y junio de 2009 si el hijo nació antes del 1 de julio de 2009).
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=269892
 * @see https://www.spensiones.cl/portal/institucional/594/w3-article-6701.html
 * @see https://www.spensiones.cl/portal/institucional/597/w3-article-12727.html
 * @see https://www.chileatiende.gob.cl/fichas/5194-bono-por-hijo
 */

/** Ejemplo publicado por la Superintendencia (no es la tasa vigente). */
export const RENTABILIDAD_EJEMPLO_SP = 0.0451;

/** Corte de la Ley 20.255 / art. 24 transitorio. */
export const CORTE_BONO_HIJO = "2009-07-01";

/**
 * Ingreso mínimo mensual, trabajadores mayores de 18 y hasta 65 años.
 * Vigente desde `desde` (inclusive) hasta el tramo siguiente.
 * Montos de la ley citada (el de enero 2025 sale del Decreto de Hacienda
 * que aplica el IPC del art. 1 de la Ley 21.578).
 */
export const IMM_18_65 = [
  { desde: "2009-07-01", monto: 165000, ley: "Ley 20.359" },
  { desde: "2010-07-01", monto: 172000, ley: "Ley 20.449" },
  { desde: "2011-07-01", monto: 182000, ley: "Ley 20.524" },
  { desde: "2012-07-01", monto: 193000, ley: "Ley 20.614" },
  { desde: "2013-08-01", monto: 210000, ley: "Ley 20.689" },
  { desde: "2014-07-01", monto: 225000, ley: "Ley 20.763" },
  { desde: "2015-07-01", monto: 241000, ley: "Ley 20.763" },
  { desde: "2016-01-01", monto: 250000, ley: "Ley 20.763" },
  { desde: "2016-07-01", monto: 257500, ley: "Ley 20.935" },
  { desde: "2017-01-01", monto: 264000, ley: "Ley 20.935" },
  { desde: "2017-07-01", monto: 270000, ley: "Ley 20.935" },
  { desde: "2018-01-01", monto: 276000, ley: "Ley 20.935" },
  { desde: "2018-09-01", monto: 288000, ley: "Ley 21.112" },
  { desde: "2019-03-01", monto: 301000, ley: "Ley 21.112" },
  { desde: "2020-03-01", monto: 320500, ley: "Ley 21.112" },
  { desde: "2020-09-01", monto: 326500, ley: "Ley 21.283" },
  { desde: "2021-05-01", monto: 337000, ley: "Ley 21.360" },
  { desde: "2022-01-01", monto: 350000, ley: "Ley 21.360" },
  { desde: "2022-05-01", monto: 380000, ley: "Ley 21.456" },
  { desde: "2022-08-01", monto: 400000, ley: "Ley 21.456" },
  { desde: "2023-01-01", monto: 410000, ley: "Ley 21.456" },
  { desde: "2023-05-01", monto: 440000, ley: "Ley 21.578" },
  { desde: "2023-09-01", monto: 460000, ley: "Ley 21.578" },
  { desde: "2024-07-01", monto: 500000, ley: "Ley 21.578" },
  { desde: "2025-01-01", monto: 510636, ley: "Ley 21.578 (IPC, Decreto Hacienda)" },
  { desde: "2025-05-01", monto: 529000, ley: "Ley 21.751" },
  { desde: "2026-01-01", monto: 539000, ley: "Ley 21.751" },
  { desde: "2026-05-01", monto: 553553, ley: "Ley 21.830" },
];

/** Desde esta fecha la Ley 21.830 reajusta por IPC y el peso aún no está fijado. */
const IMM_SIN_PESO = "2027-01-01";

function parseIso(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return { y, m: mo, d };
}

function iso(fecha) {
  const p = (n) => String(n).padStart(2, "0");
  return `${fecha.y}-${p(fecha.m)}-${p(fecha.d)}`;
}

function ym(fecha) {
  return `${fecha.y}-${String(fecha.m).padStart(2, "0")}`;
}

function cmp(a, b) {
  if (a.y !== b.y) return a.y - b.y;
  if (a.m !== b.m) return a.m - b.m;
  return a.d - b.d;
}

function indice(fecha) {
  return fecha.y * 12 + fecha.m;
}

function mesAnterior(fecha) {
  if (fecha.m === 1) return { y: fecha.y - 1, m: 12, d: 1 };
  return { y: fecha.y, m: fecha.m - 1, d: 1 };
}

function cumple65(nac) {
  const y = nac.y + 65;
  const dt = new Date(Date.UTC(y, nac.m - 1, nac.d));
  if (dt.getUTCMonth() !== nac.m - 1) {
    const last = new Date(Date.UTC(y, nac.m, 0));
    return { y, m: nac.m, d: last.getUTCDate() };
  }
  return { y, m: nac.m, d: nac.d };
}

/**
 * IMM 18–65 vigente en una fecha ISO. `null` si es anterior a julio 2009
 * o desde enero 2027 (reajuste por IPC aún sin monto en pesos).
 */
export function ingresoMinimo18a65(fechaIso) {
  const fecha = parseIso(fechaIso);
  if (!fecha) return null;
  const clave = iso(fecha);
  if (clave < IMM_18_65[0].desde || clave >= IMM_SIN_PESO) return null;
  let vigente = null;
  for (const tramo of IMM_18_65) {
    if (tramo.desde <= clave) vigente = tramo;
  }
  return vigente;
}

function salidaCero(motivo, extra = {}) {
  return {
    ok: false,
    motivo,
    im: 0,
    ley: "",
    base: 0,
    meses: 0,
    factor: 0,
    rentabilidadAnual: 0,
    rentabilidadEsSupuesto: true,
    antesDeJulio2009: false,
    referencia: "nacimiento",
    cantidad: 0,
    bono: 0,
    total: 0,
    cumple65: "",
    indiceInicio: "",
    indiceFin: "",
    pensionAntesDelCorte: false,
    avisos: [],
    ...extra,
  };
}

export function calcularBonoPorHijo(input = {}) {
  const madre = parseIso(input.fechaMadre);
  const hijo = parseIso(input.fechaHijo);
  if (!madre || !hijo) return salidaCero("fecha");

  const cantidadRaw = input.cantidad == null || input.cantidad === "" ? 1 : Number(input.cantidad);
  if (!Number.isInteger(cantidadRaw) || cantidadRaw < 1 || cantidadRaw > 20) {
    return salidaCero("cantidad");
  }

  const rRaw = input.rentabilidadAnual == null || input.rentabilidadAnual === ""
    ? RENTABILIDAD_EJEMPLO_SP
    : Number(input.rentabilidadAnual);
  if (!Number.isFinite(rRaw) || rRaw <= -1 || rRaw > 1) return salidaCero("rentabilidad");

  const referencia = input.referencia === "adopcion" ? "adopcion" : "nacimiento";
  const corte = parseIso(CORTE_BONO_HIJO);
  const antesDeJulio2009 = cmp(hijo, corte) < 0;
  const cumple = cumple65(madre);
  const pensionAntesDelCorte = cmp(cumple, corte) < 0;

  let tramo;
  if (antesDeJulio2009) {
    tramo = IMM_18_65[0];
  } else {
    tramo = ingresoMinimo18a65(iso(hijo));
    if (!tramo) return salidaCero("imm", { antesDeJulio2009, referencia, cantidad: cantidadRaw });
  }

  const junio2009 = { y: 2009, m: 6, d: 1 };
  const indiceInicio = antesDeJulio2009 ? junio2009 : { y: hijo.y, m: hijo.m, d: 1 };
  const indiceFin = pensionAntesDelCorte ? junio2009 : mesAnterior(cumple);
  let meses = indice(indiceFin) - indice(indiceInicio);
  if (meses < 0) meses = 0;

  const factor = Math.pow(1 + rRaw, meses / 12);
  const base = roundPeso(0.1 * 18 * tramo.monto);
  const bono = roundPeso(0.1 * 18 * tramo.monto * factor);
  const total = bono * cantidadRaw;

  const avisos = [
    "La rentabilidad es un supuesto: no es el índice In/Ii que la Superintendencia informa al IPS.",
  ];
  if (referencia === "adopcion") {
    avisos.push(
      "El art. 75 usa el mes de nacimiento. Aquí el mes ingresado es la referencia de la adopción; el IPS determina la fecha que corresponde.",
    );
  }
  if (pensionAntesDelCorte) {
    avisos.push(
      "La bonificación beneficia a quienes se pensionan desde el 1 de julio de 2009. Si la pensión es anterior, no hay derecho.",
    );
  }
  if (cantidadRaw > 1) {
    avisos.push("Cada hijo usa la misma fecha. Si nacieron en meses distintos, calcule cada fecha y sume.");
  }

  return {
    ok: true,
    motivo: "",
    im: tramo.monto,
    ley: tramo.ley,
    base,
    meses,
    factor,
    rentabilidadAnual: rRaw,
    rentabilidadEsSupuesto: true,
    antesDeJulio2009,
    referencia,
    cantidad: cantidadRaw,
    bono,
    total,
    cumple65: iso(cumple),
    indiceInicio: ym(indiceInicio),
    indiceFin: ym(indiceFin),
    pensionAntesDelCorte,
    avisos,
  };
}
