import { clp } from "./format.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";
import { calcularViatico } from "./viatico.js";

function leer() {
  return {
    montoDiario: numVal("montoDiario"),
    dias: numVal("dias"),
    sueldoBase: numVal("sueldoBase"),
    tratarComoNoImponible: Boolean(el("tratarComoNoImponible")?.checked),
  };
}

function nota(calc) {
  if (!calc.total) {
    return "Ingrese monto diario y días de comisión para estimar.";
  }
  if (calc.tratarComoNoImponible) {
    return `No imponible (art. 41): suma ${clp(calc.total)} al líquido y $0 a cotizaciones.`;
  }
  return `Tratado como remuneración: ${clp(calc.extraImponible)} entra a la base imponible. El extra líquido es ${clp(calc.extraLiquido)}, menor que el bruto ${clp(calc.total)}.`;
}

function render(calc) {
  el("outTotal").textContent = clp(calc.total);
  el("outNoImponible").textContent = clp(calc.noImponible);
  el("outExtraImponible").textContent = clp(calc.extraImponible);
  el("outExtraLiquido").textContent = clp(calc.extraLiquido);
  el("outNota").textContent = nota(calc);
}

function recalc() {
  render(calcularViatico(leer()));
}

wireNav();
document.getElementById("formViatico")?.addEventListener("input", recalc);
document.getElementById("formViatico")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
