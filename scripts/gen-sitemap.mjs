/**
 * Genera sitemap.xml desde las páginas públicas, con lastmod = mtime del archivo.
 */
import { readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://www.haberes.cl";

const SKIP = new Set(["admin.html", "reset.html"]);

function collectHtml(dir, base = "") {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "api" || name === "scripts" || name === "sql" || name === "ejemplos" || name === "fonts" || name === "img" || name === "css" || name === "js") {
        continue;
      }
      out.push(...collectHtml(full, rel));
    } else if (name.endsWith(".html") && !SKIP.has(name)) {
      out.push({ file: full, rel });
    }
  }
  return out;
}

function toUrl(rel) {
  if (rel === "index.html") return `${ORIGIN}/`;
  const path = rel.replace(/\.html$/, "").replace(/\\/g, "/");
  return `${ORIGIN}/${path}`;
}

const pages = collectHtml(root)
  .map((p) => ({
    loc: toUrl(p.rel),
    lastmod: new Date(statSync(p.file).mtimeMs).toISOString().slice(0, 10),
    rel: p.rel,
  }))
  .sort((a, b) => a.loc.localeCompare(b.loc));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${p.lastmod}</lastmod>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

writeFileSync(join(root, "sitemap.xml"), xml);
console.log(`sitemap: ${pages.length} URLs`);
for (const p of pages) console.log(" ", p.loc);
