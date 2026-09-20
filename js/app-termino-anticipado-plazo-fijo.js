import { TERMINO_ANTICIPADO_PLAZO_FIJO_GOLD } from "./constants.js";
import { calcularTerminoAnticipadoPlazoFijo } from "./termino-anticipado-plazo-fijo.js";
import { clp, num } from "./format.js";
import { createDateFields, el, mountIndicadores, numVal, wireNav } from "./ui.js";

const GOLD = TERMINO_ANTICIPADO_PLAZO_FIJO_GOLD.tresMeses800;

let anticipadoPick = null;
let pactadaPick = null;

function boolVal(id) {
  return Boolean(el(id)?.checked);
}

function decimalVal(id, fallback = 0) {
  const raw = el(id)?.value;
  if (raw == null || raw === "") return fallback;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
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
  const usarPactada = boolVal("usarFechaPactada");
  return {
    sueldoMensual: numVal("sueldoMensual"),
    fechaTerminoAnticipado: anticipadoPick?.getValue() || "",
    fechaTerminoPactada: usarPactada ? pactadaPick?.getValue() || "" : "",
    mesesRemanentes: usarPactada ? 0 : decimalVal("mesesRemanentes", 0),
  };
}

function syncPlazoUi() {
  const boxFecha = document.getElementById("boxFechaPactada");
  const boxMeses = document.getElementById("boxMesesRemanentes");
  const usar = boolVal("usarFechaPactada");
  if (boxFecha) boxFecha.hidden = !usar;
  if (boxMeses) boxMeses.hidden = usar;
}

function textoFallo(calc) {
  if (calc.motivo === "sueldo") {
    return "Indique una remuneración mensual mayor que 0.";
  }
  if (calc.motivo === "fecha_anticipado") {
    return "Indique la fecha de término anticipado (despido o aviso).";
  }
  if (calc.motivo === "fecha_termino") {
    return "La fecha de término pactada no puede ser anterior a la de término anticipado.";
  }
  return "Indique la fecha de término pactada o los meses remanentes.";
}

function render(calc) {
  const metric = el("outRemanente");
  if (metric) {
    metric.textContent = calc.ok ? clp(calc.remuneracionRemanente) : "—";
  }
  el("outMeses").textContent = calc.ok ? `${num(calc.mesesRemanentes, 2)} meses` : "—";
  el("outDias").textContent = calc.ok ? String(calc.diasRemanentes) : "—";
  el("outSueldo").textContent = calc.sueldoMensual > 0 ? clp(calc.sueldoMensual) : "—";
  el("outAnticipado").textContent = calc.fechaTerminoAnticipado
    ? fechaEs(calc.fechaTerminoAnticipado)
    : "—";
  el("outPactada").textContent = calc.ok ? fechaEs(calc.fechaTerminoPactada) : "—";

  const alerta = el("outAlerta");
  if (alerta) {
    if (!calc.ok) {
      alerta.hidden = false;
      alerta.textContent = textoFallo(calc);
    } else if (calc.diasRemanentes === 0) {
      alerta.hidden = false;
      alerta.textContent =
        "No hay días remanentes: la fecha de término anticipado coincide con el vencimiento pactado. El remanente es $0. El finiquito por vencimiento del plazo sigue en /finiquito.";
    } else {
      alerta.hidden = true;
      alerta.textContent = "";
    }
  }

  const partes = [];
  if (!calc.ok) {
    partes.push(textoFallo(calc));
  } else {
    const fuente =
      calc.fuentePlazo === "mesesRemanentes"
        ? `${num(calc.mesesRemanentesInput, 2)} meses de calendario desde el término anticipado`
        : "fecha de término pactada (tiene precedencia sobre los meses)";
    partes.push(
      `Remanente ${calc.fechaTerminoAnticipado} → ${calc.fechaTerminoPactada} (${fuente}).`,
    );
    partes.push(
      `${num(calc.mesesRemanentes, 2)} meses de calendario (${calc.diasRemanentes} días) × ${clp(calc.sueldoMensual)} = ${clp(calc.remuneracionRemanente)}.`,
    );
    partes.push(
      "Fórmula: meses_remanentes = Δaños×12 + Δmeses + (Δdías / último día del mes pactado); remuneración = redondeo(meses × sueldo). No usa días/30.",
    );
  }
  partes.push(
    "Solo orienta el remanente si no hay causal del art. 160. No sustituye el finiquito completo ni el recargo del art. 168.",
  );
  partes.push(
    "Estimación educativa: no es asesoría legal ni un cálculo de la Dirección del Trabajo ni de Previred. Los tribunales del caso concreto pueden diferir.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  syncPlazoUi();
  render(calcularTerminoAnticipadoPlazoFijo(leer()));
}

wireNav();
anticipadoPick = createDateFields(el("pickAnticipado"), {
  value: GOLD.fechaTerminoAnticipado,
  title: "Fecha de término anticipado",
  onChange: recalc,
});
pactadaPick = createDateFields(el("pickPactada"), {
  value: GOLD.fechaTerminoPactada,
  title: "Fecha de término pactada",
  onChange: recalc,
});
const form = document.getElementById("formTerminoAnticipado");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
