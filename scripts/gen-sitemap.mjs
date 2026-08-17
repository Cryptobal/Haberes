/**
 * Genera sitemap.xml desde las páginas públicas.
 * La lista canónica vive en api/_sitemap.js (la sirve /api/sitemap).
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSitemapXml, sitemapLocs } from "../api/_sitemap.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const xml = buildSitemapXml();
writeFileSync(join(root, "sitemap.xml"), xml);
const locs = sitemapLocs();
console.log(`sitemap: ${locs.length} URLs`);
for (const loc of locs) console.log(" ", loc);
