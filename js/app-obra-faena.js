import { clp, num, ufFmt } from "./format.js";
import { calcularIndemnizacionObraFaena } from "./finiquito.js";
import { el, mountIndicadores, numVal, val, wireNav } from "./ui.js";

let indicadores = { uf: 40854.01 };

function leer() {
  return {
    ingreso: val("ingreso") || "",
    termino: val("termino") || "",
    celebracion: val("celebracion") || "",
    remuneracion: numVal("remuneracion"),
  };
}

function render(calc) {
  el("outMonto").textContent = clp(calc.monto);
  el("outMeses").textContent = String(calc.mesesComputables);
  el("outDias").textContent = num(calc.diasIndemnizacion, calc.diasIndemnizacion % 1 === 0 ? 0 : 1);
  el("outFactor").textContent = `${num(calc.factor, 1)} días/mes`;
  el("outBase").textContent = clp(calc.base);
  el("outDia").textContent = clp(calc.valorDia);
  el("outTopeUf").textContent = clp(calc.topeMensual);
  el("outUf").textContent = ufFmt(calc.uf);

  const partes = [];
  if (calc.motivo === "sin_regimen") {
    partes.push(
      "El régimen de la Ley 21.122 rige contratos por obra o faena celebrados desde el 1 de enero de 2019. Antes de esa fecha esta indemnización legal no aplica.",
    );
  } else if (calc.motivo === "menos_un_mes") {
    partes.push(
      "El artículo 163 exige un mes o más de vigencia. Sin ese mes no hay indemnización por tiempo servido, aunque la fracción de días sea mayor a 15.",
    );
  } else if (calc.mesesComputables > 0) {
    const extra =
      calc.diasFraccion > 15
        ? ` La fracción de ${calc.diasFraccion} días (superior a 15) suma un mes.`
        : calc.diasFraccion > 0
          ? ` La fracción de ${calc.diasFraccion} días no supera 15: no suma mes.`
          : "";
    partes.push(
      `${calc.mesesComputables} mes${calc.mesesComputables === 1 ? "" : "es"} × ${num(calc.factor, 1)} días × ${clp(calc.valorDia)} (remuneración / 30).${extra}`,
    );
  }
  if (calc.recortoTopeUf) {
    partes.push(`La base se recortó a 90 UF (${ufFmt(calc.uf)}), según el artículo 172.`);
  }
  partes.push(
    "Solo corresponde si el término es por conclusión de la obra (art. 159 N°5). No es la IAS de 30 días por año. Estimación educativa: no es finiquito completo ni asesoría.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  try {
    render(calcularIndemnizacionObraFaena(leer(), indicadores));
  } catch {
    render(calcularIndemnizacionObraFaena({ remuneracion: numVal("remuneracion") }, indicadores));
  }
}

wireNav();
document.getElementById("formObraFaena")?.addEventListener("input", recalc);
document.getElementById("formObraFaena")?.addEventListener("change", recalc);
recalc();
mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
