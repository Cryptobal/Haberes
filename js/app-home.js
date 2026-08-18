import { AFP_COMISION, AFP_NOMBRES } from "./constants.js";
import { clp, num } from "./format.js";
import { fallbackIndicadores, getIndicadores } from "./indicadores.js";
import { calcularSueldo } from "./sueldo.js";
import { mountIndicadores, wireNav } from "./ui.js";

const INITIAL_BRUTO = 1_200_553;

wireNav();
mountIndicadores();

const bruto = document.getElementById("homeBruto");
const brutoOut = document.getElementById("homeBrutoOut");
const afp = document.getElementById("homeAfp");
const salud = document.getElementById("homeSalud");
const contrato = document.getElementById("homeContrato");
const liquido = document.getElementById("homeLiquido");
const periodo = document.getElementById("homePeriodo");
const ufNota = document.getElementById("homeUfNota");

if (bruto && afp && salud && contrato && liquido) {
  fillAfp(afp);
  periodoLabel(periodo);
  bootDemo();
}

function fillAfp(select) {
  const current = select.value || "modelo";
  select.replaceChildren();
  for (const [value, nombre] of Object.entries(AFP_NOMBRES)) {
    const opt = document.createElement("option");
    opt.value = value;
    const comision = AFP_COMISION[value];
    opt.textContent = comision == null ? nombre : `${nombre} (${String(comision).replace(".", ",")} %)`;
    select.append(opt);
  }
  select.value = AFP_NOMBRES[current] ? current : "modelo";
}

function periodoLabel(el) {
  if (!el) return;
  const raw = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(new Date());
  el.textContent = raw.charAt(0).toUpperCase() + raw.slice(1);
}

function readDemo() {
  const min = Number(bruto.min) || INITIAL_BRUTO;
  const raw = Number(bruto.value);
  const sueldoBase = Number.isFinite(raw) && raw > 0 ? Math.max(min, raw) : INITIAL_BRUTO;
  return {
    sueldoBase,
    afp: afp.value || "modelo",
    salud: salud.value || "fonasa",
    contrato: contrato.value || "indefinido",
    gratificacionArt50: true,
  };
}

function setText(el, value) {
  if (el) el.textContent = value;
}

function renderDemo(calc) {
  setText(brutoOut, clp(calc.sueldoBase));
  setText(liquido, clp(calc.liquido));
  setText(document.querySelector("[data-demo=gratificacion]"), clp(calc.gratificacion));
  setText(document.querySelector("[data-demo=imponible]"), clp(calc.imponible));
  setText(document.querySelector("[data-demo=afp]"), clp(calc.afp.monto));
  setText(document.querySelector("[data-demo=salud]"), clp(calc.salud.monto));
  setText(document.querySelector("[data-demo=cesantia]"), clp(calc.cesantia.monto));
  setText(document.querySelector("[data-demo=base]"), clp(calc.baseTributable));
  setText(document.querySelector("[data-demo=iusc]"), clp(calc.iusc));
}

function safeUf(ind) {
  const uf = Number(ind?.uf);
  if (Number.isFinite(uf) && uf > 0) return uf;
  return fallbackIndicadores().uf;
}

function ufFuente(ind) {
  return ind?.fuente === "mindicador" || ind?.fuente === "cache" ? "mindicador.cl" : "valor de respaldo";
}

async function bootDemo() {
  let ind = fallbackIndicadores();
  try {
    ind = await getIndicadores();
  } catch {
    ind = fallbackIndicadores();
  }
  const uf = safeUf(ind);
  const paint = () => {
    const calc = calcularSueldo(readDemo(), { uf });
    renderDemo(calc);
    setText(ufNota, `Cálculo con UF ${num(uf)} (${ufFuente(ind)}).`);
  };
  bruto.addEventListener("input", paint);
  afp.addEventListener("change", paint);
  salud.addEventListener("change", paint);
  contrato.addEventListener("change", paint);
  paint();
}
