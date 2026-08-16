import { DISCLAIMER, DISCLAIMER_FINIQUITO } from "./constants.js";
import { clp, fechaLarga, formatRut } from "./format.js";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function letterheadHtml(empresa, logoSrc) {
  const logo = logoSrc
    ? `<img class="lh-logo" src="${esc(logoSrc)}" alt="Logo de ${esc(empresa?.razonSocial || "la empresa")}" />`
    : "";
  const giro = empresa?.giro ? `<div class="muted">${esc(empresa.giro)}</div>` : "";
  const dir = empresa?.direccion ? `<div class="muted">${esc(empresa.direccion)}</div>` : "";
  return `<div class="letterhead">
    ${logo}
    <div class="lh-id">
      <h1>${esc(empresa?.razonSocial || "Empleador")}</h1>
      <div>RUT ${esc(formatRut(empresa?.rut || "—"))}</div>
      ${giro}
      ${dir}
    </div>
  </div>`;
}

function docShell(title, inner, { extraCss = "" } = {}) {
  return `<!DOCTYPE html>
<html lang="es-CL">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body { font-family: "IBM Plex Sans", system-ui, sans-serif; color: #1a1d1c; font-size: 12px; margin: 0; }
    h1 { font-size: 16px; letter-spacing: -0.02em; margin: 0 0 4px; color: #12382c; }
    h2.doc-title { font-size: 15px; letter-spacing: 0.08em; text-transform: uppercase; color: #12382c; margin: 0 0 12px; }
    .muted { color: #5e6864; }
    .letterhead { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #12382c; padding-bottom: 12px; margin-bottom: 16px; }
    .lh-logo { max-height: 56px; max-width: 140px; object-fit: contain; }
    .lh-id { min-width: 0; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #12382c; padding: 6px 0; border-bottom: 1px solid #d8d4cc; }
    td { padding: 5px 0; border-bottom: 1px solid #eeeae3; }
    td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
    .tot { font-weight: 600; }
    .disc { margin-top: 22px; font-size: 10px; color: #5e6864; line-height: 1.45; }
    .legal { font-size: 12px; line-height: 1.5; }
    ${extraCss}
  </style>
</head>
<body>
${inner}
</body>
</html>`;
}

export function liquidacionHtml({ empresa, trabajador, periodo, calc, logoSrc = "", firmaSrc = "" }) {
  const haberesRows = calc.haberes
    .map(
      (l) =>
        `<tr><td>${esc(l.label)}</td><td class="n">${clp(l.monto)}</td></tr>`,
    )
    .join("");
  const descRows = calc.descuentos
    .map(
      (l) =>
        `<tr><td>${esc(l.label)}</td><td class="n">${clp(l.monto)}</td></tr>`,
    )
    .join("");

  const inner = `
  ${letterheadHtml(empresa, logoSrc)}
  <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:14px">
    <h2 class="doc-title" style="margin:0">Liquidación de sueldo</h2>
    <div class="muted" style="text-align:right">${esc(periodo || fechaLarga())}</div>
  </div>
  <div class="meta">
    <div>Trabajador: <strong>${esc(trabajador?.nombre || "—")}</strong></div>
    <div>RUT: ${esc(formatRut(trabajador?.rut || "—"))}</div>
    <div>Cargo: ${esc(trabajador?.cargo || "—")}</div>
    <div>Contrato: ${esc(calc.contrato === "plazo_fijo" ? "Plazo fijo" : "Indefinido")}</div>
  </div>
  <div class="grid">
    <table>
      <thead><tr><th>Haberes</th><th class="n">Monto</th></tr></thead>
      <tbody>${haberesRows}
        <tr class="tot"><td>Total haberes</td><td class="n">${clp(calc.totalHaberes)}</td></tr>
      </tbody>
    </table>
    <table>
      <thead><tr><th>Descuentos</th><th class="n">Monto</th></tr></thead>
      <tbody>${descRows}
        <tr class="tot"><td>Total descuentos</td><td class="n">${clp(calc.totalDescuentos)}</td></tr>
      </tbody>
    </table>
  </div>
  <div class="liq"><span>Líquido a pago</span><strong>${clp(calc.liquido)}</strong></div>
  <div class="firmas">
    <div class="firma">
      ${firmaSrc ? `<img class="firma-img" src="${esc(firmaSrc)}" alt="Firma del representante legal" />` : ""}
      Empleador<br />${esc(empresa?.razonSocial || "")}
    </div>
    <div class="firma">Trabajador<br />${esc(trabajador?.nombre || "")}</div>
  </div>
  <p class="disc">${esc(DISCLAIMER)}</p>`;

  return docShell("Liquidación de sueldo", inner, {
    extraCss: `
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .meta { margin: 0 0 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
    .liq { margin-top: 18px; background: #12382c; color: #f6f4ef; padding: 12px 14px; display: flex; justify-content: space-between; }
    .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 48px 32px; margin-top: 36px; }
    .firma { border-top: 1px solid #12382c; padding-top: 8px; text-align: center; font-size: 12px; }
    .firma-img { display: block; max-height: 48px; max-width: 160px; margin: 0 auto 8px; object-fit: contain; }
    `,
  });
}

export function cartaFiniquitoHtml({ empresa, trabajador, fin, ciudad = "Santiago", logoSrc = "", firmaSrc = "" }) {
  const partidas = Array.isArray(fin.partidas) && fin.partidas.length
    ? fin.partidas
    : [
        { label: `Indemnización por años de servicio (${fin.anios} años, tope 11)`, monto: fin.ias },
        { label: "Indemnización sustitutiva de aviso previo", monto: fin.aviso },
        { label: `Feriado proporcional (${fin.diasFeriado} días)`, monto: fin.feriado },
        { label: "Otros haberes", monto: fin.otros },
      ];
  const rows = partidas
    .map((p) => `<tr><td>${esc(p.label)}</td><td class="n">${clp(p.monto)}</td></tr>`)
    .join("");
  const causalLabel = fin.causalLabel || fin.causal?.label || `artículo ${fin.articulo} del Código del Trabajo`;
  const textoLegal = fin.textoLegal || fin.causal?.textoLegal || "";

  const inner = `
  ${letterheadHtml(empresa, logoSrc)}
  <h2 class="doc-title" style="text-align:center">Carta de finiquito</h2>
  <p class="legal">En ${esc(ciudad)}, a ${esc(fechaLarga())}.</p>
  <p class="legal">
    Entre <strong>${esc(empresa?.razonSocial || "el empleador")}</strong>,
    RUT ${esc(formatRut(empresa?.rut || "—"))}${empresa?.giro ? `, giro ${esc(empresa.giro)}` : ""}${
      empresa?.direccion ? `, domicilio en ${esc(empresa.direccion)}` : ""
    }, y
    <strong>${esc(trabajador?.nombre || "el trabajador")}</strong>,
    RUT ${esc(formatRut(trabajador?.rut || "—"))},
    se deja constancia del término del contrato de trabajo al amparo de ${esc(causalLabel)}.
  </p>
  ${textoLegal ? `<p class="legal">${esc(textoLegal)}</p>` : ""}
  <p class="legal">
    El trabajador prestó servicios en el cargo de ${esc(trabajador?.cargo || "—")}
    ${trabajador?.ingreso ? `desde el ${esc(trabajador.ingreso)}` : ""}
    ${trabajador?.termino ? `hasta el ${esc(trabajador.termino)}` : ""}.
  </p>
  <p class="legal">Las partes reconocen las siguientes partidas (montos en pesos chilenos):</p>
  <table>
    ${rows}
    <tr class="tot"><td>Total estimado</td><td class="n">${clp(fin.total)}</td></tr>
  </table>
  <p class="legal">
    El trabajador declara recibir a su entera satisfacción las sumas que correspondan
    una vez pagadas, sin que este texto sustituya el pago efectivo ni la revisión de
    cotizaciones previsionales.
  </p>
  <div class="firmas">
    <div class="firma">
      ${firmaSrc ? `<img class="firma-img" src="${esc(firmaSrc)}" alt="Firma del representante legal" />` : ""}
      Empleador<br />${esc(empresa?.razonSocial || "")}
    </div>
    <div class="firma">Trabajador<br />${esc(trabajador?.nombre || "")}</div>
    <div class="firma">Testigo</div>
    <div class="firma">Testigo</div>
  </div>
  <p class="disc">${esc(DISCLAIMER_FINIQUITO)} ${esc(DISCLAIMER)}</p>`;

  return docShell("Carta de finiquito", inner, {
    extraCss: `
    body { font-size: 13px; line-height: 1.55; }
    .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 48px 32px; margin-top: 48px; }
    .firma { border-top: 1px solid #12382c; padding-top: 8px; text-align: center; font-size: 12px; }
    .firma-img { display: block; max-height: 48px; max-width: 160px; margin: 0 auto 8px; object-fit: contain; }
    .disc { border-top: 1px solid #d8d4cc; padding-top: 12px; }
    `,
  });
}

/**
 * Muestra el documento en un iframe de la misma página.
 * No usa window.open: si el navegador bloquea ventanas, la vista previa sigue visible.
 */
export function mostrarVistaPrevia(iframe, html) {
  if (!iframe) throw new Error("No hay visor de documentos en la página");
  iframe.srcdoc = html;
}

export function imprimirIframe(iframe) {
  const w = iframe?.contentWindow;
  if (!w) throw new Error("Abra primero la vista previa");
  w.focus();
  w.print();
}

/** @deprecated La empresa usa vista previa en la página. Se conserva por si algún flujo local lo llama. */
export function abrirImpresion(html) {
  throw new Error("Use la vista previa en la página; no se abre una ventana nueva");
}
