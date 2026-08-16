import { DISCLAIMER } from "./constants.js";
import { clp, fechaLarga, ufFmt } from "./format.js";
import { getIndicadores } from "./indicadores.js";

export function wireNav() {
  const path = (location.pathname.replace(/\.html$/, "") || "/").replace(/\/$/, "") || "/";
  document.querySelectorAll("[data-nav]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    const key = href.replace(/\.html$/, "").replace(/\/$/, "") || "/";
    if (key === path || (path === "/" && (href === "/" || href === "index.html"))) {
      a.setAttribute("aria-current", "page");
    }
  });
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
