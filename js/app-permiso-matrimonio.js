import { clp } from "./format.js";
import { calcularPermisoMatrimonio } from "./sueldo.js";
import { createDateFields, el, mountIndicadores, numVal, wireNav } from "./ui.js";

let eventoPick = null;
let inicioPick = null;

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

function ubicacionModo() {
  const checked = document.querySelector('input[name="ubicacion"]:checked');
  const value = checked?.value;
  if (value === "antes" || value === "despues" || value === "inicio") return value;
  return "dia";
}

function leer() {
  return {
    fechaEvento: eventoPick?.getValue() || "",
    fechaInicio: inicioPick?.getValue() || "",
    ubicacion: ubicacionModo(),
    remuneracion: numVal("remuneracion"),
  };
}

function itemFecha(row) {
  return `${fechaEs(row.fecha)} (${row.nombre})`;
}

function motivoTexto(calc) {
  if (calc.motivo === "sin_evento") return "Indique la fecha del matrimonio o del acuerdo de unión civil.";
  if (calc.motivo === "sin_inicio") {
    return "Indique la fecha de inicio del permiso. El tramo continuo debe incluir el día de la celebración.";
  }
  if (calc.motivo === "evento_antes_inicio") {
    return "La fecha de inicio no puede ser posterior al día del matrimonio o AUC: el permiso debe incluir esa fecha (ORD. N°5845/132).";
  }
  if (calc.motivo === "no_incluye_evento") {
    return "Esos 5 días hábiles no alcanzan a incluir el día de la celebración. El permiso es un lapso continuo que debe contener esa fecha; no se fracciona (ORD. N°5845/132).";
  }
  if (calc.motivo === "sin_cupo") {
    return "No se pudieron contar 5 días hábiles en esa ventana.";
  }
  return "Indique la fecha del matrimonio o AUC para estimar término y reintegro.";
}

function nota(calc) {
  if (!calc.ok) return motivoTexto(calc);
  const partes = [];
  if (calc.ubicacion === "antes") {
    partes.push("El permiso termina el día de la celebración e incluye los hábiles inmediatamente anteriores (art. 207 bis).");
  } else if (calc.ubicacion === "inicio") {
    partes.push("Fecha de inicio elegida: el lapso continuo incluye el día del matrimonio o AUC.");
  } else {
    partes.push(
      "El permiso empieza el día de la celebración y sigue con los días posteriores. Un tramo solo posterior, sin ese día, no procede (ORD. N°5845/132).",
    );
  }
  partes.push(
    `Término ${fechaEs(calc.fechaTermino)}; reintegro el siguiente hábil lun–vie. ${calc.diasCalendario} días calendario en el permiso y ${calc.diasHabilesConsumidos} hábiles que consumen el cupo.`,
  );
  partes.push(
    `Costo estimado para el empleador = 5 × (remuneración / 30) = ${clp(calc.goceRemuneracion)}. Es estimación educativa, no liquidación oficial.`,
  );
  partes.push(
    `Aviso al empleador con 30 días de anticipación (hasta el ${fechaEs(calc.fechaAviso)}) y certificado del Registro Civil dentro de 30 días posteriores (hasta el ${fechaEs(calc.fechaCertificado)}).`,
  );
  return partes.join(" ");
}

function render(calc) {
  el("outReintegro").textContent = calc.ok ? fechaEs(calc.fechaReintegro) : "—";
  el("outTermino").textContent = calc.ok ? fechaEs(calc.fechaTermino) : "—";
  el("outInicio").textContent = calc.fechaInicio ? fechaEs(calc.fechaInicio) : "—";
  el("outHabiles").textContent = calc.ok ? String(calc.diasHabilesConsumidos) : "0";
  el("outCalendario").textContent = calc.ok ? String(calc.diasCalendario) : "0";
  el("outGoce").textContent = clp(calc.goceRemuneracion);
  el("outDiario").textContent = calc.valorDia > 0 ? clp(calc.valorDia) : "$ 0";
  el("outRem").textContent = clp(calc.remuneracion);
  el("outAviso").textContent = calc.fechaAviso ? fechaEs(calc.fechaAviso) : "—";
  el("outCertificado").textContent = calc.fechaCertificado ? fechaEs(calc.fechaCertificado) : "—";
  el("outNota").textContent = nota(calc);

  const saltos = el("outSaltos");
  const parts = [];
  for (const f of calc.feriados) parts.push(itemFecha(f));
  for (const d of calc.domingos) parts.push(itemFecha(d));
  for (const s of calc.sabados) parts.push(itemFecha(s));
  if (!calc.ok) {
    saltos.textContent = "Sin ventana: no hay sábados, domingos ni feriados que listar.";
  } else if (parts.length === 0) {
    saltos.textContent = "Ningún sábado, domingo ni feriado legal dentro del permiso.";
  } else {
    saltos.textContent = parts.join("; ") + ".";
  }
}

function syncUbicacionUi() {
  const wrap = document.getElementById("wrapInicio");
  const custom = ubicacionModo() === "inicio";
  if (wrap) wrap.hidden = !custom;
  if (custom && inicioPick && eventoPick) {
    const evento = eventoPick.getValue() || "";
    const actual = inicioPick.getValue() || "";
    if (!actual || (evento && actual > evento)) inicioPick.setValue(evento);
  }
}

function recalc() {
  syncUbicacionUi();
  render(calcularPermisoMatrimonio(leer()));
}

wireNav();
eventoPick = createDateFields(el("pickEvento"), {
  value: "2026-01-05",
  title: "Fecha del matrimonio o AUC",
  onChange: recalc,
});
inicioPick = createDateFields(el("pickInicio"), {
  value: "2026-01-05",
  title: "Inicio del permiso",
  onChange: recalc,
});
document.getElementById("formPermisoMatrimonio")?.addEventListener("input", recalc);
document.getElementById("formPermisoMatrimonio")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
