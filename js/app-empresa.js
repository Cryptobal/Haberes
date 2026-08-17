import {
  apiDownloadPdf,
  apiGet,
  apiPost,
  apiPutBytes,
  authErrorMessage,
  isNoBackend,
  triggerDownload,
} from "./api.js";
import { causalPorId, opcionesCausalPicker } from "./causales.js";
import { parseTrabajadoresCsv } from "./csv.js";
import { calcularFiniquitoCompleto } from "./finiquito.js";
import { clp, formatRut, validarRut } from "./format.js";
import { getIndicadores } from "./indicadores.js";
import { BANCOS_CL, TIPO_CUENTA_OPTS, glosaSueldo, xlsxPagoEjemplo, xlsxPagoMasivo } from "./pago.js";
import { createPicker } from "./picker.js";
import {
  MSG_CARGA_PRO,
  MSG_LIMITE,
  MSG_PAGO_PRO,
  MSG_UNO_A_UNO,
  aplicarPlanServidor,
  puedeCargaMasiva,
  puedeEmitir,
  puedePagoMasivo,
  registrarMovimientosLocal,
  registrarMovimientosRemoto,
  textoCupo,
  workerKey,
} from "./plan.js";
import { cartaFiniquitoHtml, imprimirIframe, liquidacionHtml, mostrarVistaPrevia } from "./print.js";
import {
  borrarCuentaLocal,
  clearSession,
  cuentaLocalPorRut,
  deleteTrabajador,
  empresaActual,
  ensureLocalEmpresa,
  entrarEmpresa,
  guardarEmpresa,
  MIN_CLAVE,
  registrarEmpresa,
  updateTrabajador,
  upsertTrabajadores,
} from "./storage.js";
import { calcularSueldo } from "./sueldo.js";
import {
  confirmDialog,
  createDateFields,
  diasDelMesHasta,
  el,
  mountIndicadores,
  numVal,
  periodoItems,
  periodoLabel,
  showError,
  val,
  wireNav,
} from "./ui.js";

const AFP_OPTS = [
  { value: "modelo", label: "Modelo" },
  { value: "uno", label: "Uno" },
  { value: "planvital", label: "PlanVital" },
  { value: "habitat", label: "Habitat" },
  { value: "capital", label: "Capital" },
  { value: "cuprum", label: "Cuprum" },
  { value: "provida", label: "Provida" },
];
const SALUD_OPTS = [
  { value: "fonasa", label: "Fonasa" },
  { value: "isapre", label: "Isapre" },
];
const CONTRATO_OPTS = [
  { value: "indefinido", label: "Indefinido" },
  { value: "plazo_fijo", label: "Plazo fijo" },
];

let indicadores = { uf: 40854.01, utm: 71649 };
let emp = null;
let logoDataUrl = "";
let firmaDataUrl = "";
let remoteOk = false;
let pickers = {};
let dateIngreso = null;
let dateTermino = null;

function panel(logged) {
  el("auth").hidden = logged;
  el("app").hidden = !logged;
}

function showOk(node, msg) {
  if (!node) return;
  node.hidden = !msg;
  node.textContent = msg || "";
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

function setTab(name) {
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.setAttribute("aria-selected", btn.dataset.tab === name ? "true" : "false");
  });
  document.querySelectorAll("[data-tab-panel]").forEach((panelEl) => {
    panelEl.hidden = panelEl.dataset.tabPanel !== name;
  });
}

function showAsset(img, empty, src) {
  if (!img) return;
  if (src) {
    img.src = src;
    img.hidden = false;
    if (empty) empty.hidden = true;
  } else {
    img.removeAttribute("src");
    img.hidden = true;
    if (empty) empty.hidden = false;
  }
}

async function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => resolve("");
    r.readAsDataURL(blob);
  });
}

async function loadAsset(path, flag, assign) {
  if (!remoteOk || !emp?.[flag]) {
    assign("");
    return;
  }
  try {
    const res = await fetch(path, { credentials: "same-origin" });
    if (!res.ok) {
      assign("");
      return;
    }
    assign(await blobToDataUrl(await res.blob()));
  } catch {
    assign("");
  }
}

async function loadLogo() {
  await loadAsset("/api/logo", "hasLogo", (src) => {
    logoDataUrl = src;
    showAsset(el("logoPreview"), el("logoVacio"), src);
  });
}

async function loadFirma() {
  await loadAsset("/api/firma", "hasFirma", (src) => {
    firmaDataUrl = src;
    showAsset(el("firmaPreview"), el("firmaVacia"), src);
  });
}

function fillPerfil() {
  if (!emp) return;
  if (el("perfilRazon")) el("perfilRazon").value = emp.razonSocial || "";
  if (el("perfilRut")) el("perfilRut").value = formatRut(emp.rut || "");
  if (el("perfilGiro")) el("perfilGiro").value = emp.giro || "";
  if (el("perfilDireccion")) el("perfilDireccion").value = emp.direccion || "";
}

function workerOptions() {
  return (emp?.trabajadores || []).map((t) => ({
    value: t.id,
    label: `${t.nombre} · ${formatRut(t.rut || "—")}`,
  }));
}

function selectedWorkers() {
  const ids = pickers.trabajadores?.getValue() || [];
  const list = Array.isArray(ids) ? ids : ids ? [ids] : [];
  return list.map((id) => (emp?.trabajadores || []).find((t) => t.id === id)).filter(Boolean);
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

function renderTrabajadores() {
  const list = el("tablaTrabajadores");
  const rows = emp?.trabajadores || [];
  pickers.trabajadores?.setOptions(workerOptions());
  if (!rows.length) {
    list.innerHTML = `<p class="empty">Aún no hay trabajadores. Cargue un CSV o agregue uno.</p>`;
    syncSelResumen();
    return;
  }
  list.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Nombre</th><th>RUT</th><th>Cargo</th><th>Base</th><th>AFP</th><th>Contrato</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (t) => `<tr>
              <td>${escAttr(t.nombre)}</td>
              <td>${formatRut(t.rut)}</td>
              <td>${escAttr(t.cargo || "—")}</td>
              <td>${clp(t.sueldoBase)}</td>
              <td>${escAttr(t.afp)}</td>
              <td>${t.contrato === "plazo_fijo" ? "Plazo fijo" : "Indefinido"}</td>
              <td>
                <div class="worker-actions">
                  <button type="button" class="btn btn-ghost" data-edit="${escAttr(t.id)}">Editar</button>
                  <button type="button" class="btn btn-ghost" data-del="${escAttr(t.id)}">Eliminar</button>
                  <button type="button" class="btn btn-ghost" data-doc="${escAttr(t.id)}">Documentos</button>
                </div>
              </td>
            </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
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
  pickers.altaAfp?.setValue("modelo");
  pickers.altaSalud?.setValue("fonasa");
  pickers.altaContrato?.setValue("indefinido");
  pickers.altaBanco?.setValue("001");
  pickers.altaTipoCta?.setValue("corriente");
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
  pickers.altaAfp?.setValue(t.afp || "modelo");
  pickers.altaSalud?.setValue(t.salud || "fonasa");
  pickers.altaContrato?.setValue(t.contrato || "indefinido");
  pickers.altaBanco?.setValue(t.banco || "001");
  pickers.altaTipoCta?.setValue(t.tipoCuenta || "corriente");
  if (el("altaEmail")) el("altaEmail").value = t.email || "";
  if (el("altaNroCta")) el("altaNroCta").value = t.nroCuenta || "";
  mountHaberes(el("altaHaberes"), haberesDeTrabajador(t));
}

function syncCausalNota() {
  const c = causalPorId(pickers.causal?.getValue());
  const nota = el("finCausalNota");
  const wrap = el("wrapAviso");
  if (!nota || !c) return;
  nota.textContent = c.aplicaIas
    ? "Esta causal puede incluir IAS (si el contrato lleva un año o más) e indemnización sustitutiva de aviso si no hubo aviso de 30 días. Tope 11 años y 90 UF."
    : "Esta causal no da derecho a IAS ni a indemnización sustitutiva de aviso. Sí se estiman remuneración del mes, gratificación, feriado y otros haberes.";
  if (wrap) wrap.hidden = !c.aplicaAviso;
}

function empresaParaDoc() {
  return {
    ...emp,
    giro: val("perfilGiro") || emp?.giro || "",
    direccion: val("perfilDireccion") || emp?.direccion || "",
    razonSocial: val("perfilRazon") || emp?.razonSocial || "",
  };
}

function abrirPreview(titulo, html, others) {
  el("panelPreview").hidden = false;
  el("docPreviewTitulo").textContent = titulo;
  const extra = el("previewOtros");
  if (others?.length) {
    extra.hidden = false;
    extra.textContent = `También se emitirá para: ${others.map((t) => t.nombre).join(", ")}.`;
  } else {
    extra.hidden = true;
    extra.textContent = "";
  }
  mostrarVistaPrevia(el("docPreviewFrame"), html);
  el("panelPreview").scrollIntoView({ behavior: "smooth", block: "start" });
}

function workersForEmit() {
  const rows = selectedWorkers();
  if (!rows.length) return [];
  const first = readHaberesEditor(rows[0]);
  return [first, ...rows.slice(1)];
}

async function consumirMovimientos(tipo, rows, errId) {
  emp = empresaActual();
  const keys = rows.map(workerKey);
  const gate = puedeEmitir(emp, { tipo, keys });
  if (!gate.ok) {
    showError(el(errId), gate.message || MSG_LIMITE);
    return false;
  }
  if (remoteOk) {
    const remote = await registrarMovimientosRemoto({ tipo, keys });
    if (remote.remote && !remote.data?.ok) {
      if (remote.data?.reason === "limite_gratis") {
        showError(el(errId), MSG_LIMITE);
        return false;
      }
      if (remote.data?.reason === "uno_a_uno") {
        showError(el(errId), MSG_UNO_A_UNO);
        return false;
      }
    }
    if (remote.remote && remote.data?.ok) {
      aplicarPlanServidor(empresaActual(), remote.data);
    }
  }
  registrarMovimientosLocal(empresaActual(), { tipo, keys: gate.nuevos?.length ? gate.nuevos : keys });
  refresh();
  return true;
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

function refresh() {
  emp = empresaActual();
  const logged = Boolean(emp);
  panel(logged);
  if (!logged) return;
  el("empNombre").textContent = emp.razonSocial || "Empresa";
  el("empMeta").textContent = `${formatRut(emp.rut)} · ${emp.email}`;
  if (el("empPlan")) el("empPlan").textContent = textoCupo(emp);
  fillPerfil();
  renderTrabajadores();
  syncCausalNota();
}

function initPickers() {
  pickers.altaAfp = createPicker(el("altaAfpPick"), {
    options: AFP_OPTS,
    value: "modelo",
    searchable: true,
    placeholder: "AFP",
  });
  pickers.altaSalud = createPicker(el("altaSaludPick"), {
    options: SALUD_OPTS,
    value: "fonasa",
    searchable: false,
    placeholder: "Salud",
  });
  pickers.altaContrato = createPicker(el("altaContratoPick"), {
    options: CONTRATO_OPTS,
    value: "indefinido",
    searchable: false,
    placeholder: "Contrato",
  });
  pickers.altaBanco = createPicker(el("altaBancoPick"), {
    options: BANCOS_CL,
    value: "001",
    searchable: true,
    placeholder: "Banco",
  });
  pickers.altaTipoCta = createPicker(el("altaTipoCtaPick"), {
    options: TIPO_CUENTA_OPTS,
    value: "corriente",
    searchable: false,
    placeholder: "Tipo de cuenta",
  });
  pickers.trabajadores = createPicker(el("pickTrabajadores"), {
    options: [],
    value: [],
    multiple: true,
    searchable: true,
    placeholder: "Buscar y elegir uno o varios",
    onChange: syncSelResumen,
  });
  const periodos = periodoItems();
  pickers.periodo = createPicker(el("pickPeriodo"), {
    options: periodos,
    value: periodos[0]?.value,
    searchable: true,
    placeholder: "Periodo",
  });
  pickers.causal = createPicker(el("pickCausal"), {
    options: opcionesCausalPicker(),
    value: "161-necesidades",
    searchable: true,
    placeholder: "Causal",
    onChange: syncCausalNota,
  });
  dateIngreso = createDateFields(el("finIngreso"), { value: "2020-01-15" });
  dateTermino = createDateFields(el("finTermino"), {
    onChange: (iso) => {
      if (iso && el("finDiasMes")) el("finDiasMes").value = String(diasDelMesHasta(iso));
    },
  });
}

wireNav();
initPickers();
mountHaberes(el("altaHaberes"), []);
syncCausalNota();

document.querySelectorAll("[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => setTab(btn.dataset.tab));
});

mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
});
getIndicadores().then((ind) => {
  indicadores = ind;
});

async function bootSession() {
  const { status, data } = await apiGet("/api/me");
    if (data?.ok && data.company) {
      remoteOk = true;
      try {
        ensureLocalEmpresa(data.company);
        aplicarPlanServidor(empresaActual(), {
          plan: data.company.plan,
          movimientosMes: data.movimientosMes,
        });
      } catch {
        // Keep local session if present.
      }
  } else if (!isNoBackend(status, data) && status === 401) {
    const local = empresaActual();
    if (local?.remote && !local.claveHash) clearSession();
  }
  refresh();
  if (remoteOk) {
    await loadLogo();
    await loadFirma();
  }
}

bootSession();

el("formRegistro")?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  showError(el("errAuth"), "");
  try {
    if (!validarRut(val("regRut"))) throw new Error("RUT de empresa inválido");
    const payload = {
      rut: val("regRut"),
      email: val("regEmail"),
      razonSocial: val("regRazon"),
      password: val("regClave"),
      clave: val("regClave"),
    };
    if (String(payload.password || "").length < MIN_CLAVE) {
      throw new Error("La clave debe tener al menos 10 caracteres");
    }
    const { status, data } = await apiPost("/api/register", payload);
    if (isNoBackend(status, data)) {
      await registrarEmpresa(payload);
      remoteOk = false;
    } else if (!data.ok) {
      throw new Error(authErrorMessage(data, status));
    } else {
      remoteOk = true;
      ensureLocalEmpresa(data.company);
      aplicarPlanServidor(empresaActual(), { plan: data.company.plan, movimientosMes: data.movimientosMes });
    }
    refresh();
  } catch (err) {
    showError(el("errAuth"), err.message);
  }
});

el("formEntrar")?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  showError(el("errAuth"), "");
  try {
    const payload = { rut: val("loginRut"), password: val("loginClave"), clave: val("loginClave") };
    const { status, data } = await apiPost("/api/login", payload);
    if (isNoBackend(status, data)) {
      await entrarEmpresa(payload);
      remoteOk = false;
    } else if (!data.ok) {
      throw new Error(authErrorMessage(data, status));
    } else {
      remoteOk = true;
      ensureLocalEmpresa(data.company);
      aplicarPlanServidor(empresaActual(), { plan: data.company.plan, movimientosMes: data.movimientosMes });
    }
    refresh();
    if (remoteOk) {
      await loadLogo();
      await loadFirma();
    }
  } catch (err) {
    showError(el("errAuth"), err.message);
  }
});

el("btnSalir")?.addEventListener("click", async () => {
  await apiPost("/api/logout", {});
  clearSession();
  remoteOk = false;
  logoDataUrl = "";
  firmaDataUrl = "";
  refresh();
});

function resetOlvideUi() {
  showError(el("errOlvide"), "");
  const ok = el("okOlvide");
  if (ok) {
    ok.hidden = true;
    ok.textContent = "";
  }
  const box = el("olvideResultado");
  if (box) box.hidden = true;
  const wipe = el("btnBorrarLocal");
  if (wipe) {
    wipe.hidden = true;
    wipe.dataset.rut = "";
  }
}

el("btnOlvide")?.addEventListener("click", () => {
  const p = el("panelOlvide");
  if (!p) return;
  p.hidden = false;
  resetOlvideUi();
  const fromLogin = val("loginRut");
  if (fromLogin && el("olvideRut") && !el("olvideRut").value) {
    el("olvideRut").value = fromLogin;
  }
  el("olvideRut")?.focus();
  p.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

el("btnCerrarOlvide")?.addEventListener("click", () => {
  const p = el("panelOlvide");
  if (p) p.hidden = true;
  resetOlvideUi();
});

el("formOlvide")?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  resetOlvideUi();
  const rut = val("olvideRut");
  const email = val("olvideEmail");
  if (!validarRut(rut)) {
    showError(el("errOlvide"), "RUT de empresa inválido");
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError(el("errOlvide"), "Indique el correo de la cuenta");
    return;
  }

  const { status, data } = await apiPost("/api/reset-request", { rut, email });
  const box = el("olvideResultado");
  const expl = el("olvideExplicacion");
  const wipe = el("btnBorrarLocal");
  const ok = el("okOlvide");
  const local = cuentaLocalPorRut(rut);

  if (!isNoBackend(status, data) && (data?.reason === "rate_limited" || status === 429)) {
    showError(el("errOlvide"), authErrorMessage(data, status));
    return;
  }

  if (data?.ok && !isNoBackend(status, data)) {
    if (ok) {
      ok.hidden = false;
      ok.textContent = data.emailed
        ? "Si hay una cuenta con ese RUT y correo, le enviaremos un enlace. Vale 30 minutos y es de un solo uso. No revelamos si los datos coinciden."
        : "Recibimos la solicitud. No se envió ningún correo: el envío no está configurado.";
    }
    if (local && box) {
      box.hidden = false;
      if (expl) {
        expl.textContent =
          "También hay una cuenta con ese RUT en ESTE navegador. Si no recuerda la clave local, puede borrarla y los trabajadores de este navegador se perderán.";
      }
      if (wipe) {
        wipe.hidden = false;
        wipe.dataset.rut = local.rut;
      }
    }
    return;
  }

  if (box) box.hidden = false;
  if (local) {
    if (expl) {
      expl.textContent =
        "No hay servidor de cuentas (o no respondió). Hay una cuenta con ese RUT en ESTE navegador. No se envió ningún correo: los datos no salen de aquí. " +
        "La clave no se puede enviar por correo. Si no recuerda la clave, puede borrar esa cuenta local y crear una nueva. Se perderán los trabajadores guardados en este navegador.";
    }
    if (wipe) {
      wipe.hidden = false;
      wipe.dataset.rut = local.rut;
    }
  } else if (expl) {
    expl.textContent =
      "No hay servidor de cuentas (o no respondió) y no hay una cuenta con ese RUT en este navegador. " +
      "Si la creó en otro computador, en el celular o en una ventana privada, no podemos recuperarla. " +
      "No se envió ningún correo. La clave no se puede enviar por correo. Puede crear una cuenta local nueva con el formulario de arriba.";
  }
});

el("btnBorrarLocal")?.addEventListener("click", async () => {
  const rut = el("btnBorrarLocal")?.dataset.rut;
  showError(el("errOlvide"), "");
  if (!rut) return;
  const ok = await confirmDialog({
    text: `¿Borrar la cuenta local de ${formatRut(rut)} en este navegador? Esta acción no se puede deshacer y no hay copia en un servidor.`,
    okLabel: "Borrar cuenta local",
  });
  if (!ok) return;
  try {
    borrarCuentaLocal(rut);
    const msg = el("okOlvide");
    if (msg) {
      msg.hidden = false;
      msg.textContent =
        "Cuenta local borrada en este navegador. No se envió ningún correo. Ya puede crear una cuenta nueva con el mismo RUT.";
    }
    el("olvideResultado").hidden = true;
    el("btnBorrarLocal").hidden = true;
    refresh();
  } catch (err) {
    showError(el("errOlvide"), err.message);
  }
});

el("formPerfil")?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  showError(el("errPerfil"), "");
  showOk(el("okPerfil"), "");
  const giro = val("perfilGiro") || "";
  const direccion = val("perfilDireccion") || "";
  const razonSocial = val("perfilRazon");
  if (!razonSocial) {
    showError(el("errPerfil"), "Indique la razón social");
    return;
  }
  emp = empresaActual();
  if (!emp) return;
  emp.giro = giro;
  emp.direccion = direccion;
  emp.razonSocial = razonSocial;
  guardarEmpresa(emp);

  if (remoteOk) {
    const { status, data } = await apiPost("/api/profile", { giro, direccion, razonSocial });
    if (data?.reason === "no_storage") {
      showError(el("errPerfil"), authErrorMessage(data, status));
      return;
    }
    if (!isNoBackend(status, data) && !data.ok) {
      showError(el("errPerfil"), authErrorMessage(data, status));
      return;
    }
    if (data?.ok && data.company) ensureLocalEmpresa(data.company);
  }
  refresh();
  showOk(el("okPerfil"), "Perfil guardado.");
});

async function putImage(path, file, errId, flag, reload) {
  showError(el(errId), "");
  if (!remoteOk) {
    showError(el(errId), "Se guarda en el servidor. No hay almacenamiento configurado en este entorno; no se finge la subida.");
    return;
  }
  const { status, data } = await apiPutBytes(path, file, file.type || "application/octet-stream");
  if (!data.ok) {
    showError(el(errId), authErrorMessage(data, status));
    return;
  }
  emp = empresaActual();
  if (emp) {
    emp[flag] = true;
    guardarEmpresa(emp);
  }
  await reload();
}

async function deleteImage(path, errId, flag, clear) {
  showError(el(errId), "");
  if (!remoteOk) {
    showError(el(errId), "No hay archivo en un servidor que quitar.");
    return;
  }
  const { status, data } = await fetch(path, { method: "DELETE", credentials: "same-origin" })
    .then(async (res) => ({ status: res.status, data: await res.json().catch(() => ({})) }))
    .catch(() => ({ status: 0, data: { ok: false, reason: "network" } }));
  if (!data.ok) {
    showError(el(errId), authErrorMessage(data, status));
    return;
  }
  emp = empresaActual();
  if (emp) {
    emp[flag] = false;
    guardarEmpresa(emp);
  }
  clear();
}

el("logoFile")?.addEventListener("change", async (ev) => {
  const file = ev.target.files?.[0];
  ev.target.value = "";
  if (!file) return;
  await putImage("/api/logo", file, "errLogo", "hasLogo", loadLogo);
});

el("btnQuitarLogo")?.addEventListener("click", () =>
  deleteImage("/api/logo", "errLogo", "hasLogo", () => {
    logoDataUrl = "";
    showAsset(el("logoPreview"), el("logoVacio"), "");
  }),
);

el("firmaFile")?.addEventListener("change", async (ev) => {
  const file = ev.target.files?.[0];
  ev.target.value = "";
  if (!file) return;
  await putImage("/api/firma", file, "errFirma", "hasFirma", loadFirma);
});

el("btnQuitarFirma")?.addEventListener("click", () =>
  deleteImage("/api/firma", "errFirma", "hasFirma", () => {
    firmaDataUrl = "";
    showAsset(el("firmaPreview"), el("firmaVacia"), "");
  }),
);

el("csvFile")?.addEventListener("change", async (ev) => {
  const file = ev.target.files?.[0];
  showError(el("errCsv"), "");
  if (!file) return;
  emp = empresaActual();
  const gate = puedeCargaMasiva(emp);
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
    emp = upsertTrabajadores(empresaActual(), rows);
    refresh();
  } catch (err) {
    showError(el("errCsv"), err.message);
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
    afp: pickers.altaAfp?.getValue() || "modelo",
    salud: pickers.altaSalud?.getValue() || "fonasa",
    isaprePactado: numVal("altaIsapre"),
    contrato: pickers.altaContrato?.getValue() || "indefinido",
    horasExtras: numVal("altaHoras"),
    bonos: 0,
    haberesExtra: readHaberes(el("altaHaberes")),
    colacion: numVal("altaColacion"),
    movilizacion: numVal("altaMov"),
    gratificacionArt50: el("altaGrat")?.checked,
    jornada: numVal("altaJornada") || 42,
    email: val("altaEmail"),
    banco: pickers.altaBanco?.getValue() || "",
    tipoCuenta: pickers.altaTipoCta?.getValue() || "corriente",
    nroCuenta: val("altaNroCta"),
  };
  if (editing) {
    emp = updateTrabajador(empresaActual(), editing, row);
  } else {
    emp = upsertTrabajadores(empresaActual(), [row]);
  }
  resetAltaForm();
  refresh();
});

el("tablaTrabajadores")?.addEventListener("click", async (ev) => {
  const edit = ev.target.closest("[data-edit]");
  const del = ev.target.closest("[data-del]");
  const doc = ev.target.closest("[data-doc]");
  if (edit) {
    const t = (emp?.trabajadores || []).find((w) => w.id === edit.dataset.edit);
    if (!t) return;
    fillAlta(t);
    el("formAlta").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (del) {
    const t = (emp?.trabajadores || []).find((w) => w.id === del.dataset.del);
    if (!t) return;
    const ok = await confirmDialog({
      text: `¿Eliminar a ${t.nombre} (${formatRut(t.rut || "sin RUT")}) de la nómina de este mes?`,
      okLabel: "Eliminar",
    });
    if (!ok) return;
    emp = deleteTrabajador(empresaActual(), t.id);
    if (val("altaId") === t.id) resetAltaForm();
    refresh();
    return;
  }
  if (doc) {
    pickers.trabajadores?.setValue([doc.dataset.doc]);
    setTab("documentos");
    syncSelResumen();
  }
});

el("btnGuardarHaberes")?.addEventListener("click", () => {
  const rows = selectedWorkers();
  showOk(el("okHaberes"), "");
  if (!rows[0]) return;
  emp = updateTrabajador(empresaActual(), rows[0].id, readHaberesEditor(rows[0]));
  refresh();
  showOk(el("okHaberes"), "Haberes guardados en este navegador.");
});

el("btnLiquidacion")?.addEventListener("click", async () => {
  showError(el("errPrint"), "");
  const rows = workersForEmit();
  if (!rows.length) return showError(el("errPrint"), "Seleccione uno o más trabajadores");
  const periodoVal = pickers.periodo?.getValue() || "";
  const periodo = periodoLabel(periodoVal) || periodoVal;
  try {
    const calc = calcularSueldo(rows[0], indicadores);
    if (!(await consumirMovimientos("liquidacion", rows, "errPrint"))) return;
    abrirPreview(
      "Vista previa · liquidación",
      liquidacionHtml({
        empresa: empresaParaDoc(),
        trabajador: rows[0],
        periodo,
        calc,
        logoSrc: logoDataUrl,
        firmaSrc: firmaDataUrl,
      }),
      rows.slice(1),
    );
  } catch (err) {
    showError(el("errPrint"), err.message);
  }
});

el("btnCarta")?.addEventListener("click", async () => {
  showError(el("errCarta"), "");
  const rows = workersForEmit();
  if (!rows.length) return showError(el("errCarta"), "Seleccione uno o más trabajadores");
  const ingreso = dateIngreso?.getValue() || "";
  const termino = dateTermino?.getValue() || "";
  if (!ingreso || !termino) return showError(el("errCarta"), "Indique ingreso y término con día, mes y año");
  if (!(await consumirMovimientos("finiquito", rows, "errCarta"))) return;
  try {
    const t = rows[0];
    const fin = calcularFiniquitoCompleto(
      {
        ...t,
        causal: pickers.causal?.getValue(),
        remuneracion: t.sueldoBase,
        ingreso,
        termino,
        diasMes: numVal("finDiasMes"),
        avisoPrevio: el("finAviso")?.checked,
        diasFeriadoPendiente: numVal("finFeriadoPend"),
        diasFeriadoProporcional: numVal("finFeriadoProp"),
        otros: numVal("finOtros"),
      },
      indicadores,
    );
    abrirPreview(
      "Vista previa · carta de finiquito",
      cartaFiniquitoHtml({
        empresa: empresaParaDoc(),
        trabajador: { ...t, ingreso, termino },
        fin,
        ciudad: val("finCiudad") || "Santiago",
        logoSrc: logoDataUrl,
        firmaSrc: firmaDataUrl,
      }),
      rows.slice(1),
    );
  } catch (err) {
    showError(el("errCarta"), err.message);
  }
});

async function bajarPdf(tipo, errId, extra) {
  showError(el(errId), "");
  const rows = workersForEmit();
  if (!rows.length) return showError(el(errId), "Seleccione uno o más trabajadores");
  emp = empresaActual();
  const gate = puedeEmitir(emp, { tipo, keys: rows.map(workerKey) });
  if (!gate.ok) {
    showError(el(errId), gate.message || MSG_LIMITE);
    return;
  }
  const { status, data, blob } = await apiDownloadPdf("/api/documento", {
    tipo,
    uf: indicadores.uf,
    trabajadores: rows.map((t) => ({
      ...payloadTrabajador(t),
      ingreso: extra?.ingreso || "",
      termino: extra?.termino || "",
    })),
    periodo: pickers.periodo?.getValue(),
    ...extra,
  });
  if (!blob) {
    if (data?.reason === "no_storage" || status === 501) {
      showError(
        el(errId),
        "No se pudo generar el PDF: el almacenamiento no está configurado. La vista previa sí está en esta página; puede imprimirla (el navegador permite guardar como PDF).",
      );
      return;
    }
    showError(el(errId), authErrorMessage(data, status));
    return;
  }
  await consumirMovimientos(tipo, rows, errId);
  const many = rows.length > 1;
  triggerDownload(
    blob,
    tipo === "liquidacion"
      ? many
        ? "liquidaciones.pdf"
        : "liquidacion.pdf"
      : many
        ? "finiquitos.pdf"
        : "finiquito.pdf",
  );
}

el("btnPdfLiquidacion")?.addEventListener("click", () => bajarPdf("liquidacion", "errPrint"));

el("btnPdfCarta")?.addEventListener("click", () => {
  const ingreso = dateIngreso?.getValue() || "";
  const termino = dateTermino?.getValue() || "";
  if (!ingreso || !termino) return showError(el("errCarta"), "Indique ingreso y término con día, mes y año");
  return bajarPdf("finiquito", "errCarta", {
    causal: pickers.causal?.getValue(),
    ingreso,
    termino,
    diasMes: numVal("finDiasMes"),
    diasFeriadoPendiente: numVal("finFeriadoPend"),
    diasFeriadoProporcional: numVal("finFeriadoProp"),
    avisoPrevio: Boolean(el("finAviso")?.checked),
    otros: numVal("finOtros"),
    ciudad: val("finCiudad") || "Santiago",
  });
});

el("btnImprimirPreview")?.addEventListener("click", () => {
  try {
    imprimirIframe(el("docPreviewFrame"));
  } catch (err) {
    showError(el("errPrint"), err.message);
    showError(el("errCarta"), err.message);
  }
});

el("btnCerrarPreview")?.addEventListener("click", () => {
  el("panelPreview").hidden = true;
});

el("btnPagoXlsx")?.addEventListener("click", () => {
  showError(el("errPago"), "");
  emp = empresaActual();
  const gate = puedePagoMasivo(emp);
  if (!gate.ok) return showError(el("errPago"), gate.message || MSG_PAGO_PRO);
  const rows = workersForEmit();
  if (!rows.length) return showError(el("errPago"), "Seleccione uno o más trabajadores");
  const periodoVal = pickers.periodo?.getValue() || "";
  const periodo = periodoLabel(periodoVal) || periodoVal;
  try {
    const bytes = xlsxPagoMasivo({
      trabajadores: rows,
      indicadores,
      glosa: glosaSueldo(periodo),
    });
    triggerDownload(
      new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "pago-masivo-haberes.xlsx",
    );
  } catch (err) {
    showError(el("errPago"), err.message);
  }
});

el("btnPagoEjemplo")?.addEventListener("click", () => {
  showError(el("errPago"), "");
  try {
    const bytes = xlsxPagoEjemplo();
    triggerDownload(
      new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "pago-masivo-ejemplo.xlsx",
    );
  } catch (err) {
    showError(el("errPago"), err.message);
  }
});
