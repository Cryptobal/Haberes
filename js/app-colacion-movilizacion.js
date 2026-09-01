import { clp } from "./format.js";
import { calcularColacionMovilizacion } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function leer() {
  return {
    colacion: numVal("colacion"),
    movilizacion: numVal("movilizacion"),
    sueldoBase: numVal("sueldoBase"),
    colacionNoImponible: Boolean(el("colacionNoImponible")?.checked),
    movilizacionNoImponible: Boolean(el("movilizacionNoImponible")?.checked),
  };
}

function nota(calc) {
  if (!calc.totalAsignaciones) {
    return "Ingrese colación, movilización o ambas para estimar.";
  }
  if (calc.extraImponible === 0) {
    return `No imponibles (art. 41): suman ${clp(calc.totalAsignaciones)} al líquido y $0 a la base imponible.`;
  }
  if (calc.noImponible === 0) {
    return `Tratadas como remuneración: ${clp(calc.extraImponible)} entra a la base imponible. El extra líquido es ${clp(calc.extraLiquido)}, no ${clp(calc.totalAsignaciones)}.`;
  }
  return `Mixto: ${clp(calc.noImponible)} no imponible y ${clp(calc.extraImponible)} a la base. Extra líquido ${clp(calc.extraLiquido)}.`;
}

function render(calc) {
  el("outTotal").textContent = clp(calc.totalAsignaciones);
  el("outColacion").textContent = clp(calc.colacion);
  el("outMovilizacion").textContent = clp(calc.movilizacion);
  el("outNoImponible").textContent = clp(calc.noImponible);
  el("outExtraImponible").textContent = clp(calc.extraImponible);
  el("outExtraLiquido").textContent = clp(calc.extraLiquido);
  el("outNota").textContent = nota(calc);
}

function recalc() {
  render(calcularColacionMovilizacion(leer()));
}

wireNav();
document.getElementById("formColacion")?.addEventListener("input", recalc);
document.getElementById("formColacion")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
