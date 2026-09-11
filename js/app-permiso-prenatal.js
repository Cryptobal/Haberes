import { clp, num } from "./format.js";
import { calcularPermisoPrenatal } from "./sueldo.js";
import { createDateFields, el, mountIndicadores, numVal, val, wireNav } from "./ui.js";

let partoPick = null;
let inicioPick = null;

function netaCampo(id) {
  const raw = val(id);
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
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

function modoFecha() {
  const checked = document.querySelector('input[name="modo"]:checked');
  return checked?.value === "inicio" ? "inicio" : "parto";
}

function leer() {
  return {
    modo: modoFecha(),
    fechaParto: partoPick?.getValue() || "",
    fechaInicio: inicioPick?.getValue() || "",
    baseSil: numVal("baseSil"),
    neta1: netaCampo("neta1"),
    neta2: netaCampo("neta2"),
    neta3: netaCampo("neta3"),
  };
}

function plataDia(v) {
  return v > 0 ? `$ ${num(v)}` : "$ 0";
}

function motivoTexto(calc) {
  if (calc.motivo === "sin_inicio") {
    return "Indique la fecha de inicio del prenatal ya certificado.";
  }
  if (calc.motivo === "sin_parto") {
    return "Indique la fecha probable de parto (o la fecha de nacimiento).";
  }
  return "Indique una fecha para armar el calendario del art. 195.";
}

function nota(calc) {
  if (!calc.ok) return motivoTexto(calc);
  const partes = [];
  partes.push(
    `Prenatal art. 195: ${calc.semanasPrenatal} semanas = ${calc.diasPrenatal} días corridos, desde ${fechaEs(calc.fechaInicioPrenatal)} hasta el día anterior al parto (${fechaEs(calc.fechaFinPrenatal)}).`,
  );
  partes.push(
    `Postnatal legal (solo calendario): ${calc.semanasPostnatal} semanas = ${calc.diasPostnatal} días corridos a contar del parto, hasta ${fechaEs(calc.fechaFinPostnatal)}. No incluye el postnatal parental (art. 197 bis).`,
  );
  if (calc.silDesdeNetas) {
    partes.push(
      `Base SIL = promedio de 3 rentas netas (D.F.L. N°44 art. 8) = ${clp(calc.baseSil)}.`,
    );
  } else {
    partes.push(`Base SIL mensual = ${clp(calc.baseSil)} (la cifra que ingresó, o 0).`);
  }
  partes.push(
    `Subsidio prenatal estimado = ${calc.diasPrenatal} × (base / 30) = ${calc.diasPrenatal} × ${plataDia(calc.diarioSil)} = ${clp(calc.subsidioPrenatal)}.`,
  );
  partes.push(
    "Si el parto se atrasa, el prenatal se extiende hasta el nacimiento (art. 196). El monto real lo determina Isapre, COMPIN o mutual; esta cifra es educativa.",
  );
  return partes.join(" ");
}

function render(calc) {
  el("outSubsidio").textContent = calc.ok ? clp(calc.subsidioPrenatal) : clp(calc.subsidioPrenatal);
  el("outInicio").textContent = calc.ok ? fechaEs(calc.fechaInicioPrenatal) : "—";
  el("outFinPrenatal").textContent = calc.ok ? fechaEs(calc.fechaFinPrenatal) : "—";
  el("outParto").textContent = calc.ok ? fechaEs(calc.fechaParto) : "—";
  el("outFinPostnatal").textContent = calc.ok ? fechaEs(calc.fechaFinPostnatal) : "—";
  el("outDiasPrenatal").textContent = calc.ok
    ? `${calc.semanasPrenatal} sem / ${calc.diasPrenatal} días`
    : "0";
  el("outDiasPostnatal").textContent = calc.ok
    ? `${calc.semanasPostnatal} sem / ${calc.diasPostnatal} días`
    : "0";
  el("outDiario").textContent = plataDia(calc.diarioSil);
  el("outBase").textContent = clp(calc.baseSil);
  el("outNota").textContent = nota(calc);

  const alerta = el("outAlerta");
  if (alerta) {
    alerta.hidden = calc.ok;
    alerta.textContent = calc.ok ? "" : motivoTexto(calc);
  }
}

function syncModoUi() {
  const inicio = modoFecha() === "inicio";
  const wrapParto = document.getElementById("wrapParto");
  const wrapInicio = document.getElementById("wrapInicio");
  if (wrapParto) wrapParto.hidden = inicio;
  if (wrapInicio) wrapInicio.hidden = !inicio;
}

function recalc() {
  syncModoUi();
  render(calcularPermisoPrenatal(leer()));
}

wireNav();
partoPick = createDateFields(el("pickParto"), {
  value: "2026-03-01",
  title: "Fecha probable de parto",
  onChange: recalc,
});
inicioPick = createDateFields(el("pickInicio"), {
  value: "2026-01-18",
  title: "Inicio del prenatal certificado",
  onChange: recalc,
});
document.getElementById("formPermisoPrenatal")?.addEventListener("input", recalc);
document.getElementById("formPermisoPrenatal")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
