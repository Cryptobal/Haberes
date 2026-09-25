import { AFP_COMISION, AFP_NOMBRES } from "./constants.js";
import { clp, num } from "./format.js";
import { createPicker } from "./picker.js";
import { calcularSueldoLiquidoABruto } from "./sueldo-liquido-a-bruto.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

let indicadores = { uf: 40854.01 };
let pickAfp = null;
let pickContrato = null;
let pickSalud = null;

const AFP_OPTS = ["uno", "modelo", "planvital", "habitat", "capital", "cuprum", "provida"].map((k) => ({
  value: k,
  label: `${AFP_NOMBRES[k]} (${String(AFP_COMISION[k]).replace(".", ",")} %)`,
}));

function modo() {
  return document.querySelector('input[name="modo"]:checked')?.value || "simple";
}

function leer() {
  const completa = modo() === "completa";
  const contrato = pickContrato?.getValue() || "indefinido";
  return {
    liquidoObjetivo: numVal("liquidoObjetivo"),
    afp: pickAfp?.getValue() || "modelo",
    salud: pickSalud?.getValue() || "fonasa",
    isaprePactado: numVal("isaprePactado"),
    contrato,
    cotizaCesantia: contrato === "indefinido" && Boolean(el("cotizaCesantia")?.checked),
    jornada: completa ? numVal("jornada") || 42 : 42,
    horasExtras: completa ? numVal("horasExtras") : 0,
    bonos: completa ? numVal("bonos") : 0,
    otrosImponibles: completa ? numVal("otrosImponibles") : 0,
    colacion: completa ? numVal("colacion") : 0,
    movilizacion: completa ? numVal("movilizacion") : 0,
    otrosNoImponibles: completa ? numVal("otrosNoImponibles") : 0,
    gratificacionArt50: completa && Boolean(el("gratificacionArt50")?.checked),
    otrosDescuentos: completa ? numVal("otrosDescuentos") : 0,
  };
}

function nota(res) {
  if (res.motivo === "cero") return "Con líquido $0 el bruto estimado es $0.";
  if (res.motivo === "supera_minimo") {
    return "Los haberes no imponibles ya superan el líquido objetivo. Baje colación, movilización u otros no imponibles, o suba el líquido.";
  }
  if (res.motivo === "tope" || res.motivo === "sin_solucion") {
    return "No hay un bruto razonable que produzca ese líquido con estos descuentos. Revise el monto o los descuentos fijos.";
  }
  if (!res.costoDisponible) {
    return "El bruto reproduce el líquido con el mismo motor de liquidación. El costo empresa con haberes extra está en calcular costo empresa.";
  }
  return "Estimación. El bruto es el sueldo base que, pasado por el mismo cálculo de líquido, cae a $1 del objetivo.";
}

function render(res) {
  el("outBruto").textContent = res.ok ? clp(res.bruto) : "—";
  el("outLiquido").textContent = res.liquido == null ? "—" : clp(res.liquido);
  el("outHaberes").textContent = res.totalHaberes == null ? "—" : clp(res.totalHaberes);
  el("outDescuentos").textContent = res.totalDescuentos == null ? "—" : clp(res.totalDescuentos);
  el("outImponible").textContent = res.imponible == null ? "—" : clp(res.imponible);
  el("outIusc").textContent = res.iusc == null ? "—" : clp(res.iusc);
  el("outCosto").textContent = res.costoEmpresa == null ? "—" : clp(res.costoEmpresa);
  el("outNota").textContent = nota(res);
  const uf = res.uf;
  el("outUf").textContent = uf ? `UF del cálculo: ${num(uf)}` : "";

  const fill = (id, rows) => {
    el(id).innerHTML = (rows || [])
      .map((r) => `<li><span>${r.label}</span><strong>${clp(r.monto)}</strong></li>`)
      .join("");
  };
  fill("listaHaberes", res.ok ? res.haberes : []);
  fill("listaDescuentos", res.ok ? res.descuentos : []);
}

function recalc() {
  render(calcularSueldoLiquidoABruto(leer(), indicadores));
}

function syncUi() {
  const completa = modo() === "completa";
  el("bloqueCompleta").hidden = !completa;
  const isapre = (pickSalud?.getValue() || "fonasa") === "isapre";
  el("wrapIsapre").hidden = !isapre;
  const indefinido = (pickContrato?.getValue() || "indefinido") === "indefinido";
  el("wrapCesantia").hidden = !indefinido;
  recalc();
}

wireNav();
pickAfp = createPicker(el("pickAfp"), {
  options: AFP_OPTS,
  value: "modelo",
  searchable: true,
  placeholder: "AFP",
  onChange: syncUi,
});
pickContrato = createPicker(el("pickContrato"), {
  options: [
    { value: "indefinido", label: "Indefinido" },
    { value: "plazo_fijo", label: "Plazo fijo" },
  ],
  value: "indefinido",
  searchable: false,
  placeholder: "Contrato",
  onChange: syncUi,
});
pickSalud = createPicker(el("pickSalud"), {
  options: [
    { value: "fonasa", label: "Fonasa 7 %" },
    { value: "isapre", label: "Isapre (pactado vs 7 %)" },
  ],
  value: "fonasa",
  searchable: false,
  placeholder: "Salud",
  onChange: syncUi,
});

document.getElementById("formInverso")?.addEventListener("input", syncUi);
document.getElementById("formInverso")?.addEventListener("change", syncUi);
syncUi();

mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
