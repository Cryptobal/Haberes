import { calcularAntiguedadLaboral, textoAntiguedad } from "./antiguedad-laboral.js";
import { hoyChileIso } from "./contrato-plazo-fijo.js";
import { parseIsoFecha } from "./feriados.js";
import { fechaLarga } from "./format.js";
import { el, mountIndicadores, val, wireNav } from "./ui.js";

function leer() {
  return {
    fechaInicio: val("fechaInicio") || "",
    fechaTermino: val("fechaTermino") || "",
  };
}

function fechaLegible(iso) {
  const p = parseIsoFecha(iso);
  if (!p) return "—";
  return fechaLarga(new Date(p.y, p.mo - 1, p.d));
}

function textoFallo(calc) {
  if (calc.motivo === "orden") {
    return "La fecha de término debe ser igual o posterior a la fecha de inicio. Corrija las fechas: no se cuentan antigüedades negativas.";
  }
  if (calc.motivo === "inicio") {
    return "Indique una fecha de inicio válida (día, mes y año).";
  }
  if (calc.motivo === "termino") {
    return "Indique una fecha de término válida o déjela en hoy.";
  }
  return "Complete las fechas para estimar la antigüedad.";
}

function render(calc) {
  const metric = el("outAntiguedad");
  if (metric) metric.textContent = calc.ok ? textoAntiguedad(calc) : "—";
  el("outAnosIAS").textContent = calc.ok ? String(calc.anosIAS) : "—";
  el("outAnosConFraccion").textContent = calc.ok ? String(calc.anosConFraccion) : "—";
  el("outMesesFeriado").textContent = calc.ok ? String(calc.mesesFeriado) : "—";
  el("outAnos").textContent = calc.ok ? String(calc.anosCompletos) : "—";
  el("outMeses").textContent = calc.ok ? String(calc.mesesRemanentes) : "—";
  el("outDias").textContent = calc.ok ? String(calc.diasRemanentes) : "—";
  el("outDiasCalendario").textContent = calc.ok ? String(calc.diasCalendario) : "—";
  el("outAniversario").textContent = calc.ok ? fechaLegible(calc.ultimoAniversario) : "—";

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
      `Desde el ${fechaLegible(calc.fechaInicio)} hasta el ${fechaLegible(calc.fechaTermino)}${
        calc.terminoEsHoy ? " (hoy, hora de Chile)" : ""
      }: ${textoAntiguedad(calc)}.`,
    );
    partes.push(
      `Años cumplidos para IAS (art. 163): ${calc.anosIAS}. Los ${calc.mesesRemanentes} meses y ${calc.diasRemanentes} días restantes son contexto y no suben este conteo.`,
    );
    partes.push(
      calc.fraccionSuperiorSeisMeses
        ? `La fracción supera los seis meses: la regla del inciso 2° del art. 163 (que aplica /indemnizacion-anos-servicio) contaría ${calc.anosConFraccion} años pagables; verifique allá el monto y el tope de 11 años.`
        : "La fracción no supera los seis meses (seis meses exactos no suman): los años pagables del art. 163 coinciden con los cumplidos.",
    );
    partes.push(
      `Meses para feriado proporcional (orientativo): ${calc.mesesFeriado} = ${calc.anosCompletos} × 12 + ${calc.mesesRemanentes}. Los días sueltos no suman un mes.`,
    );
  }
  partes.push(
    "Solo cuenta tiempo: los montos de IAS, aviso previo, feriado y finiquito viven en sus calculadoras. Casos con suspensiones, jornadas especiales o cómputo casuístico de la DT pueden diferir.",
  );
  partes.push(
    "Estimación educativa: no es asesoría legal ni un cálculo de la Dirección del Trabajo ni de Previred.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  render(calcularAntiguedadLaboral(leer()));
}

function usarHoy() {
  const termino = el("fechaTermino");
  if (termino) termino.value = hoyChileIso();
  recalc();
}

wireNav();
const form = document.getElementById("formAntiguedadLaboral");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
el("btnHoy")?.addEventListener("click", usarHoy);
recalc();
mountIndicadores();
