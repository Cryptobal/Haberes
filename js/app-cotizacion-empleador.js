import { FALLBACK_UF, TOPE_AFP_SALUD_UF } from "./constants.js";
import {
  CRONOGRAMA_LEY_21735,
  calcularCotizacionEmpleador,
  tasaTotalCotizacionEmpleador,
} from "./cotizacion-empleador.js";
import { clp, num } from "./format.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

let indicadores = { uf: FALLBACK_UF };

function pctTasa(rate) {
  const p = Math.round(Number(rate) * 10000) / 100;
  const digits = Math.abs(p * 10 - Math.round(p * 10)) < 1e-9 ? 1 : 2;
  return `${num(p, digits)} %`;
}

function leer() {
  return {
    remuneracionImponible: numVal("remuneracionImponible"),
    periodo: el("periodo")?.value || "2026-08",
  };
}

function render(calc) {
  el("outTotal").textContent = clp(calc.total);
  el("outTasa").textContent = pctTasa(calc.tasa);
  el("outCap").textContent = clp(calc.capitalizacion.monto);
  el("outCev").textContent = clp(calc.expectativaVida.monto);
  el("outCrp").textContent = clp(calc.rentabilidadProtegida.monto);
  el("outSis").textContent = clp(calc.sis.monto);
  el("outTasaCap").textContent = pctTasa(calc.capitalizacion.tasa);
  el("outTasaCev").textContent = pctTasa(calc.expectativaVida.tasa);
  el("outTasaCrp").textContent = pctTasa(calc.rentabilidadProtegida.tasa);
  el("outTasaSis").textContent = pctTasa(calc.sis.tasa);
  el("outBase").textContent = clp(Math.round(calc.imponibleEfectiva));
  el("outTope").textContent = clp(Math.round(calc.topeAfp));

  const bits = [];
  if (calc.desde) bits.push(`${calc.desde} a ${calc.hasta}`);
  if (calc.topeAplicado) {
    bits.push(
      `la base se cortó al tope AFP de ${num(TOPE_AFP_SALUD_UF, 0)} UF (${clp(Math.round(calc.topeAfp))})`,
    );
  } else {
    bits.push(`base bajo el tope AFP de ${num(TOPE_AFP_SALUD_UF, 0)} UF`);
  }
  if (calc.periodoId === "2026-08") {
    bits.push("el SIS va dentro del 3,5 %: no se suma otra vez");
  }
  el("outNota").textContent = bits.length ? `${bits.join("; ")}.` : "";

  document.querySelectorAll("[data-crono]").forEach((row) => {
    const on = row.getAttribute("data-crono") === calc.periodoId;
    if (on) row.setAttribute("aria-current", "true");
    else row.removeAttribute("aria-current");
  });
}

function pintarCronogramaPesos(imponible) {
  for (const fila of CRONOGRAMA_LEY_21735) {
    const calc = calcularCotizacionEmpleador(
      { remuneracionImponible: imponible, periodo: fila.id },
      indicadores,
    );
    const cell = el(`crono-${fila.id}`);
    if (cell) cell.textContent = clp(calc.total);
    const tasa = el(`crono-tasa-${fila.id}`);
    if (tasa) tasa.textContent = pctTasa(tasaTotalCotizacionEmpleador(fila));
  }
}

function recalc() {
  const input = leer();
  pintarCronogramaPesos(input.remuneracionImponible);
  render(calcularCotizacionEmpleador(input, indicadores));
}

wireNav();
document.getElementById("formCotizacionEmpleador")?.addEventListener("input", recalc);
document.getElementById("formCotizacionEmpleador")?.addEventListener("change", recalc);
recalc();
mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
