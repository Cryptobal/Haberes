import { clp, ufFmt } from "./format.js";
import { calcularDespidoInjustificado, calcularIas } from "./finiquito.js";
import { el, mountIndicadores, numVal, val, wireNav } from "./ui.js";

let indicadores = { uf: 40854.01 };

function usarHelper() {
  return Boolean(document.getElementById("usarHelper")?.checked);
}

function incluirAviso() {
  return Boolean(document.getElementById("incluirAviso")?.checked);
}

function syncUi() {
  const helper = usarHelper();
  const aviso = incluirAviso();
  const boxHelper = document.getElementById("boxIasHelper");
  const boxAviso = document.getElementById("boxAviso");
  const baseIas = document.getElementById("baseIas");
  if (boxHelper) boxHelper.hidden = !helper;
  if (boxAviso) boxAviso.hidden = !aviso || helper;
  if (baseIas) {
    baseIas.readOnly = helper;
    baseIas.toggleAttribute("readonly", helper);
  }
}

function leer() {
  const input = {
    porcentaje: numVal("porcentaje") || 30,
    incluirAviso: incluirAviso(),
  };
  if (usarHelper()) {
    input.ingreso = val("ingreso") || "";
    input.termino = val("termino") || "";
    input.remuneracion = numVal("remuneracion");
    try {
      const ias = calcularIas(
        {
          ingreso: input.ingreso,
          termino: input.termino,
          remuneracion: input.remuneracion,
          avisoPrevio: true,
        },
        indicadores,
      );
      const campo = document.getElementById("baseIas");
      if (campo && document.activeElement !== campo) {
        campo.value = String(ias.ias);
      }
    } catch {
      /* fechas incompletas: la fórmula usa 0 */
    }
  } else {
    input.baseIas = numVal("baseIas");
    if (input.incluirAviso) input.remuneracion = numVal("remuneracionAviso");
  }
  return input;
}

function render(calc) {
  el("outRecargo").textContent = clp(calc.recargo);
  el("outBase").textContent = clp(calc.baseIas);
  el("outTramo").textContent = `${calc.porcentaje} %`;
  el("outIasRecargo").textContent = clp(calc.totalIasConRecargo);
  el("outAviso").textContent = calc.incluirAviso ? clp(calc.aviso) : "No incluido";
  el("outTotal").textContent = clp(calc.total);
  const ufEl = document.getElementById("outUf");
  if (ufEl) {
    const uf = calc.iasDetalle?.uf || calc.avisoDetalle?.uf;
    ufEl.textContent = uf ? ufFmt(uf) : "—";
  }

  const partes = [];
  if (calc.motivo === "sin_base") {
    partes.push(
      "Ingrese la base de la indemnización por años de servicio (art. 163) o estímela con fechas y remuneración.",
    );
  } else if (calc.recortoTramo) {
    partes.push(
      `El artículo 168 solo contempla 30 %, 50 %, 80 % o 100 %. Estimación con ${calc.porcentaje} %.`,
    );
  } else {
    partes.push(
      `Recargo ${calc.porcentaje} % sobre ${clp(calc.baseIas)} = ${clp(calc.recargo)}. IAS + recargo: ${clp(calc.totalIasConRecargo)}.`,
    );
  }
  if (calc.incluirAviso) {
    partes.push(
      `El aviso del artículo 162 (inciso 4°) se suma aparte y no lleva recargo: ${clp(calc.aviso)}.`,
    );
  }
  partes.push(
    "Estimación educativa: el juez declara y fija. Haberes no litiga ni asesora. No es una liquidación judicial.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  syncUi();
  render(calcularDespidoInjustificado(leer(), indicadores));
}

wireNav();
document.getElementById("formDespido")?.addEventListener("input", recalc);
document.getElementById("formDespido")?.addEventListener("change", recalc);
recalc();
mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
