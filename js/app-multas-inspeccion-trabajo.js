import { FALLBACK_UTM } from "./constants.js";
import { clp, num } from "./format.js";
import { calcularMultasInspeccion } from "./multas-inspeccion-trabajo.js";
import { el, mountIndicadores, val, wireNav } from "./ui.js";

let indicadores = { utm: FALLBACK_UTM, fecha: null, fuente: "fallback" };

function numeroCampo(id) {
  const raw = val(id);
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function enteroCampo(id) {
  const raw = val(id);
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function leer() {
  const utmManual = numeroCampo("utmMes");
  const trabajadores = enteroCampo("trabajadores");
  return {
    trabajadores: trabajadores == null ? NaN : trabajadores,
    regimen: el("regimen")?.value || "general",
    reincidencia: Boolean(el("reincidencia")?.checked),
    higiene: Boolean(el("higiene")?.checked),
    utm: utmManual == null ? indicadores.utm : utmManual,
    utmEsManual: utmManual != null,
  };
}

function fuenteUtm(utmEsManual) {
  if (utmEsManual) return "UTM ingresada manualmente";
  const fecha = indicadores.fecha ? new Date(indicadores.fecha).toLocaleDateString("es-CL") : "";
  if (indicadores.fuente === "mindicador" || indicadores.fuente === "cache") {
    return `UTM según mindicador.cl${fecha ? ` (${fecha})` : ""}`;
  }
  return "UTM de respaldo de Haberes (mindicador.cl no respondió)";
}

function textoReincidencia(calc) {
  if (!calc.reincidencia) return "No marcada. El rango es el del artículo, sin duplicar.";
  if (calc.reincidenciaEfecto === "duplica") {
    return "Sí. El artículo ordena duplicar el rango (mínimo y máximo).";
  }
  if (calc.reincidenciaEfecto === "remite_inciso_6") {
    return "Marcada. El art. 292 remite al inciso 6° del art. 506 (facultad de duplicar o triplicar, según la DT). Este rango no se multiplica solo.";
  }
  return "Marcada, pero este artículo no duplica el rango por esa sola marca.";
}

function textoSustitucion(calc) {
  const s = calc.sustitucion;
  if (!s.procede) {
    return "No corresponde el art. 506 ter: está previsto para micro y pequeña empresa (1 a 49 trabajadores, art. 505 bis).";
  }
  const modalidad =
    s.modalidad === "pac"
      ? "programa de asistencia al cumplimiento (art. 506 ter N° 1, higiene y seguridad)"
      : "capacitación de la Dirección del Trabajo (art. 506 ter N° 2)";
  return `Puede solicitarse la sustitución por ${modalidad}. Plazo de solicitud: ${s.plazoSolicitudDiasHabiles} días hábiles desde la notificación. Si se autoriza y no se cumple el programa en ${s.plazoProgramaDiasHabiles} días hábiles, la multa original puede aumentar hasta un ${s.aumentoTopePct} %. El art. 506 bis permite, además, un plazo de a lo menos ${s.plazoCorreccion506BisDiasHabiles} días hábiles para cumplir si no hay riesgo inminente a la seguridad o la salud.`;
}

function render(calc, input) {
  const ok = calc.ok;
  el("outRango").textContent = ok ? `${clp(calc.minPesos)} a ${clp(calc.maxPesos)}` : "—";
  el("outUtm").textContent = ok ? `${num(calc.minUtm, 0)} a ${num(calc.maxUtm, 0)} UTM` : "—";
  el("outTamano").textContent = ok ? `${calc.tamanoNombre} (${calc.trabajadoresTramo})` : "—";
  el("outArticulo").textContent = ok ? `Art. ${calc.articulo} inciso ${calc.inciso}` : "—";
  el("outUtmValor").textContent = ok ? clp(calc.utm) : "—";
  el("outFuenteUtm").textContent = ok ? fuenteUtm(input.utmEsManual) : "—";
  el("outReincidencia").textContent = ok ? textoReincidencia(calc) : "—";
  el("outSustitucion").textContent = ok ? textoSustitucion(calc) : "—";

  const alerta = el("outAlerta");
  if (!alerta) return;
  if (ok) {
    alerta.hidden = true;
    alerta.textContent = "";
    return;
  }
  const msg = {
    trabajadores: "Indique un número entero de trabajadores contratados, de 1 en adelante.",
    utm: "Indique una UTM mayor que cero, o deje el campo vacío para usar la del mes.",
    regimen: "Elija un tipo de infracción de la lista.",
  };
  alerta.hidden = false;
  alerta.textContent = msg[calc.motivo] || "No se pudo estimar el rango.";
}

function recalc() {
  const input = leer();
  render(calcularMultasInspeccion(input), input);
}

function usarUtmDelMes() {
  const campo = el("utmMes");
  if (campo) campo.value = "";
  recalc();
}

function pintarPlaceholderUtm() {
  const campo = el("utmMes");
  if (campo && Number.isFinite(indicadores.utm) && indicadores.utm > 0) {
    campo.placeholder = String(Math.round(indicadores.utm));
  }
}

wireNav();
const form = document.getElementById("formMultas");
form?.addEventListener("submit", (ev) => ev.preventDefault());
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
el("btnUtmMes")?.addEventListener("click", usarUtmDelMes);
pintarPlaceholderUtm();
recalc();
mountIndicadores().then((ind) => {
  if (ind && Number.isFinite(ind.utm) && ind.utm > 0) indicadores = ind;
  pintarPlaceholderUtm();
  recalc();
});
