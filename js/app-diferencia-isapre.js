import { FALLBACK_UF } from "./constants.js";
import { clp, num, ufFmt } from "./format.js";
import { calcularDiferenciaIsapre, ufDiferenciaValida } from "./diferencia-isapre.js";
import { roundPeso } from "./sueldo.js";
import { el, mountIndicadores, val, wireNav } from "./ui.js";

let indicadores = { uf: FALLBACK_UF, fecha: null, fuente: "fallback" };

function numeroCampo(id) {
  const raw = val(id);
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function leer() {
  const ufManual = numeroCampo("ufMes");
  const imponibleCampo = numeroCampo("rentaImponible");
  return {
    imponible: imponibleCampo == null ? 0 : imponibleCampo,
    planUf: numeroCampo("planUf"),
    planClp: numeroCampo("planClp"),
    uf: ufManual == null ? indicadores.uf : ufManual,
    ufEsManual: ufManual != null,
    comparar: Boolean(el("compararFonasa")?.checked),
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

function pesos(ok, n) {
  return ok ? clp(n) : "—";
}

function render(calc, input) {
  const ok = calc.ok;
  el("outDiferencia").textContent = pesos(ok, calc.diferencia);
  el("outLegal").textContent = pesos(ok, calc.saludLegal);
  el("outPlan").textContent = pesos(ok, calc.planPesos);
  el("outIsapre").textContent = pesos(ok, calc.saludIsapre);
  el("outFonasa").textContent = pesos(ok, calc.fonasa);
  el("outExtraMes").textContent = pesos(ok, calc.extraMensual);
  el("outExtraAnio").textContent = pesos(ok, calc.extraAnual);
  el("outUf").textContent = ok ? ufFmt(calc.uf) : "—";
  el("outFuenteUf").textContent = fuenteUf(input.ufEsManual);
  el("outBase").textContent = pesos(ok, roundPeso(calc.baseAfpSalud));

  const comparar = el("bloqueComparar");
  if (comparar) comparar.hidden = !input.comparar;
  const tabla = el("tablaComparar");
  if (tabla) {
    tabla.innerHTML = ok
      ? `<div class="table-scroll">
      <table>
        <caption>Fonasa y Isapre con la misma renta imponible</caption>
        <thead><tr><th></th><th>Fonasa</th><th>Isapre</th></tr></thead>
        <tbody>
          <tr><td>Cotización legal 7 %</td><td>${clp(calc.fonasa)}</td><td>${clp(calc.saludLegal)}</td></tr>
          <tr><td>Precio del plan</td><td>No aplica</td><td>${clp(calc.planPesos)}</td></tr>
          <tr><td>Total descuento salud</td><td>${clp(calc.fonasa)}</td><td>${clp(calc.saludIsapre)}</td></tr>
          <tr><td>Extra sobre el 7 %</td><td>${clp(0)}</td><td>${clp(calc.diferencia)}</td></tr>
        </tbody>
      </table>
    </div>`
      : "";
  }

  const alerta = el("outAlerta");
  if (alerta) {
    if (!ok && calc.motivo === "uf") {
      alerta.hidden = false;
      alerta.textContent = "Indique una UF entre $20.000 y $80.000, o deje el campo vacío para usar la UF del día.";
    } else if (!ok && calc.motivo === "plan") {
      alerta.hidden = false;
      alerta.textContent = "El precio del plan debe ser un número mayor o igual a cero.";
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
      `Con UF ${num(calc.uf, 2)}, la base de salud es ${clp(roundPeso(calc.baseAfpSalud))} (la menor entre la renta y el tope de ${num(calc.topeUf, 0)} UF). El 7 % legal es ${clp(calc.saludLegal)}.`,
    );
    if (calc.planFuente === "uf") {
      partes.push(`El plan de ${num(calc.planUf, 2)} UF equivale a ${clp(calc.planPesos)}.`);
    } else if (calc.planFuente === "clp") {
      partes.push(`El plan ingresado en pesos es ${clp(calc.planPesos)}.`);
    } else {
      partes.push("No hay precio de plan: la diferencia queda en cero y el descuento es el 7 % legal.");
    }
    if (calc.diferencia === 0) {
      partes.push(
        `No hay sobreprecio. Isapre y Fonasa descuentan ${clp(calc.saludIsapre)} este mes (el piso del 7 %).`,
      );
    } else {
      partes.push(
        `El plan supera el 7 % en ${clp(calc.diferencia)} al mes (${clp(calc.extraAnual)} al año, × 12). El descuento de salud en Isapre es ${clp(calc.saludIsapre)}; en Fonasa sería ${clp(calc.fonasa)}.`,
      );
    }
  }
  partes.push(
    "Estimación de Haberes con la misma regla de salud que su liquidación. No es un cálculo de Isapre, Fonasa, la Dirección del Trabajo ni de Previred. No constituye asesoría legal ni previsional.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  const input = leer();
  const calc = calcularDiferenciaIsapre({
    imponible: input.imponible,
    planUf: input.planUf,
    planClp: input.planUf != null ? null : input.planClp,
    uf: input.uf,
  });
  if (input.planUf != null && Number.isFinite(input.planUf) && input.planClp != null && input.planClp > 0) {
    const aviso = el("outPlanAviso");
    if (aviso) aviso.textContent = "Hay precio en UF y en pesos: se usa la UF. Deje la UF vacía para usar el monto en pesos.";
  } else {
    const aviso = el("outPlanAviso");
    if (aviso) aviso.textContent = "";
  }
  render(calc, input);
}

function usarUfDelDia() {
  const campo = el("ufMes");
  if (campo) campo.value = "";
  recalc();
}

function pintarPlaceholderUf() {
  const campo = el("ufMes");
  if (campo && ufDiferenciaValida(indicadores.uf)) campo.placeholder = num(indicadores.uf, 2);
}

wireNav();
const form = document.getElementById("formDiferenciaIsapre");
form?.addEventListener("submit", (ev) => ev.preventDefault());
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
