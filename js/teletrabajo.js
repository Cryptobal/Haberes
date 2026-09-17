import {
  TELETRABAJO_DESCONEXION_MIN_H,
  TELETRABAJO_PERIODO_H,
  TELETRABAJO_TOLERANCIA_H,
} from "./constants.js";
import { DIAS_MES_CONVENCIONAL } from "./novedades.js";
import { roundPeso } from "./sueldo.js";

/**
 * Derecho a desconexión y referencia de días en teletrabajo / trabajo a
 * distancia (Ley 21.220 / arts. 152 quáter A y ss., en especial 152 quáter J).
 *
 * horasDesconexion = 24 − jornada diaria de conectividad. Cumple si
 * horasDesconexion ≥ 12 (tolerancia 0,01 h). La modalidad es informativa:
 * no cambia la fórmula. valorDia = rem/30 es solo referencia de días bajo
 * modalidad: no cotiza, no es líquido ni finiquito.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1143741
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/portal/1628/w3-article-118665.html
 */

export const TELETRABAJO_MODALIDADES = Object.freeze([
  "teletrabajo",
  "trabajoADistancia",
  "hibrido",
]);

export const TELETRABAJO_MODALIDAD_LABEL = Object.freeze({
  teletrabajo: "Teletrabajo",
  trabajoADistancia: "Trabajo a distancia",
  hibrido: "Híbrido",
});

function parseHora(s) {
  if (s == null) return null;
  const t = String(s).trim();
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const sec = Number(m[3] || 0);
  if (!Number.isFinite(h) || !Number.isFinite(min) || !Number.isFinite(sec)) return null;
  if (h > 24 || min > 59 || sec > 59) return null;
  if (h === 24 && (min > 0 || sec > 0)) return null;
  return h + min / 60 + sec / 3600;
}

export function horasJornadaDesdeIntervalo(inicio, fin) {
  const a = parseHora(inicio);
  const b = parseHora(fin);
  if (a == null || b == null) return null;
  let diff = b - a;
  if (diff < 0) diff += TELETRABAJO_PERIODO_H;
  return diff;
}

function clampHoras(n) {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(TELETRABAJO_PERIODO_H, n);
}

function modalidadNormalizada(raw) {
  const v = String(raw || "").trim();
  if (TELETRABAJO_MODALIDADES.includes(v)) return v;
  return "teletrabajo";
}

export function calcularTeletrabajo(input = {}) {
  const horasRaw = input.horasJornadaDiaria;
  const hasHoras = horasRaw != null && horasRaw !== "" && Number.isFinite(Number(horasRaw));
  const fromInterval = horasJornadaDesdeIntervalo(input.horaInicioJornada, input.horaFinJornada);
  let fuenteJornada = "ninguna";
  let horasJornadaDiaria = 0;
  if (hasHoras) {
    horasJornadaDiaria = clampHoras(Number(horasRaw));
    fuenteJornada = "horas";
  } else if (fromInterval != null) {
    horasJornadaDiaria = clampHoras(fromInterval);
    fuenteJornada = "intervalo";
  }
  const horasDesconexion = TELETRABAJO_PERIODO_H - horasJornadaDiaria;
  const cumpleDesconexion =
    horasDesconexion + TELETRABAJO_TOLERANCIA_H >= TELETRABAJO_DESCONEXION_MIN_H;
  const remuneracionMensual = roundPeso(Math.max(0, Number(input.remuneracionMensual) || 0));
  let diasTeletrabajoMes = Number(input.diasTeletrabajoMes);
  if (!Number.isFinite(diasTeletrabajoMes) || diasTeletrabajoMes < 0) diasTeletrabajoMes = 0;
  diasTeletrabajoMes = Math.min(31, diasTeletrabajoMes);
  const valorDia = remuneracionMensual > 0 ? remuneracionMensual / DIAS_MES_CONVENCIONAL : 0;
  const estimacionDiasModalidad = roundPeso(valorDia * diasTeletrabajoMes);
  const modalidad = modalidadNormalizada(input.modalidad);
  return {
    ok: true,
    horasJornadaDiaria,
    horasDesconexion,
    cumpleDesconexion,
    fuenteJornada,
    horaInicioJornada: input.horaInicioJornada ? String(input.horaInicioJornada) : "",
    horaFinJornada: input.horaFinJornada ? String(input.horaFinJornada) : "",
    remuneracionMensual,
    diasTeletrabajoMes,
    valorDia,
    estimacionDiasModalidad,
    modalidad,
    modalidadLabel: TELETRABAJO_MODALIDAD_LABEL[modalidad],
    desconexionMinH: TELETRABAJO_DESCONEXION_MIN_H,
    periodoH: TELETRABAJO_PERIODO_H,
    toleranciaH: TELETRABAJO_TOLERANCIA_H,
  };
}
