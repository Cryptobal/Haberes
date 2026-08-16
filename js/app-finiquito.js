import { clp } from "./format.js";
import { calcularFiniquito } from "./finiquito.js";
import { el, mountIndicadores, numVal, val, wireNav } from "./ui.js";

let indicadores = { uf: 40854.01 };

function leer() {
  return {
    articulo: val("articulo"),
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
  if (fin.articulo === "161") {
    nota.textContent =
      "Artículo 161: incluye indemnización por años de servicio (tope 11) e indemnización sustitutiva de aviso si no hubo aviso previo.";
  } else {
    nota.textContent =
      "Artículos 159 y 160: no corresponde IAS ni aviso previo. Sí se estima feriado proporcional.";
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
