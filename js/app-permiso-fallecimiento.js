import { clp } from "./format.js";
import { calcularPermisoFallecimiento } from "./sueldo.js";
import { createDateFields, el, mountIndicadores, numVal, wireNav } from "./ui.js";

let fechaPick = null;

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

function vinculoValor() {
  const sel = document.getElementById("vinculo");
  return sel?.value || "hijo";
}

function leer() {
  return {
    vinculo: vinculoValor(),
    fechaFallecimiento: fechaPick?.getValue() || "",
    remuneracion: numVal("remuneracion"),
  };
}

function itemFecha(row) {
  return `${fechaEs(row.fecha)} (${row.nombre})`;
}

function tipoTexto(tipo) {
  return tipo === "corridos" ? "días corridos" : "días hábiles";
}

function motivoTexto(calc) {
  if (calc.motivo === "sin_vinculo") return "Elija el vínculo con la persona fallecida.";
  if (calc.motivo === "sin_cupo") {
    return "No se pudieron contar los días hábiles del permiso desde esa fecha.";
  }
  return "Indique el vínculo para estimar días y monto.";
}

function nota(calc) {
  if (!calc.ok) return motivoTexto(calc);
  const partes = [];
  partes.push(
    `Permiso pagado por muerte de ${calc.etiqueta}: ${calc.diasPermiso} ${tipoTexto(calc.tipoDias)} (art. 66).`,
  );
  if (calc.fechaTermino) {
    partes.push(
      `Se hace efectivo desde el ${fechaEs(calc.fechaInicio)}; término ${fechaEs(calc.fechaTermino)}; reintegro el siguiente hábil lun–vie (${fechaEs(calc.fechaReintegro)}).`,
    );
    if (calc.tipoDias === "corridos") {
      partes.push("Los días corridos incluyen sábados, domingos y feriados legales (ORD. N°853/16).");
    } else {
      partes.push(
        `${calc.diasHabilesConsumidos} hábiles lun–vie consumen el cupo; sábados, domingos y feriados legales no. ${calc.diasCalendario} días calendario en la ventana.`,
      );
    }
  } else {
    partes.push("Indique la fecha para proyectar término y reintegro. El monto no depende de esa fecha.");
  }
  partes.push(
    `Monto estimado = ${calc.diasPermiso} × (remuneración / 30) = ${clp(calc.goceRemuneracion)}. Es estimación educativa, no liquidación oficial.`,
  );
  if (calc.fuero) {
    partes.push(
      calc.fechaFueroHasta
        ? `Fuero laboral de un mes desde el fallecimiento (inciso 1º), hasta el ${fechaEs(calc.fechaFueroHasta)}. No entra al cálculo del monto.`
        : "Fuero laboral de un mes en los casos del inciso 1º (hijo, cónyuge o AUC). No entra al cálculo del monto.",
    );
  } else {
    partes.push("Este vínculo no abre el fuero del inciso 1º.");
  }
  return partes.join(" ");
}

function syncFechaLabel() {
  const lbl = document.getElementById("lblFecha");
  if (!lbl) return;
  lbl.textContent =
    vinculoValor() === "hijo_gestacion"
      ? "Fecha de acreditación (certificado de defunción fetal)"
      : "Fecha de fallecimiento (opcional)";
}

function render(calc) {
  el("outGoce").textContent = clp(calc.goceRemuneracion);
  el("outDias").textContent = calc.diasPermiso ? `${calc.diasPermiso} ${tipoTexto(calc.tipoDias)}` : "—";
  el("outVinculo").textContent = calc.etiqueta || "—";
  el("outInicio").textContent = calc.fechaInicio ? fechaEs(calc.fechaInicio) : "—";
  el("outTermino").textContent = calc.ok && calc.fechaTermino ? fechaEs(calc.fechaTermino) : "—";
  el("outReintegro").textContent = calc.ok && calc.fechaReintegro ? fechaEs(calc.fechaReintegro) : "—";
  el("outDiario").textContent = calc.valorDia > 0 ? clp(calc.valorDia) : "$ 0";
  el("outRem").textContent = clp(calc.remuneracion);
  el("outFuero").textContent = calc.fuero
    ? calc.fechaFueroHasta
      ? `1 mes (hasta el ${fechaEs(calc.fechaFueroHasta)})`
      : "1 mes (inciso 1º)"
    : "No aplica";
  el("outNota").textContent = nota(calc);

  const saltos = el("outSaltos");
  const parts = [];
  for (const f of calc.feriados) parts.push(itemFecha(f));
  for (const d of calc.domingos) parts.push(itemFecha(d));
  for (const s of calc.sabados) parts.push(itemFecha(s));
  if (!calc.fechaTermino) {
    saltos.textContent = "Indique una fecha para listar sábados, domingos y feriados de la ventana.";
  } else if (parts.length === 0) {
    saltos.textContent =
      calc.tipoDias === "corridos"
        ? "Ningún sábado, domingo ni feriado legal dentro del permiso."
        : "Ningún sábado, domingo ni feriado legal dentro de la ventana.";
  } else if (calc.tipoDias === "corridos") {
    saltos.textContent = "Incluidos en los días corridos: " + parts.join("; ") + ".";
  } else {
    saltos.textContent = "No consumen el cupo hábil: " + parts.join("; ") + ".";
  }
}

function recalc() {
  syncFechaLabel();
  render(calcularPermisoFallecimiento(leer()));
}

wireNav();
fechaPick = createDateFields(el("pickFecha"), {
  value: "2026-01-05",
  title: "Fecha de fallecimiento o de acreditación",
  onChange: recalc,
});
document.getElementById("formPermisoFallecimiento")?.addEventListener("input", recalc);
document.getElementById("formPermisoFallecimiento")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
