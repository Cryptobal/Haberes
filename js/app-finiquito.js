import { articuloDeCausal, causalPorId, opcionesCausalHtml } from "./causales.js";
import { clp } from "./format.js";
import { calcularFiniquito } from "./finiquito.js";
import { el, mountIndicadores, numVal, val, wireNav } from "./ui.js";

let indicadores = { uf: 40854.01 };

if (el("articulo")) {
  el("articulo").innerHTML = opcionesCausalHtml("161-necesidades");
}

function leer() {
  return {
    articulo: articuloDeCausal(val("articulo")),
    causal: val("articulo"),
    ingreso: val("ingreso"),
    termino: val("termino"),
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
  const causal = causalPorId(val("articulo"));
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
document.getElementById("formFiniquito")?.addEventListener("input", recalc);
document.getElementById("formFiniquito")?.addEventListener("change", recalc);
recalc();

mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
