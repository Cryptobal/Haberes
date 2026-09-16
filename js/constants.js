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
