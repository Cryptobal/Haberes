import { clp, num } from "./format.js";
import { calcularTeletrabajo } from "./teletrabajo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

/** type=number usa punto decimal; no recortar puntos como miles. */
function decimalVal(id) {
  const raw = el(id)?.value;
  if (raw == null || raw === "") return "";
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : "";
}

function leer() {
  return {
    horaInicioJornada: el("horaInicio")?.value || "",
    horaFinJornada: el("horaFin")?.value || "",
    horasJornadaDiaria: decimalVal("horasJornada"),
    remuneracionMensual: numVal("remuneracion"),
    diasTeletrabajoMes: (() => {
      const d = decimalVal("diasTeletrabajo");
      return d === "" ? 0 : d;
    })(),
    modalidad: el("modalidad")?.value || "teletrabajo",
  };
}

function render(calc) {
  el("outJornada").textContent = `${num(calc.horasJornadaDiaria, 2)} h`;
  el("outDesconexion").textContent = `${num(calc.horasDesconexion, 2)} h`;
  el("outCumple").textContent = calc.cumpleDesconexion ? "Sí" : "No";
  el("outValorDia").textContent = calc.remuneracionMensual > 0 ? clp(calc.valorDia) : "—";
  el("outEstimacion").textContent =
    calc.remuneracionMensual > 0 && calc.diasTeletrabajoMes > 0 ? clp(calc.estimacionDiasModalidad) : "—";
  el("outModalidad").textContent = calc.modalidadLabel;
  el("outDias").textContent = String(calc.diasTeletrabajoMes);

  const alerta = el("outAlerta");
  if (alerta) {
    if (calc.fuenteJornada === "ninguna") {
      alerta.hidden = false;
      alerta.textContent =
        "Indique el inicio y el fin de la jornada de conectividad o las horas diarias (0–24). Sin eso no hay ventana que comparar con las 12 horas del art. 152 quáter J.";
    } else if (!calc.cumpleDesconexion) {
      alerta.hidden = false;
      alerta.textContent =
        `Con ${num(calc.horasJornadaDiaria, 2)} h de conectividad quedan ${num(calc.horasDesconexion, 2)} h de desconexión, por debajo del mínimo de 12 horas continuas (art. 152 quáter J, tolerancia ${num(calc.toleranciaH, 2)} h). Es una estimación educativa: el derecho legal se reconoce a quienes distribuyen libremente su horario o están excluidos de la limitación de jornada.`;
    } else {
      alerta.hidden = true;
      alerta.textContent = "";
    }
  }

  const partes = [];
  if (calc.fuenteJornada === "ninguna") {
    partes.push("Indique un intervalo HH:MM o las horas de jornada diaria.");
  } else {
    if (calc.fuenteJornada === "horas") {
      partes.push(
        `Jornada diaria = ${num(calc.horasJornadaDiaria, 2)} h (campo de horas). Desconexión = ${calc.periodoH} − ${num(calc.horasJornadaDiaria, 2)} = ${num(calc.horasDesconexion, 2)} h.`,
      );
    } else {
      partes.push(
        `Jornada ${calc.horaInicioJornada}–${calc.horaFinJornada} = ${num(calc.horasJornadaDiaria, 2)} h (si el fin es anterior al inicio, se asume cruce de medianoche). Desconexión = ${calc.periodoH} − ${num(calc.horasJornadaDiaria, 2)} = ${num(calc.horasDesconexion, 2)} h.`,
      );
    }
    partes.push(
      `¿Cumple el mínimo de ${calc.desconexionMinH} h continuas? ${calc.cumpleDesconexion ? "Sí" : "No"} (tolerancia ${num(calc.toleranciaH, 2)} h).`,
    );
    partes.push(
      `La modalidad «${calc.modalidadLabel}» es informativa (art. 152 quáter G) y no cambia las 12 horas.`,
    );
    if (calc.remuneracionMensual > 0) {
      partes.push(
        `Referencia de días bajo modalidad: ${clp(calc.remuneracionMensual)} / 30 = ${clp(calc.valorDia)} por día × ${num(calc.diasTeletrabajoMes, 2)} = ${clp(calc.estimacionDiasModalidad)}. No es líquido, cotización ni un recargo legal por teletrabajar.`,
      );
    } else {
      partes.push("Si indica remuneración y días de teletrabajo en el mes, se muestra rem/30 solo como referencia de días bajo modalidad.");
    }
  }
  partes.push("Estimación educativa: no es asesoría legal ni un cálculo de la Dirección del Trabajo ni de Previred.");
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  render(calcularTeletrabajo(leer()));
}

wireNav();
const form = document.getElementById("formTeletrabajo");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
