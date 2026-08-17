/**
 * /sitemap.xml para Chrome, curl y Googlebot.
 * El XML estático de Vercel responde 500 a clientes no-browser
 * (application/xml + content-disposition); esta función no.
 */
import { buildSitemapXml, SITEMAP_CONTENT_TYPE } from "./_sitemap.js";

function sendXml(res, status, body) {
  res.setHeader?.("Content-Type", SITEMAP_CONTENT_TYPE);
  res.setHeader?.("Cache-Control", "public, max-age=0, must-revalidate");
  res.setHeader?.("X-Content-Type-Options", "nosniff");
  if (typeof res.status === "function") {
    const next = res.status(status);
    if (body == null) return next.end?.();
    if (typeof next.send === "function") return next.send(body);
    return next.end?.(body);
  }
  res.statusCode = status;
  if (body == null) return res.end?.();
  return res.end?.(body);
}

export default function handler(req, res) {
  try {
    const method = String(req?.method || "GET").toUpperCase();
    if (method === "HEAD") return sendXml(res, 200, null);
    if (method !== "GET") {
      res.setHeader?.("Allow", "GET, HEAD");
      return sendXml(res, 405, null);
    }
    return sendXml(res, 200, buildSitemapXml());
  } catch {
    return sendXml(
      res,
      200,
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.haberes.cl/</loc>
  </url>
</urlset>
`,
    );
  }
}
