import { roundPeso } from "./sueldo.js";

/**
 * Topes del artículo 58 del Código del Trabajo.
 *
 * Base de los porcentajes: remuneración total bruta del período, antes de
 * restar los descuentos obligatorios del inciso 1° (dictamen DT 7051/332).
 *
 * - Inciso 1° (obligatorios): impuestos que gravan la remuneración,
 *   cotizaciones de seguridad social, cuotas sindicales legales y
 *   obligaciones con instituciones de previsión u organismos públicos.
 *   No les aplica el 15 % ni el 30 %.
 * - Inciso 2° (vivienda / educación): acuerdo escrito. Hasta el 30 % de la
 *   remuneración total si el empleador paga la cuota directo a la institución
 *   financiera o educacional (incluye el mutuo o crédito sin interés).
 * - Inciso 3° (otros voluntarios): acuerdo escrito, cualquier otra naturaleza.
 *   Hasta el 15 % de la remuneración total bruta.
 * - Inciso 4°: en conjunto, las deducciones no pueden exceder el 45 % de la
 *   remuneración total.
 *
 * Orden de reducción cuando la suma que cabe por bucket supera el 45 %:
 * 1. Se conservan primero los obligatorios del inciso 1°.
 * 2. Después vivienda / educación, hasta su 30 % y hasta el cupo que quede.
 * 3. Al final los otros voluntarios, hasta su 15 % y hasta el cupo que quede.
 *
 * Si los obligatorios solos pasan el 45 %, lo que «cabe» bajo el tope global
 * es el 45 % y el exceso se informa. El empleador igual debe practicar
 * impuestos y cotizaciones: este tope no los elimina.
 *
 * El anticipo de remuneración ya devengada no es un descuento del art. 58
 * (DT 7051/332) y no entra en esta función.
 *
 * Remuneración ≤ 0, o cualquier monto no finito o negativo → ok: false y ceros.
 */

const TASA_OTROS = 0.15;
const TASA_VIVIENDA = 0.3;
const TASA_GLOBAL = 0.45;

function cero() {
  return {
    ok: false,
    remuneracion: 0,
    tope15: 0,
    tope30: 0,
    tope45: 0,
    obligatorios: 0,
    viviendaSolicitada: 0,
    otrosSolicitados: 0,
    aplicable15: 0,
    exceso15: 0,
    aplicable30: 0,
    exceso30: 0,
    obligatoriosAplicables: 0,
    viviendaAplicables: 0,
    otrosAplicables: 0,
    excesoObligatorios: 0,
    excesoViviendaGlobal: 0,
    excesoOtrosGlobal: 0,
    totalAplicable: 0,
    excedeGlobal: false,
    remanente: 0,
  };
}

function monto(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return roundPeso(n);
}

export function calcularDescuentosLegales({
  remuneracion = 0,
  obligatorios = 0,
  vivienda = 0,
  otros = 0,
} = {}) {
  const rem = monto(remuneracion);
  const obl = monto(obligatorios);
  const viv = monto(vivienda);
  const otr = monto(otros);
  if (rem == null || obl == null || viv == null || otr == null || rem <= 0) return cero();

  const tope15 = roundPeso(rem * TASA_OTROS);
  const tope30 = roundPeso(rem * TASA_VIVIENDA);
  const tope45 = roundPeso(rem * TASA_GLOBAL);

  const aplicable15 = Math.min(otr, tope15);
  const exceso15 = Math.max(0, otr - tope15);
  const aplicable30 = Math.min(viv, tope30);
  const exceso30 = Math.max(0, viv - tope30);

  let room = tope45;
  const obligatoriosAplicables = Math.min(obl, room);
  const excesoObligatorios = obl - obligatoriosAplicables;
  room -= obligatoriosAplicables;

  const viviendaAplicables = Math.min(aplicable30, room);
  const excesoViviendaGlobal = aplicable30 - viviendaAplicables;
  room -= viviendaAplicables;

  const otrosAplicables = Math.min(aplicable15, room);
  const excesoOtrosGlobal = aplicable15 - otrosAplicables;

  const totalAplicable = obligatoriosAplicables + viviendaAplicables + otrosAplicables;
  const pedidoBajoTopes = obl + aplicable30 + aplicable15;

  return {
    ok: true,
    remuneracion: rem,
    tope15,
    tope30,
    tope45,
    obligatorios: obl,
    viviendaSolicitada: viv,
    otrosSolicitados: otr,
    aplicable15,
    exceso15,
    aplicable30,
    exceso30,
    obligatoriosAplicables,
    viviendaAplicables,
    otrosAplicables,
    excesoObligatorios,
    excesoViviendaGlobal,
    excesoOtrosGlobal,
    totalAplicable,
    excedeGlobal: pedidoBajoTopes > tope45,
    remanente: rem - totalAplicable,
  };
}
