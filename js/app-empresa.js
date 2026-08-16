import { apiGet, apiPost, authErrorMessage, isNoBackend } from "./api.js";
import { parseTrabajadoresCsv } from "./csv.js";
import { calcularFiniquito } from "./finiquito.js";
import { clp, formatRut, validarRut } from "./format.js";
import { getIndicadores } from "./indicadores.js";
import { abrirImpresion, cartaFiniquitoHtml, liquidacionHtml } from "./print.js";
import {
  borrarCuentaLocal,
  clearSession,
  cuentaLocalPorRut,
  empresaActual,
  ensureLocalEmpresa,
  entrarEmpresa,
  MIN_CLAVE,
  registrarEmpresa,
  upsertTrabajadores,
} from "./storage.js";
import { calcularSueldo } from "./sueldo.js";
import { el, mountIndicadores, numVal, showError, val, wireNav } from "./ui.js";

let indicadores = { uf: 40854.01, utm: 71649 };
let emp = null;

function panel(logged) {
  el("auth").hidden = logged;
  el("app").hidden = !logged;
}

function renderTrabajadores() {
  const list = el("tablaTrabajadores");
  const rows = emp?.trabajadores || [];
  if (!rows.length) {
    list.innerHTML = `<p class="empty">Aún no hay trabajadores. Cargue un CSV o agregue uno.</p>`;
    el("selTrabajador").innerHTML = `<option value="">Seleccione</option>`;
    el("selFiniquito").innerHTML = `<option value="">Seleccione</option>`;
    return;
  }
  list.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Nombre</th><th>RUT</th><th>Cargo</th><th>Base</th><th>AFP</th><th>Contrato</th>
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
            </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
  const opts = rows
    .map((t) => `<option value="${t.id}">${t.nombre} · ${formatRut(t.rut)}</option>`)
    .join("");
  el("selTrabajador").innerHTML = `<option value="">Seleccione</option>${opts}`;
  el("selFiniquito").innerHTML = `<option value="">Seleccione</option>${opts}`;
}

function byId(sel) {
  const id = val(sel);
  return (emp?.trabajadores || []).find((t) => t.id === id) || null;
}

function refresh() {
  emp = empresaActual();
  const logged = Boolean(emp);
  panel(logged);
  if (!logged) return;
  el("empNombre").textContent = emp.razonSocial || "Empresa";
  el("empMeta").textContent = `${formatRut(emp.rut)} · ${emp.email}`;
  renderTrabajadores();
}

wireNav();
mountIndicadores().then((ind) => {
  if (ind) indicadores = ind;
});
getIndicadores().then((ind) => {
  indicadores = ind;
});

async function bootSession() {
  const { status, data } = await apiGet("/api/me");
  if (data?.ok && data.company) {
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
    } else if (!data.ok) {
      throw new Error(authErrorMessage(data, status));
    } else {
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
    } else if (!data.ok) {
      throw new Error(authErrorMessage(data, status));
    } else {
      ensureLocalEmpresa(data.company);
    }
    refresh();
  } catch (err) {
    showError(el("errAuth"), err.message);
  }
});

el("btnSalir")?.addEventListener("click", async () => {
  await apiPost("/api/logout", {});
  clearSession();
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
  const panel = el("panelOlvide");
  if (!panel) return;
  panel.hidden = false;
  resetOlvideUi();
  const fromLogin = val("loginRut");
  if (fromLogin && el("olvideRut") && !el("olvideRut").value) {
    el("olvideRut").value = fromLogin;
  }
  el("olvideRut")?.focus();
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

el("btnCerrarOlvide")?.addEventListener("click", () => {
  const panel = el("panelOlvide");
  if (panel) panel.hidden = true;
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
      isaprePactado: 0,
      contrato: val("altaContrato"),
      horasExtras: 0,
      bonos: 0,
      colacion: numVal("altaColacion"),
      movilizacion: numVal("altaMov"),
      gratificacionArt50: el("altaGrat")?.checked,
      jornada: 42,
    },
  ]);
  ev.target.reset();
  refresh();
});

el("btnLiquidacion")?.addEventListener("click", () => {
  showError(el("errPrint"), "");
  const t = byId("selTrabajador");
  if (!t) return showError(el("errPrint"), "Seleccione un trabajador");
  const calc = calcularSueldo(
    {
      sueldoBase: t.sueldoBase,
      afp: t.afp,
      salud: t.salud,
      isaprePactado: t.isaprePactado,
      contrato: t.contrato,
      horasExtras: t.horasExtras,
      bonos: t.bonos,
      colacion: t.colacion,
      movilizacion: t.movilizacion,
      gratificacionArt50: t.gratificacionArt50,
      jornada: t.jornada,
    },
    indicadores,
  );
  const periodo = val("periodo") || new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(new Date());
  try {
    abrirImpresion(liquidacionHtml({ empresa: emp, trabajador: t, periodo, calc }));
  } catch (err) {
    showError(el("errPrint"), err.message);
  }
});

el("btnCarta")?.addEventListener("click", () => {
  showError(el("errCarta"), "");
  const t = byId("selFiniquito");
  if (!t) return showError(el("errCarta"), "Seleccione un trabajador");
  const fin = calcularFiniquito(
    {
      articulo: val("finArt"),
      ingreso: val("finIngreso"),
      termino: val("finTermino"),
      remuneracion: numVal("finRem") || t.sueldoBase,
      avisoPrevio: el("finAviso")?.checked,
      diasFeriado: numVal("finFeriado"),
      otros: numVal("finOtros"),
    },
    indicadores,
  );
  try {
    abrirImpresion(
      cartaFiniquitoHtml({
        empresa: emp,
        trabajador: {
          ...t,
          ingreso: val("finIngreso"),
          termino: val("finTermino"),
        },
        fin,
        ciudad: val("finCiudad") || "Santiago",
      }),
    );
  } catch (err) {
    showError(el("errCarta"), err.message);
  }
});
