import { calcularFueroSindical } from "./fuero-sindical.js";
import { createDateFields, el, mountIndicadores, numVal, wireNav } from "./ui.js";

const ANIO_TOPE = new Date().getFullYear() + 8;

let eleccionPick = null;
let cesePick = null;

function modo() {
  const v = document.querySelector('input[name="modo"]:checked')?.value;
  if (v === "mandato" || v === "afiliados") return v;
  return "cese";
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

function tramoTexto(calc) {
  if (calc.tramo === "empresa_menos_25") return "Sindicato de empresa con menos de 25 afiliados: 1 director";
  if (calc.tramo === "a") return "25 a 249 afiliados: 3 directores";
  if (calc.tramo === "b") return "250 a 999 afiliados: 5 directores";
  if (calc.tramo === "c") return "1.000 a 2.999 afiliados: 7 directores";
  if (calc.tramo === "d" && calc.excepcionMultiRegion) {
    return "3.000 o más, sindicato de empresa en dos o más regiones: 11 directores";
  }
  if (calc.tramo === "d") return "3.000 o más afiliados: 9 directores";
  return "—";
}

function leer() {
  return {
    modo: modo(),
    fechaEleccion: eleccionPick?.getValue() || "",
    fechaCese: cesePick?.getValue() || "",
    aniosMandato: numVal("aniosMandato"),
    mesesMandato: numVal("mesesMandato"),
    afiliados: numVal("afiliados"),
    sindicatoEmpresa: Boolean(document.getElementById("sindicatoEmpresa")?.checked),
    multiRegion: Boolean(document.getElementById("multiRegion")?.checked),
  };
}

function nota(calc) {
  if (!calc.ok && calc.motivo === "orden") {
    return "La fecha de cese tiene que ser la misma o posterior a la elección.";
  }
  if (!calc.ok && calc.motivo === "sin_plazo") {
    return "Indique la duración del mandato en años y meses (mayor que cero).";
  }
  if (!calc.ok && calc.motivo === "menos_25") {
    return "Con menos de 25 afiliados, el director único con fuero del art. 235 es el del sindicato de empresa. Este estimado no inventa un número para otro tipo de sindicato.";
  }
  if (!calc.ok && calc.modo === "afiliados") {
    return "Indique el número de afiliados al momento de la elección (entero mayor que cero).";
  }
  if (!calc.ok) return "Indique la fecha de elección y la de cese en el cargo.";
  if (calc.modo === "afiliados") {
    const extra = calc.excepcionMultiRegion
      ? " El art. 235 suma dos directores solo en este tramo, y solo si es sindicato de empresa con presencia en dos o más regiones."
      : " El estatuto puede fijar un directorio más amplio; el fuero, los permisos y las licencias alcanzan solo a estas mayorías.";
    return `${tramoTexto(calc)}.${extra} No es un monto de indemnización ni el fuero maternal.`;
  }
  const partes = [];
  partes.push(
    `Elegido el ${fechaEs(calc.fechaEleccion)}; cesa el ${fechaEs(calc.fechaCese)}. El fuero del art. 243 sigue seis meses de calendario y termina el ${fechaEs(calc.fechaTerminoFuero)}.`,
  );
  if (calc.modo === "mandato" && calc.mandatoFueraDeRango) {
    partes.push("El art. 235 fija el mandato entre dos y cuatro años. Este plazo queda fuera de ese rango; el calendario se muestra igual.");
  }
  partes.push(
    "El estimado asume un cese que mantiene la cola de seis meses. Censura, sanción judicial, renuncia al sindicato, término de la empresa o caducidad de la personalidad jurídica cortan el fuero (art. 243); no se calculan aquí.",
  );
  return partes.join(" ");
}

function syncModo() {
  const m = modo();
  el("panelFechas").hidden = m === "afiliados";
  el("panelCese").hidden = m !== "cese";
  el("panelMandato").hidden = m !== "mandato";
  el("panelAfiliados").hidden = m !== "afiliados";
  el("miniFechas").hidden = m === "afiliados";
  el("miniAfiliados").hidden = m !== "afiliados";
  const multi = document.getElementById("multiRegion");
  const empresa = document.getElementById("sindicatoEmpresa");
  if (multi && empresa) multi.disabled = !empresa.checked;
}

function render(calc) {
  const m = modo();
  if (m === "afiliados") {
    el("outLabel").textContent = "Directores con fuero";
    el("outPrincipal").textContent = calc.ok ? String(calc.directoresConFuero) : "—";
  } else {
    el("outLabel").textContent = "Término estimado del fuero";
    el("outPrincipal").textContent = calc.ok ? fechaEs(calc.fechaTerminoFuero) : "—";
  }
  el("outNota").textContent = nota(calc);
  el("outEleccion").textContent = calc.fechaEleccion ? fechaEs(calc.fechaEleccion) : "—";
  el("outCese").textContent = calc.fechaCese ? fechaEs(calc.fechaCese) : "—";
  el("outMeses").textContent = calc.ok && m !== "afiliados" ? `${calc.mesesFuero} meses de calendario` : "6 meses de calendario";
  el("outMandato").textContent =
    m === "mandato" && calc.mesesMandatoTotal
      ? `${calc.mesesMandatoTotal} meses${calc.mandatoFueraDeRango ? " (fuera de 2 a 4 años)" : ""}`
      : "—";
  el("outAfiliados").textContent = calc.afiliados ? String(calc.afiliados) : "—";
  el("outTramo").textContent = calc.ok && m === "afiliados" ? tramoTexto(calc) : "—";
  el("outDirectores").textContent = calc.ok && m === "afiliados" ? String(calc.directoresConFuero) : "—";
}

function recalc() {
  syncModo();
  render(calcularFueroSindical(leer()));
}

wireNav();
eleccionPick = createDateFields(el("pickEleccion"), {
  value: "2024-03-15",
  title: "Fecha de elección",
  maxYear: ANIO_TOPE,
  onChange: recalc,
});
cesePick = createDateFields(el("pickCese"), {
  value: "2026-03-15",
  title: "Fecha de cese en el cargo",
  maxYear: ANIO_TOPE,
  onChange: recalc,
});
document.getElementById("formFueroSindical")?.addEventListener("input", recalc);
document.getElementById("formFueroSindical")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
