import {
  JORNADA_EXCEPCIONAL_GOLD,
  JORNADA_EXCEPCIONAL_HORIZONTE_SITIO,
} from "./constants.js";
import {
  calcularJornadaExcepcional,
  JORNADA_EXCEPCIONAL_REGIMEN,
} from "./jornada-excepcional.js";
import { num } from "./format.js";
import { el, mountIndicadores, wireNav } from "./ui.js";

function decimalVal(id, fallback) {
  const raw = el(id)?.value;
  if (raw == null || raw === "") return fallback;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function decimalOptional(id) {
  const raw = el(id)?.value;
  if (raw == null || String(raw).trim() === "") return "";
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : "";
}

function horizonteVal() {
  const raw = document.querySelector("#formJornadaExcepcional [name='horizonte']:checked")?.value;
  if (raw === "2026" || raw === "2028") return raw;
  return JORNADA_EXCEPCIONAL_HORIZONTE_SITIO;
}

function leer() {
  const gold = JORNADA_EXCEPCIONAL_GOLD.sietePorSiete2026;
  return {
    diasTrabajo: decimalVal("diasTrabajo", gold.diasTrabajo),
    diasDescanso: decimalVal("diasDescanso", gold.diasDescanso),
    horasDiarias: decimalVal("horasDiarias", gold.horasDiarias),
    diasCiclo: decimalOptional("diasCiclo"),
    horizonte: horizonteVal(),
  };
}

function fmtDias(n) {
  return num(n, Number.isInteger(n) ? 0 : 1);
}

function etiquetaRegimen(calc) {
  if (calc.regimen === JORNADA_EXCEPCIONAL_REGIMEN.dentro_ordinario) {
    return `Dentro del tope ordinario (${num(calc.topeOrdinarioH, 0)} h)`;
  }
  if (calc.regimen === JORNADA_EXCEPCIONAL_REGIMEN.inciso_8) {
    return "Régimen inciso 8° (margen hasta 42 h)";
  }
  if (calc.regimen === JORNADA_EXCEPCIONAL_REGIMEN.supera_tope) {
    return "Supera tope autorizable 42 h";
  }
  return "—";
}

function textoFallo(calc) {
  if (calc.motivo === "datos") {
    return "Indique días de trabajo y horas diarias mayores que 0. Haberes no inventa un PHSC sin esos datos.";
  }
  if (calc.motivo === "descanso") {
    return "Los días de descanso no pueden ser negativos. Use 0 si el ciclo no contempla descansos.";
  }
  if (calc.motivo === "ciclo") {
    return `El ciclo declarado no coincide con días de trabajo + días de descanso (${fmtDias(calc.diasTrabajo)} + ${fmtDias(calc.diasDescanso)} = ${fmtDias(calc.diasCiclo)}).`;
  }
  if (calc.motivo === "supera_tope") {
    return `PHSC ${num(calc.phscRedondeado, 2)} h: supera el tope autorizable de ${num(calc.topeAutorizableH, 0)} h (art. 38 inc. 8° / DS 48 art. 7). No cabe bajo ese régimen.`;
  }
  return "Revise los datos del ciclo.";
}

function render(calc) {
  const metric = el("outPhsc");
  if (metric) {
    metric.textContent = calc.phsc > 0 ? `${num(calc.phscRedondeado, 2)} h` : "—";
  }
  el("outRegimen").textContent = etiquetaRegimen(calc);
  el("outOrdinario").textContent = calc.phsc > 0
    ? (calc.dentroTopeOrdinario ? `Sí (≤ ${num(calc.topeOrdinarioH, 0)} h)` : `No (> ${num(calc.topeOrdinarioH, 0)} h)`)
    : "—";
  el("outInciso8").textContent = calc.phsc > 0
    ? (calc.calificaInciso8 ? "Sí (≤ 42 h y sobre el ordinario)" : "No")
    : "—";
  el("outDiasExtra").textContent = calc.phsc > 0 ? fmtDias(calc.diasAdicionales) : "—";
  el("outHorasCiclo").textContent = calc.horasCiclo > 0 ? `${num(calc.horasCiclo, 2)} h` : "—";
  el("outDiasCiclo").textContent = calc.diasCiclo > 0 ? `${fmtDias(calc.diasCiclo)} días` : "—";

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
      `PHSC = (${num(calc.horasCiclo, 2)} h de trabajo / ${fmtDias(calc.diasCiclo)} días del ciclo) × 7 = ${num(calc.phscRedondeado, 2)} h.`,
    );
    if (calc.dentroTopeOrdinario) {
      partes.push(
        `Queda dentro del tope ordinario de ${num(calc.topeOrdinarioH, 0)} h del horizonte ${calc.horizonte === "sitio" ? "del sitio" : calc.horizonte}. Días adicionales del inciso 8° = 0.`,
      );
    } else if (calc.calificaInciso8) {
      partes.push(
        `Califica al régimen del inciso 8°: PHSC ${num(calc.phscRedondeado, 2)} h, sobre el ordinario de ${num(calc.topeOrdinarioH, 0)} h y hasta 42 h. Días de descanso adicional orientativos: ${fmtDias(calc.diasAdicionales)} al año (compensables en dinero por acuerdo).`,
      );
    }
  }
  partes.push(
    "Requiere autorización de la Dirección del Trabajo, acuerdo de las personas trabajadoras y caso calificado. Haberes no aprueba ni simula el trámite.",
  );
  partes.push(
    "Estimación educativa: no es asesoría legal ni un cálculo de la Dirección del Trabajo ni de Previred. No es el pacto 4×3 del art. 28 ni el promedio del art. 22 bis.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  render(calcularJornadaExcepcional(leer()));
}

wireNav();
const form = document.getElementById("formJornadaExcepcional");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
