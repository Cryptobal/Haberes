import { calcularFeriadoAnual } from "./sueldo.js";
import { createDateFields, el, mountIndicadores, numVal, wireNav } from "./ui.js";

let inicioPick = null;

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
  return {
    fechaInicio: inicioPick?.getValue() || "",
    diasHabiles: numVal("diasHabiles"),
    diasProgresivos: numVal("diasProgresivos"),
  };
}

function itemFecha(row) {
  return `${fechaEs(row.fecha)} (${row.nombre})`;
}

function render(calc) {
  el("outReintegro").textContent = calc.ok ? fechaEs(calc.fechaReintegro) : "—";
  el("outTermino").textContent = calc.ok ? fechaEs(calc.fechaTermino) : "—";
  el("outCorridos").textContent = calc.ok ? String(calc.diasCorridos) : "0";
  el("outHabiles").textContent = calc.ok ? String(calc.diasHabilesConsumidos) : "0";
  el("outExtra").textContent = String(calc.diasProgresivos);
  el("outInicio").textContent = calc.fechaInicio ? fechaEs(calc.fechaInicio) : "—";

  const saltos = el("outSaltos");
  const parts = [];
  for (const f of calc.feriados) parts.push(itemFecha(f));
  for (const d of calc.domingos) parts.push(itemFecha(d));
  if (!calc.ok) {
    saltos.textContent = "Indique una fecha de inicio y al menos 1 día hábil.";
  } else if (parts.length === 0) {
    saltos.textContent = "Ningún domingo ni feriado legal en la ventana: no se extendió el cupo.";
  } else {
    saltos.textContent = parts.join("; ") + ".";
  }

  const nota = el("outNota");
  if (!calc.ok) {
    nota.textContent =
      "El feriado anual se cuenta en días hábiles (lun–vie, sin feriados legales). El sábado es inhábil (art. 69).";
    return;
  }
  const extra =
    calc.diasProgresivos > 0 ? ` Incluye ${calc.diasProgresivos} día(s) progresivo(s) que usted indicó.` : "";
  nota.textContent =
    `Término el último hábil consumido; reintegro el siguiente hábil (lun–vie). ${calc.diasCorridos} días corridos desde el inicio hasta el día anterior al reintegro.${extra}`;
}

function recalc() {
  render(calcularFeriadoAnual(leer()));
}

function syncExtremoSur() {
  const check = document.getElementById("extremoSur");
  const input = document.getElementById("diasHabiles");
  if (!check || !input) return;
  const n = Number(input.value);
  if (check.checked && (n === 15 || !Number.isFinite(n) || n <= 0)) input.value = "20";
  if (!check.checked && n === 20) input.value = "15";
}

wireNav();
inicioPick = createDateFields(el("pickInicio"), {
  value: "2026-01-05",
  title: "Fecha de inicio del feriado",
  onChange: recalc,
});
document.getElementById("extremoSur")?.addEventListener("change", () => {
  syncExtremoSur();
  recalc();
});
document.getElementById("formFeriadoAnual")?.addEventListener("input", recalc);
document.getElementById("formFeriadoAnual")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
