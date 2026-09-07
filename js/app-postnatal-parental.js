import { clp, num } from "./format.js";
import { calcularPostnatalParental } from "./sueldo.js";
import { el, mountIndicadores, numVal, val, wireNav } from "./ui.js";

function netaCampo(id) {
  const raw = val(id);
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function leer() {
  return {
    baseSil: numVal("baseSil"),
    estipendiosFijos: numVal("estipendiosFijos"),
    neta1: netaCampo("neta1"),
    neta2: netaCampo("neta2"),
    neta3: netaCampo("neta3"),
    semanasPadre: numVal("semanasPadre"),
  };
}

function plataDia(v) {
  return v > 0 ? `$ ${num(v)}` : "$ 0";
}

function nota(calc) {
  const partes = [];
  if (calc.silDesdeNetas) {
    partes.push(
      `Base SIL = promedio de 3 rentas netas (D.F.L. N°44 art. 8) = ${clp(calc.baseSil)}.`,
    );
  } else {
    partes.push(`Base SIL mensual = ${clp(calc.baseSil)} (la cifra que ingresó, o 0).`);
  }
  partes.push(
    `Diario completa = base / 30 = ${plataDia(calc.diarioCompleto)}. Diario parcial = 50 % = ${plataDia(calc.diarioParcial)}.`,
  );
  partes.push(
    `Completa: ${calc.semanasCompleta} sem (${calc.diasCompleta} días) × diario = ${clp(calc.subsidioCompleta)} de subsidio; el empleador no paga ese tramo.`,
  );
  partes.push(
    `Parcial: ${calc.semanasParcial} sem (${calc.diasParcial} días) × diario/2 = ${clp(calc.subsidioParcial)} de subsidio. Empleador = días × (estipendios fijos / 2) / 30 = ${clp(calc.empleadorParcial)}.`,
  );
  if (calc.diferenciaIngreso > 0) {
    partes.push(
      `En el tramo completo, la madre estima ${clp(calc.diferenciaIngreso)} más en parcial (subsidio + empleador), repartido en 18 semanas en vez de 12.`,
    );
  } else if (calc.diferenciaIngreso < 0) {
    partes.push(
      `En el tramo completo, la madre estima ${clp(-calc.diferenciaIngreso)} más en jornada completa (el subsidio parcial es la mitad y el pago del empleador depende de los estipendios fijos).`,
    );
  } else {
    partes.push("En el tramo completo, ambas modalidades dejan el mismo ingreso estimado a la madre.");
  }
  if (calc.semanasPadre > 0) {
    partes.push(
      `Cesión al padre (desde la 7.ª semana): completa cede ${calc.semanasPadreCompleta} sem; parcial cede ${calc.semanasPadreParcial} sem. Tramo restante de la madre: completa ${clp(calc.ingresoMadreCompletaRestante)}; parcial ${clp(calc.ingresoMadreParcialRestante)} (subsidio + empleador). El subsidio del padre lo calcula su Isapre o COMPIN con sus rentas; aquí no se estima.`,
    );
  }
  partes.push(
    "El monto real del subsidio lo determina la entidad pagadora. Esta cifra es educativa, no una liquidación.",
  );
  return partes.join(" ");
}

function render(calc) {
  el("outDelta").textContent = clp(calc.diferenciaIngreso);
  el("outIngresoCompleta").textContent = clp(calc.ingresoCompleta);
  el("outIngresoParcial").textContent = clp(calc.ingresoParcial);
  el("outSubsidioCompleta").textContent = clp(calc.subsidioCompleta);
  el("outEmpleadorCompleta").textContent = clp(calc.empleadorCompleta);
  el("outSubsidioParcial").textContent = clp(calc.subsidioParcial);
  el("outEmpleadorParcial").textContent = clp(calc.empleadorParcial);
  el("outDiarioCompleto").textContent = plataDia(calc.diarioCompleto);
  el("outDiarioParcial").textContent = plataDia(calc.diarioParcial);
  el("outBase").textContent = clp(calc.baseSil);
  el("outFijos").textContent = clp(calc.estipendiosFijos);
  el("outDuracionCompleta").textContent = `${calc.semanasCompleta} sem / ${calc.diasCompleta} días`;
  el("outDuracionParcial").textContent = `${calc.semanasParcial} sem / ${calc.diasParcial} días`;
  el("outNota").textContent = nota(calc);

  const alerta = el("outAlerta");
  if (!alerta) return;
  const hayCesion = calc.semanasPadre > 0;
  alerta.hidden = !hayCesion;
  alerta.textContent = hayCesion
    ? `Cesión informativa: el padre goza el tramo final (${calc.semanasPadreCompleta} sem en completa, ${calc.semanasPadreParcial} sem en parcial). Su subsidio no se calcula aquí.`
    : "";
}

function recalc() {
  render(calcularPostnatalParental(leer()));
}

wireNav();
const form = document.getElementById("formPostnatalParental");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
