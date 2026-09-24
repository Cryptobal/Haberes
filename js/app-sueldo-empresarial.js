import { clp } from "./format.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";
import { calcularSueldoEmpresarial } from "./sueldo-empresarial.js";

let indicadores = {};

function leer() {
  const salud = el("salud")?.value || "fonasa";
  return {
    bruto: numVal("bruto"),
    afp: el("afp")?.value || "modelo",
    salud,
    isaprePct: salud === "isapre" ? numVal("isaprePct") : 0,
    contrato: el("contrato")?.value || "indefinido",
    cotiza: Boolean(el("cotiza")?.checked),
  };
}

function syncSalud() {
  const wrap = el("wrapIsapre");
  if (!wrap) return;
  wrap.hidden = (el("salud")?.value || "fonasa") !== "isapre";
}

function nota(calc) {
  if (calc.montoCero) {
    return "Ingrese el monto bruto mensual del sueldo empresarial para estimar.";
  }
  if (!calc.cotiza) {
    return "Sin cotizaciones previsionales: el IUSC se estima sobre el bruto y el costo empresa no suma aportes del empleador. No es un tope del SII.";
  }
  return "No es un tope del SII. La razonabilidad y el trabajo efectivo los evalúa el Servicio. Haberes solo estima la aritmética de nómina.";
}

function render(calc) {
  el("outLiquido").textContent = clp(calc.liquido);
  el("outDescuentos").textContent = clp(calc.totalDescuentos);
  el("outCotizaciones").textContent = clp(calc.cotizaciones);
  el("outIusc").textContent = clp(calc.iusc);
  el("outCosto").textContent = clp(calc.costoEmpresa);
  el("outAportes").textContent = clp(calc.aportesEmpleador);
  el("outNota").textContent = nota(calc);
}

function recalc() {
  syncSalud();
  render(calcularSueldoEmpresarial(leer(), indicadores));
}

wireNav();
document.getElementById("formSueldoEmpresarial")?.addEventListener("input", recalc);
document.getElementById("formSueldoEmpresarial")?.addEventListener("change", recalc);
recalc();
mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
