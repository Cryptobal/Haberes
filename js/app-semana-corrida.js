import { clp, num } from "./format.js";
import { calcularSemanaCorrida } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function leer() {
  return {
    remuneracionesVariables: numVal("remuneracionesVariables"),
    diasQueDebioLaborar: numVal("diasQueDebioLaborar"),
    domingosFestivos: numVal("domingosFestivos"),
  };
}

function render(calc) {
  el("outTotal").textContent = clp(calc.total);
  el("outPromedio").textContent = clp(Math.round(calc.promedioDiario));
  el("outVariables").textContent = clp(Math.round(calc.remuneracionesVariables));
  el("outDias").textContent = String(calc.diasQueDebioLaborar);
  el("outDescansos").textContent = String(calc.domingosFestivos);
  if (calc.diasQueDebioLaborar <= 0) {
    el("outNota").textContent = "Indique los días en que legalmente debió laborar";
  } else if (calc.domingosFestivos <= 0) {
    el("outNota").textContent = "Sin domingo ni festivo del período el haber es $0";
  } else {
    el("outNota").textContent = `Promedio diario ≈ ${num(calc.promedioDiario)} × ${calc.domingosFestivos} día${calc.domingosFestivos === 1 ? "" : "s"} de descanso`;
  }
}

function recalc() {
  render(calcularSemanaCorrida(leer()));
}

wireNav();
document.getElementById("formSemanaCorrida")?.addEventListener("input", recalc);
document.getElementById("formSemanaCorrida")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
