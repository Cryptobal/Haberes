import { calcularGirosCesantia, CIC_MAX_GIROS } from "./giro-seguro-cesantia.js";
import { clp, num } from "./format.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

const MESES = 10;

function pctLabel(p) {
  return `${num(Number(p) * 100, 0)} %`;
}

function ventanaDe(contrato) {
  return contrato === "plazo_fijo" || contrato === "obra" ? 5 : 10;
}

function asegurarMeses() {
  const grid = el("mesesGrid");
  if (!grid || grid.childElementCount) return;
  for (let i = 1; i <= MESES; i++) {
    const field = document.createElement("div");
    field.className = "field";
    field.dataset.mes = String(i);
    const label = document.createElement("label");
    label.htmlFor = `rem${i}`;
    label.textContent = i === 1 ? "Mes 1 (más reciente)" : `Mes ${i}`;
    const input = document.createElement("input");
    input.id = `rem${i}`;
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.inputMode = "numeric";
    input.value = "";
    field.append(label, input);
    grid.append(field);
  }
}

function syncMesesVisibles() {
  const n = ventanaDe(el("contrato")?.value || "indefinido");
  document.querySelectorAll("#mesesGrid .field").forEach((field) => {
    const mes = Number(field.dataset.mes);
    field.hidden = mes > n;
  });
  const lbl = el("lblPromedio");
  if (lbl) {
    lbl.textContent =
      n === 5
        ? "Promedio de las últimas 5 remuneraciones imponibles"
        : "Promedio de las últimas 10 remuneraciones imponibles";
  }
}

function leer() {
  const contrato = el("contrato")?.value || "indefinido";
  const n = ventanaDe(contrato);
  const usarMeses = Boolean(el("boxMeses")?.open);
  const remuneraciones = [];
  if (usarMeses) {
    for (let i = 1; i <= n; i++) {
      const v = numVal(`rem${i}`);
      if (v > 0) remuneraciones.push(v);
    }
  }
  return {
    contrato,
    promedio: numVal("promedio"),
    remuneraciones: remuneraciones.length ? remuneraciones : undefined,
    saldoCic: numVal("saldoCic"),
    fondoSolidario: Boolean(el("fondoSolidario")?.checked),
  };
}

function fila(calc, g) {
  const tr = document.createElement("tr");
  const celdas = [
    String(g.mes),
    pctLabel(g.porcentaje),
    clp(g.teorico),
    clp(g.monto),
    clp(g.desdeCic),
    clp(g.desdeFcs),
    clp(g.saldo),
  ];
  for (const texto of celdas) {
    const td = document.createElement("td");
    td.textContent = texto;
    tr.append(td);
  }
  if (g.consolidado) tr.title = "Incluye el saldo final porque era igual o menor al 20 % del giro anterior (art. 15).";
  return tr;
}

function nota(calc) {
  if (calc.motivo === "promedio") {
    return "Ingrese un promedio imponible mayor que cero, o remuneraciones mensuales.";
  }
  if (calc.motivo === "saldo") {
    return "Sin saldo en la cuenta individual no hay giros de esa cuenta. Marque el fondo solidario solo si quiere estimar el artículo 25.";
  }
  const ventana = calc.ventana === 5 ? "últimos 5 meses" : "últimos 10 meses";
  if (calc.fcsActivo) {
    return `Fondo solidario estimado (art. 25), promedio de los ${ventana}. La cuenta individual paga primero. Haberes no acredita causal, cotizaciones ni BNE. Topes Res. Ex. SP n°383, hasta el 28 de febrero de 2027. Sin 6.º ni 7.º giro.`;
  }
  if (calc.motivo === "cic_alcanza_cinco") {
    return `El saldo alcanza para los 5 giros del artículo 25 (${clp(calc.cincoFcs)}). El fondo solidario no corresponde. La tabla es solo cuenta individual (art. 15), promedio de los ${ventana}.`;
  }
  const tope = calc.cortadoPorTope
    ? ` Quedan ${clp(calc.saldoFinal)} sin girar: la AFC informa hasta ${CIC_MAX_GIROS} giros.`
    : "";
  return `Cuenta individual (art. 15), promedio de los ${ventana}. Sin mínimo ni máximo legal. No se revisan las cotizaciones del artículo 12.${tope}`;
}

function render(calc) {
  el("outTotal").textContent = clp(calc.total);
  el("outPromedio").textContent = clp(calc.promedio);
  el("outN").textContent = String(calc.giros.length);
  el("outCic").textContent = clp(calc.totalCic);
  el("outFcs").textContent = clp(calc.totalFcs);
  el("outSaldo").textContent = clp(calc.saldoFinal);
  el("outNota").textContent = nota(calc);
  const caption = el("outCaption");
  if (caption) {
    caption.textContent = calc.fcsActivo
      ? "Giros del artículo 25: cuenta individual y fondo solidario"
      : "Giros de la cuenta individual (artículo 15)";
  }
  const body = el("outFilas");
  body.replaceChildren();
  for (const g of calc.giros) body.append(fila(calc, g));
}

function recalc() {
  syncMesesVisibles();
  render(calcularGirosCesantia(leer()));
}

asegurarMeses();
wireNav();
document.getElementById("formGiroCesantia")?.addEventListener("input", recalc);
document.getElementById("formGiroCesantia")?.addEventListener("change", recalc);
document.getElementById("boxMeses")?.addEventListener("toggle", recalc);
recalc();
mountIndicadores();
