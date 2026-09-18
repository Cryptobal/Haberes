import { BANDAS_HORARIAS_GOLD } from "./constants.js";
import {
  SENTIDO_BANDAS_HORARIAS,
  calcularBandasHorarias,
} from "./bandas-horarias.js";
import { num } from "./format.js";
import { el, mountIndicadores, wireNav } from "./ui.js";

function sentidoVal() {
  const checked = document.querySelector('input[name="sentido"]:checked');
  return checked?.value === SENTIDO_BANDAS_HORARIAS.retrasar
    ? SENTIDO_BANDAS_HORARIAS.retrasar
    : SENTIDO_BANDAS_HORARIAS.anticipar;
}

function minutosVal() {
  const raw = el("minutos")?.value;
  if (raw == null || raw === "") return BANDAS_HORARIAS_GOLD.anticipar60.minutos;
  const n = Number(raw);
  return Number.isFinite(n) ? n : BANDAS_HORARIAS_GOLD.anticipar60.minutos;
}

function leer() {
  return {
    horaInicio: el("horaInicio")?.value || "",
    horaFin: el("horaFin")?.value || "",
    sentido: sentidoVal(),
    minutos: minutosVal(),
  };
}

function etiquetarDuracion(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (m === 0) return `${num(h, 0)} h`;
  return `${num(h, 0)} h ${num(m, 0)} min`;
}

function syncMinutosLabel() {
  const label = el("minutosLabel");
  if (label) label.textContent = String(minutosVal());
}

function textoFallo(calc) {
  if (calc.motivo === "tope") {
    return `Más de ${num(calc.maxMinutos, 0)} minutos supera el tope de 1 hora: Haberes no aplica un horario fuera de esa banda.`;
  }
  if (calc.motivo === "duracion") {
    return "El inicio y el término contractuales no pueden ser la misma hora: sin duración no hay banda que desplazar.";
  }
  return "Indique hora de inicio y de término contractuales (HH:MM).";
}

function render(calc) {
  const metric = el("outHorario");
  if (metric) {
    metric.textContent = calc.ok ? `${calc.horaInicioNueva}–${calc.horaFinNueva}` : "—";
  }
  el("outEntrada").textContent = calc.ok ? calc.horaInicioNueva : "—";
  el("outSalida").textContent = calc.ok ? calc.horaFinNueva : "—";
  el("outContrato").textContent = calc.horaInicio && calc.horaFin ? `${calc.horaInicio}–${calc.horaFin}` : "—";
  el("outDuracion").textContent = calc.ok ? etiquetarDuracion(calc.duracionMinutos) : "—";
  el("outDesplazamiento").textContent = `${num(calc.minutos, 0)} min (${calc.sentido})`;
  el("outVentana").textContent = calc.ok
    ? `${calc.ventanaInicioMin}–${calc.ventanaInicioMax} / ${calc.ventanaFinMin}–${calc.ventanaFinMax}`
    : "—";

  const alerta = el("outAlerta");
  const elegible = Boolean(el("elegible")?.checked);
  if (alerta) {
    if (!calc.ok) {
      alerta.hidden = false;
      alerta.textContent = textoFallo(calc);
    } else if (!elegible) {
      alerta.hidden = false;
      alerta.textContent =
        "La banda horaria es un derecho educativo para madres, padres o quienes tengan el cuidado personal de un niño o niña de hasta 12 años. Haberes no valida certificados de nacimiento ni sentencias de cuidado.";
    } else {
      alerta.hidden = true;
      alerta.textContent = "";
    }
  }

  const partes = [];
  if (!calc.ok) {
    partes.push(
      calc.motivo === "tope"
        ? `Indique entre 0 y ${num(calc.maxMinutos, 0)} minutos. ${num(calc.minutos, 0)} min no se aplica.`
        : calc.motivo === "duracion"
          ? "Corrija el intervalo contractual para que tenga duración."
          : "Complete el horario de inicio y de término del contrato.",
    );
  } else if (calc.minutos === 0) {
    partes.push(
      `Desplazamiento 0: el horario estimado coincide con el contractual ${calc.horaInicio}–${calc.horaFin}.`,
    );
  } else {
    const verbo = calc.sentido === SENTIDO_BANDAS_HORARIAS.retrasar ? "Retrasar" : "Anticipar";
    partes.push(
      `${verbo} ${num(calc.minutos, 0)} min el inicio ${calc.horaInicio} deja entrada ${calc.horaInicioNueva} y salida ${calc.horaFinNueva} (misma duración: ${etiquetarDuracion(calc.duracionMinutos)}).`,
    );
  }
  if (calc.ok) {
    partes.push(
      `Ventana de banda (extremos de ±${num(calc.maxMinutos, 0)} min): entrada ${calc.ventanaInicioMin}–${calc.ventanaInicioMax} y salida ${calc.ventanaFinMin}–${calc.ventanaFinMax}. La DT describe unas 2 horas de margen entre esos extremos.`,
    );
  }
  partes.push(
    "El empleador no puede negarse salvo que la naturaleza del servicio o el horario de funcionamiento de la empresa lo impidan: esta página no resuelve esa excepción.",
  );
  partes.push(
    "Estimación educativa: no es asesoría legal ni un cálculo de la Dirección del Trabajo ni de Previred. No es el tope de 40/42 horas, ni el art. 22 bis, ni el pacto 4×3, ni teletrabajo.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  syncMinutosLabel();
  render(calcularBandasHorarias(leer()));
}

wireNav();
const form = document.getElementById("formBandasHorarias");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
