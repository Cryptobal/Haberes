import { JORNADA_DEFAULT } from "./constants.js";
import { clp } from "./format.js";
import { calcularSueldoMinimo } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function leer() {
  return {
    tramo: el("tramo")?.value === "menorMayor" ? "menorMayor" : "general",
    horasSemana: numVal("horasSemana") || JORNADA_DEFAULT,
    sueldoBase: numVal("sueldoBase"),
    mesesReliquidacion: numVal("mesesReliquidacion"),
  };
}

function nota(calc) {
  const pct = Math.round(calc.factor * 1000) / 10;
  const jornada = `${String(calc.jornadaOrdinaria).replace(".", ",")} h`;
  if (calc.horas <= 0) {
    return "Ingrese las horas pactadas a la semana para estimar el piso.";
  }
  if (calc.factor >= 1) {
    return `Jornada ordinaria (${jornada}): el piso es el IMM completo del tramo.`;
  }
  return `Jornada parcial: ${clp(calc.imm)} × ${String(calc.horas).replace(".", ",")} / ${jornada} (${String(pct).replace(".", ",")} %).`;
}

function render(calc) {
  el("outPiso").textContent = clp(calc.immProporcional);
  el("outNota").textContent = nota(calc);
  el("outImm").textContent = clp(calc.imm);
  el("outProporcional").textContent = clp(calc.immProporcional);
  el("outJornada").textContent = `${String(calc.jornadaOrdinaria).replace(".", ",")} h`;
  el("outTope").textContent = clp(calc.topeGratificacionArt50);
  el("outNoRem").textContent = clp(calc.immNoRemuneracional);

  const gapEl = el("outGap");
  const gapRow = el("rowGap");
  if (!calc.sueldoBase) {
    gapEl.textContent = "—";
    if (gapRow) gapRow.hidden = true;
  } else {
    if (gapRow) gapRow.hidden = false;
    if (calc.gap > 0) gapEl.textContent = `${clp(calc.gap)} bajo el piso`;
    else if (calc.gap < 0) gapEl.textContent = `${clp(-calc.gap)} sobre el piso`;
    else gapEl.textContent = "En el piso";
  }

  const relEl = el("outReliquidacion");
  const relRow = el("rowReliquidacion");
  const gratEl = el("outGratDelta");
  if (calc.mesesReliquidacion > 0 && calc.reliquidacionTotal > 0) {
    if (relRow) relRow.hidden = false;
    relEl.textContent = clp(calc.reliquidacionTotal);
    gratEl.textContent = `${clp(calc.gratificacionSobreDelta)} / mes`;
  } else if (calc.sueldoBase && calc.gratificacionSobreDelta > 0) {
    if (relRow) relRow.hidden = false;
    relEl.textContent = `${clp(calc.reliquidacionMes)} / mes`;
    gratEl.textContent = clp(calc.gratificacionSobreDelta);
  } else {
    if (relRow) relRow.hidden = true;
    relEl.textContent = "—";
    gratEl.textContent = "—";
  }
}

function recalc() {
  render(calcularSueldoMinimo(leer()));
}

wireNav();
document.getElementById("formSueldoMinimo")?.addEventListener("input", recalc);
document.getElementById("formSueldoMinimo")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
