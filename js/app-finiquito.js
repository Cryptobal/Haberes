import { causalPorId, opcionesCausalPicker } from "./causales.js";
import { clp } from "./format.js";
import { calcularFiniquito } from "./finiquito.js";
import { createPicker } from "./picker.js";
import { createDateFields, el, mountIndicadores, numVal, wireNav } from "./ui.js";

let indicadores = { uf: 40854.01 };
let causalPick = null;
let ingresoPick = null;
let terminoPick = null;

function leer() {
  return {
    articulo: causalPorId(causalPick?.getValue())?.articulo || "161",
    causal: causalPick?.getValue(),
    ingreso: ingresoPick?.getValue() || "",
    termino: terminoPick?.getValue() || "",
    remuneracion: numVal("remuneracion"),
    avisoPrevio: el("avisoPrevio")?.checked,
    diasFeriado: numVal("diasFeriado"),
    otros: numVal("otros"),
  };
}

function render(fin) {
  el("outTotal").textContent = clp(fin.total);
  el("outIas").textContent = clp(fin.ias);
  el("outAviso").textContent = clp(fin.aviso);
  el("outFeriado").textContent = clp(fin.feriado);
  el("outAnios").textContent = String(fin.anios);
  const nota = el("notaArticulo");
  const causal = causalPorId(causalPick?.getValue());
  if (causal?.aplicaIas) {
    nota.textContent =
      `${causal.label}. Incluye indemnización por años de servicio (tope 11) e indemnización sustitutiva de aviso si no hubo aviso previo. Esta calculadora pública no desglosa remuneración del mes ni feriado pendiente: eso está en Para mi empresa.`;
  } else if (causal) {
    nota.textContent =
      `${causal.label}. No corresponde IAS ni aviso previo. Sí se estima feriado proporcional. El finiquito completo (letras, membrete y todas las partidas) está en Para mi empresa.`;
  }
}

function recalc() {
  render(calcularFiniquito(leer(), indicadores));
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
ingresoPick = createDateFields(el("pickIngreso"), { value: "2020-01-15", onChange: recalc });
terminoPick = createDateFields(el("pickTermino"), { value: "2023-08-20", onChange: recalc });

document.getElementById("formFiniquito")?.addEventListener("input", recalc);
document.getElementById("formFiniquito")?.addEventListener("change", recalc);
recalc();

mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
