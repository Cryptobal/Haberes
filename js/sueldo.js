import {
  AFP_COMISION,
  AFP_NOMBRES,
  AFP_OBLIGATORIO,
  CESANTIA_INDEFINIDO,
  FALLBACK_UF,
  GRATIFICACION_TASA,
  GRATIFICACION_TOPE,
  HORAS_EXTRA_FACTOR,
  IUSC_TRAMOS,
  JORNADA_DEFAULT,
  SALUD_TASA,
  TOPE_AFP_SALUD_UF,
  TOPE_CESANTIA_UF,
} from "./constants.js";
import {
  DIAS_MES_CONVENCIONAL,
  diasDelPeriodo,
  normalizarNovedades,
  proporcional,
} from "./novedades.js";

export function roundPeso(n) {
  return Math.round(Number(n) || 0);
}

export function tasaAfp(afpKey) {
  const key = String(afpKey || "modelo").toLowerCase();
  const comision = AFP_COMISION[key];
  if (comision == null) {
    throw new Error(`AFP no reconocida: ${afpKey}`);
  }
  return AFP_OBLIGATORIO + comision / 100;
}

/**
 * Valor de 1 hora extra. DT art. 32:
 * sueldo / 30 * 28 / (jornada * 4) * 1.5
 * Se calcula sobre el sueldo pactado (no el proporcional del mes).
 */
export function valorHoraExtra(sueldo, jornada = JORNADA_DEFAULT) {
  const s = Number(sueldo) || 0;
  const j = Number(jornada) || JORNADA_DEFAULT;
  if (s <= 0 || j <= 0) return 0;
  return (s / 30) * 28 / (j * 4) * HORAS_EXTRA_FACTOR;
}

export function calcularIusc(baseTributable) {
  const base = Math.max(0, Number(baseTributable) || 0);
  for (const tramo of IUSC_TRAMOS) {
    if (base <= tramo.hasta) {
      const raw = base * tramo.tasa - tramo.rebaja;
      return Math.max(0, roundPeso(raw));
    }
  }
  return 0;
}

export function gratificacionArt50(base, extras = 0, bonos = 0, tope = GRATIFICACION_TOPE) {
  const bruto = (Number(base) || 0) + (Number(extras) || 0) + (Number(bonos) || 0);
  return Math.min(bruto * GRATIFICACION_TASA, Number(tope) || GRATIFICACION_TOPE);
}

/**
 * @param {object} input
 * @param {{ uf?: number }} indicadores
 *
 * Compatibilidad: sin bloque `dias` / novedades → 30 días, montos enteros (como antes).
 * Sin `descuentos` nombrados → se conserva `otrosDescuentos`.
 *
 * Topes imponibles (90 UF / 135,2 UF): se usan completos. No se proporcionalizan
 * a días trabajados hasta tener fuente oficial (práctica Previred; ver brief §6.5).
 */
export function calcularSueldo(input = {}, indicadores = {}) {
  const sueldoBasePactado = Number(input.sueldoBase) || 0;
  const jornada = Number(input.jornada) || JORNADA_DEFAULT;
  const horasExtras = Number(input.horasExtras) || 0;
  const named = Array.isArray(input.haberesExtra)
    ? input.haberesExtra
        .map((h) => ({
          nombre: String(h.nombre || h.label || "Haber").trim() || "Haber",
          monto: roundPeso(h.monto),
          imponible: h.imponible !== false,
        }))
        .filter((h) => h.monto !== 0)
    : [];
  const bonos = named.length ? 0 : roundPeso(input.bonos || 0);
  const extraImp = named.filter((h) => h.imponible).reduce((s, h) => s + h.monto, 0) + bonos;
  const extraNoImpNamed = named.filter((h) => !h.imponible).reduce((s, h) => s + h.monto, 0);
  const otrosImponibles = Number(input.otrosImponibles) || 0;
  const colacionPactada = Number(input.colacion) || 0;
  const movilizacionPactada = Number(input.movilizacion) || 0;
  const otrosNoImponibles = Number(input.otrosNoImponibles) || 0;
  const isaprePactado = Number(input.isaprePactado) || 0;
  const afpKey = String(input.afp || "modelo").toLowerCase();
  const saludTipo = String(input.salud || "fonasa").toLowerCase();
  const contrato = String(input.contrato || "indefinido").toLowerCase();
  const usaGratificacion = Boolean(input.gratificacionArt50);
  const uf = Number(indicadores.uf) || FALLBACK_UF;

  const hasDiasBlock =
    input.dias != null ||
    input.diasAusencia != null ||
    input.diasLicencia != null ||
    input.diasVacaciones != null ||
    input.diasTrabajadosManual != null ||
    input.diasTrabajados != null;

  let diasInfo;
  if (hasDiasBlock) {
    if (input.dias && typeof input.dias === "object" && input.dias.diasTrabajados != null && input.dias.diasBase != null) {
      diasInfo = input.dias;
    } else {
      diasInfo = diasDelPeriodo({
        periodo: input.periodo || input.dias?.periodo,
        fechaIngreso: input.fechaIngreso || input.ingreso,
        fechaTermino: input.fechaTermino || input.termino,
        diasAusencia: input.diasAusencia ?? input.dias?.diasAusencia,
        diasLicencia: input.diasLicencia ?? input.dias?.diasLicencia,
        diasVacaciones: input.diasVacaciones ?? input.dias?.diasVacaciones,
        pagaCarencia: input.pagaCarencia ?? input.dias?.pagaCarencia,
        diasTrabajadosManual:
          input.diasTrabajadosManual ?? input.dias?.diasTrabajadosManual ?? input.diasTrabajados,
      });
    }
  } else {
    diasInfo = {
      diasBase: DIAS_MES_CONVENCIONAL,
      diasAusencia: 0,
      diasLicencia: 0,
      diasVacaciones: 0,
      diasCarenciaPagados: 0,
      diasTrabajados: DIAS_MES_CONVENCIONAL,
      overrideActivo: false,
      avisoTope: false,
      pagaCarencia: false,
    };
  }

  const diasTrabajados = diasInfo.diasTrabajados;
  const diasBase = diasInfo.diasBase ?? DIAS_MES_CONVENCIONAL;

  // Con bloque de días: proporcional (÷ 30 × días). Sin bloque: monto pactado entero.
  const sueldoBaseMes = hasDiasBlock
    ? proporcional(sueldoBasePactado, diasTrabajados)
    : roundPeso(sueldoBasePactado);

  const colacionFija = Boolean(input.colacionFija);
  const movilizacionFija = Boolean(input.movilizacionFija);
  const colacion = hasDiasBlock && !colacionFija
    ? proporcional(colacionPactada, diasTrabajados)
    : roundPeso(colacionPactada);
  const movilizacion = hasDiasBlock && !movilizacionFija
    ? proporcional(movilizacionPactada, diasTrabajados)
    : roundPeso(movilizacionPactada);

  // Horas extras: valor sobre sueldo pactado; monto no se proporcionaliza.
  const vHora = valorHoraExtra(sueldoBasePactado, jornada);
  const montoHorasExtras = roundPeso(vHora * horasExtras);

  // Gratificación art. 50: 25 % sobre imponible ya proporcionalizado.
  // Tope mensual proporcionalizado por días trabajados — criterio habitual;
  // CONFIRMAR CON CONTADOR: no hay dictamen expreso para este caso (§6.3).
  const topeGrat = hasDiasBlock
    ? proporcional(GRATIFICACION_TOPE, diasTrabajados)
    : GRATIFICACION_TOPE;
  const gratificacion = usaGratificacion
    ? roundPeso(gratificacionArt50(sueldoBaseMes, montoHorasExtras, extraImp, topeGrat))
    : 0;

  const imponible = roundPeso(
    sueldoBaseMes + montoHorasExtras + extraImp + gratificacion + otrosImponibles,
  );
  const noImponible = roundPeso(colacion + movilizacion + otrosNoImponibles + extraNoImpNamed);

  // Topes imponibles completos (§6.5 — no proporcionalizar sin fuente oficial).
  const topeAfpSalud = TOPE_AFP_SALUD_UF * uf;
  const topeCesantia = TOPE_CESANTIA_UF * uf;
  const baseAfpSalud = Math.min(imponible, topeAfpSalud);
  const baseCesantia = Math.min(imponible, topeCesantia);

  const tasa = tasaAfp(afpKey);
  const afpMonto = roundPeso(baseAfpSalud * tasa);

  const saludLegal = roundPeso(baseAfpSalud * SALUD_TASA);
  const saludMonto =
    saludTipo !== "fonasa" ? Math.max(saludLegal, roundPeso(isaprePactado)) : saludLegal;

  const cesantiaTasa = contrato === "indefinido" || contrato === "indefinido " ? CESANTIA_INDEFINIDO : 0;
  const cesantiaMonto = roundPeso(baseCesantia * cesantiaTasa);

  const baseTributable = Math.max(0, imponible - afpMonto - saludMonto - cesantiaMonto);
  const iusc = calcularIusc(baseTributable);

  const namedLines = named.map((h, i) => ({
    key: `haber-${i}`,
    label: h.nombre,
    monto: h.monto,
    imponible: h.imponible,
  }));
  const haberes = [
    { key: "sueldoBase", label: "Sueldo base", monto: sueldoBaseMes, imponible: true },
    { key: "horasExtras", label: "Horas extras", monto: montoHorasExtras, imponible: true },
    { key: "bonos", label: "Bonos", monto: roundPeso(bonos), imponible: true },
    ...namedLines,
    { key: "gratificacion", label: "Gratificación art. 50", monto: gratificacion, imponible: true },
    { key: "otrosImponibles", label: "Otros imponibles", monto: roundPeso(otrosImponibles), imponible: true },
    { key: "colacion", label: "Colación (art. 41)", monto: colacion, imponible: false },
    { key: "movilizacion", label: "Movilización (art. 41)", monto: movilizacion, imponible: false },
    { key: "otrosNoImponibles", label: "Otros no imponibles", monto: roundPeso(otrosNoImponibles), imponible: false },
  ].filter((l) => l.monto !== 0 || l.key === "sueldoBase");

  const namedDesc = Array.isArray(input.descuentos)
    ? normalizarNovedades({ descuentos: input.descuentos }).descuentos
    : [];
  const otrosDescuentosLegacy = namedDesc.length ? 0 : Number(input.otrosDescuentos) || 0;
  const montoNamedDesc = namedDesc.reduce((s, d) => s + d.monto, 0);

  const descNamedLines = namedDesc.map((d, i) => ({
    key: `desc-${i}`,
    label: d.nombre,
    monto: d.monto,
    tipo: d.tipo,
  }));

  const descuentos = [
    { key: "afp", label: `AFP ${AFP_NOMBRES[afpKey] || afpKey} (${(tasa * 100).toFixed(2)} %)`, monto: afpMonto },
    {
      key: "salud",
      label: saludTipo !== "fonasa" ? "Salud Isapre" : "Salud Fonasa (7 %)",
      monto: saludMonto,
    },
    { key: "cesantia", label: "Seguro de cesantía (trabajador)", monto: cesantiaMonto },
    { key: "iusc", label: "Impuesto único (IUSC)", monto: iusc },
    ...descNamedLines,
    { key: "otrosDescuentos", label: "Otros descuentos", monto: roundPeso(otrosDescuentosLegacy) },
  ].filter((l) => l.monto !== 0 || l.key === "afp" || l.key === "salud");

  const totalHaberes = imponible + noImponible;
  const totalDescuentos =
    afpMonto + saludMonto + cesantiaMonto + iusc + roundPeso(otrosDescuentosLegacy) + montoNamedDesc;
  const liquido = totalHaberes - totalDescuentos;
  const liquidoNegativo = liquido < 0;

  return {
    sueldoBase: sueldoBaseMes,
    sueldoBasePactado: roundPeso(sueldoBasePactado),
    jornada,
    horasExtras,
    valorHoraExtra: vHora,
    montoHorasExtras,
    bonos: extraImp,
    gratificacion,
    imponible,
    noImponible,
    topeAfpSalud,
    topeCesantia,
    baseAfpSalud,
    baseCesantia,
    afp: { key: afpKey, nombre: AFP_NOMBRES[afpKey] || afpKey, tasa, monto: afpMonto },
    salud: { tipo: saludTipo, monto: saludMonto, legal: saludLegal },
    cesantia: { tasa: cesantiaTasa, monto: cesantiaMonto },
    baseTributable,
    iusc,
    otrosDescuentos: roundPeso(otrosDescuentosLegacy + montoNamedDesc),
    descuentosNombrados: namedDesc,
    totalHaberes,
    totalDescuentos,
    liquido,
    liquidoNegativo,
    haberes,
    descuentos,
    uf,
    contrato,
    dias: {
      diasBase,
      diasTrabajados,
      diasAusencia: diasInfo.diasAusencia || 0,
      diasLicencia: diasInfo.diasLicencia || 0,
      diasVacaciones: diasInfo.diasVacaciones || 0,
      diasCarenciaPagados: diasInfo.diasCarenciaPagados || 0,
      overrideActivo: Boolean(diasInfo.overrideActivo),
      pagaCarencia: Boolean(diasInfo.pagaCarencia),
    },
    leyendaLicencia:
      (diasInfo.diasLicencia || 0) > 0
        ? "El subsidio lo paga Fonasa, la Isapre o la CCAF; no se incluye en esta liquidación."
        : "",
  };
}
