import { INTERES_MORA_GOLD, TMC_REAJUSTABLE_MENOS_UN_ANIO } from "./constants.js";
import { clp } from "./format.js";
import { calcularInteresMora, lookupIpc, mesAnteriorKey } from "./sueldo.js";
import { createDateFields, el, mountIndicadores, numVal, wireNav } from "./ui.js";

let vencPick = null;
let pagoPick = null;

function fechaEs(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "—";
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dt);
}

function mesEs(yyyyMm) {
  const m = String(yyyyMm || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return "—";
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(dt);
}

function pctEs(n) {
  if (!Number.isFinite(n)) return "—";
  const rounded = Math.round(n * 100) / 100;
  return `${String(rounded).replace(".", ",")} %`;
}

function hoyIso() {
  const n = new Date();
  const y = n.getFullYear();
  const mo = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function pagoHoy() {
  return Boolean(document.getElementById("pagoHoy")?.checked);
}

/** type=number usa punto decimal; no recortar puntos como miles (numVal). */
function decimalVal(id) {
  const raw = el(id)?.value;
  if (raw == null || String(raw).trim() === "") return undefined;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function rellenarIpcDesdeFechas() {
  const venc = vencPick?.getValue() || "";
  const pago = pagoHoy() ? hoyIso() : pagoPick?.getValue() || "";
  const ini = lookupIpc(mesAnteriorKey(venc));
  const fin = lookupIpc(mesAnteriorKey(pago));
  const ipcIni = document.getElementById("ipcInicial");
  const ipcFin = document.getElementById("ipcFinal");
  if (ipcIni) ipcIni.value = ini != null ? String(ini) : "";
  if (ipcFin) ipcFin.value = fin != null ? String(fin) : "";
}

function leer() {
  return {
    monto: numVal("monto"),
    fechaVencimiento: vencPick?.getValue() || "",
    fechaPago: pagoHoy() ? hoyIso() : pagoPick?.getValue() || "",
    tasaAnualPct: decimalVal("tasaAnual") ?? TMC_REAJUSTABLE_MENOS_UN_ANIO,
    ipcInicial: decimalVal("ipcInicial"),
    ipcFinal: decimalVal("ipcFinal"),
  };
}

function motivoTexto(calc) {
  if (calc.motivo === "sin_monto") return "Indique el monto adeudado en pesos.";
  if (calc.motivo === "sin_fecha") return "Indique la fecha de vencimiento y la de pago.";
  if (calc.motivo === "pago_antes") {
    return "La fecha de pago es anterior al vencimiento: no hay mora que estimar.";
  }
  if (calc.motivo === "sin_ipc") {
    return `Falta el IPC INE de ${mesEs(calc.mesIpcInicial)} o ${mesEs(calc.mesIpcFinal)}. Escríbalo desde el boletín del INE (base 2023 = 100).`;
  }
  return "Complete el monto y las fechas para estimar.";
}

function nota(calc) {
  if (!calc.ok) return motivoTexto(calc);
  const partes = [];
  partes.push(
    `Días de mora para el interés: ${calc.diasMora} (día siguiente al vencimiento hasta el día anterior al pago, ambos inclusive; consulta DT). ${calc.diasCalendario} días calendario entre las dos fechas.`,
  );
  partes.push(
    `Reajuste IPC = variación ${mesEs(calc.mesIpcInicial)} (${String(calc.ipcInicial).replace(".", ",")}) → ${mesEs(calc.mesIpcFinal)} (${String(calc.ipcFinal).replace(".", ",")}): ${pctEs(calc.variacionIpcPct)} → ${clp(calc.reajuste)}.`,
  );
  partes.push(
    `Interés sobre el capital reajustado (${clp(calc.capitalReajustado)}) a ${pctEs(calc.tasaAnualPct)} anual / 360 × ${calc.diasMora} días = ${clp(calc.intereses)}.`,
  );
  partes.push("Estimación educativa, no una liquidación judicial ni un cálculo de la DT.");
  return partes.join(" ");
}

function render(calc) {
  el("outTotal").textContent = clp(calc.total);
  el("outCapital").textContent = clp(calc.monto);
  el("outReajuste").textContent = clp(calc.reajuste);
  el("outIntereses").textContent = clp(calc.intereses);
  el("outReajustado").textContent = clp(calc.capitalReajustado);
  el("outDias").textContent = calc.ok || calc.diasMora ? String(calc.diasMora) : "—";
  el("outCalendario").textContent = Number.isFinite(calc.diasCalendario) ? String(calc.diasCalendario) : "—";
  el("outVariacion").textContent = calc.ok ? pctEs(calc.variacionIpcPct) : "—";
  el("outTasa").textContent = pctEs(calc.tasaAnualPct);
  el("outIpcMeses").textContent =
    calc.mesIpcInicial && calc.mesIpcFinal
      ? `${mesEs(calc.mesIpcInicial)} → ${mesEs(calc.mesIpcFinal)}`
      : "—";
  el("outVenc").textContent = calc.fechaVencimiento ? fechaEs(calc.fechaVencimiento) : "—";
  el("outPago").textContent = calc.fechaPago ? fechaEs(calc.fechaPago) : "—";
  el("outNota").textContent = nota(calc);
}

function recalc() {
  if (pagoHoy() && pagoPick) pagoPick.setValue(hoyIso());
  render(calcularInteresMora(leer()));
}

function onFechaChange() {
  rellenarIpcDesdeFechas();
  recalc();
}

wireNav();
vencPick = createDateFields(el("pickVencimiento"), {
  value: INTERES_MORA_GOLD.fechaVencimiento,
  title: "Fecha en que debió pagarse",
  onChange: onFechaChange,
});
pagoPick = createDateFields(el("pickPago"), {
  value: INTERES_MORA_GOLD.fechaPago,
  title: "Fecha de pago efectivo",
  onChange: onFechaChange,
});
document.getElementById("formInteresMora")?.addEventListener("input", recalc);
document.getElementById("formInteresMora")?.addEventListener("change", (ev) => {
  if (ev.target?.id === "pagoHoy") onFechaChange();
  else recalc();
});
rellenarIpcDesdeFechas();
recalc();
mountIndicadores();
