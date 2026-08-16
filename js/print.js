import { DISCLAIMER, DISCLAIMER_FINIQUITO } from "./constants.js";
import { clp, fechaLarga, formatRut } from "./format.js";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function liquidacionHtml({ empresa, trabajador, periodo, calc }) {
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

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Liquidación de sueldo</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: "IBM Plex Sans", system-ui, sans-serif; color: #1a1d1c; font-size: 12px; }
    h1 { font-size: 16px; letter-spacing: -0.02em; margin: 0 0 4px; color: #12382c; }
    .muted { color: #5e6864; }
    .head { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #12382c; padding-bottom: 12px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #12382c; padding: 6px 0; border-bottom: 1px solid #d8d4cc; }
    td { padding: 5px 0; border-bottom: 1px solid #eeeae3; }
    td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
    .tot { font-weight: 600; }
    .liq { margin-top: 18px; background: #12382c; color: #f6f4ef; padding: 12px 14px; display: flex; justify-content: space-between; }
    .disc { margin-top: 22px; font-size: 10px; color: #5e6864; line-height: 1.45; }
    .meta { margin: 0 0 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  </style>
</head>
<body>
  <div class="head">
    <div>
      <h1>${esc(empresa?.razonSocial || "Empleador")}</h1>
      <div class="muted">RUT ${esc(formatRut(empresa?.rut || "—"))}</div>
    </div>
    <div style="text-align:right">
      <strong>Liquidación de sueldo</strong>
      <div class="muted">${esc(periodo || fechaLarga())}</div>
    </div>
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
  <p class="disc">${esc(DISCLAIMER)}</p>
</body>
</html>`;
}

export function cartaFiniquitoHtml({ empresa, trabajador, fin, ciudad = "Santiago" }) {
  const artLabel =
    fin.articulo === "161"
      ? "artículo 161 del Código del Trabajo (desahucio o necesidades de la empresa)"
      : fin.articulo === "160"
        ? "artículo 160 del Código del Trabajo"
        : "artículo 159 del Código del Trabajo";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Carta de finiquito</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: "IBM Plex Sans", system-ui, sans-serif; color: #1a1d1c; font-size: 13px; line-height: 1.55; }
    h1 { font-size: 18px; letter-spacing: 0.12em; text-transform: uppercase; text-align: center; color: #12382c; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    td { padding: 6px 0; border-bottom: 1px solid #eeeae3; }
    td.n { text-align: right; font-variant-numeric: tabular-nums; }
    .tot td { font-weight: 600; border-bottom: none; }
    .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 48px 32px; margin-top: 48px; }
    .firma { border-top: 1px solid #12382c; padding-top: 8px; text-align: center; font-size: 12px; }
    .disc { margin-top: 36px; font-size: 10px; color: #5e6864; border-top: 1px solid #d8d4cc; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>Carta de finiquito</h1>
  <p>En ${esc(ciudad)}, a ${esc(fechaLarga())}.</p>
  <p>
    Entre <strong>${esc(empresa?.razonSocial || "el empleador")}</strong>,
    RUT ${esc(formatRut(empresa?.rut || "—"))}, y
    <strong>${esc(trabajador?.nombre || "el trabajador")}</strong>,
    RUT ${esc(formatRut(trabajador?.rut || "—"))},
    se deja constancia del término del contrato de trabajo al amparo del ${esc(artLabel)}.
  </p>
  <p>
    El trabajador prestó servicios en el cargo de ${esc(trabajador?.cargo || "—")}
    ${trabajador?.ingreso ? `desde el ${esc(trabajador.ingreso)}` : ""}
    ${trabajador?.termino ? `hasta el ${esc(trabajador.termino)}` : ""}.
  </p>
  <p>Las partes reconocen las siguientes partidas (montos en pesos chilenos):</p>
  <table>
    <tr><td>Indemnización por años de servicio (${esc(String(fin.anios))} años, tope 11)</td><td class="n">${clp(fin.ias)}</td></tr>
    <tr><td>Indemnización sustitutiva de aviso previo</td><td class="n">${clp(fin.aviso)}</td></tr>
    <tr><td>Feriado proporcional (${esc(String(fin.diasFeriado))} días)</td><td class="n">${clp(fin.feriado)}</td></tr>
    <tr><td>Otros haberes</td><td class="n">${clp(fin.otros)}</td></tr>
    <tr class="tot"><td>Total estimado</td><td class="n">${clp(fin.total)}</td></tr>
  </table>
  <p>
    El trabajador declara recibir a su entera satisfacción las sumas que correspondan
    una vez pagadas, sin que este texto sustituya el pago efectivo ni la revisión de
    cotizaciones previsionales.
  </p>
  <div class="firmas">
    <div class="firma">Empleador<br />${esc(empresa?.razonSocial || "")}</div>
    <div class="firma">Trabajador<br />${esc(trabajador?.nombre || "")}</div>
    <div class="firma">Testigo</div>
    <div class="firma">Testigo</div>
  </div>
  <p class="disc">${esc(DISCLAIMER_FINIQUITO)} ${esc(DISCLAIMER)}</p>
</body>
</html>`;
}

export function abrirImpresion(html) {
  const w = window.open("", "_blank", "noopener,width=900,height=700");
  if (!w) {
    throw new Error("El navegador bloqueó la ventana de impresión");
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}
