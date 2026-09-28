import { addCalendarMonthsIso } from "./contrato-plazo-fijo.js";
import { parseIsoFecha } from "./feriados.js";

/**
 * Fuero de directores sindicales (Código del Trabajo arts. 243 y 235).
 *
 * Art. 243: el fuero corre desde la elección y hasta seis meses de calendario
 * después de cesar en el cargo, salvo censura, sanción judicial, renuncia al
 * sindicato, término de la empresa o caducidad de la personalidad jurídica
 * (arts. 223 inc. 3° y 227 inc. 2°). Esas excepciones no se modelan: el
 * resultado asume un cese que mantiene la cola de seis meses.
 *
 * Art. 235: solo gozan de ese fuero las más altas mayorías relativas:
 *   menos de 25 y sindicato de empresa → 1 director
 *   25–249 → 3; 250–999 → 5; 1.000–2.999 → 7; 3.000 o más → 9
 *   sindicato de empresa con presencia en dos o más regiones, en el tramo
 *   de 3.000 o más → 11 (9 + 2)
 *
 * El mandato dura no menos de dos años ni más de cuatro (art. 235). Si el
 * plazo pedido queda fuera, igual se calcula el calendario y se marca.
 *
 * No es fuero maternal (art. 201), ni postnatal, ni tutela, ni un monto.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/portal/1628/w3-article-61072.html
 * @see https://www.dt.gob.cl/portal/1628/w3-article-61073.html
 */

export const FUERO_SINDICAL_MESES = 6;
export const MANDATO_MIN_MESES = 24;
export const MANDATO_MAX_MESES = 48;

const TRAMOS = Object.freeze([
  { id: "a", min: 25, max: 249, directores: 3 },
  { id: "b", min: 250, max: 999, directores: 5 },
  { id: "c", min: 1000, max: 2999, directores: 7 },
  { id: "d", min: 3000, max: Infinity, directores: 9 },
]);

function asBool(v, fallback = false) {
  if (v == null || v === "") return fallback;
  return v === true || v === 1 || v === "1" || v === "true" || v === "on";
}

function isoValida(iso) {
  const s = String(iso || "").trim();
  return parseIsoFecha(s) ? s : "";
}

function vacio({
  modo = "",
  motivo = "",
  fechaEleccion = "",
  fechaCese = "",
  aniosMandato = 0,
  mesesMandato = 0,
  afiliados = 0,
  sindicatoEmpresa = true,
} = {}) {
  return {
    ok: false,
    modo,
    motivo,
    fechaEleccion,
    fechaCese,
    fechaTerminoFuero: "",
    mesesFuero: FUERO_SINDICAL_MESES,
    aniosMandato,
    mesesMandato,
    mesesMandatoTotal: 0,
    mandatoFueraDeRango: false,
    afiliados,
    directoresConFuero: 0,
    tramo: "",
    excepcionMultiRegion: false,
    sindicatoEmpresa,
  };
}

/**
 * Cuántos directores gozan del fuero del art. 243 según afiliados (art. 235).
 * @param {object} input
 * @param {number} input.afiliados
 * @param {boolean} [input.sindicatoEmpresa] default true
 * @param {boolean} [input.multiRegion] solo suma 2 en el tramo de 3.000+ si es sindicato de empresa
 */
export function directoresConFuero({
  afiliados = 0,
  sindicatoEmpresa = true,
  multiRegion = false,
} = {}) {
  const n = Math.trunc(Number(afiliados));
  const empresa = asBool(sindicatoEmpresa, true);
  const regiones = asBool(multiRegion, false) && empresa;
  if (!Number.isFinite(n) || n < 1) {
    return {
      ok: false,
      motivo: "afiliados",
      afiliados: 0,
      directores: 0,
      tramo: "",
      excepcionMultiRegion: false,
      sindicatoEmpresa: empresa,
    };
  }
  if (n < 25) {
    if (!empresa) {
      return {
        ok: false,
        motivo: "menos_25",
        afiliados: n,
        directores: 0,
        tramo: "",
        excepcionMultiRegion: false,
        sindicatoEmpresa: false,
      };
    }
    return {
      ok: true,
      motivo: "",
      afiliados: n,
      directores: 1,
      tramo: "empresa_menos_25",
      excepcionMultiRegion: false,
      sindicatoEmpresa: true,
    };
  }
  const tramo = TRAMOS.find((t) => n >= t.min && n <= t.max);
  const extra = tramo.id === "d" && regiones ? 2 : 0;
  return {
    ok: true,
    motivo: "",
    afiliados: n,
    directores: tramo.directores + extra,
    tramo: tramo.id,
    excepcionMultiRegion: extra === 2,
    sindicatoEmpresa: empresa,
  };
}

function calendario({ modo, fechaEleccion, fechaCese, aniosMandato = 0, mesesMandato = 0, mesesMandatoTotal = 0 }) {
  const termino = addCalendarMonthsIso(fechaCese, FUERO_SINDICAL_MESES);
  if (!termino) return vacio({ modo, motivo: "sin_fecha", fechaEleccion, fechaCese, aniosMandato, mesesMandato });
  const fuera = mesesMandatoTotal > 0 && (mesesMandatoTotal < MANDATO_MIN_MESES || mesesMandatoTotal > MANDATO_MAX_MESES);
  return {
    ok: true,
    modo,
    motivo: "",
    fechaEleccion,
    fechaCese,
    fechaTerminoFuero: termino,
    mesesFuero: FUERO_SINDICAL_MESES,
    aniosMandato,
    mesesMandato,
    mesesMandatoTotal,
    mandatoFueraDeRango: fuera,
    afiliados: 0,
    directoresConFuero: 0,
    tramo: "",
    excepcionMultiRegion: false,
    sindicatoEmpresa: true,
  };
}

/**
 * @param {object} input
 * @param {"cese"|"mandato"|"afiliados"} input.modo
 * @param {string} [input.fechaEleccion] YYYY-MM-DD
 * @param {string} [input.fechaCese] YYYY-MM-DD (modo cese)
 * @param {number} [input.aniosMandato]
 * @param {number} [input.mesesMandato]
 * @param {number} [input.afiliados]
 * @param {boolean} [input.sindicatoEmpresa]
 * @param {boolean} [input.multiRegion]
 */
export function calcularFueroSindical(input = {}) {
  const modo = input.modo === "mandato" || input.modo === "afiliados" || input.modo === "cese" ? input.modo : "";
  if (!modo) return vacio({ motivo: "modo" });

  if (modo === "afiliados") {
    const cuenta = directoresConFuero({
      afiliados: input.afiliados,
      sindicatoEmpresa: input.sindicatoEmpresa,
      multiRegion: input.multiRegion,
    });
    if (!cuenta.ok) {
      return vacio({
        modo,
        motivo: cuenta.motivo,
        afiliados: cuenta.afiliados,
        sindicatoEmpresa: cuenta.sindicatoEmpresa,
      });
    }
    return {
      ok: true,
      modo,
      motivo: "",
      fechaEleccion: "",
      fechaCese: "",
      fechaTerminoFuero: "",
      mesesFuero: FUERO_SINDICAL_MESES,
      aniosMandato: 0,
      mesesMandato: 0,
      mesesMandatoTotal: 0,
      mandatoFueraDeRango: false,
      afiliados: cuenta.afiliados,
      directoresConFuero: cuenta.directores,
      tramo: cuenta.tramo,
      excepcionMultiRegion: cuenta.excepcionMultiRegion,
      sindicatoEmpresa: cuenta.sindicatoEmpresa,
    };
  }

  const fechaEleccion = isoValida(input.fechaEleccion);
  if (!fechaEleccion) return vacio({ modo, motivo: "sin_fecha" });

  if (modo === "cese") {
    const fechaCese = isoValida(input.fechaCese);
    if (!fechaCese) return vacio({ modo, motivo: "sin_fecha", fechaEleccion });
    if (fechaCese < fechaEleccion) return vacio({ modo, motivo: "orden", fechaEleccion, fechaCese });
    return calendario({ modo, fechaEleccion, fechaCese });
  }

  const anios = Math.trunc(Number(input.aniosMandato) || 0);
  const meses = Math.trunc(Number(input.mesesMandato) || 0);
  if (anios < 0 || meses < 0 || !Number.isFinite(anios) || !Number.isFinite(meses)) {
    return vacio({ modo, motivo: "sin_plazo", fechaEleccion });
  }
  const total = anios * 12 + meses;
  if (total <= 0) return vacio({ modo, motivo: "sin_plazo", fechaEleccion, aniosMandato: anios, mesesMandato: meses });
  const fechaCese = addCalendarMonthsIso(fechaEleccion, total);
  if (!fechaCese) return vacio({ modo, motivo: "sin_fecha", fechaEleccion, aniosMandato: anios, mesesMandato: meses });
  return calendario({
    modo,
    fechaEleccion,
    fechaCese,
    aniosMandato: anios,
    mesesMandato: meses,
    mesesMandatoTotal: total,
  });
}
