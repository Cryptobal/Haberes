import { causalPorId, opcionesCausalPicker } from "./causales.js";
import { clp, ufFmt } from "./format.js";
import { calcularAvisoPrevio } from "./finiquito.js";
import { createPicker } from "./picker.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

let indicadores = { uf: 40854.01 };
let causalPick = null;

function leer() {
  return {
    causal: causalPick?.getValue() || "161-necesidades",
    remuneracion: numVal("remuneracion"),
    colacion: numVal("colacion"),
    movilizacion: numVal("movilizacion"),
    avisoPrevio: Boolean(document.getElementById("avisoOtorgado")?.checked),
  };
}

function render(calc) {
  el("outAviso").textContent = clp(calc.aviso);
  el("outBase").textContent = clp(calc.base);
  el("outTopeUf").textContent = clp(calc.topeMensual);
  el("outUf").textContent = ufFmt(calc.uf);
  el("outDerecho").textContent = calc.aplicaAviso ? "Sí" : "No";
  const partes = [];
  if (calc.motivo === "sin_derecho") {
    partes.push(
      `${calc.causalLabel || "Esta causal"} no exige aviso de 30 días del empleador. La sustitutiva es $0. Estimación orientativa: no asesora un juicio.`,
    );
  } else if (calc.motivo === "aviso_otorgado") {
    partes.push(
      "Si se dio el aviso de treinta días, no hay indemnización sustitutiva. El monto es $0.",
    );
  } else {
    partes.push(
      `Una última remuneración (art. 172)${calc.recortoTopeUf ? ", recortada al tope de 90 UF" : ""}.`,
    );
  }
  if (calc.baseIngresada !== calc.remuneracion && calc.motivo === "ok") {
    partes.push(
      `Base ingresada ${clp(calc.baseIngresada)} (sueldo + colación + movilización habituales).`,
    );
  }
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  render(calcularAvisoPrevio(leer(), indicadores));
}

wireNav();
const causalFromUrl = new URLSearchParams(location.search).get("causal");
const causalInicial = causalPorId(causalFromUrl)?.id || "161-necesidades";
causalPick = createPicker(el("pickCausal"), {
  options: opcionesCausalPicker(),
  value: causalInicial,
  searchable: true,
  placeholder: "Causal",
  onChange: recalc,
});

document.getElementById("formAviso")?.addEventListener("input", recalc);
document.getElementById("formAviso")?.addEventListener("change", recalc);
recalc();
mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
