import { CONTRATO_PLAZO_FIJO_GOLD } from "./constants.js";
import {
  MOTIVO_INDEFINIDO_LABEL,
  calcularContratoPlazoFijo,
} from "./contrato-plazo-fijo.js";
import { num } from "./format.js";
import { createDateFields, el, mountIndicadores, wireNav } from "./ui.js";

let inicioPick = null;
let terminoPick = null;

function decimalVal(id) {
  const raw = el(id)?.value;
  if (raw == null || raw === "") return 0;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function boolVal(id) {
  return Boolean(el(id)?.checked);
}

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

function leer() {
  const usarTermino = boolVal("usarFechaTermino");
  return {
    fechaInicio: inicioPick?.getValue() || "",
    plazoMeses: decimalVal("plazoMeses"),
    fechaTermino: usarTermino ? terminoPick?.getValue() || "" : "",
    esTituloProfesionalOTecnico: boolVal("esTitulo"),
    esRenovacion: boolVal("esRenovacion"),
    continuaTrasVencimiento: boolVal("continua"),
  };
}

function syncTerminoUi() {
  const box = document.getElementById("boxFechaTermino");
  if (box) box.hidden = !boolVal("usarFechaTermino");
}

function render(calc) {
  el("outTermino").textContent = calc.ok ? fechaEs(calc.fechaTermino) : "—";
  el("outTope").textContent = calc.ok ? `${calc.topeLegalMeses} meses` : "—";
  el("outCumple").textContent = calc.ok ? (calc.cumpleTope ? "Sí" : "No") : "—";
  el("outIndefinido").textContent = calc.ok
    ? calc.seTransformaEnIndefinido
      ? "Sí"
      : "No"
    : "—";
  el("outMotivo").textContent = calc.ok
    ? MOTIVO_INDEFINIDO_LABEL[calc.motivoIndefinido] || calc.motivoIndefinido
    : "—";
  el("outDuracion").textContent = calc.ok
    ? `${num(calc.duracionMeses, 2)} meses (${calc.duracionDias} días)`
    : "—";
  el("outRestantes").textContent = calc.ok ? String(calc.diasRestantes) : "—";
  el("outInicio").textContent = calc.fechaInicio ? fechaEs(calc.fechaInicio) : "—";

  const alerta = el("outAlerta");
  if (alerta) {
    if (calc.ok && !calc.cumpleTope) {
      alerta.hidden = false;
      alerta.textContent = `El plazo pactado (${num(calc.duracionMeses, 2)} meses, término ${calc.fechaTermino}) supera el tope legal de ${calc.topeLegalMeses} meses (art. 159 N°4). La fecha se muestra igual como referencia, no como validación del pacto.`;
    } else if (calc.ok && calc.seTransformaEnIndefinido) {
      alerta.hidden = false;
      alerta.textContent =
        calc.motivoIndefinido === "renovacion_agotada_y_continuidad"
          ? "Esta ficha ya es la renovación permitida y hay continuidad tras el vencimiento: el vínculo se entiende de duración indefinida (art. 159 N°4)."
          : calc.motivoIndefinido === "renovacion_agotada"
            ? "El plazo de la única renovación ya venció: no cabe otra a plazo fijo. Si continúa prestando servicios, el vínculo se entiende indefinido."
            : "Si el trabajador continúa prestando servicios con conocimiento del empleador después de expirado el plazo, el contrato se transforma en indefinido.";
    } else {
      alerta.hidden = true;
      alerta.textContent = "";
    }
  }

  const partes = [];
  if (!calc.ok) {
    if (calc.motivo === "fecha_inicio") {
      partes.push("Indique la fecha de inicio del contrato.");
    } else if (calc.motivo === "plazo") {
      partes.push("Indique un plazo en meses mayor que 0 o una fecha de término explícita.");
    } else if (calc.motivo === "fecha_termino") {
      partes.push("La fecha de término no puede ser anterior al inicio.");
    } else {
      partes.push("Complete el inicio y el plazo o la fecha de término.");
    }
  } else {
    const fuente =
      calc.fuentePlazo === "fechaTermino"
        ? "fecha de término explícita (tiene precedencia sobre los meses)"
        : `${num(calc.plazoMeses, 2)} meses de calendario desde el inicio`;
    partes.push(
      `Término estimado ${calc.fechaTermino} (${fuente}). Duración del tramo: ${num(calc.duracionMeses, 2)} meses / ${calc.duracionDias} días.`,
    );
    partes.push(
      `Tope art. 159 N°4 = ${calc.topeLegalMeses} meses (${calc.esTituloProfesionalOTecnico || calc.esGerente ? "gerente o título profesional/técnico" : "regla general"}). El plazo ${calc.cumpleTope ? "cabe" : "no cabe"} en ese máximo (tolerancia ${calc.toleranciaDias} día).`,
    );
    if (calc.seTransformaEnIndefinido) {
      partes.push(
        `Paso a indefinido: sí (${MOTIVO_INDEFINIDO_LABEL[calc.motivoIndefinido] || calc.motivoIndefinido}).`,
      );
    } else if (calc.esRenovacion) {
      partes.push(
        "Esta ficha ya es la renovación permitida: al vencimiento no cabe una segunda a plazo fijo.",
      );
    } else {
      partes.push("No se transforma en indefinido con estos datos (no hay continuidad ni renovación agotada).");
    }
    partes.push(
      calc.vencido
        ? "El plazo ya venció respecto de hoy (Chile). Días restantes: 0."
        : `Días restantes hasta el término (hoy Chile): ${calc.diasRestantes}.`,
    );
  }
  partes.push(
    "Estimación educativa: no es asesoría legal ni un cálculo de la Dirección del Trabajo ni de Previred. No estima finiquito, IAS, aviso ni feriado.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  syncTerminoUi();
  render(calcularContratoPlazoFijo(leer()));
}

wireNav();
inicioPick = createDateFields(el("pickInicio"), {
  value: CONTRATO_PLAZO_FIJO_GOLD.doceMeses.fechaInicio,
  title: "Fecha de inicio del contrato",
  onChange: recalc,
});
terminoPick = createDateFields(el("pickTermino"), {
  value: CONTRATO_PLAZO_FIJO_GOLD.doceMeses.fechaTermino,
  title: "Fecha de término pactada",
  onChange: recalc,
});
const form = document.getElementById("formContratoPlazoFijo");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
