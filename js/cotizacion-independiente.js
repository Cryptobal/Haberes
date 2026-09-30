import {
  AFP_COMISION,
  AFP_OBLIGATORIO,
  COBERTURA_PARCIAL_HONORARIOS,
  COBERTURA_PARCIAL_HONORARIOS_CIERRE_AT,
  FALLBACK_UF,
  IMM,
  MUTUAL_TASA_BASICA,
  RENTA_IMPONIBLE_HONORARIOS,
  RETENCION_BOLETA_ANIO_DEFAULT,
  RETENCION_BOLETA_HONORARIOS,
  SALUD_TASA,
  SANNA_TASA,
  SIS_INDEPENDIENTE_RETENCION_AT2026,
  TOPE_AFP_SALUD_UF,
  UF_MAX,
  UF_MIN,
  UMBRAL_OBLIGACION_HONORARIOS_IMM,
} from "./constants.js";
import { roundPeso } from "./sueldo.js";

/**
 * Cotizaciones previsionales del trabajador independiente que emite boletas
 * de honorarios (Ley 21.133), a partir de los honorarios brutos del año.
 *
 * Año de la calculadora = año calendario de emisión de las boletas (el mismo
 * de RETENCION_BOLETA_HONORARIOS). Esas rentas se declaran en la Operación
 * Renta del año siguiente (año tributario = año de las rentas + 1).
 *
 * Renta imponible = 80 % de los brutos, con tope anual 90 UF × 12 × UF.
 * Cobertura total: pensiones y salud sobre el 100 % de esa renta.
 * Cobertura parcial: pensiones y salud sobre el % del año tributario
 * (COBERTURA_PARCIAL_HONORARIOS). SIS, ATEP y SANNA siempre sobre el 100 %.
 * No hay seguro de cesantía.
 *
 * La retención anual es educativa (mismo % SII). Operación Renta manda.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1128420
 * @see https://www.chileatiende.gob.cl/fichas/12016-cotizacion-de-trabajadores-que-emiten-boletas-de-honorarios
 * @see https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9913.html
 * @see https://www.sii.cl/preguntas_frecuentes/declaracion_renta/001_140_7297.htm
 */

export function anioTributarioHonorarios(anioRentas) {
  const n = Math.trunc(Number(anioRentas));
  return Number.isFinite(n) ? n + 1 : RETENCION_BOLETA_ANIO_DEFAULT + 1;
}

/** Porcentaje de cobertura parcial (0–1) para un año de rentas, o null si no aplica. */
export function porcentajeParcialHonorarios(anioRentas) {
  const at = anioTributarioHonorarios(anioRentas);
  if (Object.prototype.hasOwnProperty.call(COBERTURA_PARCIAL_HONORARIOS, at)) {
    return COBERTURA_PARCIAL_HONORARIOS[at];
  }
  if (at > COBERTURA_PARCIAL_HONORARIOS_CIERRE_AT) return 1;
  return null;
}

function ufUsada(uf) {
  const n = Number(uf);
  if (Number.isFinite(n) && n >= UF_MIN && n <= UF_MAX) return { uf: n, ufOk: true };
  return { uf: FALLBACK_UF, ufOk: false };
}

function comisionPuntos({ afp, comisionPct }) {
  if (comisionPct != null && comisionPct !== "") {
    const n = Number(comisionPct);
    if (Number.isFinite(n) && n >= 0) return { puntos: n, afp: afp || null, comisionOk: true };
  }
  const key = String(afp || "uno").toLowerCase();
  if (Object.prototype.hasOwnProperty.call(AFP_COMISION, key)) {
    return { puntos: AFP_COMISION[key], afp: key, comisionOk: true };
  }
  return { puntos: AFP_COMISION.uno, afp: "uno", comisionOk: false };
}

function mensualDe(anual) {
  return roundPeso(anual / 12);
}

export function calcularCotizacionIndependiente({
  honorariosBrutos = 0,
  anio = RETENCION_BOLETA_ANIO_DEFAULT,
  cobertura = "total",
  afp = "uno",
  comisionPct = null,
  uf = FALLBACK_UF,
  tasaAtepAdicional = 0,
} = {}) {
  const anioNum = Math.trunc(Number(anio));
  const anioOk = Object.prototype.hasOwnProperty.call(RETENCION_BOLETA_HONORARIOS, anioNum);
  const anioUsado = anioOk ? anioNum : RETENCION_BOLETA_ANIO_DEFAULT;
  const tasaRetencion = RETENCION_BOLETA_HONORARIOS[anioUsado];
  const anioTributario = anioTributarioHonorarios(anioUsado);
  const parcialTabla = porcentajeParcialHonorarios(anioUsado);
  const coberturaNorm = String(cobertura || "total").toLowerCase() === "parcial" ? "parcial" : "total";
  const factorPensionesSalud = coberturaNorm === "parcial" ? parcialTabla ?? 1 : 1;

  const brutos = roundPeso(Math.max(0, Number(honorariosBrutos) || 0));
  const { uf: ufCalc, ufOk } = ufUsada(uf);
  const topeAnual = TOPE_AFP_SALUD_UF * 12 * ufCalc;
  const imponibleSinTope = brutos * RENTA_IMPONIBLE_HONORARIOS;
  const imponibleExact = Math.min(imponibleSinTope, topeAnual);
  const topeAplicado = imponibleSinTope > topeAnual + 0.5;

  const basePensionesExact = imponibleExact * factorPensionesSalud;
  const baseSegurosExact = imponibleExact;

  const com = comisionPuntos({ afp, comisionPct });
  const tasaComision = com.puntos / 100;
  const adicional = Math.max(0, Number(tasaAtepAdicional) || 0);
  const tasaAtep = MUTUAL_TASA_BASICA + adicional;

  const afpObligatorio = roundPeso(basePensionesExact * AFP_OBLIGATORIO);
  const comision = roundPeso(basePensionesExact * tasaComision);
  const salud = roundPeso(basePensionesExact * SALUD_TASA);
  const sis = roundPeso(baseSegurosExact * SIS_INDEPENDIENTE_RETENCION_AT2026);
  const atep = roundPeso(baseSegurosExact * tasaAtep);
  const sanna = roundPeso(baseSegurosExact * SANNA_TASA);
  const cesantia = 0;
  const total = afpObligatorio + comision + salud + sis + atep + sanna;
  const retencion = roundPeso(brutos * tasaRetencion);
  const saldoEducativo = retencion - total;
  const umbralBrutos = UMBRAL_OBLIGACION_HONORARIOS_IMM * IMM;
  const obligado = brutos >= umbralBrutos;

  const anual = {
    afp: afpObligatorio,
    comision,
    salud,
    sis,
    atep,
    sanna,
    cesantia,
    total,
    retencion,
    saldoEducativo,
  };

  return {
    ok: anioOk && (coberturaNorm === "total" || parcialTabla != null) && com.comisionOk && ufOk,
    anio: anioUsado,
    anioSolicitado: Number.isFinite(anioNum) ? anioNum : anio,
    anioOk,
    anioTributario,
    cobertura: coberturaNorm,
    factorPensionesSalud,
    parcialPct: parcialTabla,
    brutos,
    uf: ufCalc,
    ufOk,
    imponibleExact,
    rentaImponible: roundPeso(imponibleExact),
    topeAnual,
    topeAnualPesos: roundPeso(topeAnual),
    topeAplicado,
    basePensionesSalud: roundPeso(basePensionesExact),
    baseSeguros: roundPeso(baseSegurosExact),
    afpKey: com.afp,
    comisionPuntos: com.puntos,
    tasaAfp: AFP_OBLIGATORIO,
    tasaComision,
    tasaSalud: SALUD_TASA,
    tasaSis: SIS_INDEPENDIENTE_RETENCION_AT2026,
    sisCamino: "retencion-at-2026",
    tasaAtepBasica: MUTUAL_TASA_BASICA,
    tasaAtepAdicional: adicional,
    tasaAtep,
    tasaSanna: SANNA_TASA,
    tasaRetencion,
    umbralBrutos,
    obligado,
    cesantia,
    ...anual,
    mensual: {
      afp: mensualDe(afpObligatorio),
      comision: mensualDe(comision),
      salud: mensualDe(salud),
      sis: mensualDe(sis),
      atep: mensualDe(atep),
      sanna: mensualDe(sanna),
      total: mensualDe(total),
      retencion: mensualDe(retencion),
      saldoEducativo: mensualDe(saldoEducativo),
      rentaImponible: mensualDe(roundPeso(imponibleExact)),
    },
    coberturaDesde: `${anioTributario}-07-01`,
    coberturaHasta: `${anioTributario + 1}-06-30`,
  };
}
