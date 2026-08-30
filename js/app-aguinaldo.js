import { clp } from "./format.js";
import { calcularAguinaldo } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function modoActual() {
  return document.querySelector('input[name="modo"]:checked')?.value || "fijo";
}

function syncCampos() {
  const modo = modoActual();
  const fijo = el("campoFijo");
  const pct = el("campoPorcentaje");
  if (fijo) fijo.hidden = modo !== "fijo";
  if (pct) pct.hidden = modo !== "porcentaje";
}

function leer() {
  return {
    modo: modoActual(),
    montoFijo: numVal("montoFijo"),
    porcentaje: numVal("porcentaje"),
    sueldoBase: numVal("sueldoBase"),
    trabajadores: numVal("trabajadores"),
    imponible: !el("noImponible")?.checked,
  };
}

function render(calc) {
  el("outTotal").textContent = clp(calc.totalPlanilla);
  el("outPorTrabajador").textContent = clp(calc.porTrabajador);
  el("outN").textContent = String(calc.trabajadores);
  el("outImponible").textContent = calc.imponible ? "Sí" : "No";
  el("outExtraLiquido").textContent = clp(calc.extraLiquido);
  el("outExtraDescuentos").textContent = clp(calc.extraDescuentos);
  el("outExtraPlanilla").textContent = clp(calc.extraLiquidoPlanilla);
  if (!calc.porTrabajador) {
    el("outNota").textContent = "Ingrese un monto o un porcentaje para presupuestar.";
    return;
  }
  el("outNota").textContent = calc.imponible
    ? `Haber imponible: el extra líquido por persona es ${clp(calc.extraLiquido)}, no ${clp(calc.porTrabajador)}.`
    : `Marcado no imponible: el extra líquido por persona es el haber completo (${clp(calc.porTrabajador)}).`;
}

function recalc() {
  syncCampos();
  render(calcularAguinaldo(leer()));
}

wireNav();
document.getElementById("formAguinaldo")?.addEventListener("input", recalc);
document.getElementById("formAguinaldo")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
