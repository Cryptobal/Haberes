export function clp(n) {
  const v = Math.round(Number(n) || 0);
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v);
}

export function ufFmt(n, digits = 2) {
  const v = Number(n) || 0;
  return `UF ${new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v)}`;
}

export function num(n, digits = 2) {
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(n) || 0);
}

export function fechaLarga(date = new Date()) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function parseNumber(raw) {
  if (typeof raw === "number") return raw;
  if (raw == null) return 0;
  const s = String(raw).trim();
  if (!s) return 0;
  const cleaned = s.replace(/\$/g, "").replace(/\./g, "").replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

const RUT_RE = /^(\d{1,2}(?:\.\d{3}){2}-[\dkK]|\d{7,8}-[\dkK])$/;

export function dvRut(cuerpo) {
  let sum = 0;
  let mul = 2;
  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    sum += Number(cuerpo[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const rest = 11 - (sum % 11);
  if (rest === 11) return "0";
  if (rest === 10) return "K";
  return String(rest);
}

export function normalizeRut(raw) {
  const s = String(raw || "").replace(/\./g, "").replace(/-/g, "").trim().toUpperCase();
  if (s.length < 8) return "";
  const cuerpo = s.slice(0, -1);
  const dv = s.slice(-1);
  return `${cuerpo}-${dv}`;
}

export function formatRut(raw) {
  const n = normalizeRut(raw);
  if (!n) return String(raw || "");
  const [cuerpo, dv] = n.split("-");
  const withDots = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${dv}`;
}

export function validarRut(raw) {
  const n = normalizeRut(raw);
  if (!n) return false;
  const [cuerpo, dv] = n.split("-");
  if (!/^\d{7,8}$/.test(cuerpo)) return false;
  return dvRut(cuerpo) === dv.toUpperCase();
}

export function isRutShape(raw) {
  return RUT_RE.test(String(raw || "").trim());
}
