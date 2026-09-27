import { contarDiasHabiles, sumarDiasHabiles } from "./dias-habiles.js";
import { createDateFields, el, mountIndicadores, numVal, wireNav } from "./ui.js";

let desdePick = null;
let hastaPick = null;
let anclaPick = null;

function modo() {
  return document.querySelector('input[name="modo"]:checked')?.value === "sumar" ? "sumar" : "contar";
}

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

function syncModo() {
  const sumar = modo() === "sumar";
  el("panelContar").hidden = sumar;
  el("panelSumar").hidden = !sumar;
  el("resContar").hidden = sumar;
  el("resSumar").hidden = !sumar;
}

function renderContar(calc) {
  el("outHabiles").textContent = String(calc.diasHabiles);
  el("outCorridos").textContent = String(calc.diasCorridos);
  el("outDesde").textContent = calc.desde ? fechaEs(calc.desde) : "—";
  el("outHasta").textContent = calc.hasta ? fechaEs(calc.hasta) : "—";

  if (!calc.ok && calc.desde && calc.hasta && calc.desde > calc.hasta) {
    el("outNota").textContent = "La fecha hasta tiene que ser la misma o posterior a la fecha desde.";
  } else if (!calc.ok) {
    el("outNota").textContent = "Indique dos fechas válidas. Se cuentan el desde y el hasta cuando cada uno es hábil.";
  } else if (calc.diasHabiles === 0) {
    el("outNota").textContent =
      `${calc.diasCorridos} días corridos en el tramo y ningún hábil. Hábil es lunes a viernes que no sea feriado legal; el sábado no entra.`;
  } else {
    el("outNota").textContent =
      `${calc.diasHabiles} días hábiles y ${calc.diasCorridos} días corridos. El desde y el hasta entran si son hábiles.`;
  }

  const feriados = el("outFeriados");
  if (!calc.ok) {
    feriados.textContent = "Sin tramo válido, no hay feriados que listar.";
  } else if (calc.feriados.length === 0) {
    feriados.textContent = "Ningún feriado legal nacional en este tramo.";
  } else {
    feriados.textContent =
      calc.feriados.map((f) => `${fechaEs(f.fecha)} (${f.nombre})`).join("; ") + ".";
  }

  const listar = Boolean(document.getElementById("listarFechas")?.checked);
  const fechas = el("outFechas");
  const rotulo = el("rotuloFechas");
  if (!listar || !calc.ok) {
    fechas.hidden = true;
    if (rotulo) rotulo.hidden = true;
    fechas.textContent = "";
    return;
  }
  if (rotulo) rotulo.hidden = false;
  fechas.hidden = false;
  fechas.textContent = calc.fechas.length
    ? calc.fechas.map((iso) => fechaEs(iso)).join("; ") + "."
    : "Ninguna fecha hábil en el tramo.";
}

function renderSumar(calc) {
  el("outFecha").textContent = calc.ok ? fechaEs(calc.fecha) : "—";
  el("outAncla").textContent = calc.ancla ? fechaEs(calc.ancla) : "—";
  el("outN").textContent = String(calc.n > 0 ? calc.n : 0);
  if (!calc.ancla) {
    el("outNotaSumar").textContent = "Indique una fecha ancla válida.";
    return;
  }
  if (calc.n <= 0) {
    el("outNotaSumar").textContent = "Indique una cantidad mayor que cero. Con 0 o menos no hay fecha resultante.";
    return;
  }
  if (!calc.ok) {
    el("outNotaSumar").textContent = "No se pudo llegar a esa cantidad de días hábiles.";
    return;
  }
  el("outNotaSumar").textContent =
    `El ${fechaEs(calc.ancla)} no se consume. El conteo parte al día siguiente y el ${calc.n}.º hábil es el ${fechaEs(calc.fecha)}.`;
}

function recalc() {
  syncModo();
  if (modo() === "sumar") {
    renderSumar(sumarDiasHabiles({ ancla: anclaPick?.getValue() || "", n: numVal("diasN") }));
    return;
  }
  renderContar(
    contarDiasHabiles({
      desde: desdePick?.getValue() || "",
      hasta: hastaPick?.getValue() || "",
    }),
  );
}

wireNav();
desdePick = createDateFields(el("pickDesde"), {
  value: "2026-09-14",
  title: "Fecha desde",
  onChange: recalc,
});
hastaPick = createDateFields(el("pickHasta"), {
  value: "2026-09-25",
  title: "Fecha hasta",
  onChange: recalc,
});
anclaPick = createDateFields(el("pickAncla"), {
  value: "2026-09-27",
  title: "Fecha ancla",
  onChange: recalc,
});

const form = document.getElementById("formDiasHabiles");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
