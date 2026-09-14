import { FALLBACK_UF, TOPE_AFP_SALUD_UF } from "./constants.js";
import { clp, num } from "./format.js";
import { calcularTrabajoPesado } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

let indicadores = { uf: FALLBACK_UF };

function leer() {
  return {
    remuneracionImponible: numVal("remuneracionImponible"),
    calificacion: el("calificacion")?.value || "pesado",
    aniosCotizados: numVal("aniosCotizados"),
  };
}

function render(calc) {
  el("outTotal").textContent = clp(calc.totalMes);
  el("outTrabajador").textContent = clp(calc.cotTrabajador);
  el("outEmpleador").textContent = clp(calc.cotEmpleador);
  el("outBase").textContent = clp(Math.round(calc.imponibleEfectiva));
  el("outTope").textContent = clp(Math.round(calc.topeAfp));
  el("outTasaTrab").textContent = `${num(calc.tasaTrab, 0)} %`;
  el("outTasaEmp").textContent = `${num(calc.tasaEmp, 0)} %`;
  el("outRebaja").textContent =
    calc.aniosCotizados > 0 ? `${num(calc.aniosRebaja, 0)} años` : "—";

  const tipo = calc.calificacion === "menos_pesado" ? "menos pesado (1 % + 1 %)" : "pesado (2 % + 2 %)";
  if (calc.topeAplicado) {
    el("outNota").textContent =
      `Sueldo sobre el tope AFP: la cotización se calcula sobre ${num(TOPE_AFP_SALUD_UF, 0)} UF (${tipo}).`;
  } else if (calc.aniosCotizados > 0) {
    el("outNota").textContent =
      `Calificación ${tipo}. Rebaja estimada con bloques de 5 años (tope ${num(calc.maxRebaja, 0)} años).`;
  } else {
    el("outNota").textContent =
      `Base bajo el tope de ${num(TOPE_AFP_SALUD_UF, 0)} UF. Calificación ${tipo}.`;
  }
}

function recalc() {
  render(calcularTrabajoPesado(leer(), indicadores));
}

wireNav();
document.getElementById("formTrabajoPesado")?.addEventListener("input", recalc);
document.getElementById("formTrabajoPesado")?.addEventListener("change", recalc);
recalc();
mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
