import { IUSC_TRAMOS } from "./constants.js";
import { clp } from "./format.js";
import {
  MESES_ANIO_CALENDARIO,
  calcularReliquidacionIusc,
  escalaIuscAnual,
  totalesDesdeMesConstante,
} from "./reliquidacion-impuesto.js";
import { el, mountIndicadores, wireNav } from "./ui.js";

const DEFAULTS = [
  { nombre: "Empleador A", rentaAnual: 10_800_000, retenido: 0 },
  { nombre: "Empleador B", rentaAnual: 10_800_000, retenido: 0 },
];

let filas = DEFAULTS.map((f) => ({ ...f, rentaMensual: "", meses: MESES_ANIO_CALENDARIO }));

function pesosDec(n) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}

function labelFactor(tasa) {
  if (tasa === 0) return "Exento";
  const pct = (tasa * 100).toLocaleString("es-CL", { maximumFractionDigits: 1 });
  return `${pct} %`;
}

function numInput(raw) {
  if (raw == null || raw === "") return 0;
  const n = Number(String(raw).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function pintarTabla() {
  const root = document.getElementById("tablaAnual");
  if (!root) return;
  const escala = escalaIuscAnual(IUSC_TRAMOS);
  const rows = escala
    .map((t, i) => {
      const hasta = t.hasta === Infinity ? "Y más" : pesosDec(t.hasta);
      const desde = i === 0 ? "—" : pesosDec(escala[i - 1].hasta + 0.01);
      const factor = t.tasa === 0 ? "Exento" : String(t.tasa).replace(".", ",");
      const rebaja = t.tasa === 0 ? "—" : pesosDec(t.rebaja);
      return `<tr><td>${desde}</td><td>${hasta}</td><td>${factor}</td><td>${rebaja}</td></tr>`;
    })
    .join("");
  root.innerHTML = `
    <div class="table-scroll">
      <table>
        <caption>Escala anual estimada: tabla IUSC de agosto 2026 × 12 (mismos factores)</caption>
        <thead><tr><th>Desde</th><th>Hasta</th><th>Factor</th><th>Cantidad a rebajar</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="hint">
      Exento anual hasta ${pesosDec(escala[0].hasta)} (13,5 UTM × 12).
      El SII, en el Formulario 22, usa la UTM de diciembre y reajusta rentas y retenciones.
    </p>
  `;
}

function pintarFilas() {
  const root = document.getElementById("empleadores");
  if (!root) return;
  root.innerHTML = filas
    .map((f, i) => {
      const quitar =
        filas.length > 1
          ? `<button type="button" class="btn btn-ghost btn-sm" data-quitar="${i}">Quitar</button>`
          : "";
      return `
        <div class="reliq-emp">
          <h2>Empleador ${i + 1}</h2>
          <div class="field">
            <label for="empNombre${i}">Nombre (opcional)</label>
            <input id="empNombre${i}" data-field="nombre" data-i="${i}" type="text" maxlength="80" value="${escapeAttr(f.nombre)}" />
          </div>
          <div class="field">
            <label for="empRenta${i}">Renta líquida imponible del año</label>
            <input id="empRenta${i}" data-field="rentaAnual" data-i="${i}" type="number" min="0" step="1" value="${f.rentaAnual}" />
          </div>
          <div class="field">
            <label for="empRet${i}">Impuesto único retenido en el año</label>
            <input id="empRet${i}" data-field="retenido" data-i="${i}" type="number" min="0" step="1" value="${f.retenido}" />
          </div>
          <p class="hint">Opcional: sueldo parejo. El botón aplica la tabla mensual y completa el año.</p>
          <div class="field">
            <label for="empMesRenta${i}">Renta líquida imponible de un mes</label>
            <input id="empMesRenta${i}" data-field="rentaMensual" data-i="${i}" type="number" min="0" step="1" value="${f.rentaMensual}" />
          </div>
          <div class="field">
            <label for="empMeses${i}">Meses con este empleador</label>
            <input id="empMeses${i}" data-field="meses" data-i="${i}" type="number" min="1" max="12" step="1" value="${f.meses}" />
          </div>
          <div class="actions">
            <button type="button" class="btn btn-ghost btn-sm" data-usar-mes="${i}">Usar este mes en el total del año</button>
            ${quitar}
          </div>
        </div>`;
    })
    .join("");
}

function escapeAttr(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function leerFilasDesdeDom() {
  const root = document.getElementById("empleadores");
  if (!root) return;
  const next = filas.map((f) => ({ ...f }));
  root.querySelectorAll("[data-field]").forEach((input) => {
    const i = Number(input.getAttribute("data-i"));
    const field = input.getAttribute("data-field");
    if (!next[i] || !field) return;
    if (field === "nombre") next[i].nombre = input.value;
    else if (field === "rentaMensual") next[i].rentaMensual = input.value;
    else next[i][field] = numInput(input.value);
  });
  filas = next;
}

function render(calc) {
  const sentido = calc.sentido;
  el("outSentidoLabel").textContent =
    sentido === "pagar"
      ? "Diferencia estimada a pagar"
      : sentido === "favor"
        ? "Diferencia estimada a favor"
        : "Sin diferencia estimada";
  el("outDiferencia").textContent = sentido === "cuadra" ? clp(0) : clp(calc.diferenciaAbs);
  el("outRenta").textContent = clp(calc.rentaConsolidada);
  el("outIusc").textContent = clp(calc.iuscTeorico);
  el("outRetenido").textContent = clp(calc.totalRetenido);
  el("outFactor").textContent = labelFactor(calc.tasa);
  el("outActivos").textContent = String(calc.activos);
  el("outObligacion").textContent = calc.obligatoria ? "Obligatoria" : "Voluntaria";
  const redondeo =
    calc.iuscSinRedondear !== calc.iuscTeorico
      ? ` El impuesto anual se redondea al peso (desde ${pesosDec(calc.iuscSinRedondear)}).`
      : "";
  const marco = calc.obligatoria
    ? "Hay rentas de más de un pagador: el artículo 47 obliga a reliquidar en el Formulario 22."
    : "Con un solo pagador la reliquidación anual es voluntaria, salvo que deba declarar Global Complementario por otras rentas.";
  el("outNota").textContent =
    `${marco} Esta cifra no reajusta por IPC ni usa la UTM de diciembre.${redondeo}`;
}

function recalc() {
  leerFilasDesdeDom();
  const calc = calcularReliquidacionIusc({
    empleadores: filas.map((f) => ({
      nombre: f.nombre,
      rentaAnual: f.rentaAnual,
      retenido: f.retenido,
    })),
  });
  render(calc);
}

function usarMes(i) {
  leerFilasDesdeDom();
  const f = filas[i];
  if (!f) return;
  const meses = Math.max(1, Math.min(MESES_ANIO_CALENDARIO, Math.floor(Number(f.meses) || 0)));
  const tot = totalesDesdeMesConstante(numInput(f.rentaMensual), meses);
  filas[i] = {
    ...f,
    meses,
    rentaAnual: tot.rentaAnual,
    retenido: tot.retenido,
  };
  pintarFilas();
  recalc();
}

wireNav();
pintarTabla();
pintarFilas();
document.getElementById("formReliq")?.addEventListener("input", recalc);
document.getElementById("formReliq")?.addEventListener("click", (ev) => {
  const usar = ev.target.closest("[data-usar-mes]");
  if (usar) {
    usarMes(Number(usar.getAttribute("data-usar-mes")));
    return;
  }
  const quitar = ev.target.closest("[data-quitar]");
  if (quitar) {
    leerFilasDesdeDom();
    const i = Number(quitar.getAttribute("data-quitar"));
    if (filas.length > 1) filas.splice(i, 1);
    pintarFilas();
    recalc();
    return;
  }
  if (ev.target.closest("#btnAgregar")) {
    leerFilasDesdeDom();
    if (filas.length >= 8) return;
    filas.push({
      nombre: `Empleador ${filas.length + 1}`,
      rentaAnual: 0,
      retenido: 0,
      rentaMensual: "",
      meses: MESES_ANIO_CALENDARIO,
    });
    pintarFilas();
    recalc();
  }
});
recalc();
mountIndicadores();
