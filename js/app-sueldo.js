import { clp, num } from "./format.js";
import { calcularSueldo } from "./sueldo.js";
import { el, mountIndicadores, numVal, val, wireNav } from "./ui.js";

let indicadores = { uf: 40854.01 };

function modo() {
  return document.querySelector('input[name="modo"]:checked')?.value || "simple";
}

function leer() {
  const completa = modo() === "completa";
  return {
    sueldoBase: numVal("sueldoBase"),
    afp: val("afp"),
    salud: val("salud"),
    isaprePactado: numVal("isaprePactado"),
    contrato: val("contrato"),
    jornada: completa ? numVal("jornada") || 42 : 42,
    horasExtras: completa ? numVal("horasExtras") : 0,
    bonos: completa ? numVal("bonos") : 0,
    otrosImponibles: completa ? numVal("otrosImponibles") : 0,
    colacion: completa ? numVal("colacion") : 0,
    movilizacion: completa ? numVal("movilizacion") : 0,
    otrosNoImponibles: completa ? numVal("otrosNoImponibles") : 0,
    gratificacionArt50: completa && el("gratificacionArt50")?.checked,
    otrosDescuentos: completa ? numVal("otrosDescuentos") : 0,
  };
}

function render(calc) {
  el("outLiquido").textContent = clp(calc.liquido);
  el("outHaberes").textContent = clp(calc.totalHaberes);
  el("outDescuentos").textContent = clp(calc.totalDescuentos);
  el("outImponible").textContent = clp(calc.imponible);
  el("outTributable").textContent = clp(calc.baseTributable);
  el("outHoraExtra").textContent = `1 hora extra ≈ ${num(calc.valorHoraExtra)}`;

  const fill = (id, rows) => {
    el(id).innerHTML = rows
      .map(
        (r) =>
          `<li><span>${r.label}</span><strong>${clp(r.monto)}</strong></li>`,
      )
      .join("");
  };
  fill("listaHaberes", calc.haberes);
  fill("listaDescuentos", calc.descuentos);
}

function recalc() {
  const calc = calcularSueldo(leer(), indicadores);
  render(calc);
}

function syncUi() {
  const completa = modo() === "completa";
  el("bloqueCompleta").hidden = !completa;
  const isapre = val("salud") === "isapre";
  el("wrapIsapre").hidden = !isapre;
  recalc();
}

wireNav();
document.getElementById("formSueldo")?.addEventListener("input", syncUi);
document.getElementById("formSueldo")?.addEventListener("change", syncUi);
syncUi();

mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
