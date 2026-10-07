/**
 * Rango de multa administrativa de la Dirección del Trabajo.
 *
 * Texto vigente del D.F.L. N° 1 de 2002 (Código del Trabajo),
 * versión Ley Chile fechaVersion 2026-07-23:
 * https://www.bcn.cl/leychile/navegar?idNorma=207436
 *
 * - Art. 505 bis: micro 1–9, pequeña 10–49, mediana 50–199, grande 200+.
 * - Art. 506 incisos 2° a 5°: régimen general en UTM por tamaño.
 * - Art. 506 inciso final: fuero sindical, 14 a 70 UTM (no depende del tamaño).
 * - Art. 506 inciso 6°: las multas especiales «se podrá» duplicar y triplicar
 *   si se dan las condiciones de los incisos 4° y 5° y la normativa de la DT.
 *   No fija un multiplicador automático; esta función no lo aplica.
 * - Art. 208 inciso 1°: protección a la maternidad, 14 a 70 UTM; se duplica
 *   en reincidencia.
 * - Art. 292: prácticas antisindicales por tamaño. La reincidencia en mediana
 *   y grande remite al inciso 6° del art. 506 (no se multiplica aquí).
 * - Art. 152 quinquies I: infracciones de ese capítulo se sancionan con las
 *   multas del art. 506 (escala general por tamaño) y se duplican en reincidencia.
 * - Art. 506 bis y 506 ter, y el inciso final del art. 511 (plazos del Título
 *   en días hábiles, Ley 19.880 art. 25).
 *
 * La DT fija el monto dentro del rango. Esto no es asesoría legal.
 * UTM de octubre 2026 publicada por el SII: $72.151
 * (https://www.sii.cl/valores_y_fechas/utm/utm2026.htm).
 */

export const UTM_OCTUBRE_2026 = 72151;

/** Escala general del art. 506, incisos 2° a 5°. [mínimo, máximo] en UTM. */
export const RANGOS_ART_506 = {
  micro: [1, 5],
  pequena: [1, 10],
  mediana: [2, 40],
  grande: [3, 60],
};

/** Art. 292 números 1 a 4. [mínimo, máximo] en UTM. */
export const RANGOS_ART_292 = {
  micro: [5, 25],
  pequena: [10, 50],
  mediana: [15, 150],
  grande: [20, 300],
};

const INCISO_506 = {
  micro: "2°",
  pequena: "3°",
  mediana: "4°",
  grande: "5°",
};

const NOMBRE_TAMANO = {
  micro: "Microempresa",
  pequena: "Pequeña empresa",
  mediana: "Mediana empresa",
  grande: "Gran empresa",
};

const TRABAJADORES_TAMANO = {
  micro: "1 a 9",
  pequena: "10 a 49",
  mediana: "50 a 199",
  grande: "200 o más",
};

function salidaCero(motivo, extra = {}) {
  return {
    ok: false,
    motivo,
    trabajadores: 0,
    tamano: "",
    tamanoNombre: "",
    trabajadoresTramo: "",
    regimen: "",
    articulo: "",
    inciso: "",
    utm: 0,
    minUtm: 0,
    maxUtm: 0,
    minPesos: 0,
    maxPesos: 0,
    reincidencia: false,
    reincidenciaEfecto: "sin_efecto",
    factor: 1,
    higiene: false,
    sustitucion: {
      procede: false,
      modalidad: null,
      plazoSolicitudDiasHabiles: null,
      plazoProgramaDiasHabiles: null,
      aumentoTopePct: null,
      plazoCorreccion506BisDiasHabiles: null,
    },
    ...extra,
  };
}

export function tamañoPorTrabajadores(n) {
  if (!Number.isInteger(n) || n < 1) return "";
  if (n <= 9) return "micro";
  if (n <= 49) return "pequena";
  if (n <= 199) return "mediana";
  return "grande";
}

function pesosUtm(utmCount, utm) {
  return Math.round(utmCount * utm);
}

function sustitucionDe(tamano, higiene) {
  const procede = tamano === "micro" || tamano === "pequena";
  if (!procede) {
    return {
      procede: false,
      modalidad: null,
      plazoSolicitudDiasHabiles: null,
      plazoProgramaDiasHabiles: null,
      aumentoTopePct: null,
      plazoCorreccion506BisDiasHabiles: null,
    };
  }
  return {
    procede: true,
    modalidad: higiene ? "pac" : "capacitacion",
    plazoSolicitudDiasHabiles: 30,
    plazoProgramaDiasHabiles: 60,
    aumentoTopePct: 25,
    plazoCorreccion506BisDiasHabiles: 5,
  };
}

/**
 * @param {object} input
 * @param {number} input.trabajadores entero ≥ 1
 * @param {"general"|"fuero_sindical"|"maternidad"|"antisindical"|"plataformas"} input.regimen
 * @param {boolean} [input.reincidencia]
 * @param {boolean} [input.higiene] solo elige la modalidad del art. 506 ter
 * @param {number} input.utm valor de la UTM en pesos, explícito
 */
export function calcularMultasInspeccion(input = {}) {
  const trabajadores = Number(input.trabajadores);
  if (!Number.isInteger(trabajadores) || trabajadores < 1) {
    return salidaCero("trabajadores");
  }
  const tamano = tamañoPorTrabajadores(trabajadores);
  const utm = Number(input.utm);
  if (!Number.isFinite(utm) || utm <= 0) {
    return salidaCero("utm", { trabajadores, tamano });
  }
  const regimen = String(input.regimen || "");
  const reincidencia = Boolean(input.reincidencia);
  const higiene = Boolean(input.higiene);

  let base;
  let articulo;
  let inciso;
  let reincidenciaEfecto = "sin_efecto";
  let factor = 1;

  if (regimen === "general") {
    base = RANGOS_ART_506[tamano];
    articulo = "506";
    inciso = INCISO_506[tamano];
  } else if (regimen === "fuero_sindical") {
    base = [14, 70];
    articulo = "506";
    inciso = "final";
  } else if (regimen === "maternidad") {
    base = [14, 70];
    articulo = "208";
    inciso = "1°";
    if (reincidencia) {
      factor = 2;
      reincidenciaEfecto = "duplica";
    }
  } else if (regimen === "antisindical") {
    base = RANGOS_ART_292[tamano];
    articulo = "292";
    inciso = { micro: "N° 1", pequena: "N° 2", mediana: "N° 3", grande: "N° 4" }[tamano];
    if (reincidencia && (tamano === "mediana" || tamano === "grande")) {
      reincidenciaEfecto = "remite_inciso_6";
    }
  } else if (regimen === "plataformas") {
    base = RANGOS_ART_506[tamano];
    articulo = "152 quinquies I";
    inciso = INCISO_506[tamano];
    if (reincidencia) {
      factor = 2;
      reincidenciaEfecto = "duplica";
    }
  } else {
    return salidaCero("regimen", { trabajadores, tamano, utm });
  }

  const minUtm = base[0] * factor;
  const maxUtm = base[1] * factor;

  return {
    ok: true,
    motivo: "",
    trabajadores,
    tamano,
    tamanoNombre: NOMBRE_TAMANO[tamano],
    trabajadoresTramo: TRABAJADORES_TAMANO[tamano],
    regimen,
    articulo,
    inciso,
    utm,
    minUtm,
    maxUtm,
    minPesos: pesosUtm(minUtm, utm),
    maxPesos: pesosUtm(maxUtm, utm),
    reincidencia,
    reincidenciaEfecto,
    factor,
    higiene,
    sustitucion: sustitucionDe(tamano, higiene),
  };
}
