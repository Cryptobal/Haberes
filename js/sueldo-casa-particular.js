import {
  AFP_NOMBRES,
  AFP_OBLIGATORIO,
  CASA_PARTICULAR_AFC_CIC,
  CASA_PARTICULAR_AFC_FCS,
  CASA_PARTICULAR_AFC_TASA,
  CASA_PARTICULAR_ITE_TASA,
  IAS_TOPE_ANIOS,
  LEY_21735_CRP,
  LEY_21735_CUENTA_INDIVIDUAL,
  LEY_21735_SSP,
  LEY_21735_TASA,
  MUTUAL_TASA_BASICA,
  SANNA_TASA,
} from "./constants.js";
import { calcularIusc, calcularSueldo, roundPeso, tasaAfp } from "./sueldo.js";

/** 11 años × 12 meses (art. 163, mismo tope que la IAS general). */
export const CASA_PARTICULAR_ITE_MESES = IAS_TOPE_ANIOS * 12;

function modalidadDe(input) {
  const m = String(input.modalidad || input.puertas || "afuera")
    .toLowerCase()
    .trim();
  if (m === "adentro" || m === "dentro" || m.includes("adentro")) return "adentro";
  return "afuera";
}

function comisionOverride(input) {
  if (input.comisionAfpPct == null || input.comisionAfpPct === "") return null;
  const n = Number(input.comisionAfpPct);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Meses que faltan de la obligación de cotizar 1,11 % (máximo 11 años).
 * `mesesRestantesIte: 0` apaga el aporte de este mes.
 * Si no viene, `mesesCotizados` (default 0) se resta del tope de 132 meses.
 */
export function mesesIteCasaParticular(input = {}) {
  const tope = CASA_PARTICULAR_ITE_MESES;
  if (input.mesesRestantesIte != null && input.mesesRestantesIte !== "") {
    const mesesRestantes = Math.max(0, Math.floor(Number(input.mesesRestantesIte) || 0));
    return {
      tope,
      mesesRestantes,
      mesesCotizados: null,
      aplica: mesesRestantes > 0,
    };
  }
  const cotizadosRaw = input.mesesCotizados ?? input.mesesAportados ?? 0;
  const mesesCotizados = Math.max(0, Math.floor(Number(cotizadosRaw) || 0));
  const mesesRestantes = Math.max(0, tope - mesesCotizados);
  return {
    tope,
    mesesRestantes,
    mesesCotizados,
    aplica: mesesRestantes > 0,
  };
}

/**
 * Estimación mensual de casa particular (Código del Trabajo arts. 146 y ss., Ley 21.269).
 *
 * Líquido: el mismo motor de `calcularSueldo` (AFP 10 % + comisión, salud 7 % o
 * plan Isapre, IUSC, colación y movilización del art. 41). El trabajador no
 * cotiza el 0,6 % de cesantía del contrato indefinido común.
 *
 * Costo del empleador: remuneración pagada más las mismas piezas de
 * `calcularCostoEmpresa` (Ley 21.735 3,5 % con SIS incluido, mutual básica y
 * SANNA) sobre el tope de 90 UF, más el 1,11 % a todo evento (AFP, tope 90 UF,
 * máximo 11 años) y el seguro de cesantía 3 % (2,2 % CIC + 0,8 % FCS, tope
 * 135,2 UF). No usa la tasa de cesantía del empleador de un contrato indefinido
 * común (2,4 %).
 *
 * Puertas adentro o afuera no cambia estos montos: solo la nota de jornada.
 *
 * @see https://www.dt.gob.cl/portal/1626/w3-article-98984.html
 * @see https://www.bcn.cl/leychile/navegar?idLey=21269
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 */
export function calcularSueldoCasaParticular(input = {}, indicadores = {}) {
  const remuneracion = roundPeso(Math.max(0, Number(input.remuneracion ?? input.sueldoBase ?? input.monto) || 0));
  const colacion = roundPeso(Math.max(0, Number(input.colacion) || 0));
  const movilizacion = roundPeso(Math.max(0, Number(input.movilizacion) || 0));
  const afpKey = String(input.afp || "modelo").toLowerCase();
  const saludTipo = String(input.salud || "fonasa").toLowerCase() === "isapre" ? "isapre" : "fonasa";
  const isaprePactado = roundPeso(Math.max(0, Number(input.isaprePactado) || 0));
  const mutualAdicionalPct = Math.max(0, Number(input.mutualAdicionalPct) || 0);
  const modalidad = modalidadDe(input);
  const iteWin = mesesIteCasaParticular(input);

  const calc = calcularSueldo(
    {
      sueldoBase: remuneracion,
      afp: afpKey,
      salud: saludTipo,
      isaprePactado,
      contrato: "indefinido",
      cotizaCesantia: false,
      colacion,
      movilizacion,
    },
    indicadores,
  );

  const comisionPct = comisionOverride(input);
  const tasa = comisionPct == null ? tasaAfp(afpKey) : AFP_OBLIGATORIO + comisionPct / 100;
  const afpMonto = roundPeso(calc.baseAfpSalud * tasa);
  const saludMonto = calc.salud.monto;
  const baseTributable = Math.max(0, calc.imponible - afpMonto - saludMonto);
  const iusc = calcularIusc(baseTributable);
  const totalDescuentos = afpMonto + saludMonto + iusc;
  const liquido = calc.totalHaberes - totalDescuentos;

  const baseAfp = calc.baseAfpSalud;
  const baseCes = calc.baseCesantia;
  const tasaMutual = Math.round((MUTUAL_TASA_BASICA + mutualAdicionalPct / 100) * 1e6) / 1e6;

  const leyCuenta = roundPeso(baseAfp * LEY_21735_CUENTA_INDIVIDUAL);
  const leyCrp = roundPeso(baseAfp * LEY_21735_CRP);
  const leySsp = roundPeso(baseAfp * LEY_21735_SSP);
  const leyMonto = leyCuenta + leyCrp + leySsp;
  const mutualMonto = roundPeso(baseAfp * tasaMutual);
  const sannaMonto = roundPeso(baseAfp * SANNA_TASA);
  const iteMonto = iteWin.aplica ? roundPeso(baseAfp * CASA_PARTICULAR_ITE_TASA) : 0;
  const afcMonto = roundPeso(baseCes * CASA_PARTICULAR_AFC_TASA);
  const afcCic = roundPeso(baseCes * CASA_PARTICULAR_AFC_CIC);
  const afcFcs = afcMonto - afcCic;
  const totalAportes = leyMonto + mutualMonto + sannaMonto + iteMonto + afcMonto;
  const costoEmpleador = roundPeso(calc.totalHaberes + totalAportes);

  return {
    modalidad,
    remuneracion,
    imponible: calc.imponible,
    noImponible: calc.noImponible,
    colacion: calc.haberes.find((h) => h.key === "colacion")?.monto || 0,
    movilizacion: calc.haberes.find((h) => h.key === "movilizacion")?.monto || 0,
    totalHaberes: calc.totalHaberes,
    uf: calc.uf,
    topeAfpSalud: calc.topeAfpSalud,
    topeCesantia: calc.topeCesantia,
    baseAfpSalud: calc.baseAfpSalud,
    baseCesantia: calc.baseCesantia,
    afp: {
      key: afpKey,
      nombre: AFP_NOMBRES[afpKey] || afpKey,
      tasa,
      comisionPct: comisionPct == null ? null : comisionPct,
      monto: afpMonto,
    },
    salud: { tipo: saludTipo, monto: saludMonto, legal: calc.salud.legal },
    cesantiaTrabajador: { tasa: 0, monto: 0 },
    baseTributable,
    iusc,
    totalDescuentos,
    liquido,
    mutualAdicionalPct,
    ley21735: {
      tasa: LEY_21735_TASA,
      monto: leyMonto,
      cuentaIndividual: { tasa: LEY_21735_CUENTA_INDIVIDUAL, monto: leyCuenta },
      crp: { tasa: LEY_21735_CRP, monto: leyCrp },
      ssp: { tasa: LEY_21735_SSP, monto: leySsp },
    },
    mutual: { tasa: tasaMutual, tasaBasica: MUTUAL_TASA_BASICA, monto: mutualMonto },
    sanna: { tasa: SANNA_TASA, monto: sannaMonto },
    ite: {
      tasa: CASA_PARTICULAR_ITE_TASA,
      monto: iteMonto,
      aplica: iteWin.aplica,
      mesesRestantes: iteWin.mesesRestantes,
      mesesCotizados: iteWin.mesesCotizados,
      mesesTope: iteWin.tope,
    },
    afc: {
      tasa: CASA_PARTICULAR_AFC_TASA,
      monto: afcMonto,
      cic: { tasa: CASA_PARTICULAR_AFC_CIC, monto: afcCic },
      fcs: { tasa: CASA_PARTICULAR_AFC_FCS, monto: afcFcs },
    },
    totalAportes,
    costoEmpleador,
  };
}
