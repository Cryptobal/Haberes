import { clp } from "./format.js";
import { calcularSalaCuna } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function leer() {
  return {
    trabajadoras: numVal("trabajadoras"),
    ninos: numVal("ninos"),
    costoUnitario: numVal("costoUnitario"),
  };
}

function nota(calc) {
  const partes = [];
  if (calc.obligada) {
    partes.push(
      `Sí: ${calc.trabajadoras} trabajadoras alcanzan el umbral de ${calc.umbral} del artículo 203. El empleador cumple con sala propia, sala compartida o pagando al establecimiento autorizado (JUNJI o reconocimiento oficial del Ministerio de Educación).`,
    );
  } else {
    partes.push(
      `No: ${calc.trabajadoras} trabajadoras quedan bajo el umbral de ${calc.umbral}. El artículo 203 no obliga. El costo de abajo es solo una simulación si igual paga sala cuna.`,
    );
  }
  partes.push(
    `Costo estimado = ${calc.ninos} × ${clp(calc.costoUnitario)} = ${clp(calc.costoMensual)}, si paga el establecimiento. No es un bono en la liquidación de la trabajadora.`,
  );
  return partes.join(" ");
}

function render(calc) {
  el("outObligada").textContent = calc.obligada ? "Sí" : "No";
  el("outCosto").textContent = clp(calc.costoMensual);
  el("outTrabajadoras").textContent = String(calc.trabajadoras);
  el("outUmbral").textContent = String(calc.umbral);
  el("outNinos").textContent = String(calc.ninos);
  el("outUnitario").textContent = clp(calc.costoUnitario);
  el("outNota").textContent = nota(calc);

  const alerta = el("outAlerta");
  if (!alerta) return;
  alerta.hidden = !calc.simulacion;
  alerta.textContent = calc.simulacion
    ? "Atención: bajo el umbral de 20 trabajadoras la empresa no está obligada por el art. 203. El costo es una simulación, no un deber legal de este mes."
    : "";
}

function recalc() {
  render(calcularSalaCuna(leer()));
}

wireNav();
const form = document.getElementById("formSalaCuna");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
