import { GRATIFICACION_TASA, GRATIFICACION_TOPE } from "./constants.js";
import { clp } from "./format.js";
import { gratificacionArt50 } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function leer() {
  return {
    sueldoBase: numVal("sueldoBase"),
    extras: numVal("extras"),
    bonos: numVal("bonos"),
  };
}

function render({ monto, bruto25, topeAplica }) {
  el("outTotal").textContent = clp(monto);
  el("outBruto").textContent = clp(bruto25);
  el("outTopeAplica").textContent = topeAplica ? "Sí" : "No";
  el("outTope").textContent = clp(GRATIFICACION_TOPE);
  el("outNota").textContent = topeAplica
    ? "Se aplica el tope mensual del artículo 50"
    : `${GRATIFICACION_TASA * 100} % bajo el tope; no se recorta`;
}

function recalc() {
  const { sueldoBase, extras, bonos } = leer();
  const bruto25 = (sueldoBase + extras + bonos) * GRATIFICACION_TASA;
  render({
    monto: gratificacionArt50(sueldoBase, extras, bonos),
    bruto25,
    topeAplica: bruto25 > GRATIFICACION_TOPE,
  });
}

wireNav();
document.getElementById("formGratificacion")?.addEventListener("input", recalc);
document.getElementById("formGratificacion")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
