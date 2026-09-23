import {
  JORNADA_BISEMANAL_GOLD,
  JORNADA_EXCEPCIONAL_HORIZONTE_SITIO,
} from "./constants.js";
import {
  calcularJornadaBisemanal,
  JORNADA_BISEMANAL_REGIMEN,
} from "./jornada-bisemanal.js";
import { num } from "./format.js";
import { el, mountIndicadores, wireNav } from "./ui.js";

function decimalVal(id, fallback) {
  const raw = el(id)?.value;
  if (raw == null || raw === "") return fallback;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function horizonteVal() {
  const raw = document.querySelector("#formJornadaBisemanal [name='horizonte']:checked")?.value;
  if (raw === "2026" || raw === "2028") return raw;
  return JORNADA_EXCEPCIONAL_HORIZONTE_SITIO;
}

function leer() {
  const gold = JORNADA_BISEMANAL_GOLD.diezPorCuatro2028;
  return {
    diasTrabajo: decimalVal("diasTrabajo", gold.diasTrabajo),
    diasDescanso: decimalVal("diasDescanso", gold.diasDescanso),
    horasCiclo: decimalVal("horasCiclo", gold.horasCiclo),
    horizonte: horizonteVal(),
  };
}

function fmtDias(n) {
  return num(n, Number.isInteger(n) ? 0 : 1);
}

function etiquetaRegimen(calc) {
  if (calc.regimen === JORNADA_BISEMANAL_REGIMEN.dentro_ordinario) {
    return `Art. 39 y dentro del tope ordinario (${num(calc.topeOrdinarioH, 0)} h)`;
  }
  if (calc.regimen === JORNADA_BISEMANAL_REGIMEN.supera_tope) {
    return `Art. 39 sí, pero supera el tope ordinario (${num(calc.topeOrdinarioH, 0)} h)`;
  }
  if (calc.regimen === JORNADA_BISEMANAL_REGIMEN.invalido_art39) {
    return "No cumple el art. 39";
  }
  return "—";
}

function textoFallo(calc) {
  if (calc.motivo === "datos") {
    return "Indique días de trabajo y horas del ciclo mayores que 0. Haberes no inventa un promedio sin esos datos.";
  }
  if (calc.motivo === "descanso") {
    return "Los días de descanso no pueden ser negativos.";
  }
  if (calc.motivo === "dias") {
    return "Los días de trabajo y de descanso deben ser números enteros.";
  }
  if (calc.motivo === "art39_dias") {
    return `${fmtDias(calc.diasTrabajo)} días continuos de trabajo superan el máximo de ${calc.maxDiasTrabajo} del art. 39. El promedio se muestra solo con fines pedagógicos.`;
  }
  if (calc.motivo === "art39_descanso") {
    return `${fmtDias(calc.diasDescanso)} día(s) de descanso no alcanzan el mínimo de ${calc.minDiasDescanso} consecutivos del art. 39. El promedio se muestra solo con fines pedagógicos.`;
  }
  if (calc.motivo === "supera_tope") {
    return `Promedio ${num(calc.promedioSemanalRedondeado, 2)} h: supera el tope ordinario de ${num(calc.topeOrdinarioH, 0)} h del art. 22 (Ley 21.561). Cumple los días del art. 39, pero las horas del ciclo exceden la jornada ordinaria.`;
  }
  return "Revise los datos del ciclo.";
}

function siNo(cond) {
  return cond ? "Sí" : "No";
}

function render(calc) {
  const hayCiclo = calc.diasCiclo > 0;
  const metric = el("outPromedio");
  if (metric) {
    metric.textContent = hayCiclo ? `${num(calc.promedioSemanalRedondeado, 2)} h` : "—";
  }
  el("outRegimen").textContent = etiquetaRegimen(calc);
  el("outArt39").textContent = hayCiclo ? siNo(calc.cumpleArt39) : "—";
  el("outDiasTrabajo").textContent = hayCiclo
    ? `${siNo(calc.cumpleDiasTrabajo)} (${fmtDias(calc.diasTrabajo)} de máx. ${calc.maxDiasTrabajo})`
    : "—";
  el("outDescanso").textContent = hayCiclo
    ? `${siNo(calc.cumpleDescanso)} (${fmtDias(calc.diasDescanso)} de mín. ${calc.minDiasDescanso})`
    : "—";
  el("outTope").textContent = `${num(calc.topeOrdinarioH, 0)} h`;
  el("outOrdinario").textContent = hayCiclo
    ? (calc.dentroTopeOrdinario ? `Sí (≤ ${num(calc.topeOrdinarioH, 0)} h)` : `No (> ${num(calc.topeOrdinarioH, 0)} h)`)
    : "—";
  el("outDiasCiclo").textContent = hayCiclo ? `${fmtDias(calc.diasCiclo)} días` : "—";
  el("outHorasDia").textContent = hayCiclo ? `${num(calc.horasDiariasPromedio, 2)} h` : "—";

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
  if (hayCiclo) {
    partes.push(
      `Promedio semanal = (${num(calc.horasCiclo, 2)} h del ciclo × 7) / ${fmtDias(calc.diasCiclo)} días del ciclo = ${num(calc.promedioSemanalRedondeado, 2)} h.`,
    );
  }
  if (!calc.ok) {
    partes.push(textoFallo(calc));
  } else {
    partes.push(
      `Cumple el art. 39 (≤ ${calc.maxDiasTrabajo} días continuos y ≥ ${calc.minDiasDescanso} de descanso) y queda dentro del tope ordinario de ${num(calc.topeOrdinarioH, 0)} h del horizonte ${calc.horizonte === "sitio" ? "del sitio" : calc.horizonte}.`,
    );
  }
  partes.push(
    "La bisemanal del art. 39 se pacta entre las partes; no es el sistema excepcional del art. 38 que autoriza la Dirección del Trabajo.",
  );
  partes.push(
    "Estimación educativa: no es asesoría legal ni un cálculo de la Dirección del Trabajo ni de Previred.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  render(calcularJornadaBisemanal(leer()));
}

wireNav();
const form = document.getElementById("formJornadaBisemanal");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
