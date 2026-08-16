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
    if (ev.key === "Escape") closeAllPickers();
  });
}

/**
 * Selector custom (buscable, opcionalmente múltiple). No usa <select> nativo.
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
  const onChange = typeof opts.onChange === "function" ? opts.onChange : () => {};

  root.classList.add("picker");
  root.classList.remove("is-open");
  root.innerHTML = `
    <button type="button" class="picker-trigger" aria-haspopup="listbox" aria-expanded="false">
      <span class="picker-value"></span>
    </button>
    <div class="picker-panel" hidden>
      <div class="picker-list" role="listbox" ${multiple ? 'aria-multiselectable="true"' : ""}></div>
    </div>
  `;
  const trigger = root.querySelector(".picker-trigger");
  const valueEl = root.querySelector(".picker-value");
  const panel = root.querySelector(".picker-panel");
  const list = root.querySelector(".picker-list");
  let search = null;

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
      html += `<button type="button" class="picker-option${on ? " is-on" : ""}" role="option" aria-selected="${on}" data-value="${esc(o.value)}">${esc(o.label)}</button>`;
    }
    list.innerHTML = html;
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

  function close() {
    if (panel.hidden && !root.classList.contains("is-open")) return;
    panel.hidden = true;
    root.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    unmountSearch();
    openClosers.delete(close);
  }

  function open() {
    closeAllPickers(close);
    mountSearch();
    panel.hidden = false;
    root.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    renderList();
    search?.focus();
    openClosers.add(close);
  }

  close.root = root;

  function emit() {
    renderValue();
    onChange(multiple ? [...selected] : selected[0] || "");
  }

  root.addEventListener("pointerdown", (ev) => ev.stopPropagation());

  trigger.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (isOpen()) close();
    else open();
  });

  list.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-value]");
    if (!btn) return;
    const v = btn.dataset.value;
    if (multiple) {
      if (selected.includes(v)) selected = selected.filter((x) => x !== v);
      else selected = [...selected, v];
      renderList();
      emit();
    } else {
      selected = [v];
      emit();
      close();
    }
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
