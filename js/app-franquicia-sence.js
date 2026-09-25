import { clp } from "./format.js";
import { calcularFranquiciaSence, VALORES_HORA_SENCE_2026 } from "./franquicia-sence.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

let indicadores = {};

const TRAMO_TEXTO = {
  1: "100 %",
  0.5: "50 %",
  0.15: "15 %",
};

function leer() {
  return {
    planillaAnualImponible: numVal("planillaAnualImponible"),
    remuneracionBrutaParticipante: numVal("remuneracionBrutaParticipante"),
    horasCurso: numVal("horasCurso"),
    valorHoraSence: numVal("valorHoraSence"),
    costoCurso: numVal("costoCurso"),
    cbc: Boolean(el("cbc")?.checked),
    utm: indicadores.utm,
  };
}

function nota(calc) {
  if (!calc.planillaAnualImponible && !calc.horasCurso) {
    return "Ingrese la planilla anual de remuneraciones imponibles para estimar el tope y la elegibilidad.";
  }
  if (!calc.elegible) {
    return `La planilla no supera 35 UTM (${clp(calc.umbral35Utm)}): el crédito no corresponde. El 1 % aritmético sería ${clp(calc.topeAnual1pct)}. Falta, además, ser contribuyente de 1ª categoría con cotizaciones pagadas: eso no se comprueba aquí.`;
  }
  const tramo = TRAMO_TEXTO[calc.tramoPct] || "";
  if (calc.costoCurso > 0 && calc.copagoEmpresa > 0) {
    return `Tramo ${tramo}. Lo franquiciable queda en ${clp(calc.montoFranquiciableCurso)} (tope anual ${clp(calc.topeAnual1pct)}). El costo supera ese monto: copago estimado de la empresa ${clp(calc.copagoEmpresa)}. No es liquidación SENCE ni un OTIC.`;
  }
  if (calc.cbc) {
    return `Con Comité Bipartito el valor hora pasa de ${clp(calc.valorHoraSence)} a ${clp(calc.valorHoraAplicado)} (+20 %). Tramo ${tramo}. Franquiciable ${clp(calc.montoFranquiciableCurso)}, tope anual ${clp(calc.topeAnual1pct)}.`;
  }
  return `Tramo ${tramo} del valor hora SENCE. Franquiciable ${clp(calc.montoFranquiciableCurso)}, dentro del tope anual ${clp(calc.topeAnual1pct)}. No es liquidación SENCE ni simulación de un OTIC.`;
}

function render(calc) {
  el("outFranquiciable").textContent = clp(calc.montoFranquiciableCurso);
  el("outElegible").textContent = calc.elegible ? "Sí" : "No";
  el("outTope").textContent = clp(calc.topeAnual1pct);
  el("outTramo").textContent = TRAMO_TEXTO[calc.tramoPct] || "—";
  el("outUmbral25").textContent = clp(calc.umbral25Utm);
  el("outUmbral35").textContent = clp(calc.umbral35Utm);
  el("outUmbral50").textContent = clp(calc.umbral50Utm);
  el("outBruto").textContent = clp(calc.brutoFranquicia);
  el("outCopago").textContent = clp(calc.copagoEmpresa);
  el("outValorHora").textContent = clp(calc.valorHoraAplicado);
  el("outUtm").textContent = clp(calc.utm);
  el("outNota").textContent = nota(calc);
}

function llenarPresets() {
  const sel = el("presetHora");
  if (!sel || sel.dataset.ready === "1") return;
  sel.dataset.ready = "1";
  const grupos = [
    ["trabajadores", "Trabajadores de la empresa"],
    ["directa", "Ejecución directa o nivelación"],
  ];
  for (const [id, label] of grupos) {
    const og = document.createElement("optgroup");
    og.label = label;
    for (const row of VALORES_HORA_SENCE_2026.filter((r) => r.grupo === id)) {
      const opt = document.createElement("option");
      opt.value = String(row.valor);
      opt.textContent = `${row.modalidad} · ${row.detalle}`;
      if (row.id === "presencial-tramo-1") opt.selected = true;
      og.append(opt);
    }
    sel.append(og);
  }
  const custom = document.createElement("option");
  custom.value = "custom";
  custom.textContent = "Otro valor (editar el monto)";
  sel.append(custom);
}

function aplicarPreset() {
  const sel = el("presetHora");
  const input = el("valorHoraSence");
  if (!sel || !input || sel.value === "custom") return;
  input.value = sel.value;
}

function recalc() {
  render(calcularFranquiciaSence(leer(), indicadores));
}

wireNav();
llenarPresets();
document.getElementById("formFranquicia")?.addEventListener("input", (ev) => {
  if (ev.target?.id === "valorHoraSence") {
    const sel = el("presetHora");
    if (sel && sel.value !== "custom" && sel.value !== ev.target.value) sel.value = "custom";
  }
  recalc();
});
document.getElementById("formFranquicia")?.addEventListener("change", recalc);
el("presetHora")?.addEventListener("change", () => {
  aplicarPreset();
  recalc();
});
recalc();
mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
