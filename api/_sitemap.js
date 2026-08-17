/** URLs públicas de haberes.cl. Sin /admin ni /reset. */
export const ORIGIN = "https://www.haberes.cl";

export const SITEMAP_PATHS = [
  "/",
  "/como",
  "/empresa",
  "/finiquito",
  "/finiquito/art-159-renuncia-voluntaria",
  "/finiquito/art-159-vencimiento-del-plazo",
  "/finiquito/art-160-incumplimiento-grave",
  "/finiquito/art-161-desahucio",
  "/finiquito/art-161-necesidades-de-la-empresa",
  "/guias/como-leer-una-liquidacion-de-sueldo",
  "/guias/con-que-sueldo-se-calcula-el-finiquito",
  "/guias/finiquito-trabajadora-de-casa-particular",
  "/guias/formato-de-liquidacion-de-sueldo-chile",
  "/guias/liquidacion-de-sueldo-y-previred",
  "/guias/me-reservo-el-derecho-en-el-finiquito",
  "/guias/plazo-de-pago-del-finiquito",
  "/precios",
  "/privacidad",
  "/sueldo",
  "/terminos",
];

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

export function buildSitemapXml(lastmod = new Date().toISOString().slice(0, 10)) {
  try {
    const day = String(lastmod).slice(0, 10);
    const urls = sitemapLocs()
      .map(
        (loc) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${day}</lastmod>
  </url>`,
      )
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
