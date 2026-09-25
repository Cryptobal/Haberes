import { FALLBACK_UTM } from "./constants.js";
import { roundPeso } from "./sueldo.js";

/**
 * Franquicia tributaria de capacitación (Ley 19.518 art. 36), también
 * difundida como Impulsa Personas. Estima el tope del 1 % de la planilla
 * anual de remuneraciones imponibles, si esa planilla supera 35 UTM, el
 * tramo imputable del participante y el monto franquiciable de un curso.
 *
 * No liquida ante SENCE, no simula un OTIC y no verifica categoría del SII
 * ni cotizaciones pagadas.
 *
 * Valores hora máximos 2026: Resolución Exenta SENCE N°3496 (30-dic-2025),
 * solicitudes del 1-ene al 31-dic-2026. La Res. Ex. N°632 (3-mar-2026)
 * suprimió la fila «A distancia – Autoaprendizaje $1.840»; no se ofrece.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=30766
 * @see https://sence.gob.cl/empresas/franquicia-tributaria
 * @see https://sence.gob.cl/sites/default/files/3496_fija_valores_hora_2026_0.pdf
 * @see https://cdn-site.sence.gob.cl/sites/default/files/r.e.632_03-03-2026.pdf
 */

/** UTM de septiembre 2026 (mindicador). Ancla de los gold tests. */
export const UTM_SEP_2026 = 71721;

export const CBC_RECARGO = 0.2;

/**
 * Valores hora participante, Res. Ex. SENCE N°3496 (30-dic-2025).
 * El tramo 1/2/3 de esta tabla es de la acción de capacitación, distinto
 * del tramo 100/50/15 % según la remuneración bruta del participante.
 * Sin la fila de autoaprendizaje ($1.840), eliminada por la Res. Ex. N°632.
 */
export const VALORES_HORA_SENCE_2026 = Object.freeze([
  { id: "presencial-tramo-1", grupo: "trabajadores", modalidad: "Presencial", detalle: "Tramo 1", valor: 7000 },
  { id: "presencial-tramo-2", grupo: "trabajadores", modalidad: "Presencial", detalle: "Tramo 2", valor: 9000 },
  { id: "presencial-tramo-3", grupo: "trabajadores", modalidad: "Presencial", detalle: "Tramo 3", valor: 12000 },
  { id: "elearning-sincrono-tramo-1", grupo: "trabajadores", modalidad: "E-learning sincrónico", detalle: "Tramo 1", valor: 5600 },
  { id: "elearning-sincrono-tramo-2", grupo: "trabajadores", modalidad: "E-learning sincrónico", detalle: "Tramo 2", valor: 6600 },
  { id: "elearning-asincrono", grupo: "trabajadores", modalidad: "E-learning asincrónico", detalle: "Único", valor: 5500 },
  { id: "directa-presencial", grupo: "directa", modalidad: "Ejecución directa o nivelación", detalle: "Presencial", valor: 7000 },
  { id: "directa-elearning-nivel-2", grupo: "directa", modalidad: "Ejecución directa o nivelación", detalle: "E-learning sincrónico y asincrónico nivel 2", valor: 5600 },
  { id: "directa-elearning-nivel-1", grupo: "directa", modalidad: "Ejecución directa o nivelación", detalle: "E-learning asincrónico nivel 1", valor: 2800 },
  { id: "directa-distancia-nivel-2", grupo: "directa", modalidad: "Ejecución directa o nivelación", detalle: "A distancia nivel 2", valor: 3500 },
  { id: "directa-distancia-nivel-1", grupo: "directa", modalidad: "Ejecución directa o nivelación", detalle: "A distancia nivel 1", valor: 2000 },
]);

export const VALOR_HORA_SENCE_DEFAULT = 7000;

function utmPesos(input, indicadores) {
  const raw = Number(input.utm ?? indicadores?.utm);
  if (Number.isFinite(raw) && raw > 0) return roundPeso(raw);
  return FALLBACK_UTM;
}

function noNegativo(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return v;
}

/**
 * ≤ 25 UTM → 1; > 25 y ≤ 50 UTM → 0,5; > 50 UTM → 0,15.
 * Los cortes son sobre la remuneración bruta mensual del participante.
 */
export function tramoPorRemuneracion(remuneracionBruta, umbral25, umbral50) {
  const rem = roundPeso(noNegativo(remuneracionBruta));
  if (rem <= umbral25) return 1;
  if (rem <= umbral50) return 0.5;
  return 0.15;
}

export function calcularFranquiciaSence(input = {}, indicadores = {}) {
  const utm = utmPesos(input, indicadores);
  const umbral25Utm = roundPeso(utm * 25);
  const umbral35Utm = roundPeso(utm * 35);
  const umbral50Utm = roundPeso(utm * 50);

  const planillaAnualImponible = roundPeso(noNegativo(input.planillaAnualImponible));
  const topeAnual1pct = roundPeso(planillaAnualImponible * 0.01);
  const elegible = planillaAnualImponible > umbral35Utm;

  const remuneracionBrutaParticipante = roundPeso(
    noNegativo(input.remuneracionBrutaParticipante ?? input.remuneracionBruta),
  );
  const tramoPct = tramoPorRemuneracion(remuneracionBrutaParticipante, umbral25Utm, umbral50Utm);

  const horasCurso = noNegativo(input.horasCurso ?? input.horas);
  const valorHoraSence = roundPeso(
    noNegativo(input.valorHoraSence ?? input.valorHora ?? VALOR_HORA_SENCE_DEFAULT),
  );
  const cbc = input.cbc === true || input.comiteBipartito === true;
  const valorHoraAplicado = roundPeso(valorHoraSence * (cbc ? 1 + CBC_RECARGO : 1));
  const brutoFranquicia = roundPeso(horasCurso * valorHoraAplicado * tramoPct);
  const montoFranquiciableCurso = Math.min(brutoFranquicia, topeAnual1pct);

  const costoCurso = roundPeso(noNegativo(input.costoCurso));
  const copagoEmpresa = costoCurso > 0 ? roundPeso(Math.max(0, costoCurso - montoFranquiciableCurso)) : 0;

  return {
    utm,
    umbral25Utm,
    umbral35Utm,
    umbral50Utm,
    planillaAnualImponible,
    topeAnual1pct,
    elegible,
    remuneracionBrutaParticipante,
    tramoPct,
    horasCurso,
    valorHoraSence,
    cbc,
    valorHoraAplicado,
    brutoFranquicia,
    montoFranquiciableCurso,
    costoCurso,
    copagoEmpresa,
  };
}
