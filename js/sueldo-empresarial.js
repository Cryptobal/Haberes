import { calcularCostoEmpresa, calcularIusc, calcularSueldo, roundPeso } from "./sueldo.js";

/**
 * Sueldo empresarial (art. 31 N°6 LIR): remuneración que el dueño, socio
 * o empresario individual se asigna por trabajo efectivo y que la empresa
 * trata como gasto.
 *
 * Oficio SII N°2069 (16-oct-2025): no hay monto mínimo ni exigencia de
 * cotizar para la deducción. El monto debe ser razonable, real, pagado y
 * respaldado. Si cotiza, esas cotizaciones rebajan la base del IUSC.
 * Oficio N°147 (21-ene-2026) aclara el N°2069: no es ingreso no renta del
 * art. 17 N°14.
 *
 * Con cotiza=sí (default) el líquido es el de calcularSueldo y el costo
 * empresa el de calcularCostoEmpresa, con los mismos inputs. Con cotiza=no
 * no hay AFP, salud ni AFC (trabajador ni empleador); el IUSC se estima
 * sobre el bruto. No inventa un tope en UF.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=6368
 */
export function calcularSueldoEmpresarial(input = {}, indicadores = {}) {
  const bruto = roundPeso(Math.max(0, Number(input.bruto ?? input.sueldoBase ?? input.monto) || 0));
  const afp = String(input.afp || "modelo").toLowerCase();
  const salud = String(input.salud || "fonasa").toLowerCase() === "isapre" ? "isapre" : "fonasa";
  const contratoRaw = String(input.contrato || "indefinido").toLowerCase();
  const contrato = contratoRaw === "plazo_fijo" || contratoRaw === "plazo fijo" ? "plazo_fijo" : "indefinido";
  const cotiza = input.cotiza !== false && input.cotizaPrevisional !== false;
  const isaprePct = Math.max(0, Number(input.isaprePct ?? input.isaprePorcentaje) || 0);

  const vacio = {
    bruto: 0,
    afp,
    salud,
    contrato,
    cotiza,
    isaprePct: salud === "isapre" ? isaprePct : 0,
    imponible: 0,
    liquido: 0,
    afpMonto: 0,
    saludMonto: 0,
    cesantiaMonto: 0,
    cotizaciones: 0,
    iusc: 0,
    baseTributable: 0,
    totalDescuentos: 0,
    totalHaberes: 0,
    aportesEmpleador: 0,
    costoEmpresa: 0,
    montoCero: true,
  };

  if (bruto <= 0) return vacio;

  const sonda = calcularSueldo({ sueldoBase: bruto, afp, salud: "fonasa", contrato }, indicadores);
  const isaprePactado =
    salud === "isapre" ? roundPeso(sonda.baseAfpSalud * (isaprePct / 100)) : 0;
  const sueldo = calcularSueldo(
    { sueldoBase: bruto, afp, salud, contrato, isaprePactado },
    indicadores,
  );

  if (cotiza) {
    const costo = calcularCostoEmpresa(
      { modo: "bruto", monto: bruto, afp, salud, contrato, mutualAdicionalPct: 0 },
      indicadores,
    );
    return {
      bruto,
      afp,
      salud,
      contrato,
      cotiza: true,
      isaprePct: salud === "isapre" ? isaprePct : 0,
      isaprePactado,
      imponible: sueldo.imponible,
      liquido: sueldo.liquido,
      afpMonto: sueldo.afp.monto,
      saludMonto: sueldo.salud.monto,
      cesantiaMonto: sueldo.cesantia.monto,
      cotizaciones: roundPeso(sueldo.afp.monto + sueldo.salud.monto + sueldo.cesantia.monto),
      iusc: sueldo.iusc,
      baseTributable: sueldo.baseTributable,
      totalDescuentos: sueldo.totalDescuentos,
      totalHaberes: sueldo.totalHaberes,
      aportesEmpleador: costo.totalAportes,
      costoEmpresa: costo.costoEmpresa,
      montoCero: false,
    };
  }

  const iusc = calcularIusc(sueldo.imponible);
  const liquido = roundPeso(sueldo.totalHaberes - iusc);
  return {
    bruto,
    afp,
    salud,
    contrato,
    cotiza: false,
    isaprePct: salud === "isapre" ? isaprePct : 0,
    isaprePactado: 0,
    imponible: sueldo.imponible,
    liquido,
    afpMonto: 0,
    saludMonto: 0,
    cesantiaMonto: 0,
    cotizaciones: 0,
    iusc,
    baseTributable: sueldo.imponible,
    totalDescuentos: iusc,
    totalHaberes: sueldo.totalHaberes,
    aportesEmpleador: 0,
    costoEmpresa: sueldo.totalHaberes,
    montoCero: false,
  };
}
