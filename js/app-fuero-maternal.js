import { calcularFueroMaternal } from "./sueldo.js";
import { createDateFields, el, mountIndicadores, numVal, wireNav } from "./ui.js";

let partoPick = null;

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

function hoyIso() {
  const n = new Date();
  const y = n.getFullYear();
  const mo = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function leer() {
  return {
    fechaParto: partoPick?.getValue() || "",
    situacion: document.getElementById("situacion")?.value || "nacido",
    modalidad: document.getElementById("modalidad")?.value || "postnatal",
    diasSuplementario: numVal("diasSuplementario"),
    referencia: hoyIso(),
  };
}

function faseTexto(calc) {
  if (calc.fase === "embarazo") {
    return calc.situacion === "probable"
      ? "Aún no nace: el fuero ya corre (embarazo)."
      : "Antes del parto: el fuero ya corre desde el embarazo.";
  }
  if (calc.fase === "postnatal") return "Dentro del postnatal legal de 12 semanas.";
  if (calc.fase === "parental") {
    return "En postnatal parental (art. 197 bis): ese tramo no corre el fuero de la madre.";
  }
  if (calc.fase === "fuero") return "Después del postnatal: el fuero de un año sigue vigente.";
  if (calc.fase === "sin_fuero") return "El año posterior al postnatal ya expiró (estimación).";
  return "";
}

function nota(calc) {
  if (!calc.ok) return "Indique la fecha de parto o la fecha probable de parto.";
  const partes = [];
  const partoLbl = calc.situacion === "probable" ? "fecha probable de parto" : "parto";
  partes.push(
    `Desde el ${partoLbl} (${fechaEs(calc.fechaParto)}) el postnatal legal son ${calc.semanasPostnatal} semanas (${calc.diasPostnatal - calc.diasSuplementario} días)${calc.diasSuplementario ? ` más ${calc.diasSuplementario} de suplementario art. 196` : ""}.`,
  );
  partes.push(`Término del descanso que sirve de base al fuero: ${fechaEs(calc.fechaTerminoPostnatal)}.`);
  if (calc.fechaTerminoParental) {
    partes.push(
      `${calc.etiquetaModalidad}: el parental terminaría el ${fechaEs(calc.fechaTerminoParental)}. El art. 201 lo excluye: no mueve el fuero de la madre.`,
    );
  } else {
    partes.push("Sin postnatal parental: el año del fuero corre desde el postnatal de 12 semanas.");
  }
  partes.push(
    `Término estimado del fuero: ${fechaEs(calc.fechaTerminoFuero)} (un año después de expirado el postnatal, DT: un año y 84 días de edad del hijo, más suplementario si lo hay).`,
  );
  const fase = faseTexto(calc);
  if (fase) partes.push(fase);
  partes.push(
    "El fuero no es un permiso pagado ni un SIL. No estima indemnización por despido nulo. Es estimación educativa, no un pronunciamiento de la DT.",
  );
  return partes.join(" ");
}

function render(calc) {
  el("outFuero").textContent = calc.ok ? fechaEs(calc.fechaTerminoFuero) : "—";
  el("outPostnatal").textContent = calc.ok ? fechaEs(calc.fechaTerminoPostnatal) : "—";
  el("outParental").textContent = calc.ok && calc.fechaTerminoParental ? fechaEs(calc.fechaTerminoParental) : "No aplica";
  el("outPrenatal").textContent = calc.ok ? fechaEs(calc.fechaInicioPrenatal) : "—";
  el("outParto").textContent = calc.fechaParto ? fechaEs(calc.fechaParto) : "—";
  el("outModalidad").textContent = calc.etiquetaModalidad || "—";
  el("outDias").textContent = calc.ok
    ? `${calc.diasPostnatal} días (${calc.semanasPostnatal} sem${calc.diasSuplementario ? ` + ${calc.diasSuplementario} extra` : ""})`
    : "—";
  el("outParentalDias").textContent = calc.diasParental
    ? `${calc.semanasParental} sem / ${calc.diasParental} días (no corre el fuero)`
    : "No usa parental";
  el("outNota").textContent = nota(calc);
}

function recalc() {
  const sit = document.getElementById("situacion")?.value || "nacido";
  const lbl = document.getElementById("lblParto");
  if (lbl) {
    lbl.textContent =
      sit === "probable" ? "Fecha probable de parto" : "Fecha de parto";
  }
  render(calcularFueroMaternal(leer()));
}

wireNav();
partoPick = createDateFields(el("pickParto"), {
  value: "2026-01-05",
  title: "Fecha de parto o fecha probable",
  onChange: recalc,
});
document.getElementById("formFueroMaternal")?.addEventListener("input", recalc);
document.getElementById("formFueroMaternal")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
