import { calcularSueldo } from "./sueldo.js";
import { buscarInstitucion, nombreInstitucion, opcionesBancosPlanas } from "./bancos.js";
import { perfilPersonalizado, perfilPorId, renderNomina } from "./nomina.js";

/** @deprecated Preferir opcionesBancosPlanas / INSTITUCIONES_CL. Compatibilidad. */
export const BANCOS_CL = opcionesBancosPlanas();

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
  const hit = buscarInstitucion(v);
  if (hit) return hit.codigo;
  const raw = String(v || "").trim();
  const m = raw.match(/(\d{3})/);
  return m ? m[1] : raw;
}

function bancoNombre(v) {
  return nombreInstitucion(v) || String(v || "");
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

/**
 * Descarga de nómina según perfil declarativo.
 * @param {string} perfilId
 * @param {{ trabajadores, indicadores, glosa, nominaConfig?, filename? }} opts
 */
export function descargarNomina(perfilId, opts = {}) {
  const filas = filasPago(opts).filter((f) => Number(f.monto) > 0);
  let spec = perfilPorId(perfilId);
  if (perfilId === "personalizado") {
    spec = perfilPersonalizado(opts.nominaConfig);
  }
  if (!spec) spec = perfilPorId("generico_xlsx");
  return renderNomina(spec, filas, { filename: opts.filename || "nomina-pago" });
}

/** Compatibilidad: XLSX genérico (antes “Haberes” + hojas de referencia). */
export function xlsxPagoMasivo(opts) {
  const out = descargarNomina("generico_xlsx", opts);
  return out.bytes;
}

export function xlsxPagoEjemplo() {
  return descargarNomina("generico_xlsx", {
    trabajadores: [],
    indicadores: {},
    glosa: "Sueldo",
    filename: "nomina-pago-ejemplo",
  }).bytes;
}

export function hojasPago(filas) {
  const out = descargarNomina("generico_xlsx", {
    trabajadores: (filas || []).map((f) => ({
      nombre: f.nombre,
      rut: f.rut,
      banco: f.banco,
      tipoCuenta: f.tipo_cuenta,
      nroCuenta: f.nro_cuenta,
      email: f.email,
      sueldoBase: Number(f.monto) || 0,
      afp: "modelo",
      salud: "fonasa",
      contrato: "indefinido",
      colacion: 0,
      movilizacion: 0,
      haberesExtra: Number(f.monto)
        ? [{ nombre: "Monto", monto: Number(f.monto), imponible: true }]
        : [],
    })),
    indicadores: { uf: 40854.01 },
    glosa: filas?.[0]?.glosa || "Sueldo",
  });
  return out;
}
