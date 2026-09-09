import { JORNADA_DEFAULT } from "./constants.js";
import { clp, num } from "./format.js";
import { calcularHoraLactancia } from "./sueldo.js";
import { el, mountIndicadores, numVal, val, wireNav } from "./ui.js";

function edadCampo() {
  const raw = val("edadMeses");
  if (raw == null || String(raw).trim() === "") return null;
  return numVal("edadMeses");
}

function leer() {
  return {
    remuneracion: numVal("remuneracion"),
    jornada: numVal("jornada") || JORNADA_DEFAULT,
    diasLaborales: numVal("diasLaborales"),
    minutosDiarios: numVal("minutosDiarios"),
    edadMeses: edadCampo(),
  };
}

function plataHora(v) {
  return v > 0 ? `$ ${num(v)}` : "$ 0";
}

function nota(calc) {
  const partes = [];
  partes.push(
    `Valor hora ordinaria DT = remuneración / 30 × 28 / (jornada × 4) = ${plataHora(calc.valorHora)}. No lleva recargo de hora extra.`,
  );
  partes.push(
    `Valor diario = valor hora × ${calc.minutosDiarios} / 60 = ${clp(calc.valorDiario)}. Mensual = diario × ${calc.diasLaborales} días = ${clp(calc.valorMensual)}.`,
  );
  partes.push(
    "Ese tiempo va con goce de sueldo: se considera trabajado (art. 206). No se descuenta de la liquidación.",
  );
  if (calc.esFraccion) {
    partes.push(
      `Ingresó ${calc.minutosDiarios} min (una fracción). El piso legal es ${calc.minutosLegal} min al día y no puede pactarse por debajo de esa hora.`,
    );
  }
  if (calc.superaLegal) {
    partes.push(
      `Más de ${calc.minutosLegal} min estima un pacto o el viaje a sala cuna (empleador obligado por el art. 203). Esta página no inventa minutos de trayecto.`,
    );
  }
  if (calc.minutosRecortados) {
    partes.push(
      `El techo de esta herramienta es ${calc.minutosTope} min; no recorta el piso legal de ${calc.minutosLegal} min.`,
    );
  }
  if (!calc.vigente) {
    partes.push(
      `El hijo tiene ${calc.edadMeses} meses: el art. 206 aplica hasta los ${calc.edadMaxMeses} meses (2 años). El monto de abajo no cambia; es la misma fórmula, solo un aviso de vigencia.`,
    );
  } else if (calc.edadMeses != null) {
    partes.push(
      `Edad informada: ${calc.edadMeses} meses (vigente hasta los ${calc.edadMaxMeses}).`,
    );
  }
  partes.push(
    "Haberes es una herramienta digital de estimación para pymes y RRHH. No entrega asesoría jurídica personalizada.",
  );
  return partes.join(" ");
}

function render(calc) {
  el("outMensual").textContent = clp(calc.valorMensual);
  el("outDiario").textContent = clp(calc.valorDiario);
  el("outHora").textContent = plataHora(calc.valorHora);
  el("outRem").textContent = clp(calc.remuneracion);
  el("outJornada").textContent = `${calc.jornada} h`;
  el("outDias").textContent = String(calc.diasLaborales);
  el("outMinutos").textContent = `${calc.minutosDiarios} min`;
  el("outEdad").textContent =
    calc.edadMeses == null ? "No informada" : `${calc.edadMeses} meses`;
  el("outVigente").textContent = calc.vigente ? "Sí (art. 206)" : "Fuera de vigencia";
  el("outNota").textContent = nota(calc);

  const alerta = el("outAlerta");
  if (!alerta) return;
  alerta.hidden = calc.vigente;
  alerta.textContent = calc.vigente
    ? ""
    : `El derecho del artículo 206 aplica hasta los 2 años (${calc.edadMaxMeses} meses). Con ${calc.edadMeses} meses ya no rige. El monto estimado no cambia: esta página no inventa otra cifra.`;
}

function recalc() {
  render(calcularHoraLactancia(leer()));
}

wireNav();
const form = document.getElementById("formHoraLactancia");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
