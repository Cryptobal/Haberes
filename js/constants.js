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

export const IAS_TOPE_ANIOS = 11;

export const DISCLAIMER =
  "Estimación generada por inteligencia artificial. No es un cálculo de la Dirección del Trabajo ni de Previred. No constituye asesoría legal ni previsional. Verifique siempre con su contador o en los canales oficiales.";

export const DISCLAIMER_FINIQUITO =
  "Esta carta es una estimación de software. No reemplaza la ratificación del finiquito ante la Inspección del Trabajo. No es un documento oficial de la Dirección del Trabajo ni de Previred. No constituye asesoría legal.";
