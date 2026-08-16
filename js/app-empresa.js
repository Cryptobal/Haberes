import {
  apiDownloadPdf,
  apiGet,
  apiPost,
  apiPutBytes,
  authErrorMessage,
  isNoBackend,
  triggerDownload,
} from "./api.js";
import { opcionesCausalHtml, causalPorId } from "./causales.js";
import { parseTrabajadoresCsv } from "./csv.js";
import { calcularFiniquitoCompleto } from "./finiquito.js";
import { clp, formatRut, validarRut } from "./format.js";
import { getIndicadores } from "./indicadores.js";
import { cartaFiniquitoHtml, imprimirIframe, liquidacionHtml, mostrarVistaPrevia } from "./print.js";
import {
  borrarCuentaLocal,
  clearSession,
  cuentaLocalPorRut,
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
  diasDelMesHasta,
  el,
  fillPeriodoSelect,
  mountDateParts,
  mountIndicadores,
  numVal,
  periodoLabel,
  readDateParts,
  showError,
  val,
  wireNav,
} from "./ui.js";

let indicadores = { uf: 40854.01, utm: 71649 };
let emp = null;
let logoDataUrl = "";
let remoteOk = false;

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
      <input data-h-monto type="number" min="0" step="1" value="${Number(h.monto) || 0}" />
    </div>
    <div class="field" style="margin:0">
      <label>Imponible</label>
      <select data-h-imp>
        <option value="si"${imp ? " selected" : ""}>Sí</option>
        <option value="no"${imp ? "" : " selected"}>No</option>
      </select>
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
      const btn = ev.target.closest("[data-h-del]");
      if (!btn) return;
      btn.closest("[data-haber]")?.remove();
    });
  }
}

function readHaberes(container) {
  if (!container) return [];
  return [...container.querySelectorAll("[data-haber]")]
    .map((row) => ({
      nombre: String(row.querySelector("[data-h-nombre]")?.value || "").trim(),
      monto: Number(row.querySelector("[data-h-monto]")?.value) || 0,
      imponible: row.querySelector("[data-h-imp]")?.value !== "no",
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

function renderTrabajadores() {
  const list = el("tablaTrabajadores");
  const rows = emp?.trabajadores || [];
  if (!rows.length) {
    list.innerHTML = `<p class="empty">Aún no hay trabajadores. Cargue un CSV o agregue uno.</p>`;
    el("selTrabajador").innerHTML = `<option value="">Seleccione</option>`;
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
              <td>${t.nombre}</td>
              <td>${formatRut(t.rut)}</td>
              <td>${t.cargo || "—"}</td>
              <td>${clp(t.sueldoBase)}</td>
              <td>${t.afp}</td>
              <td>${t.contrato === "plazo_fijo" ? "Plazo fijo" : "Indefinido"}</td>
              <td><button type="button" class="btn-text" data-edit="${t.id}" style="margin:0">Elegir</button></td>
            </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
  const opts = rows
    .map((t) => `<option value="${t.id}">${t.nombre} · ${formatRut(t.rut)}</option>`)
    .join("");
  const prev = el("selTrabajador").value;
  el("selTrabajador").innerHTML = `<option value="">Seleccione</option>${opts}`;
  if (prev && rows.some((t) => t.id === prev)) el("selTrabajador").value = prev;
}

function byId(sel) {
  const id = val(sel);
  return (emp?.trabajadores || []).find((t) => t.id === id) || null;
}

function fillPerfil() {
  if (!emp) return;
  if (el("perfilRazon")) el("perfilRazon").value = emp.razonSocial || "";
  if (el("perfilRut")) el("perfilRut").value = formatRut(emp.rut || "");
  if (el("perfilGiro")) el("perfilGiro").value = emp.giro || "";
  if (el("perfilDireccion")) el("perfilDireccion").value = emp.direccion || "";
}

function showLogoPreview(src) {
  const img = el("logoPreview");
  const empty = el("logoVacio");
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

async function loadLogo() {
  logoDataUrl = "";
  if (!remoteOk || !emp?.hasLogo) {
    showLogoPreview("");
    return;
  }
  try {
    const res = await fetch("/api/logo", { credentials: "same-origin" });
    if (!res.ok) {
      showLogoPreview("");
      return;
    }
    const blob = await res.blob();
    logoDataUrl = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => resolve("");
      r.readAsDataURL(blob);
    });
    showLogoPreview(logoDataUrl);
  } catch {
    showLogoPreview("");
  }
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

function refresh() {
  emp = empresaActual();
  const logged = Boolean(emp);
  panel(logged);
  if (!logged) return;
  el("empNombre").textContent = emp.razonSocial || "Empresa";
  el("empMeta").textContent = `${formatRut(emp.rut)} · ${emp.email}`;
  fillPerfil();
  renderTrabajadores();
  fillHaberesEditor(byId("selTrabajador"));
  syncCausalNota();
}

function syncCausalNota() {
  const c = causalPorId(val("finArt"));
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

function abrirPreview(titulo, html) {
  el("panelPreview").hidden = false;
  el("docPreviewTitulo").textContent = titulo;
  mostrarVistaPrevia(el("docPreviewFrame"), html);
  el("panelPreview").scrollIntoView({ behavior: "smooth", block: "start" });
}

wireNav();
fillPeriodoSelect(el("periodo"));
if (el("finArt")) el("finArt").innerHTML = opcionesCausalHtml("161-necesidades");
mountDateParts("finIngreso", "2020-01-15");
mountDateParts("finTermino");
mountHaberes(el("altaHaberes"), []);
syncCausalNota();

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
    } catch {
      // Keep local session if present.
    }
  } else if (!isNoBackend(status, data) && status === 401) {
    const local = empresaActual();
    if (local?.remote && !local.claveHash) clearSession();
  }
  refresh();
  if (remoteOk) await loadLogo();
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
    }
    refresh();
    if (remoteOk) await loadLogo();
  } catch (err) {
    showError(el("errAuth"), err.message);
  }
});

el("btnSalir")?.addEventListener("click", async () => {
  await apiPost("/api/logout", {});
  clearSession();
  remoteOk = false;
  logoDataUrl = "";
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

el("btnBorrarLocal")?.addEventListener("click", () => {
  const rut = el("btnBorrarLocal")?.dataset.rut;
  showError(el("errOlvide"), "");
  if (!rut) return;
  const ok = window.confirm(
    `¿Borrar la cuenta local de ${formatRut(rut)} en este navegador? Esta acción no se puede deshacer y no hay copia en un servidor.`,
  );
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

el("logoFile")?.addEventListener("change", async (ev) => {
  const file = ev.target.files?.[0];
  showError(el("errLogo"), "");
  ev.target.value = "";
  if (!file) return;
  if (!remoteOk) {
    showError(el("errLogo"), "El logo se guarda en el servidor. No hay almacenamiento configurado en este entorno; no se finge la subida.");
    return;
  }
  const { status, data } = await apiPutBytes("/api/logo", file, file.type || "application/octet-stream");
  if (!data.ok) {
    showError(el("errLogo"), authErrorMessage(data, status));
    return;
  }
  emp = empresaActual();
  if (emp) {
    emp.hasLogo = true;
    guardarEmpresa(emp);
  }
  await loadLogo();
});

el("btnQuitarLogo")?.addEventListener("click", async () => {
  showError(el("errLogo"), "");
  if (!remoteOk) {
    showError(el("errLogo"), "No hay logo en un servidor que quitar.");
    return;
  }
  const { status, data } = await fetch("/api/logo", { method: "DELETE", credentials: "same-origin" })
    .then(async (res) => ({ status: res.status, data: await res.json().catch(() => ({})) }))
    .catch(() => ({ status: 0, data: { ok: false, reason: "network" } }));
  if (!data.ok) {
    showError(el("errLogo"), authErrorMessage(data, status));
    return;
  }
  emp = empresaActual();
  if (emp) {
    emp.hasLogo = false;
    guardarEmpresa(emp);
  }
  logoDataUrl = "";
  showLogoPreview("");
});

el("csvFile")?.addEventListener("change", async (ev) => {
  const file = ev.target.files?.[0];
  showError(el("errCsv"), "");
  if (!file) return;
  const text = await file.text();
  try {
    const rows = parseTrabajadoresCsv(text);
    if (!rows.length) throw new Error("El CSV no tiene filas válidas");
    emp = upsertTrabajadores(empresaActual(), rows);
    refresh();
  } catch (err) {
    showError(el("errCsv"), err.message);
  }
  ev.target.value = "";
});

el("btnAltaHaber")?.addEventListener("click", () => addHaber(el("altaHaberes")));
el("btnEmHaber")?.addEventListener("click", () => addHaber(el("emHaberes")));

el("formAlta")?.addEventListener("submit", (ev) => {
  ev.preventDefault();
  showError(el("errAlta"), "");
  const nombre = val("altaNombre");
  const rut = val("altaRut");
  if (!nombre) return showError(el("errAlta"), "Indique el nombre");
  if (rut && !validarRut(rut)) return showError(el("errAlta"), "RUT inválido");
  emp = upsertTrabajadores(empresaActual(), [
    {
      id: `t_${Date.now()}`,
      nombre,
      rut,
      cargo: val("altaCargo"),
      sueldoBase: numVal("altaSueldo"),
      afp: val("altaAfp"),
      salud: val("altaSalud"),
      isaprePactado: numVal("altaIsapre"),
      contrato: val("altaContrato"),
      horasExtras: numVal("altaHoras"),
      bonos: 0,
      haberesExtra: readHaberes(el("altaHaberes")),
      colacion: numVal("altaColacion"),
      movilizacion: numVal("altaMov"),
      gratificacionArt50: el("altaGrat")?.checked,
      jornada: numVal("altaJornada") || 42,
    },
  ]);
  ev.target.reset();
  if (el("altaJornada")) el("altaJornada").value = "42";
  mountHaberes(el("altaHaberes"), []);
  refresh();
});

el("tablaTrabajadores")?.addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-edit]");
  if (!btn) return;
  el("selTrabajador").value = btn.dataset.edit;
  fillHaberesEditor(byId("selTrabajador"));
});

el("selTrabajador")?.addEventListener("change", () => {
  fillHaberesEditor(byId("selTrabajador"));
});

el("btnGuardarHaberes")?.addEventListener("click", () => {
  const t = byId("selTrabajador");
  showOk(el("okHaberes"), "");
  if (!t) return;
  emp = updateTrabajador(empresaActual(), t.id, readHaberesEditor(t));
  refresh();
  showOk(el("okHaberes"), "Haberes guardados en este navegador.");
});

el("finArt")?.addEventListener("change", syncCausalNota);
el("finTerminoD")?.addEventListener("change", () => {
  const iso = readDateParts("finTermino");
  if (iso && el("finDiasMes")) el("finDiasMes").value = String(diasDelMesHasta(iso));
});
el("finTerminoM")?.addEventListener("change", () => {
  const iso = readDateParts("finTermino");
  if (iso && el("finDiasMes")) el("finDiasMes").value = String(diasDelMesHasta(iso));
});
el("finTerminoY")?.addEventListener("change", () => {
  const iso = readDateParts("finTermino");
  if (iso && el("finDiasMes")) el("finDiasMes").value = String(diasDelMesHasta(iso));
});

function trabajadorEmit() {
  const t = byId("selTrabajador");
  if (!t) return null;
  return readHaberesEditor(t);
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
  };
}

el("btnLiquidacion")?.addEventListener("click", () => {
  showError(el("errPrint"), "");
  const t = trabajadorEmit();
  if (!t) return showError(el("errPrint"), "Seleccione un trabajador");
  const calc = calcularSueldo(t, indicadores);
  const periodo = periodoLabel(val("periodo")) || val("periodo");
  try {
    abrirPreview(
      "Vista previa · liquidación",
      liquidacionHtml({ empresa: empresaParaDoc(), trabajador: t, periodo, calc, logoSrc: logoDataUrl }),
    );
  } catch (err) {
    showError(el("errPrint"), err.message);
  }
});

el("btnCarta")?.addEventListener("click", () => {
  showError(el("errCarta"), "");
  const t = trabajadorEmit();
  if (!t) return showError(el("errCarta"), "Seleccione un trabajador");
  const ingreso = readDateParts("finIngreso");
  const termino = readDateParts("finTermino");
  if (!ingreso || !termino) return showError(el("errCarta"), "Indique ingreso y término con día, mes y año");
  try {
    const fin = calcularFiniquitoCompleto(
      {
        ...t,
        causal: val("finArt"),
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
      }),
    );
  } catch (err) {
    showError(el("errCarta"), err.message);
  }
});

async function bajarPdf(tipo, errId, extra) {
  showError(el(errId), "");
  const t = trabajadorEmit();
  if (!t) return showError(el(errId), "Seleccione un trabajador");
  const { status, data, blob } = await apiDownloadPdf("/api/documento", {
    tipo,
    uf: indicadores.uf,
    trabajador: {
      ...payloadTrabajador(t),
      ingreso: extra?.ingreso || "",
      termino: extra?.termino || "",
    },
    periodo: val("periodo"),
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
  triggerDownload(blob, tipo === "liquidacion" ? "liquidacion.pdf" : "finiquito.pdf");
}

el("btnPdfLiquidacion")?.addEventListener("click", () => bajarPdf("liquidacion", "errPrint"));

el("btnPdfCarta")?.addEventListener("click", () => {
  const ingreso = readDateParts("finIngreso");
  const termino = readDateParts("finTermino");
  if (!ingreso || !termino) return showError(el("errCarta"), "Indique ingreso y término con día, mes y año");
  return bajarPdf("finiquito", "errCarta", {
    causal: val("finArt"),
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
