/**
 * Lista el sitemap canónico (api/_sitemap.js / seoPaths()).
 * No escribe sitemap.xml en la raíz: Vercel serviría ese XML estático
 * y devolvería 500 a Googlebot / GSC. La ruta pública la cubre api/sitemap.js.
 */
import { sitemapLocs } from "../api/_sitemap.js";

const locs = sitemapLocs();
console.log(`sitemap: ${locs.length} URLs`);
for (const loc of locs) console.log(" ", loc);
