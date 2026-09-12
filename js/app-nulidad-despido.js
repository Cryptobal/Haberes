import { clp, num } from "./format.js";
import { calcularNulidadDespido } from "./sueldo.js";
import { createDateFields, el, mountIndicadores, numVal, wireNav } from "./ui.js";

let despidoPick = null;
let convPick = null;

function hoyIso() {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function usaHoy() {
  return Boolean(document.getElementById("usarHoy")?.checked);
}

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

function leer() {
  if (usaHoy() && convPick) convPick.setValue(hoyIso());
  return {
    remuneracion: numVal("remuneracion"),
    prestaciones: numVal("prestaciones"),
    fechaDespido: despidoPick?.getValue() || "",
    fechaConvalidacion: convPick?.getValue() || "",
  };
}

function plataDia(v) {
  return v > 0 ? `$ ${num(v)}` : "$ 0";
}

function motivoTexto(calc) {
  if (calc.motivo === "sin_despido") return "Indique la fecha del despido.";
  if (calc.motivo === "sin_convalidacion") {
    return "Indique la fecha de convalidación (pago de cotizaciones y comunicación) o use «hoy».";
  }
  if (calc.motivo === "convalidacion_antes") {
    return "La convalidación no puede ser anterior al despido.";
  }
  return "Indique fechas y la última remuneración mensual.";
}

function nota(calc) {
  if (!calc.ok) return motivoTexto(calc);
  const partes = [];
  partes.push(
    `Período de nulidad art. 162: ${calc.dias} días corridos inclusivos, desde ${fechaEs(calc.fechaDespido)} hasta ${fechaEs(calc.fechaConvalidacion)} (${num(calc.mesesConvencionales, 2)} meses de 30 días).`,
  );
  partes.push(
    `Diario = (remuneración ${clp(calc.remuneracion)} + prestaciones ${clp(calc.prestaciones)}) / ${calc.divisor} = ${plataDia(calc.valorDiario)}.`,
  );
  partes.push(
    `Total estimado = ${calc.dias} × ${plataDia(calc.valorDiario)} = ${clp(calc.total)}.`,
  );
  partes.push(
    "Las cotizaciones impagas mismas se cobran aparte (no es una deuda de Previred). No incluye IAS, aviso sustitutivo ni mora del art. 63. Es una estimación educativa: no sustituye demanda, finiquito ni sentencia.",
  );
  if (calc.dias > 180) {
    partes.push(
      "La acción para reclamar la nulidad prescribe en 6 meses desde la suspensión de los servicios (art. 480). Esta cifra no corta el monto.",
    );
  }
  return partes.join(" ");
}

function render(calc) {
  el("outTotal").textContent = clp(calc.total);
  el("outDias").textContent = calc.ok ? `${calc.dias} días` : "0";
  el("outMeses").textContent = calc.ok ? `${num(calc.mesesConvencionales, 2)} meses` : "0";
  el("outDiario").textContent = plataDia(calc.valorDiario);
  el("outBase").textContent = clp(calc.baseMensual);
  el("outRem").textContent = clp(calc.remuneracionesAdeudadas);
  el("outPrest").textContent = clp(calc.prestacionesAdeudadas);
  el("outDesde").textContent = calc.ok ? fechaEs(calc.fechaDespido) : "—";
  el("outHasta").textContent = calc.ok ? fechaEs(calc.fechaConvalidacion) : "—";
  el("outNota").textContent = nota(calc);

  const alerta = el("outAlerta");
  if (alerta) {
    alerta.hidden = calc.ok;
    alerta.textContent = calc.ok ? "" : motivoTexto(calc);
  }
}

function recalc() {
  render(calcularNulidadDespido(leer()));
}

wireNav();
despidoPick = createDateFields(el("pickDespido"), {
  value: "2026-01-01",
  title: "Fecha del despido",
  onChange: recalc,
});
convPick = createDateFields(el("pickConvalidacion"), {
  value: "2026-03-31",
  title: "Fecha de convalidación",
  onChange: recalc,
});
document.getElementById("formNulidadDespido")?.addEventListener("input", recalc);
document.getElementById("formNulidadDespido")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
