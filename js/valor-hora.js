import { IMM, JORNADA_DEFAULT } from "./constants.js";
import { roundPeso, valorHoraExtra, valorHoraOrdinaria } from "./sueldo.js";

/**
 * Valor de la hora ordinaria (resultado principal) y de 1 hora extra al 50 %.
 * Reutiliza el divisor DT de sueldo.js: (sueldo / 30) × 28 / (jornada × 4).
 *
 * El redondeo es al peso sobre el valor exacto. No se redondea la hora
 * ordinaria y después se multiplica por 1,5: 1.000.000 / 42 h da
 * 5.555,55… → $5.556, y la extra 8.333,33… → $8.333.
 *
 * Sueldo ≤ 0 o jornada ≤ 0 devuelve ceros. No sustituye una jornada
 * inválida por JORNADA_DEFAULT (eso lo hace la interfaz si el campo está vacío).
 */
export function calcularValorHora({
  sueldoBase = 0,
  jornada = JORNADA_DEFAULT,
} = {}) {
  const sueldo = Number(sueldoBase);
  const jRaw = Number(jornada);
  const sueldoOk = Number.isFinite(sueldo) && sueldo > 0;
  const jornadaOk = Number.isFinite(jRaw) && jRaw > 0;
  const ordinaria = sueldoOk && jornadaOk ? valorHoraOrdinaria(sueldo, jRaw) : 0;
  const extra = sueldoOk && jornadaOk ? valorHoraExtra(sueldo, jRaw) : 0;
  const immHora = jornadaOk ? valorHoraOrdinaria(IMM, jRaw) : 0;
  return {
    sueldoBase: sueldoOk ? sueldo : 0,
    jornada: jornadaOk ? jRaw : 0,
    imm: IMM,
    valorHoraOrdinaria: ordinaria,
    valorHoraOrdinariaRedondeada: roundPeso(ordinaria),
    valorHoraExtra: extra,
    valorHoraExtraRedondeada: roundPeso(extra),
    valorHoraImm: immHora,
    valorHoraImmRedondeada: roundPeso(immHora),
  };
}
