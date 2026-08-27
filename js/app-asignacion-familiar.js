import { ASIGNACION_FAMILIAR_TRAMOS } from "./constants.js";
import { clp } from "./format.js";
import { calcularAsignacionFamiliar } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function pesos(n) {
  return clp(n);
}

function tramoLabel(calc) {
  if (calc.montoCarga === 0) return "Sin derecho ($0)";
  return `Tramo ${calc.tramo}`;
}

function pintarTabla() {
  const root = document.getElementById("tablaAsignacion");
  if (!root) return;
  const rows = ASIGNACION_FAMILIAR_TRAMOS.map((t, i) => {
    const hasta = t.hasta === Infinity ? "Y más" : pesos(t.hasta);
    const desde = i === 0 ? "—" : pesos(ASIGNACION_FAMILIAR_TRAMOS[i - 1].hasta + 1);
    const monto = t.monto === 0 ? "$0" : pesos(t.monto);
    const duplo = t.monto === 0 ? "$0" : pesos(t.monto * 2);
    return `<tr><td>${desde}</td><td>${hasta}</td><td>${monto}</td><td>${duplo}</td></tr>`;
  }).join("");
  root.innerHTML = `
    <div class="table-scroll">
      <table>
        <caption>Tramos de asignación familiar y maternal a contar del 1 de mayo de 2026 (Ley 21.830)</caption>
        <thead><tr><th>Ingreso desde</th><th>Hasta</th><th>Por carga</th><th>Carga con invalidez</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="hint">
      Fuentes:
      <a href="https://www.dt.gob.cl/portal/1628/w3-article-85651.html">DT, valor de la asignación familiar</a>,
      <a href="https://www.suseso.gob.cl/612/w3-article-686804.html">SUSESO O-01-S-02728-2026</a>
      y
      <a href="https://www.suseso.gob.cl/606/w3-article-498133.html">tabla de tramos SUSESO</a>.
      El duplo consta en el D.F.L. N° 150, artículo 14.
    </p>
  `;
}

function render(calc) {
  el("outTotal").textContent = clp(calc.total);
  el("outTramo").textContent = tramoLabel(calc);
  el("outMontoCarga").textContent = clp(calc.montoCarga);
  el("outCargas").textContent = String(calc.cargas + calc.cargasInvalidez);
  el("outNota").textContent =
    calc.montoCarga === 0
      ? "Sobre el tope de ingreso el monto por carga es $0"
      : calc.cargasInvalidez
        ? `${clp(calc.montoCarga)} × ${calc.cargas} + ${clp(calc.montoCargaInvalidez)} × ${calc.cargasInvalidez} (duplo)`
        : `${clp(calc.montoCarga)} × ${calc.cargas} carga${calc.cargas === 1 ? "" : "s"}`;
}

function leer() {
  return {
    ingresoMensual: numVal("ingresoMensual"),
    cargas: numVal("cargas"),
    cargasInvalidez: numVal("cargasInvalidez"),
  };
}

function recalc() {
  render(calcularAsignacionFamiliar(leer()));
}

wireNav();
pintarTabla();
document.getElementById("formAsignacion")?.addEventListener("input", recalc);
document.getElementById("formAsignacion")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
