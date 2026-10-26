import { calcularBonoPorHijo, RENTABILIDAD_EJEMPLO_SP } from "./bono-por-hijo.js";
import { clp, num } from "./format.js";
import { el, val, wireNav } from "./ui.js";

function leer() {
  const tasaCampo = val("tasaAnual");
  const tasaVacia = tasaCampo == null || String(tasaCampo).trim() === "";
  const tasa = tasaVacia ? null : Number(String(tasaCampo).trim().replace(",", "."));
  const cantidadCampo = val("cantidadHijos");
  const cantidad = cantidadCampo == null || String(cantidadCampo).trim() === ""
    ? 1
    : Number(String(cantidadCampo).trim());
  return {
    fechaMadre: val("fechaMadre") || "",
    fechaHijo: val("fechaHijo") || "",
    cantidad,
    rentabilidadAnual: tasaVacia ? RENTABILIDAD_EJEMPLO_SP : tasa / 100,
    tasaVacia,
    referencia: el("esAdopcion")?.checked ? "adopcion" : "nacimiento",
  };
}

function pesos(ok, n) {
  return ok ? clp(n) : "—";
}

function render(calc) {
  const ok = calc.ok;
  el("outBono").textContent = pesos(ok, calc.bono);
  el("outTotal").textContent = pesos(ok, calc.total);
  el("outBase").textContent = pesos(ok, calc.base);
  el("outIm").textContent = ok ? clp(calc.im) : "—";
  el("outLey").textContent = ok ? calc.ley : "—";
  el("outMeses").textContent = ok ? String(calc.meses) : "—";
  el("outTasa").textContent = ok ? `${num(calc.rentabilidadAnual * 100, 2)} %` : "—";
  el("outCumple").textContent = ok ? calc.cumple65 : "—";
  el("outIndices").textContent = ok ? `${calc.indiceInicio} → ${calc.indiceFin}` : "—";

  const alerta = el("outAlerta");
  if (alerta) {
    if (!ok && calc.motivo === "fecha") {
      alerta.hidden = false;
      alerta.textContent = "Indique la fecha de nacimiento de la madre y la fecha de nacimiento o adopción del hijo, en formato válido.";
    } else if (!ok && calc.motivo === "cantidad") {
      alerta.hidden = false;
      alerta.textContent = "El número de hijos debe ser un entero entre 1 y 20. Cada uno usa la misma fecha.";
    } else if (!ok && calc.motivo === "rentabilidad") {
      alerta.hidden = false;
      alerta.textContent = "La rentabilidad supuesta debe estar entre −99 % y 100 % anual. 4,51 es el ejemplo de la Superintendencia, no el índice oficial.";
    } else if (!ok && calc.motivo === "imm") {
      alerta.hidden = false;
      alerta.textContent = "No hay un ingreso mínimo en pesos publicado para ese mes (desde enero de 2027 la Ley 21.830 reajusta por IPC y el monto aún no está fijado).";
    } else {
      alerta.hidden = true;
      alerta.textContent = "";
    }
  }

  const partes = [];
  if (ok) {
    const corte = calc.antesDeJulio2009
      ? "El hijo es anterior al 1 de julio de 2009: se usa el ingreso mínimo de ese mes y la rentabilidad parte en junio de 2009."
      : "El hijo es del 1 de julio de 2009 o posterior: se usa el ingreso mínimo del mes de la fecha y la rentabilidad parte ese mes.";
    partes.push(
      `${corte} Base ${clp(calc.base)} (10 % de 18 × ${clp(calc.im)}, ${calc.ley}).`,
    );
    partes.push(
      `Supuesto de rentabilidad nominal anual ${num(calc.rentabilidadAnual * 100, 2)} % durante ${calc.meses} meses (índice ${calc.indiceInicio} a ${calc.indiceFin}), hasta que la madre cumple 65 el ${calc.cumple65}.`,
    );
    partes.push(
      calc.cantidad === 1
        ? `Bono estimado de este hijo: ${clp(calc.bono)}.`
        : `Bono estimado por hijo: ${clp(calc.bono)}. Por ${calc.cantidad} hijos con la misma fecha: ${clp(calc.total)}.`,
    );
    for (const aviso of calc.avisos) partes.push(aviso);
  }
  partes.push(
    "Estimación de Haberes. No es la resolución del IPS ni el índice de la Superintendencia de Pensiones. No es un cálculo de la Dirección del Trabajo ni de Previred. No constituye asesoría legal ni previsional.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  const input = leer();
  render(calcularBonoPorHijo(input));
}

wireNav();
const form = document.getElementById("formBonoHijo");
form?.addEventListener("submit", (ev) => ev.preventDefault());
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
