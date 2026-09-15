import { clp } from "./format.js";
import { calcularDescansoCompensatorio } from "./descanso-compensatorio.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function leer() {
  return {
    domingos: numVal("domingos"),
    festivos: numVal("festivos"),
    otorgados: numVal("otorgados"),
    remuneracion: numVal("remuneracion"),
  };
}

function render(calc) {
  const n = calc.pendientes;
  el("outPendientes").textContent = String(n);
  el("outGenerados").textContent = String(calc.generados);
  el("outOtorgados").textContent = String(calc.otorgados);
  el("outDomingos").textContent = String(calc.domingos);
  el("outFestivos").textContent = String(calc.festivos);
  el("outDia").textContent = calc.valorDia > 0 ? clp(calc.valorDia) : "—";
  el("outEstimacion").textContent = calc.valorDia > 0 ? clp(calc.estimacion) : "—";

  const partes = [];
  partes.push(
    `${calc.domingos} domingo${calc.domingos === 1 ? "" : "s"} + ${calc.festivos} festivo${calc.festivos === 1 ? "" : "s"} = ${calc.generados} día${calc.generados === 1 ? "" : "s"} generado${calc.generados === 1 ? "" : "s"}; menos ${calc.otorgados} ya otorgado${calc.otorgados === 1 ? "" : "s"} → ${n} pendiente${n === 1 ? "" : "s"}.`,
  );
  if (calc.valorDia > 0) {
    partes.push(
      `Valor día educativo ${clp(calc.valorDia)} (remuneración / 30) × ${n} = ${clp(calc.estimacion)}. No es un recargo legal para sustituir el descanso.`,
    );
  } else {
    partes.push("Indique una remuneración solo si quiere ver el valor día educativo (rem / 30).");
  }
  partes.push(
    "Un día por domingo trabajado y otro por cada festivo efectivamente trabajado (art. 38). Si domingo y festivo coinciden, cuéntelo una sola vez. Estimación educativa: no es asesoría legal.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  render(calcularDescansoCompensatorio(leer()));
}

wireNav();
document.getElementById("formDescansoCompensatorio")?.addEventListener("input", recalc);
document.getElementById("formDescansoCompensatorio")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
