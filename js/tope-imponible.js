import { FALLBACK_UF, TOPE_AFP_SALUD_UF, TOPE_CESANTIA_UF, UF_MAX, UF_MIN } from "./constants.js";
import { roundPeso } from "./sueldo.js";

/**
 * Tope imponible previsional en UF y en pesos del mes.
 *
 * Haberes usa dos topes, los mismos de `calcularSueldo` (sueldo.js):
 *   - AFP y salud (D.L. 3.500 art. 16; salud 7 % sobre la misma base):
 *     TOPE_AFP_SALUD_UF (90 UF). Sobre esta base también van la
 *     cotización del empleador Ley 21.735, la mutual y SANNA.
 *   - Seguro de cesantía (Ley 19.728 art. 6): TOPE_CESANTIA_UF (135,2 UF),
 *     trabajador y empleador.
 *
 *   tope        = topeUf × uf           (exacto, sin redondear; igual que sueldo.js)
 *   topePesos   = roundPeso(tope)
 *   base        = min(renta, tope)      (renta afecta a cotización)
 *   exceso      = roundPeso(max(0, renta − tope))  (renta exenta del tope)
 *   margen      = roundPeso(max(0, tope − renta))  (cuánto falta para el tope)
 *   supera      = renta > tope + 0,5    (misma tolerancia que /cotizaciones-previsionales)
 *
 * No calcula cotizaciones ni líquido: eso vive en /cotizaciones-previsionales,
 * /sueldo y /costo-empresa. No inventa topes distintos (p. ej. no separa AFP de
 * salud) ni proporcionaliza el tope por días trabajados.
 *
 * Gold (UF fija $39.000):
 *   renta $3.500.000 → tope AFP/salud $3.510.000 (90 UF), base $3.500.000,
 *                      exceso $0, margen $10.000; tope cesantía $5.272.800 (135,2 UF).
 *   renta $4.000.000 → base AFP/salud $3.510.000, exceso $490.000;
 *                      cesantía base $4.000.000, exceso $0.
 *   renta $6.000.000 → exceso AFP/salud $2.490.000; exceso cesantía $727.200.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=7147 (D.L. 3.500 art. 16)
 * @see https://www.bcn.cl/leychile/navegar?idNorma=189967 (Ley 19.728 art. 6)
 * @see https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9927.html
 */

export const TOPE_IMPONIBLE_MOTIVOS = Object.freeze({
  uf: "uf",
  renta: "renta",
});

export function ufValida(uf) {
  const n = Number(uf);
  return Number.isFinite(n) && n >= UF_MIN && n <= UF_MAX;
}

function tramo(renta, topeUf, uf) {
  const tope = topeUf * uf;
  const base = Math.min(renta, tope);
  const supera = renta > tope + 0.5;
  return {
    topeUf,
    tope,
    topePesos: roundPeso(tope),
    base,
    basePesos: roundPeso(base),
    exceso: roundPeso(Math.max(0, renta - tope)),
    margen: roundPeso(Math.max(0, tope - renta)),
    supera,
    porcentajeAfecto: renta > 0 ? Math.min(1, base / renta) : 1,
  };
}

function vacio(motivo, uf, renta) {
  const cero = {
    tope: 0,
    topePesos: 0,
    base: 0,
    basePesos: 0,
    exceso: 0,
    margen: 0,
    supera: false,
    porcentajeAfecto: 1,
  };
  return {
    ok: false,
    motivo,
    uf,
    rentaImponible: renta,
    rentaUf: 0,
    afpSalud: { topeUf: TOPE_AFP_SALUD_UF, ...cero },
    cesantia: { topeUf: TOPE_CESANTIA_UF, ...cero },
  };
}

/**
 * @param {{ rentaImponible?: number, uf?: number }} input
 *   rentaImponible: renta imponible bruta del mes (opcional; 0 = solo topes).
 *   uf: valor UF del mes (por defecto FALLBACK_UF; en la UI llega de mindicador.cl).
 */
export function calcularTopeImponible({ rentaImponible = 0, uf = FALLBACK_UF } = {}) {
  const ufNum = Number(uf);
  const rentaNum = Number(rentaImponible);
  if (!ufValida(ufNum)) return vacio(TOPE_IMPONIBLE_MOTIVOS.uf, ufNum, 0);
  if (!Number.isFinite(rentaNum) || rentaNum < 0) return vacio(TOPE_IMPONIBLE_MOTIVOS.renta, ufNum, 0);
  const renta = roundPeso(rentaNum);
  return {
    ok: true,
    motivo: null,
    uf: ufNum,
    rentaImponible: renta,
    rentaUf: renta / ufNum,
    afpSalud: tramo(renta, TOPE_AFP_SALUD_UF, ufNum),
    cesantia: tramo(renta, TOPE_CESANTIA_UF, ufNum),
  };
}
