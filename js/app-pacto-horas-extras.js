import { JORNADA_DEFAULT, PACTO_HE_TOPE_DIARIO } from "./constants.js";
import { clp, num } from "./format.js";
import { calcularPactoHorasExtras } from "./pacto-horas-extras.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function leer() {
  const diaRaw = el("horasDiaMasLargo")?.value;
  return {
    remuneracion: numVal("remuneracion"),
    jornadaSemanal: numVal("jornada") || JORNADA_DEFAULT,
    horasExtras: numVal("horasExtras"),
    hayPacto: el("hayPacto")?.checked === true,
    horasDiaMasLargo: diaRaw == null || String(diaRaw).trim() === "" ? null : numVal("horasDiaMasLargo"),
  };
}

function textoPacto(calc) {
  if (!calc.faltaPactoEscrito) return "";
  return "Falta el pacto escrito de horas extraordinarias (art. 31). El monto orientativo no cambia: si se trabajó de más con conocimiento del empleador, igual corresponden extras. El Código exige el escrito, por necesidades temporales y hasta 3 meses, renovable.";
}

function textoTope(calc) {
  if (!calc.excedeTopeDiario) return "";
  const dia = num(calc.horasDiaMasLargo, Number.isInteger(calc.horasDiaMasLargo) ? 0 : 1);
  return `El día más largo tiene ${dia} h extras y supera el tope orientativo de ${calc.topeDiario} h por día del art. 31. Hay excepciones legales (p. ej. fuerza mayor, art. 29). Esta página no las autoriza.`;
}

function render(calc) {
  el("outTotal").textContent = clp(Math.round(calc.total));
  el("outHoraOrd").textContent = clp(Math.round(calc.valorHoraOrdinaria));
  el("outHoraExtra").textContent = clp(Math.round(calc.valorHoraExtra));
  el("outHoras").textContent = String(calc.horasExtras);
  el("outJornada").textContent = `${calc.jornadaSemanal} h`;
  el("outPacto").textContent = calc.hayPacto ? "Sí" : "No";

  const alertaPacto = el("outAlertaPacto");
  if (alertaPacto) {
    const texto = textoPacto(calc);
    alertaPacto.hidden = !texto;
    alertaPacto.textContent = texto;
  }
  const alertaTope = el("outAlertaTope");
  if (alertaTope) {
    const texto = textoTope(calc);
    alertaTope.hidden = !texto;
    alertaTope.textContent = texto;
  }

  const nota = el("outNota");
  if (nota) {
    if (!calc.ok) {
      nota.textContent = "Indique una remuneración mensual y una jornada semanal mayores que 0. Haberes no inventa el valor hora.";
    } else {
      nota.textContent = `Hora ordinaria ≈ ${num(calc.valorHoraOrdinaria)} · hora extra (×1,5) ≈ ${num(calc.valorHoraExtra)}. Tope diario orientativo: ${PACTO_HE_TOPE_DIARIO} h.`;
    }
  }
}

function recalc() {
  render(calcularPactoHorasExtras(leer()));
}

wireNav();
document.getElementById("formPactoHorasExtras")?.addEventListener("input", recalc);
document.getElementById("formPactoHorasExtras")?.addEventListener("change", recalc);
recalc();
mountIndicadores();
