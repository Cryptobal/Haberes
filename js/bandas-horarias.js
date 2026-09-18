import {
  BANDAS_HORARIAS_EDAD_MAX_ANIOS,
  BANDAS_HORARIAS_MAX_MIN,
} from "./constants.js";

/**
 * Bandas horarias de cuidado familiar (Ley 21.561 / Código del Trabajo).
 *
 * Estimación educativa: madres, padres o quienes tengan el cuidado personal
 * de un niño o niña de hasta 12 años pueden anticipar o retrasar hasta 1 hora
 * el inicio de la jornada, con el mismo desplazamiento al término. La duración
 * de la jornada no cambia. Entre los extremos (anticipar 60 y retrasar 60) la
 * DT describe una banda de unas 2 horas de margen en la mañana y en la tarde.
 *
 * Más de 60 minutos no se aplica (`ok: false`, `motivo: "tope"`): el tope es
 * 1 hora. El empleador no puede negarse salvo que la naturaleza del servicio
 * o el horario de funcionamiento de la empresa lo impidan: esa excepción es
 * una nota educativa, no una decisión automática de esta página.
 *
 * No es el tope 40/42 h (`/jornada-40-horas`), ni el promedio del art. 22 bis,
 * ni el pacto 4×3, ni teletrabajo ni jornada parcial.
 *
 * @see https://www.dt.gob.cl/portal/1626/w3-article-125814.html
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1191554
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.mintrab.gob.cl/40horas/
 */

export const SENTIDO_BANDAS_HORARIAS = Object.freeze({
  anticipar: "anticipar",
  retrasar: "retrasar",
});

const MINUTOS_DIA = 24 * 60;

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function parseHoraAMinutos(s) {
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
  if (h === 24) return 0;
  return h * 60 + min;
}

export function minutosAHora(minutos) {
  const wrapped = ((Number(minutos) % MINUTOS_DIA) + MINUTOS_DIA) % MINUTOS_DIA;
  const h = Math.floor(wrapped / 60);
  const min = Math.round(wrapped % 60) % 60;
  return `${pad2(h)}:${pad2(min)}`;
}

export function duracionMinutosEntre(inicioMin, finMin) {
  let d = finMin - inicioMin;
  if (d <= 0) d += MINUTOS_DIA;
  return d;
}

function sentidoNormalizado(raw) {
  return raw === SENTIDO_BANDAS_HORARIAS.retrasar
    ? SENTIDO_BANDAS_HORARIAS.retrasar
    : SENTIDO_BANDAS_HORARIAS.anticipar;
}

function minutosDesplazamiento(raw) {
  if (raw == null || raw === "") {
    return { minutos: BANDAS_HORARIAS_MAX_MIN, excedido: false };
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return { minutos: BANDAS_HORARIAS_MAX_MIN, excedido: false };
  }
  const rounded = Math.round(n);
  if (rounded > BANDAS_HORARIAS_MAX_MIN) {
    return { minutos: rounded, excedido: true };
  }
  return { minutos: Math.max(0, rounded), excedido: false };
}

function vacio({
  motivo = "horario",
  horaInicio = "",
  horaFin = "",
  minutos = BANDAS_HORARIAS_MAX_MIN,
  sentido = SENTIDO_BANDAS_HORARIAS.anticipar,
} = {}) {
  return {
    ok: false,
    motivo,
    horaInicio,
    horaFin,
    horaInicioNueva: "",
    horaFinNueva: "",
    minutos,
    sentido,
    duracionMinutos: 0,
    ventanaInicioMin: "",
    ventanaInicioMax: "",
    ventanaFinMin: "",
    ventanaFinMax: "",
    maxMinutos: BANDAS_HORARIAS_MAX_MIN,
    edadMaxAnios: BANDAS_HORARIAS_EDAD_MAX_ANIOS,
    cruzaMedianoche: false,
  };
}

export function calcularBandasHorarias(input = {}) {
  const sentido = sentidoNormalizado(input.sentido);
  const { minutos, excedido } = minutosDesplazamiento(input.minutos);
  const inicioMin = parseHoraAMinutos(input.horaInicio);
  const finMin = parseHoraAMinutos(input.horaFin);
  const base = { minutos, sentido };

  if (inicioMin == null || finMin == null) {
    return vacio({
      ...base,
      motivo: "horario",
      horaInicio: input.horaInicio ? String(input.horaInicio) : "",
      horaFin: input.horaFin ? String(input.horaFin) : "",
    });
  }

  const horaInicio = minutosAHora(inicioMin);
  const horaFin = minutosAHora(finMin);
  if (excedido) {
    return vacio({
      ...base,
      motivo: "tope",
      horaInicio,
      horaFin,
    });
  }
  if (inicioMin === finMin) {
    return vacio({
      ...base,
      motivo: "duracion",
      horaInicio,
      horaFin,
    });
  }

  const duracionMinutos = duracionMinutosEntre(inicioMin, finMin);
  const delta = sentido === SENTIDO_BANDAS_HORARIAS.anticipar ? -minutos : minutos;
  const horaInicioNuevaMin = inicioMin + delta;
  const horaFinNuevaMin = finMin + delta;

  return {
    ok: true,
    motivo: "",
    horaInicio,
    horaFin,
    horaInicioNueva: minutosAHora(horaInicioNuevaMin),
    horaFinNueva: minutosAHora(horaFinNuevaMin),
    minutos,
    sentido,
    duracionMinutos,
    ventanaInicioMin: minutosAHora(inicioMin - BANDAS_HORARIAS_MAX_MIN),
    ventanaInicioMax: minutosAHora(inicioMin + BANDAS_HORARIAS_MAX_MIN),
    ventanaFinMin: minutosAHora(finMin - BANDAS_HORARIAS_MAX_MIN),
    ventanaFinMax: minutosAHora(finMin + BANDAS_HORARIAS_MAX_MIN),
    maxMinutos: BANDAS_HORARIAS_MAX_MIN,
    edadMaxAnios: BANDAS_HORARIAS_EDAD_MAX_ANIOS,
    cruzaMedianoche: finMin < inicioMin,
  };
}
