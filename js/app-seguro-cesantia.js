import { FALLBACK_UF, TOPE_CESANTIA_UF } from "./constants.js";
import { clp, num } from "./format.js";
import { calcularSeguroCesantia } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

let indicadores = { uf: FALLBACK_UF };

function leer() {
  return {
    sueldoBase: numVal("sueldoImponible"),
    contrato: el("contrato")?.value || "indefinido",
  };
}

function pct(n, digits = 1) {
  return `${num(Number(n) * 100, digits)} %`;
}

function render(calc) {
  el("outTotal").textContent = clp(calc.total);
  el("outTrabajador").textContent = clp(calc.trabajador.monto);
  el("outEmpleador").textContent = clp(calc.empleador.monto);
  el("outCic").textContent = clp(calc.cuentaIndividual.monto);
  el("outFcs").textContent = clp(calc.fondoSolidario.monto);
  el("outEmpCic").textContent = clp(calc.empleador.cic.monto);
  el("outEmpFcs").textContent = clp(calc.empleador.fcs.monto);
  el("outBaseCes").textContent = clp(Math.round(calc.baseCesantia));
  el("outTopeCes").textContent = clp(Math.round(calc.topeCesantia));
  el("outTasaTrab").textContent = pct(calc.trabajador.tasa, 1);
  el("outTasaEmp").textContent = pct(calc.empleador.tasa, 1);
  el("outTasaCic").textContent = pct(calc.trabajador.cic.tasa + calc.empleador.cic.tasa, 1);
  el("outTasaFcs").textContent = pct(calc.empleador.fcs.tasa, 1);

  const over = calc.imponible > calc.topeCesantia + 0.5;
  const tipo = calc.contrato === "plazo_fijo" ? "plazo fijo u obra" : "indefinido";
  el("outNota").textContent = over
    ? `Sueldo sobre el tope: la AFC se calcula sobre ${num(TOPE_CESANTIA_UF, 1)} UF (${tipo}).`
    : `Base bajo el tope de ${num(TOPE_CESANTIA_UF, 1)} UF. Contrato ${tipo}.`;
}

function recalc() {
  render(calcularSeguroCesantia(leer(), indicadores));
}

wireNav();
document.getElementById("formSeguroCesantia")?.addEventListener("input", recalc);
document.getElementById("formSeguroCesantia")?.addEventListener("change", recalc);
recalc();
mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
