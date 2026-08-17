import { writeXlsx } from "./xlsx.js";

function splitRut(rut) {
  const s = String(rut || "")
    .replace(/\./g, "")
    .replace(/\s/g, "")
    .toUpperCase();
  const m = s.match(/^(\d+)-([\dK])$/);
  if (m) return { cuerpo: m[1], dv: m[2] };
  return { cuerpo: s.replace(/-.*$/, ""), dv: "" };
}

/** Perfiles declarativos de nómina bancaria. Ninguno verificado sin instructivo citado. */
export const PERFILES_NOMINA = [
  {
    id: "generico_xlsx",
    banco: null,
    nombre: "Excel genérico (todos los bancos)",
    verificado: false,
    fuente: "",
    salida: "xlsx",
    campos: [
      { id: "nombre", origen: "nombre", tipo: "alfa" },
      { id: "rut", origen: "rut", tipo: "alfa" },
      { id: "banco", origen: "bancoCodigo", tipo: "alfa" },
      { id: "tipo_cuenta", origen: "tipoCuenta", tipo: "alfa" },
      { id: "nro_cuenta", origen: "nroCuenta", tipo: "alfa" },
      { id: "email", origen: "email", tipo: "alfa" },
      { id: "monto", origen: "monto", tipo: "num", decimales: 0 },
      { id: "glosa", origen: "glosa", tipo: "alfa" },
    ],
    registros: { cabecera: "campos", detalle: "campos", pie: null },
  },
  {
    id: "generico_csv",
    banco: null,
    nombre: "CSV genérico (todos los bancos)",
    verificado: false,
    fuente: "",
    salida: "csv",
    separador: ";",
    codificacion: "latin1",
    finLinea: "\r\n",
    sinTildes: true,
    campos: [
      { id: "rut_cuerpo", origen: "rutCuerpo", tipo: "num", largo: 9, relleno: "0", alinea: "der" },
      { id: "dv", origen: "rutDv", tipo: "alfa", largo: 1 },
      { id: "nombre", origen: "nombre", tipo: "alfa", largo: 40, alinea: "izq" },
      { id: "banco", origen: "bancoCodigo", tipo: "num", largo: 3, relleno: "0" },
      { id: "tipo_cuenta", origen: "tipoCuenta", tipo: "alfa", largo: 2 },
      { id: "cuenta", origen: "nroCuenta", tipo: "alfa", largo: 20 },
      { id: "monto", origen: "monto", tipo: "num", largo: 12, relleno: "0", decimales: 0 },
      { id: "glosa", origen: "glosa", tipo: "alfa", largo: 40 },
      { id: "email", origen: "email", tipo: "alfa", largo: 60 },
    ],
    registros: { cabecera: "campos", detalle: "campos", pie: null },
  },
  {
    id: "generico_txt_fijo",
    banco: null,
    nombre: "Texto de ancho fijo (plantilla)",
    verificado: false,
    fuente: "",
    salida: "txt_fijo",
    codificacion: "latin1",
    finLinea: "\r\n",
    sinTildes: true,
    campos: [
      { id: "rut_cuerpo", origen: "rutCuerpo", tipo: "num", largo: 9, relleno: "0", alinea: "der" },
      { id: "dv", origen: "rutDv", tipo: "alfa", largo: 1 },
      { id: "nombre", origen: "nombre", tipo: "alfa", largo: 40, alinea: "izq", relleno: " " },
      { id: "banco", origen: "bancoCodigo", tipo: "num", largo: 3, relleno: "0" },
      { id: "tipo_cuenta", origen: "tipoCuenta", tipo: "alfa", largo: 10, alinea: "izq", relleno: " " },
      { id: "cuenta", origen: "nroCuenta", tipo: "alfa", largo: 20, alinea: "izq", relleno: " " },
      { id: "monto", origen: "monto", tipo: "num", largo: 12, relleno: "0", decimales: 0 },
      { id: "glosa", origen: "glosa", tipo: "alfa", largo: 40, alinea: "izq", relleno: " " },
    ],
    registros: { cabecera: null, detalle: "campos", pie: null },
  },
  {
    id: "personalizado",
    banco: null,
    nombre: "Perfil personalizado de la empresa",
    verificado: false,
    fuente: "",
    salida: "csv",
    separador: ";",
    codificacion: "latin1",
    finLinea: "\r\n",
    sinTildes: true,
    campos: [],
    registros: { cabecera: "campos", detalle: "campos", pie: null },
  },
];

export const CAMPOS_DISPONIBLES = [
  { id: "nombre", origen: "nombre", label: "Nombre" },
  { id: "rut", origen: "rut", label: "RUT completo" },
  { id: "rut_cuerpo", origen: "rutCuerpo", label: "RUT (cuerpo)" },
  { id: "dv", origen: "rutDv", label: "Dígito verificador" },
  { id: "banco", origen: "bancoCodigo", label: "Código banco" },
  { id: "banco_nombre", origen: "bancoNombre", label: "Nombre banco" },
  { id: "tipo_cuenta", origen: "tipoCuenta", label: "Tipo de cuenta" },
  { id: "cuenta", origen: "nroCuenta", label: "Número de cuenta" },
  { id: "monto", origen: "monto", label: "Monto" },
  { id: "glosa", origen: "glosa", label: "Glosa" },
  { id: "email", origen: "email", label: "Correo" },
];

export function sinTildes(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function padNum(value, largo, relleno = "0") {
  const s = String(value ?? "").replace(/\D/g, "");
  if (!largo) return s;
  if (s.length >= largo) return s.slice(-largo);
  return s.padStart(largo, relleno);
}

export function padAlfa(value, largo, { alinea = "izq", relleno = " " } = {}) {
  let s = String(value ?? "");
  if (!largo) return s;
  if (s.length > largo) return s.slice(0, largo);
  return alinea === "der" ? s.padStart(largo, relleno) : s.padEnd(largo, relleno);
}

/** Mapa directo U+0000–U+00FF → bytes Latin-1; fuera de rango → '?'. */
export function aLatin1(str) {
  const s = String(str ?? "");
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    out[i] = c <= 0xff ? c : 0x3f;
  }
  return out;
}

function valorOrigen(fila, origen) {
  const { cuerpo, dv } = splitRut(fila.rut);
  const map = {
    nombre: fila.nombre || "",
    rut: String(fila.rut || "").replace(/\./g, ""),
    rutCuerpo: cuerpo,
    rutDv: dv,
    bancoCodigo: fila.banco || "",
    bancoNombre: fila.bancoNombre || "",
    tipoCuenta: fila.tipo_cuenta || "",
    nroCuenta: String(fila.nro_cuenta || "").replace(/\./g, ""),
    monto: Number(fila.monto) || 0,
    glosa: fila.glosa || "",
    email: fila.email || "",
  };
  return map[origen] ?? "";
}

function formatCampo(campo, fila, { sinTildes: strip = false, fijo = false } = {}) {
  let raw = valorOrigen(fila, campo.origen);
  if (campo.tipo === "num" && campo.origen === "monto") {
    const n = Math.round(Number(raw) || 0);
    raw = String(Math.max(0, n));
  } else if (campo.tipo === "num") {
    raw = String(raw).replace(/\D/g, "");
  } else {
    raw = String(raw);
    if (strip) raw = sinTildes(raw);
    if (raw.startsWith("=")) raw = `'${raw}`;
  }
  if (fijo || campo.largo) {
    if (campo.tipo === "num") return padNum(raw, campo.largo, campo.relleno || "0");
    return padAlfa(raw, campo.largo, { alinea: campo.alinea || "izq", relleno: campo.relleno || " " });
  }
  return raw;
}

export function perfilPorId(id) {
  return PERFILES_NOMINA.find((p) => p.id === id) || null;
}

export function perfilPersonalizado(saved) {
  const base = perfilPorId("personalizado");
  const cfg = saved && typeof saved === "object" ? saved : {};
  const fieldIds = Array.isArray(cfg.campos) ? cfg.campos : [];
  const campos = fieldIds
    .map((id) => {
      const meta = CAMPOS_DISPONIBLES.find((c) => c.id === id);
      if (!meta) return null;
      return { id: meta.id, origen: meta.origen, tipo: meta.id === "monto" || meta.id === "rut_cuerpo" || meta.id === "banco" ? "num" : "alfa" };
    })
    .filter(Boolean);
  if (!campos.length) {
    return {
      ...base,
      ...perfilPorId("generico_csv"),
      id: "personalizado",
      nombre: "Perfil personalizado de la empresa",
    };
  }
  return {
    ...base,
    salida: cfg.salida === "xlsx" || cfg.salida === "txt_fijo" ? cfg.salida : "csv",
    separador: cfg.separador === "," || cfg.separador === "|" ? cfg.separador : ";",
    codificacion: cfg.codificacion === "utf8" ? "utf8" : "latin1",
    finLinea: "\r\n",
    sinTildes: cfg.sinTildes !== false,
    incluirCabecera: cfg.incluirCabecera !== false,
    campos,
    registros: {
      cabecera: cfg.incluirCabecera === false ? null : "campos",
      detalle: "campos",
      pie: null,
    },
  };
}

function avisoNoVerificado(spec) {
  const banco = spec.banco ? ` de ${spec.banco}` : "";
  return `Plantilla Haberes. No verificada contra el instructivo${banco || " del banco"}. Compare con el archivo de ejemplo que entrega su portal antes de subirla.`;
}

function filasDelim(spec, filas) {
  const sep = spec.separador || ";";
  const eol = spec.finLinea || "\r\n";
  const lines = [];
  if (spec.registros?.cabecera === "campos") {
    lines.push(spec.campos.map((c) => c.id).join(sep));
  }
  for (const f of filas) {
    lines.push(
      spec.campos
        .map((c) => formatCampo(c, f, { sinTildes: Boolean(spec.sinTildes) }))
        .join(sep),
    );
  }
  return lines.join(eol) + eol;
}

function filasFijo(spec, filas) {
  const eol = spec.finLinea || "\r\n";
  const lines = filas.map((f) =>
    spec.campos.map((c) => formatCampo(c, f, { sinTildes: Boolean(spec.sinTildes), fijo: true })).join(""),
  );
  return lines.join(eol) + eol;
}

function filasXlsx(spec, filas) {
  const header = spec.campos.map((c) => c.id);
  const rows = [
    header,
    ...filas.map((f) =>
      spec.campos.map((c) => {
        const v = formatCampo(c, f, { sinTildes: Boolean(spec.sinTildes) });
        if (c.origen === "monto") return Number(v) || 0;
        return v;
      }),
    ),
  ];
  const sheets = [{ name: "Nómina", rows }];
  if (!spec.verificado) {
    sheets.push({ name: "Léame", rows: [[avisoNoVerificado(spec)], [], ["fuente", spec.fuente || "(sin instructivo citado)"]] });
  }
  return writeXlsx(sheets);
}

/**
 * @returns {{ filename: string, mime: string, bytes: Uint8Array, aviso: string }}
 */
export function renderNomina(spec, filas, meta = {}) {
  const safeFilas = (filas || []).filter((f) => Number(f.monto) > 0);
  const aviso = spec.verificado
    ? ""
    : avisoNoVerificado(spec);
  const baseName = String(meta.filename || "nomina-pago").replace(/\.[^.]+$/, "");

  if (spec.salida === "xlsx") {
    return {
      filename: `${baseName}.xlsx`,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bytes: filasXlsx(spec, safeFilas),
      aviso,
    };
  }

  const text =
    spec.salida === "txt_fijo" ? filasFijo(spec, safeFilas) : filasDelim(spec, safeFilas);
  const bytes =
    spec.codificacion === "utf8" ? new TextEncoder().encode(text) : aLatin1(text);
  const ext = spec.salida === "txt_fijo" ? "txt" : "csv";
  return {
    filename: `${baseName}.${ext}`,
    mime: spec.salida === "txt_fijo" ? "text/plain" : "text/csv",
    bytes,
    aviso,
  };
}

export function largoFijoEsperado(spec) {
  if (spec.salida !== "txt_fijo") return 0;
  return (spec.campos || []).reduce((s, c) => s + (Number(c.largo) || 0), 0);
}
