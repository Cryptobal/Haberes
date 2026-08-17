/**
 * Genera /guias/* y /finiquito/* desde content/*.md (editables).
 * Schema: Article + BreadcrumbList + FAQPage + WebApplication.
 * Calculadora embebida: js/seo-calc.js (mismos motores que /sueldo y /finiquito).
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { calcularFiniquitoCompleto } from "../js/finiquito.js";
import { FALLBACK_UF, DISCLAIMER, DISCLAIMER_FINIQUITO } from "../js/constants.js";
import { causalPorId, CAUSALES } from "../js/causales.js";
import { CAUSAL_PAGES, GUIDE_SLUGS } from "../content/registry.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://www.haberes.cl";
const TODAY = new Date().toISOString().slice(0, 10);

const indexHtml = readFileSync(join(root, "index.html"), "utf8");
const headerStart = indexHtml.indexOf('<header class="site-header">');
const mainStart = indexHtml.indexOf("<main>");
if (headerStart < 0 || mainStart < 0 || mainStart <= headerStart) {
  throw new Error("No se pudo extraer cabecera/nav-drawer desde index.html");
}
/** Cabecera + cajón de navegación (hermano del header, como en index.html). */
const header = indexHtml.slice(headerStart, mainStart);
const footer = indexHtml.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0];

const THEME_SCRIPT = `  <script>
  (function () {
    try {
      var t = localStorage.getItem("haberes:theme");
      if (t !== "day" && t !== "night") {
        t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
      }
      document.documentElement.setAttribute("data-theme", t);
    } catch (e) {}
  })();
  </script>`;

const GTM = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PCR596Z2');</script>
<!-- End Google Tag Manager -->`;

function pesos(n) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Frontmatter YAML mínimo (clave: valor | listas - item). */
function parseMd(raw) {
  const m = String(raw).match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: String(raw) };
  const meta = {};
  const lines = m[1].split("\n");
  let listKey = null;
  let listBuf = null;
  for (const line of lines) {
    if (/^\s+-\s+/.test(line) && listKey) {
      const item = line.replace(/^\s+-\s+/, "").trim();
      try {
        listBuf.push(JSON.parse(item));
      } catch {
        listBuf.push(item);
      }
      continue;
    }
    if (listKey) {
      meta[listKey] = listBuf;
      listKey = null;
      listBuf = null;
    }
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const val = kv[2];
    if (val === "") {
      listKey = key;
      listBuf = [];
      continue;
    }
    try {
      meta[key] = JSON.parse(val);
    } catch {
      meta[key] = val.replace(/^"|"$/g, "");
    }
  }
  if (listKey) meta[listKey] = listBuf;
  return { meta, body: m[2] };
}

function inlineMd(text) {
  return esc(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.trim() === "{{calc}}" || line.trim() === "{{cta}}") {
      out.push(line.trim());
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      out.push(`<h3>${inlineMd(line.slice(4))}</h3>`);
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(`<h2>${inlineMd(line.slice(3))}</h2>`);
      i += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      out.push(`<h1>${inlineMd(line.slice(2))}</h1>`);
      i += 1;
      continue;
    }
    if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(`<li>${inlineMd(lines[i].slice(2))}</li>`);
        i += 1;
      }
      out.push(`<ul>\n${items.join("\n")}\n</ul>`);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`<li>${inlineMd(lines[i].replace(/^\d+\.\s/, ""))}</li>`);
        i += 1;
      }
      out.push(`<ol>\n${items.join("\n")}\n</ol>`);
      continue;
    }
    const paras = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !/^#{1,3}\s/.test(lines[i]) && !lines[i].startsWith("- ") && !/^\d+\.\s/.test(lines[i]) && lines[i].trim() !== "{{calc}}" && lines[i].trim() !== "{{cta}}") {
      paras.push(lines[i]);
      i += 1;
    }
    const text = paras.join(" ").trim();
    const cls = out.length === 1 && out[0].startsWith("<h1") ? ' class="lede"' : "";
    out.push(`<p${cls}>${inlineMd(text)}</p>`);
  }
  return out.join("\n");
}

function calcBlock(kind, causal) {
  const causalAttr = causal ? ` data-causal="${esc(causal)}"` : "";
  return `<section class="seo-calc" data-seo-calc="${esc(kind || "finiquito")}"${causalAttr} aria-label="Calculadora embebida"></section>`;
}

function ctaEmpresa() {
  return `<aside class="seo-cta" aria-label="Cuenta de empresa">
  <p><strong>¿Emite liquidaciones o finiquitos cada mes?</strong>
  Cree su <a href="/empresa">cuenta de empresa</a> gratis: PDF con membrete, trabajadores en el navegador y plan Pro cuando lo necesite.</p>
  <p class="actions"><a class="btn" href="/empresa">Ir a cuenta de empresa</a>
  <a class="btn btn-ghost" href="/precios">Ver precios</a></p>
</aside>`;
}

function applyPlaceholders(html, { calc, causal }) {
  return html
    .replaceAll("{{calc}}", calcBlock(calc || "finiquito", causal))
    .replaceAll("{{cta}}", ctaEmpresa());
}

function head({ title, description, canonical, ogImage = "/img/og-default.png", jsonld }) {
  const blocks = Array.isArray(jsonld) ? jsonld : [jsonld];
  const ld = blocks
    .map((b) => `  <script type="application/ld+json">\n${JSON.stringify(b, null, 2)}\n  </script>`)
    .join("\n");
  return `<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
${THEME_SCRIPT}
${GTM}
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${ORIGIN}${canonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:locale" content="es_CL" />
  <meta property="og:site_name" content="Haberes" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${ORIGIN}${canonical}" />
  <meta property="og:image" content="${ORIGIN}${ogImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${ORIGIN}${ogImage}" />
  <link rel="icon" href="../favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="../css/app.css" />
  <script src="../js/analytics.js" defer></script>
${ld}
</head>`;
}

function crumbs(items) {
  const html = items
    .map((it, i) => {
      const last = i === items.length - 1;
      return last
        ? `<li aria-current="page">${esc(it.name)}</li>`
        : `<li><a href="${esc(it.href)}">${esc(it.name)}</a></li>`;
    })
    .join("\n          ");
  return `<nav class="breadcrumbs" aria-label="Migas de pan">
        <ol>
          ${html}
        </ol>
      </nav>`;
}

function breadcrumbLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.href.startsWith("http") ? it.href : ORIGIN + it.href,
    })),
  };
}

function orgLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Haberes",
    url: ORIGIN + "/",
    logo: ORIGIN + "/favicon.svg",
    areaServed: "CL",
  };
}

function webAppLd({ name, url, description }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    url: ORIGIN + url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "es-CL",
    description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CLP",
    },
    publisher: { "@type": "Organization", name: "Haberes", url: ORIGIN + "/" },
  };
}

function faqLd(faq) {
  if (!Array.isArray(faq) || !faq.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q || f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a || f.answer,
      },
    })),
  };
}

function pageShell({ title, description, canonical, crumbsItems, article, body, faq, webApp }) {
  const jsonld = [
    orgLd(),
    breadcrumbLd(crumbsItems),
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.headline,
      datePublished: article.datePublished || TODAY,
      dateModified: article.dateModified || TODAY,
      inLanguage: "es-CL",
      author: { "@type": "Organization", name: "Haberes" },
      publisher: { "@type": "Organization", name: "Haberes", url: ORIGIN + "/" },
      mainEntityOfPage: ORIGIN + canonical,
    },
  ];
  const faqBlock = faqLd(faq);
  if (faqBlock) jsonld.push(faqBlock);
  if (webApp) jsonld.push(webAppLd(webApp));
  return `<!DOCTYPE html>
<html lang="es-CL">
${head({ title, description, canonical, jsonld })}
<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PCR596Z2"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
  ${header}
  <main>
    <div class="wrap prose guide">
      ${crumbs(crumbsItems)}
${body}
      <p class="notice u-mt-6">${esc(DISCLAIMER_FINIQUITO || DISCLAIMER)}</p>
    </div>
  </main>
  ${footer.replace(/src="js\//g, 'src="../js/')}
  <script type="module" src="../js/seo-calc.js"></script>
  <script type="module" src="../js/app-home.js"></script>
</body>
</html>
`;
}

const ejemploBase = {
  remuneracion: 900000,
  gratificacionArt50: true,
  ingreso: "2020-03-01",
  termino: "2026-03-01",
  diasFeriadoPendiente: 5,
  diasFeriadoProporcional: 7,
  diasMes: 0,
  avisoPrevio: false,
};

mkdirSync(join(root, "guias"), { recursive: true });
mkdirSync(join(root, "finiquito"), { recursive: true });

if (CAUSALES.length !== 21) {
  throw new Error(`Se esperaban 21 causales, hay ${CAUSALES.length}`);
}
if (CAUSAL_PAGES.length !== 21) {
  throw new Error(`Se esperaban 21 páginas de causal, hay ${CAUSAL_PAGES.length}`);
}

for (const slug of GUIDE_SLUGS) {
  const file = join(root, "content/guias", `${slug}.md`);
  if (!existsSync(file)) throw new Error(`Falta content/guias/${slug}.md`);
  const { meta, body } = parseMd(readFileSync(file, "utf8"));
  if (!meta.title || !meta.description || !meta.h1) {
    throw new Error(`Frontmatter incompleto en ${slug}`);
  }
  if (meta.description.length > 160) console.warn("desc larga", slug, meta.description.length);
  if (meta.title.length > 70) console.warn("title largo", slug, meta.title.length);

  let htmlBody = applyPlaceholders(mdToHtml(body), {
    calc: meta.calc || "sueldo",
    causal: meta.causal,
  });
  if (!htmlBody.includes("seo-calc")) {
    htmlBody += "\n" + calcBlock(meta.calc || "sueldo", meta.causal);
  }
  if (!htmlBody.includes("seo-cta")) {
    htmlBody += "\n" + ctaEmpresa();
  }

  const crumbsItems = [
    { name: "Inicio", href: "/" },
    { name: "Guías", href: "/guias/finiquito" },
    { name: meta.h1, href: `/guias/${slug}` },
  ];

  const html = pageShell({
    title: meta.title,
    description: meta.description,
    canonical: `/guias/${slug}`,
    crumbsItems,
    article: { headline: meta.h1 },
    body: htmlBody,
    faq: meta.faq,
    webApp: {
      name: meta.calc === "finiquito" ? "Calculadora de finiquito Haberes" : "Calculadora de sueldo líquido Haberes",
      url: meta.calc === "finiquito" ? "/finiquito" : "/sueldo",
      description: meta.description,
    },
  });
  writeFileSync(join(root, "guias", `${slug}.html`), html);
  console.log("guia", slug);
}

for (const p of CAUSAL_PAGES) {
  const c = causalPorId(p.id);
  if (!c) throw new Error(`Causal desconocida: ${p.id}`);
  const r = calcularFiniquitoCompleto({ ...ejemploBase, causal: p.id }, { uf: FALLBACK_UF });
  const iasP = r.partidas.find((x) => x.key === "ias");
  const avisoP = r.partidas.find((x) => x.key === "aviso");
  const ferPend = r.partidas.find((x) => x.key === "feriadoPendiente");
  const ferProp = r.partidas.find((x) => x.key === "feriadoProporcional");

  const editorialPath = join(root, "content/causales", `${p.slug}.md`);
  let editorial = "";
  if (existsSync(editorialPath)) {
    const parsed = parseMd(readFileSync(editorialPath, "utf8"));
    editorial = mdToHtml(parsed.body);
  }

  let iasBlock;
  if (c.aplicaIas) {
    iasBlock = `<p>Esta causal <strong>sí</strong> puede dar derecho a indemnización por años de servicio
      cuando el contrato estuvo vigente un año o más (arts. 161 y 163). En el ejemplo: ${pesos(iasP.monto)}
      por ${r.anios} años sobre una remuneración mensual de ${pesos(r.remuneracionMensual)}.</p>`;
  } else {
    iasBlock = `<p>Esta causal <strong>no</strong> da derecho a indemnización por años de servicio.
      En el ejemplo la línea de IAS queda en ${pesos(0)} de forma explícita.</p>`;
  }

  let avisoBlock;
  if (c.aplicaAviso) {
    avisoBlock = `<p>Corresponde aviso previo de treinta días o indemnización sustitutiva
      (arts. 161 y 162). En el ejemplo, sin aviso previo: ${pesos(avisoP.monto)}.</p>`;
  } else {
    avisoBlock = `<p>No corresponde indemnización sustitutiva de aviso previo del empleador por esta causal.
      En el ejemplo esa partida es ${pesos(0)}.</p>`;
  }

  const related = CAUSAL_PAGES.filter((x) => x.id !== p.id)
    .slice(0, 4)
    .map((x) => {
      const cc = causalPorId(x.id);
      return `<li><a href="/finiquito/${x.slug}">${esc(cc.short)}</a></li>`;
    })
    .join("\n");

  const body = `
      <h1>${esc(c.label)}</h1>
      <p class="lede">${esc(c.textoLegal)}</p>
      ${editorial}
      <h2>Indemnización por años de servicio</h2>
      ${iasBlock}
      <h2>Aviso previo</h2>
      ${avisoBlock}
      <h2>Feriado</h2>
      <p>
        El feriado pendiente y el proporcional se liquidan con independencia de la causal.
        En el ejemplo: pendiente ${pesos(ferPend.monto)} (5 días) y proporcional
        ${pesos(ferProp.monto)} (7 días).
      </p>
      <h2>Ejemplo numérico (ficticio)</h2>
      <p>
        Persona ficticia «Ana Pérez», sueldo base $900.000, gratificación art. 50, ingreso 1-mar-2020,
        término 1-mar-2026, UF de respaldo ${FALLBACK_UF}. Total estimado: <strong>${pesos(r.total)}</strong>.
      </p>
      <div class="table-scroll">
        <table>
          <thead><tr><th>Partida</th><th>Monto</th></tr></thead>
          <tbody>
            ${r.partidas
              .filter((x) => x.monto !== 0 || x.key === "ias" || x.key === "aviso")
              .map((x) => `<tr><td>${esc(x.label)}</td><td>${pesos(x.monto)}</td></tr>`)
              .join("\n            ")}
            <tr><th>Total</th><th>${pesos(r.total)}</th></tr>
          </tbody>
        </table>
      </div>
      <h2>Calcular con esta causal</h2>
      ${calcBlock("finiquito", p.id)}
      <p class="actions">
        <a class="btn" href="/finiquito?causal=${encodeURIComponent(p.id)}">Abrir calculadora completa</a>
        <a class="btn btn-ghost" href="/guias/finiquito">Guía de finiquito</a>
      </p>
      ${ctaEmpresa()}
      <h2>Otras causales</h2>
      <ul>${related}</ul>
  `;

  const title = `Finiquito ${c.short} (${c.articulo}) — Haberes`;
  const description = `${c.textoLegal.slice(0, 140)}… Calcule indemnizaciones y feriado en Haberes.`.slice(0, 160);

  const html = pageShell({
    title: title.length > 70 ? `Finiquito: ${c.short} — Haberes` : title,
    description,
    canonical: `/finiquito/${p.slug}`,
    crumbsItems: [
      { name: "Inicio", href: "/" },
      { name: "Finiquito", href: "/finiquito" },
      { name: c.short, href: `/finiquito/${p.slug}` },
    ],
    article: { headline: c.label },
    body,
    faq: [
      {
        q: `¿Esta causal paga indemnización por años de servicio?`,
        a: c.aplicaIas
          ? "Puede corresponder si el contrato estuvo vigente un año o más, según los artículos 161 y 163."
          : "No. Esta causal no genera indemnización por años de servicio del artículo 163.",
      },
      {
        q: "¿Cómo calculo el finiquito con esta causal?",
        a: "Use la calculadora embebida en esta página o abra /finiquito con el parámetro causal precargado. Es una estimación de software, no un cálculo oficial.",
      },
    ],
    webApp: {
      name: "Calculadora de finiquito Haberes",
      url: "/finiquito",
      description: "Estime finiquito según causal del Código del Trabajo.",
    },
  });
  writeFileSync(join(root, "finiquito", `${p.slug}.html`), html);
  console.log("causal", p.slug, pesos(r.total));
}

// Limpia HTML de causales antiguos no listados
const keep = new Set(CAUSAL_PAGES.map((p) => `${p.slug}.html`));
for (const name of readdirSync(join(root, "finiquito"))) {
  if (name.endsWith(".html") && !keep.has(name)) {
    // no borrar automáticamente si el usuario añadió algo; solo avisar
    console.warn("html causal fuera de registro:", name);
  }
}

console.log("contenido generado:", GUIDE_SLUGS.length, "guías,", CAUSAL_PAGES.length, "causales");
