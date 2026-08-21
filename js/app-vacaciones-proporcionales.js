import { clp } from "./format.js";
import { feriadoProporcional } from "./finiquito.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function leer() {
  return {
    remuneracion: numVal("remuneracion"),
    dias: numVal("diasFeriado"),
  };
}

function render({ total, dias, remuneracion }) {
  const diario = remuneracion > 0 ? remuneracion / 30 : 0;
  el("outTotal").textContent = clp(total);
  el("outDiario").textContent = clp(Math.round(diario));
  el("outDias").textContent = String(dias);
  el("outRem").textContent = clp(Math.round(remuneracion));
  el("outNota").textContent =
    dias > 0 && remuneracion > 0
      ? `${dias} días × remuneración / 30`
      : "";
}

function recalc() {
  const { remuneracion, dias } = leer();
  render({
    total: feriadoProporcional(dias, remuneracion),
    dias,
    remuneracion,
  });
}

wireNav();
document.getElementById("formVacaciones")?.addEventListener("input", recalc);
document.getElementById("formVacaciones")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
