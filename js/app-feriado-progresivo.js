import { clp } from "./format.js";
import { calcularFeriadoProgresivo } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function leer() {
  return {
    aniosEmpleadoresAnteriores: numVal("aniosAnteriores"),
    aniosEmpleadorActual: numVal("aniosActual"),
    remuneracionMensual: numVal("remuneracion"),
    feriadoBasico: document.getElementById("feriadoBasico20")?.checked ? 20 : 15,
  };
}

function cantidad(n, singular, plural) {
  const rounded = Math.round(Number(n) * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
  return `${text} ${rounded === 1 ? singular : plural}`;
}

function render(calc) {
  el("outExtra").textContent = cantidad(calc.diasExtra, "día", "días");
  el("outAnual").textContent = calc.aplicaFeriadoBasico
    ? cantidad(calc.diasFeriadoAnual, "día hábil", "días hábiles")
    : "Aún no vence el art. 67";
  el("outBasico").textContent = cantidad(calc.feriadoBasico, "día hábil", "días hábiles");
  el("outNuevos").textContent = cantidad(calc.aniosNuevosConActual, "año", "años");
  el("outBase").textContent = calc.baseCumplida ? "Sí (10 años)" : "No";
  el("outValor").textContent = calc.valorExtra > 0 ? clp(calc.valorExtra) : "—";
  const faltan = cantidad(calc.aniosFaltanProximo, "año", "años");
  if (!calc.baseCumplida) {
    el("outNota").textContent =
      `Falta la base de 10 años. Con el empleador actual hacen falta ${faltan} para el primer día extra (completar la base y tres años nuevos).`;
  } else if (calc.diasExtra === 0) {
    el("outNota").textContent =
      `Base de 10 años cumplida. Faltan ${faltan} con este empleador para el primer día extra.`;
  } else {
    const extra = cantidad(calc.diasExtra, "día extra", "días extra");
    const valor =
      calc.valorExtra > 0
        ? ` Estimación de esos días extra: ${clp(calc.valorExtra)} (${calc.diasExtra} × remuneración / 30).`
        : "";
    el("outNota").textContent = `${extra} sobre el feriado básico. El próximo día, en ${faltan} más con este empleador.${valor}`;
  }
}

function recalc() {
  render(calcularFeriadoProgresivo(leer()));
}

wireNav();
document.getElementById("formFeriadoProgresivo")?.addEventListener("input", recalc);
document.getElementById("formFeriadoProgresivo")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
