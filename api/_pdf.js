import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DISCLAIMER, DISCLAIMER_FINIQUITO } from "../js/constants.js";
import { clp, fechaLarga, formatRut } from "../js/format.js";

const INK = rgb(18 / 255, 56 / 255, 44 / 255);
const MUTED = rgb(94 / 255, 104 / 255, 100 / 255);
const TEXT = rgb(26 / 255, 29 / 255, 28 / 255);

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

async function letterhead(page, { font, fontBold, empresa, logo }, y) {
  const margin = 48;
  const width = page.getWidth();
  let left = margin;
  if (logo) {
    const maxH = 48;
    const maxW = 120;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    page.drawImage(logo, { x: margin, y: y - h, width: w, height: h });
    left = margin + w + 14;
  }
  const name = latin1(empresa?.razonSocial || "Empleador");
  page.drawText(name, { x: left, y: y - 14, size: 14, font: fontBold, color: INK });
  let cy = y - 30;
  const lines = [
    `RUT ${formatRut(empresa?.rut || "—")}`,
    empresa?.giro ? String(empresa.giro) : "",
    empresa?.direccion ? String(empresa.direccion) : "",
  ].filter(Boolean);
  for (const line of lines) {
    page.drawText(latin1(line), { x: left, y: cy, size: 9, font, color: MUTED });
    cy -= 12;
  }
  const bottom = Math.min(cy, y - (logo ? 52 : 44));
  page.drawLine({
    start: { x: margin, y: bottom },
    end: { x: width - margin, y: bottom },
    thickness: 1.4,
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
  if (y > need) return { page, y };
  const next = doc.addPage([595.28, 841.89]);
  return { page: next, y: next.getHeight() - 48 };
}

function drawRows(doc, page, { font, fontBold, rows, y, totalLabel, total }) {
  const margin = 48;
  const width = page.getWidth();
  const right = width - margin;
  let cur = page;
  let cy = y;
  for (const row of rows) {
    ({ page: cur, y: cy } = ensureSpace(doc, cur, font, cy, 36));
    const labelLines = wrap(font, row.label, 10, right - margin - 120);
    cur.drawText(labelLines[0] || "", { x: margin, y: cy, size: 10, font, color: TEXT });
    const amt = money(row.monto);
    cur.drawText(amt, {
      x: right - font.widthOfTextAtSize(amt, 10),
      y: cy,
      size: 10,
      font,
      color: TEXT,
    });
    cy -= 12;
    for (const extra of labelLines.slice(1)) {
      cur.drawText(extra, { x: margin, y: cy, size: 10, font, color: TEXT });
      cy -= 12;
    }
    cur.drawLine({
      start: { x: margin, y: cy + 6 },
      end: { x: right, y: cy + 6 },
      thickness: 0.3,
      color: rgb(0.87, 0.85, 0.8),
    });
    cy -= 4;
  }
  ({ page: cur, y: cy } = ensureSpace(doc, cur, font, cy, 28));
  cur.drawText(latin1(totalLabel), { x: margin, y: cy, size: 11, font: fontBold, color: INK });
  const tot = money(total);
  cur.drawText(tot, {
    x: right - fontBold.widthOfTextAtSize(tot, 11),
    y: cy,
    size: 11,
    font: fontBold,
    color: INK,
  });
  return { page: cur, y: cy - 18 };
}

function drawDisclaimer(page, font, y, extra = "") {
  const margin = 48;
  const maxWidth = page.getWidth() - margin * 2;
  const text = extra ? `${extra} ${DISCLAIMER}` : DISCLAIMER;
  return drawParagraph(page, font, text, {
    x: margin,
    y,
    size: 8,
    maxWidth,
    lineHeight: 11,
    color: MUTED,
  });
}

export async function buildLiquidacionPdf({ empresa, trabajador, periodo, calc, logoBytes, logoType }) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page0 = pdf.addPage([595.28, 841.89]);
  const logo = await embedLogo(pdf, logoBytes, logoType);
  let page = page0;
  let y = await letterhead(page, { font, fontBold, empresa, logo }, page.getHeight() - 40);
  const margin = 48;
  const maxWidth = page.getWidth() - margin * 2;

  page.drawText(latin1("LIQUIDACIÓN DE SUELDO"), { x: margin, y, size: 12, font: fontBold, color: INK });
  const per = latin1(periodo || fechaLarga());
  page.drawText(per, {
    x: page.getWidth() - margin - font.widthOfTextAtSize(per, 10),
    y,
    size: 10,
    font,
    color: MUTED,
  });
  y -= 20;

  y = drawParagraph(
    page,
    font,
    `Trabajador: ${trabajador?.nombre || "—"}  RUT: ${formatRut(trabajador?.rut || "—")}  Cargo: ${
      trabajador?.cargo || "—"
    }  Contrato: ${calc.contrato === "plazo_fijo" ? "Plazo fijo" : "Indefinido"}`,
    { x: margin, y, size: 10, maxWidth, lineHeight: 13 },
  );
  y -= 8;

  page.drawText("Haberes", { x: margin, y, size: 10, font: fontBold, color: INK });
  y -= 16;
  ({ page, y } = drawRows(pdf, page, {
    font,
    fontBold,
    rows: calc.haberes || [],
    y,
    totalLabel: "Total haberes",
    total: calc.totalHaberes,
  }));
  page.drawText("Descuentos", { x: margin, y, size: 10, font: fontBold, color: INK });
  y -= 16;
  ({ page, y } = drawRows(pdf, page, {
    font,
    fontBold,
    rows: calc.descuentos || [],
    y,
    totalLabel: "Total descuentos",
    total: calc.totalDescuentos,
  }));
  ({ page, y } = ensureSpace(pdf, page, font, y, 40));
  page.drawRectangle({
    x: margin,
    y: y - 8,
    width: page.getWidth() - margin * 2,
    height: 28,
    color: INK,
  });
  page.drawText(latin1("Líquido a pago"), {
    x: margin + 10,
    y: y + 2,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  const liq = money(calc.liquido);
  page.drawText(liq, {
    x: page.getWidth() - margin - 10 - fontBold.widthOfTextAtSize(liq, 11),
    y: y + 2,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  y -= 36;
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
}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page0 = pdf.addPage([595.28, 841.89]);
  const logo = await embedLogo(pdf, logoBytes, logoType);
  let page = page0;
  let y = await letterhead(page, { font, fontBold, empresa, logo }, page.getHeight() - 40);
  const margin = 48;
  const maxWidth = page.getWidth() - margin * 2;

  page.drawText("CARTA DE FINIQUITO", {
    x: (page.getWidth() - fontBold.widthOfTextAtSize("CARTA DE FINIQUITO", 13)) / 2,
    y,
    size: 13,
    font: fontBold,
    color: INK,
  });
  y -= 22;

  y = drawParagraph(page, font, `En ${ciudad}, a ${fechaLarga()}.`, {
    x: margin,
    y,
    size: 11,
    maxWidth,
    lineHeight: 14,
  });
  y -= 6;

  const giro = empresa?.giro ? `, giro ${empresa.giro}` : "";
  const dir = empresa?.direccion ? `, domicilio en ${empresa.direccion}` : "";
  const causalLabel = fin.causalLabel || fin.causal?.label || `articulo ${fin.articulo} del Codigo del Trabajo`;
  y = drawParagraph(
    page,
    font,
    `Entre ${empresa?.razonSocial || "el empleador"}, RUT ${formatRut(empresa?.rut || "—")}${giro}${dir}, y ${
      trabajador?.nombre || "el trabajador"
    }, RUT ${formatRut(trabajador?.rut || "—")}, se deja constancia del termino del contrato de trabajo al amparo de ${causalLabel}.`,
    { x: margin, y, size: 11, maxWidth, lineHeight: 14 },
  );
  y -= 8;

  if (fin.textoLegal) {
    ({ page, y } = ensureSpace(pdf, page, font, y, 90));
    y = drawParagraph(page, font, fin.textoLegal, {
      x: margin,
      y,
      size: 10,
      maxWidth,
      lineHeight: 13,
    });
    y -= 8;
  }

  y = drawParagraph(
    page,
    font,
    `El trabajador presto servicios en el cargo de ${trabajador?.cargo || "—"}${
      trabajador?.ingreso ? ` desde el ${trabajador.ingreso}` : ""
    }${trabajador?.termino ? ` hasta el ${trabajador.termino}` : ""}.`,
    { x: margin, y, size: 11, maxWidth, lineHeight: 14 },
  );
  y -= 6;
  y = drawParagraph(page, font, "Las partes reconocen las siguientes partidas (montos en pesos chilenos):", {
    x: margin,
    y,
    size: 11,
    maxWidth,
    lineHeight: 14,
  });
  y -= 6;

  const partidas = Array.isArray(fin.partidas) && fin.partidas.length
    ? fin.partidas
    : [];
  ({ page, y } = drawRows(pdf, page, {
    font,
    fontBold,
    rows: partidas,
    y,
    totalLabel: "Total estimado",
    total: fin.total,
  }));

  ({ page, y } = ensureSpace(pdf, page, font, y, 70));
  y = drawParagraph(
    page,
    font,
    "El trabajador declara recibir a su entera satisfaccion las sumas que correspondan una vez pagadas, sin que este texto sustituya el pago efectivo ni la revision de cotizaciones previsionales.",
    { x: margin, y, size: 11, maxWidth, lineHeight: 14 },
  );
  y -= 36;

  const col = (page.getWidth() - margin * 2 - 24) / 2;
  const names = [
    ["Empleador", empresa?.razonSocial || ""],
    ["Trabajador", trabajador?.nombre || ""],
    ["Testigo", ""],
    ["Testigo", ""],
  ];
  for (let i = 0; i < 4; i += 1) {
    if (i === 2) {
      y -= 36;
      ({ page, y } = ensureSpace(pdf, page, font, y, 70));
    }
    const x = margin + (i % 2) * (col + 24);
    const fy = i < 2 ? y : y;
    page.drawLine({
      start: { x, y: fy },
      end: { x: x + col, y: fy },
      thickness: 0.8,
      color: INK,
    });
    page.drawText(latin1(names[i][0]), { x, y: fy - 14, size: 9, font, color: MUTED });
    if (names[i][1]) {
      page.drawText(latin1(names[i][1]), { x, y: fy - 26, size: 9, font, color: TEXT });
    }
  }
  y -= 80;
  ({ page, y } = ensureSpace(pdf, page, font, y, 60));
  drawDisclaimer(page, font, y, DISCLAIMER_FINIQUITO);
  return Buffer.from(await pdf.save());
}
