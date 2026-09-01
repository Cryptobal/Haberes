import {
  CASA_PARTICULAR_FERIADO_ANUAL,
  CASA_PARTICULAR_ITE_DESDE,
  CASA_PARTICULAR_ITE_DESDE_1991,
  CASA_PARTICULAR_ITE_TASA,
  CASA_PARTICULAR_ITE_TASA_PREVIA,
  CASA_PARTICULAR_PRUEBA_DIAS,
  FALLBACK_UF,
  IAS_TOPE_ANIOS,
  TOPE_AFP_SALUD_UF,
} from "./constants.js";
import { causalPorId } from "./causales.js";
import { gratificacionArt50, roundPeso, valorHoraExtra } from "./sueldo.js";

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

export function vigenciaUnAnioOMas(ingreso, termino) {
  if (!ingreso || !termino) return false;
  const start = toDate(ingreso);
  const end = toDate(termino);
  if (end < start) return false;
  const oneYear = new Date(start);
  oneYear.setFullYear(oneYear.getFullYear() + 1);
  return end >= oneYear;
}

function clampDiasMes(n) {
  const d = Number(n);
  if (!Number.isFinite(d) || d <= 0) return 0;
  return Math.min(30, Math.round(d));
}

function namedHaberes(input) {
  const rows = Array.isArray(input.haberesExtra) ? input.haberesExtra : [];
  if (rows.length) {
    return rows
      .map((h) => ({
        nombre: String(h.nombre || h.label || "Haber").trim() || "Haber",
        monto: roundPeso(h.monto),
        imponible: h.imponible !== false,
      }))
      .filter((h) => h.monto !== 0);
  }
  const bonos = roundPeso(input.bonos || 0);
  if (bonos) return [{ nombre: "Bonos", monto: bonos, imponible: true }];
  return [];
}

/**
 * Calculadora pública (delgada): art. 159/160/161 sin letras.
 * @param {object} input
 * @param {{ uf?: number }} indicadores
 */
export function calcularFiniquito(input = {}, indicadores = {}) {
  const articulo = String(input.articulo || articuloDesdeCausal(input.causal) || "161");
  const remuneracion = Number(input.remuneracion) || 0;
  const diasFeriadoPendiente = Number(input.diasFeriadoPendiente) || 0;
  const diasFeriadoProporcional =
    Number(input.diasFeriadoProporcional ?? input.diasFeriado) || 0;
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
  const feriadoPendiente = feriadoProporcional(diasFeriadoPendiente, remuneracion);
  const feriadoProp = feriadoProporcional(diasFeriadoProporcional, remuneracion);
  const feriado = feriadoPendiente + feriadoProp;
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
    feriadoPendiente,
    feriadoProporcional: feriadoProp,
    feriado,
    diasFeriadoPendiente,
    diasFeriadoProporcional,
    diasFeriado: diasFeriadoProporcional,
    otros,
    total,
    uf,
    aplicaIas: conIas,
  };
}

/**
 * IAS del artículo 163 y, aparte, la sustitutiva del aviso (art. 162).
 * Reusa calcularFiniquito: tope 11 años, tope 90 UF, fracción > 6 meses.
 * La IAS exige un año o más de vigencia; el aviso no.
 */
export function calcularIas(input = {}, indicadores = {}) {
  const ingreso = input.ingreso || "";
  const termino = input.termino || "";
  const fin = calcularFiniquito(
    {
      articulo: "161",
      ingreso,
      termino,
      remuneracion: input.remuneracion,
      avisoPrevio: Boolean(input.avisoPrevio),
      diasFeriadoPendiente: 0,
      diasFeriadoProporcional: 0,
      otros: 0,
    },
    indicadores,
  );
  let vigenciaUnAnio = false;
  if (ingreso && termino) {
    try {
      vigenciaUnAnio = vigenciaUnAnioOMas(ingreso, termino);
    } catch {
      vigenciaUnAnio = false;
    }
  }
  let aniosSinTope = 0;
  if (vigenciaUnAnio) {
    try {
      aniosSinTope = aniosServicio(ingreso, termino, { tope: null });
    } catch {
      aniosSinTope = 0;
    }
  }
  const anios = vigenciaUnAnio ? fin.anios : 0;
  const ias = vigenciaUnAnio ? fin.ias : 0;
  const aviso = fin.aviso;
  return {
    articulo: "161",
    anios,
    aniosSinTope,
    remuneracion: fin.remuneracion,
    topeMensual: fin.topeMensual,
    baseIas: fin.baseIas,
    ias,
    aviso,
    avisoPrevio: fin.avisoPrevio,
    vigenciaUnAnio,
    aplicaIas: vigenciaUnAnio,
    recortoTopeUf: fin.remuneracion > fin.topeMensual,
    recortoTopeAnios: aniosSinTope > IAS_TOPE_ANIOS,
    totalIasAviso: ias + aviso,
    uf: fin.uf,
  };
}

function articuloDesdeCausal(causalId) {
  return causalPorId(causalId)?.articulo || "";
}

/**
 * Finiquito completo para /empresa: letras del Código y partidas que
 * la calculadora pública no incluye.
 */
export function calcularFiniquitoCompleto(input = {}, indicadores = {}) {
  const causal = causalPorId(input.causal || input.articulo);
  if (!causal) {
    throw new Error("Indique una causal del Código del Trabajo");
  }

  const sueldoBase = Number(input.remuneracion ?? input.sueldoBase) || 0;
  const jornada = Number(input.jornada) || 42;
  const horasExtrasHoras = Number(input.horasExtras) || 0;
  const montoHorasExtras = roundPeso(
    input.montoHorasExtras != null && input.montoHorasExtras !== ""
      ? Number(input.montoHorasExtras)
      : valorHoraExtra(sueldoBase, jornada) * horasExtrasHoras,
  );
  const extras = namedHaberes(input);
  const extraImp = extras.filter((h) => h.imponible).reduce((s, h) => s + h.monto, 0);
  const extraNoImp = extras.filter((h) => !h.imponible).reduce((s, h) => s + h.monto, 0);
  const usaGrat = Boolean(input.gratificacionArt50);
  const diasMes = clampDiasMes(input.diasMes);
  const diasFeriadoPendiente = Number(input.diasFeriadoPendiente) || 0;
  const diasFeriadoProporcional =
    Number(input.diasFeriadoProporcional ?? input.diasFeriado) || 0;
  const colacion = Number(input.colacion) || 0;
  const movilizacion = Number(input.movilizacion) || 0;
  const avisoPrevio = Boolean(input.avisoPrevio);
  const uf = Number(indicadores.uf) || FALLBACK_UF;
  const topeMensual = TOPE_AFP_SALUD_UF * uf;

  const gratMensual = usaGrat
    ? roundPeso(gratificacionArt50(sueldoBase, montoHorasExtras, extraImp))
    : 0;
  const remuneracionMensual = roundPeso(
    sueldoBase + montoHorasExtras + extraImp + gratMensual,
  );
  const baseIas = Math.min(remuneracionMensual, topeMensual);

  const remuneracionMes = diasMes > 0 ? roundPeso((sueldoBase * diasMes) / 30) : 0;
  const gratificacionMes = usaGrat && diasMes > 0
    ? roundPeso((gratMensual * diasMes) / 30)
    : 0;
  const colacionMes = diasMes > 0 ? roundPeso((colacion * diasMes) / 30) : 0;
  const movilizacionMes = diasMes > 0 ? roundPeso((movilizacion * diasMes) / 30) : 0;

  const vigenteUnAnio = vigenciaUnAnioOMas(input.ingreso, input.termino);
  const aplicaIas = Boolean(causal.aplicaIas) && vigenteUnAnio;
  const anios = aplicaIas && input.ingreso && input.termino
    ? aniosServicio(input.ingreso, input.termino)
    : 0;
  const ias = aplicaIas ? roundPeso(anios * baseIas) : 0;
  const aplicaAviso = Boolean(causal.aplicaAviso) && !avisoPrevio;
  const aviso = aplicaAviso ? roundPeso(baseIas) : 0;

  const feriadoPendiente = feriadoProporcional(diasFeriadoPendiente, remuneracionMensual);
  const feriadoProp = feriadoProporcional(diasFeriadoProporcional, remuneracionMensual);
  const otros = roundPeso(input.otros || 0);

  const extraLines = extras.map((h, i) => ({
    key: `extra-${i}`,
    label: h.nombre,
    monto: h.monto,
    imponible: h.imponible,
  }));

  const partidas = [
    {
      key: "remuneracionMes",
      label: `Remuneración del mes (proporcional a ${diasMes} día${diasMes === 1 ? "" : "s"})`,
      monto: remuneracionMes,
    },
    {
      key: "horasExtras",
      label: "Horas extras",
      monto: montoHorasExtras,
    },
    ...extraLines,
    {
      key: "gratificacion",
      label: "Gratificación proporcional (art. 50)",
      monto: gratificacionMes,
    },
    {
      key: "colacion",
      label: "Colación (art. 41)",
      monto: colacionMes,
    },
    {
      key: "movilizacion",
      label: "Movilización (art. 41)",
      monto: movilizacionMes,
    },
    {
      key: "feriadoPendiente",
      label: `Feriado pendiente (${diasFeriadoPendiente} días vencidos no tomados)`,
      monto: feriadoPendiente,
    },
    {
      key: "feriadoProporcional",
      label: `Feriado proporcional (${diasFeriadoProporcional} días)`,
      monto: feriadoProp,
    },
    {
      key: "ias",
      label: `Indemnización por años de servicio (${anios} años, tope 11)`,
      monto: ias,
    },
    {
      key: "aviso",
      label: "Indemnización sustitutiva de aviso previo",
      monto: aviso,
    },
    {
      key: "otros",
      label: "Otros haberes",
      monto: otros,
    },
  ];

  const total = partidas.reduce((s, p) => s + (Number(p.monto) || 0), 0);

  return {
    causal,
    articulo: causal.articulo,
    causalId: causal.id,
    causalLabel: causal.label,
    textoLegal: causal.textoLegal,
    anios,
    vigenciaUnAnio: vigenteUnAnio,
    aplicaIas,
    aplicaAviso: Boolean(causal.aplicaAviso),
    remuneracion: roundPeso(sueldoBase),
    remuneracionMensual,
    remuneracionMes,
    gratificacionMes,
    gratMensual,
    montoHorasExtras,
    extraImp,
    extraNoImp,
    colacionMes,
    movilizacionMes,
    topeMensual,
    baseIas: roundPeso(baseIas),
    ias,
    aviso,
    avisoPrevio,
    feriadoPendiente,
    feriadoProporcional: feriadoProp,
    feriado: feriadoPendiente + feriadoProp,
    diasMes,
    diasFeriadoPendiente,
    diasFeriadoProporcional,
    diasFeriado: diasFeriadoProporcional,
    otros,
    partidas,
    total,
    uf,
  };
}

export const CASA_PARTICULAR_CAUSALES = {
  desahucio: {
    id: "desahucio",
    label: "Desahucio del empleador (art. 161)",
    aplicaAviso: true,
  },
  mutuo: {
    id: "mutuo",
    label: "Mutuo acuerdo (art. 159 a)",
    aplicaAviso: false,
  },
  renuncia: {
    id: "renuncia",
    label: "Renuncia voluntaria (art. 159 b)",
    aplicaAviso: false,
  },
  plazo: {
    id: "plazo",
    label: "Vencimiento del plazo (art. 159 d)",
    aplicaAviso: false,
  },
  art160: {
    id: "art160",
    label: "Causal del artículo 160",
    aplicaAviso: false,
  },
  prueba: {
    id: "prueba",
    label: "Período de prueba (primeras dos semanas)",
    aplicaAviso: false,
  },
};

function isoFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function minDateIso(a, b) {
  return toDate(a) <= toDate(b) ? a : b;
}

function maxDateIso(a, b) {
  return toDate(a) >= toDate(b) ? a : b;
}

function addYearsIso(iso, years) {
  const d = toDate(iso);
  d.setFullYear(d.getFullYear() + years);
  return isoFromDate(d);
}

/** Meses completos de fecha a fecha. El mes incompleto no suma. */
export function mesesCompletos(ingreso, termino) {
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
  return Math.max(0, years * 12 + months);
}

export function diasCalendario(ingreso, termino) {
  const start = toDate(ingreso);
  const end = toDate(termino);
  if (end < start) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export function esPeriodoPruebaCasaParticular(ingreso, termino) {
  if (!ingreso || !termino) return false;
  try {
    return diasCalendario(ingreso, termino) < CASA_PARTICULAR_PRUEBA_DIAS;
  } catch {
    return false;
  }
}

/**
 * 1,25 días por mes completo del año de feriado en curso (15 / 12).
 * Convención de Haberes; el feriado legal son 15 días hábiles (art. 67).
 */
export function diasFeriadoProporcionalSugeridos(ingreso, termino) {
  if (!ingreso || !termino) return 0;
  const start = toDate(ingreso);
  const end = toDate(termino);
  if (end < start) return 0;
  const aniv = new Date(start);
  aniv.setFullYear(end.getFullYear());
  if (aniv > end) aniv.setFullYear(aniv.getFullYear() - 1);
  const desde = aniv < start ? start : aniv;
  const months = Math.min(12, mesesCompletos(isoFromDate(desde), termino));
  return Math.round(months * (CASA_PARTICULAR_FERIADO_ANUAL / 12) * 100) / 100;
}

/**
 * Finiquito de casa particular (arts. 146 y 163 incisos finales, 161).
 * No aplica la IAS de 30 días/año del inciso segundo: la DT lo dice expresamente.
 * El fondo AFP (1,11 % desde oct. 2020; 4,11 % antes) se estima; lo paga la AFP
 * con el finiquito ratificado, no el empleador en esta liquidación.
 */
export function calcularFiniquitoCasaParticular(input = {}, indicadores = {}) {
  const causalId = CASA_PARTICULAR_CAUSALES[input.causal]?.id || "desahucio";
  const causal = CASA_PARTICULAR_CAUSALES[causalId];
  const remuneracion = Number(input.remuneracion) || 0;
  const uf = Number(indicadores.uf) || FALLBACK_UF;
  const topeMensual = TOPE_AFP_SALUD_UF * uf;
  const baseIndemnizacion = Math.min(remuneracion, topeMensual);
  const recortoTopeUf = remuneracion > topeMensual;

  const ingreso = input.ingreso || "";
  const termino = input.termino || "";
  let prueba = causalId === "prueba";
  if (ingreso && termino) {
    try {
      if (esPeriodoPruebaCasaParticular(ingreso, termino)) prueba = true;
    } catch {
      /* fechas inválidas: se ignora el auto-detect */
    }
  }

  const diasMes =
    input.diasMes != null && input.diasMes !== ""
      ? clampDiasMes(input.diasMes)
      : termino
        ? clampDiasMes(toDate(termino).getDate())
        : 0;
  const remuneracionMes = diasMes > 0 ? roundPeso((remuneracion * diasMes) / 30) : 0;

  const diasFeriadoPendiente = Number(input.diasFeriadoPendiente) || 0;
  let diasFeriadoProporcional = Number(input.diasFeriadoProporcional);
  if (!Number.isFinite(diasFeriadoProporcional)) {
    try {
      diasFeriadoProporcional = ingreso && termino ? diasFeriadoProporcionalSugeridos(ingreso, termino) : 0;
    } catch {
      diasFeriadoProporcional = 0;
    }
  }
  const feriadoPendiente = feriadoProporcional(diasFeriadoPendiente, remuneracion);
  const feriadoProp = feriadoProporcional(diasFeriadoProporcional, remuneracion);

  const aplicaAviso = Boolean(causal.aplicaAviso) && !prueba && !input.avisoPrevio;
  const aviso = aplicaAviso ? roundPeso(baseIndemnizacion) : 0;

  let mesesIte = 0;
  let mesesItePrevia = 0;
  let mesesIteActual = 0;
  let recortoTopeAnios = false;
  if (ingreso && termino) {
    try {
      const origin = maxDateIso(ingreso, CASA_PARTICULAR_ITE_DESDE_1991);
      const cap = addYearsIso(origin, IAS_TOPE_ANIOS);
      recortoTopeAnios = toDate(termino) > toDate(cap);
      const end = minDateIso(termino, cap);
      if (toDate(end) > toDate(origin)) {
        mesesIte = mesesCompletos(origin, end);
        const corte = CASA_PARTICULAR_ITE_DESDE;
        if (toDate(end) <= toDate(corte) || toDate(origin) >= toDate(corte)) {
          if (toDate(origin) >= toDate(corte)) mesesIteActual = mesesIte;
          else mesesItePrevia = mesesIte;
        } else {
          mesesItePrevia = mesesCompletos(origin, corte);
          mesesIteActual = Math.max(0, mesesIte - mesesItePrevia);
        }
      }
    } catch {
      mesesIte = 0;
    }
  }

  const iteBase = roundPeso(baseIndemnizacion);
  const iteEstimado = roundPeso(
    iteBase * (mesesItePrevia * CASA_PARTICULAR_ITE_TASA_PREVIA + mesesIteActual * CASA_PARTICULAR_ITE_TASA),
  );

  const ias = 0;
  const totalEmpleador = remuneracionMes + feriadoPendiente + feriadoProp + aviso;
  const partidas = [
    {
      key: "remuneracionMes",
      label: `Remuneración del mes (${diasMes} día${diasMes === 1 ? "" : "s"})`,
      monto: remuneracionMes,
    },
    {
      key: "feriadoPendiente",
      label: `Feriado pendiente (${diasFeriadoPendiente} días)`,
      monto: feriadoPendiente,
    },
    {
      key: "feriadoProporcional",
      label: `Feriado proporcional (${diasFeriadoProporcional} días)`,
      monto: feriadoProp,
    },
    {
      key: "aviso",
      label: "Indemnización sustitutiva de aviso previo (art. 161)",
      monto: aviso,
    },
    {
      key: "ias",
      label: "IAS de 30 días por año (art. 163 inciso 2): no aplica a casa particular",
      monto: ias,
    },
  ];

  return {
    causal: causalId,
    causalLabel: causal.label,
    articulo: prueba ? "prueba" : causalId === "desahucio" ? "161" : causalId === "art160" ? "160" : "159",
    prueba,
    ingreso,
    termino,
    remuneracion: roundPeso(remuneracion),
    uf,
    topeMensual,
    baseIndemnizacion: roundPeso(baseIndemnizacion),
    recortoTopeUf,
    recortoTopeAnios,
    diasMes,
    remuneracionMes,
    diasFeriadoPendiente,
    diasFeriadoProporcional,
    feriadoPendiente,
    feriadoProporcional: feriadoProp,
    feriado: feriadoPendiente + feriadoProp,
    avisoPrevio: Boolean(input.avisoPrevio),
    aplicaAviso: Boolean(causal.aplicaAviso) && !prueba,
    aviso,
    ias,
    mesesIte,
    mesesItePrevia,
    mesesIteActual,
    iteTasaActual: CASA_PARTICULAR_ITE_TASA,
    iteTasaPrevia: CASA_PARTICULAR_ITE_TASA_PREVIA,
    iteEstimado,
    iteNoEsPagoEmpleador: true,
    partidas,
    total: totalEmpleador,
    totalEmpleador,
  };
}
