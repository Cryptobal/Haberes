import { DIAS_MES_CONVENCIONAL } from "./novedades.js";
import { roundPeso } from "./sueldo.js";

/**
 * Días de descanso compensatorio (art. 38 CT): un día por cada domingo
 * trabajado y otro por cada festivo en que se prestaron servicios, menos
 * los descansos ya otorgados. No es el recargo 30 % del art. 38 N°7.
 *
 * El valor día (rem / 30) y su producto son una estimación educativa de
 * referencia. El Código no fija un porcentaje general para sustituir el
 * descanso; solo permite remunerar los días que excedan de uno semanal
 * con un piso del art. 32 (no se calcula aquí).
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-61852.html
 * @see https://www.dt.gob.cl/legislacion/1624/w3-article-111155.html
 */

function enteroNoNegativo(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.floor(v);
}

export function calcularDescansoCompensatorio(input = {}) {
  const domingos = enteroNoNegativo(input.domingos);
  const festivos = enteroNoNegativo(input.festivos);
  const otorgados = enteroNoNegativo(input.otorgados);
  const remuneracion = Math.max(0, Number(input.remuneracion) || 0);
  const generados = domingos + festivos;
  const pendientes = Math.max(0, generados - otorgados);
  const valorDia = remuneracion > 0 ? remuneracion / DIAS_MES_CONVENCIONAL : 0;
  return {
    ok: true,
    domingos,
    festivos,
    otorgados,
    generados,
    pendientes,
    remuneracion: roundPeso(remuneracion),
    valorDia,
    estimacion: roundPeso(valorDia * pendientes),
  };
}
