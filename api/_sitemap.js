/** URLs públicas de haberes.cl. Sin /admin ni /reset. */
import { lastmodForPath, seoPaths } from "../content/registry.js";

export const ORIGIN = "https://www.haberes.cl";

export const SITEMAP_PATHS = seoPaths();

export const SITEMAP_CONTENT_TYPE = "text/xml; charset=utf-8";

const FALLBACK_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${ORIGIN}/</loc>
  </url>
</urlset>
`;

export function sitemapLocs() {
  return SITEMAP_PATHS.map((path) => (path === "/" ? `${ORIGIN}/` : `${ORIGIN}${path}`));
}

export function buildSitemapXml(lastmod) {
  try {
    const forced = lastmod ? String(lastmod).slice(0, 10) : "";
    const urls = sitemapLocs()
      .map((loc) => {
        const path = loc === `${ORIGIN}/` ? "/" : loc.slice(ORIGIN.length) || "/";
        const day = forced || lastmodForPath(path);
        return `  <url>
    <loc>${loc}</loc>
    <lastmod>${day}</lastmod>
  </url>`;
      })
      .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  } catch {
    return FALLBACK_XML;
  }
}
