import { FALLBACK_UF } from "./constants.js";
import { clp, num } from "./format.js";
import { calcularCostoEmpresa } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

let indicadores = { uf: FALLBACK_UF };

function modoActual() {
  return document.querySelector('input[name="modo"]:checked')?.value || "bruto";
}

function syncCampos() {
  const modo = modoActual();
  const label = el("labelMonto");
  if (label) {
    label.textContent = modo === "liquido" ? "Líquido objetivo mensual" : "Sueldo bruto mensual";
  }
}

function leer() {
  return {
    modo: modoActual(),
    monto: numVal("monto"),
    contrato: el("contrato")?.value || "indefinido",
    afp: el("afp")?.value || "modelo",
    salud: "fonasa",
    gratificacionArt50: Boolean(el("gratificacion")?.checked),
    mutualAdicionalPct: numVal("mutualAdicional"),
  };
}

function pct(n, digits = 2) {
  return `${num(Number(n) * 100, digits)} %`;
}

function render(calc) {
  el("outTotal").textContent = clp(calc.costoEmpresa);
  el("outHaberes").textContent = clp(calc.totalHaberes);
  el("outAportes").textContent = clp(calc.totalAportes);
  el("outLey").textContent = clp(calc.ley21735.monto);
  el("outCesEmp").textContent = clp(calc.cesantiaEmpleador.monto);
  el("outMutual").textContent = clp(calc.mutual.monto);
  el("outSanna").textContent = clp(calc.sanna.monto);
  el("outLiquido").textContent = clp(calc.liquido);
  el("outTasaLey").textContent = pct(calc.ley21735.tasa, 1);
  el("outTasaCes").textContent = pct(calc.cesantiaEmpleador.tasa, 1);
  el("outTasaMutual").textContent = pct(calc.mutual.tasa, 2);

  const bits = [];
  if (calc.modo === "liquido") {
    bits.push(`Bruto equivalente ${clp(calc.sueldoBase)}`);
  }
  if (calc.gratificacion) {
    bits.push(`incluye gratificación art. 50 ${clp(calc.gratificacion)}`);
  }
  const overAfp = calc.imponible > calc.topeAfpSalud + 0.5;
  const overCes = calc.imponible > calc.topeCesantia + 0.5;
  if (overAfp) bits.push("Ley 21.735, mutual y SANNA sobre el tope de 90 UF");
  if (overCes) bits.push("cesantía del empleador sobre el tope de 135,2 UF");
  el("outNota").textContent = bits.length
    ? `${bits.join("; ")}.`
    : "Costo = sueldo pagado al trabajador + cotizaciones de cargo del empleador.";
}

function recalc() {
  syncCampos();
  render(calcularCostoEmpresa(leer(), indicadores));
}

wireNav();
document.getElementById("formCostoEmpresa")?.addEventListener("input", recalc);
document.getElementById("formCostoEmpresa")?.addEventListener("change", recalc);
recalc();
mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
