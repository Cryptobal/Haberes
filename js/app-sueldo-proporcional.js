import { clp } from "./format.js";
import { calcularSueldoProporcional, diasCalendarioFraccionMes } from "./sueldo.js";
import { el, mountIndicadores, numVal, val, wireNav } from "./ui.js";

function leer() {
  return {
    remuneracion: numVal("remuneracion"),
    dias: numVal("dias"),
    mesCompleto: Boolean(document.getElementById("mesCompleto")?.checked),
  };
}

function fechasFormulario() {
  return {
    ingreso: val("ingreso") || "",
    salida: val("salida") || "",
  };
}

function aplicarFechasAlFormulario() {
  const { ingreso, salida } = fechasFormulario();
  if (!ingreso && !salida) return null;
  const counted = diasCalendarioFraccionMes({ ingreso, salida });
  if (!counted) return null;
  if (counted.error) return counted;
  const diasEl = document.getElementById("dias");
  if (diasEl) diasEl.value = String(counted.dias);
  const mesEl = document.getElementById("mesCompleto");
  if (mesEl) mesEl.checked = Boolean(counted.mesCompleto);
  return counted;
}

function render(calc, fechasError) {
  el("outBruto").textContent = clp(calc.bruto);
  el("outDias").textContent = String(calc.dias);
  el("outDiario").textContent = clp(Math.round(calc.valorDiario));
  el("outRem").textContent = clp(calc.remuneracion);
  el("outCompleto").textContent = calc.mesCompleto ? "Sí" : "No";

  if (fechasError === "otro_mes") {
    el("outNota").textContent =
      "Ingreso y salida deben caer en el mismo mes. Calcule cada mes por separado.";
    return;
  }
  if (fechasError === "orden") {
    el("outNota").textContent = "La salida no puede ser anterior al ingreso.";
    return;
  }
  if (calc.mesCompleto) {
    el("outNota").textContent =
      "Mes calendario completo: se paga la remuneración pactada. 28 o 31 días no cambian el monto; el 31 no es un día extra.";
    return;
  }
  if (calc.dias > 0 && calc.remuneracion > 0) {
    const tope = calc.topeTreinta
      ? " El motor de liquidación trata 30 días o más como el pactado entero (no 31/30)."
      : "";
    el("outNota").textContent = `${calc.dias} días × remuneración / 30.${tope}`;
    return;
  }
  el("outNota").textContent = "";
}

function recalc(fechasError) {
  render(calcularSueldoProporcional(leer()), fechasError);
}

wireNav();
const form = document.getElementById("formSueldoProporcional");
form?.addEventListener("input", (ev) => {
  const id = ev.target?.id;
  let fechasError;
  if (id === "ingreso" || id === "salida") {
    fechasError = aplicarFechasAlFormulario()?.error;
  }
  recalc(fechasError);
});
form?.addEventListener("change", (ev) => {
  const id = ev.target?.id;
  let fechasError;
  if (id === "ingreso" || id === "salida") {
    fechasError = aplicarFechasAlFormulario()?.error;
  }
  recalc(fechasError);
});
recalc();
mountIndicadores();
