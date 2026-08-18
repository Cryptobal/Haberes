import { apiGet, apiPost, authErrorMessage, isNoBackend } from "./api.js";
import { clp, formatRut } from "./format.js";
import { el, mountIndicadores, showError, val, wireNav } from "./ui.js";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

wireNav();
mountIndicadores();

const TABS = ["suscripciones", "producto", "trafico", "outbound"];
let companies = [];
let summary = null;
let filter = "todas";
let productoCache = {};
let traficoCache = {};
let outboundCache = {};

function panel(logged) {
  el("adminAuth").hidden = logged;
  el("adminApp").hidden = !logged;
}

function tabFromHash() {
  const h = (location.hash || "").replace(/^#/, "");
  return TABS.includes(h) ? h : "suscripciones";
}

function setTab(name) {
  const tab = TABS.includes(name) ? name : "suscripciones";
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.setAttribute("aria-selected", btn.dataset.tab === tab ? "true" : "false");
  });
  document.querySelectorAll("[data-tab-panel]").forEach((panelEl) => {
    panelEl.hidden = panelEl.dataset.tabPanel !== tab;
  });
  if (location.hash.replace(/^#/, "") !== tab) {
    history.replaceState(null, "", `#${tab}`);
  }
  if (tab === "producto") loadProducto();
  if (tab === "trafico") loadTrafico();
  if (tab === "outbound") loadOutbound();
}

function statusLabel(status) {
  if (status === "pro_vigente") return "Pro vigente";
  if (status === "vencida") return "Vencida";
  if (status === "cobro_fallido") return "Cobro fallido";
  return "Gratis";
}

function statusClass(status) {
  if (status === "pro_vigente") return "badge badge-pro";
  if (status === "vencida" || status === "cobro_fallido") return "badge badge-warn";
  return "badge";
}

function providerLabel(provider) {
  if (provider === "mp") return "Mercado Pago";
  if (provider === "flow") return "Flow";
  if (provider === "mp_flow") return "Mercado Pago y Flow";
  return "Ninguno";
}

function vigenciaText(c) {
  const v = c.vigencia || {};
  if (v.kind === "open") return "Abierta (suscripción)";
  if (v.at) {
    const fecha = new Date(v.at).toLocaleDateString("es-CL");
    return v.kind === "expired" ? `Venció el ${fecha}` : `Hasta ${fecha}`;
  }
  return "—";
}

function paymentIdsText(ids) {
  if (!ids || !Object.keys(ids).length) return "—";
  const parts = [];
  if (ids.mpPaymentId) parts.push(`MP pago ${ids.mpPaymentId}`);
  if (ids.mpPreapprovalId) parts.push(`MP suscripción ${ids.mpPreapprovalId}`);
  if (ids.flowOrder) parts.push(`Flow orden ${ids.flowOrder}`);
  if (ids.flowCommerceOrder) parts.push(`Flow comercio ${ids.flowCommerceOrder}`);
  if (ids.flowSubscriptionId) parts.push(`Flow suscripción ${ids.flowSubscriptionId}`);
  return parts.join(" · ") || "—";
}

function sinDato(title) {
  return `<div><strong>sin dato</strong><span>${esc(title)}</span></div>`;
}

function renderResumen(data, listed) {
  const box = el("adminResumen");
  if (!box) return;
  if (!data) {
    box.innerHTML = "";
    return;
  }
  const ingresos = data.ingresosEstimados || {};
  const listedNote =
    data.total != null && listed != null && listed < data.total
      ? `<p class="hint admin-strip-note">La tabla muestra las ${esc(listed)} más recientes de ${esc(data.total)}.</p>`
      : "";
  box.innerHTML = `
    <div><strong>${esc(data.pro)}</strong><span>Pro vigentes</span></div>
    <div><strong>${esc(data.gratis)}</strong><span>Gratis</span></div>
    <div>
      <strong>${esc(clp(ingresos.totalClp ?? data.ingresosEstimadosClp ?? 0))}</strong>
      <span>Ingresos Pro estimados / mes</span>
    </div>
    ${data.proNuevosSemana?.available === false ? sinDato("Pro nuevos esta semana") : `<div><strong>${esc(data.proNuevosSemana)}</strong><span>Pro nuevos esta semana</span></div>`}
    ${data.bajasSemana?.available === false ? sinDato("Bajas esta semana") : `<div><strong>${esc(data.bajasSemana)}</strong><span>Bajas esta semana</span></div>`}
    ${listedNote}
    <p class="hint admin-strip-note">${esc(ingresos.nota || "Estimado: Pro vigentes × ($14.990 + IVA 19 % = $17.838). No es un MRR contable.")}</p>`;
}

function matchesFilter(c) {
  if (filter === "todas") return true;
  if (filter === "pro") return c.status === "pro_vigente";
  if (filter === "gratis") return c.status === "gratis";
  if (filter === "vencidas") return c.status === "vencida";
  if (filter === "cobro_fallido") return c.status === "cobro_fallido";
  return true;
}

function renderCompanies(list) {
  const box = el("tablaEmpresas");
  if (filter === "cobro_fallido") {
    box.innerHTML = `<p class="empty">Sin dato: el esquema no registra cobros fallidos. Solo se infiere Pro vigente, Gratis o vencida a partir de plan y vigencia.</p>`;
    return;
  }
  const rows = list.filter(matchesFilter);
  if (!rows.length) {
    box.innerHTML = `<p class="empty">${list.length ? "No hay empresas en este filtro." : "No hay empresas."}</p>`;
    return;
  }
  box.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Razón social</th>
          <th>Correo</th>
          <th>Plan</th>
          <th>Vigencia</th>
          <th>Proveedor</th>
          <th>Últimos ids de cobro</th>
          <th>Estado</th>
          <th>Excepción</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((c) => {
            return `<tr>
              <td>
                ${esc(c.razonSocial || "—")}
                <div class="hint" style="margin:0">${esc(formatRut(c.rut))}</div>
              </td>
              <td>${esc(c.email || "—")}</td>
              <td>${c.plan === "pro" ? "Pro" : "Gratis"}</td>
              <td>${esc(vigenciaText(c))}</td>
              <td>${esc(providerLabel(c.provider))}</td>
              <td class="admin-pay-ids">${esc(paymentIdsText(c.paymentIds))}</td>
              <td><span class="${statusClass(c.status)}">${esc(statusLabel(c.status))}${c.disabled ? " · deshabilitada" : ""}</span></td>
              <td>
                <details class="admin-excep">
                  <summary>Excepción</summary>
                  <p class="hint">Override de emergencia. La fuente del plan son los cobros confirmados.</p>
                  <div class="worker-actions">
                    <button type="button" class="btn-text" style="margin:0" data-toggle="${esc(c.id)}" data-disabled="${c.disabled ? "1" : "0"}">
                      ${c.disabled ? "Habilitar" : "Deshabilitar"}
                    </button>
                    <button type="button" class="btn-text" style="margin:0" data-plan="${esc(c.id)}" data-next="${c.plan === "pro" ? "gratis" : "pro"}">
                      ${c.plan === "pro" ? "Pasar a Gratis" : "Pasar a Pro"}
                    </button>
                  </div>
                </details>
              </td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;
}

function setFilter(next) {
  filter = next;
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.setAttribute("aria-selected", btn.dataset.filter === filter ? "true" : "false");
  });
  renderCompanies(companies);
}

function renderProducto(data) {
  const box = el("adminProducto");
  if (!data) {
    box.innerHTML = `<p class="empty">Cargando…</p>`;
    return;
  }
  const checkout = `<div><strong>sin dato</strong><span>Checkouts iniciados o pagados (no hay tabla de checkout)</span></div>`;
  box.innerHTML = `
    <div class="admin-strip admin-strip-4">
      <div><strong>${esc(data.accountsNew)}</strong><span>Cuentas nuevas</span></div>
      <div><strong>${esc(data.documents)}</strong><span>Documentos emitidos</span></div>
      <div><strong>${esc(data.movements)}</strong><span>Movimientos</span></div>
      <div><strong>${esc(data.envios)}</strong><span>Envíos por correo</span></div>
      ${checkout}
    </div>
    <p class="hint">Período: últimos ${esc(data.periodDays)} días. Solo se cuentan filas con fecha de alta en ese intervalo.</p>`;
}

function channelLabel(key) {
  if (key === "organic") return "Orgánico";
  if (key === "direct") return "Directo";
  if (key === "referral") return "Referral";
  if (key === "paid") return "Pago (CPC y similares)";
  return "Otro";
}

function renderList(title, items) {
  if (!items?.length) return `<p class="empty">${esc(title)}: sin filas en este período.</p>`;
  return `
    <h3>${esc(title)}</h3>
    <ul class="split-list">
      ${items
        .map((item) => `<li><span>${esc(item.name)}</span><strong>${esc(item.sessions)}</strong></li>`)
        .join("")}
    </ul>`;
}

function renderTrafico(data) {
  const box = el("adminTrafico");
  if (!data) {
    box.innerHTML = `<p class="empty">Cargando…</p>`;
    return;
  }
  if (data.connected === false || data.reason === "ga4_not_configured") {
    const will = (data.willShow || []).map((x) => `<li>${esc(x)}</li>`).join("");
    box.innerHTML = `
      <p class="notice notice-info">GA4 no está conectado. No se muestran visitas inventadas.</p>
      <p>Cuando exista una propiedad y una cuenta de servicio en Vercel, esta pestaña mostrará:</p>
      <ul>${will}</ul>
      <p class="hint">${esc(data.howTo || "En Vercel: ID de la propiedad GA4 y JSON de una cuenta de servicio con permiso Lector. No las suba al repositorio.")}</p>`;
    return;
  }
  if (!data.ok) {
    box.innerHTML = `<p class="notice">No se pudo leer GA4. ${esc(data.error || "Error desconocido.")}</p>`;
    return;
  }
  const ch = data.channels || {};
  box.innerHTML = `
    <div class="admin-strip admin-strip-4">
      <div><strong>${esc(data.sessions)}</strong><span>Sesiones</span></div>
      <div><strong>${esc(data.users)}</strong><span>Usuarios</span></div>
    </div>
    <h3>Canal</h3>
    <ul class="split-list">
      ${["organic", "direct", "referral", "paid", "other"]
        .map((key) => `<li><span>${channelLabel(key)}</span><strong>${esc(ch[key] || 0)}</strong></li>`)
        .join("")}
    </ul>
    ${renderList("Ciudades", data.cities)}
    ${renderList("Países", data.countries)}
    ${renderList("Páginas de entrada", data.landings)}
    <p class="hint">Últimos ${esc(data.periodDays)} días (${esc(data.range?.startDate || "")} → ${esc(data.range?.endDate || "")}).${data.cached ? " Cifras en caché breve." : ""}</p>`;
}

function estadoOutboundLabel(estado) {
  if (estado === "sent") return "Enviado";
  if (estado === "delivered") return "Entregado";
  if (estado === "bounced") return "Rebote";
  if (estado === "complained") return "Queja";
  return "Desconocido";
}

function estadoOutboundClass(estado) {
  if (estado === "delivered") return "badge badge-ok";
  if (estado === "bounced" || estado === "complained") return "badge badge-warn";
  return "badge";
}

function pctEntrega(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n) || n < 0) return "0 %";
  return `${Math.round(n * 1000) / 10} %`.replace(".0 %", " %");
}

function renderOutbound(data) {
  const box = el("adminOutbound");
  if (!data) {
    box.innerHTML = `<p class="empty">Cargando…</p>`;
    return;
  }
  const s = data.summary || {};
  const rows = data.sends || [];
  const table = rows.length
    ? `<div class="table-wrap"><table class="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Empresa</th>
            <th>Correo</th>
            <th>Estado</th>
            <th>Baja</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => {
              const fecha = row.createdAt ? new Date(row.createdAt).toLocaleDateString("es-CL") : "—";
              return `<tr>
                <td>${esc(fecha)}</td>
                <td>${esc(row.empresa || "—")}</td>
                <td>${esc(row.email || "—")}</td>
                <td><span class="${estadoOutboundClass(row.estado)}">${esc(estadoOutboundLabel(row.estado))}</span></td>
                <td>${row.baja ? "Sí" : "No"}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table></div>`
    : `<p class="empty">No hay envíos outbound en este período.</p>`;
  const refreshHint = data.resend?.refresh
    ? " Si hay clave de correo, el estado se actualiza desde Resend para envíos pendientes."
    : " Sin clave de correo se muestra solo el estado guardado.";
  box.innerHTML = `
    <div class="admin-strip admin-strip-4">
      <div><strong>${esc(s.enviados || 0)}</strong><span>Enviados</span></div>
      <div><strong>${esc(s.entregados || 0)}</strong><span>Entregados</span></div>
      <div><strong>${esc(s.rebotes || 0)}</strong><span>Rebotes</span></div>
      <div><strong>${esc(s.bajas || 0)}</strong><span>Bajas</span></div>
      <div><strong>${esc(pctEntrega(s.tasaEntrega))}</strong><span>Tasa de entrega</span></div>
      <div><strong>${esc(s.altasMismoCorreo || 0)}</strong><span>Altas con mismo correo</span></div>
      <div><strong>sin dato</strong><span>Aperturas</span></div>
      <div><strong>sin dato</strong><span>Clics</span></div>
    </div>
    <p class="hint">Período: últimos ${esc(data.periodDays)} días. La tasa es entregados / enviados. Las altas son cuentas Haberes cuyo correo coincide con un envío; no se atribuye desde GA4.${refreshHint}</p>
    ${table}`;
}

async function loadCompanies() {
  showError(el("errEmpresas"), "");
  const { status, data } = await apiGet("/api/admin-companies");
  if (!data?.ok) {
    showError(el("errEmpresas"), authErrorMessage(data, status));
    return;
  }
  companies = data.companies || [];
  summary = { ...(data.summary || {}), listed: data.listed };
  renderResumen(data.summary, data.listed);
  renderCompanies(companies);
}

async function loadProducto() {
  const period = document.querySelector("#productoPeriodo input:checked")?.value || "30";
  if (productoCache[period]) {
    renderProducto(productoCache[period]);
    return;
  }
  showError(el("errProducto"), "");
  renderProducto(null);
  const { status, data } = await apiGet(`/api/admin-producto?period=${encodeURIComponent(period)}`);
  if (!data?.ok) {
    showError(el("errProducto"), authErrorMessage(data, status));
    el("adminProducto").innerHTML = "";
    return;
  }
  productoCache[period] = data.producto;
  renderProducto(data.producto);
}

async function loadTrafico() {
  const period = document.querySelector("#traficoPeriodo input:checked")?.value || "28";
  if (traficoCache[period]) {
    renderTrafico(traficoCache[period]);
    return;
  }
  showError(el("errTrafico"), "");
  renderTrafico(null);
  const { status, data } = await apiGet(`/api/admin-trafico?period=${encodeURIComponent(period)}`);
  if (status === 401 || (data && data.reason === "unauthorized")) {
    showError(el("errTrafico"), "La sesión de administración expiró.");
    el("adminTrafico").innerHTML = "";
    return;
  }
  if (data?.reason === "admin_unavailable" || data?.reason === "db_unavailable") {
    showError(el("errTrafico"), authErrorMessage(data, status));
    el("adminTrafico").innerHTML = "";
    return;
  }
  traficoCache[period] = data;
  renderTrafico(data);
}

async function loadOutbound() {
  const period = document.querySelector("#outboundPeriodo input:checked")?.value || "30";
  if (outboundCache[period]) {
    renderOutbound(outboundCache[period]);
    return;
  }
  showError(el("errOutbound"), "");
  renderOutbound(null);
  const { status, data } = await apiGet(`/api/admin-outbound?period=${encodeURIComponent(period)}`);
  if (!data?.ok) {
    showError(el("errOutbound"), authErrorMessage(data, status));
    el("adminOutbound").innerHTML = "";
    return;
  }
  outboundCache[period] = data;
  renderOutbound(data);
}

async function boot() {
  const { status, data } = await apiGet("/api/admin-me");
  if (data?.ok && data.admin) {
    panel(true);
    el("adminMeta").textContent = data.admin.email;
    setTab(tabFromHash());
    await loadCompanies();
    return;
  }
  panel(false);
  if (data?.reason === "admin_unavailable" || (status === 503 && data?.reason === "admin_unavailable")) {
    showError(el("errAdmin"), "El acceso de administración no está configurado en este servidor. No hay clave por defecto.");
  }
}

boot();

el("formAdmin")?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  showError(el("errAdmin"), "");
  const { status, data } = await apiPost("/api/admin-login", {
    email: val("adminEmail"),
    password: val("adminClave"),
  });
  if (isNoBackend(status, data) && data?.reason !== "admin_unavailable") {
    showError(el("errAdmin"), "No hay servidor de cuentas.");
    return;
  }
  if (!data?.ok) {
    showError(el("errAdmin"), authErrorMessage(data, status));
    return;
  }
  panel(true);
  el("adminMeta").textContent = data.admin?.email || "";
  productoCache = {};
  traficoCache = {};
  outboundCache = {};
  setTab("suscripciones");
  await loadCompanies();
});

el("btnAdminSalir")?.addEventListener("click", async () => {
  await apiPost("/api/admin-logout", {});
  panel(false);
  companies = [];
  summary = null;
  productoCache = {};
  traficoCache = {};
  outboundCache = {};
  el("formAdmin")?.reset();
});

document.querySelectorAll("[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => setTab(btn.dataset.tab));
});

document.querySelectorAll("[data-filter]").forEach((btn) => {
  btn.addEventListener("click", () => setFilter(btn.dataset.filter));
});

el("productoPeriodo")?.addEventListener("change", () => {
  productoCache = {};
  loadProducto();
});

el("traficoPeriodo")?.addEventListener("change", () => {
  traficoCache = {};
  loadTrafico();
});

el("outboundPeriodo")?.addEventListener("change", () => {
  outboundCache = {};
  loadOutbound();
});

el("tablaEmpresas")?.addEventListener("click", async (ev) => {
  const planBtn = ev.target.closest("[data-plan]");
  if (planBtn) {
    showError(el("errEmpresas"), "");
    const { status, data } = await apiPost("/api/admin-companies", {
      id: planBtn.dataset.plan,
      plan: planBtn.dataset.next,
    });
    if (!data?.ok) {
      showError(el("errEmpresas"), authErrorMessage(data, status));
      return;
    }
    await loadCompanies();
    return;
  }
  const btn = ev.target.closest("[data-toggle]");
  if (!btn) return;
  showError(el("errEmpresas"), "");
  const disabled = btn.dataset.disabled !== "1";
  const { status, data } = await apiPost("/api/admin-companies", {
    id: btn.dataset.toggle,
    disabled,
  });
  if (!data?.ok) {
    showError(el("errEmpresas"), authErrorMessage(data, status));
    return;
  }
  await loadCompanies();
});
