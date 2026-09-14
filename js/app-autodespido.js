import { clp, ufFmt } from "./format.js";
import { calcularIas } from "./finiquito.js";
import { el, mountIndicadores, numVal, val, wireNav } from "./ui.js";

let indicadores = { uf: 40854.01 };

function leer() {
  return {
    ingreso: val("ingreso") || "",
    termino: val("termino") || "",
    remuneracion: numVal("remuneracion"),
    avisoPrevio: !document.getElementById("incluirAviso")?.checked,
  };
}

function render(calc) {
  el("outIas").textContent = clp(calc.ias);
  el("outAnios").textContent = String(calc.anios);
  el("outBase").textContent = clp(calc.baseIas);
  el("outTopeUf").textContent = clp(calc.topeMensual);
  el("outAviso").textContent = calc.avisoPrevio ? "No incluida" : clp(calc.aviso);
  el("outTotal").textContent = clp(calc.totalIasAviso);
  el("outUf").textContent = ufFmt(calc.uf);

  const partes = [];
  if (!calc.vigenciaUnAnio) {
    partes.push(
      "El artículo 163 exige un año o más de vigencia. Sin ese año no hay IAS legal que reclamar en el autodespido. El aviso sustitutivo, si lo marca, es otra partida (art. 162 inc. 4).",
    );
  } else {
    const extra = calc.recortoTopeAnios
      ? ` Se aplicó el tope de 11 años (330 días); sin tope serían ${calc.aniosSinTope}.`
      : "";
    partes.push(`${calc.anios} año${calc.anios === 1 ? "" : "s"} × ${clp(calc.baseIas)}.${extra}`);
  }
  if (calc.recortoTopeUf) {
    partes.push(`La base se recortó a 90 UF (${ufFmt(calc.uf)}).`);
  }
  if (!calc.avisoPrevio) {
    partes.push(
      "Si el juez acoge, el art. 171 también ordena la sustitutiva del aviso (art. 162 inc. 4): una última remuneración, no un año extra de IAS.",
    );
  }
  partes.push(
    "No incluye el recargo del art. 171 (50 % en causal 160 N°7; hasta 80 % en N°1 y 5): lo declara y fija el juez. Estimación educativa: no es demanda ni asesoría.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  try {
    render(calcularIas(leer(), indicadores));
  } catch {
    render(
      calcularIas(
        { remuneracion: numVal("remuneracion"), avisoPrevio: !document.getElementById("incluirAviso")?.checked },
        indicadores,
      ),
    );
  }
}

wireNav();
document.getElementById("formAutodespido")?.addEventListener("input", recalc);
document.getElementById("formAutodespido")?.addEventListener("change", recalc);
recalc();
mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
