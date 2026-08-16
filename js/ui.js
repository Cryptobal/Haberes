import { DISCLAIMER } from "./constants.js";
import { clp, fechaLarga, ufFmt } from "./format.js";
import { getIndicadores } from "./indicadores.js";
import { createPicker } from "./picker.js";
import { wireThemeToggle } from "./theme.js";

export function wireNav() {
  const path = (location.pathname.replace(/\.html$/, "") || "/").replace(/\/$/, "") || "/";
  document.querySelectorAll("[data-nav]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    const key = href.replace(/\.html$/, "").replace(/\/$/, "") || "/";
    if (key === path || (path === "/" && (href === "/" || href === "index.html"))) {
      a.setAttribute("aria-current", "page");
    }
  });
  wireThemeToggle();
}

export async function mountIndicadores() {
  const nodes = document.querySelectorAll("[data-indicadores]");
  if (!nodes.length) return null;
  const ind = await getIndicadores();
  const fecha = ind.fecha
    ? new Date(ind.fecha).toLocaleDateString("es-CL")
    : fechaLarga();
  const fuente =
    ind.fuente === "mindicador" || ind.fuente === "cache"
      ? "mindicador.cl"
      : "valor de respaldo";
  const text = `${ufFmt(ind.uf)} · UTM ${clp(ind.utm).replace("$", "").trim()} · ${fecha} · ${fuente}`;
  nodes.forEach((n) => {
    n.textContent = text;
  });
  const disc = document.querySelectorAll("[data-disclaimer]");
  disc.forEach((n) => {
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
  const now = new Date();
  const items = [];
  for (let i = 0; i < months; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    items.push({
      value,
      label: `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
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
    items.push({
      value,
      label: `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`,
    });
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

export function confirmDialog({ text, okLabel = "Confirmar", cancelLabel = "Cancelar" }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="modal-card">
        <p class="modal-text">${String(text || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</p>
        <div class="actions">
          <button type="button" class="btn btn-danger" data-ok>${okLabel}</button>
          <button type="button" class="btn btn-ghost" data-cancel>${cancelLabel}</button>
        </div>
      </div>`;
    function close(val) {
      overlay.remove();
      resolve(val);
    }
    overlay.querySelector("[data-ok]").addEventListener("click", () => close(true));
    overlay.querySelector("[data-cancel]").addEventListener("click", () => close(false));
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) close(false);
    });
    document.body.appendChild(overlay);
    overlay.querySelector("[data-cancel]").focus();
  });
}
