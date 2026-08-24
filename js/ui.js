import { apiGet, apiPost } from "./api.js";
import { DISCLAIMER } from "./constants.js";
import { clp, fechaLarga, ufFmt } from "./format.js";
import { getIndicadores } from "./indicadores.js";
import { isPro } from "./plan.js";
import {
  alertDialog,
  confirmDialog,
  lockScroll,
  openDialog,
  toast,
  toastError,
  toastInfo,
  toastOk,
  trapFocus,
  unlockScroll,
} from "./overlay.js";
import { createDateField } from "./picker.js";
import { clearSession, empresaActual, ensureLocalEmpresa } from "./storage.js";
import { wireThemeToggle } from "./theme.js";

export {
  alertDialog,
  confirmDialog,
  lockScroll,
  openDialog,
  toast,
  toastError,
  toastInfo,
  toastOk,
  trapFocus,
  unlockScroll,
};

function currentPath() {
  return (location.pathname.replace(/\.html$/, "") || "/").replace(/\/$/, "") || "/";
}

function markCurrent(scope) {
  const path = currentPath();
  scope.querySelectorAll("[data-nav]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    const key = href.replace(/\.html$/, "").replace(/\/$/, "") || "/";
    if (key === path || (path === "/" && (href === "/" || href === "index.html"))) {
      a.setAttribute("aria-current", "page");
    }
  });
}

function drawerClosed(drawer) {
  return drawer.hasAttribute("hidden");
}

function setDrawerHidden(drawer, hide) {
  if (hide) {
    drawer.setAttribute("hidden", "");
    drawer.hidden = true;
  } else {
    drawer.removeAttribute("hidden");
    drawer.hidden = false;
  }
}

/**
 * Cajón de navegación móvil. Es marcado propio: no hay <dialog> nativo.
 * Se cierra con Escape, con el velo, con Cerrar o al elegir un enlace.
 * Vive en document.body: si queda dentro de .site-header (sticky +
 * backdrop-filter) el position:fixed se ancla a la cabecera y el panel
 * no llega al fondo de la pantalla.
 */
function wireDrawer() {
  const burger = document.querySelector("[data-nav-burger]");
  const drawer = document.querySelector("[data-nav-drawer]");
  if (!burger || !drawer) return;
  if (burger.dataset.wired === "1") return;
  burger.dataset.wired = "1";

  if (document.body && drawer.parentElement !== document.body) {
    document.body.append(drawer);
  }

  let release = null;

  function open() {
    setDrawerHidden(drawer, false);
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Cerrar menú");
    try {
      lockScroll();
    } catch {
      /* el cajón ya está a la vista */
    }
    try {
      release = trapFocus(drawer);
      drawer.querySelector("a, button")?.focus?.({ preventScroll: true });
    } catch {
      release = null;
    }
  }

  function close() {
    if (drawerClosed(drawer)) return;
    setDrawerHidden(drawer, true);
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Abrir menú");
    try {
      release?.();
    } catch {
      /* ignore */
    }
    release = null;
    try {
      unlockScroll();
    } catch {
      /* ignore */
    }
    try {
      burger.focus({ preventScroll: true });
    } catch {
      /* ignore */
    }
  }

  burger.addEventListener("click", (ev) => {
    ev.preventDefault();
    drawerClosed(drawer) ? open() : close();
  });
  drawer.querySelector("[data-nav-scrim]")?.addEventListener("click", close);
  bindDrawerLinks = () => {
    drawer.querySelectorAll("a").forEach((a) => {
      if (a.dataset.navCloseWired === "1") return;
      a.dataset.navCloseWired = "1";
      a.addEventListener("click", close);
    });
    const closeBtn = drawer.querySelector("[data-nav-close]");
    if (closeBtn && closeBtn.dataset.navCloseWired !== "1") {
      closeBtn.dataset.navCloseWired = "1";
      closeBtn.addEventListener("click", close);
    }
  };
  bindDrawerLinks();
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !drawerClosed(drawer)) close();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 900) close();
  });
}

function companyInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "E";
  const a = parts[0][0] || "E";
  const b = parts.length > 1 ? parts[1][0] : parts[0][1] || "";
  return `${a}${b}`.toUpperCase();
}

function escapeAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function accountChipHtml(emp) {
  const pro = isPro(emp);
  const initials = companyInitials(emp.razonSocial);
  const logo = emp.hasLogo ? `<img src="/api/logo" alt="" />` : "";
  return `<a class="nav-account" href="/empresa" data-nav title="${escapeAttr(emp.razonSocial || "Empresa")}">
      <span class="nav-avatar">${logo}<span>${initials}</span></span>
      <span class="nav-account-name">${escapeAttr(emp.razonSocial || "Empresa")}</span>
      <span class="badge ${pro ? "badge-pro" : ""}">${pro ? "Pro" : "Gratis"}</span>
    </a>`;
}

function paintLoggedOutNav() {
  /* El HTML estático ya es el chrome desconectado. */
}

function paintLoggedInNav(emp) {
  const links = document.querySelector(".nav-links");
  if (links) {
    links.innerHTML = `
        <a href="/como" data-nav>Cómo</a>
        <a href="/precios" data-nav>Precios</a>
        <a href="/empresa" data-nav>Mi empresa</a>`;
  }
  const actions = document.querySelector(".nav-actions");
  if (actions) {
    const theme = actions.querySelector("[data-theme-toggle]");
    const burger = actions.querySelector("[data-nav-burger]");
    const extras = document.createElement("div");
    extras.innerHTML = `${accountChipHtml(emp)}
        <button type="button" class="btn btn-ghost btn-sm nav-salir" data-nav-salir>Salir</button>`;
    actions.querySelectorAll(".nav-login, .nav-cta, .nav-account, .nav-salir").forEach((n) => n.remove());
    if (theme) theme.after(...extras.childNodes);
    else if (burger) actions.insertBefore(extras, burger);
    else actions.append(...extras.childNodes);
  }
  const panel = document.querySelector(".nav-drawer-panel");
  if (panel) {
    const grab = panel.querySelector(".nav-drawer-grab");
    const foot = panel.querySelector(".nav-drawer-foot");
    panel.querySelectorAll("a[data-nav], .nav-drawer-account").forEach((n) => n.remove());
    const mid = document.createElement("div");
    mid.innerHTML = `
        <div class="nav-drawer-account">${accountChipHtml(emp)}</div>
        <a href="/como" data-nav>Cómo</a>
        <a href="/precios" data-nav>Precios</a>
        <a href="/empresa" data-nav>Mi empresa</a>
        <a href="/sueldo" data-nav>Sueldo líquido</a>
        <a href="/horas-extras" data-nav>Horas extras</a>
        <a href="/gratificacion" data-nav>Gratificación</a>
        <a href="/impuesto-unico" data-nav>Impuesto único</a>
        <a href="/vacaciones-proporcionales" data-nav>Vacaciones proporcionales</a>
        <a href="/finiquito" data-nav>Finiquito</a>`;
    const anchor = foot || null;
    for (const node of [...mid.childNodes]) {
      panel.insertBefore(node, anchor);
    }
    if (foot) {
      foot.innerHTML = `
          <button type="button" class="btn" data-nav-salir>Salir</button>
          <button type="button" class="btn btn-ghost" data-nav-close>Cerrar</button>`;
    }
    if (grab && grab.parentElement !== panel) panel.prepend(grab);
  }
}

async function salirEmpresa() {
  const ok = await confirmDialog({
    title: "Cerrar sesión",
    text: "La nómina de este mes queda guardada en este navegador. ¿Cerrar sesión?",
    okLabel: "Cerrar sesión",
    danger: false,
  });
  if (!ok) return;
  await apiPost("/api/logout", {});
  clearSession();
  location.reload();
}

function bindSalir() {
  document.querySelectorAll("[data-nav-salir]").forEach((btn) => {
    if (btn.dataset.wired === "1") return;
    btn.dataset.wired = "1";
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      salirEmpresa();
    });
  });
}

function hydrateAccountNav() {
  const emp = empresaActual();
  if (emp) paintLoggedInNav(emp);
  else paintLoggedOutNav();
  bindSalir();
  refreshNavFromServer();
}

export function refreshAccountNav() {
  const emp = empresaActual();
  if (!emp) return;
  const chips = document.querySelectorAll(".nav-account");
  if (chips.length) {
    const pro = isPro(emp);
    chips.forEach((chip) => {
      const badge = chip.querySelector(".badge");
      if (badge) {
        badge.textContent = pro ? "Pro" : "Gratis";
        badge.className = pro ? "badge badge-pro" : "badge";
      }
      const name = chip.querySelector(".nav-account-name");
      if (name) name.textContent = emp.razonSocial || "Empresa";
    });
    return;
  }
  paintLoggedInNav(emp);
  markCurrent(document);
  bindSalir();
  bindDrawerLinks();
}

async function refreshNavFromServer() {
  try {
    const { data } = await apiGet("/api/me");
    if (!data?.ok || !data.company) return;
    ensureLocalEmpresa(data.company);
    const emp = empresaActual();
    if (!emp) return;
    paintLoggedInNav(emp);
    markCurrent(document);
    bindSalir();
    bindDrawerLinks();
  } catch {
    /* sin servidor la cabecera sigue con la sesión local */
  }
}

let bindDrawerLinks = () => {};

export function wireNav() {
  try {
    hydrateAccountNav();
  } catch {
    /* ignore */
  }
  try {
    markCurrent(document);
  } catch {
    /* ignore */
  }
  try {
    wireDrawer();
  } catch {
    /* ignore */
  }
  try {
    wireThemeToggle();
  } catch {
    /* ignore */
  }
}

export async function mountIndicadores() {
  const nodes = document.querySelectorAll("[data-indicadores]");
  if (!nodes.length) return null;
  const ind = await getIndicadores();
  const fecha = ind.fecha ? new Date(ind.fecha).toLocaleDateString("es-CL") : fechaLarga();
  const fuente =
    ind.fuente === "mindicador" || ind.fuente === "cache" ? "mindicador.cl" : "valor de respaldo";
  const text = `${ufFmt(ind.uf)} · UTM ${clp(ind.utm).replace("$", "").trim()} · ${fecha} · ${fuente}`;
  nodes.forEach((n) => {
    n.textContent = text;
  });
  document.querySelectorAll("[data-disclaimer]").forEach((n) => {
    if (!n.textContent.trim()) n.textContent = DISCLAIMER;
  });
  return ind;
}

export function el(id) {
  return document.getElementById(id);
}

export function val(id) {
  return el(id)?.value;
}

export function numVal(id) {
  const raw = val(id);
  if (raw == null || raw === "") return 0;
  const n = Number(String(raw).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function showError(node, msg) {
  if (!node) return;
  node.hidden = !msg;
  node.textContent = msg || "";
  if (msg) node.setAttribute("role", "alert");
}

export function showOk(node, msg) {
  if (!node) return;
  node.hidden = !msg;
  node.textContent = msg || "";
}

/** Marca un botón como ocupado sin cambiar su ancho ni permitir doble envío. */
export function setBusy(node, busy, busyLabel) {
  if (!node) return;
  if (busy) {
    if (!node.dataset.label) node.dataset.label = node.textContent;
    node.classList.add("is-busy");
    node.setAttribute("aria-busy", "true");
    if (busyLabel) node.textContent = busyLabel;
  } else {
    node.classList.remove("is-busy");
    node.removeAttribute("aria-busy");
    if (node.dataset.label) {
      node.textContent = node.dataset.label;
      delete node.dataset.label;
    }
  }
}

/** Envuelve una acción asíncrona con estado ocupado y captura de error. */
export async function withBusy(node, fn, busyLabel) {
  setBusy(node, true, busyLabel);
  try {
    return await fn();
  } finally {
    setBusy(node, false);
  }
}

export const MESES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function fillSelect(select, items, selected) {
  if (!select) return;
  const cur = selected == null ? select.value : String(selected);
  select.innerHTML = items
    .map(
      (it) =>
        `<option value="${String(it.value).replace(/"/g, "&quot;")}"${
          String(it.value) === cur ? " selected" : ""
        }>${it.label}</option>`,
    )
    .join("");
}

export function fillDaySelect(select, selected) {
  fillSelect(
    select,
    Array.from({ length: 31 }, (_, i) => ({ value: pad2(i + 1), label: String(i + 1) })),
    selected,
  );
}

export function fillMonthSelect(select, selected) {
  fillSelect(
    select,
    MESES_ES.map((nombre, i) => ({ value: pad2(i + 1), label: nombre })),
    selected,
  );
}

export function fillYearSelect(select, { from = 1980, to, selected } = {}) {
  const end = to || new Date().getFullYear() + 1;
  const years = [];
  for (let y = end; y >= from; y -= 1) years.push({ value: String(y), label: String(y) });
  fillSelect(select, years, selected);
}

export function fillPeriodoSelect(select, { months = 36, selected } = {}) {
  if (!select) return;
  const items = periodoItems(months);
  fillSelect(select, items, selected || items[0]?.value);
}

export function periodoLabel(value) {
  const m = String(value || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return String(value || "");
  const month = Number(m[2]) - 1;
  if (month < 0 || month > 11) return String(value);
  return `${MESES_ES[month]} ${m[1]}`;
}

export function readDateParts(prefix) {
  const d = val(`${prefix}D`);
  const m = val(`${prefix}M`);
  const y = val(`${prefix}Y`);
  if (!d || !m || !y) return "";
  const dt = new Date(`${y}-${m}-${d}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return "";
  if (dt.getMonth() + 1 !== Number(m)) return "";
  return `${y}-${m}-${d}`;
}

export function setDateParts(prefix, iso) {
  const raw = String(iso || "");
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const now = new Date();
  const y = m ? m[1] : String(now.getFullYear());
  const mo = m ? m[2] : pad2(now.getMonth() + 1);
  const d = m ? m[3] : pad2(now.getDate());
  fillDaySelect(el(`${prefix}D`), d);
  fillMonthSelect(el(`${prefix}M`), mo);
  fillYearSelect(el(`${prefix}Y`), { selected: y });
}

export function mountDateParts(prefix, iso) {
  setDateParts(prefix, iso);
}

export function diasDelMesHasta(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return 30;
  return Math.min(30, Math.max(1, Number(m[3])));
}

export function periodoItems(months = 36) {
  const now = new Date();
  const items = [];
  for (let i = 0; i < months; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    items.push({ value, label: `${MESES_ES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return items;
}

export function createDateFields(root, opts = {}) {
  return createDateField(root, opts);
}
