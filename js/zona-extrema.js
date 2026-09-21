import { calcularIusc, roundPeso } from "./sueldo.js";
import {
  GRADO_1A_EUS_ZONA_EXTREMA,
  INCREMENTO_ASIGNACION_ZONA_LEY_19354,
} from "./constants.js";

/**
 * Rebaja por presunción de asignación de zona del Impuesto Único de
 * Segunda Categoría (art. 13 D.L. N° 889 de 1975; Circular SII N° 10/1976;
 * incremento 40 % Ley N° 19.354 sobre el % del art. 7° D.L. 249).
 *
 * No es la tabla IUSC de `/impuesto-unico`, ni el líquido de `/sueldo`,
 * ni la bonificación a la contratación de mano de obra del empleador
 * (Ley N° 19.853 / Tesorería).
 *
 * Territorios del art. 13 (SII FAQ 001.140.1533, actualizada 17.07.2025;
 * BCN, beneficios tributarios zonas extremas, junio 2026): Arica y
 * Parinacota, Tarapacá, Aysén, Magallanes y Antártica Chilena, y
 * provincia de Chiloé. Palena figura en el art. 7° D.L. 249 y en el
 * art. 20 D.L. 3.477 (beneficios del D.L. 889); Antofagasta y la RM
 * no aplican.
 *
 * Fórmula (Circular N° 10/1976; el % ya incluye el × 1,4 de la 19.354):
 *   rebaja_sin_tope = round(renta_afecta × pct / (pct + 100))
 *   tope = round(grado_1A × pct / 100)
 *   rebaja_efectiva = min(rebaja_sin_tope, tope)
 *   renta_afecta_nueva = max(0, renta_afecta − rebaja_efectiva)
 *
 * `renta_afecta` es la misma base que alimenta el IUSC antes de zona
 * (imponible − cotizaciones obligatorias del trabajador).
 *
 * @see https://www.sii.cl/preguntas_frecuentes/declaracion_renta/001_140_1533.htm
 * @see https://www.sii.cl/pagina/jurisprudencia/adminis/2002/renta/ja316.htm
 * @see https://www.bcn.cl/leychile/navegar?idNorma=5904
 * @see https://www.suseso.gob.cl/612/w3-propertyvalue-187853.html
 */

export const ZONAS_EXTREMAS = Object.freeze([
  Object.freeze({
    id: "iquique",
    label: "Iquique (Tarapacá)",
    pctBase: 40,
  }),
  Object.freeze({
    id: "pozo-almonte",
    label: "Pozo Almonte (Tarapacá)",
    pctBase: 55,
  }),
  Object.freeze({
    id: "isluga",
    label: "Isluga y localidades altiplánicas (Tarapacá)",
    pctBase: 80,
  }),
  Object.freeze({
    id: "arica",
    label: "Arica (Arica y Parinacota)",
    pctBase: 40,
  }),
  Object.freeze({
    id: "chiloe",
    label: "Provincia de Chiloé (Castro, Ancud y demás comunas)",
    pctBase: 40,
  }),
  Object.freeze({
    id: "palena",
    label: "Provincia de Palena (Chaitén, Futaleufú, Palena)",
    pctBase: 70,
  }),
  Object.freeze({
    id: "aysen-provincia",
    label: "Provincia de Aysén (resto)",
    pctBase: 60,
  }),
  Object.freeze({
    id: "coyhaique",
    label: "Coyhaique / Balmaceda / Puerto Aysén",
    pctBase: 105,
  }),
  Object.freeze({
    id: "cochrane",
    label: "Cochrane / Chile Chico / localidades aisladas de Aysén",
    pctBase: 125,
  }),
  Object.freeze({
    id: "punta-arenas",
    label: "Punta Arenas (Magallanes)",
    pctBase: 70,
  }),
  Object.freeze({
    id: "natales",
    label: "Puerto Natales / Tierra del Fuego / Última Esperanza",
    pctBase: 85,
  }),
  Object.freeze({
    id: "williams",
    label: "Puerto Williams / Navarino",
    pctBase: 105,
  }),
  Object.freeze({
    id: "antartica-comision",
    label: "Antártica (comisión)",
    pctBase: 300,
  }),
  Object.freeze({
    id: "antartica-estable",
    label: "Antártica (estable)",
    pctBase: 600,
  }),
  Object.freeze({
    id: "otro",
    label: "Otra localidad elegible (editar %)",
    pctBase: 0,
  }),
]);

export function zonaExtremaPorId(id) {
  const key = String(id || "").trim();
  return ZONAS_EXTREMAS.find((z) => z.id === key) || null;
}

export function pctIncrementadoDesdeBase(pctBase) {
  const base = Number(pctBase);
  if (!Number.isFinite(base) || base <= 0) return 0;
  return base * INCREMENTO_ASIGNACION_ZONA_LEY_19354;
}

function noNegativo(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return v;
}

function vacio({
  rentaAfecta = 0,
  pctIncrementado = 0,
  pctBase = 0,
  grado1A = 0,
  zonaId = "",
  motivo = "",
} = {}) {
  return {
    ok: false,
    motivo,
    rentaAfecta,
    pctIncrementado,
    pctBase,
    grado1A,
    zonaId,
    rebajaSinTope: 0,
    tope: 0,
    rebajaEfectiva: 0,
    topeAplica: false,
    rentaAfectaNueva: 0,
    iuscAntes: 0,
    iuscDespues: 0,
    ahorroIusc: 0,
  };
}

/**
 * @param {{
 *   rentaAfecta?: number,
 *   pctIncrementado?: number,
 *   pctBase?: number,
 *   grado1A?: number,
 *   zonaId?: string,
 * }} [input]
 */
export function calcularZonaExtrema(input = {}) {
  const rentaAfecta = noNegativo(input.rentaAfecta);
  const gradoIn = Number(input.grado1A);
  const grado1A =
    Number.isFinite(gradoIn) && gradoIn > 0 ? gradoIn : GRADO_1A_EUS_ZONA_EXTREMA;
  const zona = zonaExtremaPorId(input.zonaId);
  const zonaId = zona ? zona.id : String(input.zonaId || "").trim();
  const pctBaseIn = Number(input.pctBase);
  const pctBase =
    Number.isFinite(pctBaseIn) && pctBaseIn > 0
      ? pctBaseIn
      : zona && zona.pctBase > 0
        ? zona.pctBase
        : 0;
  const pctIn = Number(input.pctIncrementado);
  const pctIncrementado =
    Number.isFinite(pctIn) && pctIn > 0
      ? pctIn
      : pctIncrementadoDesdeBase(pctBase);

  if (rentaAfecta <= 0) {
    return vacio({
      rentaAfecta,
      pctIncrementado,
      pctBase,
      grado1A,
      zonaId,
      motivo: "renta",
    });
  }
  if (pctIncrementado <= 0) {
    return vacio({
      rentaAfecta,
      pctIncrementado,
      pctBase,
      grado1A,
      zonaId,
      motivo: "pct",
    });
  }
  if (grado1A <= 0) {
    return vacio({
      rentaAfecta,
      pctIncrementado,
      pctBase,
      grado1A,
      zonaId,
      motivo: "grado",
    });
  }

  const rebajaSinTope = roundPeso(
    (rentaAfecta * pctIncrementado) / (pctIncrementado + 100),
  );
  const tope = roundPeso((grado1A * pctIncrementado) / 100);
  const rebajaEfectiva = Math.min(rebajaSinTope, tope);
  const rentaAfectaNueva = Math.max(0, rentaAfecta - rebajaEfectiva);
  const iuscAntes = calcularIusc(rentaAfecta);
  const iuscDespues = calcularIusc(rentaAfectaNueva);
  const ahorroIusc = Math.max(0, iuscAntes - iuscDespues);

  return {
    ok: true,
    motivo: "",
    rentaAfecta,
    pctIncrementado,
    pctBase,
    grado1A,
    zonaId,
    rebajaSinTope,
    tope,
    rebajaEfectiva,
    topeAplica: rebajaSinTope > tope,
    rentaAfectaNueva,
    iuscAntes,
    iuscDespues,
    ahorroIusc,
  };
}
