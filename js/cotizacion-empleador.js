import {
  FALLBACK_UF,
  LEY_21735_CRP,
  LEY_21735_CUENTA_INDIVIDUAL,
  LEY_21735_SSP,
  LEY_21735_TASA,
  TOPE_AFP_SALUD_UF,
} from "./constants.js";
import { roundPeso } from "./sueldo.js";

/**
 * Cotización de cargo del empleador — Ley 21.735 (reforma previsional).
 * Vigencia agosto → julio del año siguiente. Tasas legales del cronograma
 * (Previsión Social / Superintendencia de Pensiones), no la prima variable
 * de un contrato SIS particular.
 *
 * Ago 2025: 0,1 % capitalización + 0,9 % expectativa de vida (FAPP) = 1,0 %.
 * Ago 2026: 0,1 + 1,0 + 0,9 + 1,5 = 3,5 %. El SIS va dentro de ese total.
 * Ago 2033: 8,5 % (4,5 % capitalización + 1,0 % expectativa + 1,5 % CRP + 1,5 % SIS).
 *
 * Base: remuneración imponible con tope AFP/salud (90 UF), no cesantía 135,2 UF.
 * Cada componente se redondea con roundPeso; el total es la suma.
 *
 * @see https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-10906.html
 */

export const COTIZACION_EMPLEADOR_DEFAULT = "2026-08";

/** @type {{ id: string, desde: string, hasta: string, capitalizacion: number, expectativaVida: number, rentabilidadProtegida: number, sis: number }[]} */
export const CRONOGRAMA_LEY_21735 = [
  { id: "2025-08", desde: "Agosto 2025", hasta: "Julio 2026", capitalizacion: 0.001, expectativaVida: 0.009, rentabilidadProtegida: 0, sis: 0 },
  { id: "2026-08", desde: "Agosto 2026", hasta: "Julio 2027", capitalizacion: 0.001, expectativaVida: 0.01, rentabilidadProtegida: 0.009, sis: 0.015 },
  { id: "2027-08", desde: "Agosto 2027", hasta: "Julio 2028", capitalizacion: 0.0025, expectativaVida: 0.01, rentabilidadProtegida: 0.015, sis: 0.015 },
  { id: "2028-08", desde: "Agosto 2028", hasta: "Julio 2029", capitalizacion: 0.01, expectativaVida: 0.01, rentabilidadProtegida: 0.015, sis: 0.015 },
  { id: "2029-08", desde: "Agosto 2029", hasta: "Julio 2030", capitalizacion: 0.017, expectativaVida: 0.01, rentabilidadProtegida: 0.015, sis: 0.015 },
  { id: "2030-08", desde: "Agosto 2030", hasta: "Julio 2031", capitalizacion: 0.024, expectativaVida: 0.01, rentabilidadProtegida: 0.015, sis: 0.015 },
  { id: "2031-08", desde: "Agosto 2031", hasta: "Julio 2032", capitalizacion: 0.031, expectativaVida: 0.01, rentabilidadProtegida: 0.015, sis: 0.015 },
  { id: "2032-08", desde: "Agosto 2032", hasta: "Julio 2033", capitalizacion: 0.038, expectativaVida: 0.01, rentabilidadProtegida: 0.015, sis: 0.015 },
  { id: "2033-08", desde: "Agosto 2033", hasta: "Julio 2034", capitalizacion: 0.045, expectativaVida: 0.01, rentabilidadProtegida: 0.015, sis: 0.015 },
];

export function tasaTotalCotizacionEmpleador(fila) {
  const puntos =
    Math.round(fila.capitalizacion * 10000) +
    Math.round(fila.expectativaVida * 10000) +
    Math.round(fila.rentabilidadProtegida * 10000) +
    Math.round(fila.sis * 10000);
  return puntos / 10000;
}

/**
 * Ago 2026 debe coincidir con las constantes que usa /costo-empresa:
 * 0,1 % + 0,9 % CRP + 2,5 % SSP (1,0 % expectativa + 1,5 % SIS) = 3,5 %.
 */
export function cronogramaAlineadoConCostoEmpresa() {
  const fila = CRONOGRAMA_LEY_21735.find((r) => r.id === "2026-08");
  if (!fila) return false;
  const ssp = fila.expectativaVida + fila.sis;
  return (
    fila.capitalizacion === LEY_21735_CUENTA_INDIVIDUAL &&
    fila.rentabilidadProtegida === LEY_21735_CRP &&
    Math.abs(ssp - LEY_21735_SSP) < 1e-12 &&
    Math.abs(tasaTotalCotizacionEmpleador(fila) - LEY_21735_TASA) < 1e-12
  );
}

export function periodoCotizacionEmpleador(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return CRONOGRAMA_LEY_21735.find((r) => r.id === COTIZACION_EMPLEADOR_DEFAULT) || null;
  const byId = CRONOGRAMA_LEY_21735.find((r) => r.id === s);
  if (byId) return byId;
  const year = s.match(/20(?:2[5-9]|3[0-3])/);
  if (year) return CRONOGRAMA_LEY_21735.find((r) => r.id.startsWith(year[0])) || null;
  return null;
}

/**
 * @param {{ remuneracionImponible?: number, imponible?: number, monto?: number, periodo?: string, vigencia?: string }} [input]
 * @param {{ uf?: number }} [indicadores]
 */
export function calcularCotizacionEmpleador(input = {}, indicadores = {}) {
  const periodo = periodoCotizacionEmpleador(input.periodo ?? input.vigencia);
  const ufRaw = Number(indicadores.uf);
  const uf = Number.isFinite(ufRaw) && ufRaw > 0 ? ufRaw : FALLBACK_UF;
  const remuneracionImponible = Math.max(
    0,
    Number(input.remuneracionImponible ?? input.imponible ?? input.monto) || 0,
  );
  if (!periodo) {
    return {
      ok: false,
      motivo: "periodo",
      remuneracionImponible,
      imponibleEfectiva: 0,
      topeAfp: TOPE_AFP_SALUD_UF * uf,
      topeUf: TOPE_AFP_SALUD_UF,
      uf,
      topeAplicado: false,
      periodoId: "",
      desde: "",
      hasta: "",
      tasa: 0,
      total: 0,
      capitalizacion: { tasa: 0, monto: 0 },
      expectativaVida: { tasa: 0, monto: 0 },
      rentabilidadProtegida: { tasa: 0, monto: 0 },
      sis: { tasa: 0, monto: 0 },
    };
  }

  const topeAfp = TOPE_AFP_SALUD_UF * uf;
  const imponibleEfectiva = Math.min(remuneracionImponible, topeAfp);
  const capitalizacion = roundPeso(imponibleEfectiva * periodo.capitalizacion);
  const expectativaVida = roundPeso(imponibleEfectiva * periodo.expectativaVida);
  const rentabilidadProtegida = roundPeso(imponibleEfectiva * periodo.rentabilidadProtegida);
  const sis = roundPeso(imponibleEfectiva * periodo.sis);
  const total = capitalizacion + expectativaVida + rentabilidadProtegida + sis;

  return {
    ok: true,
    motivo: "",
    remuneracionImponible,
    imponibleEfectiva,
    topeAfp,
    topeUf: TOPE_AFP_SALUD_UF,
    uf,
    topeAplicado: remuneracionImponible > topeAfp + 0.5,
    periodoId: periodo.id,
    desde: periodo.desde,
    hasta: periodo.hasta,
    tasa: tasaTotalCotizacionEmpleador(periodo),
    total,
    capitalizacion: { tasa: periodo.capitalizacion, monto: capitalizacion },
    expectativaVida: { tasa: periodo.expectativaVida, monto: expectativaVida },
    rentabilidadProtegida: { tasa: periodo.rentabilidadProtegida, monto: rentabilidadProtegida },
    sis: { tasa: periodo.sis, monto: sis },
  };
}
