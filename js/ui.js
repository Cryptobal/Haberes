import { DISCLAIMER } from "./constants.js";
import { clp, fechaLarga, ufFmt } from "./format.js";
import { getIndicadores } from "./indicadores.js";
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
import { createPicker } from "./picker.js";
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
  drawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
  drawer.querySelector("[data-nav-close]")?.addEventListener("click", close);
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !drawerClosed(drawer)) close();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 900) close();
  });
}

export function wireNav() {
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

export function createDateFields(root, { value, onChange } = {}) {
  if (!root) return null;
  root.classList.add("date-selects");
  root.innerHTML = `<div data-pick-d></div><div data-pick-m></div><div data-pick-y></div>`;
  const now = new Date();
  const m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  let y = m ? m[1] : String(now.getFullYear());
  let mo = m ? m[2] : pad2(now.getMonth() + 1);
  let d = m ? m[3] : pad2(now.getDate());

  const days = Array.from({ length: 31 }, (_, i) => ({ value: pad2(i + 1), label: String(i + 1) }));
  const months = MESES_ES.map((nombre, i) => ({ value: pad2(i + 1), label: nombre }));
  const years = [];
  const end = now.getFullYear() + 1;
  for (let yr = end; yr >= 1980; yr -= 1) years.push({ value: String(yr), label: String(yr) });

  function iso() {
    const dt = new Date(`${y}-${mo}-${d}T12:00:00`);
    if (Number.isNaN(dt.getTime())) return "";
    if (dt.getMonth() + 1 !== Number(mo)) return "";
    return `${y}-${mo}-${d}`;
  }

  function emit() {
    onChange?.(iso());
  }

  const pd = createPicker(root.querySelector("[data-pick-d]"), {
    options: days,
    value: d,
    searchable: false,
    placeholder: "Día",
    title: "Día",
    onChange: (v) => {
      d = v;
      emit();
    },
  });
  const pm = createPicker(root.querySelector("[data-pick-m]"), {
    options: months,
    value: mo,
    searchable: true,
    placeholder: "Mes",
    title: "Mes",
    onChange: (v) => {
      mo = v;
      emit();
    },
  });
  const py = createPicker(root.querySelector("[data-pick-y]"), {
    options: years,
    value: y,
    searchable: true,
    placeholder: "Año",
    title: "Año",
    onChange: (v) => {
      y = v;
      emit();
    },
  });

  return {
    getValue: iso,
    setValue(next) {
      const mm = String(next || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!mm) return;
      y = mm[1];
      mo = mm[2];
      d = mm[3];
      pd.setValue(d);
      pm.setValue(mo);
      py.setValue(y);
    },
  };
}
