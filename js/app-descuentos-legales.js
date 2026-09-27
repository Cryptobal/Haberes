import { clp } from "./format.js";
import { calcularDescuentosLegales } from "./descuentos-legales.js";
import { el, mountIndicadores, numVal, wireNav } from "./ui.js";

function leer() {
  return {
    remuneracion: numVal("remuneracion"),
    obligatorios: numVal("obligatorios"),
    vivienda: numVal("vivienda"),
    otros: numVal("otros"),
  };
}

function incluyeAnticipo() {
  return Boolean(document.getElementById("incluyeAnticipo")?.checked);
}

function renderAnticipo() {
  const banner = el("outAnticipo");
  const campo = el("campoAnticipo");
  const on = incluyeAnticipo();
  if (campo) campo.hidden = !on;
  if (!banner) return;
  banner.hidden = !on;
  if (!on) {
    banner.textContent = "";
    return;
  }
  const anticipo = numVal("anticipo");
  const monto = anticipo > 0 ? ` Informó ${clp(anticipo)}.` : "";
  banner.textContent =
    `El anticipo de remuneración ya devengada no es un descuento del artículo 58 (dictamen DT 7051/332). No consume el tope del 15 % y esta página no lo resta del cupo ni del remanente.${monto} Un préstamo de la empresa sí entra en los descuentos permitidos: anótelo en vivienda/educación o en otros voluntarios, según el caso.`;
}

function render(calc) {
  el("outTope15").textContent = clp(calc.tope15);
  el("outTope30").textContent = clp(calc.tope30);
  el("outTope45").textContent = clp(calc.tope45);
  el("outAplicable15").textContent = clp(calc.aplicable15);
  el("outExceso15").textContent = clp(calc.exceso15);
  el("outAplicable30").textContent = clp(calc.aplicable30);
  el("outExceso30").textContent = clp(calc.exceso30);
  el("outObligatorios").textContent = clp(calc.obligatoriosAplicables);
  el("outViviendaCabe").textContent = clp(calc.viviendaAplicables);
  el("outOtrosCabe").textContent = clp(calc.otrosAplicables);
  el("outTotal").textContent = clp(calc.totalAplicable);
  el("outRemanente").textContent = clp(calc.remanente);

  const alerta = el("outAlerta");
  if (!calc.ok) {
    el("outNota").textContent =
      "Ingrese una remuneración total mayor que cero. Los montos de descuento no pueden ser negativos.";
    if (alerta) {
      alerta.hidden = true;
      alerta.textContent = "";
    }
    return;
  }

  const notas = [];
  notas.push(
    `Sobre ${clp(calc.remuneracion)} de remuneración total, el 15 % es ${clp(calc.tope15)}, el 30 % es ${clp(calc.tope30)} y el 45 % conjunto es ${clp(calc.tope45)}.`,
  );
  if (calc.exceso15 > 0) {
    notas.push(
      `Otros voluntarios: de ${clp(calc.otrosSolicitados)} caben ${clp(calc.aplicable15)} en el 15 % y exceden ${clp(calc.exceso15)}.`,
    );
  }
  if (calc.exceso30 > 0) {
    notas.push(
      `Vivienda o educación: de ${clp(calc.viviendaSolicitada)} caben ${clp(calc.aplicable30)} en el 30 % y exceden ${clp(calc.exceso30)}.`,
    );
  }
  if (calc.excedeGlobal) {
    notas.push(
      "La suma pasa el 45 %. Se conservan primero los obligatorios, después vivienda o educación y al final los otros voluntarios.",
    );
  } else {
    notas.push("Con estas cifras el conjunto no pasa el 45 %.");
  }
  if (calc.excesoObligatorios > 0) {
    notas.push(
      "Los obligatorios solos superan el 45 %. El empleador igual debe practicar impuestos y cotizaciones: este tope no los borra.",
    );
  }
  notas.push(
    "El remanente es lo que queda después de los descuentos que caben. No es el sueldo líquido.",
  );
  el("outNota").textContent = notas.join(" ");

  if (alerta) {
    alerta.hidden = !calc.excedeGlobal;
    alerta.textContent = calc.excedeGlobal
      ? `Atención: el conjunto pedido supera el tope del 45 % (${clp(calc.tope45)}). Lo que cabe suma ${clp(calc.totalAplicable)}.`
      : "";
  }
}

function recalc() {
  render(calcularDescuentosLegales(leer()));
  renderAnticipo();
}

wireNav();
const form = document.getElementById("formDescuentosLegales");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
