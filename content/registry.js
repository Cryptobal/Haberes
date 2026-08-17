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

/** Guías en content/guias/{slug}.md (orden de sitemap). */
export const GUIDE_SLUGS = [
  "finiquito",
  "liquidacion-de-sueldo",
  "impuesto-unico",
  "gratificacion-legal",
  "indemnizacion-por-anos-de-servicio",
  "horas-extras",
  "vacaciones-proporcionales",
  "semana-corrida",
  "carta-aviso-termino-contrato",
  "plazo-de-pago-del-finiquito",
  "con-que-sueldo-se-calcula-el-finiquito",
  "finiquito-trabajadora-de-casa-particular",
  "me-reservo-el-derecho-en-el-finiquito",
  "como-leer-una-liquidacion-de-sueldo",
  "formato-de-liquidacion-de-sueldo-chile",
  "liquidacion-de-sueldo-y-previred",
];

export const BASE_PATHS = [
  "/",
  "/como",
  "/empresa",
  "/finiquito",
  "/precios",
  "/privacidad",
  "/sueldo",
  "/terminos",
];

export function seoPaths() {
  return [
    ...BASE_PATHS,
    ...CAUSAL_PAGES.map((p) => `/finiquito/${p.slug}`),
    ...GUIDE_SLUGS.map((s) => `/guias/${s}`),
  ].sort((a, b) => a.localeCompare(b, "es"));
}
