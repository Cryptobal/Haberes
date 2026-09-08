import { clp, num } from "./format.js";
import { calcularPermisoPaternidad } from "./sueldo.js";
import { createDateFields, el, mountIndicadores, numVal, wireNav } from "./ui.js";

let partoPick = null;
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

function diaSiguiente(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  dt.setDate(dt.getDate() + 1);
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function goceModo() {
  const checked = document.querySelector('input[name="goce"]:checked');
  return checked?.value === "fraccionado" ? "fraccionado" : "continuo";
}

function leer() {
  return {
    fechaParto: partoPick?.getValue() || "",
    fechaInicio: inicioPick?.getValue() || "",
    goce: goceModo(),
    remuneracion: numVal("remuneracion"),
  };
}

function itemFecha(row) {
  return `${fechaEs(row.fecha)} (${row.nombre})`;
}

function motivoTexto(calc) {
  if (calc.motivo === "sin_parto") return "Indique la fecha de parto o nacimiento.";
  if (calc.motivo === "sin_inicio") {
    return "En la modalidad del primer mes, indique desde cuándo empieza el tramo de 5 días hábiles.";
  }
  if (calc.motivo === "inicio_antes_parto") {
    return "La fecha de inicio no puede ser anterior al parto.";
  }
  if (calc.motivo === "fuera_del_mes") {
    return `El inicio queda fuera del primer mes (ORD. N°864/10: ${fechaEs(calc.ventanaDesde)} a ${fechaEs(calc.ventanaHasta)}).`;
  }
  if (calc.motivo === "sin_cupo") {
    return "No se pudieron contar 5 días hábiles desde esa fecha.";
  }
  return "Indique la fecha de parto para estimar término y reintegro.";
}

function nota(calc) {
  if (!calc.ok) return motivoTexto(calc);
  const partes = [];
  if (calc.goce === "continuo") {
    partes.push("Goce continuo desde el parto (art. 195): 5 días de la jornada, sin el descanso semanal.");
  } else {
    partes.push(
      `Tramo dentro del primer mes (ORD. N°864/10: ${fechaEs(calc.ventanaDesde)} a ${fechaEs(calc.ventanaHasta)}). Esta página estima un bloque continuo de 5 hábiles, no cinco días aislados.`,
    );
  }
  partes.push(
    `Término el último hábil consumido; reintegro el siguiente hábil lun–vie. ${calc.diasCorridos} días corridos desde el inicio del tramo hasta el día anterior al reintegro.`,
  );
  partes.push(
    `Goce estimado = 5 × (remuneración / 30) = ${clp(calc.goceRemuneracion)}. El permiso es con remuneración, no un descuento.`,
  );
  if (!calc.dentroDelMes && calc.goce === "fraccionado") {
    partes.push("Atención: parte de los 5 días cae después del primer mes; la DT exige gozarlos dentro de esa ventana.");
  }
  return partes.join(" ");
}

function render(calc) {
  el("outReintegro").textContent = calc.ok ? fechaEs(calc.fechaReintegro) : "—";
  el("outTermino").textContent = calc.ok ? fechaEs(calc.fechaTermino) : "—";
  el("outInicio").textContent = calc.fechaInicio ? fechaEs(calc.fechaInicio) : "—";
  el("outHabiles").textContent = calc.ok ? String(calc.diasHabilesConsumidos) : "0";
  el("outGoce").textContent = clp(calc.goceRemuneracion);
  el("outDiario").textContent = calc.valorDia > 0 ? `$ ${num(calc.valorDia)}` : "$ 0";
  el("outRem").textContent = clp(calc.remuneracion);
  el("outNota").textContent = nota(calc);

  const saltos = el("outSaltos");
  const parts = [];
  for (const f of calc.feriados) parts.push(itemFecha(f));
  for (const d of calc.domingos) parts.push(itemFecha(d));
  if (!calc.ok) {
    saltos.textContent = "Sin ventana: no hay sábados, domingos ni feriados que listar.";
  } else if (parts.length === 0) {
    saltos.textContent = "Ningún domingo ni feriado legal en la ventana: no se extendió el cupo.";
  } else {
    saltos.textContent = parts.join("; ") + ".";
  }

  const alerta = el("outAlerta");
  if (alerta) {
    const warn = calc.ok && calc.goce === "fraccionado" && !calc.dentroDelMes;
    alerta.hidden = !warn;
    alerta.textContent = warn
      ? "Parte de los 5 días hábiles cae después del primer mes desde el nacimiento (ORD. N°864/10). La DT exige gozarlos dentro de esa ventana."
      : "";
  }
}

function syncGoceUi() {
  const wrap = document.getElementById("wrapInicio");
  const fraccionado = goceModo() === "fraccionado";
  if (wrap) wrap.hidden = !fraccionado;
  if (fraccionado && inicioPick) {
    const parto = partoPick?.getValue() || "";
    const actual = inicioPick.getValue() || "";
    if (!actual || actual < parto) {
      const next = diaSiguiente(parto) || parto;
      if (next) inicioPick.setValue(next);
    }
  }
}

function recalc() {
  syncGoceUi();
  render(calcularPermisoPaternidad(leer()));
}

wireNav();
partoPick = createDateFields(el("pickParto"), {
  value: "2026-01-05",
  title: "Fecha de parto o nacimiento",
  onChange: recalc,
});
inicioPick = createDateFields(el("pickInicio"), {
  value: "2026-01-06",
  title: "Inicio del tramo de 5 días",
  onChange: recalc,
});
document.getElementById("formPermisoPaternidad")?.addEventListener("input", recalc);
document.getElementById("formPermisoPaternidad")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
