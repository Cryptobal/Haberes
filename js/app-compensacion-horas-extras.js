import {
  COMPENSACION_HE_GOLD,
  COMPENSACION_HE_JORNADA_DIARIA_42_5,
  COMPENSACION_HE_JORNADA_DIARIA_DEFAULT,
} from "./constants.js";
import { calcularCompensacionHorasExtras } from "./compensacion-horas-extras.js";
import { clp, num } from "./format.js";
import { el, mountIndicadores, wireNav } from "./ui.js";

function decimalVal(id, fallback) {
  const raw = el(id)?.value;
  if (raw == null || raw === "") return fallback;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function leer() {
  return {
    horasExtra: decimalVal("horasExtra", COMPENSACION_HE_GOLD.clasico16.horasExtra),
    horasJornadaDiaria: decimalVal(
      "horasJornadaDiaria",
      COMPENSACION_HE_JORNADA_DIARIA_DEFAULT,
    ),
    sueldoMensual: decimalVal("sueldoMensual", 0),
  };
}

function fmtDias(n) {
  return num(n, Number.isInteger(n) ? 0 : 2);
}

function textoFallo(calc) {
  if (calc.motivo === "jornada") {
    return "Indique horas de jornada diaria mayores que 0 (p. ej. 8 o 8,4).";
  }
  return "Indique horas extraordinarias acumuladas mayores que 0.";
}

function render(calc) {
  const metric = el("outDias");
  if (metric) {
    metric.textContent = calc.ok ? `${num(calc.diasEquivalentes, 2)} días` : "—";
  }
  el("outHorasFeriado").textContent = calc.ok ? `${num(calc.horasFeriado, 2)} h` : "—";
  el("outCompletos").textContent = calc.ok ? `${fmtDias(calc.diasCompletos)} días` : "—";
  el("outDentroTope").textContent = calc.ok ? `${fmtDias(calc.diasDentroTope)} días` : "—";
  el("outFueraTope").textContent = calc.ok ? `${fmtDias(calc.diasFueraTope)} días` : "—";
  el("outRestantes").textContent = calc.ok ? `${num(calc.horasRestantes, 2)} h` : "—";
  el("outEquivalencia").textContent = calc.sueldoMensual > 0 && calc.ok
    ? clp(Math.round(calc.equivalenciaPago))
    : "—";

  const alerta = el("outAlerta");
  if (alerta) {
    if (!calc.ok) {
      alerta.hidden = false;
      alerta.textContent = textoFallo(calc);
    } else if (calc.diasFueraTope > 0) {
      alerta.hidden = false;
      alerta.textContent = `${fmtDias(calc.diasFueraTope)} día(s) superan el tope anual de ${fmtDias(calc.topeDias)}: correspondería pagarlos en dinero (misma lógica de /horas-extras), no convertirlos en feriado.`;
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
      `${num(calc.horasExtra, 2)} HE × ${num(calc.recargo, 1)} = ${num(calc.horasFeriado, 2)} h de feriado.`,
    );
    partes.push(
      `Con jornada diaria de ${num(calc.horasJornadaDiaria, 2)} h equivalen a ${num(calc.diasEquivalentes, 2)} días hábiles (${fmtDias(calc.diasCompletos)} día(s) completo(s)`,
    );
    if (calc.horasRestantes > 0) {
      partes.push(`y ${num(calc.horasRestantes, 2)} h que no alcanzan un día más`);
    }
    partes[partes.length - 1] += ").";
    partes.push(
      `Dentro del tope anual de ${fmtDias(calc.topeDias)} días: ${fmtDias(calc.diasDentroTope)}.`,
    );
    if (calc.diasFueraTope > 0) {
      partes.push(
        `${fmtDias(calc.diasFueraTope)} día(s) quedan fuera del tope y se pagarían en dinero.`,
      );
    }
    if (calc.sueldoMensual > 0) {
      partes.push(
        `Si se pagaran (jornada semanal ${num(calc.jornadaSemanal, 2)} h = diaria × 5): 1 HE ≈ ${clp(Math.round(calc.valorHoraExtra))}, total ≈ ${clp(Math.round(calc.equivalenciaPago))}.`,
      );
    }
  }
  partes.push(
    `Hace falta pacto escrito. Los días se usan dentro de ${calc.plazoMeses} meses, con aviso de ${calc.avisoHoras} h; si no se solicitan a tiempo, se pagan.`,
  );
  partes.push(
    "Estimación educativa: no es asesoría legal ni un cálculo de la Dirección del Trabajo ni de Previred. No sustituye el pacto ni la liquidación. No es el pago de /horas-extras ni el feriado anual.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  render(calcularCompensacionHorasExtras(leer()));
}

wireNav();
const form = document.getElementById("formCompensacionHe");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);

document.querySelectorAll("[data-jornada-diaria]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = el("horasJornadaDiaria");
    if (!input) return;
    const raw = btn.getAttribute("data-jornada-diaria");
    input.value = raw === "8.4"
      ? String(COMPENSACION_HE_JORNADA_DIARIA_42_5)
      : raw;
    recalc();
  });
});

recalc();
mountIndicadores();
