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

/**
 * Selector custom (buscable, opcionalmente múltiple). No usa <select> nativo.
 */
export function createPicker(root, opts = {}) {
  if (!root) return null;
  const multiple = Boolean(opts.multiple);
  const searchable = opts.searchable !== false;
  let options = Array.isArray(opts.options) ? opts.options : [];
  let selected = asArray(opts.value);
  const placeholder = opts.placeholder || "Seleccione";
  const onChange = typeof opts.onChange === "function" ? opts.onChange : () => {};

  root.classList.add("picker");
  root.innerHTML = `
    <button type="button" class="picker-trigger" aria-haspopup="listbox" aria-expanded="false">
      <span class="picker-value"></span>
    </button>
    <div class="picker-panel" hidden>
      ${searchable ? `<input type="search" class="picker-search" placeholder="Buscar" autocomplete="off" />` : ""}
      <div class="picker-list" role="listbox" ${multiple ? 'aria-multiselectable="true"' : ""}></div>
    </div>
  `;
  const trigger = root.querySelector(".picker-trigger");
  const valueEl = root.querySelector(".picker-value");
  const panel = root.querySelector(".picker-panel");
  const search = root.querySelector(".picker-search");
  const list = root.querySelector(".picker-list");

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

  function open() {
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    renderList();
    search?.focus();
  }

  function close() {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  function emit() {
    renderValue();
    onChange(multiple ? [...selected] : selected[0] || "");
  }

  trigger.addEventListener("click", () => {
    if (panel.hidden) open();
    else close();
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

  search?.addEventListener("input", renderList);

  document.addEventListener("click", (ev) => {
    if (!root.contains(ev.target)) close();
  });

  renderValue();

  return {
    getValue() {
      return multiple ? [...selected] : selected[0] || "";
    },
    setValue(v) {
      selected = asArray(v);
      renderValue();
      if (!panel.hidden) renderList();
    },
    setOptions(next, keep = true) {
      options = Array.isArray(next) ? next : [];
      if (!keep) selected = [];
      else selected = selected.filter((v) => options.some((o) => String(o.value) === v));
      renderValue();
      if (!panel.hidden) renderList();
    },
  };
}
