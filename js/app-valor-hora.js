import { JORNADA_DEFAULT } from "./constants.js";
import { clp, num } from "./format.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";
import { calcularValorHora } from "./valor-hora.js";

function leerJornada() {
  const raw = document.getElementById("jornada")?.value ?? "";
  if (String(raw).trim() === "") return JORNADA_DEFAULT;
  const n = Number(String(raw).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function leer() {
  return {
    sueldoBase: numVal("sueldoBase"),
    jornada: leerJornada(),
    compararMinimo: Boolean(document.getElementById("compararMinimo")?.checked),
  };
}

function textoJornada(jornada) {
  const digits = Number.isInteger(jornada) ? 0 : 1;
  return num(jornada, digits);
}

function render(calc, compararMinimo) {
  el("outOrdinaria").textContent = clp(calc.valorHoraOrdinariaRedondeada);
  el("outExtra").textContent = clp(calc.valorHoraExtraRedondeada);
  el("outImm").textContent = clp(calc.valorHoraImmRedondeada);
  el("outImmMonto").textContent = clp(calc.imm);
  el("outJornada").textContent = calc.jornada > 0 ? `${textoJornada(calc.jornada)} h` : "—";

  const fila = el("filaImm");
  if (fila) fila.hidden = !compararMinimo || calc.jornada <= 0;

  if (calc.sueldoBase <= 0 || calc.jornada <= 0) {
    el("outFormula").textContent =
      "Ingrese un sueldo base y una jornada semanal mayor que cero.";
    return;
  }

  el("outFormula").textContent =
    `(${clp(calc.sueldoBase)} / 30) × 28 / (${textoJornada(calc.jornada)} × 4) = ${clp(calc.valorHoraOrdinariaRedondeada)}. ` +
    `La hora extra al 50 % es esa cifra exacta × 1,5, redondeada al peso: ${clp(calc.valorHoraExtraRedondeada)}.`;
}

function recalc() {
  const { sueldoBase, jornada, compararMinimo } = leer();
  render(calcularValorHora({ sueldoBase, jornada }), compararMinimo);
}

wireNav();
const form = document.getElementById("formValorHora");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
