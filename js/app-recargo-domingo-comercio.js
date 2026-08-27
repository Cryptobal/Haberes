import { JORNADA_DEFAULT } from "./constants.js";
import { clp, num } from "./format.js";
import { calcularRecargoDomingoComercio } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function leer() {
  return {
    sueldoBase: numVal("sueldoBase"),
    jornada: numVal("jornada") || JORNADA_DEFAULT,
    horasOrdinarias: numVal("horasDomingo"),
  };
}

function render(calc) {
  el("outTotal").textContent = clp(Math.round(calc.recargoTotal));
  el("outHoraOrd").textContent = clp(Math.round(calc.valorHoraOrdinaria));
  el("outRecargoHora").textContent = clp(Math.round(calc.recargoHora));
  el("outHoraDomingo").textContent = clp(Math.round(calc.horaDomingo));
  el("outHoras").textContent = String(calc.horasOrdinarias);
  el("outJornada").textContent = `${calc.jornada} h`;
  el("outHoraNota").textContent =
    calc.recargoHora > 0
      ? `Recargo por hora ≈ ${num(calc.recargoHora)} (30 % de la hora ordinaria)`
      : "";
}

function recalc() {
  render(calcularRecargoDomingoComercio(leer()));
}

wireNav();
document.getElementById("formRecargoDomingo")?.addEventListener("input", recalc);
document.getElementById("formRecargoDomingo")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
