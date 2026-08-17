import { json, noStorage, requireCompany, sendBytes, withDb } from "./_lib.js";
import { applyMovimientos, normalizeKeys } from "./movimiento.js";
import { mergePdfs } from "./_pdf.js";
import { hasR2, r2Get } from "./_r2.js";
import {
  assetBytes,
  buildWorkerPdf,
  companyFromRow,
  guardarDocumento,
  parseUf,
  workerFromBody,
} from "./_documento.js";

function queryId(req) {
  if (req.query && req.query.id) return String(req.query.id).trim();
  try {
    const url = new URL(req.url || "", "http://localhost");
    return String(url.searchParams.get("id") || "").trim();
  } catch {
    return "";
  }
}

export { workerFromBody } from "./_documento.js";

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
  const movimientoKeys = normalizeKeys(trabajadores.map((t) => t.rut));
  if (movimientoKeys.length) {
    try {
      const cupo = await withDb(async (client) =>
        applyMovimientos(client, companyRow, { tipo, keys: movimientoKeys, commit: false }),
      );
      if (!cupo) return json(res, 503, { ok: false, reason: "db_unavailable" });
      if (cupo.status !== 200) return json(res, cupo.status, cupo.body);
    } catch {
      return json(res, 503, { ok: false, reason: "db_unavailable" });
    }
  }
  const logo = await assetBytes(companyRow, "logo_key", "logo_content_type");
  const firma = await assetBytes(companyRow, "firma_key", "firma_content_type");

  let pdf;
  try {
    const buffers = [];
    for (const trabajador of trabajadores) {
      buffers.push(
        await buildWorkerPdf({
          empresa,
          tipo,
          trabajador,
          extra: {
            periodo: body.periodo,
            causal: body.causal,
            ingreso: body.ingreso,
            termino: body.termino,
            diasMes: body.diasMes,
            diasFeriadoPendiente: body.diasFeriadoPendiente,
            diasFeriadoProporcional: body.diasFeriadoProporcional,
            avisoPrevio: body.avisoPrevio,
            otros: body.otros,
            ciudad: body.ciudad,
          },
          uf,
          logoBytes: logo.bytes,
          logoType: logo.type,
          firmaBytes: firma.bytes,
          firmaType: firma.type,
        }),
      );
    }
    pdf = await mergePdfs(buffers);
  } catch {
    return json(res, 400, { ok: false, reason: "invalid_payload" });
  }

  try {
    const saved = await guardarDocumento({ companyRow, tipo, bytes: pdf });
    if (!saved.ok) return json(res, 502, { ok: false, reason: "storage_error" });
    await withDb(async (client) => {
      if (movimientoKeys.length) {
        await applyMovimientos(client, companyRow, { tipo, keys: movimientoKeys, commit: true });
      }
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
