/**
 * Reescribe <head> de páginas públicas: charset primero, sin Google Fonts,
 * títulos/descripciones SEO, og:image, twitter y JSON-LD estático.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://www.haberes.cl";

const ORG = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Haberes",
  url: ORIGIN + "/",
  logo: ORIGIN + "/favicon.svg",
  areaServed: "CL",
  sameAs: [],
};

const META = {
  "index.html": {
    path: "/",
    title: "Liquidaciones y finiquitos para pymes en Chile — Haberes",
    description:
      "Calcule sueldo líquido, emita liquidaciones y cartas de finiquito con el formato chileno. Gratis para empezar, sin instalar nada.",
    ogImage: "/img/og-default.png",
    jsonld: (url) => [
      ORG,
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "¿Esto reemplaza a mi contador?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Haberes calcula y arma el documento; su contador valida y responde por la declaración. El objetivo es que llegue a esa conversación con los números ya hechos.",
            },
          },
          {
            "@type": "Question",
            name: "¿Dónde quedan los datos de mis trabajadores?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "La nómina del mes vive en este navegador. La cuenta de empresa, el logo y la firma viven en el servidor cuando está configurado. Puede leer el detalle en privacidad.",
            },
          },
          {
            "@type": "Question",
            name: "¿Sirve la carta de finiquito ante la Inspección del Trabajo?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Es el documento para firmar, no el trámite. No reemplaza la ratificación ante la Inspección del Trabajo ni ante un ministro de fe.",
            },
          },
        ],
      },
    ],
  },
  "sueldo.html": {
    path: "/sueldo",
    title: "Calculadora de sueldo líquido Chile 2026 — Haberes",
    description:
      "Calcule su sueldo líquido con AFP, salud, seguro de cesantía, gratificación e impuesto único. Resultado al instante y gratis.",
    ogImage: "/img/og-sueldo.png",
    jsonld: (url) => [
      ORG,
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Calculadora de sueldo líquido — Haberes",
        url,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        inLanguage: "es-CL",
        offers: { "@type": "Offer", price: "0", priceCurrency: "CLP" },
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "¿El resultado es el mismo que paga Previred?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No necesariamente. Haberes estima la liquidación del trabajador; Previred es el canal de declaración de cotizaciones. Contraste siempre antes de pagar.",
            },
          },
          {
            "@type": "Question",
            name: "¿Puedo emitir el PDF con el logo de mi empresa?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Sí, desde la cuenta de empresa, con logo, firma y envío al correo del trabajador.",
            },
          },
        ],
      },
    ],
  },
  "finiquito.html": {
    path: "/finiquito",
    title: "Calculadora de finiquito Chile 2026 — arts. 159, 160 y 161",
    description:
      "Calcule el finiquito por despido, renuncia o término de contrato. Indemnizaciones, aviso previo y feriado proporcional, paso a paso.",
    ogImage: "/img/og-finiquito.png",
    jsonld: (url) => [
      ORG,
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Calculadora de finiquito — Haberes",
        url,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        inLanguage: "es-CL",
        offers: { "@type": "Offer", price: "0", priceCurrency: "CLP" },
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "¿La carta reemplaza la Inspección del Trabajo?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. El finiquito debe ratificarse según el artículo 177. Haberes arma el documento para firmar; no es el trámite ante la Inspección ni ante un ministro de fe.",
            },
          },
          {
            "@type": "Question",
            name: "¿Qué causal elijo si hubo renuncia?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Artículo 159 letra b). No genera indemnización por años de servicio ni aviso del empleador; sí se liquida el feriado adeudado.",
            },
          },
        ],
      },
    ],
  },
  "empresa.html": {
    path: "/empresa",
    title: "Liquidaciones de sueldo para pymes — nómina y PDF — Haberes",
    description:
      "Cargue su nómina y emita liquidaciones y finiquitos con su logo y su firma. Envío al correo del trabajador y nómina para el banco.",
    ogImage: "/img/og-default.png",
    jsonld: () => [ORG],
  },
  "como.html": {
    path: "/como",
    title: "Cómo calcular y emitir liquidaciones y finiquitos — Haberes",
    description:
      "Tres pasos: cargue su nómina, revise el cálculo y emita el documento. Qué incluye cada uno y qué revisar antes de firmar.",
    ogImage: "/img/og-default.png",
    jsonld: (url) => [
      ORG,
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: "Cómo calcular y emitir liquidaciones y finiquitos",
        description:
          "Tres pasos: cargue su nómina, revise el cálculo y emita el documento.",
        step: [
          {
            "@type": "HowToStep",
            name: "Cargue su nómina",
            text: "Ingrese o importe los trabajadores del mes en la cuenta de empresa.",
          },
          {
            "@type": "HowToStep",
            name: "Revise el cálculo",
            text: "Revise haberes, descuentos legales y el líquido a pagar en la vista previa.",
          },
          {
            "@type": "HowToStep",
            name: "Emita y envíe",
            text: "Descargue el PDF o envíelo al correo del trabajador con el membrete de su empresa.",
          },
        ],
      },
    ],
  },
  "precios.html": {
    path: "/precios",
    title: "Precios — software de liquidaciones de sueldo para pymes",
    description:
      "Gratis: 5 documentos al mes. Pro: $14.990 + IVA al mes, sin tope, con carga masiva, nómina bancaria y envío por correo.",
    ogImage: "/img/og-default.png",
    jsonld: () => [ORG],
  },
};

const THEME_SCRIPT = `  <script>
  (function () {
    try {
      var t = localStorage.getItem("haberes:theme");
      if (t !== "day" && t !== "night") t = "day";
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

function assetPrefix(file) {
  const depth = file.split("/").length - 1;
  return depth ? "../".repeat(depth) : "";
}

function buildHead(file, meta, extraJsonLd = []) {
  const prefix = assetPrefix(file);
  const url = ORIGIN + meta.path;
  const blocks = [...(meta.jsonld ? meta.jsonld(url) : [ORG]), ...extraJsonLd];
  const ld = blocks
    .map(
      (b) =>
        `  <script type="application/ld+json">\n${JSON.stringify(b, null, 2)}\n  </script>`,
    )
    .join("\n");
  return `<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
${THEME_SCRIPT}
${GTM}
  <title>${meta.title}</title>
  <meta name="description" content="${meta.description}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="es_CL" />
  <meta property="og:site_name" content="Haberes" />
  <meta property="og:title" content="${meta.title}" />
  <meta property="og:description" content="${meta.description}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${ORIGIN}${meta.ogImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${meta.title}" />
  <meta name="twitter:description" content="${meta.description}" />
  <meta name="twitter:image" content="${ORIGIN}${meta.ogImage}" />
  <link rel="icon" href="${prefix}favicon.ico" sizes="32x32" />
  <link rel="icon" href="${prefix}favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="${prefix}css/app.css" />
  <!-- GA4: para activarlo, asigne un ID G-… a window.HABERES_GA4 antes de este script. Vacío = sin peticiones. -->
  <script src="${prefix}js/analytics.js" defer></script>
${ld}
</head>`;
}

function stripGoogleFonts(html) {
  return html
    .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>\n?/g, "")
    .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin \/>\n?/g, "")
    .replace(
      /\s*<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=IBM\+Plex\+Sans[^"]*" rel="stylesheet" \/>\n?/g,
      "",
    );
}

function replaceHead(html, newHead) {
  return html.replace(/<head>[\s\S]*?<\/head>/, newHead);
}

let n = 0;
for (const [file, meta] of Object.entries(META)) {
  const path = join(root, file);
  let html = readFileSync(path, "utf8");
  html = replaceHead(html, buildHead(file, meta));
  writeFileSync(path, html);
  n += 1;
  console.log("seo", file, meta.title.length, meta.description.length);
}

// Páginas no SEO (admin/reset/privacidad/terminos): solo quitar Google Fonts y reordenar charset
for (const file of ["admin.html", "reset.html", "privacidad.html", "terminos.html"]) {
  const path = join(root, file);
  let html = readFileSync(path, "utf8");
  html = stripGoogleFonts(html);
  // Asegurar charset/viewport al inicio del head (después de <head>)
  html = html.replace(
    /<head>\s*(?:<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->\s*)?(?:<meta charset="utf-8" \/>\s*)?(?:<meta name="viewport"[^>]*\/>\s*)?/,
    `<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
`,
  );
  // Evitar charset duplicado
  let seen = 0;
  html = html.replace(/<meta charset="utf-8" \/>\n?/g, (m) => {
    seen += 1;
    return seen === 1 ? m : "";
  });
  let seenVp = 0;
  html = html.replace(/<meta name="viewport"[^>]*\/>\n?/g, (m) => {
    seenVp += 1;
    return seenVp === 1 ? m : "";
  });
  writeFileSync(path, html);
  n += 1;
  console.log("fonts-only", file);
}

console.log(`listo: ${n} páginas`);
