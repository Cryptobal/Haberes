import {
  apiGet,
  apiPost,
  apiPutBytes,
  authErrorMessage,
  isNoBackend,
} from "./api.js";
import { initEnvioDocumentos } from "./app-empresa-envio.js";
import { startProCheckout, consumeCheckoutIntent, rememberCheckoutIntent } from "./checkout.js";
import {
  LRE_COMUNAS_FRECUENTES,
  LRE_MUTUALES,
  LRE_REGIONES,
  LRE_SALUD,
} from "./lre.js";
import { BANCOS_CL, TIPO_CUENTA_OPTS } from "./pago.js";
import { PERFILES_NOMINA } from "./nomina.js";
import {
  GRATIS_LIMITE,
  aplicarPlanServidor,
  isPro,
  syncPlanRemoto,
  textoCupo,
  usadosMes,
} from "./plan.js";
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
} from "./storage.js";
import { getIndicadores } from "./indicadores.js";
import { opcionesCausalPicker } from "./causales.js";
import { createPicker } from "./picker.js";
import { formatRut, validarRut } from "./format.js";
import {
  confirmDialog,
  createDateFields,
  diasDelMesHasta,
  el,
  mountIndicadores,
  numVal,
  periodoItems,
  showError,
  toastError,
  toastInfo,
  toastOk,
  val,
  wireNav,
  withBusy,
} from "./ui.js";
import {
  AFP_OPTS,
  CONTRATO_OPTS,
  SALUD_OPTS,
  bindEmpresaTrabajadores,
  installSaludOpts,
} from "./empresa-trabajadores.js";
import { bindEmpresaDocumentos } from "./empresa-documentos.js";
import { bindEmpresaNomina } from "./empresa-nomina.js";
import { bindEmpresaLre } from "./empresa-lre.js";

installSaludOpts(LRE_SALUD);

let indicadores = { uf: 40854.01, utm: 71649 };
let emp = null;
let logoDataUrl = "";
let firmaDataUrl = "";
let remoteOk = false;
let pickers = {};
let dateIngreso = null;
let dateTermino = null;
let dateAltaIngreso = null;
let dateAltaTermino = null;
let altaIngresoTocada = false;
let altaTerminoTocada = false;

function hoyIso() {
  const h = new Date();
  const p2 = (n) => String(n).padStart(2, "0");
  return `${h.getFullYear()}-${p2(h.getMonth() + 1)}-${p2(h.getDate())}`;
}

function panel(logged) {
  el("auth").hidden = logged;
  el("app").hidden = !logged;
}

function showOk(node, msg) {
  if (!node) return;
  node.hidden = !msg;
  node.textContent = msg || "";
}

function setTab(name, { scroll = false } = {}) {
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.setAttribute("aria-selected", btn.dataset.tab === name ? "true" : "false");
  });
  document.querySelectorAll("[data-tab-panel]").forEach((panelEl) => {
    panelEl.hidden = panelEl.dataset.tabPanel !== name;
  });
  document
    .querySelector(`[data-tab="${name}"]`)
    ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  if (scroll) {
    document.querySelector(".ws-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/** Alterna entre «Entrar» y «Crear cuenta» sin recargar ni apilar formularios. */
function setAuthMode(modo) {
  document.querySelectorAll("[data-auth-panel]").forEach((form) => {
    form.hidden = form.dataset.authPanel !== modo;
  });
  showError(el("errAuth"), "");
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

/** Medidor de cupo: barra + insignia. En Pro no hay tope, así que la barra va llena en verde. */
function renderCupo() {
  const box = el("empQuota");
  const bar = el("empQuotaBar");
  const badge = el("empPlanBadge");
  const cta = el("btnPasarPro");
  const state = el("empProState");
  if (el("empPlan")) el("empPlan").textContent = textoCupo(emp);
  const pro = isPro(emp);
  if (badge) {
    badge.textContent = pro ? "Pro" : "Gratis";
    badge.className = pro ? "badge badge-pro" : "badge";
  }
  if (cta) cta.hidden = pro;
  if (state) {
    state.hidden = !pro;
    if (pro) {
      const until = emp?.planUntil ? new Date(emp.planUntil) : null;
      state.textContent =
        until && Number.isFinite(until.getTime())
          ? `Ya es Pro · hasta ${until.toLocaleDateString("es-CL")}`
          : "Ya es Pro";
    }
  }
  if (!box || !bar) return;
  const usados = usadosMes(emp);
  const pct = pro ? 100 : Math.min(100, Math.round((usados / GRATIS_LIMITE) * 100));
  bar.style.width = `${pct}%`;
  box.classList.toggle("is-full", !pro && usados >= GRATIS_LIMITE);
  const meter = box.querySelector('[role="progressbar"]');
  if (meter) {
    meter.setAttribute("aria-valuemax", pro ? "100" : String(GRATIS_LIMITE));
    meter.setAttribute("aria-valuenow", pro ? "100" : String(usados));
  }
}

const ctx = {
  get emp() {
    return emp;
  },
  set emp(v) {
    emp = v;
  },
  get indicadores() {
    return indicadores;
  },
  get logoDataUrl() {
    return logoDataUrl;
  },
  get firmaDataUrl() {
    return firmaDataUrl;
  },
  get remoteOk() {
    return remoteOk;
  },
  pickers,
  get dateIngreso() {
    return dateIngreso;
  },
  get dateTermino() {
    return dateTermino;
  },
  get dateAltaIngreso() {
    return dateAltaIngreso;
  },
  get dateAltaTermino() {
    return dateAltaTermino;
  },
  get altaIngresoTocada() {
    return altaIngresoTocada;
  },
  set altaIngresoTocada(v) {
    altaIngresoTocada = v;
  },
  get altaTerminoTocada() {
    return altaTerminoTocada;
  },
  set altaTerminoTocada(v) {
    altaTerminoTocada = v;
  },
  hoyIso,
  setTab,
  showOk,
  refresh,
};

const nominaApi = bindEmpresaNomina(ctx);
ctx.avisoConsorcioRipley = nominaApi.avisoConsorcioRipley;
ctx.syncNominaAviso = nominaApi.syncNominaAviso;

const trabajadoresApi = bindEmpresaTrabajadores(ctx);
ctx.selectedWorkers = trabajadoresApi.selectedWorkers;
ctx.readHaberesEditor = trabajadoresApi.readHaberesEditor;
ctx.payloadTrabajador = trabajadoresApi.payloadTrabajador;
ctx.art58Confirmado = trabajadoresApi.art58Confirmado;
ctx.actualizarAvisoArt58 = trabajadoresApi.actualizarAvisoArt58;

const documentosApi = bindEmpresaDocumentos(ctx);
ctx.workersForEmit = documentosApi.workersForEmit;

const lreApi = bindEmpresaLre(ctx);

function refresh() {
  emp = empresaActual();
  const logged = Boolean(emp);
  panel(logged);
  if (!logged) return;
  el("empNombre").textContent = emp.razonSocial || "Empresa";
  el("empMeta").textContent = `${formatRut(emp.rut)} · ${emp.email}`;
  renderCupo();
  fillPerfil();
  trabajadoresApi.renderTrabajadores();
  lreApi.refrescarLre();
  documentosApi.syncCausalNota();
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
    placeholder: "Banco o billetera",
  });
  pickers.nominaPerfil = createPicker(el("pickNominaPerfil"), {
    options: PERFILES_NOMINA.filter((p) => p.id !== "personalizado" || true).map((p) => ({
      value: p.id,
      label: p.verificado ? p.nombre : `${p.nombre} (no verificada)`,
    })),
    value: emp?.nomina?.perfilId || "generico_xlsx",
    searchable: false,
    placeholder: "Formato de nómina",
    onChange: () => nominaApi.syncNominaAviso(),
  });
  pickers.lreRegion = createPicker(el("lreRegionPick"), {
    options: LRE_REGIONES.map(([value, label]) => ({ value: String(value), label })),
    value: "13",
    searchable: true,
    placeholder: "Región",
  });
  pickers.lreMutual = createPicker(el("lreMutualPick"), {
    options: LRE_MUTUALES.map(([value, label]) => ({ value: String(value), label })),
    value: "0",
    searchable: false,
    placeholder: "Mutual",
  });
  const dl = el("lreComunas");
  if (dl) {
    dl.innerHTML = LRE_COMUNAS_FRECUENTES.map(
      ([cod, nombre]) => `<option value="${cod}">${nombre}</option>`,
    ).join("");
  }

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
    onChange: trabajadoresApi.syncSelResumen,
  });
  const periodos = periodoItems();
  pickers.periodo = createPicker(el("pickPeriodo"), {
    options: periodos,
    value: periodos[0]?.value,
    searchable: true,
    placeholder: "Periodo",
    onChange: () => trabajadoresApi.syncSelResumen(),
  });
  pickers.causal = createPicker(el("pickCausal"), {
    options: opcionesCausalPicker(),
    value: "161-necesidades",
    searchable: true,
    placeholder: "Causal",
    onChange: documentosApi.syncCausalNota,
  });
  dateAltaIngreso = createDateFields(el("altaFechaIngreso"), {
    onChange: () => {
      altaIngresoTocada = true;
    },
  });
  dateAltaTermino = createDateFields(el("altaFechaTermino"), {
    onChange: () => {
      altaTerminoTocada = true;
    },
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
documentosApi.syncCausalNota();
nominaApi.syncNominaAviso();

initEnvioDocumentos({
  workersForEmit: documentosApi.workersForEmit,
  payloadTrabajador: trabajadoresApi.payloadTrabajador,
  pickers,
  get indicadores() {
    return indicadores;
  },
  showError,
  withBusy,
  consumirMovimientos: documentosApi.consumirMovimientos,
  get dateIngreso() {
    return dateIngreso;
  },
  get dateTermino() {
    return dateTermino;
  },
  numVal,
  val,
});

document.querySelectorAll("[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => setTab(btn.dataset.tab, { scroll: true }));
});

document.querySelectorAll("[data-auth-modo]").forEach((input) => {
  input.addEventListener("change", () => {
    if (input.checked) setAuthMode(input.value);
  });
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
        planUntil: data.company.planUntil,
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
  if (new URLSearchParams(location.search).get("checkout") === "1") rememberCheckoutIntent();
  await handlePagoReturn();
  stripPagoQuery();
  if (remoteOk) {
    await loadLogo();
    await loadFirma();
  }
  await maybeContinueCheckout();
}

function stripPagoQuery() {
  const params = new URLSearchParams(location.search);
  if (!params.has("pago") && params.get("checkout") !== "1") return;
  params.delete("pago");
  const next = params.toString();
  history.replaceState({}, "", next ? `/empresa?${next}` : "/empresa");
}

async function handlePagoReturn() {
  const pago = new URLSearchParams(location.search).get("pago");
  if (!pago) return;
  if (pago === "ok" || pago === "pending") {
    await syncPlanRemoto();
    refresh();
    toastInfo(
      pago === "ok" ? "Pago recibido" : "Pago en revisión",
      "Pro se activa cuando Mercado Pago confirma (puede tardar unos segundos).",
    );
  } else if (pago === "fail") {
    toastError("No se completó el pago", "Puede intentarlo de nuevo desde Pasar a Pro.");
  }
}

async function maybeContinueCheckout() {
  if (new URLSearchParams(location.search).get("checkout") === "1") rememberCheckoutIntent();
  if (!remoteOk || isPro(empresaActual())) return;
  if (!consumeCheckoutIntent()) return;
  const params = new URLSearchParams(location.search);
  if (params.has("checkout")) {
    params.delete("checkout");
    const next = params.toString();
    history.replaceState({}, "", next ? `/empresa?${next}` : "/empresa");
  }
  await startProCheckout({
    onError(msg) {
      toastError("No se pudo iniciar el pago", msg);
    },
  });
}

bootSession();

el("formRegistro")?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  showError(el("errAuth"), "");
  const submit = ev.submitter || el("formRegistro").querySelector('[type="submit"]');
  await withBusy(submit, async () => {
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
        aplicarPlanServidor(empresaActual(), {
          plan: data.company.plan,
          planUntil: data.company.planUntil,
          movimientosMes: data.movimientosMes,
        });
      }
      refresh();
      toastOk(
        "Cuenta creada",
        remoteOk ? "Complete el perfil y suba su logo." : "Guardada solo en este navegador.",
      );
      if (remoteOk) await maybeContinueCheckout();
    } catch (err) {
      showError(el("errAuth"), err.message);
      toastError("No se pudo crear la cuenta", err.message);
    }
  }, "Creando…");
});

el("formEntrar")?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  showError(el("errAuth"), "");
  const submit = ev.submitter || el("formEntrar").querySelector('[type="submit"]');
  await withBusy(submit, async () => {
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
        aplicarPlanServidor(empresaActual(), {
          plan: data.company.plan,
          planUntil: data.company.planUntil,
          movimientosMes: data.movimientosMes,
        });
      }
      refresh();
      toastOk(`Hola, ${empresaActual()?.razonSocial || "empresa"}`);
      if (remoteOk) {
        await loadLogo();
        await loadFirma();
        await maybeContinueCheckout();
      }
    } catch (err) {
      showError(el("errAuth"), err.message);
      toastError("No se pudo entrar", err.message);
    }
  }, "Entrando…");
});

el("btnPasarPro")?.addEventListener("click", async (ev) => {
  await withBusy(
    ev.currentTarget,
    () =>
      startProCheckout({
        onError(msg) {
          toastError("No se pudo iniciar el pago", msg);
        },
      }),
    "Abriendo Mercado Pago…",
  );
});

el("btnSalir")?.addEventListener("click", async () => {
  const ok = await confirmDialog({
    title: "Cerrar sesión",
    text: "La nómina de este mes queda guardada en este navegador. ¿Cerrar sesión?",
    okLabel: "Cerrar sesión",
    danger: false,
  });
  if (!ok) return;
  await apiPost("/api/logout", {});
  clearSession();
  remoteOk = false;
  logoDataUrl = "";
  firmaDataUrl = "";
  refresh();
  toastInfo("Sesión cerrada");
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
    title: "Borrar la cuenta local",
    text: `Se borra la cuenta de ${formatRut(rut)} en este navegador, junto con sus trabajadores. No se puede deshacer y no hay copia en un servidor.`,
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
  toastOk("Perfil guardado", "Se usará en el membrete de los documentos.");
});

async function putImage(path, file, errId, flag, reload) {
  showError(el(errId), "");
  if (!remoteOk) {
    showError(el(errId), "Se guarda en el servidor. No hay almacenamiento configurado en este entorno; no se finge la subida.");
    return;
  }
  const { status, data } = await apiPutBytes(path, file, file.type || "application/octet-stream");
  if (!data.ok) {
    const msg = authErrorMessage(data, status);
    showError(el(errId), msg);
    toastError("No se pudo subir la imagen", msg);
    return;
  }
  emp = empresaActual();
  if (emp) {
    emp[flag] = true;
    guardarEmpresa(emp);
  }
  await reload();
  toastOk("Imagen guardada");
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
  toastInfo("Imagen quitada");
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
