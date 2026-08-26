import {
  AFP_COMISION,
  AFP_NOMBRES,
  AFP_OBLIGATORIO,
  CESANTIA_INDEFINIDO,
  FALLBACK_UF,
  SALUD_TASA,
  TOPE_AFP_SALUD_UF,
  TOPE_CESANTIA_UF,
} from "./constants.js";
import { clp, num } from "./format.js";
import { calcularSueldo, tasaAfp } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

let indicadores = { uf: FALLBACK_UF };

function leer() {
  return {
    sueldoBase: numVal("sueldoImponible"),
    afp: el("afp")?.value || "modelo",
    salud: "fonasa",
    contrato: "indefinido",
  };
}

function totalPrevisional(calc) {
  return calc.afp.monto + calc.salud.monto + calc.cesantia.monto;
}

function pct(n, digits = 2) {
  return `${num(Number(n) * 100, digits)} %`;
}

function render(calc) {
  el("outTotal").textContent = clp(totalPrevisional(calc));
  el("outAfp").textContent = clp(calc.afp.monto);
  el("outSalud").textContent = clp(calc.salud.monto);
  el("outCesantia").textContent = clp(calc.cesantia.monto);
  el("outBaseAfp").textContent = clp(Math.round(calc.baseAfpSalud));
  el("outBaseCes").textContent = clp(Math.round(calc.baseCesantia));
  el("outTopeAfp").textContent = clp(Math.round(calc.topeAfpSalud));
  el("outTopeCes").textContent = clp(Math.round(calc.topeCesantia));
  el("outTasaAfp").textContent = pct(calc.afp.tasa);
  el("outTasaSalud").textContent = pct(SALUD_TASA, 0);
  el("outTasaCes").textContent = pct(CESANTIA_INDEFINIDO, 1);

  const overAfp = calc.imponible > calc.topeAfpSalud + 0.5;
  const overCes = calc.imponible > calc.topeCesantia + 0.5;
  const bits = [];
  if (overAfp) bits.push(`AFP y salud se calculan sobre el tope de ${num(TOPE_AFP_SALUD_UF, 0)} UF`);
  if (overCes) bits.push(`cesantía se calcula sobre el tope de ${num(TOPE_CESANTIA_UF, 1)} UF`);
  el("outTopeNota").textContent = bits.length
    ? `Sueldo sobre el tope: ${bits.join("; ")}.`
    : `La base está bajo los topes (${num(TOPE_AFP_SALUD_UF, 0)} UF AFP/salud y ${num(TOPE_CESANTIA_UF, 1)} UF cesantía).`;

  pintarComparador(calc);
}

function pintarComparador(actual) {
  const root = el("tablaAfp");
  if (!root) return;
  const rows = Object.keys(AFP_COMISION)
    .map((key) => {
      const calc = calcularSueldo(
        {
          sueldoBase: actual.imponible,
          afp: key,
          salud: "fonasa",
          contrato: "indefinido",
        },
        indicadores,
      );
      const tasa = tasaAfp(key);
      const marcada = key === actual.afp.key ? " (elegida)" : "";
      return `<tr><td>${AFP_NOMBRES[key]}${marcada}</td><td>${num(AFP_COMISION[key], 2)} %</td><td>${pct(tasa)}</td><td>${clp(calc.afp.monto)}</td></tr>`;
    })
    .join("");
  root.innerHTML = `
    <div class="table-scroll">
      <table>
        <caption>Misma base imponible, distinta comisión AFP (${pct(AFP_OBLIGATORIO, 0)} obligatorio + comisión)</caption>
        <thead><tr><th>AFP</th><th>Comisión</th><th>Tasa total</th><th>Cotización AFP</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="hint">
      El ${pct(AFP_OBLIGATORIO, 0)} obligatorio es igual en todas. Cambia solo la comisión.
      Salud Fonasa y cesantía del trabajador no dependen de la AFP.
    </p>
  `;
}

function recalc() {
  render(calcularSueldo(leer(), indicadores));
}

wireNav();
document.getElementById("formCotizaciones")?.addEventListener("input", recalc);
document.getElementById("formCotizaciones")?.addEventListener("change", recalc);
recalc();
mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
