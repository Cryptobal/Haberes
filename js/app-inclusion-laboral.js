import { clp } from "./format.js";
import { calcularInclusionLaboral } from "./inclusion-laboral.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function leer() {
  return {
    dotacion: numVal("dotacion"),
    contratados: numVal("contratados"),
    imm: numVal("imm"),
  };
}

function render(calc) {
  el("outCuota").textContent = calc.aplica ? String(calc.cuota) : "No aplica";
  el("outGap").textContent = calc.aplica ? String(calc.gap) : "—";
  el("outDonacion").textContent = calc.aplica ? clp(calc.donacion) : "—";
  el("outDotacion").textContent = String(calc.dotacion);
  el("outContratados").textContent = String(calc.contratados);
  el("outUmbral").textContent = String(calc.umbral);
  el("outImm").textContent = clp(calc.imm);
  el("outUnitaria").textContent = calc.aplica ? clp(calc.donacionUnitaria) : "—";

  const partes = [];
  if (!calc.aplica) {
    partes.push(
      `No aplica la cuota: ${calc.dotacion} trabajador${calc.dotacion === 1 ? "" : "es"} queda${calc.dotacion === 1 ? "" : "n"} bajo el umbral de ${calc.umbral} (promedio anual, DS N°64). La empresa no está obligada por tamaño.`,
    );
  } else {
    partes.push(
      `Cuota = 1 % × ${calc.dotacion} = ${(calc.dotacion * calc.tasa).toLocaleString("es-CL", { maximumFractionDigits: 2 })}, aproximado al entero inferior (DS N°64 art. 6 c) → ${calc.cuota}.`,
    );
    partes.push(
      `Ya contratados que cuentan para la cuota: ${calc.contratados}. Gap = máx(0, ${calc.cuota} − ${calc.contratados}) = ${calc.gap}.`,
    );
    if (calc.gap === 0) {
      partes.push("Cumplimiento por contratación directa: no hay déficit ni donación orientativa.");
    } else {
      partes.push(
        `Donación subsidiaria orientativa: ${calc.gap} × ${calc.immPorPersona} IMM (${clp(calc.imm)}) = ${clp(calc.donacion)} al año (piso art. 157 ter). Requiere razones fundadas; no sustituye la comunicación electrónica de enero a la DT.`,
      );
    }
  }
  partes.push("Estimación educativa: no es asesoría legal ni contable.");
  el("outNota").textContent = partes.join(" ");

  const alerta = el("outAlerta");
  if (!alerta) return;
  if (!calc.aplica) {
    alerta.hidden = false;
    alerta.textContent =
      "Atención: con menos de 100 trabajadores (promedio anual del reglamento) la empresa no está obligada por la cuota del 1 %. Esta página no abre un trámite ante la DT.";
  } else if (calc.gap > 0) {
    alerta.hidden = false;
    alerta.textContent =
      "El monto de donación es un piso orientativo (24 IMM por persona del déficit). Solo procede como medida subsidiaria si hay razones fundadas (naturaleza de las funciones o falta de interesados). Confírmelo en la comunicación electrónica de enero.";
  } else {
    alerta.hidden = true;
    alerta.textContent = "";
  }
}

function recalc() {
  render(calcularInclusionLaboral(leer()));
}

wireNav();
const form = document.getElementById("formInclusionLaboral");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
