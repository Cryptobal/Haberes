import { clp, num } from "./format.js";
import { calcularJornada40Horas, topeJornadaOrdinaria } from "./sueldo.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

/** type=number usa punto decimal; no recortar puntos como miles. */
function decimalVal(id) {
  const raw = el(id)?.value;
  if (raw == null || raw === "") return 0;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function fechaHoyIso() {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fechaDeHito(value) {
  if (!value || value === "hoy") return fechaHoyIso();
  return value;
}

function leer() {
  const hito = el("fechaHito")?.value || "hoy";
  const diasRaw = document.querySelector("#formJornada40 [name='dias']:checked")?.value;
  return {
    fecha: fechaDeHito(hito),
    jornadaPactada: decimalVal("jornadaPactada"),
    dias: Number(diasRaw) === 6 ? 6 : 5,
    remuneracion: numVal("remuneracion"),
  };
}

function render(calc) {
  el("outTope").textContent = `${calc.tope} h`;
  el("outRebaja").textContent =
    calc.horasARebajar > 0 ? `${String(calc.horasARebajar).replace(".", ",")} h` : "0 h";
  el("outJornadaAjustada").textContent = `${String(calc.jornadaAjustada).replace(".", ",")} h`;
  el("outJornadaPactada").textContent = `${String(calc.jornadaPactada).replace(".", ",")} h`;
  el("outDias").textContent = `${calc.dias} días`;
  el("outHoraAjustada").textContent = calc.remuneracion > 0 ? clp(calc.valorHoraAjustadaPesos) : "—";
  el("outHoraPactada").textContent = calc.remuneracion > 0 ? clp(calc.valorHoraPactadaPesos) : "—";
  el("outHora45").textContent = calc.remuneracion > 0 ? clp(calc.valorHoraHistorica45Pesos) : "—";
  el("outDistribucion").textContent = calc.textoDistribucion;

  const alerta = el("outAlerta");
  if (alerta) {
    alerta.hidden = calc.superaTope;
    alerta.textContent = calc.superaTope
      ? ""
      : "La jornada pactada no supera el tope de esta fecha: no hay rebaja legal que repartir.";
  }

  const nota = [];
  nota.push(`Tope legal el ${calc.fecha}: ${calc.tope} h semanales (Ley 21.561).`);
  if (calc.remuneracion > 0) {
    nota.push(
      `Valor hora ordinaria DT = sueldo convenido / 30 × 28 / (jornada × 4). Con ${calc.jornadaAjustada} h da ${num(calc.valorHoraAjustada)}; se muestra en pesos (${clp(calc.valorHoraAjustadaPesos)}).`,
    );
  } else {
    nota.push("Indique el sueldo convenido mensual (no la liquidación completa) para estimar el valor hora (opcional).");
  }
  nota.push(
    "El sueldo mensual no baja solo por la rebaja legal; cambia el tope y la base de las horas extras. Estimación educativa, no asesoría legal ni reemplazo de un pacto escrito.",
  );
  el("outNota").textContent = nota.join(" ");
}

function recalc() {
  render(calcularJornada40Horas(leer()));
}

function actualizarTopeHoyCopy() {
  const topeHoy = topeJornadaOrdinaria(fechaHoyIso());
  const lede = el("ledeTopeHoy");
  if (lede) lede.textContent = `${topeHoy} h`;
  const hint = el("hintFecha");
  if (hint) {
    hint.textContent = `El tope depende de esta fecha, no del mes de pago. Hoy el tope legal es ${topeHoy} h.`;
  }
}

wireNav();
actualizarTopeHoyCopy();
const form = document.getElementById("formJornada40");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
