/** Valores oficiales usados por Haberes. No inventar cifras. */

export const FALLBACK_UF = 40854.01;
export const FALLBACK_UTM = 71649;
export const UF_MIN = 20000;
export const UF_MAX = 80000;
export const INDICADORES_CACHE_MS = 12 * 60 * 60 * 1000;
export const MINDICADOR_URL = "https://mindicador.cl/api";

/** Ingreso mínimo mensual — Ley 21.830 */
export const IMM = 553553;

/** Tope mensual gratificación art. 50 (4,75 IMM / 12) */
export const GRATIFICACION_TASA = 0.25;
export const GRATIFICACION_TOPE = 219115;

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
 * Seguro de cesantía de cargo del empleador — Ley 19.728.
 * Indefinido 2,4 %; plazo fijo 3,0 %. Misma base y tope de 135,2 UF que el
 * 0,6 % del trabajador. No se inventa un tope distinto.
 */
export const CESANTIA_EMPLEADOR_INDEFINIDO = 0.024;
export const CESANTIA_EMPLEADOR_PLAZO_FIJO = 0.03;

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
