import { parseTrabajadoresCsv } from "./csv.js";
import { clp, formatRut, validarRut } from "./format.js";
import { tieneCorreoValido } from "./app-empresa-envio.js";
import { MSG_CARGA_PRO, puedeCargaMasiva } from "./plan.js";
import {
  deleteTrabajador,
  empresaActual,
  updateTrabajador,
  upsertTrabajadores,
} from "./storage.js";
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

function haberesDeTrabajador(t) {
  if (Array.isArray(t?.haberesExtra) && t.haberesExtra.length) return t.haberesExtra;
  if (t?.bonos) return [{ nombre: "Bonos", monto: t.bonos, imponible: true }];
  return [];
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
    el("emSueldo").value = t.sueldoBase || 0;
    el("emHoras").value = t.horasExtras || 0;
    el("emColacion").value = t.colacion || 0;
    el("emMov").value = t.movilizacion || 0;
    el("emIsapre").value = t.isaprePactado || 0;
    el("emJornada").value = t.jornada || 42;
    el("emGrat").checked = Boolean(t.gratificacionArt50);
    mountHaberes(el("emHaberes"), haberesDeTrabajador(t));
  }

  function readHaberesEditor(base) {
    return {
      ...base,
      sueldoBase: numVal("emSueldo") || base.sueldoBase,
      horasExtras: numVal("emHoras"),
      colacion: numVal("emColacion"),
      movilizacion: numVal("emMov"),
      isaprePactado: numVal("emIsapre"),
      jornada: numVal("emJornada") || 42,
      gratificacionArt50: Boolean(el("emGrat")?.checked),
      haberesExtra: readHaberes(el("emHaberes")),
      bonos: 0,
    };
  }

  function syncSelResumen() {
    const rows = selectedWorkers();
    const n = el("selResumen");
    if (!n) return;
    if (!rows.length) {
      n.textContent = "Ningún trabajador seleccionado.";
      fillHaberesEditor(null);
      return;
    }
    if (rows.length === 1) n.textContent = `Seleccionado: ${rows[0].nombre}.`;
    else n.textContent = `${rows.length} seleccionados. Vista previa del primero (${rows[0].nombre}); el resto se lista abajo.`;
    fillHaberesEditor(rows[0]);
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
    ctx.pickers.altaContrato?.setValue("indefinido");
    ctx.pickers.altaBanco?.setValue("001");
    ctx.pickers.altaTipoCta?.setValue("corriente");
    if (el("altaEmail")) el("altaEmail").value = "";
    if (el("altaNroCta")) el("altaNroCta").value = "";
    mountHaberes(el("altaHaberes"), []);
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
    el("altaHoras").value = t.horasExtras || 0;
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
    ctx.pickers.altaContrato?.setValue(t.contrato || "indefinido");
    ctx.pickers.altaBanco?.setValue(t.banco || "001");
    ctx.pickers.altaTipoCta?.setValue(t.tipoCuenta || "corriente");
    if (el("altaEmail")) el("altaEmail").value = t.email || "";
    if (el("altaNroCta")) el("altaNroCta").value = t.nroCuenta || "";
    mountHaberes(el("altaHaberes"), haberesDeTrabajador(t));
  }

  function payloadTrabajador(t) {
    return {
      nombre: t.nombre,
      rut: t.rut,
      cargo: t.cargo,
      sueldoBase: t.sueldoBase,
      afp: t.afp,
      salud: t.salud,
      isaprePactado: t.isaprePactado,
      contrato: t.contrato,
      horasExtras: t.horasExtras,
      haberesExtra: t.haberesExtra,
      colacion: t.colacion,
      movilizacion: t.movilizacion,
      gratificacionArt50: t.gratificacionArt50,
      jornada: t.jornada,
      email: t.email,
      banco: t.banco,
      tipoCuenta: t.tipoCuenta,
      nroCuenta: t.nroCuenta,
    };
  }

  mountHaberes(el("altaHaberes"), []);

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

  el("btnAltaHaber")?.addEventListener("click", () => addHaber(el("altaHaberes")));
  el("btnEmHaber")?.addEventListener("click", () => addHaber(el("emHaberes")));
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
      isaprePactado: numVal("altaIsapre"),
      contrato: ctx.pickers.altaContrato?.getValue() || "indefinido",
      horasExtras: numVal("altaHoras"),
      bonos: 0,
      haberesExtra: readHaberes(el("altaHaberes")),
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
    if (!rows[0]) return;
    ctx.emp = updateTrabajador(empresaActual(), rows[0].id, readHaberesEditor(rows[0]));
    ctx.refresh();
    ctx.showOk(el("okHaberes"), "Haberes guardados en este navegador.");
    toastOk("Haberes guardados");
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
    mountHaberes,
  };
}
