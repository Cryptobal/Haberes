import { randomUUID } from "node:crypto";
import { FALLBACK_UF, UF_MAX, UF_MIN } from "../js/constants.js";
import { calcularFiniquitoCompleto } from "../js/finiquito.js";
import { calcularSueldo } from "../js/sueldo.js";
import { json, newId, noStorage, requireCompany, sendBytes, withDb } from "./_lib.js";
import { buildFiniquitoPdf, buildLiquidacionPdf, mergePdfs } from "./_pdf.js";
import { hasR2, r2Get, r2Put } from "./_r2.js";

function parseUf(raw) {
  const uf = Number(raw);
  if (Number.isFinite(uf) && uf >= UF_MIN && uf <= UF_MAX) return uf;
  return FALLBACK_UF;
}

const MESES_PDF = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function periodoLabel(value) {
  const m = String(value || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return String(value || "");
  const month = Number(m[2]) - 1;
  if (month < 0 || month > 11) return String(value);
  return `${MESES_PDF[month]} ${m[1]}`;
}

function queryId(req) {
  if (req.query && req.query.id) return String(req.query.id).trim();
  try {
    const url = new URL(req.url || "", "http://localhost");
    return String(url.searchParams.get("id") || "").trim();
  } catch {
    return "";
  }
}

async function assetBytes(company, keyField, typeField) {
  if (!company[keyField] || !hasR2()) return { bytes: null, type: "" };
  try {
    const got = await r2Get(company[keyField]);
    if (!got.ok) return { bytes: null, type: "" };
    return { bytes: got.body, type: company[typeField] || got.contentType || "" };
  } catch {
    return { bytes: null, type: "" };
  }
}

function companyFromRow(row) {
  return {
    id: row.id,
    rut: row.rut,
    razonSocial: row.razon_social,
    giro: row.giro || "",
    direccion: row.direccion || "",
  };
}

function workerFromBody(raw) {
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
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader?.("Allow", "GET, POST");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }

  const companyRow = await requireCompany(req, res);
  if (!companyRow) return;
  if (!hasR2()) return noStorage(res);

  if (req.method === "GET") {
    const id = queryId(req);
    if (!id) return json(res, 400, { ok: false, reason: "invalid_payload" });
    try {
      const doc = await withDb(async (client) => {
        const found = await client.query(
          `SELECT id, object_key, content_type, tipo
           FROM documentos
           WHERE id = $1 AND company_id = $2
           LIMIT 1`,
          [id, companyRow.id],
        );
        return found.rows[0] || null;
      });
      if (!doc) return json(res, 404, { ok: false, reason: "not_found" });
      const got = await r2Get(doc.object_key);
      if (!got.ok) return json(res, 502, { ok: false, reason: "storage_error" });
      const name = doc.tipo === "liquidacion" ? "liquidacion.pdf" : "finiquito.pdf";
      return sendBytes(res, 200, got.body, doc.content_type || "application/pdf", name);
    } catch {
      return json(res, 502, { ok: false, reason: "storage_error" });
    }
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const tipo = String(body.tipo || "").trim();
  if (tipo !== "liquidacion" && tipo !== "finiquito") {
    return json(res, 400, { ok: false, reason: "invalid_payload" });
  }
  const rawList = Array.isArray(body.trabajadores) && body.trabajadores.length
    ? body.trabajadores
    : body.trabajador
      ? [body.trabajador]
      : [];
  const trabajadores = rawList.map(workerFromBody).filter((t) => t.nombre);
  if (!trabajadores.length) return json(res, 400, { ok: false, reason: "invalid_payload" });
  const uf = parseUf(body.uf);
  const empresa = companyFromRow(companyRow);
  const logo = await assetBytes(companyRow, "logo_key", "logo_content_type");
  const firma = await assetBytes(companyRow, "firma_key", "firma_content_type");

  let pdf;
  try {
    const buffers = [];
    for (const trabajador of trabajadores) {
      if (tipo === "liquidacion") {
        const calc = calcularSueldo(trabajador, { uf });
        const periodo = periodoLabel(body.periodo) || String(body.periodo || "");
        buffers.push(
          await buildLiquidacionPdf({
            empresa,
            trabajador,
            periodo,
            calc,
            logoBytes: logo.bytes,
            logoType: logo.type,
            firmaBytes: firma.bytes,
            firmaType: firma.type,
          }),
        );
      } else {
        const fin = calcularFiniquitoCompleto(
          {
            ...trabajador,
            remuneracion: trabajador.sueldoBase,
            causal: body.causal,
            ingreso: trabajador.ingreso || body.ingreso,
            termino: trabajador.termino || body.termino,
            diasMes: body.diasMes,
            diasFeriadoPendiente: body.diasFeriadoPendiente,
            diasFeriadoProporcional: body.diasFeriadoProporcional,
            avisoPrevio: body.avisoPrevio,
            otros: body.otros,
          },
          { uf },
        );
        buffers.push(
          await buildFiniquitoPdf({
            empresa,
            trabajador: {
              ...trabajador,
              ingreso: trabajador.ingreso || body.ingreso,
              termino: trabajador.termino || body.termino,
            },
            fin,
            ciudad: String(body.ciudad || "Santiago").slice(0, 80),
            logoBytes: logo.bytes,
            logoType: logo.type,
            firmaBytes: firma.bytes,
            firmaType: firma.type,
          }),
        );
      }
    }
    pdf = await mergePdfs(buffers);
  } catch {
    return json(res, 400, { ok: false, reason: "invalid_payload" });
  }

  const id = newId();
  const key = `${tipo === "liquidacion" ? "liquidaciones" : "finiquitos"}/${companyRow.id}/${randomUUID()}.pdf`;
  try {
    const put = await r2Put(key, pdf, "application/pdf");
    if (!put.ok) return json(res, 502, { ok: false, reason: "storage_error" });
    await withDb(async (client) => {
      await client.query(
        `INSERT INTO documentos (id, company_id, tipo, object_key, content_type)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, companyRow.id, tipo, key, "application/pdf"],
      );
    });
  } catch {
    return json(res, 502, { ok: false, reason: "storage_error" });
  }

  const filename =
    trabajadores.length > 1
      ? tipo === "liquidacion"
        ? "liquidaciones.pdf"
        : "finiquitos.pdf"
      : tipo === "liquidacion"
        ? "liquidacion.pdf"
        : "finiquito.pdf";
  return sendBytes(res, 200, pdf, "application/pdf", filename);
}
