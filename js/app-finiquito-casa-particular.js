import { clp, ufFmt } from "./format.js";
import {
  calcularFiniquitoCasaParticular,
  diasFeriadoProporcionalSugeridos,
} from "./finiquito.js";
import { el, mountIndicadores, numVal, val, wireNav } from "./ui.js";

let indicadores = { uf: 40854.01 };

function leer() {
  return {
    ingreso: val("ingreso") || "",
    termino: val("termino") || "",
    remuneracion: numVal("remuneracion"),
    causal: val("causal") || "desahucio",
    avisoPrevio: Boolean(document.getElementById("avisoPrevio")?.checked),
    diasMes: numVal("diasMes"),
    diasFeriadoPendiente: numVal("diasFeriadoPend"),
    diasFeriadoProporcional: numVal("diasFeriadoProp"),
  };
}

function render(calc) {
  el("outTotal").textContent = clp(calc.totalEmpleador);
  el("outRemMes").textContent = clp(calc.remuneracionMes);
  el("outFeriadoPend").textContent = clp(calc.feriadoPendiente);
  el("outFeriadoProp").textContent = clp(calc.feriadoProporcional);
  el("outAviso").textContent = calc.aviso ? clp(calc.aviso) : "No corresponde";
  el("outIas").textContent = "No aplica";
  el("outIte").textContent = clp(calc.iteEstimado);
  el("outUf").textContent = ufFmt(calc.uf);

  const partes = [];
  if (calc.prueba) {
    partes.push(
      "Período de prueba (menos de 15 días): el empleador paga los días trabajados. No hay aviso sustitutivo.",
    );
  } else if (calc.causal === "desahucio") {
    partes.push(
      calc.aviso
        ? "Desahucio sin aviso de 30 días: entra la sustitutiva equivalente a una remuneración (art. 161)."
        : "Desahucio con aviso de 30 días: no hay indemnización sustitutiva.",
    );
  } else {
    partes.push(`${calc.causalLabel}. No hay aviso sustitutivo del empleador.`);
  }
  partes.push("No hay IAS de 30 días por año: el art. 163 reserva a casa particular la indemnización a todo evento del fondo AFP.");
  if (calc.iteEstimado) {
    const tramo =
      calc.mesesItePrevia && calc.mesesIteActual
        ? `${calc.mesesItePrevia} meses al 4,11 % y ${calc.mesesIteActual} al 1,11 %`
        : calc.mesesItePrevia
          ? `${calc.mesesItePrevia} meses al 4,11 % (antes de oct. 2020)`
          : `${calc.mesesIteActual} meses al 1,11 %`;
    partes.push(
      `Fondo AFP estimado: ${tramo}, tope 11 años. Lo gira la AFP con el finiquito ratificado; no se suma al total del empleador.`,
    );
  }
  if (calc.recortoTopeUf) {
    partes.push(`La base de aviso y del estimado AFP se recortó a 90 UF (${ufFmt(calc.uf)}).`);
  }
  if (calc.recortoTopeAnios) {
    partes.push("El aporte al fondo AFP cesa a los 11 años de la relación (art. 163).");
  }
  el("outNota").textContent = partes.join(" ");

  const hint = el("hintFeriado");
  if (hint) {
    try {
      const sug = diasFeriadoProporcionalSugeridos(calc.ingreso, calc.termino);
      hint.textContent = `Sugerido por las fechas: ${sug} días (1,25 × meses completos del año de feriado en curso). Puede editarlo.`;
    } catch {
      hint.textContent = "";
    }
  }
}

function recalc() {
  try {
    render(calcularFiniquitoCasaParticular(leer(), indicadores));
  } catch {
    render(
      calcularFiniquitoCasaParticular(
        { remuneracion: numVal("remuneracion"), causal: val("causal") || "desahucio" },
        indicadores,
      ),
    );
  }
}

wireNav();
document.getElementById("formCasaParticular")?.addEventListener("input", recalc);
document.getElementById("formCasaParticular")?.addEventListener("change", recalc);
recalc();
mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
