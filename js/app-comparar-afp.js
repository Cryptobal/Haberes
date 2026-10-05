import { AFP_COMISION, AFP_NOMBRES, FALLBACK_UF } from "./constants.js";
import { calcularCompararAfp, ufCompararAfpValida } from "./comparar-afp.js";
import { clp, num, ufFmt } from "./format.js";
import { roundPeso } from "./sueldo.js";
import { el, mountIndicadores, val, wireNav } from "./ui.js";

let indicadores = { uf: FALLBACK_UF, fecha: null, fuente: "fallback" };

function numeroCampo(id) {
  const raw = val(id);
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function leer() {
  const ufManual = numeroCampo("ufMes");
  const imponibleCampo = numeroCampo("sueldoImponible");
  return {
    imponible: imponibleCampo == null ? 0 : imponibleCampo,
    afp: el("afpActual")?.value || "",
    uf: ufManual == null ? indicadores.uf : ufManual,
    ufEsManual: ufManual != null,
  };
}

function fuenteUf(ufEsManual) {
  if (ufEsManual) return "UF ingresada manualmente";
  const fecha = indicadores.fecha ? new Date(indicadores.fecha).toLocaleDateString("es-CL") : "";
  if (indicadores.fuente === "mindicador" || indicadores.fuente === "cache") {
    return `UF del día según mindicador.cl${fecha ? ` (${fecha})` : ""}`;
  }
  return "UF de respaldo de Haberes (mindicador.cl no respondió)";
}

function pesos(ok, n) {
  return ok ? clp(n) : "—";
}

function llenarAfp() {
  const select = el("afpActual");
  if (!select || select.options.length > 1) return;
  const keys = Object.keys(AFP_COMISION).sort(
    (a, b) => AFP_COMISION[a] - AFP_COMISION[b] || AFP_NOMBRES[a].localeCompare(AFP_NOMBRES[b], "es"),
  );
  for (const key of keys) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${AFP_NOMBRES[key]} — ${num(AFP_COMISION[key], 2)} %`;
    select.append(opt);
  }
  select.value = "provida";
}

function filaPorClave(calc, key) {
  return calc.filas.find((f) => f.key === key) || null;
}

function render(calc, input) {
  const ok = calc.ok;
  const menor = ok ? filaPorClave(calc, calc.menor) : null;
  el("outMenor").textContent = ok && menor ? `${menor.nombre} · ${clp(menor.mensual)}` : "—";
  el("outAhorroMes").textContent = ok && calc.ahorroMaxMensual != null ? clp(calc.ahorroMaxMensual) : "—";
  el("outAhorroAnio").textContent = ok && calc.ahorroMaxAnual != null ? clp(calc.ahorroMaxAnual) : "—";
  el("outBase").textContent = pesos(ok, roundPeso(calc.base));
  el("outObligatorio").textContent = pesos(ok, calc.cotizacionObligatoria);
  el("outUf").textContent = ok ? ufFmt(calc.uf) : "—";
  el("outFuenteUf").textContent = fuenteUf(input.ufEsManual);

  const tabla = el("tablaAfp");
  if (tabla) {
    if (!ok) {
      tabla.innerHTML = "";
    } else {
      const conActual = Boolean(calc.afpActual);
      const ahorroHead = conActual
        ? "<th>Ahorro al mes</th><th>Ahorro al año</th>"
        : "";
      const body = calc.filas
        .map((fila) => {
          const marca = fila.esActual ? " (actual)" : "";
          const ahorro = conActual
            ? `<td>${clp(fila.ahorroMensual)}</td><td>${clp(fila.ahorroAnual)}</td>`
            : "";
          return `<tr><td>${fila.nombre}${marca}</td><td>${num(fila.pct, 2)} %</td><td>${clp(fila.mensual)}</td><td>${clp(fila.anual)}</td>${ahorro}</tr>`;
        })
        .join("");
      tabla.innerHTML = `<div class="table-scroll">
      <table>
        <caption>Comisión AFP sobre la misma base imponible, de menor a mayor</caption>
        <thead><tr><th>AFP</th><th>Comisión</th><th>Al mes</th><th>Al año</th>${ahorroHead}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
    }
  }

  const alerta = el("outAlerta");
  if (alerta) {
    if (!ok && calc.motivo === "uf") {
      alerta.hidden = false;
      alerta.textContent = "Indique una UF entre $20.000 y $80.000, o deje el campo vacío para usar la UF del día.";
    } else if (!ok && calc.motivo === "afp") {
      alerta.hidden = false;
      alerta.textContent = "Elija una AFP de la lista o deje «No indicar».";
    } else if (!ok) {
      alerta.hidden = false;
      alerta.textContent = "El sueldo imponible debe ser un número mayor o igual a cero.";
    } else {
      alerta.hidden = true;
      alerta.textContent = "";
    }
  }

  const partes = [];
  if (ok) {
    partes.push(
      `La base de la comisión es ${clp(roundPeso(calc.base))}: la menor entre el sueldo imponible y el tope de ${num(calc.topeUf, 0)} UF (${clp(roundPeso(calc.topePesos))}).`,
    );
    if (calc.topeAplicado) partes.push("El sueldo está sobre el tope AFP: la comisión no sube con el exceso.");
    partes.push(
      `La cotización obligatoria del 10 % es ${clp(calc.cotizacionObligatoria)} en las siete AFP. Solo cambia la comisión.`,
    );
    if (menor) {
      partes.push(
        `La comisión más baja de esta tabla es ${menor.nombre} (${num(menor.pct, 2)} %): ${clp(menor.mensual)} al mes y ${clp(menor.anual)} al año.`,
      );
    }
    if (calc.afpActual && calc.ahorroMaxMensual != null) {
      const actual = filaPorClave(calc, calc.afpActual);
      if (calc.ahorroMaxMensual > 0 && menor && actual) {
        partes.push(
          `Frente a ${actual.nombre}, cambiar a ${menor.nombre} ahorra ${clp(calc.ahorroMaxMensual)} al mes (${clp(calc.ahorroMaxAnual)} al año) solo en comisión.`,
        );
      } else if (actual) {
        partes.push(`${actual.nombre} ya es la comisión más baja de la tabla. El ahorro por cambiar de AFP es $0.`);
      }
    } else {
      partes.push("Indique su AFP actual para ver el ahorro mensual y anual si se cambia.");
    }
  }
  partes.push(
    "El SIS es de cargo del empleador y no está en estos montos. Esta tabla no compara rentabilidad ni recomienda una AFP. Estimación de Haberes con la tabla de comisiones de octubre 2026 de la Superintendencia de Pensiones. No es un cálculo de la AFP, la Dirección del Trabajo ni de Previred. No constituye asesoría legal, previsional ni de inversión.",
  );
  el("outNota").textContent = partes.join(" ");
}

function recalc() {
  const input = leer();
  render(
    calcularCompararAfp({
      imponible: input.imponible,
      afp: input.afp,
      uf: input.uf,
    }),
    input,
  );
}

function usarUfDelDia() {
  const campo = el("ufMes");
  if (campo) campo.value = "";
  recalc();
}

function pintarPlaceholderUf() {
  const campo = el("ufMes");
  if (campo && ufCompararAfpValida(indicadores.uf)) campo.placeholder = num(indicadores.uf, 2);
}

wireNav();
llenarAfp();
const form = document.getElementById("formCompararAfp");
form?.addEventListener("submit", (ev) => ev.preventDefault());
form?.addEventListener("input", recalc);
form?.addEventListener("change", recalc);
el("btnUfDia")?.addEventListener("click", usarUfDelDia);
pintarPlaceholderUf();
recalc();
mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
  pintarPlaceholderUf();
  recalc();
});
