import { MINDICADOR_URL } from "./constants.js";
import { clp } from "./format.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";
import {
  calcularReajusteIpc,
  serieIpcDesdeJson,
  variacionesEnRango,
} from "./reajuste-ipc.js";

const AVISO =
  "En el sector privado chileno el reajuste por IPC no es automático por ley: depende del contrato, convenio o pacto. No es un cálculo del INE, del SII ni de la Dirección del Trabajo.";

let serie = [];
let serieEstado = "idle";
let rangoSugerido = false;

function modo() {
  return document.querySelector('input[name="modo"]:checked')?.value === "rango" ? "rango" : "manual";
}

function decimalVal(id) {
  const raw = el(id)?.value;
  if (raw == null || String(raw).trim() === "") return 0;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function fmtPct(n) {
  const s = new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 4,
  }).format(Number(n) || 0);
  return `${s} %`;
}

function syncModo() {
  const rango = modo() === "rango";
  const manual = el("wrapManual");
  const box = el("wrapRango");
  if (manual) manual.hidden = rango;
  if (box) box.hidden = !rango;
  if (rango && serieEstado === "idle") cargarSerie();
}

function aplicarRangoSugerido() {
  if (rangoSugerido || !serie.length) return;
  const desde = el("desdeMes");
  const hasta = el("hastaMes");
  if (!desde || !hasta || desde.value || hasta.value) {
    rangoSugerido = true;
    return;
  }
  const meses = [...new Set(serie.map((item) => String(item.fecha).slice(0, 7)))].sort();
  if (!meses.length) return;
  hasta.value = meses[meses.length - 1];
  desde.value = meses[Math.max(0, meses.length - 12)];
  rangoSugerido = true;
}

async function cargarSerie() {
  serieEstado = "loading";
  recalc();
  try {
    const res = await fetch(`${MINDICADOR_URL}/ipc`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(String(res.status));
    serie = serieIpcDesdeJson(await res.json());
    serieEstado = serie.length ? "ok" : "error";
  } catch {
    serie = [];
    serieEstado = "error";
  }
  aplicarRangoSugerido();
  const fuente = el("ipcFuente");
  if (fuente) {
    fuente.textContent =
      serieEstado === "ok"
        ? `Serie IPC de mindicador.cl (${serie.length} variaciones mensuales, unidad porcentaje). No es una tabla fija de Haberes.`
        : "mindicador.cl no entregó la serie IPC. Use el porcentaje manual.";
  }
  recalc();
}

function notaResultado(calc, extra) {
  const base = `${extra} ${clp(calc.sueldoActual)} pasa a ${clp(calc.sueldoReajustado)} (delta ${clp(calc.deltaPesos)}). ${AVISO}`;
  return base;
}

function notaFallo(rango) {
  if (serieEstado === "loading" || serieEstado === "idle") {
    return `Cargando la serie mensual del IPC en mindicador.cl. ${AVISO}`;
  }
  if (serieEstado === "error") {
    return `No se pudo leer la serie IPC. Use el porcentaje manual. ${AVISO}`;
  }
  if (!rango || rango.motivo === "rango") {
    return `Elija el mes desde y el mes hasta. ${AVISO}`;
  }
  const faltan = rango.faltantes || [];
  const lista = faltan.slice(0, 4).join(", ");
  const extra = faltan.length > 4 ? ` y ${faltan.length - 4} más` : "";
  return `Faltan variaciones mensuales del IPC (${lista}${extra}). La serie en vivo no cubre todo el rango: use el porcentaje manual. ${AVISO}`;
}

function pintarPendiente(texto) {
  el("outReajustado").textContent = "—";
  el("outPct").textContent = "—";
  el("outDelta").textContent = "—";
  el("outNota").textContent = texto;
}

function pintar(calc, texto) {
  el("outReajustado").textContent = clp(calc.sueldoReajustado);
  el("outPct").textContent = fmtPct(calc.porcentajeEfectivo);
  el("outDelta").textContent = clp(calc.deltaPesos);
  el("outNota").textContent = texto;
}

function recalc() {
  const sueldoActual = numVal("sueldoActual");
  if (modo() === "rango") {
    if (serieEstado !== "ok") {
      pintarPendiente(notaFallo(null));
      return;
    }
    const rango = variacionesEnRango(serie, el("desdeMes")?.value, el("hastaMes")?.value);
    if (!rango.ok) {
      pintarPendiente(notaFallo(rango));
      return;
    }
    const calc = calcularReajusteIpc({
      sueldoActual,
      variacionesMensuales: rango.variaciones,
    });
    const extra = `IPC acumulado de ${rango.desde} a ${rango.hasta} (${rango.variaciones.length} ${rango.variaciones.length === 1 ? "mes" : "meses"}, composición de variaciones mensuales): ${fmtPct(calc.porcentajeEfectivo)}.`;
    pintar(calc, notaResultado(calc, extra));
    return;
  }
  const calc = calcularReajusteIpc({
    sueldoActual,
    porcentaje: decimalVal("porcentajeManual"),
  });
  pintar(calc, notaResultado(calc, `Porcentaje efectivo ${fmtPct(calc.porcentajeEfectivo)}.`));
}

wireNav();
document.getElementById("formReajusteIpc")?.addEventListener("input", () => {
  syncModo();
  recalc();
});
document.getElementById("formReajusteIpc")?.addEventListener("change", () => {
  syncModo();
  recalc();
});
syncModo();
recalc();
mountIndicadores();
