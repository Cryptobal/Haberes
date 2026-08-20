import { JORNADA_DEFAULT } from "./constants.js";
import { clp, num } from "./format.js";
import { valorHoraExtra } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function leer() {
  return {
    sueldoBase: numVal("sueldoBase"),
    jornada: numVal("jornada") || JORNADA_DEFAULT,
    horasExtras: numVal("horasExtras"),
  };
}

function render({ unit, total, horas, jornada }) {
  el("outTotal").textContent = clp(Math.round(total));
  el("outHora").textContent = clp(Math.round(unit));
  el("outHoraExtra").textContent = unit > 0 ? `1 hora extra ≈ ${num(unit)}` : "";
  el("outHoras").textContent = String(horas);
  el("outJornada").textContent = `${jornada} h`;
}

function recalc() {
  const { sueldoBase, jornada, horasExtras } = leer();
  const unit = valorHoraExtra(sueldoBase, jornada);
  render({
    unit,
    total: unit * horasExtras,
    horas: horasExtras,
    jornada,
  });
}

wireNav();
document.getElementById("formHorasExtras")?.addEventListener("input", recalc);
document.getElementById("formHorasExtras")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
