import { clp, num } from "./format.js";
import { calcularLicenciaMedica } from "./sueldo.js";
import { el, mountIndicadores, numVal, val, wireNav } from "./ui.js";

function netaCampo(id) {
  const raw = val(id);
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function leer() {
  return {
    remuneracion: numVal("remuneracion"),
    diasLicencia: numVal("diasLicencia"),
    neta1: netaCampo("neta1"),
    neta2: netaCampo("neta2"),
    neta3: netaCampo("neta3"),
    excluirOcasionales: Boolean(document.getElementById("excluirOcasionales")?.checked),
  };
}

function plataDia(v) {
  return v > 0 ? `$ ${num(v)}` : "$ 0";
}

function render(calc) {
  el("outBruto").textContent = clp(calc.brutoEmpleador);
  el("outDiario").textContent = plataDia(calc.valorDiario);
  el("outDiasTrab").textContent = String(calc.diasTrabajados);
  el("outDiasLic").textContent = String(calc.diasLicencia);
  el("outRem").textContent = clp(calc.remuneracion);

  if (calc.silCompleto) {
    el("outBaseSil").textContent = clp(calc.baseSil);
    el("outDiarioSil").textContent = plataDia(calc.diarioSil);
    el("outSil").textContent = clp(calc.silTramo);
  } else {
    el("outBaseSil").textContent = "Incompleto";
    el("outDiarioSil").textContent = "Incompleto";
    el("outSil").textContent = "Incompleto";
  }

  const notas = [];
  notas.push(
    "El empleador no paga los días de licencia aprobada; esos días los cubre el SIL de la entidad de salud.",
  );
  notas.push("Días trabajados = 30 − días de licencia (mes convencional DT / 30, no 28 ni 31 de calendario).");
  if (!calc.silCompleto) {
    notas.push("Faltan las 3 remuneraciones netas: se calcula solo el lado empleador.");
  } else if (!calc.excluirOcasionales) {
    notas.push(
      "Si las netas incluyen aguinaldos, gratificaciones u horas extras ocasionales, el SIL puede quedar sobreestimado (D.F.L. N°44 art. 10).",
    );
  } else {
    notas.push("El monto real del SIL lo define COMPIN, Isapre o mutual; puede haber carencia, topes y reglas propias.");
  }
  el("outNota").textContent = notas.join(" ");
}

function recalc() {
  render(calcularLicenciaMedica(leer()));
}

wireNav();
const form = document.getElementById("formLicenciaMedica");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
recalc();
mountIndicadores();
