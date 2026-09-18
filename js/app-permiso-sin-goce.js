import { PERMISO_SIN_GOCE_GOLD } from "./constants.js";
import { clp, num } from "./format.js";
import {
  TIPO_BASE_PERMISO_SIN_GOCE,
  calcularPermisoSinGoce,
  diasCorridosDelMes,
} from "./permiso-sin-goce.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function tipoBaseVal() {
  const checked = document.querySelector('input[name="tipoBase"]:checked');
  return checked?.value === TIPO_BASE_PERMISO_SIN_GOCE.laborables
    ? TIPO_BASE_PERMISO_SIN_GOCE.laborables
    : TIPO_BASE_PERMISO_SIN_GOCE.corridos;
}

function mesIsoVal() {
  return String(el("mesIso")?.value || "").trim();
}

function leer() {
  return {
    sueldoMensual: numVal("sueldoMensual"),
    diasBase: numVal("diasBase"),
    diasPermiso: numVal("diasPermiso"),
    tipoBase: tipoBaseVal(),
    mesIso: mesIsoVal(),
  };
}

function syncHints() {
  const tipo = tipoBaseVal();
  const wrapMes = document.getElementById("wrapMes");
  const hintCorridos = document.getElementById("hintCorridos");
  const hintLaborables = document.getElementById("hintLaborables");
  if (wrapMes) wrapMes.hidden = tipo !== TIPO_BASE_PERMISO_SIN_GOCE.corridos;
  if (hintCorridos) hintCorridos.hidden = tipo !== TIPO_BASE_PERMISO_SIN_GOCE.corridos;
  if (hintLaborables) hintLaborables.hidden = tipo !== TIPO_BASE_PERMISO_SIN_GOCE.laborables;
}

function aplicarBaseDesdeMes() {
  if (tipoBaseVal() !== TIPO_BASE_PERMISO_SIN_GOCE.corridos) return;
  const hit = mesIsoVal().match(/^(\d{4})-(\d{2})$/);
  if (!hit) return;
  const n = diasCorridosDelMes(Number(hit[1]), Number(hit[2]));
  const diasBaseEl = el("diasBase");
  if (n > 0 && diasBaseEl) diasBaseEl.value = String(n);
}

function onTipoChange() {
  if (tipoBaseVal() === TIPO_BASE_PERMISO_SIN_GOCE.laborables) {
    const actual = numVal("diasBase");
    if (actual >= 28 && actual <= 31) {
      const diasBaseEl = el("diasBase");
      if (diasBaseEl) diasBaseEl.value = String(PERMISO_SIN_GOCE_GOLD.laborables20.diasBase);
    }
  } else {
    aplicarBaseDesdeMes();
  }
}

function render(calc) {
  el("outDescuento").textContent = calc.ok ? clp(calc.descuento) : "—";
  el("outSueldoMes").textContent = calc.ok ? clp(calc.sueldoMes) : "—";
  el("outValorDia").textContent = calc.ok && calc.valorDia > 0 ? clp(calc.valorDia) : "$ 0";
  el("outBase").textContent = calc.ok ? String(calc.diasBase) : "—";
  el("outDias").textContent = calc.ok ? num(calc.diasPermisoAplicados, 0) : "—";
  el("outSueldo").textContent = clp(calc.sueldoMensual);
  el("outTipo").textContent =
    calc.tipoBase === TIPO_BASE_PERMISO_SIN_GOCE.laborables ? "Días laborables" : "Días corridos";

  const alerta = el("outAlerta");
  if (alerta) {
    if (calc.ok && calc.topeAplicado) {
      alerta.hidden = false;
      alerta.textContent = `Los días de permiso (${num(calc.diasPermiso, 0)}) superan la base del mes (${calc.diasBase}). El descuento se acota a un mes completo: ${clp(calc.descuento)}.`;
    } else {
      alerta.hidden = true;
      alerta.textContent = "";
    }
  }

  const partes = [];
  if (!calc.ok) {
    partes.push(
      calc.motivo === "dias_base"
        ? "Indique una base de días mayor que 0 (días corridos del mes o días laborables pactados)."
        : "Complete el sueldo, la base de días y los días de permiso.",
    );
  } else if (calc.diasPermisoAplicados === 0) {
    partes.push(
      `0 días de permiso: descuento ${clp(0)}. El sueldo del mes se mantiene en ${clp(calc.sueldoMensual)}.`,
    );
  } else {
    const etiqueta =
      calc.tipoBase === TIPO_BASE_PERMISO_SIN_GOCE.laborables ? "días laborables" : "días corridos";
    partes.push(
      `Descuento = (${clp(calc.sueldoMensual)} / ${calc.diasBase} ${etiqueta}) × ${num(calc.diasPermisoAplicados, 0)} = ${clp(calc.descuento)}.`,
    );
    partes.push(`Sueldo del mes tras el descuento = ${clp(calc.sueldoMes)}.`);
  }
  partes.push(
    "Las cotizaciones y el imponible pueden verse afectados según la práctica de la empresa y la naturaleza del pacto: aquí no se recalcula AFP, salud ni impuesto.",
  );
  partes.push(
    "Estimación educativa: no es asesoría legal ni un cálculo de la Dirección del Trabajo ni de Previred. No es finiquito, atraso, licencia médica ni un permiso legal pagado.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  syncHints();
  render(calcularPermisoSinGoce(leer()));
}

wireNav();
const form = document.getElementById("formPermisoSinGoce");
form?.addEventListener("input", recalc);
form?.addEventListener("change", (ev) => {
  const t = ev.target;
  if (t && t.name === "tipoBase") onTipoChange();
  else if (t && t.id === "mesIso") aplicarBaseDesdeMes();
  recalc();
});
recalc();
mountIndicadores();
