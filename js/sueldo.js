import {
  AFP_COMISION,
  AFP_NOMBRES,
  AFP_OBLIGATORIO,
  ASIGNACION_FAMILIAR_TRAMOS,
  CESANTIA_EMPLEADOR_INDEFINIDO,
  CESANTIA_EMPLEADOR_INDEFINIDO_CIC,
  CESANTIA_EMPLEADOR_INDEFINIDO_FCS,
  CESANTIA_EMPLEADOR_PLAZO_CIC,
  CESANTIA_EMPLEADOR_PLAZO_FCS,
  CESANTIA_EMPLEADOR_PLAZO_FIJO,
  CESANTIA_INDEFINIDO,
  FALLBACK_UF,
  GRATIFICACION_TASA,
  GRATIFICACION_TOPE,
  HORAS_EXTRA_FACTOR,
  IUSC_TRAMOS,
  JORNADA_DEFAULT,
  LEY_21735_CRP,
  LEY_21735_CUENTA_INDIVIDUAL,
  LEY_21735_SSP,
  LEY_21735_TASA,
  MUTUAL_TASA_BASICA,
  RECARGO_DOMINGO_COMERCIO_MIN,
  SALUD_TASA,
  SANNA_TASA,
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
 * Valor de 1 hora ordinaria (sin recargo). Misma base DT que la hora extra:
 * sueldo / 30 * 28 / (jornada * 4)
 * Se calcula sobre el sueldo pactado (no el proporcional del mes).
 */
export function valorHoraOrdinaria(sueldo, jornada = JORNADA_DEFAULT) {
  const s = Number(sueldo) || 0;
  const j = Number(jornada) || JORNADA_DEFAULT;
  if (s <= 0 || j <= 0) return 0;
  return (s / 30) * 28 / (j * 4);
}

/**
 * Valor de 1 hora extra. DT art. 32:
 * sueldo / 30 * 28 / (jornada * 4) * 1.5
 * Se calcula sobre el sueldo pactado (no el proporcional del mes).
 */
export function valorHoraExtra(sueldo, jornada = JORNADA_DEFAULT) {
  return valorHoraOrdinaria(sueldo, jornada) * HORAS_EXTRA_FACTOR;
}

/**
 * Recargo art. 38 N°7 / Ley 20.823: horas ordinarias trabajadas en domingo
 * en establecimientos de comercio y de servicios que atiendan al público.
 * Mínimo 30 % sobre el sueldo convenido (valor hora ordinaria DT).
 *
 * El recargo es el incremento (no el sueldo del día). El Código lo escribe
 * para el domingo, no para el festivo por sí solo. Si hay horas extras en
 * ese domingo, la DT toma hora ordinaria + 30 % y sobre eso aplica el 50 %
 * del art. 32 (dictamen 2611/39).
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-105693.html
 */
export function calcularRecargoDomingoComercio({
  sueldoBase,
  jornada = JORNADA_DEFAULT,
  horasOrdinarias = 0,
  horasExtras = 0,
  recargo = RECARGO_DOMINGO_COMERCIO_MIN,
} = {}) {
  const horaOrd = valorHoraOrdinaria(sueldoBase, jornada);
  const hOrd = Math.max(0, Number(horasOrdinarias) || 0);
  const hExt = Math.max(0, Number(horasExtras) || 0);
  const factor = Number(recargo) > 0 ? Number(recargo) : RECARGO_DOMINGO_COMERCIO_MIN;
  const recargoHora = horaOrd * factor;
  const horaDomingo = horaOrd + recargoHora;
  const recargoTotal = recargoHora * hOrd;
  const horaExtraDomingo = horaDomingo * HORAS_EXTRA_FACTOR;
  const extrasTotal = horaExtraDomingo * hExt;
  return {
    valorHoraOrdinaria: horaOrd,
    recargoHora,
    horaDomingo,
    recargoTotal,
    horaExtraDomingo,
    extrasTotal,
    horasOrdinarias: hOrd,
    horasExtras: hExt,
    recargo: factor,
    jornada: Number(jornada) || JORNADA_DEFAULT,
  };
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
 * Tramo y monto de asignación familiar / maternal (Sistema Único, D.F.L. N° 150).
 * Tramos Ley 21.830 a contar del 1 de mayo de 2026.
 * total = monto(tramo) × cargas + monto(tramo)×2 × cargasInvalidez.
 *
 * El «ingreso mensual» es el que usa la entidad administradora para el tramo
 * (promedio ene–jun del periodo SUSESO 202602 / 202603), no el líquido del mes.
 */
export function tramoAsignacionFamiliar(ingresoMensual) {
  const ingreso = Math.max(0, Number(ingresoMensual) || 0);
  for (const t of ASIGNACION_FAMILIAR_TRAMOS) {
    if (ingreso <= t.hasta) return t;
  }
  return ASIGNACION_FAMILIAR_TRAMOS[ASIGNACION_FAMILIAR_TRAMOS.length - 1];
}

export function calcularAsignacionFamiliar({
  ingresoMensual = 0,
  cargas = 0,
  cargasInvalidez = 0,
} = {}) {
  const ingreso = Math.max(0, Number(ingresoMensual) || 0);
  const n = Math.max(0, Math.floor(Number(cargas) || 0));
  const nInv = Math.max(0, Math.floor(Number(cargasInvalidez) || 0));
  const tramo = tramoAsignacionFamiliar(ingreso);
  const montoCarga = tramo.monto;
  const montoCargaInvalidez = montoCarga * 2;
  return {
    ingreso,
    tramo: ASIGNACION_FAMILIAR_TRAMOS.indexOf(tramo) + 1,
    hasta: tramo.hasta,
    montoCarga,
    montoCargaInvalidez,
    cargas: n,
    cargasInvalidez: nInv,
    total: montoCarga * n + montoCargaInvalidez * nInv,
  };
}

/**
 * Semana corrida (art. 45 Código del Trabajo): remuneración en dinero por
 * domingo y festivos de quien se paga por día o con sueldo mensual más
 * remuneraciones variables (comisiones o tratos).
 *
 * Fórmula de la consulta DT (también aplicable al período mensual):
 * promedio_diario = suma de remuneraciones variables diarias / días en que
 * legalmente debió laborar; semana_corrida = promedio_diario × (domingos +
 * festivos del período). Si hay sueldo mensual, la base es solo la parte
 * variable. Quedan fuera gratificaciones, aguinaldos y bonificaciones
 * accesorias (inciso 2°).
 *
 * Haberes aplica la doctrina DT vigente (devengo diario; estipendio principal
 * y ordinario). No unifica jurisprudencia de la Corte Suprema sobre comisiones
 * que no se devengan día a día. El usuario ingresa el conteo de domingo y
 * festivos; no hay calendario de feriados en el motor.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/portal/1628/w3-article-60203.html
 */
export function calcularSemanaCorrida({
  remuneracionesVariables = 0,
  diasQueDebioLaborar = 0,
  domingosFestivos = 0,
} = {}) {
  const variables = Math.max(0, Number(remuneracionesVariables) || 0);
  const dias = Math.max(0, Number(diasQueDebioLaborar) || 0);
  const descansos = Math.max(0, Number(domingosFestivos) || 0);
  const promedioDiario = dias > 0 ? variables / dias : 0;
  const semanaCorrida = promedioDiario * descansos;
  return {
    remuneracionesVariables: variables,
    diasQueDebioLaborar: dias,
    domingosFestivos: descansos,
    promedioDiario,
    semanaCorrida,
    total: roundPeso(semanaCorrida),
  };
}

/** Feriado anual básico art. 67 (días hábiles; sábado inhábil, art. 69). */
export const FERIADO_ANUAL_DIAS = 15;
/** Art. 67: Magallanes, Aysén y Palena. */
export const FERIADO_ANUAL_EXTREMO_SUR_DIAS = 20;
/** Base de 10 años / 120 cotizaciones para el feriado progresivo (art. 68). */
export const FERIADO_PROGRESIVO_BASE_ANIOS = 10;
/** Un día extra por cada 3 años nuevos con el empleador actual (art. 68). */
export const FERIADO_PROGRESIVO_ANIOS_POR_DIA = 3;

/**
 * Feriado progresivo (art. 68 Código del Trabajo).
 *
 * El trabajador con diez años de trabajo, para uno o más empleadores,
 * continuos o no, tiene derecho a un día adicional de feriado por cada tres
 * nuevos años trabajados. Solo pueden hacerse valer hasta diez años prestados
 * a empleadores anteriores.
 *
 * Lectura DT (consultas 60194 y 60195; dictamen 2694/34): la base de 10 años
 * (120 cotizaciones) se acredita con el empleador actual y/o anteriores
 * (estos, con tope de 10). El primer día extra exige 3 años con el empleador
 * actual *después* de cumplida esa base («sobre los primeros diez»). Si cambia
 * de empleador, los días extra se pierden; el tiempo previo solo sirve para
 * completar la base, y hay que volver a cumplir 3 años con el nuevo empleador.
 *
 * No convierte el feriado básico a dinero. El valor opcional de los días extra
 * usa la misma convención remuneración / 30 del feriado proporcional (art. 73
 * / finiquito), como estimación, no como derecho automático de pago.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/portal/1628/w3-article-60194.html
 * @see https://www.dt.gob.cl/portal/1628/w3-article-60195.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-103605.html
 */
export function calcularFeriadoProgresivo({
  aniosEmpleadoresAnteriores = 0,
  aniosEmpleadorActual = 0,
  remuneracionMensual = 0,
  feriadoBasico = FERIADO_ANUAL_DIAS,
} = {}) {
  const aniosAnteriores = Math.max(0, Number(aniosEmpleadoresAnteriores) || 0);
  const aniosActual = Math.max(0, Number(aniosEmpleadorActual) || 0);
  const rem = Math.max(0, Number(remuneracionMensual) || 0);
  const aniosAnterioresAcreditables = Math.min(FERIADO_PROGRESIVO_BASE_ANIOS, aniosAnteriores);
  const aniosParaCompletarBase = Math.max(0, FERIADO_PROGRESIVO_BASE_ANIOS - aniosAnterioresAcreditables);
  const aniosNuevosConActual = Math.max(0, aniosActual - aniosParaCompletarBase);
  const baseCumplida = aniosAnterioresAcreditables + aniosActual >= FERIADO_PROGRESIVO_BASE_ANIOS;
  const diasExtra = Math.floor(aniosNuevosConActual / FERIADO_PROGRESIVO_ANIOS_POR_DIA + 1e-12);
  const basico =
    Number(feriadoBasico) === FERIADO_ANUAL_EXTREMO_SUR_DIAS
      ? FERIADO_ANUAL_EXTREMO_SUR_DIAS
      : FERIADO_ANUAL_DIAS;
  const aplicaFeriadoBasico = aniosActual >= 1;
  const diasFeriadoAnual = aplicaFeriadoBasico ? basico + diasExtra : 0;
  const valorExtra = diasExtra > 0 && rem > 0 ? roundPeso((diasExtra * rem) / 30) : 0;
  let aniosFaltanProximo;
  if (baseCumplida) {
    const resto = aniosNuevosConActual % FERIADO_PROGRESIVO_ANIOS_POR_DIA;
    aniosFaltanProximo = resto === 0 ? FERIADO_PROGRESIVO_ANIOS_POR_DIA : FERIADO_PROGRESIVO_ANIOS_POR_DIA - resto;
  } else {
    aniosFaltanProximo = aniosParaCompletarBase - aniosActual + FERIADO_PROGRESIVO_ANIOS_POR_DIA;
  }

  return {
    aniosEmpleadoresAnteriores: aniosAnteriores,
    aniosEmpleadorActual: aniosActual,
    aniosAnterioresAcreditables,
    aniosParaCompletarBase,
    aniosNuevosConActual,
    baseCumplida,
    diasExtra,
    feriadoBasico: basico,
    aplicaFeriadoBasico,
    diasFeriadoAnual,
    remuneracionMensual: rem,
    valorExtra,
    aniosFaltanProximo,
  };
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

/**
 * Presupuesto de aguinaldo (Fiestas Patrias u otro de costumbre/convenio).
 *
 * No es un haber legal general del Código del Trabajo en el sector privado.
 * El monto lo pone el usuario (fijo o % del sueldo). Por defecto se trata
 * como haber imponible (art. 41: el aguinaldo no está en el listado de
 * exclusiones; dictamen DT 7143/340 sobre aguinaldos pactados). El usuario
 * puede marcarlo no imponible si su pacto o una exención expresa lo ameritan.
 *
 * El impacto en la liquidación compara el líquido con/sin el aguinaldo,
 * con AFP Modelo, Fonasa y contrato indefinido (misma cuenta que /sueldo).
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/portal/1627/w3-article-96895.html
 */
export function calcularAguinaldo(
  {
    modo = "fijo",
    montoFijo = 0,
    porcentaje = 0,
    sueldoBase = 0,
    trabajadores = 1,
    imponible = true,
  } = {},
  indicadores = {},
) {
  const esPorcentaje = String(modo || "fijo").toLowerCase() === "porcentaje";
  const sueldo = Math.max(0, Number(sueldoBase) || 0);
  const fijo = Math.max(0, Number(montoFijo) || 0);
  const pct = Math.max(0, Number(porcentaje) || 0);
  const n = Math.max(0, Math.floor(Number(trabajadores) || 0));
  const esImponible = imponible !== false;
  const porTrabajador = roundPeso(esPorcentaje ? (sueldo * pct) / 100 : fijo);
  const totalPlanilla = roundPeso(porTrabajador * n);

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
      otrosImponibles: esImponible ? porTrabajador : 0,
      otrosNoImponibles: esImponible ? 0 : porTrabajador,
    },
    indicadores,
  );

  return {
    modo: esPorcentaje ? "porcentaje" : "fijo",
    montoFijo: fijo,
    porcentaje: pct,
    sueldoBase: sueldo,
    trabajadores: n,
    imponible: esImponible,
    porTrabajador,
    totalPlanilla,
    extraLiquido: con.liquido - sin.liquido,
    extraDescuentos: con.totalDescuentos - sin.totalDescuentos,
    extraLiquidoPlanilla: roundPeso((con.liquido - sin.liquido) * n),
    extraDescuentosPlanilla: roundPeso((con.totalDescuentos - sin.totalDescuentos) * n),
    extraImponible: con.imponible - sin.imponible,
    extraIusc: con.iusc - sin.iusc,
    extraAfp: con.afp.monto - sin.afp.monto,
    extraSalud: con.salud.monto - sin.salud.monto,
    extraCesantia: con.cesantia.monto - sin.cesantia.monto,
    liquidoCon: con.liquido,
    liquidoSin: sin.liquido,
  };
}

export function esContratoPlazoOObra(contrato) {
  const c = String(contrato || "")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");
  return (
    c === "plazo_fijo" ||
    c === "fijo" ||
    c === "determinado" ||
    c === "obra" ||
    c === "obra_o_faena" ||
    c === "obra_faena" ||
    c === "faena"
  );
}

export function tasaCesantiaEmpleador(contrato) {
  return esContratoPlazoOObra(contrato)
    ? CESANTIA_EMPLEADOR_PLAZO_FIJO
    : CESANTIA_EMPLEADOR_INDEFINIDO;
}

/**
 * Tasas AFC (Ley 19.728 art. 5) según tipo de contrato: trabajador / empleador
 * y destino cuenta individual (CIC) vs fondo de cesantía solidario (FCS).
 */
export function tasasCesantiaPorContrato(contrato) {
  if (esContratoPlazoOObra(contrato)) {
    return {
      tipo: "plazo_fijo",
      trabajador: { total: 0, cic: 0, fcs: 0 },
      empleador: {
        total: CESANTIA_EMPLEADOR_PLAZO_FIJO,
        cic: CESANTIA_EMPLEADOR_PLAZO_CIC,
        fcs: CESANTIA_EMPLEADOR_PLAZO_FCS,
      },
    };
  }
  return {
    tipo: "indefinido",
    trabajador: { total: CESANTIA_INDEFINIDO, cic: CESANTIA_INDEFINIDO, fcs: 0 },
    empleador: {
      total: CESANTIA_EMPLEADOR_INDEFINIDO,
      cic: CESANTIA_EMPLEADOR_INDEFINIDO_CIC,
      fcs: CESANTIA_EMPLEADOR_INDEFINIDO_FCS,
    },
  };
}

/**
 * Cotización mensual al Seguro de Cesantía (AFC). Reusa la base y el tope de
 * cesantía de calcularSueldo y las tasas de tasaCesantiaEmpleador.
 *
 * No es AFP/salud, no es el costo empresa completo ni el líquido, y no estima
 * la prestación (giros) si hay despido.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=189967
 */
export function calcularSeguroCesantia(input = {}, indicadores = {}) {
  const contratoRaw = String(input.contrato || "indefinido").toLowerCase().trim();
  const contrato = esContratoPlazoOObra(contratoRaw) ? "plazo_fijo" : "indefinido";
  const sueldoBase = Math.max(0, Number(input.sueldoBase ?? input.monto) || 0);
  const calc = calcularSueldo(
    { sueldoBase, afp: "modelo", salud: "fonasa", contrato },
    indicadores,
  );
  const tasas = tasasCesantiaPorContrato(contrato);
  const base = calc.baseCesantia;
  const trabajadorMonto = calc.cesantia.monto;
  const empleadorMonto = roundPeso(base * tasas.empleador.total);
  const trabajadorCic = trabajadorMonto;
  const trabajadorFcs = 0;
  const empleadorCic = roundPeso(base * tasas.empleador.cic);
  const empleadorFcs = empleadorMonto - empleadorCic;

  return {
    contrato: tasas.tipo,
    sueldoBase: calc.sueldoBase,
    imponible: calc.imponible,
    baseCesantia: base,
    topeCesantia: calc.topeCesantia,
    uf: calc.uf,
    trabajador: {
      tasa: tasas.trabajador.total,
      monto: trabajadorMonto,
      cic: { tasa: tasas.trabajador.cic, monto: trabajadorCic },
      fcs: { tasa: tasas.trabajador.fcs, monto: trabajadorFcs },
    },
    empleador: {
      tasa: tasas.empleador.total,
      monto: empleadorMonto,
      cic: { tasa: tasas.empleador.cic, monto: empleadorCic },
      fcs: { tasa: tasas.empleador.fcs, monto: empleadorFcs },
    },
    cuentaIndividual: { monto: trabajadorCic + empleadorCic },
    fondoSolidario: { monto: trabajadorFcs + empleadorFcs },
    total: trabajadorMonto + empleadorMonto,
  };
}

/**
 * Invierte calcularSueldo: busca el sueldo base (peso entero) cuyo líquido
 * alcanza el objetivo. Misma AFP, salud, contrato y gratificación art. 50.
 */
export function brutoDesdeLiquido(liquidoObjetivo, input = {}, indicadores = {}) {
  const target = roundPeso(liquidoObjetivo);
  if (target <= 0) return 0;
  const base = {
    afp: input.afp || "modelo",
    salud: input.salud || "fonasa",
    contrato: input.contrato || "indefinido",
    gratificacionArt50: Boolean(input.gratificacionArt50),
  };
  let lo = 0;
  let hi = Math.max(target * 4, 1_000_000);
  for (let guard = 0; guard < 10 && calcularSueldo({ ...base, sueldoBase: hi }, indicadores).liquido < target; guard++) {
    hi *= 2;
  }
  for (let i = 0; i < 48; i++) {
    const mid = lo + Math.floor((hi - lo) / 2);
    const liq = calcularSueldo({ ...base, sueldoBase: mid }, indicadores).liquido;
    if (liq >= target) hi = mid;
    else lo = mid + 1;
  }
  return hi;
}

/**
 * Costo para el empleador de un sueldo: haberes pagados al trabajador más
 * cotizaciones de cargo del empleador que Haberes modela.
 *
 * - Ley 21.735 (3,5 % desde ago-2026, incluye SIS) sobre tope 90 UF.
 * - Cesantía empleador (2,4 % indefinido / 3,0 % plazo fijo) sobre tope 135,2 UF.
 * - Mutual tasa básica 0,90 % + adicional SUSESO que indica el usuario.
 * - SANNA 0,03 %.
 *
 * No suma un SIS aparte (va dentro del 2,5 % SSP). No inventa tasa adicional
 * de mutual, trabajo pesado ni APVC.
 *
 * @see https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-10906.html
 */
export function calcularCostoEmpresa(input = {}, indicadores = {}) {
  const modo = String(input.modo || "bruto").toLowerCase() === "liquido" ? "liquido" : "bruto";
  const monto = Math.max(0, Number(input.monto ?? input.sueldoBase) || 0);
  const contrato = String(input.contrato || "indefinido").toLowerCase();
  const mutualAdicionalPct = Math.max(0, Number(input.mutualAdicionalPct) || 0);
  const sueldoOpts = {
    afp: input.afp || "modelo",
    salud: input.salud || "fonasa",
    contrato,
    gratificacionArt50: Boolean(input.gratificacionArt50),
  };
  const sueldoBase =
    modo === "liquido" ? brutoDesdeLiquido(monto, sueldoOpts, indicadores) : roundPeso(monto);
  const calc = calcularSueldo({ ...sueldoOpts, sueldoBase }, indicadores);

  const baseAfp = calc.baseAfpSalud;
  const baseCes = calc.baseCesantia;
  const tasaMutual = Math.round((MUTUAL_TASA_BASICA + mutualAdicionalPct / 100) * 1e6) / 1e6;
  const tasaCesEmp = tasaCesantiaEmpleador(contrato);

  const leyCuenta = roundPeso(baseAfp * LEY_21735_CUENTA_INDIVIDUAL);
  const leyCrp = roundPeso(baseAfp * LEY_21735_CRP);
  const leySsp = roundPeso(baseAfp * LEY_21735_SSP);
  const leyMonto = leyCuenta + leyCrp + leySsp;
  const cesMonto = roundPeso(baseCes * tasaCesEmp);
  const mutualMonto = roundPeso(baseAfp * tasaMutual);
  const sannaMonto = roundPeso(baseAfp * SANNA_TASA);
  const totalAportes = leyMonto + cesMonto + mutualMonto + sannaMonto;
  const costoEmpresa = roundPeso(calc.totalHaberes + totalAportes);

  return {
    modo,
    monto,
    sueldoBase,
    contrato,
    mutualAdicionalPct,
    imponible: calc.imponible,
    totalHaberes: calc.totalHaberes,
    gratificacion: calc.gratificacion,
    liquido: calc.liquido,
    baseAfpSalud: calc.baseAfpSalud,
    baseCesantia: calc.baseCesantia,
    topeAfpSalud: calc.topeAfpSalud,
    topeCesantia: calc.topeCesantia,
    ley21735: {
      tasa: LEY_21735_TASA,
      monto: leyMonto,
      cuentaIndividual: { tasa: LEY_21735_CUENTA_INDIVIDUAL, monto: leyCuenta },
      crp: { tasa: LEY_21735_CRP, monto: leyCrp },
      ssp: { tasa: LEY_21735_SSP, monto: leySsp },
    },
    cesantiaEmpleador: { tasa: tasaCesEmp, monto: cesMonto },
    mutual: { tasa: tasaMutual, tasaBasica: MUTUAL_TASA_BASICA, monto: mutualMonto },
    sanna: { tasa: SANNA_TASA, monto: sannaMonto },
    totalAportes,
    costoEmpresa,
  };
}
