import { clp } from "./format.js";
import { calcularRetencionJudicial } from "./sueldo.js";
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
    base: numVal("base"),
    modo: modoActual(),
    montoFijo: numVal("montoFijo"),
    porcentaje: numVal("porcentaje"),
    otrasRetenciones: numVal("otrasRetenciones"),
  };
}

function render(calc) {
  el("outRetencion").textContent = clp(calc.retencionAlimentos);
  el("outRemanente").textContent = clp(calc.remanente);
  el("outBase").textContent = clp(calc.base);
  el("outOrdenada").textContent = clp(calc.ordenada);
  el("outOtras").textContent = clp(calc.otrasAplicadas);
  el("outModo").textContent =
    calc.modo === "porcentaje" ? `${calc.porcentaje} % de la base` : "Monto fijo mensual";

  const notas = [];
  notas.push(
    "El empleador no se queda con lo retenido: debe pagarlo al alimentario, a su representante o a quien tenga el cuidado, como dice la resolución.",
  );
  if (calc.topeAplicado) {
    notas.push(
      "La orden supera la base disponible de este mes: se retiene hasta esa base y el remanente no queda negativo. La resolución sigue mandando; Haberes solo hace la cuenta.",
    );
  } else {
    notas.push(
      "Si la resolución usa otra base (bruto, imponible u otra), cámbiela arriba. Esta página no inventa un tope de porcentaje.",
    );
  }
  el("outNota").textContent = notas.join(" ");
  const alerta = el("outAlerta");
  if (alerta) {
    alerta.hidden = !calc.topeAplicado;
    alerta.textContent = calc.topeAplicado
      ? "Atención: lo ordenado no cabe entero en la base del mes. Se retiene el máximo disponible."
      : "";
  }
}

function recalc() {
  syncCampos();
  render(calcularRetencionJudicial(leer()));
}

wireNav();
const form = document.getElementById("formRetencionJudicial");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
