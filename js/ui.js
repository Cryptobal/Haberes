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
