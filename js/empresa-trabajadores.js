import { parseNovedadesCsv, parseTrabajadoresCsv } from "./csv.js";
import { clp, formatRut, normalizeRut, validarRut } from "./format.js";
import { tieneCorreoValido } from "./app-empresa-envio.js";
import { diasDelPeriodo, inputDesdeFichaYNovedades, validarArt58 } from "./novedades.js";
import { MSG_CARGA_PRO, puedeCargaMasiva } from "./plan.js";
import {
  deleteTrabajador,
  empresaActual,
  getNovedades,
  setNovedades,
  updateTrabajador,
  upsertNovedadesPorRut,
  upsertTrabajadores,
} from "./storage.js";
import { calcularSueldo } from "./sueldo.js";
import { confirmDialog, el, numVal, showError, toastError, toastInfo, toastOk, val } from "./ui.js";

export const AFP_OPTS = [
  { value: "modelo", label: "Modelo" },
  { value: "uno", label: "Uno" },
  { value: "planvital", label: "PlanVital" },
  { value: "habitat", label: "Habitat" },
  { value: "capital", label: "Capital" },
  { value: "cuprum", label: "Cuprum" },
  { value: "provida", label: "Provida" },
];
export const SALUD_OPTS = [
  { value: "fonasa", label: "Fonasa" },
];
export const CONTRATO_OPTS = [
  { value: "indefinido", label: "Indefinido" },
  { value: "plazo_fijo", label: "Plazo fijo" },
];

export function installSaludOpts(LRE_SALUD) {
  SALUD_OPTS.length = 1;
  SALUD_OPTS.push(
    ...Object.entries(LRE_SALUD)
      .filter(([k]) => k !== "fonasa")
      .map(([value, s]) => ({ value, label: s.nombre })),
    { value: "isapre", label: "Isapre (sin especificar)" },
  );
}

function escAttr(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function haberRowHtml(h = {}) {
  const imp = h.imponible !== false;
  return `<div class="haber-row" data-haber>
    <div class="field" style="margin:0">
      <label>Nombre</label>
      <input data-h-nombre maxlength="80" placeholder="Ej. Bono de producción" value="${escAttr(h.nombre || "")}" />
    </div>
    <div class="field" style="margin:0">
      <label>Monto</label>
      <input data-h-monto inputmode="numeric" min="0" value="${Number(h.monto) || 0}" />
    </div>
    <div class="field" style="margin:0">
      <span class="lbl">Base imponible</span>
      <button type="button" class="btn btn-ghost" data-h-imp aria-pressed="${imp ? "true" : "false"}">${
        imp ? "Imponible" : "No imponible"
      }</button>
    </div>
    <button type="button" class="btn btn-ghost" data-h-del>Quitar</button>
  </div>`;
}

function mountHaberes(container, rows) {
  if (!container) return;
  const list = Array.isArray(rows) && rows.length ? rows : [];
  container.innerHTML = list.map((h) => haberRowHtml(h)).join("");
  if (!container.dataset.wired) {
    container.dataset.wired = "1";
    container.addEventListener("click", (ev) => {
      const del = ev.target.closest("[data-h-del]");
      if (del) {
        del.closest("[data-haber]")?.remove();
        return;
      }
      const tog = ev.target.closest("[data-h-imp]");
      if (!tog) return;
      const on = tog.getAttribute("aria-pressed") !== "true";
      tog.setAttribute("aria-pressed", on ? "true" : "false");
      tog.textContent = on ? "Imponible" : "No imponible";
    });
  }
}

function readHaberes(container) {
  if (!container) return [];
  return [...container.querySelectorAll("[data-haber]")]
    .map((row) => ({
      nombre: String(row.querySelector("[data-h-nombre]")?.value || "").trim(),
      monto: Number(String(row.querySelector("[data-h-monto]")?.value || "").replace(/\./g, "").replace(",", ".")) || 0,
      imponible: row.querySelector("[data-h-imp]")?.getAttribute("aria-pressed") !== "false",
    }))
    .filter((h) => h.nombre || h.monto);
}

function addHaber(container) {
  if (!container) return;
  container.insertAdjacentHTML("beforeend", haberRowHtml({ nombre: "", monto: 0, imponible: true }));
}

function descRowHtml(d = {}) {
  const tipo = d.tipo || "convencional";
  const opts = [
    ["anticipo", "Anticipo"],
    ["convencional", "Convencional (préstamo)"],
    ["legal", "Legal (sindical / judicial)"],
    ["vivienda_educacion", "Vivienda/educación"],
  ]
    .map(
      ([v, lab]) =>
        `<option value="${v}" ${tipo === v ? "selected" : ""}>${lab}</option>`,
    )
    .join("");
  return `<div class="haber-row" data-desc>
    <div class="field" style="margin:0">
      <label>Nombre</label>
      <input data-d-nombre maxlength="80" placeholder="Ej. Cuota préstamo" value="${escAttr(d.nombre || "")}" />
    </div>
    <div class="field" style="margin:0">
      <label>Monto</label>
      <input data-d-monto inputmode="numeric" min="0" value="${Number(d.monto) || 0}" />
    </div>
    <div class="field" style="margin:0">
      <label>Tipo</label>
      <select data-d-tipo>${opts}</select>
    </div>
    <button type="button" class="btn btn-ghost" data-d-del>Quitar</button>
  </div>`;
}

function mountDescuentos(container, rows) {
  if (!container) return;
  const list = Array.isArray(rows) && rows.length ? rows : [];
  container.innerHTML = list.map((d) => descRowHtml(d)).join("");
  if (!container.dataset.wired) {
    container.dataset.wired = "1";
    container.addEventListener("click", (ev) => {
      const del = ev.target.closest("[data-d-del]");
      if (del) del.closest("[data-desc]")?.remove();
    });
  }
}

function readDescuentos(container) {
  if (!container) return [];
  return [...container.querySelectorAll("[data-desc]")]
    .map((row) => ({
      nombre: String(row.querySelector("[data-d-nombre]")?.value || "").trim(),
      monto:
        Number(
          String(row.querySelector("[data-d-monto]")?.value || "")
            .replace(/\./g, "")
            .replace(",", "."),
        ) || 0,
      tipo: String(row.querySelector("[data-d-tipo]")?.value || "convencional"),
    }))
    .filter((d) => d.nombre || d.monto);
}

function addDescuento(container) {
  if (!container) return;
  container.insertAdjacentHTML(
    "beforeend",
    descRowHtml({ nombre: "", monto: 0, tipo: "convencional" }),
  );
}

function haberesDeTrabajador(t) {
  if (Array.isArray(t?.haberesExtra) && t.haberesExtra.length) return t.haberesExtra;
  if (t?.bonos) return [{ nombre: "Bonos", monto: t.bonos, imponible: true }];
  return [];
}

function periodoSeleccionado(ctx) {
  return ctx.pickers.periodo?.getValue() || "";
}

function periodoAnterior(periodo) {
  const m = String(periodo || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return "";
  let y = Number(m[1]);
  let mo = Number(m[2]) - 1;
  if (mo < 1) {
    mo = 12;
    y -= 1;
  }
  return `${y}-${String(mo).padStart(2, "0")}`;
}

export function bindEmpresaTrabajadores(ctx) {
  function workerOptions() {
    return (ctx.emp?.trabajadores || []).map((t) => ({
      value: t.id,
      label: `${t.nombre} · ${formatRut(t.rut || "—")}`,
    }));
  }

  function selectedWorkers() {
    const ids = ctx.pickers.trabajadores?.getValue() || [];
    const list = Array.isArray(ids) ? ids : ids ? [ids] : [];
    return list.map((id) => (ctx.emp?.trabajadores || []).find((t) => t.id === id)).filter(Boolean);
  }

  function fillHaberesEditor(t) {
    const box = el("panelHaberesTrabajador");
    if (!box) return;
    if (!t) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    ctx.emp = empresaActual();
    const periodo = periodoSeleccionado(ctx);
    const nov = getNovedades(ctx.emp, periodo, t.id);
    el("emSueldo").value = t.sueldoBase || 0;
    el("emHoras").value = nov.horasExtras || 0;
    el("emColacion").value = t.colacion || 0;
    el("emMov").value = t.movilizacion || 0;
    el("emIsapre").value = t.isaprePactado || 0;
    el("emJornada").value = t.jornada || 42;
    el("emGrat").checked = Boolean(t.gratificacionArt50);
    if (el("novAusencia")) el("novAusencia").value = nov.diasAusencia || 0;
    if (el("novLicencia")) el("novLicencia").value = nov.diasLicencia || 0;
    if (el("novVacaciones")) el("novVacaciones").value = nov.diasVacaciones || 0;
    if (el("novPagaCarencia")) el("novPagaCarencia").checked = Boolean(nov.pagaCarencia);
    if (el("novColacionFija")) el("novColacionFija").checked = Boolean(nov.colacionFija);
    if (el("novMovFija")) el("novMovFija").checked = Boolean(nov.movilizacionFija);
    if (el("novDiasManual")) {
      el("novDiasManual").value =
        nov.diasTrabajadosManual == null ? "" : String(nov.diasTrabajadosManual);
    }
    if (el("novNota")) el("novNota").value = nov.nota || "";
    mountHaberes(el("emHaberes"), nov.haberesExtra?.length ? nov.haberesExtra : []);
    mountDescuentos(el("emDescuentos"), nov.descuentos || []);
    actualizarResumenDias(t);
    actualizarAvisoArt58(t);
  }

  function readNovedadesEditor() {
    const manualRaw = String(el("novDiasManual")?.value || "").trim();
    return {
      diasAusencia: numVal("novAusencia"),
      diasLicencia: numVal("novLicencia"),
      diasVacaciones: numVal("novVacaciones"),
      pagaCarencia: Boolean(el("novPagaCarencia")?.checked),
      horasExtras: numVal("emHoras"),
      haberesExtra: readHaberes(el("emHaberes")),
      descuentos: readDescuentos(el("emDescuentos")),
      diasTrabajadosManual: manualRaw === "" ? null : Number(manualRaw),
      colacionFija: Boolean(el("novColacionFija")?.checked),
      movilizacionFija: Boolean(el("novMovFija")?.checked),
      nota: String(el("novNota")?.value || "").trim().slice(0, 200),
    };
  }

  function readHaberesEditor(base) {
    const nov = readNovedadesEditor();
    const periodo = periodoSeleccionado(ctx);
    const merged = inputDesdeFichaYNovedades(
      {
        ...base,
        sueldoBase: numVal("emSueldo") || base.sueldoBase,
        colacion: numVal("emColacion"),
        movilizacion: numVal("emMov"),
        isaprePactado: numVal("emIsapre"),
        jornada: numVal("emJornada") || 42,
        gratificacionArt50: Boolean(el("emGrat")?.checked),
        bonos: 0,
      },
      nov,
      { periodo },
    );
    return merged;
  }

  function actualizarResumenDias(t) {
    const resumen = el("novDiasResumen");
    if (!resumen || !t) return;
    const nov = readNovedadesEditor();
    const periodo = periodoSeleccionado(ctx);
    const d = diasDelPeriodo({
      periodo,
      fechaIngreso: t.fechaIngreso,
      fechaTermino: t.fechaTermino,
      ...nov,
    });
    let txt = `Días trabajados: ${d.diasTrabajados} de ${d.diasBase}`;
    if (d.diasLicencia) txt += ` · Licencia: ${d.diasLicencia}`;
    if (d.diasVacaciones) txt += ` · Feriado: ${d.diasVacaciones}`;
    if (d.overrideActivo) txt += " · override manual";
    if (d.avisoTope) txt += " · ausencias acotadas al mes";
    resumen.textContent = txt;
  }

  function actualizarAvisoArt58(t) {
    const aviso = el("avisoArt58");
    const wrap = el("wrapArt58Confirm");
    if (!aviso || !t) return;
    const input = readHaberesEditor(t);
    let calc;
    try {
      calc = calcularSueldo(input, ctx.indicadores || {});
    } catch {
      aviso.hidden = true;
      if (wrap) wrap.hidden = true;
      return;
    }
    const v = validarArt58({
      totalHaberes: calc.totalHaberes,
      descuentos: input.descuentos || [],
    });
    if (v.supera15) {
      aviso.hidden = false;
      aviso.textContent =
        `Art. 58 inciso 2: descuentos convencionales ${clp(v.convencionales)} superan el 15 % del bruto ` +
        `(${clp(v.totalHaberes)} → tope ${clp(v.tope15)}; exceso ${clp(v.exceso15)}). ${v.cita}. ` +
        `No se bloquea, pero debe confirmar antes de emitir.`;
      if (wrap) wrap.hidden = false;
    } else {
      aviso.hidden = true;
      if (wrap) wrap.hidden = true;
      if (el("novArt58Confirm")) el("novArt58Confirm").checked = false;
    }
  }

  function syncSelResumen() {
    const rows = selectedWorkers();
    const n = el("selResumen");
    if (!n) return;
    if (!rows.length) {
      n.textContent = "Ningún trabajador seleccionado.";
      fillHaberesEditor(null);
      ctx.syncFinResumen?.();
      return;
    }
    if (rows.length === 1) n.textContent = `Seleccionado: ${rows[0].nombre}.`;
    else n.textContent = `${rows.length} seleccionados. Vista previa del primero (${rows[0].nombre}); el resto se lista abajo.`;
    fillHaberesEditor(rows[0]);
    ctx.syncFinResumen?.();
  }

  function workerActionsHtml(t) {
    return `<div class="worker-actions">
    <button type="button" class="btn btn-ghost btn-sm" data-doc="${escAttr(t.id)}">Documentos</button>
    <button type="button" class="btn btn-ghost btn-sm" data-edit="${escAttr(t.id)}">Editar</button>
    <button type="button" class="btn btn-danger-ghost btn-sm" data-del="${escAttr(t.id)}">Eliminar</button>
  </div>`;
  }

  function contratoLabel(t) {
    return t.contrato === "plazo_fijo" ? "Plazo fijo" : "Indefinido";
  }

  /** Tabla en escritorio, tarjetas en móvil: la misma fuente de datos, dos vistas. */
  function renderTrabajadores() {
    const list = el("tablaTrabajadores");
    const rows = ctx.emp?.trabajadores || [];
    ctx.pickers.trabajadores?.setOptions(workerOptions());
    const total = el("nominaTotal");
    if (total) {
      total.textContent = rows.length
        ? `${rows.length} ${rows.length === 1 ? "trabajador" : "trabajadores"}`
        : "";
    }
    ctx.avisoConsorcioRipley?.();
    if (!rows.length) {
      list.innerHTML = `<p class="empty">Aún no hay trabajadores en la nómina de este mes.<br />Agregue uno con el formulario de abajo o cargue un CSV.</p>`;
      syncSelResumen();
      return;
    }
    const table = `
    <div class="table-wrap only-desktop">
      <table class="table">
        <thead>
          <tr>
            <th>Nombre</th><th>RUT</th><th>Cargo</th><th>Base</th><th>AFP</th><th>Contrato</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (t) => `<tr class="${tieneCorreoValido(t) ? "" : "row-sin-correo"}">
                <td>${escAttr(t.nombre)}${tieneCorreoValido(t) ? "" : ' <span class="badge-warn" title="Sin correo válido">sin correo</span>'}</td>
                <td>${formatRut(t.rut)}</td>
                <td>${escAttr(t.cargo || "—")}</td>
                <td>${clp(t.sueldoBase)}</td>
                <td>${escAttr(t.afp)}</td>
                <td>${contratoLabel(t)}</td>
                <td>${workerActionsHtml(t)}</td>
              </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
    const cards = `
    <div class="data-list only-mobile">
      ${rows
        .map(
          (t) => `<article class="data-item${tieneCorreoValido(t) ? "" : " row-sin-correo"}">
            <div class="data-item-head">
              <p class="data-item-title">${escAttr(t.nombre)}${tieneCorreoValido(t) ? "" : ' <span class="badge-warn">sin correo</span>'}</p>
              <p class="data-item-sub">${clp(t.sueldoBase)}</p>
            </div>
            <dl class="data-item-grid">
              <div><dt>RUT</dt><dd>${formatRut(t.rut) || "—"}</dd></div>
              <div><dt>Cargo</dt><dd>${escAttr(t.cargo || "—")}</dd></div>
              <div><dt>AFP</dt><dd>${escAttr(t.afp)}</dd></div>
              <div><dt>Contrato</dt><dd>${contratoLabel(t)}</dd></div>
            </dl>
            ${workerActionsHtml(t)}
          </article>`,
        )
        .join("")}
    </div>`;
    list.innerHTML = table + cards;
    syncSelResumen();
  }

  function resetAltaForm() {
    el("altaId").value = "";
    el("altaTitulo").textContent = "Agregar trabajador";
    el("btnAltaGuardar").textContent = "Agregar";
    el("btnAltaCancelar").hidden = true;
    el("formAlta")?.reset();
    if (el("altaJornada")) el("altaJornada").value = "42";
    if (el("altaSueldo")) el("altaSueldo").value = "1000000";
    ctx.pickers.altaAfp?.setValue("modelo");
    ctx.pickers.altaSalud?.setValue("fonasa");
    ctx.altaIngresoTocada = false;
    ctx.dateAltaIngreso?.setValue(ctx.hoyIso());
    ctx.altaTerminoTocada = false;
    ctx.dateAltaTermino?.setValue("");
    ctx.pickers.altaContrato?.setValue("indefinido");
    ctx.pickers.altaBanco?.setValue("001");
    ctx.pickers.altaTipoCta?.setValue("corriente");
    if (el("altaEmail")) el("altaEmail").value = "";
    if (el("altaNroCta")) el("altaNroCta").value = "";
  }

  function fillAlta(t) {
    el("altaId").value = t.id;
    el("altaTitulo").textContent = `Editar ${t.nombre}`;
    el("btnAltaGuardar").textContent = "Guardar cambios";
    el("btnAltaCancelar").hidden = false;
    el("altaNombre").value = t.nombre || "";
    el("altaRut").value = t.rut || "";
    el("altaCargo").value = t.cargo || "";
    el("altaSueldo").value = t.sueldoBase || 0;
    el("altaIsapre").value = t.isaprePactado || 0;
    el("altaJornada").value = t.jornada || 42;
    el("altaColacion").value = t.colacion || 0;
    el("altaMov").value = t.movilizacion || 0;
    el("altaGrat").checked = Boolean(t.gratificacionArt50);
    ctx.pickers.altaAfp?.setValue(t.afp || "modelo");
    ctx.pickers.altaSalud?.setValue(t.salud || "fonasa");
    if (t.fechaIngreso) {
      ctx.altaIngresoTocada = true;
      ctx.dateAltaIngreso?.setValue(t.fechaIngreso);
    } else {
      ctx.altaIngresoTocada = false;
      ctx.dateAltaIngreso?.setValue(ctx.hoyIso());
    }
    if (t.fechaTermino) {
      ctx.altaTerminoTocada = true;
      ctx.dateAltaTermino?.setValue(t.fechaTermino);
    } else {
      ctx.altaTerminoTocada = false;
      ctx.dateAltaTermino?.setValue("");
    }
    ctx.pickers.altaContrato?.setValue(t.contrato || "indefinido");
    ctx.pickers.altaBanco?.setValue(t.banco || "001");
    ctx.pickers.altaTipoCta?.setValue(t.tipoCuenta || "corriente");
    if (el("altaEmail")) el("altaEmail").value = t.email || "";
    if (el("altaNroCta")) el("altaNroCta").value = t.nroCuenta || "";
  }

  function payloadTrabajador(t) {
    const periodo = periodoSeleccionado(ctx);
    const nov = t.dias
      ? {
          diasAusencia: t.diasAusencia ?? t.dias.diasAusencia,
          diasLicencia: t.diasLicencia ?? t.dias.diasLicencia,
          diasVacaciones: t.diasVacaciones ?? t.dias.diasVacaciones,
          pagaCarencia: t.pagaCarencia,
          horasExtras: t.horasExtras,
          haberesExtra: t.haberesExtra,
          descuentos: t.descuentos,
          diasTrabajadosManual: t.diasTrabajadosManual,
          colacionFija: t.colacionFija,
          movilizacionFija: t.movilizacionFija,
        }
      : getNovedades(empresaActual(), periodo, t.id);
    return {
      nombre: t.nombre,
      rut: t.rut,
      cargo: t.cargo,
      sueldoBase: t.sueldoBase,
      afp: t.afp,
      salud: t.salud,
      isaprePactado: t.isaprePactado,
      contrato: t.contrato,
      fechaIngreso: t.fechaIngreso,
      fechaTermino: t.fechaTermino,
      horasExtras: t.horasExtras ?? nov.horasExtras,
      haberesExtra: t.haberesExtra ?? nov.haberesExtra,
      descuentos: t.descuentos ?? nov.descuentos,
      colacion: t.colacion,
      movilizacion: t.movilizacion,
      colacionFija: t.colacionFija ?? nov.colacionFija,
      movilizacionFija: t.movilizacionFija ?? nov.movilizacionFija,
      gratificacionArt50: t.gratificacionArt50,
      jornada: t.jornada,
      email: t.email,
      banco: t.banco,
      tipoCuenta: t.tipoCuenta,
      nroCuenta: t.nroCuenta,
      periodo,
      novedades: nov,
      diasAusencia: t.diasAusencia ?? nov.diasAusencia,
      diasLicencia: t.diasLicencia ?? nov.diasLicencia,
      diasVacaciones: t.diasVacaciones ?? nov.diasVacaciones,
      pagaCarencia: t.pagaCarencia ?? nov.pagaCarencia,
      diasTrabajadosManual: t.diasTrabajadosManual ?? nov.diasTrabajadosManual,
    };
  }

  el("csvFile")?.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    showError(el("errCsv"), "");
    if (!file) return;
    ctx.emp = empresaActual();
    const gate = puedeCargaMasiva(ctx.emp);
    if (!gate.ok) {
      showError(el("errCsv"), gate.message || MSG_CARGA_PRO);
      ev.target.value = "";
      return;
    }
    try {
      let rows;
      const name = String(file.name || "").toLowerCase();
      if (name.endsWith(".xlsx") || file.type.includes("spreadsheet")) {
        const { readXlsxFirstSheet, rowsToCsv } = await import("./xlsx.js");
        const buf = await file.arrayBuffer();
        const table = await readXlsxFirstSheet(buf);
        rows = parseTrabajadoresCsv(rowsToCsv(table));
      } else {
        rows = parseTrabajadoresCsv(await file.text());
      }
      if (!rows.length) throw new Error("El archivo no tiene filas válidas");
      ctx.emp = upsertTrabajadores(empresaActual(), rows);
      ctx.refresh();
      toastOk(
        `${rows.length} ${rows.length === 1 ? "fila cargada" : "filas cargadas"}`,
        "Se actualizó por RUT: no se duplican trabajadores.",
      );
    } catch (err) {
      showError(el("errCsv"), err.message);
      toastError("No se pudo leer el archivo", err.message);
    }
    ev.target.value = "";
  });

  el("btnEmHaber")?.addEventListener("click", () => addHaber(el("emHaberes")));
  el("btnEmDesc")?.addEventListener("click", () => addDescuento(el("emDescuentos")));
  el("btnAltaCancelar")?.addEventListener("click", resetAltaForm);

  el("formAlta")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    showError(el("errAlta"), "");
    const nombre = val("altaNombre");
    const rut = val("altaRut");
    if (!nombre) return showError(el("errAlta"), "Indique el nombre");
    if (rut && !validarRut(rut)) return showError(el("errAlta"), "RUT inválido");
    const editing = val("altaId");
    const row = {
      id: editing || `t_${Date.now()}`,
      nombre,
      rut,
      cargo: val("altaCargo"),
      sueldoBase: numVal("altaSueldo"),
      afp: ctx.pickers.altaAfp?.getValue() || "modelo",
      salud: ctx.pickers.altaSalud?.getValue() || "fonasa",
      fechaIngreso: ctx.altaIngresoTocada ? ctx.dateAltaIngreso?.getValue() || "" : "",
      fechaTermino: ctx.altaTerminoTocada ? ctx.dateAltaTermino?.getValue() || "" : "",
      isaprePactado: numVal("altaIsapre"),
      contrato: ctx.pickers.altaContrato?.getValue() || "indefinido",
      horasExtras: 0,
      bonos: 0,
      haberesExtra: [],
      colacion: numVal("altaColacion"),
      movilizacion: numVal("altaMov"),
      gratificacionArt50: el("altaGrat")?.checked,
      jornada: numVal("altaJornada") || 42,
      email: val("altaEmail"),
      banco: ctx.pickers.altaBanco?.getValue() || "",
      tipoCuenta: ctx.pickers.altaTipoCta?.getValue() || "corriente",
      nroCuenta: val("altaNroCta"),
    };
    if (editing) {
      ctx.emp = updateTrabajador(empresaActual(), editing, row);
      toastOk("Trabajador actualizado", nombre);
    } else {
      ctx.emp = upsertTrabajadores(empresaActual(), [row]);
      toastOk("Trabajador agregado", nombre);
    }
    resetAltaForm();
    ctx.refresh();
  });

  el("tablaTrabajadores")?.addEventListener("click", async (ev) => {
    const edit = ev.target.closest("[data-edit]");
    const del = ev.target.closest("[data-del]");
    const doc = ev.target.closest("[data-doc]");
    if (edit) {
      const t = (ctx.emp?.trabajadores || []).find((w) => w.id === edit.dataset.edit);
      if (!t) return;
      fillAlta(t);
      el("formAlta").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (del) {
      const t = (ctx.emp?.trabajadores || []).find((w) => w.id === del.dataset.del);
      if (!t) return;
      const ok = await confirmDialog({
        title: `Eliminar a ${t.nombre}`,
        text: `Se quita ${formatRut(t.rut || "sin RUT")} de la nómina de este mes en este navegador. No se puede deshacer.`,
        okLabel: "Eliminar",
      });
      if (!ok) return;
      ctx.emp = deleteTrabajador(empresaActual(), t.id);
      if (val("altaId") === t.id) resetAltaForm();
      ctx.refresh();
      toastInfo("Trabajador eliminado", t.nombre);
      return;
    }
    if (doc) {
      ctx.pickers.trabajadores?.setValue([doc.dataset.doc]);
      ctx.setTab("documentos", { scroll: true });
      syncSelResumen();
    }
  });

  el("btnGuardarHaberes")?.addEventListener("click", () => {
    const rows = selectedWorkers();
    ctx.showOk(el("okHaberes"), "");
    showError(el("errNov"), "");
    if (!rows[0]) return;
    const periodo = periodoSeleccionado(ctx);
    if (!periodo) return showError(el("errNov"), "Elija el período de remuneración");
    const nov = readNovedadesEditor();
    if (nov.diasTrabajadosManual != null && !nov.nota) {
      return showError(el("errNov"), "Indique la razón del override de días en la nota");
    }
    ctx.emp = updateTrabajador(empresaActual(), rows[0].id, {
      sueldoBase: numVal("emSueldo") || rows[0].sueldoBase,
      colacion: numVal("emColacion"),
      movilizacion: numVal("emMov"),
      isaprePactado: numVal("emIsapre"),
      jornada: numVal("emJornada") || 42,
      gratificacionArt50: Boolean(el("emGrat")?.checked),
      horasExtras: 0,
      haberesExtra: [],
      bonos: 0,
    });
    ctx.emp = setNovedades(empresaActual(), periodo, rows[0].id, nov);
    ctx.refresh();
    fillHaberesEditor(selectedWorkers()[0] || rows[0]);
    ctx.showOk(el("okHaberes"), "Novedades guardadas en este navegador.");
    toastOk("Novedades guardadas");
  });

  el("btnCopiarNovedades")?.addEventListener("click", async () => {
    const rows = selectedWorkers();
    if (!rows[0]) return;
    const periodo = periodoSeleccionado(ctx);
    const prev = periodoAnterior(periodo);
    if (!prev) return toastError("Sin período", "Elija un período válido");
    const prevNov = getNovedades(empresaActual(), prev, rows[0].id);
    const ok = await confirmDialog({
      title: "Copiar novedades",
      text: `¿Copiar las novedades de ${prev} a ${periodo} para ${rows[0].nombre}?`,
      okLabel: "Copiar",
    });
    if (!ok) return;
    ctx.emp = setNovedades(empresaActual(), periodo, rows[0].id, prevNov);
    fillHaberesEditor(rows[0]);
    toastOk("Novedades copiadas", `Desde ${prev}`);
  });

  el("novCsvFile")?.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    showError(el("errNov"), "");
    if (!file) return;
    ctx.emp = empresaActual();
    const gate = puedeCargaMasiva(ctx.emp);
    if (!gate.ok) {
      showError(el("errNov"), gate.message || MSG_CARGA_PRO);
      ev.target.value = "";
      return;
    }
    const periodo = periodoSeleccionado(ctx);
    if (!periodo) {
      showError(el("errNov"), "Elija el período de remuneración");
      ev.target.value = "";
      return;
    }
    try {
      const ruts = (ctx.emp.trabajadores || []).map((t) => normalizeRut(t.rut) || t.rut);
      const parsed = parseNovedadesCsv(await file.text(), { rutsConocidos: ruts });
      if (parsed.error) throw new Error(parsed.error);
      if (!parsed.rows.length && !parsed.rechazados.length) {
        throw new Error("El archivo no tiene filas válidas");
      }
      if (parsed.rows.length) {
        ctx.emp = upsertNovedadesPorRut(empresaActual(), periodo, parsed.rows);
      }
      ctx.refresh();
      syncSelResumen();
      const msg = `${parsed.rows.length} novedad${parsed.rows.length === 1 ? "" : "es"} cargada${parsed.rows.length === 1 ? "" : "s"}`;
      if (parsed.rechazados.length) {
        const rutsTxt = parsed.rechazados.map((r) => r.rut).join(", ");
        toastInfo(msg, `Rechazados (no están en ficha): ${rutsTxt}`);
        showError(el("errNov"), `RUT no encontrados: ${rutsTxt}`);
      } else {
        toastOk(msg);
      }
    } catch (err) {
      showError(el("errNov"), err.message);
      toastError("No se pudo leer novedades", err.message);
    }
    ev.target.value = "";
  });

  for (const id of [
    "novAusencia",
    "novLicencia",
    "novVacaciones",
    "novDiasManual",
    "novPagaCarencia",
    "novColacionFija",
    "novMovFija",
    "emHoras",
    "emColacion",
    "emMov",
    "emSueldo",
  ]) {
    el(id)?.addEventListener("input", () => {
      const t = selectedWorkers()[0];
      if (!t) return;
      actualizarResumenDias(t);
      actualizarAvisoArt58(t);
    });
    el(id)?.addEventListener("change", () => {
      const t = selectedWorkers()[0];
      if (!t) return;
      actualizarResumenDias(t);
      actualizarAvisoArt58(t);
    });
  }
  el("emDescuentos")?.addEventListener("input", () => {
    const t = selectedWorkers()[0];
    if (t) actualizarAvisoArt58(t);
  });
  el("emDescuentos")?.addEventListener("change", () => {
    const t = selectedWorkers()[0];
    if (t) actualizarAvisoArt58(t);
  });

  return {
    workerOptions,
    selectedWorkers,
    fillHaberesEditor,
    readHaberesEditor,
    syncSelResumen,
    renderTrabajadores,
    resetAltaForm,
    fillAlta,
    payloadTrabajador,
    art58Confirmado: () => Boolean(el("novArt58Confirm")?.checked),
    actualizarAvisoArt58,
  };
}
