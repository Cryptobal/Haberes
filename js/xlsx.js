/**
 * XLSX mínimo (escritura STORE + lectura STORE/DEFLATE).
 * Sin SheetJS/exceljs: el sitio sirve ES modules sin empaquetar.
 */

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i += 1) {
  let c = i;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[i] = c >>> 0;
}

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n) {
  const b = new Uint8Array(2);
  b[0] = n & 255;
  b[1] = (n >>> 8) & 255;
  return b;
}

function u32(n) {
  const b = new Uint8Array(4);
  b[0] = n & 255;
  b[1] = (n >>> 8) & 255;
  b[2] = (n >>> 16) & 255;
  b[3] = (n >>> 24) & 255;
  return b;
}

function concat(parts) {
  const size = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(size);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function utf8(str) {
  return new TextEncoder().encode(str);
}

function xmlEscape(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function colLetter(n) {
  let x = n;
  let s = "";
  while (x > 0) {
    x -= 1;
    s = String.fromCharCode(65 + (x % 26)) + s;
    x = Math.floor(x / 26);
  }
  return s;
}

function colIndex(ref) {
  const m = String(ref).match(/^([A-Z]+)/i);
  if (!m) return 1;
  let n = 0;
  for (const ch of m[1].toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function sheetName(name, used) {
  let base = String(name || "Hoja")
    .replace(/[\\/?*[\]]/g, " ")
    .slice(0, 31)
    .trim() || "Hoja";
  let n = base;
  let i = 2;
  while (used.has(n.toLowerCase())) {
    const suffix = ` (${i})`;
    n = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    i += 1;
  }
  used.add(n.toLowerCase());
  return n;
}

function cellXml(r, c, value) {
  const ref = `${colLetter(c)}${r}`;
  if (value == null || value === "") {
    return "";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function sheetXml(rows) {
  const body = (rows || [])
    .map((row, i) => {
      const r = i + 1;
      const cells = (row || []).map((v, j) => cellXml(r, j + 1, v)).join("");
      return `<row r="${r}">${cells}</row>`;
    })
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetData>${body}</sheetData></worksheet>`
  );
}

function zipStore(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const nameBytes = utf8(file.name);
    const data = file.data;
    const crc = crc32(data);
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
      data,
    ]);
    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralDir = concat(centrals);
  const eocd = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);
  return concat([...locals, centralDir, eocd]);
}

/**
 * @param {{ name: string, rows: Array<Array<string|number|null>> }[]} sheets
 * @returns {Uint8Array}
 */
export function writeXlsx(sheets) {
  const used = new Set();
  const list = (sheets || []).map((s, i) => ({
    name: sheetName(s.name || `Hoja${i + 1}`, used),
    rows: s.rows || [],
  }));
  if (!list.length) list.push({ name: "Hoja1", rows: [] });

  const sheetFiles = list.map((s, i) => ({
    name: `xl/worksheets/sheet${i + 1}.xml`,
    data: utf8(sheetXml(s.rows)),
  }));

  const workbook =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>` +
    list
      .map(
        (s, i) =>
          `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
      )
      .join("") +
    `</sheets></workbook>`;

  const workbookRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    list
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join("") +
    `</Relationships>`;

  const rootRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const overrides = list
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("");
  const types =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `${overrides}</Types>`;

  return zipStore([
    { name: "[Content_Types].xml", data: utf8(types) },
    { name: "_rels/.rels", data: utf8(rootRels) },
    { name: "xl/workbook.xml", data: utf8(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: utf8(workbookRels) },
    ...sheetFiles,
  ]);
}

export function xlsxBlob(sheets) {
  const bytes = writeXlsx(sheets);
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function readU16(buf, o) {
  return buf[o] | (buf[o + 1] << 8);
}

function readU32(buf, o) {
  return (buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16) | (buf[o + 3] << 24)) >>> 0;
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== "undefined") {
    const ds = new DecompressionStream("deflate-raw");
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  const zlib = await import("node:zlib");
  return zlib.inflateRawSync(bytes);
}

async function unzip(buf) {
  const data = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let eocd = -1;
  for (let i = data.length - 22; i >= 0; i -= 1) {
    if (readU32(data, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("El XLSX no es un archivo ZIP válido");
  const count = readU16(data, eocd + 10);
  let offset = readU32(data, eocd + 16);
  const files = {};
  for (let n = 0; n < count; n += 1) {
    if (readU32(data, offset) !== 0x02014b50) break;
    const method = readU16(data, offset + 10);
    const compSize = readU32(data, offset + 20);
    const nameLen = readU16(data, offset + 28);
    const extraLen = readU16(data, offset + 30);
    const commentLen = readU16(data, offset + 32);
    const localOff = readU32(data, offset + 42);
    const name = new TextDecoder("utf-8").decode(data.subarray(offset + 46, offset + 46 + nameLen));
    const localNameLen = readU16(data, localOff + 26);
    const localExtra = readU16(data, localOff + 28);
    const start = localOff + 30 + localNameLen + localExtra;
    const compressed = data.subarray(start, start + compSize);
    let raw = compressed;
    if (method === 8) raw = await inflateRaw(compressed);
    else if (method !== 0) throw new Error("XLSX con compresión no soportada");
    files[name] = raw;
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

function decodeXml(bytes) {
  return new TextDecoder("utf-8").decode(bytes);
}

function parseSharedStrings(xml) {
  const out = [];
  const re = /<si\b[^>]*>([\s\S]*?)<\/si>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const texts = [...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)].map((t) => decodeXmlEntities(t[1]));
    out.push(texts.join(""));
  }
  return out;
}

function decodeXmlEntities(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseSheetRows(xml, shared) {
  const rows = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(xml))) {
    const rowXml = rowMatch[1];
    const cells = [];
    const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/gi;
    let cellMatch;
    while ((cellMatch = cellRe.exec(rowXml))) {
      const attrs = cellMatch[1] || cellMatch[3] || "";
      const inner = cellMatch[2] || "";
      const ref = (attrs.match(/\br="([^"]+)"/) || [])[1] || "";
      const t = (attrs.match(/\bt="([^"]+)"/) || [])[1] || "";
      const idx = colIndex(ref || "A");
      let val = "";
      if (t === "inlineStr") {
        const tm = inner.match(/<t\b[^>]*>([\s\S]*?)<\/t>/i);
        val = decodeXmlEntities(tm ? tm[1] : "");
      } else {
        const vm = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i);
        const raw = vm ? decodeXmlEntities(vm[1]) : "";
        if (t === "s") val = shared[Number(raw)] || "";
        else val = raw;
      }
      cells[idx - 1] = val;
    }
    rows.push(cells);
  }
  return rows;
}

/**
 * Lee la primera hoja como filas de texto (para nómina CSV/XLSX).
 * @returns {Promise<string[][]>}
 */
export async function readXlsxFirstSheet(buffer) {
  const files = await unzip(buffer);
  const wb = decodeXml(files["xl/workbook.xml"] || utf8(""));
  const sheetMatch = wb.match(/<sheet\b[^>]*r:id="([^"]+)"[^>]*>|<sheet\b[^>]*name="[^"]+"[^>]*r:id="([^"]+)"/i);
  const relId = sheetMatch ? sheetMatch[1] || sheetMatch[2] : "rId1";
  const rels = decodeXml(files["xl/_rels/workbook.xml.rels"] || utf8(""));
  const relRe = new RegExp(`Id="${relId}"[^>]*Target="([^"]+)"`, "i");
  const target = (rels.match(relRe) || [])[1] || "worksheets/sheet1.xml";
  const sheetPath = `xl/${target.replace(/^\//, "").replace(/^\.\.\//, "")}`;
  const sheetXmlText = decodeXml(files[sheetPath] || files["xl/worksheets/sheet1.xml"] || utf8(""));
  const shared = files["xl/sharedStrings.xml"]
    ? parseSharedStrings(decodeXml(files["xl/sharedStrings.xml"]))
    : [];
  return parseSheetRows(sheetXmlText, shared);
}

export function rowsToCsv(rows) {
  return (rows || [])
    .map((row) =>
      (row || [])
        .map((cell) => {
          const s = String(cell ?? "");
          if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
          return s;
        })
        .join(","),
    )
    .join("\n");
}
