import { AFP_COMISION, FALLBACK_UF } from "./constants.js";
import { clp, num } from "./format.js";
import { calcularSueldoCasaParticular } from "./sueldo-casa-particular.js";
import { el, mountIndicadores, numVal, val, wireNav } from "./ui.js";

let indicadores = { uf: FALLBACK_UF };

function modalidadActual() {
  return document.querySelector('input[name="modalidad"]:checked')?.value || "afuera";
}

function leer() {
  const comisionRaw = val("comision");
  const comisionAfpPct =
    comisionRaw == null || comisionRaw === "" ? undefined : Number(String(comisionRaw).replace(",", "."));
  return {
    remuneracion: numVal("remuneracion"),
    afp: el("afp")?.value || "modelo",
    comisionAfpPct: Number.isFinite(comisionAfpPct) ? comisionAfpPct : undefined,
    salud: el("salud")?.value || "fonasa",
    isaprePactado: el("salud")?.value === "isapre" ? numVal("isaprePactado") : 0,
    colacion: numVal("colacion"),
    movilizacion: numVal("movilizacion"),
    mesesCotizados: numVal("mesesCotizados"),
    modalidad: modalidadActual(),
  };
}

function pct(n, digits = 2) {
  return `${num(Number(n) * 100, digits)} %`;
}

function syncCampos() {
  const isapre = el("salud")?.value === "isapre";
  const wrap = el("wrapIsapre");
  if (wrap) wrap.hidden = !isapre;
  const afuera = modalidadActual() !== "adentro";
  const notaAfuera = el("notaAfuera");
  const notaAdentro = el("notaAdentro");
  if (notaAfuera) notaAfuera.hidden = !afuera;
  if (notaAdentro) notaAdentro.hidden = afuera;
}

function render(calc) {
  el("outLiquido").textContent = clp(calc.liquido);
  el("outCosto").textContent = clp(calc.costoEmpleador);
  el("outAfp").textContent = clp(calc.afp.monto);
  el("outSalud").textContent = clp(calc.salud.monto);
  el("outCesTrab").textContent = clp(calc.cesantiaTrabajador.monto);
  el("outIusc").textContent = clp(calc.iusc);
  el("outHaberes").textContent = clp(calc.totalHaberes);
  el("outLey").textContent = clp(calc.ley21735.monto);
  el("outAfc").textContent = clp(calc.afc.monto);
  el("outAfcCic").textContent = clp(calc.afc.cic.monto);
  el("outAfcFcs").textContent = clp(calc.afc.fcs.monto);
  el("outIte").textContent = clp(calc.ite.monto);
  el("outMutual").textContent = clp(calc.mutual.monto);
  el("outSanna").textContent = clp(calc.sanna.monto);
  el("outAportes").textContent = clp(calc.totalAportes);
  el("outTasaAfp").textContent = pct(calc.afp.tasa, 2);
  el("outTasaLey").textContent = pct(calc.ley21735.tasa, 1);
  el("outTasaAfc").textContent = pct(calc.afc.tasa, 1);

  const meses = el("outMeses");
  if (meses) {
    meses.textContent = calc.ite.aplica
      ? `Quedan ${calc.ite.mesesRestantes} meses de la obligación (tope ${calc.ite.mesesTope} meses, 11 años).`
      : `Quedan 0 meses: la obligación de 11 años ya se cumplió y este mes el 1,11 % es ${clp(0)}.`;
  }

  const bits = [];
  if (calc.noImponible) {
    bits.push(`colación y movilización ${clp(calc.noImponible)} no entran a la base imponible (art. 41)`);
  }
  if (calc.imponible > calc.topeAfpSalud + 0.5) {
    bits.push("AFP, salud, Ley 21.735, mutual, SANNA y el 1,11 % usan el tope de 90 UF");
  }
  if (calc.imponible > calc.topeCesantia + 0.5) {
    bits.push("el 3 % de cesantía usa el tope de 135,2 UF");
  }
  if (!calc.ite.aplica) {
    bits.push("sin aporte de indemnización a todo evento este mes");
  }
  el("outNota").textContent = bits.length
    ? `${bits.join("; ")}.`
    : "El trabajador no paga cesantía: el 3 % es de cargo del empleador.";
}

function recalc() {
  syncCampos();
  render(calcularSueldoCasaParticular(leer(), indicadores));
}

wireNav();
document.getElementById("afp")?.addEventListener("change", () => {
  const key = el("afp")?.value;
  const comision = AFP_COMISION[key];
  const campo = el("comision");
  if (campo && comision != null) campo.value = String(comision);
  recalc();
});
document.getElementById("formCasaParticularMes")?.addEventListener("input", recalc);
document.getElementById("formCasaParticularMes")?.addEventListener("change", recalc);
recalc();
mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  recalc();
});
