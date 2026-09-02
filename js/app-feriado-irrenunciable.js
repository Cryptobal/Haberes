import { HORAS_EXTRA_FACTOR, JORNADA_DEFAULT } from "./constants.js";
import { clp, num } from "./format.js";
import { calcularFeriadoIrrenunciable } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

/** type=number usa punto decimal; no recortar puntos como miles. */
function decimalVal(id) {
  const raw = el(id)?.value;
  if (raw == null || raw === "") return 0;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function leer() {
  const rawFactor = decimalVal("factorRecargo");
  return {
    sueldoBase: numVal("sueldoBase"),
    jornada: decimalVal("jornada") || JORNADA_DEFAULT,
    horasTrabajadas: decimalVal("horasFeriado"),
    factorRecargo: rawFactor > 0 ? rawFactor : HORAS_EXTRA_FACTOR,
    descanso: Boolean(document.getElementById("compensarDescanso")?.checked),
  };
}

function render(calc, descanso) {
  const total = clp(Math.round(calc.total));
  const horasTxt = `${String(calc.horas).replace(".", ",")} h`;
  const diasTxt = `${num(calc.diasDescansoEquivalentes, 2)} días`;
  el("outTotal").textContent = descanso ? `${horasTxt} · ${diasTxt}` : total;
  el("outMetricLabel").textContent = descanso ? "Descanso equivalente" : "Total del día";
  el("outHoraNota").textContent = descanso
    ? calc.horas > 0
      ? `Equivalente educativo: ${horasTxt} de descanso (${diasTxt} si la semana se reparte en 5 días). La fórmula en pesos sigue siendo ${total}; no se inventa otro monto.`
      : "Ingrese las horas trabajadas ese día para ver el equivalente en descanso."
    : calc.horaConRecargo > 0
      ? `1 hora con recargo ≈ ${num(calc.horaConRecargo)} (factor ${String(calc.factor).replace(".", ",")}×)`
      : "";
  el("outHoraOrd").textContent = clp(Math.round(calc.valorHoraOrdinaria));
  el("outHoraRecargo").textContent = clp(Math.round(calc.horaConRecargo));
  el("outHoras").textContent = String(calc.horas).replace(".", ",");
  el("outJornada").textContent = `${calc.jornada} h`;
  el("outFactor").textContent = `${String(calc.factor).replace(".", ",")}×`;
  el("outDescansoHoras").textContent = horasTxt;
  el("outDescansoDias").textContent = diasTxt;
  const panel = el("panelDescanso");
  if (panel) panel.hidden = !descanso;
}

function recalc() {
  const { descanso, ...input } = leer();
  render(calcularFeriadoIrrenunciable(input), descanso);
}

wireNav();
document.getElementById("formFeriadoIrrenunciable")?.addEventListener("input", recalc);
document.getElementById("formFeriadoIrrenunciable")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
