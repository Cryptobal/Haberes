/**
 * Isotype Haberes: H de dos columnas (5 barras redondeadas + puente).
 * Geometría en viewBox 32×32, coordenadas pares para que quede nítida a 16 px.
 */
export const VIEW = 32;
export const TILE_RX = 8;
export const TILE_FILL = "#12382c";
export const MARK_ON_TILE = "#f6f4ef";
export const INK = "#0f3d2e";
export const PAPER = "#f7f5f0";

export const COL_W = 6;
export const BAR_H = 4;
export const GAP_Y = 2;
export const LEFT_X = 8;
export const RIGHT_X = 18;
export const CROSS_X = 14;
export const CROSS_W = 4;
export const Y0 = 2;
export const RX = 2;

export function barYs() {
  return [0, 1, 2, 3, 4].map((i) => Y0 + i * (BAR_H + GAP_Y));
}

export function markRects() {
  const ys = barYs();
  const bars = [];
  for (const y of ys) {
    bars.push({ x: LEFT_X, y, w: COL_W, h: BAR_H, rx: RX });
    bars.push({ x: RIGHT_X, y, w: COL_W, h: BAR_H, rx: RX });
  }
  bars.push({ x: CROSS_X, y: ys[2], w: CROSS_W, h: BAR_H, rx: RX });
  return bars;
}

function rectSvg({ x, y, w, h, rx }, fill) {
  const fillAttr = fill ? ` fill="${fill}"` : "";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"${fillAttr}/>`;
}

/** Isotype sin tile: fill currentColor para el header. */
export function markSvg({ fill = "currentColor", xmlns = false } = {}) {
  const ns = xmlns ? ` xmlns="http://www.w3.org/2000/svg"` : "";
  const fillAttr = fill === "currentColor" ? ` fill="currentColor"` : "";
  const rectFill = fill === "currentColor" ? "" : fill;
  const body = markRects()
    .map((r) => rectSvg(r, rectFill))
    .join("");
  return `<svg${ns} viewBox="0 0 ${VIEW} ${VIEW}"${fillAttr} aria-hidden="true">${body}</svg>`;
}

/** Favicon: tile #12382c + H crema. */
export function faviconSvg() {
  const pills = markRects()
    .map((r) => `    <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${r.rx}"/>`)
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}">
  <rect width="${VIEW}" height="${VIEW}" rx="${TILE_RX}" fill="${TILE_FILL}"/>
  <g fill="${MARK_ON_TILE}">
${pills}
  </g>
</svg>
`;
}

export function brandMarkHtml() {
  return `<span class="brand-mark" aria-hidden="true">${markSvg()}</span>`;
}

/** Punto (px, py) dentro de una pastilla con extremos circulares. */
export function pointInPill(px, py, { x, y, w, h, rx }) {
  const r = rx;
  if (py < y || py >= y + h || px < x || px >= x + w) return false;
  if (px >= x + r && px < x + w - r) return true;
  const cy = y + h / 2;
  const left = (px - (x + r)) ** 2 + (py - cy) ** 2 <= r * r;
  const right = (px - (x + w - r)) ** 2 + (py - cy) ** 2 <= r * r;
  return left || right;
}

export function pointInMark(px, py) {
  return markRects().some((r) => pointInPill(px, py, r));
}
