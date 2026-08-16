import { FALLBACK_UF, IAS_TOPE_ANIOS, TOPE_AFP_SALUD_UF } from "./constants.js";
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
