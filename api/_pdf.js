import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DISCLAIMER, DISCLAIMER_FINIQUITO, resumirTextoLegal } from "../js/constants.js";
import { clp, fechaLarga, formatRut } from "../js/format.js";

export const PDF_LAYOUT = {
  page: [595.28, 841.89],
  margin: 48,
  logoMaxH: 56,
  logoMaxW: 140,
  firmaMaxH: 48,
  firmaMaxW: 160,
  gapAfterDescuentos: 16,
  gapBeforeFirmas: 40,
  barH: 28,
  hairline: 0.6,
};

const MARGIN = PDF_LAYOUT.margin;
const INK = rgb(18 / 255, 56 / 255, 44 / 255);
const MUTED = rgb(94 / 255, 104 / 255, 100 / 255);
const TEXT = rgb(26 / 255, 29 / 255, 28 / 255);
const RULE = rgb(216 / 255, 212 / 255, 204 / 255);
const WHITE = rgb(1, 1, 1);

function latin1(s) {
  return String(s ?? "").replace(/[^\x20-\x7E\xA0-\xFF]/g, " ");
}

function money(n) {
  return latin1(clp(n));
}

function wrap(font, text, size, maxWidth) {
  const words = latin1(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
      line = trial;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

async function embedLogo(pdf, bytes, contentType) {
  if (!bytes || !bytes.length) return null;
  const t = String(contentType || "");
  try {
    if (t.includes("png") || bytes[0] === 0x89) return await pdf.embedPng(bytes);
    if (t.includes("jpeg") || t.includes("jpg") || bytes[0] === 0xff) {
      return await pdf.embedJpg(bytes);
    }
  } catch {
    return null;
  }
  return null;
}

function contentWidth(page) {
  return page.getWidth() - MARGIN * 2;
}

function drawAmount(page, font, amount, right, y, size, color) {
  const amt = money(amount);
  page.drawText(amt, {
    x: right - font.widthOfTextAtSize(amt, size),
    y,
    size,
    font,
    color,
  });
}

function letterhead(page, { font, fontBold, empresa, logo }, y) {
  const width = page.getWidth();
  let left = MARGIN;
  let logoBottom = y;
  if (logo) {
    const scale = Math.min(PDF_LAYOUT.logoMaxW / logo.width, PDF_LAYOUT.logoMaxH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    page.drawImage(logo, { x: MARGIN, y: y - h, width: w, height: h });
    left = MARGIN + w + 14;
    logoBottom = y - h;
  }
  const name = latin1(empresa?.razonSocial || "Empleador");
  page.drawText(name, { x: left, y: y - 14, size: 13, font: fontBold, color: INK });
  let cy = y - 28;
  const lines = [
    `RUT ${formatRut(empresa?.rut || "—")}`,
    empresa?.giro ? String(empresa.giro) : "",
    empresa?.direccion ? String(empresa.direccion) : "",
  ].filter(Boolean);
  for (const line of lines) {
    page.drawText(latin1(line), { x: left, y: cy, size: 9, font, color: MUTED });
    cy -= 12;
  }
  const bottom = Math.min(cy, logoBottom) - 10;
  page.drawLine({
    start: { x: MARGIN, y: bottom },
    end: { x: width - MARGIN, y: bottom },
    thickness: PDF_LAYOUT.hairline,
    color: INK,
  });
  return bottom - 18;
}

function drawParagraph(page, font, text, { x, y, size, maxWidth, lineHeight, color = TEXT }) {
  let cy = y;
  for (const line of wrap(font, text, size, maxWidth)) {
    page.drawText(line, { x, y: cy, size, font, color });
    cy -= lineHeight;
  }
  return cy;
}

function ensureSpace(doc, page, font, y, need = 80) {
  if (y > need + 8) return { page, y };
  const next = doc.addPage(PDF_LAYOUT.page);
  return { page: next, y: next.getHeight() - MARGIN };
}

function drawField(page, { font, fontBold, label, value, x, y, width }) {
  page.drawText(latin1(label), { x, y, size: 8, font, color: MUTED });
  const lines = wrap(fontBold, String(value || "—"), 10, width);
  page.drawText(lines[0], { x, y: y - 12, size: 10, font: fontBold, color: TEXT });
  return lines.length > 1 ? 12 * (lines.length - 1) : 0;
}

function drawWorkerGrid(page, { font, fontBold, trabajador, calc, y }) {
  const gap = 20;
  const colW = (contentWidth(page) - gap) / 2;
  const contrato = calc.contrato === "plazo_fijo" ? "Plazo fijo" : "Indefinido";
  const dias = `${calc.dias?.diasTrabajados ?? 30} de ${calc.dias?.diasBase ?? 30}`;
  const cells = [
    ["Trabajador", trabajador?.nombre || "—"],
    ["RUT", formatRut(trabajador?.rut || "—")],
    ["Cargo", trabajador?.cargo || "—"],
    ["Contrato", contrato],
    ["Días trabajados", dias],
  ];
  if ((calc.dias?.diasLicencia || 0) > 0) {
    const n = calc.dias.diasLicencia;
    cells.push(["Licencia médica", `${n} día${n === 1 ? "" : "s"}`]);
  }
  if ((calc.dias?.diasVacaciones || 0) > 0) {
    const n = calc.dias.diasVacaciones;
    cells.push(["Feriado legal", `${n} día${n === 1 ? "" : "s"}`]);
  }

  let cy = y;
  for (let i = 0; i < cells.length; i += 2) {
    const extraL = drawField(page, {
      font,
      fontBold,
      label: cells[i][0],
      value: cells[i][1],
      x: MARGIN,
      y: cy,
      width: colW,
    });
    let extraR = 0;
    if (cells[i + 1]) {
      extraR = drawField(page, {
        font,
        fontBold,
        label: cells[i + 1][0],
        value: cells[i + 1][1],
        x: MARGIN + colW + gap,
        y: cy,
        width: colW,
      });
    }
    cy -= 26 + Math.max(extraL, extraR);
  }
  return cy;
}

function drawTable(doc, page, { font, fontBold, title, rows, totalLabel, total, y }) {
  const right = page.getWidth() - MARGIN;
  const labelMax = right - MARGIN - 120;
  let cur = page;
  let cy = y;

  ({ page: cur, y: cy } = ensureSpace(doc, cur, font, cy, 40));
  cur.drawText(latin1(title), { x: MARGIN, y: cy, size: 10, font: fontBold, color: INK });
  cy -= 8;
  cur.drawLine({
    start: { x: MARGIN, y: cy },
    end: { x: right, y: cy },
    thickness: 0.8,
    color: INK,
  });
  cy -= 14;

  for (const row of rows) {
    const labelLines = wrap(font, row.label, 10, labelMax);
    const rowNeed = 12 * labelLines.length + 10;
    ({ page: cur, y: cy } = ensureSpace(doc, cur, font, cy, rowNeed));
    cur.drawText(labelLines[0] || "", { x: MARGIN, y: cy, size: 10, font, color: TEXT });
    drawAmount(cur, font, row.monto, right, cy, 10, TEXT);
    cy -= 12;
    for (const extra of labelLines.slice(1)) {
      cur.drawText(extra, { x: MARGIN, y: cy, size: 10, font, color: TEXT });
      cy -= 12;
    }
    cur.drawLine({
      start: { x: MARGIN, y: cy + 6 },
      end: { x: right, y: cy + 6 },
      thickness: 0.35,
      color: RULE,
    });
    cy -= 4;
  }

  ({ page: cur, y: cy } = ensureSpace(doc, cur, font, cy, 22));
  cur.drawText(latin1(totalLabel), { x: MARGIN, y: cy, size: 10, font: fontBold, color: INK });
  drawAmount(cur, fontBold, total, right, cy, 10, INK);
  cy -= 6;
  cur.drawLine({
    start: { x: MARGIN, y: cy },
    end: { x: right, y: cy },
    thickness: 0.8,
    color: INK,
  });
  return { page: cur, y: cy };
}

function drawLiquidoBar(page, { fontBold, label, amount, y }) {
  const barH = PDF_LAYOUT.barH;
  const barBottom = y - barH;
  const width = contentWidth(page);
  page.drawRectangle({
    x: MARGIN,
    y: barBottom,
    width,
    height: barH,
    color: INK,
  });
  const size = 11;
  const cap = size * 0.72;
  const textY = barBottom + (barH - cap) / 2;
  page.drawText(latin1(label), {
    x: MARGIN + 12,
    y: textY,
    size,
    font: fontBold,
    color: WHITE,
  });
  const amt = money(amount);
  page.drawText(amt, {
    x: MARGIN + width - 12 - fontBold.widthOfTextAtSize(amt, size),
    y: textY,
    size,
    font: fontBold,
    color: WHITE,
  });
  return barBottom;
}

/**
 * Línea de firma primero. La imagen queda encima, apoyada en la línea, sin cruzarla.
 * @returns espacio usado bajo la línea
 */
function drawSignColumn(page, { font, caption, name, firma, x, y, width }) {
  if (firma) {
    const scale = Math.min(PDF_LAYOUT.firmaMaxW / firma.width, PDF_LAYOUT.firmaMaxH / firma.height);
    const w = Math.min(firma.width * scale, width);
    const h = firma.height * (w / firma.width);
    page.drawImage(firma, {
      x: x + Math.max(0, (width - w) / 2),
      y: y + 3,
      width: w,
      height: h,
    });
  }
  page.drawLine({
    start: { x, y },
    end: { x: x + width, y },
    thickness: 0.8,
    color: INK,
  });
  page.drawText(latin1(caption), { x, y: y - 13, size: 8, font, color: MUTED });
  if (name) {
    const lines = wrap(font, name, 9, width);
    page.drawText(lines[0], { x, y: y - 25, size: 9, font, color: TEXT });
  }
}

function drawDisclaimer(page, font, y, extra = "") {
  const maxWidth = contentWidth(page);
  const text = extra ? `${extra} ${DISCLAIMER}` : DISCLAIMER;
  return drawParagraph(page, font, text, {
    x: MARGIN,
    y,
    size: 8,
    maxWidth,
    lineHeight: 11,
    color: MUTED,
  });
}

export async function buildLiquidacionPdf({
  empresa,
  trabajador,
  periodo,
  calc,
  logoBytes,
  logoType,
  firmaBytes,
  firmaType,
}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page0 = pdf.addPage(PDF_LAYOUT.page);
  const logo = await embedLogo(pdf, logoBytes, logoType);
  const firma = await embedLogo(pdf, firmaBytes, firmaType);
  let page = page0;
  let y = letterhead(page, { font, fontBold, empresa, logo }, page.getHeight() - MARGIN);

  page.drawText(latin1("LIQUIDACIÓN DE SUELDO"), { x: MARGIN, y, size: 12, font: fontBold, color: INK });
  const per = latin1(periodo || fechaLarga());
  page.drawText(per, {
    x: page.getWidth() - MARGIN - font.widthOfTextAtSize(per, 10),
    y,
    size: 10,
    font,
    color: MUTED,
  });
  y -= 22;

  y = drawWorkerGrid(page, { font, fontBold, trabajador, calc, y });
  if (calc.leyendaLicencia) {
    y = drawParagraph(page, font, calc.leyendaLicencia, {
      x: MARGIN,
      y: y + 4,
      size: 8,
      maxWidth: contentWidth(page),
      lineHeight: 11,
      color: MUTED,
    });
  }
  y -= 12;

  ({ page, y } = drawTable(pdf, page, {
    font,
    fontBold,
    title: "Haberes",
    rows: calc.haberes || [],
    totalLabel: "Total haberes",
    total: calc.totalHaberes,
    y,
  }));
  y -= 16;
  ({ page, y } = drawTable(pdf, page, {
    font,
    fontBold,
    title: "Descuentos",
    rows: calc.descuentos || [],
    totalLabel: "Total descuentos",
    total: calc.totalDescuentos,
    y,
  }));

  const gapBar = PDF_LAYOUT.gapAfterDescuentos;
  ({ page, y } = ensureSpace(pdf, page, font, y, gapBar + PDF_LAYOUT.barH + 8));
  y -= gapBar;
  y = drawLiquidoBar(page, { fontBold, label: "Líquido a pago", amount: calc.liquido, y });

  const colGap = 24;
  const colW = (contentWidth(page) - colGap) / 2;
  const firmaNeed = PDF_LAYOUT.gapBeforeFirmas + PDF_LAYOUT.firmaMaxH + 36;
  ({ page, y } = ensureSpace(pdf, page, font, y, firmaNeed));
  y -= PDF_LAYOUT.gapBeforeFirmas + (firma ? PDF_LAYOUT.firmaMaxH : 8);
  drawSignColumn(page, {
    font,
    caption: "Trabajador",
    name: trabajador?.nombre || "",
    x: MARGIN,
    y,
    width: colW,
  });
  drawSignColumn(page, {
    font,
    caption: "Empleador / representante legal",
    name: empresa?.razonSocial || "",
    firma,
    x: MARGIN + colW + colGap,
    y,
    width: colW,
  });
  y -= 48;
  ({ page, y } = ensureSpace(pdf, page, font, y, 48));
  drawDisclaimer(page, font, y);
  return Buffer.from(await pdf.save());
}

export async function buildFiniquitoPdf({
  empresa,
  trabajador,
  fin,
  ciudad = "Santiago",
  logoBytes,
  logoType,
  firmaBytes,
  firmaType,
}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page0 = pdf.addPage(PDF_LAYOUT.page);
  const logo = await embedLogo(pdf, logoBytes, logoType);
  const firma = await embedLogo(pdf, firmaBytes, firmaType);
  let page = page0;
  let y = letterhead(page, { font, fontBold, empresa, logo }, page.getHeight() - MARGIN);
  const maxWidth = contentWidth(page);

  const title = "CARTA DE FINIQUITO";
  page.drawText(title, {
    x: (page.getWidth() - fontBold.widthOfTextAtSize(title, 13)) / 2,
    y,
    size: 13,
    font: fontBold,
    color: INK,
  });
  y -= 24;

  y = drawParagraph(page, font, `En ${ciudad}, a ${fechaLarga()}.`, {
    x: MARGIN,
    y,
    size: 11,
    maxWidth,
    lineHeight: 15,
  });
  y -= 8;

  const giro = empresa?.giro ? `, giro ${empresa.giro}` : "";
  const dir = empresa?.direccion ? `, domicilio en ${empresa.direccion}` : "";
  const causalLabel = fin.causalLabel || fin.causal?.label || `artículo ${fin.articulo} del Código del Trabajo`;
  y = drawParagraph(
    page,
    font,
    `Entre ${empresa?.razonSocial || "el empleador"}, RUT ${formatRut(empresa?.rut || "—")}${giro}${dir}, y ${
      trabajador?.nombre || "el trabajador"
    }, RUT ${formatRut(trabajador?.rut || "—")}, se deja constancia del término del contrato de trabajo al amparo de ${causalLabel}.`,
    { x: MARGIN, y, size: 11, maxWidth, lineHeight: 15 },
  );
  y -= 8;

  const legal = resumirTextoLegal(fin.textoLegal || fin.causal?.textoLegal || "", causalLabel);
  const partiesAlready = `al amparo de ${causalLabel}`;
  if (legal && !partiesAlready.includes(legal) && legal !== `El término se funda en ${causalLabel}.`) {
    ({ page, y } = ensureSpace(pdf, page, font, y, 48));
    y = drawParagraph(page, font, legal, {
      x: MARGIN,
      y,
      size: 10,
      maxWidth,
      lineHeight: 14,
    });
    y -= 8;
  }

  y = drawParagraph(
    page,
    font,
    `El trabajador prestó servicios en el cargo de ${trabajador?.cargo || "—"}${
      trabajador?.ingreso ? ` desde el ${trabajador.ingreso}` : ""
    }${trabajador?.termino ? ` hasta el ${trabajador.termino}` : ""}.`,
    { x: MARGIN, y, size: 11, maxWidth, lineHeight: 15 },
  );
  y -= 10;
  y = drawParagraph(page, font, "Las partes reconocen las siguientes partidas (montos en pesos chilenos):", {
    x: MARGIN,
    y,
    size: 11,
    maxWidth,
    lineHeight: 15,
  });
  y -= 10;

  const partidas = Array.isArray(fin.partidas) && fin.partidas.length ? fin.partidas : [];
  ({ page, y } = drawTable(pdf, page, {
    font,
    fontBold,
    title: "Partidas",
    rows: partidas,
    totalLabel: "Total",
    total: fin.total,
    y,
  }));

  ({ page, y } = ensureSpace(pdf, page, font, y, 70));
  y -= 14;
  y = drawParagraph(
    page,
    font,
    "El trabajador declara recibir a su entera satisfacción las sumas que correspondan una vez pagadas, sin que este texto sustituya el pago efectivo ni la revisión de cotizaciones previsionales.",
    { x: MARGIN, y, size: 11, maxWidth, lineHeight: 15 },
  );

  const colGap = 24;
  const colW = (contentWidth(page) - colGap) / 2;
  const signNeed = 36 + PDF_LAYOUT.firmaMaxH + 40 + 40;
  ({ page, y } = ensureSpace(pdf, page, font, y, signNeed));
  y -= 36 + (firma ? PDF_LAYOUT.firmaMaxH : 8);
  drawSignColumn(page, {
    font,
    caption: "Empleador / representante legal",
    name: empresa?.razonSocial || "",
    firma,
    x: MARGIN,
    y,
    width: colW,
  });
  drawSignColumn(page, {
    font,
    caption: "Trabajador",
    name: trabajador?.nombre || "",
    x: MARGIN + colW + colGap,
    y,
    width: colW,
  });
  y -= 52;
  ({ page, y } = ensureSpace(pdf, page, font, y, 50));
  for (let i = 0; i < 2; i += 1) {
    drawSignColumn(page, {
      font,
      caption: "Testigo",
      name: "",
      x: MARGIN + i * (colW + colGap),
      y,
      width: colW,
    });
  }
  y -= 44;
  ({ page, y } = ensureSpace(pdf, page, font, y, 60));
  drawDisclaimer(page, font, y, DISCLAIMER_FINIQUITO);
  return Buffer.from(await pdf.save());
}

export async function mergePdfs(buffers) {
  const list = (buffers || []).filter(Boolean);
  if (!list.length) throw new Error("empty");
  if (list.length === 1) return Buffer.from(list[0]);
  const out = await PDFDocument.create();
  for (const buf of list) {
    const src = await PDFDocument.load(buf);
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const p of pages) out.addPage(p);
  }
  return Buffer.from(await out.save());
}
