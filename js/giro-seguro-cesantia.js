import { roundPeso } from "./sueldo.js";

/**
 * Giros de la prestación por cesantía (Ley 19.728), arts. 15 y 25.
 *
 * Cuenta Individual de Cesantía (art. 15):
 *   promedio de las últimas 10 remuneraciones imponibles (indefinido o casa
 *   particular) o 5 (plazo fijo, obra, trabajo o servicio);
 *   70 %, 60 %, 45 %, 40 %, 35 % y 30 % desde el sexto giro, sin mínimo ni
 *   máximo legal. Cada giro es min(porcentaje × promedio, saldo). El último
 *   puede ser el saldo. Si ese último giro es ≤ 20 % del anterior, ambos se
 *   pagan juntos (art. 15). La AFC informa hasta 13 giros; aquí el tope es 13.
 *
 * Fondo de Cesantía Solidario (arts. 24 y 25), solo si el usuario lo pide y
 * el saldo CIC no alcanza para los 5 giros del art. 25 (con topes):
 *   indefinido / casa particular: 70/60/45/40/35 %;
 *   plazo fijo / obra: 60/40/35/30/30 %.
 *   Mínimos y máximos: Res. Ex. SP n°383 (06/03/2026), vigentes hasta el
 *   28-feb-2027. El FCS entra cuando se agota la CIC, en el mismo mes si hace
 *   falta. No se modelan el 6.º y 7.º giro por alto desempleo ni catástrofe.
 *
 * No acredita cotizaciones, causal ni BNE. No es la cotización mensual AFC.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=189967
 * @see https://www.spensiones.cl/portal/institucional/594/w3-article-16977.html
 * @see https://www.afc.cl/mi-seguro-de-cesantia/beneficios/
 */

/** Tope práctico informado por la AFC para giros con cargo a la CIC. */
export const CIC_MAX_GIROS = 13;

/** Art. 15. El sexto índice (30 %) se repite desde el mes 6. */
export const CIC_PORCENTAJES = Object.freeze([0.7, 0.6, 0.45, 0.4, 0.35, 0.3]);

/**
 * Art. 25 + Res. Ex. SP n°383 (06/03/2026), vigentes hasta el 28-feb-2027.
 * Indefinido y casa particular (el inciso segundo del art. 25 no les aplica).
 */
export const FCS_INDEFINIDO = Object.freeze([
  Object.freeze({ porcentaje: 0.7, minimo: 301201, maximo: 1004003 }),
  Object.freeze({ porcentaje: 0.6, minimo: 258171, maximo: 860574 }),
  Object.freeze({ porcentaje: 0.45, minimo: 193629, maximo: 645429 }),
  Object.freeze({ porcentaje: 0.4, minimo: 172115, maximo: 573718 }),
  Object.freeze({ porcentaje: 0.35, minimo: 150602, maximo: 502002 }),
]);

/** Art. 25 inciso segundo. Plazo fijo, obra, trabajo o servicio. */
export const FCS_PLAZO = Object.freeze([
  Object.freeze({ porcentaje: 0.6, minimo: 258161, maximo: 860574 }),
  Object.freeze({ porcentaje: 0.4, minimo: 172115, maximo: 573718 }),
  Object.freeze({ porcentaje: 0.35, minimo: 150602, maximo: 502002 }),
  Object.freeze({ porcentaje: 0.3, minimo: 129085, maximo: 430288 }),
  Object.freeze({ porcentaje: 0.3, minimo: 129085, maximo: 430288 }),
]);

export const FCS_RESOLUCION = "Res. Ex. SP n°383 (06/03/2026)";
export const FCS_VIGENTE_HASTA = "2027-02-28";

function noNegativo(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return v;
}

/**
 * @param {string} contrato
 * @returns {"indefinido" | "casa_particular" | "plazo_fijo" | "obra"}
 */
export function normalizarContratoGiro(contrato) {
  const s = String(contrato || "indefinido")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (s === "plazo_fijo" || s === "plazo" || s === "fijo") return "plazo_fijo";
  if (s === "obra" || s === "obra_servicio" || s === "faena" || s === "servicio") return "obra";
  if (s === "casa_particular" || s === "casa" || s === "particular") return "casa_particular";
  return "indefinido";
}

export function esPlazoUObraGiro(contrato) {
  const c = normalizarContratoGiro(contrato);
  return c === "plazo_fijo" || c === "obra";
}

/** Últimos 10 meses (indefinido / casa particular) o 5 (plazo fijo / obra). Art. 15. */
export function ventanaPromedioGiroCesantia(contrato) {
  return esPlazoUObraGiro(contrato) ? 5 : 10;
}

export function tablaFcsGiro(contrato) {
  return esPlazoUObraGiro(contrato) ? FCS_PLAZO : FCS_INDEFINIDO;
}

function porcentajeCic(mes) {
  const i = Math.min(Math.max(mes, 1), CIC_PORCENTAJES.length) - 1;
  return CIC_PORCENTAJES[i];
}

function clamp(n, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, n));
}

/**
 * Remuneraciones de la más reciente a la más antigua. Se promedian las
 * primeras `ventana` con monto > 0. Si no hay ninguna, se usa `promedio`.
 *
 * @param {{ promedio?: number, remuneraciones?: number[] }} input
 * @param {number} ventana
 */
export function resolverPromedioGiro(input, ventana) {
  const lista = Array.isArray(input?.remuneraciones) ? input.remuneraciones : null;
  if (lista) {
    const usados = lista
      .map(noNegativo)
      .filter((v) => v > 0)
      .slice(0, ventana);
    if (usados.length) {
      const suma = usados.reduce((acc, v) => acc + v, 0);
      return {
        promedio: roundPeso(suma / usados.length),
        mesesUsados: usados.length,
        origen: "remuneraciones",
      };
    }
  }
  return {
    promedio: roundPeso(noNegativo(input?.promedio)),
    mesesUsados: 0,
    origen: "promedio",
  };
}

function giroBase(mes, porcentaje, teorico) {
  return {
    mes,
    porcentaje,
    teorico,
    monto: 0,
    desdeCic: 0,
    desdeFcs: 0,
    saldo: 0,
    minimo: null,
    maximo: null,
    ajuste: "",
    consolidado: false,
  };
}

/**
 * Giros CIC hasta agotar saldo o 13 meses. Consolida el último si es ≤ 20 %
 * del anterior (art. 15).
 *
 * @param {number} promedio
 * @param {number} saldoInicial
 */
export function girosCuentaIndividual(promedio, saldoInicial) {
  const giros = [];
  let saldo = roundPeso(saldoInicial);
  let mes = 0;
  while (saldo > 0 && mes < CIC_MAX_GIROS) {
    mes += 1;
    const porcentaje = porcentajeCic(mes);
    const teorico = roundPeso(promedio * porcentaje);
    let monto = Math.min(teorico, saldo);
    if (monto <= 0) break;
    let saldoDespues = saldo - monto;
    let consolidado = false;
    if (saldoDespues > 0 && mes < CIC_MAX_GIROS) {
      const nextPct = porcentajeCic(mes + 1);
      const nextTeorico = roundPeso(promedio * nextPct);
      const nextPago = Math.min(nextTeorico, saldoDespues);
      const agota = saldoDespues - nextPago === 0;
      if (agota && nextPago * 5 <= monto) {
        monto += saldoDespues;
        saldoDespues = 0;
        consolidado = true;
      }
    }
    saldo = saldoDespues;
    const row = giroBase(mes, porcentaje, teorico);
    row.monto = monto;
    row.desdeCic = monto;
    row.saldo = saldo;
    row.consolidado = consolidado;
    if (monto < teorico && !consolidado) row.ajuste = "saldo";
    if (consolidado) row.ajuste = "consolidado";
    giros.push(row);
  }
  return { giros, saldo };
}

/**
 * Cinco giros del art. 25, con mínimo y máximo de la Res. Ex. n°383.
 * El saldo CIC paga primero; el FCS completa el mes.
 *
 * @param {string} contrato
 * @param {number} promedio
 * @param {number} saldoInicial
 */
export function girosFondoSolidario(contrato, promedio, saldoInicial) {
  let saldo = roundPeso(saldoInicial);
  const giros = tablaFcsGiro(contrato).map((fila, i) => {
    const teorico = roundPeso(promedio * fila.porcentaje);
    let ajuste = "";
    let monto = teorico;
    if (teorico < fila.minimo) {
      monto = fila.minimo;
      ajuste = "minimo";
    } else if (teorico > fila.maximo) {
      monto = fila.maximo;
      ajuste = "maximo";
    }
    monto = clamp(monto, fila.minimo, fila.maximo);
    const desdeCic = Math.min(saldo, monto);
    const desdeFcs = monto - desdeCic;
    saldo -= desdeCic;
    const row = giroBase(i + 1, fila.porcentaje, teorico);
    row.monto = monto;
    row.desdeCic = desdeCic;
    row.desdeFcs = desdeFcs;
    row.saldo = saldo;
    row.minimo = fila.minimo;
    row.maximo = fila.maximo;
    row.ajuste = ajuste;
    return row;
  });
  return { giros, saldo };
}

/**
 * @param {{
 *   contrato?: string,
 *   promedio?: number,
 *   remuneraciones?: number[],
 *   saldoCic?: number,
 *   fondoSolidario?: boolean,
 * }} [input]
 */
export function calcularGirosCesantia(input = {}) {
  const contrato = normalizarContratoGiro(input.contrato);
  const ventana = ventanaPromedioGiroCesantia(contrato);
  const prom = resolverPromedioGiro(input, ventana);
  const saldoInicial = roundPeso(noNegativo(input.saldoCic));
  const fondoSolidarioPedido = Boolean(input.fondoSolidario);
  const referencia = girosFondoSolidario(contrato, prom.promedio, 0);
  const cincoFcs = referencia.giros.reduce((acc, g) => acc + g.monto, 0);
  const cicAlcanzaCinco = saldoInicial >= cincoFcs && cincoFcs > 0;
  const fcsActivo = fondoSolidarioPedido && !cicAlcanzaCinco && prom.promedio > 0;

  let motivo = "";
  /** @type {ReturnType<typeof giroBase>[]} */
  let giros = [];
  let saldo = saldoInicial;

  if (prom.promedio <= 0) {
    motivo = "promedio";
  } else if (fcsActivo) {
    const out = girosFondoSolidario(contrato, prom.promedio, saldoInicial);
    giros = out.giros;
    saldo = out.saldo;
    motivo = "fcs";
  } else if (saldoInicial <= 0) {
    motivo = "saldo";
  } else {
    const out = girosCuentaIndividual(prom.promedio, saldoInicial);
    giros = out.giros;
    saldo = out.saldo;
    motivo = fondoSolidarioPedido && cicAlcanzaCinco ? "cic_alcanza_cinco" : "cic";
  }

  const totalCic = giros.reduce((acc, g) => acc + g.desdeCic, 0);
  const totalFcs = giros.reduce((acc, g) => acc + g.desdeFcs, 0);

  return {
    ok: giros.length > 0,
    motivo,
    contrato,
    ventana,
    promedio: prom.promedio,
    mesesUsados: prom.mesesUsados,
    origenPromedio: prom.origen,
    saldoInicial,
    saldoFinal: saldo,
    cortadoPorTope: motivo === "cic" || motivo === "cic_alcanza_cinco" ? saldo > 0 && giros.length >= CIC_MAX_GIROS : false,
    fondoSolidarioPedido,
    fcsActivo,
    cicAlcanzaCinco,
    cincoFcs,
    giros,
    total: totalCic + totalFcs,
    totalCic,
    totalFcs,
    maxGirosCic: CIC_MAX_GIROS,
  };
}
