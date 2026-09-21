import { clp } from "./format.js";
import { calcularPromedioRemuneraciones } from "./promedio-remuneraciones.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function boolVal(id) {
  return Boolean(el(id)?.checked);
}

function leer() {
  return {
    incluirGratificacion: boolVal("incluirGratificacion"),
    meses: [1, 2, 3].map((i) => ({
      fija: numVal(`m${i}Fija`),
      variables: numVal(`m${i}Variables`),
      gratificacion: numVal(`m${i}Gratificacion`),
    })),
  };
}

function syncGratificacionUi() {
  const box = document.getElementById("boxGratificacion");
  if (box) box.hidden = !boolVal("incluirGratificacion");
}

function textoFallo(calc) {
  if (calc.motivo === "meses") {
    return "Indique al menos un mes con sueldo fijo o variables mayor que 0. Los meses en 0 o vacíos no entran al promedio.";
  }
  return "Complete los datos para estimar el promedio.";
}

function etiquetaMes(indice) {
  return indice === 1 ? "Mes 1 (reciente)" : `Mes ${indice}`;
}

function render(calc) {
  const metric = el("outPromedio");
  if (metric) metric.textContent = calc.ok ? clp(calc.promedio) : "—";
  el("outN").textContent = calc.ok ? String(calc.n) : "—";
  el("outSuma").textContent = calc.ok ? clp(calc.suma) : "—";
  for (const mes of calc.meses) {
    const node = el(`outMes${mes.indice}`);
    if (node) node.textContent = mes.valido ? clp(mes.total) : "—";
  }

  const alerta = el("outAlerta");
  if (alerta) {
    if (!calc.ok) {
      alerta.hidden = false;
      alerta.textContent = textoFallo(calc);
    } else {
      alerta.hidden = true;
      alerta.textContent = "";
    }
  }

  const partes = [];
  if (!calc.ok) {
    partes.push(textoFallo(calc));
  } else {
    const desglose = calc.meses
      .filter((m) => m.valido)
      .map((m) => `${etiquetaMes(m.indice)} ${clp(m.total)}`)
      .join("; ");
    partes.push(`Promedio de ${calc.n} mes${calc.n === 1 ? "" : "es"}: ${desglose}.`);
    partes.push(
      `Suma ${clp(calc.suma)} / ${calc.n} = ${clp(calc.promedio)} (pesos enteros, half-up).`,
    );
    if (!calc.incluirGratificacion) {
      partes.push(
        "La gratificación no entra: márquela solo si en el caso concreto forma parte de la remuneración periódica (art. 172 es casuístico).",
      );
    } else {
      partes.push("Incluye la gratificación del mes marcada como periódica.");
    }
  }
  partes.push(
    "Solo orienta la última remuneración del art. 172 cuando hay variables. El tope 90 UF vive en IAS, aviso y finiquito. No es sueldo líquido ni liquidación Previred.",
  );
  partes.push(
    "Estimación educativa: no es asesoría legal ni un cálculo de la Dirección del Trabajo ni de Previred. El caso concreto puede diferir.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  syncGratificacionUi();
  render(calcularPromedioRemuneraciones(leer()));
}

async function copiarPromedio() {
  const calc = calcularPromedioRemuneraciones(leer());
  const estado = el("outCopia");
  if (!calc.ok) {
    if (estado) estado.textContent = textoFallo(calc);
    return;
  }
  const texto = String(calc.promedio);
  try {
    await navigator.clipboard.writeText(texto);
    if (estado) estado.textContent = `Promedio copiado: ${clp(calc.promedio)}. Péguelo en finiquito, IAS o aviso previo.`;
  } catch {
    if (estado) estado.textContent = `No se pudo copiar. Use el número ${clp(calc.promedio)} a mano.`;
  }
}

wireNav();
const form = document.getElementById("formPromedioRemuneraciones");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
el("btnCopiar")?.addEventListener("click", () => {
  copiarPromedio();
});
recalc();
mountIndicadores();
