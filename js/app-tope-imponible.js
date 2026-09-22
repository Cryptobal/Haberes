import {
  CESANTIA_EMPLEADOR_INDEFINIDO,
  CESANTIA_EMPLEADOR_PLAZO_FIJO,
  CESANTIA_INDEFINIDO,
  FALLBACK_UF,
  LEY_21735_TASA,
  MUTUAL_TASA_BASICA,
  SALUD_TASA,
  SANNA_TASA,
} from "./constants.js";
import { clp, num, ufFmt } from "./format.js";
import { calcularTopeImponible, ufValida } from "./tope-imponible.js";
import { el, mountIndicadores, numVal, val, wireNav } from "./ui.js";

let indicadores = { uf: FALLBACK_UF, fecha: null, fuente: "fallback" };

function ufManual() {
  const raw = val("ufMes");
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function leer() {
  const manual = ufManual();
  return {
    rentaImponible: numVal("rentaImponible"),
    uf: manual == null ? indicadores.uf : manual,
    ufEsManual: manual != null,
  };
}

function fuenteUf(ufEsManual) {
  if (ufEsManual) return "UF ingresada manualmente";
  const fecha = indicadores.fecha ? new Date(indicadores.fecha).toLocaleDateString("es-CL") : "";
  if (indicadores.fuente === "mindicador" || indicadores.fuente === "cache") {
    return `UF del día según mindicador.cl${fecha ? ` (${fecha})` : ""}`;
  }
  return "UF de respaldo de Haberes (mindicador.cl no respondió)";
}

function pct(n, digits = 1) {
  return `${num(Number(n) * 100, digits)} %`;
}

function pintarTabla(calc) {
  const root = el("tablaTopes");
  if (!root) return;
  const ok = calc.ok;
  const afp = calc.afpSalud;
  const ces = calc.cesantia;
  const filas = [
    ["AFP (10 % + comisión)", afp, "trabajador"],
    [`Salud Fonasa o Isapre (${pct(SALUD_TASA, 0)} legal)`, afp, "trabajador"],
    [`Ley 21.735 con SIS (${pct(LEY_21735_TASA, 1)})`, afp, "empleador"],
    [`Mutual (${pct(MUTUAL_TASA_BASICA, 2)} básica) y SANNA (${pct(SANNA_TASA, 2)})`, afp, "empleador"],
    [`Seguro de cesantía trabajador (${pct(CESANTIA_INDEFINIDO, 1)} indefinido)`, ces, "trabajador"],
    [
      `Seguro de cesantía empleador (${pct(CESANTIA_EMPLEADOR_INDEFINIDO, 1)} indefinido / ${pct(CESANTIA_EMPLEADOR_PLAZO_FIJO, 1)} plazo fijo)`,
      ces,
      "empleador",
    ],
  ]
    .map(
      ([nombre, t, quien]) =>
        `<tr><td>${nombre}</td><td>${quien}</td><td>${num(t.topeUf, 1)} UF</td><td>${ok ? clp(t.topePesos) : "—"}</td><td>${ok ? clp(t.basePesos) : "—"}</td></tr>`,
    )
    .join("");
  root.innerHTML = `
    <div class="table-scroll">
      <table>
        <caption>Qué cotización usa cada tope (UF ${ok ? num(calc.uf, 2) : "—"})</caption>
        <thead><tr><th>Cotización</th><th>De cargo de</th><th>Tope UF</th><th>Tope en pesos</th><th>Renta afecta</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    <p class="hint">
      Los porcentajes se aplican en
      <a href="/cotizaciones-previsionales">calcular cotizaciones previsionales</a>
      (trabajador) y en
      <a href="/costo-empresa">calcular costo empresa</a>
      (empleador). Aquí solo se muestra hasta qué renta se cotiza.
    </p>
  `;
}

function render(calc, ufEsManual) {
  const afp = calc.afpSalud;
  const ces = calc.cesantia;
  const ok = calc.ok;

  el("outTopeAfp").textContent = ok ? clp(afp.topePesos) : "—";
  el("outTopeAfpUf").textContent = `${num(afp.topeUf, 0)} UF`;
  el("outTopeCes").textContent = ok ? clp(ces.topePesos) : "—";
  el("outTopeCesUf").textContent = `${num(ces.topeUf, 1)} UF`;
  el("outUf").textContent = ok ? ufFmt(calc.uf) : "—";
  el("outFuenteUf").textContent = fuenteUf(ufEsManual);
  el("outRentaUf").textContent = ok && calc.rentaImponible > 0 ? `${num(calc.rentaUf, 2)} UF` : "—";
  el("outBaseAfp").textContent = ok ? clp(afp.basePesos) : "—";
  el("outExcesoAfp").textContent = ok ? clp(afp.exceso) : "—";
  el("outBaseCes").textContent = ok ? clp(ces.basePesos) : "—";
  el("outExcesoCes").textContent = ok ? clp(ces.exceso) : "—";

  const alerta = el("outAlerta");
  if (alerta) {
    if (!ok && calc.motivo === "uf") {
      alerta.hidden = false;
      alerta.textContent = "Indique una UF entre $20.000 y $80.000, o deje el campo vacío para usar la UF del día.";
    } else if (!ok) {
      alerta.hidden = false;
      alerta.textContent = "La renta imponible debe ser un número mayor o igual a cero.";
    } else {
      alerta.hidden = true;
      alerta.textContent = "";
    }
  }

  const partes = [];
  if (ok) {
    partes.push(
      `Con UF ${num(calc.uf, 2)}, el tope de AFP y salud (${num(afp.topeUf, 0)} UF) es ${clp(afp.topePesos)} y el tope del seguro de cesantía (${num(ces.topeUf, 1)} UF) es ${clp(ces.topePesos)}.`,
    );
    if (calc.rentaImponible > 0) {
      if (afp.supera) {
        partes.push(
          `La renta ${clp(calc.rentaImponible)} (${num(calc.rentaUf, 2)} UF) supera el tope de AFP y salud: se cotiza sobre ${clp(afp.basePesos)} y quedan ${clp(afp.exceso)} exentos de esas cotizaciones.`,
        );
      } else {
        partes.push(
          `La renta ${clp(calc.rentaImponible)} (${num(calc.rentaUf, 2)} UF) está bajo el tope de AFP y salud: se cotiza completa y faltan ${clp(afp.margen)} para llegar al tope.`,
        );
      }
      if (ces.supera) {
        partes.push(
          `También supera el tope de cesantía: la AFC se calcula sobre ${clp(ces.basePesos)} y ${clp(ces.exceso)} quedan fuera.`,
        );
      } else {
        partes.push(`No supera el tope de cesantía: la AFC se calcula sobre la renta completa.`);
      }
    } else {
      partes.push("Ingrese una renta imponible para ver cuánto queda afecto y cuánto sobre el tope.");
    }
  }
  partes.push(
    "Estimación de Haberes con los topes que usa su motor de liquidaciones; no es la cifra oficial de la Superintendencia de Pensiones, la DT, SUSESO ni el SII. No constituye asesoría legal ni previsional.",
  );
  el("outNota").textContent = partes.join(" ");

  pintarTabla(calc);
}

function recalc() {
  const input = leer();
  render(calcularTopeImponible(input), input.ufEsManual);
}

function usarUfDelDia() {
  const campo = el("ufMes");
  if (campo) campo.value = "";
  recalc();
}

function pintarPlaceholderUf() {
  const campo = el("ufMes");
  if (campo && ufValida(indicadores.uf)) campo.placeholder = num(indicadores.uf, 2);
}

wireNav();
const form = document.getElementById("formTopeImponible");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
el("btnUfDia")?.addEventListener("click", usarUfDelDia);
pintarPlaceholderUf();
recalc();
mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  pintarPlaceholderUf();
  recalc();
});
