/**
 * Registro SEO canónico: slugs de guías y de las 21 causales.
 * Usado por gen-content-seo.mjs y api/_sitemap.js.
 * Mantener alineado con docs/seo-map.md.
 */

/** @type {{ id: string, slug: string }[]} */
export const CAUSAL_PAGES = [
  { id: "159-a", slug: "art-159-mutuo-acuerdo" },
  { id: "159-b", slug: "art-159-renuncia-voluntaria" },
  { id: "159-c", slug: "art-159-muerte-del-trabajador" },
  { id: "159-d", slug: "art-159-vencimiento-del-plazo" },
  { id: "159-e", slug: "art-159-conclusion-del-trabajo" },
  { id: "159-f", slug: "art-159-caso-fortuito" },
  { id: "160-1-a", slug: "art-160-falta-de-probidad" },
  { id: "160-1-b", slug: "art-160-acoso-sexual" },
  { id: "160-1-c", slug: "art-160-vias-de-hecho" },
  { id: "160-1-d", slug: "art-160-injurias" },
  { id: "160-1-e", slug: "art-160-conducta-inmoral" },
  { id: "160-1-f", slug: "art-160-acoso-laboral" },
  { id: "160-2", slug: "art-160-negociaciones-prohibidas" },
  { id: "160-3", slug: "art-160-no-concurrencia" },
  { id: "160-4-a", slug: "art-160-abandono-salida-intempestiva" },
  { id: "160-4-b", slug: "art-160-abandono-negativa" },
  { id: "160-5", slug: "art-160-imprudencia-temeraria" },
  { id: "160-6", slug: "art-160-perjuicio-material" },
  { id: "160-7", slug: "art-160-incumplimiento-grave" },
  { id: "161-necesidades", slug: "art-161-necesidades-de-la-empresa" },
  { id: "161-desahucio", slug: "art-161-desahucio" },
];

/**
 * 16 guías en content/guias/{slug}.md.
 * group: índice /guias (liquidación vs finiquito).
 * calc: calculadora canónica (no canibalizar titles/H1 de esas URLs).
 * updated: lastmod ISO (YYYY-MM-DD) para sitemap y el bloque «últimas» del hub.
 * @type {{ slug: string, group: "liquidacion" | "finiquito", calc: "/sueldo" | "/finiquito" | "/horas-extras" | "/vacaciones-proporcionales", updated: string }[]}
 */
export const DEFAULT_LASTMOD = "2026-08-17";

export const GUIDES = [
  { slug: "liquidacion-de-sueldo", group: "liquidacion", calc: "/sueldo", updated: "2026-08-18" },
  { slug: "impuesto-unico", group: "liquidacion", calc: "/sueldo", updated: "2026-08-18" },
  { slug: "gratificacion-legal", group: "liquidacion", calc: "/sueldo", updated: "2026-08-18" },
  { slug: "horas-extras", group: "liquidacion", calc: "/horas-extras", updated: "2026-08-17" },
  { slug: "semana-corrida", group: "liquidacion", calc: "/sueldo", updated: "2026-08-19" },
  { slug: "como-leer-una-liquidacion-de-sueldo", group: "liquidacion", calc: "/sueldo", updated: "2026-08-17" },
  { slug: "formato-de-liquidacion-de-sueldo-chile", group: "liquidacion", calc: "/sueldo", updated: "2026-08-17" },
  { slug: "liquidacion-de-sueldo-y-previred", group: "liquidacion", calc: "/sueldo", updated: "2026-08-17" },
  { slug: "finiquito", group: "finiquito", calc: "/finiquito", updated: "2026-08-18" },
  { slug: "indemnizacion-por-anos-de-servicio", group: "finiquito", calc: "/finiquito", updated: "2026-08-19" },
  { slug: "vacaciones-proporcionales", group: "finiquito", calc: "/vacaciones-proporcionales", updated: "2026-08-17" },
  { slug: "carta-aviso-termino-contrato", group: "finiquito", calc: "/finiquito", updated: "2026-08-18" },
  { slug: "plazo-de-pago-del-finiquito", group: "finiquito", calc: "/finiquito", updated: "2026-08-17" },
  { slug: "con-que-sueldo-se-calcula-el-finiquito", group: "finiquito", calc: "/finiquito", updated: "2026-08-17" },
  { slug: "finiquito-trabajadora-de-casa-particular", group: "finiquito", calc: "/finiquito", updated: "2026-08-17" },
  { slug: "me-reservo-el-derecho-en-el-finiquito", group: "finiquito", calc: "/finiquito", updated: "2026-08-17" },
];

/** lastmod de rutas base que sí cambiaron después del lote SEO inicial. */
export const PATH_LASTMOD = {
  "/guias": "2026-08-19",
  "/horas-extras": "2026-08-20",
  "/vacaciones-proporcionales": "2026-08-21",
  "/privacidad": "2026-08-18",
  "/terminos": "2026-08-18",
};

export function lastmodForPath(path) {
  const p = path === "" ? "/" : path;
  if (PATH_LASTMOD[p]) return PATH_LASTMOD[p];
  const guide = GUIDES.find((g) => `/guias/${g.slug}` === p);
  if (guide?.updated) return guide.updated;
  return DEFAULT_LASTMOD;
}

/** Guías en content/guias/{slug}.md (orden de sitemap vía seoPaths). */
export const GUIDE_SLUGS = GUIDES.map((g) => g.slug);

export const BASE_PATHS = [
  "/",
  "/como",
  "/empresa",
  "/finiquito",
  "/guias",
  "/horas-extras",
  "/precios",
  "/privacidad",
  "/sueldo",
  "/terminos",
  "/vacaciones-proporcionales",
];

export function seoPaths() {
  return [
    ...BASE_PATHS,
    ...CAUSAL_PAGES.map((p) => `/finiquito/${p.slug}`),
    ...GUIDE_SLUGS.map((s) => `/guias/${s}`),
  ].sort((a, b) => a.localeCompare(b, "es"));
}
