import {
  PACTO_4X3_DIAS_MIN,
  PACTO_4X3_GOLD,
} from "./constants.js";
import { calcularPacto4x3, PACTO_4X3_ELEGIBILIDAD } from "./pacto-4x3.js";
import { num } from "./format.js";
import { el, mountIndicadores, wireNav } from "./ui.js";

function decimalVal(id, fallback) {
  const raw = el(id)?.value;
  if (raw == null || raw === "") return fallback;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function leer() {
  return {
    horasSemanales: decimalVal("horasSemanales", PACTO_4X3_GOLD.clasico40.horasSemanales),
    diasTrabajo: decimalVal("diasTrabajo", PACTO_4X3_DIAS_MIN),
    reduccionAnticipada: Boolean(el("reduccionAnticipada")?.checked),
  };
}

function etiquetaElegibilidad(calc) {
  if (calc.elegibilidad === PACTO_4X3_ELEGIBILIDAD.ahora) {
    return "Elegible ahora";
  }
  if (calc.elegibilidad === PACTO_4X3_ELEGIBILIDAD.desde_2028) {
    return "Recién desde 26-abr-2028";
  }
  return "No aplica";
}

function textoFallo(calc) {
  if (calc.motivo === "supera_40") {
    return `Con ${num(calc.horasSemanales, 2)} h semanales, sin reducción anticipada a 40 h, el pacto 4×3 no aplica todavía: primero bajar a 40 h (art. 8° transitorio) o esperar al 26-abr-2028 (art. 28). Haberes no estima horas/día «como si» cupieran.`;
  }
  if (calc.motivo === "tope") {
    return `El reparto estimado es ${num(calc.horasDiarias, 2)} h/día, sobre el tope ordinario de ${num(calc.topeDiarioH, 0)} h/día (art. 28). No se aplica.`;
  }
  if (calc.motivo === "dias") {
    return `El art. 28 permite distribuir la jornada ordinaria en no menos de ${num(calc.diasMin, 0)} ni más de ${num(calc.diasMax, 0)} días. ${num(calc.diasTrabajo, 0)} días no se aplica.`;
  }
  return "Indique horas semanales ordinarias mayores que 0.";
}

function render(calc) {
  const metric = el("outHorasDiarias");
  if (metric) {
    metric.textContent = calc.horasDiarias > 0 ? `${num(calc.horasDiarias, 2)} h/día` : "—";
  }
  el("outDescanso").textContent = `${num(calc.diasDescanso, 0)} días`;
  el("outElegibilidad").textContent = etiquetaElegibilidad(calc);
  el("outTope").textContent = calc.horasDiarias > 0
    ? (calc.cabeEnTopeDiario ? `Sí (≤ ${num(calc.topeDiarioH, 0)} h)` : `No (> ${num(calc.topeDiarioH, 0)} h)`)
    : "—";
  el("outSemanales").textContent = calc.horasSemanales > 0 ? `${num(calc.horasSemanales, 2)} h` : "—";
  el("outReparto").textContent = calc.horasParaReparto > 0 ? `${num(calc.horasParaReparto, 2)} h` : "—";
  el("outDias").textContent = `${num(calc.diasTrabajo, 0)} días`;

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
    partes.push(
      `${num(calc.horasParaReparto, 2)} h semanales en ${num(calc.diasTrabajo, 0)} días de trabajo dejan ${num(calc.horasDiarias, 2)} h/día y ${num(calc.diasDescanso, 0)} días de descanso.`,
    );
    if (calc.reduccionAnticipada && calc.horasSemanales > calc.horasParaReparto) {
      partes.push(
        `La reducción anticipada a ${num(calc.horasParaReparto, 0)} h (art. 8° transitorio) es la que se reparte; no se usa la jornada actual de ${num(calc.horasSemanales, 2)} h.`,
      );
    }
    partes.push("Elegible ahora por el art. 8° transitorio (jornada de 40 h o menos, o reducción anticipada a 40 h).");
  }
  partes.push(
    "El pacto es voluntario y escrito: no es automático por la rebaja a 42 h de abril de 2026.",
  );
  partes.push(
    "Estimación educativa: no es asesoría legal ni un cálculo de la Dirección del Trabajo ni de Previred. No es el tope gradual 44/42/40, ni el art. 22 bis, ni las bandas horarias de cuidado familiar.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  render(calcularPacto4x3(leer()));
}

wireNav();
const form = document.getElementById("formPacto4x3");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
