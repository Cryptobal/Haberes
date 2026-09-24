import { calcularSueldo, roundPeso } from "./sueldo.js";

/**
 * Viático de comisión (art. 41 Código del Trabajo): suma para solventar
 * alimentación, alojamiento o traslado cuando el trabajador se ausenta del
 * lugar habitual de residencia por causa del trabajo.
 *
 * El Código no publica una tabla en pesos ni en UF para el sector privado.
 * El usuario indica si el monto se trata como no imponible (default) o como
 * remuneración. El contraste de líquido reusa calcularSueldo (AFP Modelo,
 * Fonasa, contrato indefinido), igual que calcularColacionMovilizacion.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/portal/1628/w3-article-60238.html
 */
export function calcularViatico(
  {
    montoDiario = 0,
    dias = 0,
    sueldoBase = 0,
    tratarComoNoImponible = true,
    imponible,
  } = {},
  indicadores = {},
) {
  const diario = roundPeso(Math.max(0, Number(montoDiario) || 0));
  const nDias = Math.max(0, Math.floor(Number(dias) || 0));
  const sueldo = roundPeso(Math.max(0, Number(sueldoBase) || 0));
  const esNoImp = imponible === true ? false : tratarComoNoImponible !== false;
  const total = roundPeso(diario * nDias);
  const parteNoImponible = esNoImp ? total : 0;
  const extraImponiblePedido = esNoImp ? 0 : total;

  const baseInput = {
    sueldoBase: sueldo,
    afp: "modelo",
    salud: "fonasa",
    contrato: "indefinido",
  };
  const sin = calcularSueldo(baseInput, indicadores);
  const con = calcularSueldo(
    {
      ...baseInput,
      otrosNoImponibles: parteNoImponible,
      otrosImponibles: extraImponiblePedido,
    },
    indicadores,
  );

  return {
    montoDiario: diario,
    dias: nDias,
    sueldoBase: sueldo,
    tratarComoNoImponible: esNoImp,
    total,
    noImponible: parteNoImponible,
    extraImponible: con.imponible - sin.imponible,
    extraLiquido: con.liquido - sin.liquido,
    extraDescuentos: con.totalDescuentos - sin.totalDescuentos,
    imponibleSin: sin.imponible,
    imponibleCon: con.imponible,
    liquidoSin: sin.liquido,
    liquidoCon: con.liquido,
  };
}
