import {
  allowRate,
  hasDatabaseUrl,
  json,
  mailConfigured,
  newId,
  noBackend,
  parseEmail,
  rateLimited,
  requireCompany,
  sendDocumentEmail,
  withDb,
} from "./_lib.js";
import {
  assetBytes,
  generarYGuardarPdf,
  parseUf,
  periodoLabel,
  workerFromBody,
} from "./_documento.js";
import { applyMovimientos, normalizeKeys } from "./movimiento.js";
import { hasR2 } from "./_r2.js";
import { DISCLAIMER, DISCLAIMER_FINIQUITO } from "../js/constants.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_WORKERS = 100;

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function validWorkerEmail(raw) {
  const email = String(raw || "").trim().slice(0, 160);
  if (!email || !EMAIL_RE.test(email)) return "";
  return email;
}

function subjectFor(tipo, empresa, periodo) {
  const razon = String(empresa.razon_social || empresa.razonSocial || "Empresa").slice(0, 120);
  if (tipo === "liquidacion") {
    const p = periodoLabel(periodo) || String(periodo || "");
    return `Liquidación de remuneraciones — ${p} — ${razon}`;
  }
  return `Carta de finiquito — ${razon}`;
}

function filenameFor(tipo, periodo, rut) {
  const clean = String(rut || "")
    .replace(/\./g, "")
    .replace(/\s/g, "")
    .toLowerCase();
  if (tipo === "liquidacion") {
    return `liquidacion-${periodo || "periodo"}-${clean}.pdf`;
  }
  return `finiquito-${clean}.pdf`;
}

function bodyText({ tipo, empresa, trabajador, periodo, mensaje }) {
  const razon = empresa.razon_social || empresa.razonSocial || "Su empleador";
  const disc = tipo === "finiquito" ? DISCLAIMER_FINIQUITO : DISCLAIMER;
  const lines = [
    `Estimado/a ${trabajador.nombre},`,
    "",
    tipo === "liquidacion"
      ? `${razon} le envía su liquidación de remuneraciones${periodo ? ` del periodo ${periodoLabel(periodo) || periodo}` : ""}.`
      : `${razon} le envía su carta de finiquito.`,
    "",
  ];
  if (mensaje) {
    lines.push(mensaje, "");
  }
  lines.push("El documento va adjunto en PDF.", "", disc, "", "—", "Haberes");
  return lines.join("\n");
}

function bodyHtml({ tipo, empresa, trabajador, periodo, mensaje }) {
  const razon = escapeHtml(empresa.razon_social || empresa.razonSocial || "Su empleador");
  const nombre = escapeHtml(trabajador.nombre);
  const disc = escapeHtml(tipo === "finiquito" ? DISCLAIMER_FINIQUITO : DISCLAIMER);
  const msg = mensaje ? `<p>${escapeHtml(mensaje)}</p>` : "";
  const intro =
    tipo === "liquidacion"
      ? `<p>${razon} le envía su liquidación de remuneraciones${periodo ? ` del periodo <strong>${escapeHtml(periodoLabel(periodo) || periodo)}</strong>` : ""}.</p>`
      : `<p>${razon} le envía su carta de finiquito.</p>`;
  return `<div style="font-family:sans-serif;font-size:15px;line-height:1.5;color:#14201c">
<p>Estimado/a ${nombre},</p>
${intro}
${msg}
<p>El documento va adjunto en PDF.</p>
<p style="font-size:12px;color:#5b6a64">${disc}</p>
</div>`;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader?.("Allow", "GET, POST");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }

  if (req.method === "GET") {
    return json(res, 200, { ok: true, mail: mailConfigured() });
  }

  if (!hasDatabaseUrl()) return noBackend(res);

  const companyRow = await requireCompany(req, res);
  if (!companyRow) return;

  if (!hasR2()) return json(res, 501, { ok: false, reason: "no_storage" });
  if (!mailConfigured()) return json(res, 501, { ok: false, reason: "no_mail" });
  if (!allowRate(req, "enviar")) return rateLimited(res);

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const tipo = String(body.tipo || "").trim();
  if (tipo !== "liquidacion" && tipo !== "finiquito") {
    return json(res, 400, { ok: false, reason: "invalid_payload" });
  }

  const rawList = Array.isArray(body.trabajadores) ? body.trabajadores : [];
  if (!rawList.length || rawList.length > MAX_WORKERS) {
    return json(res, 400, { ok: false, reason: "invalid_payload" });
  }

  const trabajadores = [];
  for (const raw of rawList) {
    const t = workerFromBody(raw);
    const email = validWorkerEmail(t.email);
    if (!t.nombre || !email) {
      return json(res, 400, { ok: false, reason: "invalid_payload" });
    }
    t.email = email;
    trabajadores.push(t);
  }

  const uf = parseUf(body.uf);
  const periodo = String(body.periodo || "").slice(0, 20);
  const mensaje = String(body.mensaje || "").trim().slice(0, 500);
  const replyTo = parseEmail(companyRow.email) || undefined;
  const movimientoKeys = normalizeKeys(trabajadores.map((t) => t.rut));

  try {
    const cupo = await withDb(async (client) =>
      applyMovimientos(client, companyRow, { tipo, keys: movimientoKeys, commit: false }),
    );
    if (!cupo) return json(res, 503, { ok: false, reason: "db_unavailable" });
    if (cupo.status !== 200) return json(res, cupo.status, cupo.body);
  } catch {
    return json(res, 503, { ok: false, reason: "db_unavailable" });
  }

  const logo = await assetBytes(companyRow, "logo_key", "logo_content_type");
  const firma = await assetBytes(companyRow, "firma_key", "firma_content_type");
  const extra = {
    periodo,
    causal: body.causal,
    ingreso: body.ingreso,
    termino: body.termino,
    diasMes: body.diasMes,
    diasFeriadoPendiente: body.diasFeriadoPendiente,
    diasFeriadoProporcional: body.diasFeriadoProporcional,
    avisoPrevio: body.avisoPrevio,
    otros: body.otros,
    ciudad: body.ciudad,
  };

  const enviados = [];
  const fallidos = [];
  let failStreak = 0;

  for (const trabajador of trabajadores) {
    if (failStreak >= 3) {
      fallidos.push({
        rut: trabajador.rut,
        nombre: trabajador.nombre,
        email: trabajador.email,
        reason: "mail_error",
      });
      continue;
    }

    let docId = null;
    let pdfBytes = null;
    try {
      const saved = await generarYGuardarPdf({
        companyRow,
        tipo,
        trabajador,
        extra,
        uf,
        logoBytes: logo.bytes,
        logoType: logo.type,
        firmaBytes: firma.bytes,
        firmaType: firma.type,
      });
      if (!saved.ok) {
        fallidos.push({
          rut: trabajador.rut,
          nombre: trabajador.nombre,
          email: trabajador.email,
          reason: saved.reason || "storage_error",
        });
        failStreak += 1;
        continue;
      }
      docId = saved.id;
      pdfBytes = saved.bytes;
    } catch {
      fallidos.push({
        rut: trabajador.rut,
        nombre: trabajador.nombre,
        email: trabajador.email,
        reason: "invalid_payload",
      });
      failStreak += 1;
      continue;
    }

    const filename = filenameFor(tipo, periodo, trabajador.rut);
    const subject = subjectFor(tipo, companyRow, periodo);
    const text = bodyText({ tipo, empresa: companyRow, trabajador, periodo, mensaje });
    const html = bodyHtml({ tipo, empresa: companyRow, trabajador, periodo, mensaje });
    const idempotencyKey = `enviar-${companyRow.id}-${tipo}-${trabajador.rut}-${periodo || "x"}-${Date.now()}`;

    const mail = await sendDocumentEmail({
      to: trabajador.email,
      replyTo,
      subject,
      text,
      html,
      filename,
      pdf: pdfBytes,
      idempotencyKey,
    });

    const envioId = newId();
    try {
      await withDb(async (client) => {
        await client.query(
          `INSERT INTO envios (id, company_id, documento_id, tipo, trabajador_key, email, periodo, status, provider_id, error)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            envioId,
            companyRow.id,
            docId,
            tipo,
            String(trabajador.rut || "").slice(0, 80),
            trabajador.email,
            periodo || null,
            mail.ok ? "sent" : "failed",
            mail.id || null,
            mail.ok ? null : String(mail.error || "mail_error").slice(0, 300),
          ],
        );
      });
    } catch {
      // El correo pudo haberse enviado; no revelamos el fallo de registro como éxito falso.
    }

    if (mail.ok && mail.id) {
      failStreak = 0;
      enviados.push({
        rut: trabajador.rut,
        nombre: trabajador.nombre,
        email: trabajador.email,
        id: mail.id,
      });
    } else {
      failStreak += 1;
      fallidos.push({
        rut: trabajador.rut,
        nombre: trabajador.nombre,
        email: trabajador.email,
        reason: "mail_error",
      });
    }
  }

  if (enviados.length) {
    try {
      await withDb(async (client) => {
        await applyMovimientos(client, companyRow, {
          tipo,
          keys: normalizeKeys(enviados.map((e) => e.rut)),
          commit: true,
        });
      });
    } catch {
      // Los envíos ya ocurrieron; el índice único evita doble cobro en reintentos.
    }
  }

  if (!enviados.length) {
    return json(res, 502, {
      ok: false,
      reason: "mail_error",
      enviados,
      fallidos,
    });
  }

  return json(res, 200, {
    ok: fallidos.length === 0,
    enviados,
    fallidos,
  });
}
