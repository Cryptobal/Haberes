/** Valores oficiales usados por Haberes. No inventar cifras. */

export const FALLBACK_UF = 40854.01;
export const FALLBACK_UTM = 71649;
export const UF_MIN = 20000;
export const UF_MAX = 80000;
export const INDICADORES_CACHE_MS = 12 * 60 * 60 * 1000;
export const MINDICADOR_URL = "https://mindicador.cl/api";

/**
 * Ingreso mínimo mensual — Ley 21.830 (D.O. 22.06.2026), vigencia 1-may-2026.
 * Tramo general: trabajadores de 18 a 65 años.
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1225354
 * @see https://www.dt.gob.cl/portal/1628/w3-article-60141.html
 */
export const IMM = 553553;
/** IMM menores de 18 y mayores de 65 — Ley 21.830 art. 2 */
export const IMM_MENOR_MAYOR = 412938;
/** IMM para fines no remuneracionales — Ley 21.830 art. 3. No es sueldo base. */
export const IMM_NO_REMUNERACIONAL = 356815;
/**
 * IMM previo (Ley 21.751, desde 1-ene-2026). Sirve para estimar la reliquidación
 * de mayo–junio 2026: la 21.830 se publicó el 22-jun con efecto desde el 1-may.
 */
export const IMM_ANTERIOR = 539000;
export const IMM_ANTERIOR_MENOR_MAYOR = 402082;

/** Tope mensual gratificación art. 50 (4,75 IMM / 12) */
export const GRATIFICACION_TASA = 0.25;
export const GRATIFICACION_TOPE = 219115;

/**
 * Umbral art. 203 Código del Trabajo: empresas que ocupan 20 o más
 * trabajadoras (cualquier edad o estado civil). Se cuentan las de la misma
 * razón social o personalidad jurídica (sucursales). No incluye honorarios
 * ni contratistas ajenos.
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/portal/1626/w3-article-59956.html
 */
export const UMBRAL_SALA_CUNA = 20;

/**
 * Inclusión laboral (Ley 21.015 / arts. 157 bis y 157 ter CT).
 * Empresas con promedio ≥ 100 trabajadores: al menos el 1 % de personas con
 * discapacidad y/o asignatarias de pensión de invalidez.
 * DS N°64 MINTRAB art. 6 c): si 1 % × dotación da decimales, se aproxima
 * al entero inferior (no al superior).
 * Donación subsidiaria (art. 157 ter): piso de 24 IMM por cada persona del
 * déficit, por año. Techo: 12 × tope imponible (D.L. 3.500 art. 16); no se
 * usa como resultado principal.
 * El 2 % de la Ley 21.690 aún no rige: queda sujeto a un informe de
 * cumplimiento del 1 % en el 80 % de las empresas obligadas.
 * IMM de donación: tramo general vigente (Ley 21.830, 1-may-2026).
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1103997
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1114287
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/portal/1626/w3-article-118013.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-125364.html
 */
export const UMBRAL_INCLUSION_LABORAL = 100;
export const CUOTA_INCLUSION_LABORAL = 0.01;
export const DONACION_INCLUSION_IMM_ANUAL = 24;
export const INCLUSION_LABORAL_GOLD = Object.freeze({
  bajoUmbral: Object.freeze({ dotacion: 80, contratados: 0 }),
  umbral: Object.freeze({
    dotacion: 100,
    contratados: 0,
    cuota: 1,
    gap: 1,
    donacion: 24 * IMM,
  }),
  redondeo: Object.freeze({
    dotacion: 250,
    contratados: 2,
    cuota: 2,
    gap: 0,
    donacion: 0,
  }),
  cumple: Object.freeze({
    dotacion: 250,
    contratados: 3,
    cuota: 2,
    gap: 0,
    donacion: 0,
  }),
});

/**
 * Jornada parcial (art. 40 bis CT): no puede exceder los 2/3 de la
 * jornada ordinaria de la empresa. Referencia ordinaria típica 40 h
 * (Ley 21.561 / transición); el usuario puede editar 30–45 h.
 * Sueldo proporcional: round(sueldoOrdinario × horasParcial / ordinaria).
 * Feriado en días (educativo): 15 × horasParcial / ordinaria (art. 67).
 * Comparación del tope con tolerancia de 0,01 h.
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1191554
 */
export const JORNADA_PARCIAL_FRACCION_TOPE = 2 / 3;
export const JORNADA_PARCIAL_FERIADO_BASE_DIAS = 15;
export const JORNADA_PARCIAL_TOLERANCIA_H = 0.01;
export const JORNADA_ORDINARIA_REF_H = 40;
export const JORNADA_ORDINARIA_MIN_H = 30;
export const JORNADA_ORDINARIA_MAX_H = 45;
export const JORNADA_PARCIAL_GOLD = Object.freeze({
  medioTiempo: Object.freeze({
    jornadaOrdinariaSemanal: 40,
    horasParcialContrato: 20,
    sueldoOrdinarioReferencia: 900_000,
    cumpleTope: true,
    maxParcialHoras: (2 / 3) * 40,
    sueldoParcial: 450_000,
    porcentajeJornada: 50,
    diasFeriado: 7.5,
  }),
  excede: Object.freeze({
    jornadaOrdinariaSemanal: 40,
    horasParcialContrato: 30,
    sueldoOrdinarioReferencia: 900_000,
    cumpleTope: false,
    maxParcialHoras: (2 / 3) * 40,
    sueldoParcial: 675_000,
    porcentajeJornada: 75,
    diasFeriado: 11.25,
  }),
  ordinaria45: Object.freeze({
    jornadaOrdinariaSemanal: 45,
    horasParcialContrato: 30,
    sueldoOrdinarioReferencia: 900_000,
    cumpleTope: true,
    maxParcialHoras: 30,
    sueldoParcial: 600_000,
    porcentajeJornada: (100 * 30) / 45,
    diasFeriado: 10,
  }),
  alTope: Object.freeze({
    jornadaOrdinariaSemanal: 40,
    horasParcialContrato: 26.67,
    sueldoOrdinarioReferencia: 800_000,
    cumpleTope: true,
    maxParcialHoras: (2 / 3) * 40,
    sueldoParcial: 533_400,
    porcentajeJornada: (100 * 26.67) / 40,
    diasFeriado: (15 * 26.67) / 40,
  }),
});

/**
 * Teletrabajo / trabajo a distancia (Ley 21.220 / arts. 152 quáter A y ss. CT).
 * Derecho a desconexión (art. 152 quáter J): al menos 12 horas continuas
 * en un período de 24 horas, para trabajadores a distancia que distribuyen
 * libremente su horario o teletrabajadores excluidos de la limitación de
 * jornada. Haberes estima horasDesconexion = 24 − jornada diaria de
 * conectividad/disponibilidad (intervalo inicio–fin, con cruce de medianoche,
 * o horasJornadaDiaria 0–24). Cumple si horasDesconexion ≥ 12 − 0,01 h.
 * La remuneración × días / 30 es solo referencia de días bajo modalidad:
 * no es líquido, cotizaciones ni finiquito. No inventa un recargo legal.
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1143741
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/portal/1628/w3-article-118665.html
 */
export const TELETRABAJO_DESCONEXION_MIN_H = 12;
export const TELETRABAJO_PERIODO_H = 24;
export const TELETRABAJO_TOLERANCIA_H = 0.01;
export const TELETRABAJO_GOLD = Object.freeze({
  jornada0900: Object.freeze({
    horaInicioJornada: "09:00",
    horaFinJornada: "18:00",
    cumpleDesconexion: true,
  }),
  jornada0800: Object.freeze({
    horaInicioJornada: "08:00",
    horaFinJornada: "22:00",
    cumpleDesconexion: false,
  }),
  remDias: Object.freeze({
    remuneracionMensual: 900_000,
    diasTeletrabajoMes: 10,
    valorDia: 30_000,
    estimacionDiasModalidad: 300_000,
  }),
});

/**
 * Bandas horarias de cuidado familiar (Ley 21.561 / Código del Trabajo).
 * Tope educativo: anticipar o retrasar hasta 60 minutos el inicio, con el
 * mismo desplazamiento al término. Edad máxima del niño/a: 12 años.
 * La DT describe ~2 h de margen entre extremos (p. ej. 08:00–10:00).
 * Más de 60 minutos no se aplica.
 * @see https://www.dt.gob.cl/portal/1626/w3-article-125814.html
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1191554
 * @see https://www.mintrab.gob.cl/40horas/
 */
export const BANDAS_HORARIAS_MAX_MIN = 60;
export const BANDAS_HORARIAS_EDAD_MAX_ANIOS = 12;
export const BANDAS_HORARIAS_GOLD = Object.freeze({
  anticipar60: Object.freeze({
    horaInicio: "09:00",
    horaFin: "18:00",
    sentido: "anticipar",
    minutos: 60,
    horaInicioNueva: "08:00",
    horaFinNueva: "17:00",
  }),
  retrasar60: Object.freeze({
    horaInicio: "09:00",
    horaFin: "18:00",
    sentido: "retrasar",
    minutos: 60,
    horaInicioNueva: "10:00",
    horaFinNueva: "19:00",
  }),
  anticipar30: Object.freeze({
    horaInicio: "08:30",
    horaFin: "17:30",
    sentido: "anticipar",
    minutos: 30,
    horaInicioNueva: "08:00",
    horaFinNueva: "17:00",
  }),
  cero: Object.freeze({
    horaInicio: "09:00",
    horaFin: "18:00",
    sentido: "anticipar",
    minutos: 0,
    horaInicioNueva: "09:00",
    horaFinNueva: "18:00",
  }),
  excede: Object.freeze({
    horaInicio: "09:00",
    horaFin: "18:00",
    sentido: "anticipar",
    minutos: 90,
    ok: false,
    motivo: "tope",
  }),
});

/**
 * Pacto 4×3 (Ley 21.561 / art. 8° transitorio y art. 28 CT).
 * Distribución de jornada ordinaria en no menos de 4 ni más de 6 días.
 * Tope diario ordinario: 10 h. La bajada del mínimo a 4 días (art. 28)
 * rige el 26-abr-2028; antes, el 4×3 solo si la empresa ya está en ≤40 h
 * o reduce anticipadamente a 40 (art. 8° transitorio). 5 y 6 días ya se
 * permiten. El pacto es voluntario y escrito: no es automático por la
 * rebaja a 42 h de abr-2026. No es el tope gradual 44/42/40, ni el
 * promedio del art. 22 bis, ni las bandas horarias de cuidado familiar.
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1191554
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-125559.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-125561.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-128951.html
 * @see https://www.mintrab.gob.cl/40horas/
 */
export const PACTO_4X3_TOPE_SEMANAL_H = 40;
export const PACTO_4X3_TOPE_DIARIO_H = 10;
export const PACTO_4X3_DIAS_MIN = 4;
export const PACTO_4X3_DIAS_MAX = 6;
export const PACTO_4X3_DIAS_SEMANA = 7;
export const PACTO_4X3_VIGENCIA_GENERAL = "2028-04-26";
export const PACTO_4X3_TOLERANCIA_H = 0.01;
export const PACTO_4X3_GOLD = Object.freeze({
  clasico40: Object.freeze({
    horasSemanales: 40,
    diasTrabajo: 4,
    reduccionAnticipada: true,
    horasDiarias: 10,
    diasDescanso: 3,
    ok: true,
    elegibilidad: "ahora",
  }),
  treintaSeis: Object.freeze({
    horasSemanales: 36,
    diasTrabajo: 4,
    reduccionAnticipada: false,
    horasDiarias: 9,
    diasDescanso: 3,
    ok: true,
    elegibilidad: "ahora",
  }),
  cuarentaDosSinReduccion: Object.freeze({
    horasSemanales: 42,
    diasTrabajo: 4,
    reduccionAnticipada: false,
    horasDiarias: 0,
    diasDescanso: 3,
    ok: false,
    elegibilidad: "desde_2028",
    motivo: "supera_40",
  }),
  topeDiario: Object.freeze({
    horasSemanales: 40,
    diasTrabajo: 3,
    reduccionAnticipada: true,
    horasDiarias: 40 / 3,
    diasDescanso: 4,
    ok: false,
    elegibilidad: "no_aplica",
    motivo: "tope",
  }),
  reduccion42: Object.freeze({
    horasSemanales: 42,
    diasTrabajo: 4,
    reduccionAnticipada: true,
    horasDiarias: 10,
    horasParaReparto: 40,
    diasDescanso: 3,
    ok: true,
    elegibilidad: "ahora",
  }),
  cincoDias42: Object.freeze({
    horasSemanales: 42,
    diasTrabajo: 5,
    reduccionAnticipada: false,
    horasDiarias: 42 / 5,
    diasDescanso: 2,
    ok: true,
    elegibilidad: "ahora",
  }),
  diasFraccion: Object.freeze({
    horasSemanales: 40,
    diasTrabajo: 4.5,
    reduccionAnticipada: true,
    horasDiarias: 0,
    diasDescanso: 2.5,
    ok: false,
    elegibilidad: "no_aplica",
    motivo: "dias",
  }),
});

/**
 * Sistema excepcional de distribución de jornada y descansos
 * (Código del Trabajo art. 38 incisos 7°–9° / DS N°48/2023 Mintrab).
 *
 * PHSC = (horas_trabajo_ciclo / dias_ciclo) × 7.
 * dias_ciclo = días de trabajo + días de descanso.
 * horas_trabajo_ciclo = horas de la jornada diaria × días de trabajo
 * (solo días efectivamente trabajados). Subciclos: se suman todos los
 * días y horas del ciclo compuesto.
 *
 * Tope ordinario art. 22 (Ley 21.561): 42 h desde 26-abr-2026; 40 h
 * desde 26-abr-2028. Art. 38 inc. 8° / DS 48 art. 7: se pueden autorizar
 * sistemas con PHSC hasta 42 h aun cuando el ordinario sea 40; entonces
 * PHSC 42 → 9 días de descanso adicional anuales (compensables en dinero
 * por acuerdo); PHSC 41 → 4,5 días. Ese margen (inciso 2° del art. 7)
 * rige el 26-abr-2028, salvo jornada de 40 h adelantada
 * (art. quinto transitorio DS 48; ORD. N°601/26).
 *
 * Estimación educativa: la autorización la da la Dirección del Trabajo.
 * No aprueba ni simula el trámite. No es el pacto 4×3 del art. 28 ni el
 * promedio del art. 22 bis.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1191554
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1202792
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-128281.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-propertyvalue-193335.html
 * @see https://www.dt.gob.cl/portal/1628/w3-article-93833.html
 */
export const JORNADA_EXCEPCIONAL_TOPE_AUTORIZABLE_H = 42;
export const JORNADA_EXCEPCIONAL_PHSC_41_H = 41;
export const JORNADA_EXCEPCIONAL_DIAS_EXTRA_42 = 9;
export const JORNADA_EXCEPCIONAL_DIAS_EXTRA_41 = 4.5;
export const JORNADA_EXCEPCIONAL_TOPE_ORDINARIO_2026_H = 42;
export const JORNADA_EXCEPCIONAL_TOPE_ORDINARIO_2028_H = 40;
export const JORNADA_EXCEPCIONAL_TOLERANCIA_H = 0.01;
export const JORNADA_EXCEPCIONAL_HORIZONTE_SITIO = "sitio";
export const JORNADA_EXCEPCIONAL_HORIZONTE_2026 = "2026";
export const JORNADA_EXCEPCIONAL_HORIZONTE_2028 = "2028";
/** 7 días × 12 h + 7 descanso: horas_ciclo = 84, PHSC = 42. */
export const JORNADA_EXCEPCIONAL_GOLD_7X7_HORAS_DIA = 12;
/** 7×7 con PHSC 41,00: horas_ciclo = 82 → 82/7 h/día. */
export const JORNADA_EXCEPCIONAL_GOLD_PHSC41_HORAS_DIA = 82 / 7;
export const JORNADA_EXCEPCIONAL_GOLD = Object.freeze({
  sietePorSiete2026: Object.freeze({
    diasTrabajo: 7,
    diasDescanso: 7,
    horasDiarias: 12,
    horizonte: "2026",
    horasCiclo: 84,
    diasCiclo: 14,
    phsc: 42,
    ok: true,
    regimen: "dentro_ordinario",
    diasAdicionales: 0,
    topeOrdinarioH: 42,
  }),
  sietePorSiete2028: Object.freeze({
    diasTrabajo: 7,
    diasDescanso: 7,
    horasDiarias: 12,
    horizonte: "2028",
    horasCiclo: 84,
    diasCiclo: 14,
    phsc: 42,
    ok: true,
    regimen: "inciso_8",
    diasAdicionales: 9,
    topeOrdinarioH: 40,
  }),
  phsc41_2028: Object.freeze({
    diasTrabajo: 7,
    diasDescanso: 7,
    horasDiarias: 82 / 7,
    horizonte: "2028",
    horasCiclo: 82,
    diasCiclo: 14,
    phsc: 41,
    ok: true,
    regimen: "inciso_8",
    diasAdicionales: 4.5,
    topeOrdinarioH: 40,
  }),
  cuatroPorDoce: Object.freeze({
    diasTrabajo: 4,
    diasDescanso: 3,
    horasDiarias: 12,
    horizonte: "2026",
    horasCiclo: 48,
    diasCiclo: 7,
    phsc: 48,
    ok: false,
    regimen: "supera_tope",
    motivo: "supera_tope",
    diasAdicionales: 0,
    topeOrdinarioH: 42,
  }),
  cincoPor84: Object.freeze({
    diasTrabajo: 5,
    diasDescanso: 2,
    horasDiarias: 8.4,
    horizonte: "2026",
    horasCiclo: 42,
    diasCiclo: 7,
    phsc: 42,
    ok: true,
    regimen: "dentro_ordinario",
    diasAdicionales: 0,
    topeOrdinarioH: 42,
  }),
  ceroTrabajo: Object.freeze({
    diasTrabajo: 0,
    diasDescanso: 7,
    horasDiarias: 12,
    horizonte: "2026",
    ok: false,
    motivo: "datos",
    phsc: 0,
  }),
  horasCero: Object.freeze({
    diasTrabajo: 7,
    diasDescanso: 7,
    horasDiarias: 0,
    horizonte: "2026",
    ok: false,
    motivo: "datos",
    phsc: 0,
  }),
  descansoNegativo: Object.freeze({
    diasTrabajo: 7,
    diasDescanso: -1,
    horasDiarias: 12,
    horizonte: "2026",
    ok: false,
    motivo: "descanso",
    phsc: 0,
  }),
  cicloInconsistente: Object.freeze({
    diasTrabajo: 7,
    diasDescanso: 7,
    horasDiarias: 12,
    diasCiclo: 10,
    horizonte: "2026",
    ok: false,
    motivo: "ciclo",
    phsc: 0,
  }),
});

/**
 * Contrato a plazo fijo (art. 159 N°4 CT). Tope general 12 meses; 24 si
 * gerente o título profesional/técnico de institución de educación superior
 * del Estado o reconocida por éste. Una renovación; la segunda o la
 * continuidad con conocimiento del empleador transforman en indefinido.
 * Comparación del tope con tolerancia de 1 día calendario.
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-102862.html
 * @see https://www.dt.gob.cl/portal/1628/w3-article-60792.html
 */
export const CONTRATO_PLAZO_FIJO_TOPE_GENERAL_MESES = 12;
export const CONTRATO_PLAZO_FIJO_TOPE_TITULO_MESES = 24;
export const CONTRATO_PLAZO_FIJO_TOLERANCIA_DIAS = 1;
export const CONTRATO_PLAZO_FIJO_GOLD = Object.freeze({
  doceMeses: Object.freeze({
    fechaInicio: "2026-01-01",
    plazoMeses: 12,
    esTituloProfesionalOTecnico: false,
    esRenovacion: false,
    continuaTrasVencimiento: false,
    fechaReferencia: "2026-01-01",
    topeLegalMeses: 12,
    fechaTermino: "2027-01-01",
    duracionMeses: 12,
    cumpleTope: true,
    seTransformaEnIndefinido: false,
    motivoIndefinido: "ninguno",
    diasRestantes: 365,
  }),
  dieciochoSinTitulo: Object.freeze({
    fechaInicio: "2026-01-01",
    plazoMeses: 18,
    esTituloProfesionalOTecnico: false,
    esRenovacion: false,
    continuaTrasVencimiento: false,
    fechaReferencia: "2026-01-01",
    topeLegalMeses: 12,
    fechaTermino: "2027-07-01",
    duracionMeses: 18,
    cumpleTope: false,
    seTransformaEnIndefinido: false,
    motivoIndefinido: "ninguno",
  }),
  dieciochoConTitulo: Object.freeze({
    fechaInicio: "2026-01-01",
    plazoMeses: 18,
    esTituloProfesionalOTecnico: true,
    esRenovacion: false,
    continuaTrasVencimiento: false,
    fechaReferencia: "2026-01-01",
    topeLegalMeses: 24,
    fechaTermino: "2027-07-01",
    duracionMeses: 18,
    cumpleTope: true,
    seTransformaEnIndefinido: false,
    motivoIndefinido: "ninguno",
  }),
  renovacionVencida: Object.freeze({
    fechaInicio: "2025-01-01",
    plazoMeses: 12,
    esTituloProfesionalOTecnico: false,
    esRenovacion: true,
    continuaTrasVencimiento: false,
    fechaReferencia: "2026-02-01",
    topeLegalMeses: 12,
    fechaTermino: "2026-01-01",
    seTransformaEnIndefinido: true,
    motivoIndefinido: "renovacion_agotada",
    diasRestantes: 0,
  }),
  continuidad: Object.freeze({
    fechaInicio: "2026-01-01",
    plazoMeses: 18,
    esTituloProfesionalOTecnico: true,
    esRenovacion: true,
    continuaTrasVencimiento: true,
    fechaReferencia: "2026-01-01",
    topeLegalMeses: 24,
    fechaTermino: "2027-07-01",
    cumpleTope: true,
    seTransformaEnIndefinido: true,
    motivoIndefinido: "renovacion_agotada_y_continuidad",
  }),
});

/**
 * Término anticipado de contrato a plazo fijo (art. 159 N°4 CT).
 *
 * Si el empleador pone término antes del vencimiento pactado, sin una
 * causal del art. 160, la práctica jurisprudencial consolidada estima
 * las remuneraciones que se habrían percibido hasta esa fecha
 * (remuneración remanente). No es IAS, aviso, recargo 168 ni finiquito.
 *
 * Fórmula (meses de calendario, la misma que `/contrato-plazo-fijo`):
 *   meses_remanentes = Δaños×12 + Δmeses + (Δdías / último_día_mes_pactado)
 *   remuneración_remanente = round(meses_remanentes × sueldo_mensual)
 * No usa días/30: 1-abr-2026 → 1-jul-2026 son 91 días (2.426.667 con /30)
 * y el gold exige 3,00 meses × $800.000 = $2.400.000.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 */
export const TERMINO_ANTICIPADO_PLAZO_FIJO_GOLD = Object.freeze({
  tresMeses800: Object.freeze({
    sueldoMensual: 800_000,
    fechaTerminoAnticipado: "2026-04-01",
    fechaTerminoPactada: "2026-07-01",
    mesesRemanentes: 3,
    diasRemanentes: 91,
    remuneracionRemanente: 2_400_000,
  }),
  mesesSolo: Object.freeze({
    sueldoMensual: 800_000,
    fechaTerminoAnticipado: "2026-04-01",
    mesesRemanentes: 3,
    fechaTerminoPactada: "2026-07-01",
    remuneracionRemanente: 2_400_000,
  }),
  mismoDia: Object.freeze({
    sueldoMensual: 800_000,
    fechaTerminoAnticipado: "2026-04-01",
    fechaTerminoPactada: "2026-04-01",
    mesesRemanentes: 0,
    diasRemanentes: 0,
    remuneracionRemanente: 0,
  }),
});

/**
 * Permiso sin goce de sueldo (pacto; no hay un derecho unilateral en el CT).
 * Fórmula educativa: descuento = round((sueldoMensual / diasBase) × diasPermiso).
 * Default de diasBase: días corridos del mes calendario; alternativa: días
 * laborables que indica el usuario. No se inventa un tope anual legal.
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-110215.html
 * @see https://www.dt.gob.cl/portal/1628/w3-article-60216.html
 */
export const PERMISO_SIN_GOCE_GOLD = Object.freeze({
  corridos30: Object.freeze({
    sueldoMensual: 900_000,
    diasBase: 30,
    diasPermiso: 3,
    tipoBase: "corridos",
    descuento: 90_000,
    sueldoMes: 810_000,
  }),
  laborables20: Object.freeze({
    sueldoMensual: 900_000,
    diasBase: 20,
    diasPermiso: 2,
    tipoBase: "laborables",
    descuento: 90_000,
    sueldoMes: 810_000,
  }),
  ceroDias: Object.freeze({
    sueldoMensual: 900_000,
    diasBase: 30,
    diasPermiso: 0,
    tipoBase: "corridos",
    descuento: 0,
    sueldoMes: 900_000,
  }),
});

/**
 * Permiso postnatal parental (art. 197 bis CT / Ley 20.545).
 * Completa: 12 semanas (84 días). Parcial: 18 semanas (126 días).
 * La madre goza al menos las primeras 6 semanas; el padre, si se cede,
 * toma el tramo final desde la 7.ª.
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1030936
 * @see https://www.dt.gob.cl/portal/1628/w3-article-99747.html
 */
export const POSTNATAL_PARENTAL_SEMANAS_COMPLETA = 12;
export const POSTNATAL_PARENTAL_SEMANAS_PARCIAL = 18;
export const POSTNATAL_PARENTAL_SEMANAS_MIN_MADRE = 6;

/**
 * Descanso de maternidad (arts. 195 y 196) y fuero (art. 201).
 * Prenatal: 6 semanas = 42 días corridos antes del parto.
 * Postnatal legal: 12 semanas = 84 días corridos a contar de la fecha de parto.
 * Fuero de la madre: desde el embarazo hasta un año después de expirado ese
 * postnatal, excluido el permiso postnatal parental (art. 197 bis).
 * DT: por regla general el fuero dura hasta que el hijo cumple un año y 84 días.
 * Un postnatal suplementario (art. 196) sí corre la base; el parental no.
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/portal/1628/w3-article-60107.html
 * @see https://www.suseso.gob.cl/605/w3-article-782408.html
 * @see https://www.dt.gob.cl/portal/1628/w3-article-60062.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-116607.html
 */
export const DESCANSO_PRENATAL_SEMANAS = 6;
export const DESCANSO_PRENATAL_DIAS = 42;
export const DESCANSO_POSTNATAL_SEMANAS = 12;
export const DESCANSO_POSTNATAL_DIAS = 84;
export const FUERO_MATERNAL_ANIOS = 1;

/**
 * Hora de alimentación / lactancia (art. 206 Código del Trabajo).
 * Mínimo legal: 1 hora al día, irrenunciable, hasta que el hijo cumpla 2 años
 * (24 meses). El techo de 120 min es de la herramienta (pacto o viaje a sala
 * cuna); no autoriza recortar el piso de 60 min.
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/portal/1628/w3-article-60103.html
 */
export const HORA_LACTANCIA_MINUTOS_LEGAL = 60;
export const HORA_LACTANCIA_EDAD_MAX_MESES = 24;
export const HORA_LACTANCIA_MINUTOS_MAX = 120;
export const HORA_LACTANCIA_DIAS_DEFAULT = 22;

export const JORNADA_DEFAULT = 42;
export const HORAS_EXTRA_FACTOR = 1.5;
/**
 * Compensación de horas extraordinarias por días adicionales de feriado
 * (art. 32 inc. 4° CT, Ley 21.561).
 *
 * Recargo de compensación: 1,5 horas de feriado por cada HE (el mismo
 * recargo del pago al 50 %). Tope: 5 días hábiles al año. Uso: 6 meses
 * desde el ciclo, aviso 48 h. Sin pacto escrito se pagan en dinero
 * (`/horas-extras`). Un día completo exige horas equivalentes a la
 * jornada de ese día (ORD. N°387/11); no se toman medios días
 * (ORD. N°199/5).
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1191554
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-125559.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-125738.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-127480.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-127877.html
 */
export const COMPENSACION_HE_RECARGO = HORAS_EXTRA_FACTOR;
export const COMPENSACION_HE_TOPE_DIAS = 5;
export const COMPENSACION_HE_PLAZO_MESES = 6;
export const COMPENSACION_HE_AVISO_HORAS = 48;
export const COMPENSACION_HE_JORNADA_DIARIA_DEFAULT = 8;
/** 42 h / 5 días (tope ordinario 2026). */
export const COMPENSACION_HE_JORNADA_DIARIA_42_5 = 42 / 5;
export const COMPENSACION_HE_TOLERANCIA = 1e-9;
export const COMPENSACION_HE_GOLD = Object.freeze({
  clasico16: Object.freeze({
    horasExtra: 16,
    horasJornadaDiaria: 8,
    horasFeriado: 24,
    diasEquivalentes: 3,
    diasCompletos: 3,
    horasRestantes: 0,
    diasDentroTope: 3,
    diasFueraTope: 0,
    ok: true,
  }),
  topeAnual: Object.freeze({
    horasExtra: 32,
    horasJornadaDiaria: 8,
    horasFeriado: 48,
    diasEquivalentes: 6,
    diasCompletos: 6,
    horasRestantes: 0,
    diasDentroTope: 5,
    diasFueraTope: 1,
    ok: true,
  }),
  fraccion: Object.freeze({
    horasExtra: 8,
    horasJornadaDiaria: 8,
    horasFeriado: 12,
    diasEquivalentes: 1.5,
    diasCompletos: 1,
    horasRestantes: 4,
    diasDentroTope: 1,
    diasFueraTope: 0,
    ok: true,
  }),
  jornada84: Object.freeze({
    horasExtra: 16,
    horasJornadaDiaria: 42 / 5,
    horasFeriado: 24,
    diasEquivalentes: 24 / (42 / 5),
    diasCompletos: 2,
    horasRestantes: 24 - 2 * (42 / 5),
    diasDentroTope: 2,
    diasFueraTope: 0,
    ok: true,
  }),
  sueldo800: Object.freeze({
    horasExtra: 16,
    horasJornadaDiaria: 8,
    sueldoMensual: 800_000,
    jornadaSemanal: 40,
    valorHoraExtra: 7_000,
    equivalenciaPago: 112_000,
    ok: true,
  }),
  cero: Object.freeze({
    horasExtra: 0,
    horasJornadaDiaria: 8,
    ok: false,
    motivo: "horas",
  }),
});
/** Mínimo legal art. 38 N°7: recargo sobre horas ordinarias en domingo (comercio/servicios al público). */
export const RECARGO_DOMINGO_COMERCIO_MIN = 0.3;

/** AFP: 10 % obligatorio + comisión (Circular 2414), sobre tope 90 UF */
export const AFP_OBLIGATORIO = 0.1;
export const TOPE_AFP_SALUD_UF = 90;
export const AFP_COMISION = {
  uno: 0.49,
  modelo: 0.58,
  planvital: 1.16,
  habitat: 1.27,
  capital: 1.44,
  cuprum: 1.44,
  provida: 1.45,
};

export const AFP_NOMBRES = {
  uno: "Uno",
  modelo: "Modelo",
  planvital: "PlanVital",
  habitat: "Habitat",
  capital: "Capital",
  cuprum: "Cuprum",
  provida: "Provida",
};

export const SALUD_TASA = 0.07;
export const CESANTIA_INDEFINIDO = 0.006;
export const TOPE_CESANTIA_UF = 135.2;

/**
 * Tope mensual de cotización voluntaria / APV que entra a la cuenta (D.L. 3.500).
 * 50 UF al mes. El tope anual de rebaja tributaria Régimen B es 600 UF (art. 42 bis
 * LIR); esta herramienta no arrastra meses ni simula Operación Renta.
 * @see https://www.bcn.cl/leychile/navegar?idNorma=7147
 * @see https://www.bcn.cl/leychile/navegar?idNorma=6368 art. 42 bis
 */
export const TOPE_APV_REGIMEN_B_UF = 50;

/**
 * Seguro de cesantía — Ley 19.728 art. 5 (AFC / SUSESO / Superintendencia de Pensiones).
 * Indefinido: trabajador 0,6 % a la cuenta individual (CIC); empleador 2,4 %
 * (1,6 % CIC + 0,8 % fondo solidario). Plazo fijo u obra o faena: trabajador
 * 0 %; el empleador cotiza el 3,0 % (2,8 % CIC + 0,2 % fondo solidario).
 * Misma base y tope de 135,2 UF (distinto del tope AFP de 90 UF). No se inventa
 * un tope distinto. No modela el tope de 11 años por relación laboral ni el
 * régimen de casa particular (indemnización a todo evento).
 * @see https://www.bcn.cl/leychile/navegar?idNorma=189967
 * @see https://www.suseso.gob.cl/613/w3-propertyvalue-122245.html
 * @see https://www.spensiones.gob.cl/portal/institucional/594/w3-propertyvalue-9927.html
 */
export const CESANTIA_EMPLEADOR_INDEFINIDO = 0.024;
export const CESANTIA_EMPLEADOR_INDEFINIDO_CIC = 0.016;
export const CESANTIA_EMPLEADOR_INDEFINIDO_FCS = 0.008;
export const CESANTIA_EMPLEADOR_PLAZO_FIJO = 0.03;
export const CESANTIA_EMPLEADOR_PLAZO_CIC = 0.028;
export const CESANTIA_EMPLEADOR_PLAZO_FCS = 0.002;

/**
 * Cotización adicional por trabajo pesado — Ley 19.404 / D.L. 3.500 art. 17 bis.
 * Entra a la cuenta de capitalización individual (AFP), sobre la misma
 * remuneración imponible y tope de los arts. 14 y 16 (tope AFP, 90 UF).
 * Comisión Ergonómica Nacional (CEN): pesado 2 % trabajador + 2 % empleador
 * (total 4 %); puede fijar 1 % + 1 % (total 2 %) si el desgaste es menor.
 * El empleador retiene la parte del trabajador y entera ambos.
 * Rebaja de edad (art. 68 bis): 2 años por cada 5 cotizados al 2 % (máx. 10);
 * 1 año por cada 5 al 1 % (máx. 5). Haberes usa bloques de 5 años completos
 * (floor); no estima fracciones ni exige los 20 años de cotizaciones totales.
 * @see https://www.bcn.cl/leychile/navegar?idNorma=30771
 * @see https://www.bcn.cl/leychile/navegar?idNorma=7147
 * @see https://www.suseso.gob.cl/613/w3-propertyvalue-185105.html
 * @see https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9918.html
 */
export const TRABAJO_PESADO_TASA_TRABAJADOR = 2;
export const TRABAJO_PESADO_TASA_EMPLEADOR = 2;
export const TRABAJO_MENOS_PESADO_TASA_TRABAJADOR = 1;
export const TRABAJO_MENOS_PESADO_TASA_EMPLEADOR = 1;
export const TRABAJO_PESADO_ANIOS_BLOQUE = 5;
export const TRABAJO_PESADO_REBAJA_ANIOS_POR_BLOQUE = 2;
export const TRABAJO_PESADO_REBAJA_MAX = 10;
export const TRABAJO_MENOS_PESADO_REBAJA_ANIOS_POR_BLOQUE = 1;
export const TRABAJO_MENOS_PESADO_REBAJA_MAX = 5;

/**
 * Cotización de cargo del empleador Ley 21.735 (reforma previsional).
 * Remuneraciones de agosto 2026 a julio 2027: 3,5 % sobre la base AFP
 * (tope 90 UF). Incluye el SIS: no se suma un SIS aparte.
 * Distribución Superintendencia de Pensiones:
 * 0,1 % cuenta individual + 0,9 % CRP + 2,5 % SSP (SIS y CEV).
 * @see https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-10906.html
 */
export const LEY_21735_TASA = 0.035;
export const LEY_21735_CUENTA_INDIVIDUAL = 0.001;
export const LEY_21735_CRP = 0.009;
export const LEY_21735_SSP = 0.025;

/**
 * Seguro de accidentes del trabajo (Ley 16.744 / D.S. N° 110): tasa básica
 * 0,90 % sobre la base AFP/salud (tope 90 UF). La tasa adicional SUSESO es
 * de cada empresa; el usuario la indica, no se inventa.
 * SANNA (Ley 21.063): 0,03 % sobre la misma base.
 */
export const MUTUAL_TASA_BASICA = 0.009;
export const SANNA_TASA = 0.0003;

/**
 * Impuesto único de segunda categoría — tramos agosto 2026 (pesos).
 * tasa * base − rebaja
 */
export const IUSC_TRAMOS = [
  { hasta: 967261.5, tasa: 0, rebaja: 0 },
  { hasta: 2149470, tasa: 0.04, rebaja: 38690.46 },
  { hasta: 3582450, tasa: 0.08, rebaja: 124669.26 },
  { hasta: 5015430, tasa: 0.135, rebaja: 321704.01 },
  { hasta: 6448410, tasa: 0.23, rebaja: 798169.86 },
  { hasta: 8597880, tasa: 0.304, rebaja: 1275352.2 },
  { hasta: 22211190, tasa: 0.35, rebaja: 1670854.68 },
  { hasta: Infinity, tasa: 0.4, rebaja: 2781414.18 },
];

/**
 * Sueldo grado 1-A de la Escala Única de Sueldos: tope mensual de la rebaja
 * por presunción de asignación de zona (art. 13 D.L. N° 889 de 1975).
 * Circular SII N° 32 de 2026 (septiembre 2026) = $745.136. El mismo monto
 * rige en las circulares N° 18 (junio), N° 24 (julio) y N° 29 (agosto) de 2026,
 * tras el reajuste 1,4 % de la Ley N° 21.806. Editable en la UI.
 * @see https://www.sii.cl/normativa_legislacion/circulares/2026/circu32.pdf
 * @see https://www.sii.cl/normativa_legislacion/circulares/2026/circu29.pdf
 * @see https://www.sii.cl/normativa_legislacion/circulares/2026/circu18.pdf
 */
export const GRADO_1A_EUS_ZONA_EXTREMA = 745_136;

/**
 * Incremento de la Ley N° 19.354 sobre el % del art. 7° D.L. 249:
 * el monto de la asignación se aumenta en 40 % ⇒ el % se multiplica × 1,4.
 * Oficio SII N° 2666 de 2002: 85 % incrementado en 40 % = 119 %.
 * @see https://www.sii.cl/pagina/jurisprudencia/adminis/2002/renta/ja316.htm
 */
export const INCREMENTO_ASIGNACION_ZONA_LEY_19354 = 1.4;

/**
 * Gold UI /zona-extrema: renta afecta $2.000.000, Iquique/Tarapacá,
 * % incrementado 56 (40 × 1,4), grado 1-A $745.136 (SII sep-2026).
 *
 * rebaja_sin_tope = round(2_000_000 × 56 / 156) = 717_949
 * tope = round(745_136 × 56 / 100) = 417_276
 * rebaja_efectiva = min = 417_276
 * renta_afecta_nueva = 2_000_000 − 417_276 = 1_582_724
 *
 * El IUSC antes/después reusa `calcularIusc` / `IUSC_TRAMOS` (agosto 2026).
 * @see https://www.sii.cl/preguntas_frecuentes/declaracion_renta/001_140_1533.htm
 */
export const ZONA_EXTREMA_GOLD = Object.freeze({
  iquique2000: Object.freeze({
    rentaAfecta: 2_000_000,
    pctIncrementado: 56,
    pctBase: 40,
    grado1A: GRADO_1A_EUS_ZONA_EXTREMA,
    zonaId: "iquique",
    rebajaSinTope: 717_949,
    tope: 417_276,
    rebajaEfectiva: 417_276,
    rentaAfectaNueva: 1_582_724,
  }),
});

/**
 * Antigüedad laboral (conteo civil años → meses → días).
 * anosIAS = años cumplidos (art. 163: sin redondear fracciones).
 * mesesFeriado = anosCompletos × 12 + mesesRemanentes (días sueltos no suman).
 * Gold: 2020-01-15 → 2026-07-15 = 6a 6m 0d; anosIAS 6; mesesFeriado 78.
 * 2020-01-15 → 2026-01-14 = 5a 11m 30d; anosIAS 5 (no sube a 6);
 * anosConFraccion 6 solo informa la regla «fracción > 6 meses» del 163.
 * Misma fecha = 0a 0m 0d.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 */
export const ANTIGUEDAD_LABORAL_GOLD = Object.freeze({
  seisAniosSeisMeses: Object.freeze({
    fechaInicio: "2020-01-15",
    fechaTermino: "2026-07-15",
    anosCompletos: 6,
    mesesRemanentes: 6,
    diasRemanentes: 0,
    anosIAS: 6,
    anosConFraccion: 6,
    mesesFeriado: 78,
  }),
  visperaAniversario: Object.freeze({
    fechaInicio: "2020-01-15",
    fechaTermino: "2026-01-14",
    anosCompletos: 5,
    mesesRemanentes: 11,
    diasRemanentes: 30,
    anosIAS: 5,
    anosConFraccion: 6,
    mesesFeriado: 71,
  }),
  mismoDia: Object.freeze({
    fechaInicio: "2024-03-01",
    fechaTermino: "2024-03-01",
    anosCompletos: 0,
    mesesRemanentes: 0,
    diasRemanentes: 0,
    anosIAS: 0,
    anosConFraccion: 0,
    mesesFeriado: 0,
  }),
});

/**
 * Promedio de remuneraciones variables (art. 172 CT).
 * total_mes = fija + variables (+ gratificación si marcada).
 * n = meses con total > 0; promedio = round(suma / n).
 * Gold: 1_000_000 + 1_200_000 + 900_000 = 3_100_000 / 3
 * → round(1_033_333.333…) = 1_033_333.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 */
export const PROMEDIO_REMUNERACIONES_GOLD = Object.freeze({
  tresMeses: Object.freeze({
    incluirGratificacion: false,
    meses: Object.freeze([
      Object.freeze({ fija: 800_000, variables: 200_000, gratificacion: 0 }),
      Object.freeze({ fija: 800_000, variables: 400_000, gratificacion: 0 }),
      Object.freeze({ fija: 800_000, variables: 100_000, gratificacion: 0 }),
    ]),
    n: 3,
    suma: 3_100_000,
    promedio: 1_033_333,
  }),
  dosMeses: Object.freeze({
    incluirGratificacion: false,
    meses: Object.freeze([
      Object.freeze({ fija: 800_000, variables: 200_000, gratificacion: 0 }),
      Object.freeze({ fija: 800_000, variables: 400_000, gratificacion: 0 }),
      Object.freeze({ fija: 0, variables: 0, gratificacion: 0 }),
    ]),
    n: 2,
    suma: 2_200_000,
    promedio: 1_100_000,
  }),
});

/**
 * Retención / PPM de boletas de honorarios — Ley 21.133, calendario SII
 * por año comercial de emisión (no inventar tasas fuera de esta tabla).
 * Un solo porcentaje sobre el bruto; no desglosa AFP ni salud.
 * @see https://www.sii.cl/preguntas_frecuentes/declaracion_renta/001_140_7297.htm
 * @see https://www.sii.cl/noticias/2025/261225noti01smn.htm
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1128420
 */
export const RETENCION_BOLETA_HONORARIOS = {
  2025: 0.145,
  2026: 0.1525,
  2027: 0.16,
  2028: 0.17,
};
export const RETENCION_BOLETA_ANIO_DEFAULT = 2026;

/**
 * Asignación familiar y maternal — tramos a contar del 1 de mayo de 2026.
 * Ley N° 21.830 (D.O. 22.06.2026) modifica el inciso primero del art. 1° de la Ley N° 18.987.
 * SUSESO dictamen O-01-S-02728-2026; DT consulta «¿Cuál es el valor de la asignación familiar?».
 * Causantes por invalidez: asignación aumentada al duplo (D.F.L. N° 150, art. 14).
 */
export const ASIGNACION_FAMILIAR_TRAMOS = [
  { hasta: 649039, monto: 22601 },
  { hasta: 947990, monto: 13870 },
  { hasta: 1478539, monto: 4382 },
  { hasta: Infinity, monto: 0 },
];

export const IAS_TOPE_ANIOS = 11;

/**
 * Indemnización por tiempo servido en contrato por obra o faena (art. 163
 * inciso Ley 21.122 / art. 10 bis). Régimen pleno: 2,5 días de remuneración
 * por cada mes trabajado y fracción superior a 15 días, si el contrato
 * estuvo vigente un mes o más y termina por art. 159 N°5.
 * Gradualidad (dictamen DT 954/9, consulta DT w3-article-118059):
 * 1 día (1-ene-2019 a 30-jun-2020), 1,5 (1-jul-2020 a 30-jun-2021),
 * 2 (1-jul-2021 a 31-dic-2021), 2,5 después del 31-dic-2021.
 * Base art. 172 (tope 90 UF). No es la IAS de 30 días/año ni un tope de 11 años.
 */
export const OBRA_FAENA_FACTOR_PLENO = 2.5;
export const OBRA_FAENA_VIGENCIA_MIN_MESES = 1;
export const OBRA_FAENA_FRACCION_DIAS = 15;

/**
 * Plazos educativos de /prescripcion-laboral (art. 510 CT y art. 168).
 * No son montos de dinero. El 168 usa días hábiles lun–vie excluyendo
 * FERIADOS_LEGALES_CL (js/feriados.js), contados desde el día siguiente a la
 * separación (art. 48 Código Civil).
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/portal/1628/w3-article-60622.html
 */
export const PRESCRIPCION_DIAS_HABILES_168 = 60;
export const PRESCRIPCION_DIAS_HABILES_168_TOPE_RECLAMO = 90;
export const PRESCRIPCION_ANIOS_GENERALES = 2;
export const PRESCRIPCION_MESES_POST_TERMINO = 6;
export const PRESCRIPCION_MESES_HORAS_EXTRAS = 6;
export const PRESCRIPCION_MESES_NULIDAD_162 = 6;
export const PRESCRIPCION_TOPE_ANIOS_RECLAMO = 1;
export const PRESCRIPCION_POR_VENCER_DIAS = 30;

export const PRESCRIPCION_MODOS = Object.freeze({
  generales: "generales",
  post_termino: "post_termino",
  horas_extras: "horas_extras",
  nulidad_162: "nulidad_162",
  art_168: "art_168",
});

/** Casos gold 2026 para verify y copy. Art. 168: 2026-01-02 → 2026-03-27. */
export const PRESCRIPCION_GOLD = Object.freeze({
  generales: { modo: "generales", fechaAncla: "2024-03-15", fechaLimite: "2026-03-15" },
  postTermino: { modo: "post_termino", fechaAncla: "2026-01-15", fechaLimite: "2026-07-15" },
  horasExtras: { modo: "horas_extras", fechaAncla: "2025-09-30", fechaLimite: "2026-03-30" },
  nulidad162: { modo: "nulidad_162", fechaAncla: "2026-01-10", fechaLimite: "2026-07-10" },
  art168: { modo: "art_168", fechaAncla: "2026-01-02", fechaLimite: "2026-03-27" },
  vencido: { modo: "post_termino", fechaAncla: "2025-01-01", fechaLimite: "2025-07-01" },
});

/**
 * Gold educativo de /descanso-compensatorio (art. 38 CT).
 * 1 día por domingo trabajado + 1 por festivo efectivamente trabajado,
 * menos descansos ya otorgados. Valor día = rem/30, roundPeso.
 * No es el recargo 30 % del art. 38 N°7.
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 */
export const DESCANSO_COMPENSATORIO_GOLD = Object.freeze({
  domingos: 4,
  festivos: 1,
  otorgados: 2,
  pendientes: 3,
  remuneracion: 900_000,
  valorDia: 30_000,
  estimacion: 90_000,
});

/**
 * Indemnización especial de tutela laboral (art. 489 CT).
 * El juez fija el monto entre 6 y 11 meses de la última remuneración mensual.
 * No hay otro tope legal publicado en ese artículo (no se inventa el de 90 UF del art. 172).
 */
export const TUTELA_MESES_MIN = 6;
export const TUTELA_MESES_MAX = 11;

/**
 * Recargo del artículo 168 sobre la IAS (art. 163).
 * a) 30 % art. 161 improcedente; b) 50 % art. 159 injustificado o sin causal;
 * c) 80 % art. 160 indebido; 100 % art. 160 N° 1, 5 o 6 y carente de motivo plausible.
 * No se aplica a la indemnización del art. 162 inc. 4 (aviso).
 */
export const RECARGO_168_PORCENTAJES = Object.freeze([30, 50, 80, 100]);
export const RECARGO_168_DEFAULT = 30;

/**
 * Indemnización a todo evento de casa particular (art. 163, incisos finales).
 * Ley 21.269 (1 oct. 2020): el 4,11 % se redistribuyó en 3 % seguro de cesantía
 * (AFC) + 1,11 % que sigue yendo a la cuenta de indemnización en la AFP.
 * La obligación de aportar dura 11 años por cada relación laboral.
 * No se inventa un pago de 30 días por año: la DT indica que no hay IAS legal
 * del inciso segundo para este estatuto.
 */
export const CASA_PARTICULAR_ITE_TASA = 0.0111;
export const CASA_PARTICULAR_ITE_TASA_PREVIA = 0.0411;
export const CASA_PARTICULAR_ITE_DESDE = "2020-10-01";
export const CASA_PARTICULAR_ITE_DESDE_1991 = "1991-01-01";
export const CASA_PARTICULAR_FERIADO_ANUAL = 15;
export const CASA_PARTICULAR_PRUEBA_DIAS = 15;

/**
 * Interés máximo convencional para operaciones reajustables en moneda nacional
 * de menos de 1 año. Art. 63 CT: las remuneraciones adeudadas, ya reajustadas,
 * «devengarán el máximo interés permitido para operaciones reajustables».
 * CMF Certificado N° 08/2026 (D.O. 14-ago-2026, CVE 2855104), tramo 3.a.
 * No es la TMC de créditos en pesos no reajustables.
 * @see https://www.cmfchile.cl/portal/estadisticas/617/w3-propertyvalue-30141.html
 * @see https://www.bcn.cl/leychile/navegar?idNorma=29441
 * @see https://www.dt.gob.cl/portal/1628/w3-article-60612.html
 */
export const TMC_REAJUSTABLE_MENOS_UN_ANIO = 6.72;
export const TMC_REAJUSTABLE_CERTIFICADO = "08/2026";
export const TMC_REAJUSTABLE_DESDE = "2026-08-14";
/** Ley 18.010 art. 11 y consulta DT: el interés diario = tasa anual / 360. */
export const INTERES_MORA_BASE_DIAS = 360;

/**
 * Índice general IPC INE, base anual 2023 = 100. Solo meses publicados
 * en boletines oficiales; no se interpola ni se adelanta el mes en curso.
 * Cruzado con la tabla UTM/IPC del SII (ene–jul 2026) y boletín INE ago-2026
 * (índice general 113,15).
 * @see https://www.ine.gob.cl/estadisticas/economia/indices-de-precios-e-inflacion/indice-de-precios-al-consumidor
 * @see https://www.sii.cl/valores_y_fechas/utm/utm2026.htm
 */
export const IPC_INE = {
  "2025-12": 109.26,
  "2026-01": 109.71,
  "2026-02": 109.7,
  "2026-03": 110.75,
  "2026-04": 112.18,
  "2026-05": 112.37,
  "2026-06": 112.35,
  "2026-07": 112.45,
  "2026-08": 113.15,
};

/**
 * Ejemplo gold de /interes-mora: $1.000.000, vencimiento 31-mar-2026,
 * pago 30-jun-2026, IPC 100 → 101,2 (1,2 %) y tasa 6 % anual.
 * 90 días de mora (1-abr a 29-jun, ambos inclusive). Reajuste $12.000,
 * intereses $15.180, total $1.027.180.
 */
export const INTERES_MORA_GOLD = {
  monto: 1_000_000,
  fechaVencimiento: "2026-03-31",
  fechaPago: "2026-06-30",
  tasaAnualPct: 6,
  ipcInicial: 100,
  ipcFinal: 101.2,
};

export const DISCLAIMER =
  "Documento generado por Haberes. No es un cálculo de la Dirección del Trabajo ni de Previred. No constituye asesoría legal ni previsional. Verifique con su contador o en los canales oficiales.";

export const DISCLAIMER_FINIQUITO =
  "Esta carta no reemplaza la ratificación del finiquito ante la Inspección del Trabajo ni el pago efectivo. No es un documento oficial de la Dirección del Trabajo ni de Previred. No constituye asesoría legal.";

/** Texto legal de la carta: no pegar un artículo entero si es un muro. */
export const TEXTO_LEGAL_MAX = 400;

export function resumirTextoLegal(texto, causalLabel, max = TEXTO_LEGAL_MAX) {
  const t = String(texto || "").trim();
  const label = String(causalLabel || "").trim();
  if (!t) return label ? `El término se funda en ${label}.` : "";
  if (t.length <= max) return t;
  return label ? `El término se funda en ${label}.` : `${t.slice(0, max).replace(/\s+\S*$/, "")}.`;
}
