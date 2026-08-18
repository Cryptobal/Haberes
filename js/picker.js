import { lockScroll, unlockScroll } from "./overlay.js";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function asArray(v) {
  if (Array.isArray(v)) return v.map(String);
  if (v == null || v === "") return [];
  return [String(v)];
}

function isSheet() {
  try {
    return window.matchMedia("(max-width: 899px)").matches;
  } catch {
    return false;
  }
}

const openClosers = new Set();

function closeAllPickers(except) {
  for (const fn of [...openClosers]) {
    if (fn !== except) fn();
  }
}

let docWired = false;
function wireDocumentOnce() {
  if (docWired || typeof document === "undefined") return;
  docWired = true;
  document.addEventListener("pointerdown", (ev) => {
    const t = ev.target;
    for (const fn of [...openClosers]) {
      const root = fn.root;
      if (root && !root.contains(t)) fn();
    }
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && openClosers.size) {
      ev.stopPropagation();
      closeAllPickers();
    }
  });
}

/**
 * Selector custom (buscable, opcionalmente múltiple). No usa <select> nativo.
 * En móvil se abre como hoja inferior con velo; en escritorio como panel anclado.
 * Cerrado por defecto. Un panel a la vez. Escape y clic fuera cierran.
 */
export function createPicker(root, opts = {}) {
  if (!root) return null;
  wireDocumentOnce();
  const multiple = Boolean(opts.multiple);
  const searchable = opts.searchable !== false;
  let options = Array.isArray(opts.options) ? opts.options : [];
  let selected = asArray(opts.value);
  const placeholder = opts.placeholder || "Seleccione";
  const title = opts.title || placeholder;
  const onChange = typeof opts.onChange === "function" ? opts.onChange : () => {};

  root.classList.add("picker");
  root.classList.remove("is-open");
  root.innerHTML = `
    <button type="button" class="picker-trigger" aria-haspopup="listbox" aria-expanded="false">
      <span class="picker-value"></span>
    </button>
    <div class="picker-panel" hidden>
      <div class="picker-sheet-head">
        <div class="picker-sheet-grab" aria-hidden="true"></div>
        <p class="picker-sheet-title">${esc(title)}</p>
      </div>
      <div class="picker-list" role="listbox" ${multiple ? 'aria-multiselectable="true"' : ""}></div>
    </div>
  `;
  const trigger = root.querySelector(".picker-trigger");
  const valueEl = root.querySelector(".picker-value");
  const panel = root.querySelector(".picker-panel");
  const list = root.querySelector(".picker-list");
  let search = null;
  let backdrop = null;
  let activeIndex = -1;

  function isOpen() {
    return !panel.hidden;
  }

  function labelFor(v) {
    return options.find((o) => String(o.value) === String(v))?.label || String(v);
  }

  function renderValue() {
    if (!selected.length) {
      valueEl.textContent = placeholder;
      valueEl.classList.add("is-placeholder");
      return;
    }
    valueEl.classList.remove("is-placeholder");
    if (multiple) {
      valueEl.textContent =
        selected.length === 1 ? labelFor(selected[0]) : `${selected.length} seleccionados`;
    } else {
      valueEl.textContent = labelFor(selected[0]);
    }
  }

  function filtered() {
    const q = String(search?.value || "")
      .trim()
      .toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        String(o.label || "").toLowerCase().includes(q) ||
        String(o.value || "").toLowerCase().includes(q) ||
        String(o.group || "").toLowerCase().includes(q),
    );
  }

  function renderList() {
    const rows = filtered();
    if (!rows.length) {
      list.innerHTML = `<p class="picker-empty">Sin resultados</p>`;
      activeIndex = -1;
      return;
    }
    let html = "";
    let group = null;
    for (const o of rows) {
      if (o.group && o.group !== group) {
        group = o.group;
        html += `<div class="picker-group">${esc(group)}</div>`;
      }
      const on = selected.includes(String(o.value));
      html += `<button type="button" class="picker-option${on ? " is-on" : ""}" role="option" aria-selected="${on}" data-value="${esc(o.value)}"><span>${esc(o.label)}</span></button>`;
    }
    list.innerHTML = html;
    activeIndex = [...list.querySelectorAll(".picker-option")].findIndex((b) =>
      b.classList.contains("is-on"),
    );
    highlight();
  }

  function optionNodes() {
    return [...list.querySelectorAll(".picker-option")];
  }

  function highlight() {
    const nodes = optionNodes();
    nodes.forEach((n, i) => n.classList.toggle("is-active", i === activeIndex));
    if (activeIndex >= 0) {
      nodes[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }

  function move(delta) {
    const nodes = optionNodes();
    if (!nodes.length) return;
    activeIndex = (activeIndex + delta + nodes.length) % nodes.length;
    highlight();
  }

  function mountSearch() {
    if (!searchable || search) return;
    search = document.createElement("input");
    search.type = "search";
    search.className = "picker-search";
    search.placeholder = "Buscar";
    search.autocomplete = "off";
    search.addEventListener("input", renderList);
    panel.insertBefore(search, list);
  }

  function unmountSearch() {
    if (!search) return;
    search.remove();
    search = null;
  }

  function mountBackdrop() {
    if (backdrop || !isSheet()) return;
    backdrop = document.createElement("div");
    backdrop.className = "picker-backdrop";
    backdrop.addEventListener("pointerdown", () => close());
    document.body.appendChild(backdrop);
    lockScroll();
  }

  function unmountBackdrop() {
    if (!backdrop) return;
    backdrop.remove();
    backdrop = null;
    unlockScroll();
  }

  function close() {
    if (panel.hidden && !root.classList.contains("is-open")) return;
    panel.hidden = true;
    root.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    unmountSearch();
    unmountBackdrop();
    openClosers.delete(close);
  }

  function open() {
    closeAllPickers(close);
    mountSearch();
    mountBackdrop();
    panel.hidden = false;
    root.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    renderList();
    if (!isSheet()) search?.focus();
    openClosers.add(close);
  }

  close.root = root;

  function emit() {
    renderValue();
    onChange(multiple ? [...selected] : selected[0] || "");
  }

  function pick(v) {
    if (multiple) {
      if (selected.includes(v)) selected = selected.filter((x) => x !== v);
      else selected = [...selected, v];
      renderList();
      emit();
    } else {
      selected = [v];
      emit();
      close();
      trigger.focus();
    }
  }

  root.addEventListener("pointerdown", (ev) => ev.stopPropagation());

  trigger.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (isOpen()) close();
    else open();
  });

  root.addEventListener("keydown", (ev) => {
    if (!isOpen()) {
      if (ev.key === "ArrowDown" || ev.key === "Enter" || ev.key === " ") {
        if (document.activeElement === trigger) {
          ev.preventDefault();
          open();
        }
      }
      return;
    }
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      move(1);
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      move(-1);
    } else if (ev.key === "Enter") {
      const node = optionNodes()[activeIndex];
      if (node) {
        ev.preventDefault();
        pick(node.dataset.value);
      }
    } else if (ev.key === "Tab") {
      close();
    }
  });

  list.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-value]");
    if (!btn) return;
    pick(btn.dataset.value);
  });

  renderValue();
  close();

  return {
    getValue() {
      return multiple ? [...selected] : selected[0] || "";
    },
    setValue(v) {
      selected = asArray(v);
      renderValue();
      if (isOpen()) renderList();
    },
    setOptions(next, keep = true) {
      options = Array.isArray(next) ? next : [];
      if (!keep) selected = [];
      else selected = selected.filter((v) => options.some((o) => String(o.value) === v));
      renderValue();
      if (isOpen()) renderList();
    },
    close,
    open,
  };
}

const MESES_CAL = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const DOW_CAL = ["L", "M", "X", "J", "V", "S", "D"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseIsoDate(raw) {
  const m = String(raw || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`);
  if (Number.isNaN(dt.getTime()) || dt.getMonth() + 1 !== mo) return null;
  return { y, mo, d };
}

function clampDay(y, mo, d) {
  const last = new Date(y, mo, 0).getDate();
  return Math.min(Math.max(1, d), last);
}

function toIso(y, mo, d) {
  const day = clampDay(y, mo, d);
  return `${y}-${pad2(mo)}-${pad2(day)}`;
}

function formatDateEs(iso) {
  const p = parseIsoDate(iso);
  if (!p) return "";
  return `${p.d} de ${MESES_CAL[p.mo - 1]} de ${p.y}`;
}

function yearBounds() {
  const now = new Date();
  return { min: 1980, max: now.getFullYear() + 1 };
}

/**
 * Fecha como un solo campo legible («15 de enero de 2020»).
 * El panel es calendario (popover en escritorio, hoja inferior en móvil).
 * No usa <input type="date"> ni un modal que tape el formulario.
 */
export function createDateField(root, { value, onChange, title, placeholder } = {}) {
  if (!root) return null;
  wireDocumentOnce();
  const now = new Date();
  const parsed = parseIsoDate(value);
  let y = parsed ? parsed.y : now.getFullYear();
  let mo = parsed ? parsed.mo : now.getMonth() + 1;
  let d = parsed ? parsed.d : now.getDate();
  let viewY = y;
  let viewMo = mo;
  let mode = "days";
  const bounds = yearBounds();
  const sheetTitle = title || placeholder || "Fecha";
  const emptyLabel = placeholder || "Elija una fecha";

  root.classList.add("picker", "date-field");
  root.classList.remove("is-open");
  root.innerHTML = `
    <button type="button" class="picker-trigger" aria-haspopup="dialog" aria-expanded="false">
      <span class="picker-value"></span>
    </button>
    <div class="picker-panel date-cal-panel" hidden role="dialog">
      <div class="picker-sheet-head">
        <div class="picker-sheet-grab" aria-hidden="true"></div>
        <p class="picker-sheet-title">${esc(sheetTitle)}</p>
      </div>
      <div class="date-cal-toolbar">
        <button type="button" class="date-cal-nav" data-cal-prev aria-label="Anterior">‹</button>
        <button type="button" class="date-cal-caption" data-cal-caption></button>
        <button type="button" class="date-cal-nav" data-cal-next aria-label="Siguiente">›</button>
      </div>
      <div class="date-cal-body" data-cal-body></div>
    </div>
  `;

  const trigger = root.querySelector(".picker-trigger");
  const valueEl = root.querySelector(".picker-value");
  const panel = root.querySelector(".picker-panel");
  const captionBtn = root.querySelector("[data-cal-caption]");
  const body = root.querySelector("[data-cal-body]");
  let backdrop = null;

  function iso() {
    return toIso(y, mo, d);
  }

  function renderValue() {
    const label = formatDateEs(iso());
    valueEl.textContent = label || emptyLabel;
    valueEl.classList.toggle("is-placeholder", !label);
    trigger.setAttribute("aria-label", label ? `${sheetTitle}: ${label}` : sheetTitle);
  }

  function isOpen() {
    return !panel.hidden;
  }

  function mountBackdrop() {
    if (backdrop || !isSheet()) return;
    backdrop = document.createElement("div");
    backdrop.className = "picker-backdrop";
    backdrop.addEventListener("pointerdown", () => close());
    document.body.appendChild(backdrop);
    lockScroll();
  }

  function unmountBackdrop() {
    if (!backdrop) return;
    backdrop.remove();
    backdrop = null;
    unlockScroll();
  }

  function close() {
    if (panel.hidden && !root.classList.contains("is-open")) return;
    panel.hidden = true;
    root.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    unmountBackdrop();
    openClosers.delete(close);
    mode = "days";
  }

  function open() {
    closeAllPickers(close);
    viewY = y;
    viewMo = mo;
    mode = "days";
    mountBackdrop();
    panel.hidden = false;
    root.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    renderCal();
    openClosers.add(close);
  }

  close.root = root;

  function shiftView(delta) {
    if (mode === "years") {
      viewY += delta * 12;
    } else if (mode === "months") {
      viewY += delta;
    } else {
      viewMo += delta;
      if (viewMo < 1) {
        viewMo = 12;
        viewY -= 1;
      } else if (viewMo > 12) {
        viewMo = 1;
        viewY += 1;
      }
    }
    viewY = Math.min(bounds.max, Math.max(bounds.min, viewY));
    renderCal();
  }

  function pickDay(ny, nmo, nd) {
    y = ny;
    mo = nmo;
    d = clampDay(ny, nmo, nd);
    renderValue();
    onChange?.(iso());
    close();
    trigger.focus();
  }

  function renderCal() {
    if (mode === "years") {
      captionBtn.textContent = `${viewY} – ${viewY + 11}`;
      let html = `<div class="date-cal-years">`;
      for (let i = 0; i < 12; i += 1) {
        const yr = viewY + i;
        const on = yr === y;
        const disabled = yr < bounds.min || yr > bounds.max;
        html += `<button type="button" class="date-cal-cell${on ? " is-on" : ""}" data-cal-year="${yr}" ${
          disabled ? "disabled" : ""
        }>${yr}</button>`;
      }
      html += `</div>`;
      body.innerHTML = html;
      return;
    }
    if (mode === "months") {
      captionBtn.textContent = String(viewY);
      let html = `<div class="date-cal-months">`;
      for (let i = 0; i < 12; i += 1) {
        const on = viewY === y && i + 1 === mo;
        html += `<button type="button" class="date-cal-cell${on ? " is-on" : ""}" data-cal-month="${i + 1}">${esc(
          MESES_CAL[i],
        )}</button>`;
      }
      html += `</div>`;
      body.innerHTML = html;
      return;
    }

    captionBtn.textContent = `${MESES_CAL[viewMo - 1]} ${viewY}`;
    const first = new Date(viewY, viewMo - 1, 1);
    const start = (first.getDay() + 6) % 7;
    const dim = new Date(viewY, viewMo, 0).getDate();
    const prevDim = new Date(viewY, viewMo - 1, 0).getDate();
    const today = new Date();
    let html = `<div class="date-cal-grid" role="grid" aria-label="${esc(MESES_CAL[viewMo - 1])} ${viewY}">`;
    html += DOW_CAL.map((d0) => `<span class="date-cal-dow">${d0}</span>`).join("");
    for (let i = 0; i < 42; i += 1) {
      let cellY = viewY;
      let cellMo = viewMo;
      let cellD;
      let muted = false;
      if (i < start) {
        cellD = prevDim - start + i + 1;
        cellMo = viewMo - 1;
        if (cellMo < 1) {
          cellMo = 12;
          cellY -= 1;
        }
        muted = true;
      } else if (i - start + 1 > dim) {
        cellD = i - start - dim + 1;
        cellMo = viewMo + 1;
        if (cellMo > 12) {
          cellMo = 1;
          cellY += 1;
        }
        muted = true;
      } else {
        cellD = i - start + 1;
      }
      const on = cellY === y && cellMo === mo && cellD === d;
      const isToday =
        cellY === today.getFullYear() && cellMo === today.getMonth() + 1 && cellD === today.getDate();
      html += `<button type="button" class="date-cal-day${muted ? " is-muted" : ""}${on ? " is-on" : ""}${
        isToday ? " is-today" : ""
      }" data-cal-y="${cellY}" data-cal-m="${cellMo}" data-cal-d="${cellD}" aria-selected="${on}">${cellD}</button>`;
    }
    html += `</div>`;
    body.innerHTML = html;
  }

  root.addEventListener("pointerdown", (ev) => ev.stopPropagation());

  trigger.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (isOpen()) close();
    else open();
  });

  root.querySelector("[data-cal-prev]").addEventListener("click", () => shiftView(-1));
  root.querySelector("[data-cal-next]").addEventListener("click", () => shiftView(1));
  captionBtn.addEventListener("click", () => {
    if (mode === "days") mode = "months";
    else if (mode === "months") mode = "years";
    else mode = "days";
    renderCal();
  });

  body.addEventListener("click", (ev) => {
    const yearBtn = ev.target.closest("[data-cal-year]");
    if (yearBtn) {
      viewY = Number(yearBtn.dataset.calYear);
      mode = "months";
      renderCal();
      return;
    }
    const monthBtn = ev.target.closest("[data-cal-month]");
    if (monthBtn) {
      viewMo = Number(monthBtn.dataset.calMonth);
      mode = "days";
      renderCal();
      return;
    }
    const dayBtn = ev.target.closest("[data-cal-d]");
    if (!dayBtn) return;
    pickDay(Number(dayBtn.dataset.calY), Number(dayBtn.dataset.calM), Number(dayBtn.dataset.calD));
  });

  root.addEventListener("keydown", (ev) => {
    if (!isOpen()) {
      if (ev.key === "ArrowDown" || ev.key === "Enter" || ev.key === " ") {
        if (document.activeElement === trigger) {
          ev.preventDefault();
          open();
        }
      }
      return;
    }
    if (ev.key === "Tab") close();
  });

  renderValue();
  close();

  return {
    getValue: iso,
    setValue(next) {
      const p = parseIsoDate(next);
      if (!p) return;
      y = p.y;
      mo = p.mo;
      d = p.d;
      viewY = y;
      viewMo = mo;
      renderValue();
      if (isOpen()) renderCal();
    },
    close,
    open,
  };
}

export { closeAllPickers };
