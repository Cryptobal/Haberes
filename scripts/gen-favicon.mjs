/**
 * Genera favicon.ico 32×32 con la misma marca que favicon.svg
 * (tile #12382c, H de dos columnas #f6f4ef). Sin dependencias.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { TILE_FILL, MARK_ON_TILE, TILE_RX, VIEW, pointInMark, faviconSvg } from "./brand-mark.mjs";

const SIZE = VIEW;
const RADIUS = TILE_RX;
const BG = [parseInt(TILE_FILL.slice(1, 3), 16), parseInt(TILE_FILL.slice(3, 5), 16), parseInt(TILE_FILL.slice(5, 7), 16), 0xff];
const FG = [parseInt(MARK_ON_TILE.slice(1, 3), 16), parseInt(MARK_ON_TILE.slice(3, 5), 16), parseInt(MARK_ON_TILE.slice(5, 7), 16), 0xff];

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let b = 0; b < 8; b += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function inRoundedRect(x, y) {
  const x0 = RADIUS;
  const y0 = RADIUS;
  const x1 = SIZE - 1 - RADIUS;
  const y1 = SIZE - 1 - RADIUS;
  if (x >= x0 && x <= x1) return y >= 0 && y < SIZE;
  if (y >= y0 && y <= y1) return x >= 0 && x < SIZE;
  const cx = x < x0 ? x0 : x1;
  const cy = y < y0 ? y0 : y1;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= RADIUS * RADIUS;
}

function rgbaPixels() {
  const px = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const i = (y * SIZE + x) * 4;
      const color = inRoundedRect(x, y) ? (pointInMark(x + 0.5, y + 0.5) ? FG : BG) : [0, 0, 0, 0];
      px[i] = color[0];
      px[i + 1] = color[1];
      px[i + 2] = color[2];
      px[i + 3] = color[3];
    }
  }
  return px;
}

function png32(px) {
  const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));
  for (let y = 0; y < SIZE; y += 1) {
    raw[y * (1 + SIZE * 4)] = 0;
    px.copy(raw, y * (1 + SIZE * 4) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function icoFromPng(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry[0] = SIZE;
  entry[1] = SIZE;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, png]);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
writeFileSync(join(root, "favicon.svg"), faviconSvg());
const ico = icoFromPng(png32(rgbaPixels()));
writeFileSync(join(root, "favicon.ico"), ico);
console.log(`favicon.svg ${faviconSvg().length} bytes`);
console.log(`favicon.ico ${ico.length} bytes`);
