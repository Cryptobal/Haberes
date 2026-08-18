/**
 * Calculadoras embebidas en páginas SEO (/guias/*, /finiquito/*).
 * Usa los mismos motores que /sueldo y /finiquito; no duplica tasas.
 */
import {
  FALLBACK_UF,
  GRATIFICACION_TASA,
  GRATIFICACION_TOPE,
  HORAS_EXTRA_FACTOR,
  JORNADA_DEFAULT,
  IUSC_TRAMOS,
  DISCLAIMER,
} from "./constants.js";
import { calcularFiniquitoCompleto } from "./finiquito.js";
import { calcularSueldo, valorHoraExtra, gratificacionArt50 } from "./sueldo.js";

function pesos(n) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(Number(n) || 0));
}

function pesosDec(n) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}

function num(el) {
  const raw = String(el?.value ?? "").replace(/\./g, "").replace(/,/g, ".");
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function field(label, name, attrs = "") {
  return `<label class="seo-calc__field"><span>${label}</span><input name="${name}" ${attrs} /></label>`;
}

function mountFiniquito(root) {
  const causal = root.dataset.causal || "161-necesidades";
  root.innerHTML = `
    <form class="seo-calc__form" novalidate>
      <p class="seo-calc__title">Estimar finiquito</p>
      ${field("Remuneración mensual", "rem", 'type="text" inputmode="numeric" value="900000"')}
      ${field("Fecha ingreso", "ingreso", 'type="date" value="2020-03-01"')}
      ${field("Fecha término", "termino", 'type="date" value="2026-03-01"')}
      ${field("Días feriado pendiente", "ferPend", 'type="number" min="0" value="5"')}
      ${field("Días feriado proporcional", "ferProp", 'type="number" min="0" value="7"')}
      ${field("Otros haberes", "otros", 'type="text" inputmode="numeric" value="0"')}
      <label class="seo-calc__check"><input type="checkbox" name="grat" checked /> Gratificación art. 50</label>
      <label class="seo-calc__check"><input type="checkbox" name="aviso" /> Hubo aviso previo de 30 días</label>
      <p class="seo-calc__result" data-out>—</p>
      <div class="seo-calc__actions">
        <button type="submit" class="btn">Calcular</button>
        <a class="btn btn-ghost" href="/finiquito?causal=${encodeURIComponent(causal)}">Abrir calculadora completa</a>
        <a class="btn btn-ghost" href="/empresa">Cuenta de empresa</a>
      </div>
      <p class="seo-calc__note">${DISCLAIMER}</p>
    </form>`;
  const form = root.querySelector("form");
  const out = root.querySelector("[data-out]");
  const run = () => {
    const r = calcularFiniquitoCompleto(
      {
        remuneracion: num(form.rem),
        gratificacionArt50: form.grat.checked,
        ingreso: form.ingreso.value,
        termino: form.termino.value,
        diasFeriadoPendiente: Number(form.ferPend.value) || 0,
        diasFeriadoProporcional: Number(form.ferProp.value) || 0,
        otros: num(form.otros),
        diasMes: 0,
        avisoPrevio: form.aviso.checked,
        causal,
      },
      { uf: FALLBACK_UF },
    );
    out.textContent = `Total estimado: ${pesos(r.total)}`;
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
  run();
}

function mountSueldo(root) {
  root.innerHTML = `
    <form class="seo-calc__form" novalidate>
      <p class="seo-calc__title">Estimar sueldo líquido</p>
      ${field("Sueldo base", "base", 'type="text" inputmode="numeric" value="900000"')}
      <label class="seo-calc__check"><input type="checkbox" name="grat" checked /> Gratificación art. 50</label>
      <p class="seo-calc__result" data-out>—</p>
      <div class="seo-calc__actions">
        <button type="submit" class="btn">Calcular</button>
        <a class="btn btn-ghost" href="/sueldo">Abrir calculadora completa</a>
        <a class="btn btn-ghost" href="/empresa">Cuenta de empresa</a>
      </div>
      <p class="seo-calc__note">${DISCLAIMER}</p>
    </form>`;
  const form = root.querySelector("form");
  const out = root.querySelector("[data-out]");
  const run = () => {
    const base = num(form.base);
    const r = calcularSueldo(
      {
        sueldoBase: base,
        gratificacionArt50: form.grat.checked,
        afp: "modelo",
        salud: "fonasa",
        contrato: "indefinido",
      },
      { uf: FALLBACK_UF },
    );
    out.textContent = `Líquido estimado: ${pesos(r.liquido)}`;
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
  run();
}

function mountGratificacion(root) {
  root.innerHTML = `
    <form class="seo-calc__form" novalidate>
      <p class="seo-calc__title">Estimar gratificación art. 50</p>
      ${field("Remuneración mensual imponible", "base", 'type="text" inputmode="numeric" value="900000"')}
      <p class="seo-calc__result" data-out>—</p>
      <div class="seo-calc__actions">
        <button type="submit" class="btn">Calcular</button>
        <a class="btn btn-ghost" href="/sueldo">Ver en sueldo líquido</a>
        <a class="btn btn-ghost" href="/empresa">Cuenta de empresa</a>
      </div>
      <p class="seo-calc__note">${DISCLAIMER}</p>
    </form>`;
  const form = root.querySelector("form");
  const out = root.querySelector("[data-out]");
  const run = () => {
    const base = num(form.base);
    const monto = Math.round(gratificacionArt50(base));
    out.textContent = `Gratificación mensual estimada: ${pesos(monto)} (${GRATIFICACION_TASA * 100} % con tope ${pesos(GRATIFICACION_TOPE)})`;
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
  run();
}

function mountHoras(root) {
  root.innerHTML = `
    <form class="seo-calc__form" novalidate>
      <p class="seo-calc__title">Estimar horas extras</p>
      ${field("Sueldo base mensual", "base", 'type="text" inputmode="numeric" value="900000"')}
      ${field("Horas extras del mes", "horas", 'type="number" min="0" step="0.5" value="10"')}
      ${field("Jornada semanal (horas)", "jornada", `type="number" min="1" value="${JORNADA_DEFAULT}"`)}
      <p class="seo-calc__result" data-out>—</p>
      <div class="seo-calc__actions">
        <button type="submit" class="btn">Calcular</button>
        <a class="btn btn-ghost" href="/sueldo">Abrir calculadora completa</a>
        <a class="btn btn-ghost" href="/empresa">Cuenta de empresa</a>
      </div>
      <p class="seo-calc__note">${DISCLAIMER}</p>
    </form>`;
  const form = root.querySelector("form");
  const out = root.querySelector("[data-out]");
  const run = () => {
    const base = num(form.base);
    const horas = Number(form.horas.value) || 0;
    const jornada = Number(form.jornada.value) || JORNADA_DEFAULT;
    const monto = Math.round(valorHoraExtra(base, jornada) * horas);
    out.textContent = `Horas extras estimadas: ${pesos(monto)} (recargo ${HORAS_EXTRA_FACTOR})`;
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
  run();
}

function mountFeriado(root) {
  root.innerHTML = `
    <form class="seo-calc__form" novalidate>
      <p class="seo-calc__title">Estimar feriado / vacaciones proporcionales</p>
      ${field("Remuneración mensual", "base", 'type="text" inputmode="numeric" value="900000"')}
      ${field("Días de feriado", "dias", 'type="number" min="0" value="7"')}
      <p class="seo-calc__result" data-out>—</p>
      <div class="seo-calc__actions">
        <button type="submit" class="btn">Calcular</button>
        <a class="btn btn-ghost" href="/finiquito">Abrir finiquito</a>
        <a class="btn btn-ghost" href="/empresa">Cuenta de empresa</a>
      </div>
      <p class="seo-calc__note">${DISCLAIMER}</p>
    </form>`;
  const form = root.querySelector("form");
  const out = root.querySelector("[data-out]");
  const run = () => {
    const base = num(form.base);
    const dias = Number(form.dias.value) || 0;
    const monto = Math.round((base / 30) * dias);
    out.textContent = `Feriado estimado: ${pesos(monto)} (${dias} días × remuneración diaria)`;
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
  run();
}

function mountIusc(root) {
  const rows = IUSC_TRAMOS.map((t, i) => {
    const hasta = t.hasta === Infinity ? "Y más" : pesosDec(t.hasta);
    const desde = i === 0 ? "—" : pesosDec(IUSC_TRAMOS[i - 1].hasta + 0.01);
    const factor = t.tasa === 0 ? "Exento" : String(t.tasa).replace(".", ",");
    const rebaja = t.tasa === 0 ? "—" : pesosDec(t.rebaja);
    return `<tr><td>${desde}</td><td>${hasta}</td><td>${factor}</td><td>${rebaja}</td></tr>`;
  }).join("");
  root.innerHTML = `
    <div class="seo-calc__form">
      <p class="seo-calc__title">IUSC mensual agosto 2026 (SII / Haberes)</p>
      <div class="table-scroll">
        <table>
          <thead><tr><th>Desde</th><th>Hasta</th><th>Factor</th><th>Cantidad a rebajar</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="seo-calc__note">Fuente: <a href="https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm">SII, impuesto 2026</a>. Exento hasta $967.261,50 (13,5 UTM).</p>
      <div class="seo-calc__actions">
        <a class="btn" href="/sueldo">Calcular con impuesto único</a>
        <a class="btn btn-ghost" href="/empresa">Cuenta de empresa</a>
      </div>
      <p class="seo-calc__note">${DISCLAIMER}</p>
    </div>`;
}

const MOUNTERS = {
  finiquito: mountFiniquito,
  sueldo: mountSueldo,
  gratificacion: mountGratificacion,
  horas: mountHoras,
  feriado: mountFeriado,
  iusc: mountIusc,
};

document.querySelectorAll("[data-seo-calc]").forEach((el) => {
  const kind = el.getAttribute("data-seo-calc");
  const fn = MOUNTERS[kind];
  if (fn) fn(el);
});
