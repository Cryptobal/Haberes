import { clp } from "./format.js";
import { calcularTutelaLaboral } from "./finiquito.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function leer() {
  return {
    remuneracion: numVal("remuneracion"),
    meses: numVal("meses") || 6,
  };
}

function render(calc) {
  el("outTotal").textContent = clp(calc.total);
  el("outPiso").textContent = clp(calc.piso);
  el("outTecho").textContent = clp(calc.techo);
  el("outMeses").textContent = String(calc.meses);
  el("outRem").textContent = clp(calc.remuneracion);
  const extra = document.getElementById("boxAdicionales");
  if (extra) extra.hidden = !document.getElementById("verAdicionales")?.checked;
  const partes = [];
  if (calc.motivo === "sin_remuneracion") {
    partes.push("Ingrese la última remuneración mensual para estimar el rango del artículo 489.");
  } else if (calc.recortoRango) {
    partes.push(
      `El artículo 489 recorta los meses al rango legal de ${calc.mesesMin} a ${calc.mesesMax}. Estimación con ${calc.meses} meses: ${clp(calc.total)}.`,
    );
  } else {
    partes.push(
      `${clp(calc.remuneracion)} × ${calc.meses} meses = ${clp(calc.total)}. El juez fija el monto entre ${clp(calc.piso)} y ${clp(calc.techo)}.`,
    );
  }
  partes.push(
    "Estimación educativa: no es asesoría legal ni una liquidación judicial. No suma IAS, aviso, recargos, nulidad del despido ni mora.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  render(calcularTutelaLaboral(leer()));
}

wireNav();
document.getElementById("formTutela")?.addEventListener("input", recalc);
document.getElementById("formTutela")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
