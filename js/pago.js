import { calcularSueldo } from "./sueldo.js";
import { writeXlsx } from "./xlsx.js";

export const BANCOS_CL = [
  { value: "001", label: "Banco de Chile (001)" },
  { value: "012", label: "BancoEstado (012)" },
  { value: "014", label: "Scotiabank (014)" },
  { value: "016", label: "BCI (016)" },
  { value: "037", label: "Santander (037)" },
  { value: "039", label: "Itaú (039)" },
  { value: "028", label: "BICE (028)" },
  { value: "049", label: "Security (049)" },
  { value: "051", label: "Falabella (051)" },
  { value: "053", label: "Consorcio (053)" },
  { value: "009", label: "Internacional (009)" },
];

export const TIPO_CUENTA_OPTS = [
  { value: "corriente", label: "Corriente" },
  { value: "vista", label: "Vista" },
  { value: "rut", label: "Cuenta RUT" },
];

const TIPO_LABEL = {
  corriente: "corriente",
  vista: "vista",
  rut: "rut",
};

function bancoCodigo(v) {
  const raw = String(v || "").trim();
  const known = BANCOS_CL.find((b) => b.value === raw || b.label === raw);
  if (known) return known.value;
  const m = raw.match(/(\d{3})/);
  return m ? m[1] : raw;
}

function bancoNombre(v) {
  const code = bancoCodigo(v);
  return BANCOS_CL.find((b) => b.value === code)?.label || String(v || "");
}

export function splitRut(rut) {
  const s = String(rut || "")
    .replace(/\./g, "")
    .replace(/\s/g, "")
    .toUpperCase();
  const m = s.match(/^(\d+)-([\dK])$/);
  if (m) return { cuerpo: m[1], dv: m[2] };
  return { cuerpo: s.replace(/-.*$/, ""), dv: "" };
}

function tipoCuenta(v) {
  const k = String(v || "corriente").toLowerCase();
  if (k.includes("vista") || k === "juv") return "vista";
  if (k.includes("rut")) return "rut";
  return "corriente";
}

export function glosaSueldo(periodoLabel) {
  const p = String(periodoLabel || "").trim();
  return p ? `Sueldo ${p}` : "Sueldo";
}

export function filasPago({ trabajadores, indicadores, glosa }) {
  return (trabajadores || []).map((t) => {
    const calc = calcularSueldo(t, indicadores);
    const tipo = tipoCuenta(t.tipoCuenta || t.tipo_cuenta);
    return {
      nombre: String(t.nombre || "").trim(),
      rut: String(t.rut || "").trim(),
      banco: bancoCodigo(t.banco),
      bancoNombre: bancoNombre(t.banco),
      tipo_cuenta: TIPO_LABEL[tipo] || tipo,
      nro_cuenta: String(t.nroCuenta || t.nro_cuenta || "").trim(),
      email: String(t.email || t.correo || "").trim(),
      monto: calc.liquido,
      glosa: String(glosa || "").trim() || "Sueldo",
    };
  });
}

const NOTE_CHILE =
  "Banco de Chile — Office Banking (referencia). Plantilla Haberes. Contraste con la Excel que baja Office Banking; el banco no publica un formato único.";
const NOTE_SCOTIA =
  "Scotiabank (referencia). Plantilla Haberes. Contraste con la Excel que baja Scotiabank; el banco no publica un formato único.";
const NOTE_ESTADO =
  "Plantilla Haberes. Contraste con la Excel que baja BancoEstado; el banco no publica un formato único.";
const NOTE_SANTANDER =
  "Plantilla Haberes. Contraste con la Excel que baja Santander; el banco no publica un formato único.";

function canonRows(filas) {
  return [
    ["nombre", "rut", "banco", "tipo_cuenta", "nro_cuenta", "email", "monto", "glosa"],
    ...filas.map((f) => [
      f.nombre,
      f.rut,
      f.banco,
      f.tipo_cuenta,
      f.nro_cuenta,
      f.email,
      f.monto,
      f.glosa,
    ]),
  ];
}

function chileRows(filas) {
  return [
    [NOTE_CHILE],
    [],
    [
      "rut",
      "dv",
      "nombre",
      "codigo_banco",
      "tipo_cuenta",
      "nro_cuenta",
      "monto",
      "email",
      "glosa",
    ],
    ...filas.map((f) => {
      const { cuerpo, dv } = splitRut(f.rut);
      return [cuerpo, dv, f.nombre, f.banco, f.tipo_cuenta, f.nro_cuenta, f.monto, f.email, f.glosa];
    }),
  ];
}

function scotiaRows(filas) {
  return [
    [NOTE_SCOTIA],
    [],
    ["nombre", "rut", "banco", "tipo_cuenta", "cuenta", "monto", "email", "mensaje"],
    ...filas.map((f) => [f.nombre, f.rut, f.banco, f.tipo_cuenta, f.nro_cuenta, f.monto, f.email, f.glosa]),
  ];
}

function estadoRows(filas) {
  return [
    [NOTE_ESTADO],
    [],
    ["nombre", "rut", "banco", "tipo_cuenta", "nro_cuenta", "monto", "email", "glosa"],
    ...filas.map((f) => [f.nombre, f.rut, f.banco, f.tipo_cuenta, f.nro_cuenta, f.monto, f.email, f.glosa]),
  ];
}

function santanderRows(filas) {
  return [
    [NOTE_SANTANDER],
    [],
    ["nombre", "rut", "codigo_banco", "tipo_cuenta", "nro_cuenta", "monto", "email", "glosa"],
    ...filas.map((f) => [f.nombre, f.rut, f.banco, f.tipo_cuenta, f.nro_cuenta, f.monto, f.email, f.glosa]),
  ];
}

export function hojasPago(filas) {
  return [
    { name: "Haberes", rows: canonRows(filas) },
    { name: "Chile Office Banking (ref)", rows: chileRows(filas) },
    { name: "Scotiabank (ref.)", rows: scotiaRows(filas) },
    { name: "BancoEstado (ref.)", rows: estadoRows(filas) },
    { name: "Santander (ref.)", rows: santanderRows(filas) },
  ];
}

export function xlsxPagoMasivo(opts) {
  return writeXlsx(hojasPago(filasPago(opts)));
}

export function xlsxPagoEjemplo() {
  return writeXlsx(
    hojasPago([
      {
        nombre: "",
        rut: "",
        banco: "",
        tipo_cuenta: "corriente",
        nro_cuenta: "",
        email: "",
        monto: "",
        glosa: "Sueldo agosto 2026",
      },
    ]),
  );
}
