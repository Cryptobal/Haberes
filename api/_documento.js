import { randomUUID } from "node:crypto";
import { FALLBACK_UF, UF_MAX, UF_MIN } from "../js/constants.js";
import { calcularFiniquitoCompleto } from "../js/finiquito.js";
import { calcularSueldo } from "../js/sueldo.js";
import { newId, withDb } from "./_lib.js";
import { buildFiniquitoPdf, buildLiquidacionPdf } from "./_pdf.js";
import { hasR2, r2Get, r2Put } from "./_r2.js";

const MESES_PDF = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function parseUf(raw) {
  const uf = Number(raw);
  if (Number.isFinite(uf) && uf >= UF_MIN && uf <= UF_MAX) return uf;
  return FALLBACK_UF;
}

export function periodoLabel(value) {
  const m = String(value || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return String(value || "");
  const month = Number(m[2]) - 1;
  if (month < 0 || month > 11) return String(value);
  return `${MESES_PDF[month]} ${m[1]}`;
}

export function companyFromRow(row) {
  return {
    id: row.id,
    rut: row.rut,
    razonSocial: row.razon_social,
    giro: row.giro || "",
    direccion: row.direccion || "",
  };
}

export function workerFromBody(raw) {
  const t = raw && typeof raw === "object" ? raw : {};
  return {
    nombre: String(t.nombre || "").trim().slice(0, 200),
    rut: String(t.rut || "").trim().slice(0, 20),
    cargo: String(t.cargo || "").trim().slice(0, 120),
    sueldoBase: Number(t.sueldoBase) || 0,
    afp: String(t.afp || "modelo"),
    salud: String(t.salud || "fonasa"),
    isaprePactado: Number(t.isaprePactado) || 0,
    contrato: String(t.contrato || "indefinido"),
    horasExtras: Number(t.horasExtras) || 0,
    bonos: Number(t.bonos) || 0,
    haberesExtra: Array.isArray(t.haberesExtra) ? t.haberesExtra.slice(0, 30) : [],
    colacion: Number(t.colacion) || 0,
    movilizacion: Number(t.movilizacion) || 0,
    gratificacionArt50: Boolean(t.gratificacionArt50),
    jornada: Number(t.jornada) || 42,
    ingreso: String(t.ingreso || "").slice(0, 10),
    termino: String(t.termino || "").slice(0, 10),
    email: String(t.email || "").trim().slice(0, 160),
  };
}

export async function assetBytes(company, keyField, typeField) {
  if (!company[keyField] || !hasR2()) return { bytes: null, type: "" };
  try {
    const got = await r2Get(company[keyField]);
    if (!got.ok) return { bytes: null, type: "" };
    return { bytes: got.body, type: company[typeField] || got.contentType || "" };
  } catch {
    return { bytes: null, type: "" };
  }
}

export async function buildWorkerPdf({
  empresa,
  tipo,
  trabajador,
  extra = {},
  uf,
  logoBytes = null,
  logoType = "",
  firmaBytes = null,
  firmaType = "",
}) {
  if (tipo === "liquidacion") {
    const calc = calcularSueldo(trabajador, { uf });
    const periodo = periodoLabel(extra.periodo) || String(extra.periodo || "");
    return buildLiquidacionPdf({
      empresa,
      trabajador,
      periodo,
      calc,
      logoBytes,
      logoType,
      firmaBytes,
      firmaType,
    });
  }
  const fin = calcularFiniquitoCompleto(
    {
      ...trabajador,
      remuneracion: trabajador.sueldoBase,
      causal: extra.causal,
      ingreso: trabajador.ingreso || extra.ingreso,
      termino: trabajador.termino || extra.termino,
      diasMes: extra.diasMes,
      diasFeriadoPendiente: extra.diasFeriadoPendiente,
      diasFeriadoProporcional: extra.diasFeriadoProporcional,
      avisoPrevio: extra.avisoPrevio,
      otros: extra.otros,
    },
    { uf },
  );
  return buildFiniquitoPdf({
    empresa,
    trabajador: {
      ...trabajador,
      ingreso: trabajador.ingreso || extra.ingreso,
      termino: trabajador.termino || extra.termino,
    },
    fin,
    ciudad: String(extra.ciudad || "Santiago").slice(0, 80),
    logoBytes,
    logoType,
    firmaBytes,
    firmaType,
  });
}

export async function guardarDocumento({ companyRow, tipo, bytes }) {
  const id = newId();
  const key = `${tipo === "liquidacion" ? "liquidaciones" : "finiquitos"}/${companyRow.id}/${randomUUID()}.pdf`;
  const put = await r2Put(key, bytes, "application/pdf");
  if (!put.ok) return { ok: false, reason: "storage_error" };
  await withDb(async (client) => {
    await client.query(
      `INSERT INTO documentos (id, company_id, tipo, object_key, content_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, companyRow.id, tipo, key, "application/pdf"],
    );
  });
  return { ok: true, id, key, bytes };
}

/** Genera el PDF de un solo trabajador, lo sube a R2 e inserta en documentos. */
export async function generarYGuardarPdf({
  companyRow,
  tipo,
  trabajador,
  extra = {},
  uf,
  logoBytes = null,
  logoType = "",
  firmaBytes = null,
  firmaType = "",
}) {
  const empresa = companyFromRow(companyRow);
  const bytes = await buildWorkerPdf({
    empresa,
    tipo,
    trabajador,
    extra,
    uf,
    logoBytes,
    logoType,
    firmaBytes,
    firmaType,
  });
  return guardarDocumento({ companyRow, tipo, bytes });
}
