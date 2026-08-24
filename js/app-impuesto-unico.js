import { IUSC_TRAMOS } from "./constants.js";
import { clp } from "./format.js";
import { calcularIusc } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function pesosDec(n) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}

function tramoDe(base) {
  const b = Math.max(0, Number(base) || 0);
  for (const t of IUSC_TRAMOS) {
    if (b <= t.hasta) return t;
  }
  return IUSC_TRAMOS[IUSC_TRAMOS.length - 1];
}

function labelFactor(tasa) {
  if (tasa === 0) return "Exento";
  const pct = (tasa * 100).toLocaleString("es-CL", { maximumFractionDigits: 1 });
  return `${pct} %`;
}

function pintarTabla() {
  const root = document.getElementById("tablaIusc");
  if (!root) return;
  const rows = IUSC_TRAMOS.map((t, i) => {
    const hasta = t.hasta === Infinity ? "Y más" : pesosDec(t.hasta);
    const desde = i === 0 ? "—" : pesosDec(IUSC_TRAMOS[i - 1].hasta + 0.01);
    const factor = t.tasa === 0 ? "Exento" : String(t.tasa).replace(".", ",");
    const rebaja = t.tasa === 0 ? "—" : pesosDec(t.rebaja);
    return `<tr><td>${desde}</td><td>${hasta}</td><td>${factor}</td><td>${rebaja}</td></tr>`;
  }).join("");
  root.innerHTML = `
    <div class="table-scroll">
      <table>
        <caption>Tabla IUSC mensual agosto 2026 (la misma de la calculadora de sueldo líquido)</caption>
        <thead><tr><th>Desde</th><th>Hasta</th><th>Factor</th><th>Cantidad a rebajar</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="hint">
      Fuente:
      <a href="https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm">SII, impuesto único 2026</a>.
      Exento hasta $967.261,50 (13,5 UTM).
    </p>
  `;
}

function render(base) {
  const impuesto = calcularIusc(base);
  const tramo = tramoDe(base);
  el("outImpuesto").textContent = clp(impuesto);
  el("outTramo").textContent = tramo.tasa === 0 ? "Exento" : labelFactor(tramo.tasa);
  el("outFactor").textContent = labelFactor(tramo.tasa);
  el("outRebaja").textContent = tramo.tasa === 0 ? "—" : pesosDec(tramo.rebaja);
  el("outNota").textContent =
    tramo.tasa === 0
      ? "Tramo exento: no hay impuesto único este mes"
      : `Factor ${labelFactor(tramo.tasa)} menos ${pesosDec(tramo.rebaja)}, redondeado al peso`;
}

function recalc() {
  render(numVal("baseTributable"));
}

wireNav();
pintarTabla();
document.getElementById("formIusc")?.addEventListener("input", recalc);
document.getElementById("formIusc")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
