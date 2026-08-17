#!/usr/bin/env node
/**
 * Servidor estático local con cleanUrls (como vercel.json).
 * /sueldo sirve sueldo.html; /guias/foo sirve guias/foo.html.
 * Las APIs de Vercel no se ejecutan aquí: responden 501 JSON.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

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
  ".xml": "application/xml; charset=utf-8",
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

function resolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const cleaned = normalize(decoded).replace(/\\/g, "/");
  if (cleaned.includes("\0") || cleaned.startsWith("..") || cleaned.includes("/../")) {
    return { kind: "bad" };
  }
  if (cleaned.startsWith("/api/") || cleaned === "/api") {
    return { kind: "api" };
  }
  const rel = cleaned === "/" ? "index.html" : cleaned.replace(/^\//, "").replace(/\/$/, "");
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

const server = createServer((req, res) => {
  let urlPath = "/";
  try {
    urlPath = new URL(req.url || "/", `http://${HOST}`).pathname;
  } catch {
    send(res, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Bad Request");
    return;
  }
  const hit = resolvePath(urlPath);
  if (hit.kind === "bad") {
    send(res, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Bad Request");
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
  res.writeHead(200, { "Content-Type": type });
  createReadStream(hit.file).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`Haberes en http://${HOST}:${PORT}`);
});
