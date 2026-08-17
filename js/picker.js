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

export { closeAllPickers };
