#!/usr/bin/env node
/**
 * Servidor estático local con cleanUrls y trailingSlash: false (como vercel.json).
 * /sueldo sirve sueldo.html; /guias sirve guias.html; /guias/foo sirve guias/foo.html.
 * /sitemap.xml, /sitemap y /api/sitemap salen de api/_sitemap.js (sin XML estático).
 * Las demás APIs de Vercel no se ejecutan aquí: responden 501 JSON.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSitemapXml, SITEMAP_CONTENT_TYPE } from "../api/_sitemap.js";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8080);

const TYPES = {
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xml": "text/xml; charset=utf-8",
};

const SITEMAP_HEADERS = {
  "Content-Type": SITEMAP_CONTENT_TYPE,
  "Cache-Control": "public, max-age=0, must-revalidate",
  "X-Content-Type-Options": "nosniff",
};

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify(payload));
}

function underRoot(abs) {
  const rel = relative(ROOT, abs);
  return rel && !rel.startsWith("..") && !rel.startsWith(sep);
}

function tryFile(abs) {
  if (!existsSync(abs) || !underRoot(abs)) return null;
  const st = statSync(abs);
  if (!st.isFile()) return null;
  return abs;
}

function isSitemapPath(pathname) {
  return pathname === "/sitemap.xml" || pathname === "/sitemap" || pathname === "/api/sitemap";
}

function resolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const cleaned = normalize(decoded).replace(/\\/g, "/");
  if (cleaned.includes("\0") || cleaned.startsWith("..") || cleaned.includes("/../")) {
    return { kind: "bad" };
  }
  if (isSitemapPath(cleaned)) {
    return { kind: "sitemap" };
  }
  if (cleaned.startsWith("/api/") || cleaned === "/api") {
    return { kind: "api" };
  }
  const rel = cleaned === "/" ? "index.html" : cleaned.replace(/^\//, "");
  const direct = tryFile(join(ROOT, rel));
  if (direct) return { kind: "file", file: direct };
  if (!extname(rel)) {
    const html = tryFile(join(ROOT, `${rel}.html`));
    if (html) return { kind: "file", file: html };
    const index = tryFile(join(ROOT, rel, "index.html"));
    if (index) return { kind: "file", file: index };
  }
  return { kind: "missing" };
}

export function handleRequest(req, res) {
  let url;
  try {
    url = new URL(req.url || "/", `http://${HOST}`);
  } catch {
    send(res, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Bad Request");
    return;
  }
  const urlPath = url.pathname;
  if (urlPath.length > 1 && urlPath.endsWith("/")) {
    const dest = `${urlPath.replace(/\/+$/, "")}${url.search}`;
    send(res, 301, { Location: dest }, "");
    return;
  }
  const hit = resolvePath(urlPath);
  if (hit.kind === "bad") {
    send(res, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Bad Request");
    return;
  }
  if (hit.kind === "sitemap") {
    const method = String(req.method || "GET").toUpperCase();
    if (method === "HEAD") {
      send(res, 200, SITEMAP_HEADERS, "");
      return;
    }
    if (method !== "GET") {
      send(res, 405, { ...SITEMAP_HEADERS, Allow: "GET, HEAD" }, "");
      return;
    }
    send(res, 200, SITEMAP_HEADERS, buildSitemapXml());
    return;
  }
  if (hit.kind === "api") {
    sendJson(res, 501, { ok: false, error: "no_backend" });
    return;
  }
  if (hit.kind !== "file") {
    send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not Found");
    return;
  }
  const type = TYPES[extname(hit.file).toLowerCase()] || "application/octet-stream";
  const headers = { "Content-Type": type };
  if (String(req.method || "GET").toUpperCase() === "HEAD") {
    send(res, 200, headers, "");
    return;
  }
  res.writeHead(200, headers);
  createReadStream(hit.file).pipe(res);
}

const server = createServer(handleRequest);
const thisFile = fileURLToPath(import.meta.url);
const invoked = process.argv[1] ? resolve(process.argv[1]) : "";
if (invoked === thisFile) {
  server.listen(PORT, HOST, () => {
    console.log(`Haberes en http://${HOST}:${PORT}`);
  });
}

export { server, ROOT, HOST, PORT };
