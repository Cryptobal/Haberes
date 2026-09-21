import { roundPeso } from "./sueldo.js";

/**
 * Promedio de remuneraciones variables (art. 172 del Código del Trabajo).
 *
 * Estima la «última remuneración» cuando hay componentes variables
 * (comisiones, tratos, bonos de producción u otras variables periódicas)
 * usando el promedio de lo ganado en los últimos tres meses calendario,
 * o los meses efectivamente trabajados si son menos de tres.
 *
 * Sirve como base orientativa para alimentar IAS (art. 163), aviso previo
 * (art. 162) u otros cálculos que parten de un monto único. No aplica el
 * tope 90 UF (eso vive en esas calculadoras). No es líquido ni liquidación
 * Previred. No inventa % legales de comisión.
 *
 * Fórmula:
 *   total_mes_i = fija_i + variables_i (+ gratificación_i si marcada)
 *   n = cantidad de meses con total > 0 (1–3); 0 o vacío no cuenta
 *   promedio = round(suma(total_mes) / n)  (pesos enteros, half-up)
 *
 * Gold 2026: 800.000+200.000 / 800.000+400.000 / 800.000+100.000
 * → 1.000.000 + 1.200.000 + 900.000 = 3.100.000 / 3
 * → round(1.033.333,333…) = 1.033.333.
 *
 * La gratificación del art. 50 es casuística en el art. 172: default OFF.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 */

function noNegativo(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return v;
}

function mesVacio(indice) {
  return {
    indice,
    fija: 0,
    variables: 0,
    gratificacion: 0,
    total: 0,
    valido: false,
  };
}

function normalizarMes(raw, indice, incluirGratificacion) {
  const src = raw && typeof raw === "object" ? raw : {};
  const fija = noNegativo(src.fija);
  const variables = noNegativo(src.variables);
  const gratificacion = noNegativo(src.gratificacion);
  const total = roundPeso(
    fija + variables + (incluirGratificacion ? gratificacion : 0),
  );
  return {
    indice,
    fija,
    variables,
    gratificacion,
    total,
    valido: total > 0,
  };
}

/**
 * @param {{
 *   meses?: Array<{ fija?: number, variables?: number, gratificacion?: number }>,
 *   incluirGratificacion?: boolean,
 * }} [input]
 */
export function calcularPromedioRemuneraciones(input = {}) {
  const incluirGratificacion = Boolean(input.incluirGratificacion);
  const raw = Array.isArray(input.meses) ? input.meses : [];
  const meses = [0, 1, 2].map((i) =>
    i < raw.length
      ? normalizarMes(raw[i], i + 1, incluirGratificacion)
      : mesVacio(i + 1),
  );
  const validos = meses.filter((m) => m.valido);
  const n = validos.length;
  const suma = validos.reduce((acc, m) => acc + m.total, 0);

  if (n === 0) {
    return {
      ok: false,
      motivo: "meses",
      incluirGratificacion,
      n: 0,
      suma: 0,
      promedio: 0,
      meses,
    };
  }

  return {
    ok: true,
    motivo: "",
    incluirGratificacion,
    n,
    suma,
    promedio: roundPeso(suma / n),
    meses,
  };
}
