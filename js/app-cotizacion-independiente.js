import {
  AFP_COMISION,
  AFP_NOMBRES,
  FALLBACK_UF,
  RETENCION_BOLETA_HONORARIOS,
  SIS_INDEPENDIENTE_MENSUAL_ABR2026,
  SIS_INDEPENDIENTE_RETENCION_AT2026,
} from "./constants.js";
import { calcularCotizacionIndependiente, porcentajeParcialHonorarios } from "./cotizacion-independiente.js";
import { clp, num } from "./format.js";
import { roundPeso } from "./sueldo.js";
import { el, mountIndicadores, numVal, val, wireNav } from "./ui.js";

let indicadores = { uf: FALLBACK_UF, fecha: null, fuente: "fallback" };

function decimalVal(id) {
  const raw = val(id);
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function ufManual() {
  return decimalVal("ufMes");
}

function coberturaActual() {
  return document.querySelector('input[name="cobertura"]:checked')?.value || "total";
}

function leer() {
  const manual = ufManual();
  const atepPct = decimalVal("tasaAtep");
  return {
    honorariosBrutos: numVal("brutos"),
    anio: numVal("anio") || 2026,
    cobertura: coberturaActual(),
    afp: val("afp") || "uno",
    uf: manual == null ? indicadores.uf : manual,
    tasaAtepAdicional: atepPct == null || Number.isNaN(atepPct) ? 0 : Math.max(0, atepPct) / 100,
  };
}

function mensualActivo() {
  return Boolean(el("mensual")?.checked);
}

function pct(n, digits = 2) {
  return `${num(Number(n) * 100, digits)} %`;
}

function fuenteUf(ufEsManual) {
  if (ufEsManual) return "UF ingresada a mano";
  const fecha = indicadores.fecha ? new Date(indicadores.fecha).toLocaleDateString("es-CL") : "";
  if (indicadores.fuente === "mindicador" || indicadores.fuente === "cache") {
    return `UF del día según mindicador.cl${fecha ? ` (${fecha})` : ""}`;
  }
  return "UF de respaldo de Haberes (mindicador.cl no respondió)";
}

function monto(calc, clave) {
  return mensualActivo() ? calc.mensual[clave] : calc[clave];
}

function render(calc) {
  const mes = mensualActivo();
  const sufijo = mes ? " al mes" : "";
  const metricLabel = el("outMetricLabel");
  if (metricLabel) metricLabel.textContent = `Cotizaciones estimadas${sufijo}`;
  el("outTotal").textContent = clp(monto(calc, "total"));
  el("outImponible").textContent = clp(mes ? calc.mensual.rentaImponible : calc.rentaImponible);
  el("outBase").textContent = clp(mes ? roundPeso(calc.basePensionesSalud / 12) : calc.basePensionesSalud);
  el("outAfp").textContent = clp(monto(calc, "afp"));
  el("outComision").textContent = clp(monto(calc, "comision"));
  el("outSalud").textContent = clp(monto(calc, "salud"));
  el("outSis").textContent = clp(monto(calc, "sis"));
  el("outAtep").textContent = clp(monto(calc, "atep"));
  el("outSanna").textContent = clp(monto(calc, "sanna"));
  el("outRetencion").textContent = clp(monto(calc, "retencion"));
  el("outSaldo").textContent = clp(monto(calc, "saldoEducativo"));
  el("outTasaAfp").textContent = pct(calc.tasaAfp, 0);
  el("outTasaComision").textContent = pct(calc.tasaComision, 2);
  el("outCobertura").textContent =
    calc.cobertura === "parcial" ? `Parcial ${pct(calc.factorPensionesSalud, 0)}` : "Total 100 %";

  const notas = [];
  if (!calc.anioOk) {
    notas.push("Año fuera de la tabla 2025–2028: se usa 2026 (retención 15,25 % y parcial 90 % en Operación Renta 2027).");
  }
  if (!calc.ufOk) notas.push("La UF ingresada no sirve: se usa la UF de respaldo.");
  if (decimalVal("tasaAtep") != null && Number.isNaN(decimalVal("tasaAtep"))) {
    notas.push("La tasa adicional ATEP no es un número: se usa solo la básica 0,90 %.");
  }
  if (!calc.obligado) {
    notas.push(
      `Bajo 5 ingresos mínimos (${clp(calc.umbralBrutos)} brutos al año): la estimación corre igual y marca que, en el caso típico, no habría obligación de cotizar.`,
    );
  }
  if (calc.topeAplicado) {
    notas.push(`La renta imponible quedó en el tope anual de 90 UF × 12 (${clp(calc.topeAnualPesos)}).`);
  }
  if (calc.saldoEducativo < 0) {
    notas.push("El saldo retención − cotizaciones es negativo: en este ejemplo la retención no alcanza a cubrir las cotizaciones.");
  } else if (calc.brutos > 0) {
    notas.push("El saldo es la retención estimada menos las cotizaciones. Puede quedar plata o faltar; Operación Renta lo cierra.");
  }
  notas.push(fuenteUf(ufManual() != null) + ".");
  notas.push(
    `SIS ${pct(SIS_INDEPENDIENTE_RETENCION_AT2026, 2)} del camino retención, año tributario 2026. La tasa mensual desde abril 2026 es ${pct(SIS_INDEPENDIENTE_MENSUAL_ABR2026, 2)} y no se usa aquí.`,
  );
  if (mes) notas.push("Los montos al mes son el anual dividido por 12, redondeado al peso. No es Previred mes a mes.");
  el("outNota").textContent = notas.join(" ");

  const flag = el("outObligado");
  if (flag) {
    flag.textContent = calc.obligado ? "Sobre el umbral de 5 IMM" : "Bajo el umbral de 5 IMM";
  }
}

function pintarAnios() {
  const select = el("anio");
  if (!select || select.dataset.ready === "1") return;
  select.dataset.ready = "1";
  const anios = Object.keys(RETENCION_BOLETA_HONORARIOS)
    .map((y) => Number(y))
    .sort((a, b) => a - b);
  select.innerHTML = anios
    .map((y) => {
      const ret = RETENCION_BOLETA_HONORARIOS[y] * 100;
      const parcial = (porcentajeParcialHonorarios(y) ?? 0) * 100;
      const at = y + 1;
      const selected = y === 2026 ? " selected" : "";
      return `<option value="${y}"${selected}>${y} — retención ${num(ret, ret % 1 ? 2 : 0)} % · parcial ${num(parcial, 0)} % (OR ${at})</option>`;
    })
    .join("");
}

function recalc() {
  render(calcularCotizacionIndependiente(leer()));
}

function pintarAfp() {
  const select = el("afp");
  if (!select || select.dataset.ready === "1") return;
  select.dataset.ready = "1";
  select.innerHTML = Object.keys(AFP_NOMBRES)
    .map((key) => {
      const selected = key === "uno" ? " selected" : "";
      return `<option value="${key}"${selected}>${AFP_NOMBRES[key]} — comisión ${num(AFP_COMISION[key], 2)} %</option>`;
    })
    .join("");
}

wireNav();
pintarAnios();
pintarAfp();
const form = document.getElementById("formCotizacionIndependiente");
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
mountIndicadores().then((ind) => {
  if (ind?.uf) indicadores = ind;
  recalc();
});
recalc();
