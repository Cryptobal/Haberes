import { clp, num } from "./format.js";
import { calcularBoletaHonorarios } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function modoActual() {
  return document.querySelector('input[name="modo"]:checked')?.value || "bruto";
}

function syncCampos() {
  const modo = modoActual();
  const label = el("labelMonto");
  if (label) {
    label.textContent = modo === "liquido" ? "Líquido deseado (CLP)" : "Bruto de la boleta (CLP)";
  }
}

function leer() {
  return {
    modo: modoActual(),
    monto: numVal("monto"),
    anio: numVal("anio") || 2026,
  };
}

function pct(n) {
  const bp = Math.round(Number(n) * 1e4);
  const digits = bp % 100 === 0 ? 0 : bp % 10 === 0 ? 1 : 2;
  return `${num(bp / 100, digits)} %`;
}

function render(calc) {
  const metricLabel = el("outMetricLabel");
  const metric = el("outMetric");
  if (metricLabel) {
    metricLabel.textContent = calc.modo === "liquido" ? "Bruto a emitir" : "Líquido de la boleta";
  }
  if (metric) {
    metric.textContent = clp(calc.modo === "liquido" ? calc.bruto : calc.liquido);
  }
  el("outBruto").textContent = clp(calc.bruto);
  el("outRetencion").textContent = clp(calc.retencion);
  el("outLiquido").textContent = clp(calc.liquido);
  el("outTasa").textContent = pct(calc.tasa);
  el("outAnio").textContent = String(calc.anio);

  const notas = [];
  if (!calc.ok) {
    notas.push("Año fuera de la tabla 2025–2028: se usa la tasa de 2026 (15,25 %).");
  }
  if (calc.modo === "liquido" && calc.monto > 0 && calc.liquido !== calc.monto) {
    notas.push(
      `Por redondeo al peso, el líquido de esta boleta queda en ${clp(calc.liquido)} (usted pidió ${clp(calc.monto)}).`,
    );
  }
  el("outNota").textContent = notas.join(" ");
}

function recalc() {
  syncCampos();
  render(calcularBoletaHonorarios(leer()));
}

wireNav();
const form = document.getElementById("formBoletaHonorarios");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
