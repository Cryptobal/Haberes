import { apiGet, apiPost, authErrorMessage, isNoBackend } from "./api.js";
import { formatRut } from "./format.js";
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

function panel(logged) {
  el("adminAuth").hidden = logged;
  el("adminApp").hidden = !logged;
}

function renderCompanies(list) {
  const box = el("tablaEmpresas");
  if (!list.length) {
    box.innerHTML = `<p class="empty">No hay empresas.</p>`;
    return;
  }
  box.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Razón social</th>
          <th>RUT</th>
          <th>Correo</th>
          <th>Alta</th>
          <th>Logo</th>
          <th>PDF</th>
          <th>Plan</th>
          <th>Estado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${list
          .map((c) => {
            const alta = c.createdAt
              ? new Date(c.createdAt).toLocaleDateString("es-CL")
              : "—";
            return `<tr>
              <td>${esc(c.razonSocial || "—")}</td>
              <td>${esc(formatRut(c.rut))}</td>
              <td>${esc(c.email || "—")}</td>
              <td>${alta}</td>
              <td>${c.hasLogo ? "Sí" : "No"}</td>
              <td>${c.documentos}</td>
              <td>${c.plan === "pro" ? "Pro" : "Gratis"}</td>
              <td>${c.disabled ? "Deshabilitada" : "Activa"}</td>
              <td>
                <div class="worker-actions">
                  <button type="button" class="btn-text" style="margin:0" data-toggle="${esc(c.id)}" data-disabled="${c.disabled ? "1" : "0"}">
                    ${c.disabled ? "Habilitar" : "Deshabilitar"}
                  </button>
                  <button type="button" class="btn-text" style="margin:0" data-plan="${esc(c.id)}" data-next="${c.plan === "pro" ? "gratis" : "pro"}">
                    ${c.plan === "pro" ? "Pasar a Gratis" : "Pasar a Pro"}
                  </button>
                </div>
              </td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;
}

async function loadCompanies() {
  showError(el("errEmpresas"), "");
  const { status, data } = await apiGet("/api/admin-companies");
  if (!data?.ok) {
    showError(el("errEmpresas"), authErrorMessage(data, status));
    return;
  }
  renderCompanies(data.companies || []);
}

async function boot() {
  const { status, data } = await apiGet("/api/admin-me");
  if (data?.ok && data.admin) {
    panel(true);
    el("adminMeta").textContent = data.admin.email;
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
  await loadCompanies();
});

el("btnAdminSalir")?.addEventListener("click", async () => {
  await apiPost("/api/admin-logout", {});
  panel(false);
  el("formAdmin")?.reset();
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
