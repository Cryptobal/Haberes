import {
  PRESCRIPCION_ANCLA_LABEL,
  PRESCRIPCION_ETIQUETAS,
  PRESCRIPCION_GOLD,
  calcularPrescripcionLaboral,
} from "./prescripcion-laboral.js";
import { createDateFields, el, mountIndicadores, wireNav } from "./ui.js";

const HINT_MODO = {
  generales:
    "Derechos exigibles mientras el contrato está vigente, o créditos patrimoniales: 2 años desde que se hicieron exigibles (art. 510 inc. 1°).",
  post_termino:
    "Acciones que nacen al terminar el contrato: 6 meses desde la terminación de los servicios (art. 510 inc. 2°).",
  horas_extras:
    "Cobro de horas extraordinarias: 6 meses desde la fecha en que debieron pagarse. El monto está en /horas-extras.",
  nulidad_162:
    "Nulidad del despido por cotizaciones impagas (art. 162): 6 meses desde la suspensión de los servicios. El monto está en /nulidad-despido.",
  art_168:
    "Plazo para demandar el despido injustificado, indebido o improcedente: 60 días hábiles desde la separación. No es el art. 510. Haberes solo cuenta feriados nacionales 2025–2027. El recargo está en /despido-injustificado.",
};

let anclaPick = null;
let reclamoPick = null;

function fechaEs(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "—";
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dt);
}

function modoActual() {
  return document.getElementById("modo")?.value || "generales";
}

function estadoTexto(estado) {
  if (estado === "vencido") return "Vencido";
  if (estado === "por_vencer") return "Por vencer";
  if (estado === "vigente") return "Vigente";
  if (estado === "indeterminado") return "Indeterminado";
  return "—";
}

function tieneReclamo() {
  return Boolean(document.getElementById("tieneReclamo")?.checked);
}

function leer() {
  return {
    modo: modoActual(),
    fechaAncla: anclaPick?.getValue() || "",
    fechaReclamoDt: tieneReclamo() ? reclamoPick?.getValue() || "" : "",
  };
}

function nota(calc) {
  if (!calc.ok) {
    if (calc.motivo === "sin_fecha") return "Indique la fecha ancla del plazo.";
    if (calc.motivo === "fuera_calendario_habiles") {
      return `El art. 168 usa feriados nacionales de ${calc.calendarioMin} a ${calc.calendarioMax}. Esa separación cae fuera de ese calendario: Haberes no estima el plazo para no tratar feriados como días hábiles.`;
    }
    return "No se pudo estimar la fecha límite con esos datos.";
  }
  const partes = [];
  partes.push(
    `${calc.etiquetaModo}: ${calc.norma}. Fecha ancla ${fechaEs(calc.fechaAncla)} → límite ${fechaEs(calc.fechaLimite)}.`,
  );
  if (calc.tipoPlazo === "habiles") {
    partes.push(
      `${calc.plazoValor} días hábiles lun–vie, excluidos feriados legales nacionales ${calc.calendarioMin}–${calc.calendarioMax} (js/feriados.js), contados desde el día siguiente (art. 48 Código Civil).`,
    );
  } else if (calc.tipoPlazo === "anios") {
    partes.push(`Suma ${calc.plazoValor} años de fecha a fecha.`);
  } else {
    partes.push(`Suma ${calc.plazoValor} meses de fecha a fecha.`);
  }
  if (calc.estado === "indeterminado") {
    partes.push(
      "Estado indeterminado: hay reclamo DT y falta la notificación del resultado. Haberes no declara el plazo vencido ni suma días de suspensión.",
    );
  } else if (calc.estado === "vencido") {
    partes.push(`Estado vencido (${Math.abs(calc.diasRestantes)} días después del límite).`);
  } else if (calc.estado === "por_vencer") {
    partes.push(`Estado por vencer: quedan ${calc.diasRestantes} días calendario (el último día todavía cuenta).`);
  } else {
    partes.push(`Estado vigente: quedan ${calc.diasRestantes} días calendario.`);
  }
  if (calc.suspensionReclamo) {
    partes.push(
      `Hay reclamo DT notificado el ${fechaEs(calc.fechaReclamoDt)}: el art. 510 suspende el plazo hasta la notificación del resultado. El límite ISO es el original, sin esa suspensión.`,
    );
    if (calc.topeUnAnio) {
      partes.push(`Tope absoluto del 510: 1 año desde el término (${fechaEs(calc.topeUnAnio)}).`);
    }
    if (calc.tope90Habiles) {
      partes.push(`En el art. 168 el tope con reclamo es 90 días hábiles (${fechaEs(calc.tope90Habiles)}), no 1 año.`);
    }
  }
  partes.push(
    "La prescripción debe alegarse en juicio. Estimación educativa: no es demanda, no sustituye abogado ni DT.",
  );
  return partes.join(" ");
}

function syncModoUi() {
  const modo = modoActual();
  const lbl = el("lblAncla");
  if (lbl) lbl.textContent = PRESCRIPCION_ANCLA_LABEL[modo] || PRESCRIPCION_ANCLA_LABEL.generales;
  const hint = el("hintModo");
  if (hint) hint.textContent = HINT_MODO[modo] || HINT_MODO.generales;
}

function render(calc) {
  el("outLimite").textContent = calc.ok ? fechaEs(calc.fechaLimite) : "—";
  el("outEstado").textContent =
    calc.motivo === "fuera_calendario_habiles"
      ? "Sin estimar"
      : calc.ok
        ? estadoTexto(calc.estado)
        : "—";
  el("outDias").textContent = calc.ok && calc.estado !== "indeterminado" ? String(calc.diasRestantes) : "—";
  el("outModo").textContent = PRESCRIPCION_ETIQUETAS[calc.modo] || "—";
  el("outNorma").textContent = calc.ok || calc.norma ? calc.norma || "—" : "—";
  el("outAncla").textContent = calc.fechaAncla ? fechaEs(calc.fechaAncla) : "—";
  el("outLimiteIso").textContent = calc.ok ? calc.fechaLimite : "—";
  el("outTopeAnio").textContent = calc.topeUnAnio ? fechaEs(calc.topeUnAnio) : "No aplica";
  el("outNota").textContent = nota(calc);
}

function syncReclamoUi() {
  const box = document.getElementById("boxReclamo");
  if (box) box.hidden = !tieneReclamo();
}

function recalc() {
  syncModoUi();
  syncReclamoUi();
  render(calcularPrescripcionLaboral(leer()));
}

wireNav();
anclaPick = createDateFields(el("pickAncla"), {
  value: PRESCRIPCION_GOLD.generales.fechaAncla,
  title: "Fecha ancla del plazo",
  onChange: recalc,
});
reclamoPick = createDateFields(el("pickReclamo"), {
  value: "",
  title: "Reclamo DT notificado (opcional)",
  placeholder: "Sin reclamo DT",
  onChange: recalc,
});
document.getElementById("formPrescripcion")?.addEventListener("input", recalc);
document.getElementById("formPrescripcion")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
