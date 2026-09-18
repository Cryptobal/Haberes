import { roundPeso } from "./sueldo.js";

/**
 * Permiso sin goce de sueldo (pacto entre trabajador y empleador).
 *
 * El Código del Trabajo no regula de forma sistemática esta figura ni
 * reconoce un derecho unilateral a exigirla. La DT la trata como
 * suspensión convencional de la relación laboral: cesan la obligación de
 * prestar servicios y la de pagar remuneración, sin afectar la vigencia
 * del contrato (ORD. N°4593; consulta DT 60216).
 *
 * Estimación educativa del mes:
 *   descuento = round((sueldoMensual / diasBase) × diasPermiso)
 *   sueldoMes = sueldoMensual − descuento
 *
 * `diasBase` es configurable. Por defecto: días corridos del mes
 * calendario. Alternativa: días laborables del mes (el usuario indica
 * la base, p. ej. 20). No hay un máximo legal anual general en el CT;
 * la duración la fijan las partes.
 *
 * No es finiquito, atraso/inasistencia injustificada, licencia médica
 * ni los permisos legales pagados (matrimonio, fallecimiento, paternidad,
 * prenatal).
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-110215.html
 * @see https://www.dt.gob.cl/portal/1628/w3-article-60216.html
 * @see https://www.dt.gob.cl/portal/1628/w3-article-60602.html
 */

export const TIPO_BASE_PERMISO_SIN_GOCE = Object.freeze({
  corridos: "corridos",
  laborables: "laborables",
});

function noNegativo(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return v;
}

export function diasCorridosDelMes(anio, mes) {
  const y = Number(anio);
  const m = Number(mes);
  if (!Number.isInteger(y) || y < 1900 || y > 2100) return 0;
  if (!Number.isInteger(m) || m < 1 || m > 12) return 0;
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function anioMesDe(input) {
  const y = Number(input.anio);
  const m = Number(input.mes);
  if (Number.isInteger(y) && Number.isInteger(m)) return { anio: y, mes: m };
  const iso = String(input.mesIso || "").trim();
  const hit = iso.match(/^(\d{4})-(\d{2})$/);
  if (hit) return { anio: Number(hit[1]), mes: Number(hit[2]) };
  return { anio: 0, mes: 0 };
}

function vacio({
  sueldoMensual = 0,
  diasBase = 0,
  diasPermiso = 0,
  tipoBase = TIPO_BASE_PERMISO_SIN_GOCE.corridos,
  anio = 0,
  mes = 0,
  motivo = "",
} = {}) {
  return {
    ok: false,
    motivo,
    sueldoMensual,
    diasBase,
    diasPermiso,
    diasPermisoAplicados: 0,
    tipoBase,
    anio,
    mes,
    valorDia: 0,
    descuento: 0,
    sueldoMes: 0,
    topeAplicado: false,
  };
}

export function calcularPermisoSinGoce(input = {}) {
  const sueldoMensual = roundPeso(noNegativo(input.sueldoMensual));
  const tipoBase =
    input.tipoBase === TIPO_BASE_PERMISO_SIN_GOCE.laborables
      ? TIPO_BASE_PERMISO_SIN_GOCE.laborables
      : TIPO_BASE_PERMISO_SIN_GOCE.corridos;
  const { anio, mes } = anioMesDe(input);
  const diasPermiso = noNegativo(input.diasPermiso);
  let diasBase = Number(input.diasBase);
  if (!Number.isFinite(diasBase) || diasBase <= 0) {
    diasBase = tipoBase === TIPO_BASE_PERMISO_SIN_GOCE.corridos ? diasCorridosDelMes(anio, mes) : 0;
  }

  const base = { sueldoMensual, diasPermiso, tipoBase, anio, mes, diasBase: diasBase > 0 ? diasBase : 0 };

  if (diasBase <= 0) {
    return vacio({ ...base, motivo: "dias_base" });
  }

  const topeAplicado = diasPermiso > diasBase;
  const diasPermisoAplicados = Math.min(diasPermiso, diasBase);
  const valorDia = sueldoMensual / diasBase;
  const descuento = Math.min(sueldoMensual, roundPeso(valorDia * diasPermisoAplicados));
  const sueldoMes = sueldoMensual - descuento;

  return {
    ok: true,
    motivo: "",
    sueldoMensual,
    diasBase,
    diasPermiso,
    diasPermisoAplicados,
    tipoBase,
    anio,
    mes,
    valorDia,
    descuento,
    sueldoMes,
    topeAplicado,
  };
}
