import { clp, num } from "./format.js";
import { calcularJornadaParcial } from "./jornada-parcial.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

/** type=number usa punto decimal; no recortar puntos como miles. */
function decimalVal(id) {
  const raw = el(id)?.value;
  if (raw == null || raw === "") return 0;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function leer() {
  return {
    jornadaOrdinariaSemanal: decimalVal("jornadaOrdinaria"),
    horasParcialContrato: decimalVal("horasParcial"),
    sueldoOrdinarioReferencia: numVal("sueldoReferencia"),
  };
}

function render(calc) {
  el("outMax").textContent = `${num(calc.maxParcialHoras, 2)} h`;
  el("outCumple").textContent = calc.cumpleTope ? "Sí" : "No";
  el("outPorcentaje").textContent = `${num(calc.porcentajeJornada, 2)} %`;
  el("outSueldo").textContent = calc.sueldoOrdinarioReferencia > 0 ? clp(calc.sueldoParcial) : "—";
  el("outFeriado").textContent = `${num(calc.diasFeriado, 2)} días`;
  el("outOrdinaria").textContent = `${num(calc.jornadaOrdinariaSemanal, 2)} h`;
  el("outParcial").textContent = `${num(calc.horasParcialContrato, 2)} h`;

  const alerta = el("outAlerta");
  if (alerta) {
    if (!calc.cumpleTope && calc.jornadaOrdinariaSemanal > 0) {
      alerta.hidden = false;
      alerta.textContent =
        `La jornada parcial pactada (${num(calc.horasParcialContrato, 2)} h) supera el tope legal de 2/3 (${num(calc.maxParcialHoras, 2)} h, art. 40 bis). El sueldo proporcional se muestra igual como referencia matemática, no como validación del pacto.`;
    } else {
      alerta.hidden = true;
      alerta.textContent = "";
    }
  }

  const partes = [];
  if (calc.jornadaOrdinariaSemanal <= 0) {
    partes.push("Indique la jornada ordinaria semanal de la empresa (entre 30 y 45 h).");
  } else {
    partes.push(
      `Tope art. 40 bis = (2/3) × ${num(calc.jornadaOrdinariaSemanal, 2)} h = ${num(calc.maxParcialHoras, 2)} h. ` +
        `El contrato de ${num(calc.horasParcialContrato, 2)} h ${calc.cumpleTope ? "cabe" : "no cabe"} en ese máximo (tolerancia ${num(calc.toleranciaHoras, 2)} h).`,
    );
    partes.push(
      `% de jornada = 100 × ${num(calc.horasParcialContrato, 2)} / ${num(calc.jornadaOrdinariaSemanal, 2)} = ${num(calc.porcentajeJornada, 2)} %.`,
    );
    if (calc.sueldoOrdinarioReferencia > 0) {
      partes.push(
        `Sueldo proporcional orientativo = ${clp(calc.sueldoOrdinarioReferencia)} × ${num(calc.horasParcialContrato, 2)} / ${num(calc.jornadaOrdinariaSemanal, 2)} = ${clp(calc.sueldoParcial)}. El pacto escrito puede ser otro.`,
      );
    } else {
      partes.push("Indique un sueldo de jornada ordinaria de referencia para estimar el proporcional en pesos.");
    }
    partes.push(
      `Feriado anual orientativo = 15 × ${num(calc.horasParcialContrato, 2)} / ${num(calc.jornadaOrdinariaSemanal, 2)} = ${num(calc.diasFeriado, 2)} días (base art. 67). No es el monto en dinero.`,
    );
  }
  partes.push("Estimación educativa: no es asesoría legal ni un cálculo de la Dirección del Trabajo ni de Previred.");
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  render(calcularJornadaParcial(leer()));
}

wireNav();
const form = document.getElementById("formJornadaParcial");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
