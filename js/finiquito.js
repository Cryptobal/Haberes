import { FALLBACK_UF, IAS_TOPE_ANIOS, TOPE_AFP_SALUD_UF } from "./constants.js";
import { roundPeso } from "./sueldo.js";

function toDate(value) {
  if (value instanceof Date) return value;
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida");
  return d;
}

/**
 * Años de servicio: fracción estrictamente mayor a 6 meses suma 1 año.
 * Tope 11 años para IAS art. 161.
 */
export function aniosServicio(ingreso, termino, { tope = IAS_TOPE_ANIOS } = {}) {
  const start = toDate(ingreso);
  const end = toDate(termino);
  if (end < start) return 0;

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (months > 6 || (months === 6 && days > 0)) years += 1;
  years = Math.max(0, years);
  if (tope != null) years = Math.min(years, tope);
  return years;
}

export function feriadoProporcional(dias, remuneracion) {
  const d = Number(dias) || 0;
  const rem = Number(remuneracion) || 0;
  if (d <= 0 || rem <= 0) return 0;
  return roundPeso((d * rem) / 30);
}

/**
 * @param {object} input
 * @param {{ uf?: number }} indicadores
 */
export function calcularFiniquito(input = {}, indicadores = {}) {
  const articulo = String(input.articulo || "161");
  const remuneracion = Number(input.remuneracion) || 0;
  const diasFeriado = Number(input.diasFeriado) || 0;
  const avisoPrevio = Boolean(input.avisoPrevio);
  const uf = Number(indicadores.uf) || FALLBACK_UF;
  const topeMensual = TOPE_AFP_SALUD_UF * uf;
  const baseIas = Math.min(remuneracion, topeMensual);

  const conIas = articulo === "161";
  const anios = conIas && input.ingreso && input.termino
    ? aniosServicio(input.ingreso, input.termino)
    : conIas
      ? Math.min(Number(input.anios) || 0, IAS_TOPE_ANIOS)
      : 0;

  const ias = conIas ? roundPeso(anios * baseIas) : 0;
  const aviso = conIas && !avisoPrevio ? roundPeso(baseIas) : 0;
  const feriado = feriadoProporcional(diasFeriado, remuneracion);
  const otros = roundPeso(input.otros || 0);
  const total = ias + aviso + feriado + otros;

  return {
    articulo,
    anios,
    remuneracion: roundPeso(remuneracion),
    topeMensual,
    baseIas: roundPeso(baseIas),
    ias,
    aviso,
    avisoPrevio,
    feriado,
    diasFeriado,
    otros,
    total,
    uf,
    aplicaIas: conIas,
  };
}
