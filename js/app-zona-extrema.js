import {
  GRADO_1A_EUS_ZONA_EXTREMA,
  ZONA_EXTREMA_GOLD,
} from "./constants.js";
import { clp, num } from "./format.js";
import {
  ZONAS_EXTREMAS,
  calcularZonaExtrema,
  pctIncrementadoDesdeBase,
  zonaExtremaPorId,
} from "./zona-extrema.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

const GOLD = ZONA_EXTREMA_GOLD.iquique2000;

function zonaIdVal() {
  return String(el("zonaId")?.value || GOLD.zonaId).trim();
}

function leer() {
  const zona = zonaExtremaPorId(zonaIdVal());
  return {
    rentaAfecta: numVal("rentaAfecta"),
    pctIncrementado: numVal("pctIncrementado"),
    pctBase: zona && zona.pctBase > 0 ? zona.pctBase : 0,
    grado1A: numVal("grado1A") || GRADO_1A_EUS_ZONA_EXTREMA,
    zonaId: zonaIdVal(),
  };
}

function aplicarPctDesdeZona() {
  const zona = zonaExtremaPorId(zonaIdVal());
  const pctEl = el("pctIncrementado");
  if (!pctEl || !zona || zona.id === "otro") return;
  pctEl.value = String(pctIncrementadoDesdeBase(zona.pctBase));
}

function textoFallo(calc) {
  if (calc.motivo === "renta") {
    return "Indique la renta afecta original (imponible menos cotizaciones obligatorias del trabajador), mayor que 0.";
  }
  if (calc.motivo === "pct") {
    return "Indique el porcentaje de asignación de zona incrementado (Ley 19.354), mayor que 0.";
  }
  if (calc.motivo === "grado") {
    return "Indique el sueldo del grado 1-A de la EUS del mes, mayor que 0.";
  }
  return "Complete los datos para estimar la rebaja.";
}

function render(calc) {
  el("outRebaja").textContent = calc.ok ? clp(calc.rebajaEfectiva) : "—";
  el("outNueva").textContent = calc.ok ? clp(calc.rentaAfectaNueva) : "—";
  el("outSinTope").textContent = calc.ok ? clp(calc.rebajaSinTope) : "—";
  el("outTope").textContent = calc.ok ? clp(calc.tope) : "—";
  el("outPct").textContent = calc.pctIncrementado > 0 ? `${num(calc.pctIncrementado, 1)} %` : "—";
  el("outGrado").textContent = calc.grado1A > 0 ? clp(calc.grado1A) : "—";
  el("outIuscAntes").textContent = calc.ok ? clp(calc.iuscAntes) : "—";
  el("outIuscDespues").textContent = calc.ok ? clp(calc.iuscDespues) : "—";
  el("outAhorroIusc").textContent = calc.ok ? clp(calc.ahorroIusc) : "—";

  const alerta = el("outAlerta");
  if (alerta) {
    if (!calc.ok) {
      alerta.hidden = false;
      alerta.textContent = textoFallo(calc);
    } else if (calc.topeAplica) {
      alerta.hidden = false;
      alerta.textContent = `El tope del grado 1-A (${clp(calc.tope)}) es menor que la rebaja sin tope (${clp(calc.rebajaSinTope)}). Se usa el tope.`;
    } else {
      alerta.hidden = true;
      alerta.textContent = "";
    }
  }

  const partes = [];
  if (!calc.ok) {
    partes.push(textoFallo(calc));
  } else {
    const zona = zonaExtremaPorId(calc.zonaId);
    const donde = zona && zona.id !== "otro" ? zona.label : "localidad indicada";
    partes.push(
      `Renta afecta original ${clp(calc.rentaAfecta)} en ${donde}, % incrementado ${num(calc.pctIncrementado, 1)} %.`,
    );
    partes.push(
      `Rebaja sin tope = redondeo(${clp(calc.rentaAfecta)} × ${num(calc.pctIncrementado, 1)} / (${num(calc.pctIncrementado, 1)} + 100)) = ${clp(calc.rebajaSinTope)}.`,
    );
    partes.push(
      `Tope = redondeo(${clp(calc.grado1A)} × ${num(calc.pctIncrementado, 1)} / 100) = ${clp(calc.tope)}.`,
    );
    partes.push(
      `Rebaja efectiva = mínimo = ${clp(calc.rebajaEfectiva)}. Renta afecta nueva = ${clp(calc.rentaAfectaNueva)}.`,
    );
    partes.push(
      `IUSC estimado (misma tabla de /impuesto-unico, agosto 2026): ${clp(calc.iuscAntes)} antes y ${clp(calc.iuscDespues)} después (ahorro ${clp(calc.ahorroIusc)}).`,
    );
  }
  partes.push(
    "Solo orienta la rebaja del art. 13 D.L. 889 sobre la base del IUSC. No es la tabla de tramos, el líquido, ni la bonificación a la mano de obra del empleador.",
  );
  partes.push(
    "Estimación educativa: no es asesoría legal ni un cálculo del SII, de la Dirección del Trabajo ni de Previred. El caso concreto puede diferir.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  render(calcularZonaExtrema(leer()));
}

function onZonaChange() {
  aplicarPctDesdeZona();
  recalc();
}

wireNav();
const sel = el("zonaId");
if (sel && !sel.options.length) {
  for (const z of ZONAS_EXTREMAS) {
    const opt = document.createElement("option");
    opt.value = z.id;
    opt.textContent = z.label;
    if (z.id === GOLD.zonaId) opt.selected = true;
    sel.append(opt);
  }
}
sel?.addEventListener("change", onZonaChange);
const form = document.getElementById("formZonaExtrema");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
