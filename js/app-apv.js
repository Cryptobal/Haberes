import { clp } from "./format.js";
import { calcularApv } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

let indicadores = {};

function leer() {
  return {
    sueldoBase: numVal("sueldoBase"),
    afp: el("afp")?.value || "modelo",
    salud: el("salud")?.value || "fonasa",
    contrato: el("contrato")?.value || "indefinido",
    isaprePactado: numVal("isaprePactado"),
    apvRegimenB: numVal("apvRegimenB"),
  };
}

function syncIsapre() {
  const wrap = el("wrapIsapre");
  if (wrap) wrap.hidden = (el("salud")?.value || "fonasa") !== "isapre";
}

function render(calc) {
  el("outAhorro").textContent = clp(calc.ahorroIusc);
  el("outLiquido").textContent = clp(calc.liquidoConApv);
  el("outApv").textContent = clp(calc.apvDescontado);
  el("outCosto").textContent = clp(calc.costoLiquido);
  el("outBaseSin").textContent = clp(calc.baseTributableSinApv);
  el("outBaseCon").textContent = clp(calc.baseTributableConApv);
  el("outIuscSin").textContent = clp(calc.iuscSinApv);
  el("outIuscCon").textContent = clp(calc.iuscConApv);
  el("outAfp").textContent = clp(calc.afp.monto);
  el("outSalud").textContent = clp(calc.salud.monto);
  el("outCesantia").textContent = clp(calc.cesantia.monto);
  el("outLiquidoSin").textContent = clp(calc.liquidoSinApv);

  const notas = [];
  if (calc.topeUfAplicado) {
    notas.push(
      `El depósito del mes se corta en el tope de ${calc.topeMensualUf} UF (${clp(calc.topeMensual)}). El excedente no entra a esta liquidación.`,
    );
  }
  if (calc.sinAhorroIusc) {
    notas.push(
      "Este mes el APV Régimen B no reduce impuesto único: la renta líquida imponible ya está en el tramo exento, o el IUSC ya era $0.",
    );
  } else {
    notas.push(
      `El APV baja la base del impuesto único en ${clp(calc.apvTributable)}. El mes ahorra ${clp(calc.ahorroIusc)} de IUSC; el líquido baja ${clp(calc.costoLiquido)} porque ${clp(calc.apvDescontado)} va al ahorro.`,
    );
  }
  notas.push(
    "El Régimen A no se simula aquí: la bonificación estatal del 15 % (tope 6 UTM) se ve en Operación Renta, no en esta liquidación.",
  );
  el("outNota").textContent = notas.join(" ");

  const alerta = el("outAlerta");
  if (alerta) {
    const show = calc.sinAhorroIusc || calc.topeUfAplicado || calc.liquidoNegativo;
    alerta.hidden = !show;
    if (calc.liquidoNegativo) {
      alerta.textContent =
        "Atención: con este APV el líquido estimado queda negativo. Revise el monto o el sueldo del mes.";
    } else if (calc.topeUfAplicado) {
      alerta.textContent = `Atención: el APV ingresado supera el tope mensual de ${calc.topeMensualUf} UF. Se usa ${clp(calc.apvDescontado)}.`;
    } else if (calc.sinAhorroIusc) {
      alerta.textContent =
        "Atención: este mes el APV Régimen B no reduce impuesto único. Sí se descuenta del líquido.";
    } else {
      alerta.textContent = "";
    }
  }
}

function recalc() {
  syncIsapre();
  render(calcularApv(leer(), indicadores));
}

wireNav();
const form = document.getElementById("formApv");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
