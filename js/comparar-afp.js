import {
  AFP_COMISION,
  AFP_NOMBRES,
  AFP_OBLIGATORIO,
  FALLBACK_UF,
  TOPE_AFP_SALUD_UF,
  UF_MAX,
  UF_MIN,
} from "./constants.js";
import { roundPeso } from "./sueldo.js";

/**
 * Comparador de comisión AFP para un trabajador dependiente.
 *
 * Usa las tasas de `AFP_COMISION` (tabla SP de octubre 2026) y el mismo
 * tope de 90 UF que `/tope-imponible` y `/sueldo`:
 *   base = min(imponible, TOPE_AFP_SALUD_UF × uf)
 *   comisión = roundPeso(base × tasa / 100)
 *   anual = comisión × 12
 *
 * El 10 % obligatorio se informa una sola vez: es igual en las siete AFP
 * y no se desglosa aquí (vive en `/cotizaciones-previsionales` y `/sueldo`).
 * El SIS es de cargo del empleador (`/cotizacion-empleador`) y no entra.
 * No compara rentabilidad ni recomienda una AFP.
 *
 * @see https://www.spensiones.cl/infoafp
 * @see https://www.spensiones.cl/portal/institucional/594/w3-article-2810.html
 */

const ORDEN_NOMBRE = new Intl.Collator("es");

function salidaCero(motivo, extra = {}) {
  return {
    ok: false,
    motivo,
    imponible: 0,
    uf: 0,
    topeUf: TOPE_AFP_SALUD_UF,
    topePesos: 0,
    base: 0,
    topeAplicado: false,
    cotizacionObligatoria: 0,
    afpActual: null,
    filas: [],
    menor: null,
    ahorroMaxMensual: null,
    ahorroMaxAnual: null,
    ...extra,
  };
}

export function ufCompararAfpValida(uf) {
  const n = Number(uf);
  return Number.isFinite(n) && n >= UF_MIN && n <= UF_MAX;
}

export function calcularCompararAfp(input = {}) {
  const ufRaw = input.uf == null || input.uf === "" ? FALLBACK_UF : Number(input.uf);
  if (!ufCompararAfpValida(ufRaw)) {
    return salidaCero("uf", { uf: Number.isFinite(Number(ufRaw)) ? Number(ufRaw) : 0 });
  }
  const uf = ufRaw;

  const imponibleRaw = Number(input.imponible);
  if (!Number.isFinite(imponibleRaw) || imponibleRaw < 0) {
    return salidaCero("imponible", { uf });
  }
  const imponible = roundPeso(imponibleRaw);

  const afpDato = !(input.afp == null || input.afp === "");
  const afpActualKey = afpDato ? String(input.afp).toLowerCase() : "";
  if (afpActualKey && !Object.prototype.hasOwnProperty.call(AFP_COMISION, afpActualKey)) {
    return salidaCero("afp", { uf, imponible });
  }

  const topePesos = TOPE_AFP_SALUD_UF * uf;
  const base = Math.min(imponible, topePesos);
  const topeAplicado = imponible > topePesos + 0.5;
  const cotizacionObligatoria = roundPeso(base * AFP_OBLIGATORIO);

  const filas = Object.keys(AFP_COMISION).map((key) => {
    const pct = AFP_COMISION[key];
    const mensual = roundPeso(base * (pct / 100));
    return {
      key,
      nombre: AFP_NOMBRES[key],
      pct,
      mensual,
      anual: mensual * 12,
    };
  });
  filas.sort((a, b) => a.mensual - b.mensual || ORDEN_NOMBRE.compare(a.nombre, b.nombre));

  const actual = afpActualKey ? filas.find((f) => f.key === afpActualKey) : null;
  const conAhorro = filas.map((fila) => {
    if (!actual) {
      return { ...fila, esActual: false, ahorroMensual: null, ahorroAnual: null };
    }
    const ahorroMensual = actual.mensual - fila.mensual;
    return {
      ...fila,
      esActual: fila.key === afpActualKey,
      ahorroMensual,
      ahorroAnual: ahorroMensual * 12,
    };
  });

  const menor = conAhorro[0] || null;
  const ahorroMaxMensual = actual && menor ? actual.mensual - menor.mensual : null;

  return {
    ok: true,
    motivo: "",
    imponible,
    uf,
    topeUf: TOPE_AFP_SALUD_UF,
    topePesos,
    base,
    topeAplicado,
    cotizacionObligatoria,
    afpActual: afpActualKey || null,
    filas: conAhorro,
    menor: menor ? menor.key : null,
    ahorroMaxMensual,
    ahorroMaxAnual: ahorroMaxMensual == null ? null : ahorroMaxMensual * 12,
  };
}
