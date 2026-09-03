import { JORNADA_DEFAULT } from "./constants.js";
import { clp, num } from "./format.js";
import { calcularDescuentoAtrasosInasistencias } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function leer() {
  return {
    remuneracion: numVal("remuneracion"),
    jornada: numVal("jornada") || JORNADA_DEFAULT,
    diasInasistencia: numVal("diasInasistencia"),
    horasAtraso: numVal("horasAtraso"),
    minutosAtraso: numVal("minutosAtraso"),
  };
}

function render(calc) {
  el("outTotal").textContent = clp(calc.descuentoTotal);
  el("outBruto").textContent = clp(calc.brutoRestante);
  el("outDiario").textContent = calc.valorDiario > 0 ? `$ ${num(calc.valorDiario)}` : "$ 0";
  el("outHora").textContent = calc.valorHora > 0 ? `$ ${num(calc.valorHora)}` : "$ 0";
  el("outDescInasistencia").textContent = clp(calc.descuentoInasistencia);
  el("outDescAtraso").textContent = clp(calc.descuentoAtraso);
  el("outRem").textContent = clp(calc.remuneracion);
  el("outJornada").textContent = `${calc.jornada} h`;

  const notas = [];
  if (calc.diasInasistencia > 0 && calc.minutosTotales > 0) {
    notas.push(
      "Inasistencia y atraso son conceptos distintos: no descuente el mismo tiempo dos veces (día completo + minutos del mismo día).",
    );
  }
  if (calc.descuentoTotalRaw > calc.remuneracion && calc.remuneracion > 0) {
    notas.push("El descuento no puede superar la remuneración mensual pactada.");
  }
  if (calc.diasInasistencia > 0) {
    notas.push(
      "Si la jornada diaria no es uniforme, puede corresponder calcular las horas efectivamente no trabajadas en lugar del valor día.",
    );
  }
  el("outNota").textContent = notas.join(" ");
}

function recalc() {
  render(calcularDescuentoAtrasosInasistencias(leer()));
}

wireNav();
const form = document.getElementById("formDescuentoAtrasos");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
