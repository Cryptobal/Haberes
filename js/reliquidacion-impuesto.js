import { IUSC_TRAMOS } from "./constants.js";
import { calcularIusc, roundPeso } from "./sueldo.js";

/**
 * Reliquidación anual del Impuesto Único de Segunda Categoría cuando hay
 * rentas del art. 42 N° 1 de más de un empleador, habilitado o pagador
 * en forma simultánea (art. 47 LIR, modificado por la Ley N° 20.630).
 *
 * Desde el 1 de enero de 2012 la reliquidación no suma los sueldos de un
 * mes para volver a aplicar la tabla mensual. Se suma la renta imponible
 * del año y se aplica la escala del art. 43 N° 1 en valores anuales
 * (FAQ SII 001.140.2712, actualizada el 18.07.2025).
 *
 * La escala anual usa los mismos factores que `IUSC_TRAMOS`. Tramos y
 * rebajas se multiplican por 12 porque la UTA = UTM × 12 (circulares SII
 * que publican la unidad tributaria anual). No es una tabla distinta.
 * El F22 oficial usa la UTM de diciembre y, además, reajusta las rentas
 * (art. 54 N° 3, inciso penúltimo) y las retenciones (art. 75). Esta
 * función no aplica ese reajuste IPC: es una estimación de la escala.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=6368
 * @see https://www.sii.cl/preguntas_frecuentes/declaracion_renta/001_140_2712.htm
 * @see https://www.sii.cl/pagina/intermedia/reliquidacion/reliquidacion.html
 * @see https://www.sii.cl/normativa_legislacion/circulares/2025/circu67.pdf
 */

export const MESES_ANIO_CALENDARIO = 12;

export function escalaIuscAnual(tramos = IUSC_TRAMOS) {
  return tramos.map((t) => ({
    hasta: t.hasta === Infinity ? Infinity : t.hasta * MESES_ANIO_CALENDARIO,
    tasa: t.tasa,
    rebaja: t.rebaja * MESES_ANIO_CALENDARIO,
  }));
}

export function tramoIuscAnual(baseAnual, tramos = IUSC_TRAMOS) {
  const base = Math.max(0, Number(baseAnual) || 0);
  const escala = escalaIuscAnual(tramos);
  for (const tramo of escala) {
    if (base <= tramo.hasta) return tramo;
  }
  return escala[escala.length - 1];
}

/**
 * IUSC teórico anual: misma fórmula que `calcularIusc`
 * (max(0, round(base × factor − rebaja))) sobre la escala × 12.
 */
export function calcularIuscAnual(baseAnual, tramos = IUSC_TRAMOS) {
  const base = Math.max(0, Number(baseAnual) || 0);
  const tramo = tramoIuscAnual(base, tramos);
  const raw = base * tramo.tasa - tramo.rebaja;
  return {
    base,
    tasa: tramo.tasa,
    rebaja: tramo.rebaja,
    hasta: tramo.hasta,
    iuscSinRedondear: Math.max(0, raw),
    iusc: Math.max(0, roundPeso(raw)),
  };
}

/**
 * Arma totales de un empleador a partir de una renta mensual constante
 * y la retención que ya haría la tabla mensual (`calcularIusc`).
 */
export function totalesDesdeMesConstante(rentaMensual, meses = MESES_ANIO_CALENDARIO) {
  const n = Math.max(0, Math.min(MESES_ANIO_CALENDARIO, Math.floor(Number(meses) || 0)));
  const baseMes = roundPeso(Math.max(0, Number(rentaMensual) || 0));
  const impuestoMes = calcularIusc(baseMes);
  return {
    meses: n,
    rentaMensual: baseMes,
    impuestoMes,
    rentaAnual: baseMes * n,
    retenido: impuestoMes * n,
  };
}

function empleadorLimpio(raw, index) {
  const nombre = String(raw?.nombre || "").trim().slice(0, 80);
  const rentaAnual = roundPeso(Math.max(0, Number(raw?.rentaAnual) || 0));
  const retenido = roundPeso(Math.max(0, Number(raw?.retenido) || 0));
  return {
    nombre: nombre || `Empleador ${index + 1}`,
    rentaAnual,
    retenido,
    activo: rentaAnual > 0 || retenido > 0,
  };
}

/**
 * @param {{ empleadores?: { nombre?: string, rentaAnual?: number, retenido?: number }[] }} input
 */
export function calcularReliquidacionIusc({ empleadores = [] } = {}) {
  const filas = (Array.isArray(empleadores) ? empleadores : []).map(empleadorLimpio);
  const activos = filas.filter((f) => f.activo);
  const rentaConsolidada = filas.reduce((s, f) => s + f.rentaAnual, 0);
  const totalRetenido = filas.reduce((s, f) => s + f.retenido, 0);
  const teorico = calcularIuscAnual(rentaConsolidada);
  const diferencia = teorico.iusc - totalRetenido;
  let sentido = "cuadra";
  if (diferencia > 0) sentido = "pagar";
  else if (diferencia < 0) sentido = "favor";
  const obligatoria = activos.length >= 2;
  return {
    empleadores: filas,
    activos: activos.length,
    obligatoria,
    voluntaria: !obligatoria,
    rentaConsolidada,
    totalRetenido,
    iuscTeorico: teorico.iusc,
    iuscSinRedondear: teorico.iuscSinRedondear,
    tasa: teorico.tasa,
    rebaja: teorico.rebaja,
    hasta: teorico.hasta,
    diferencia,
    diferenciaAbs: Math.abs(diferencia),
    sentido,
    reajusteIpc: false,
  };
}
