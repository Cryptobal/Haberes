/**
 * Genera páginas /guias/* y /finiquito/* con cabecera/pie del sitio,
 * migas, Article + BreadcrumbList, y ejemplos calculados.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { calcularFiniquitoCompleto } from "../js/finiquito.js";
import { FALLBACK_UF, DISCLAIMER_FINIQUITO } from "../js/constants.js";
import { causalPorId } from "../js/causales.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://www.haberes.cl";
const TODAY = "2026-08-17";

const indexHtml = readFileSync(join(root, "index.html"), "utf8");
const header = indexHtml.match(/<header class="site-header">[\s\S]*?<div class="nav-drawer"[\s\S]*?<\/div>\n/)[0];
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
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${ORIGIN}${canonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:locale" content="es_CL" />
  <meta property="og:site_name" content="Haberes" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${ORIGIN}${canonical}" />
  <meta property="og:image" content="${ORIGIN}${ogImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
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
        ? `<li aria-current="page">${it.name}</li>`
        : `<li><a href="${it.href}">${it.name}</a></li>`;
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
    sameAs: [],
  };
}

function pageShell({ title, description, canonical, crumbsItems, article, body, faqLd }) {
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
  if (faqLd) jsonld.push(faqLd);
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
      <p class="notice u-mt-6">${DISCLAIMER_FINIQUITO}</p>
    </div>
  </main>
  ${footer.replace(/src="js\//g, 'src="../js/')}
  <script type="module" src="../js/app-home.js"></script>
</body>
</html>
`;
}

const GUIDES = [
  {
    slug: "plazo-de-pago-del-finiquito",
    title: "Plazo de pago del finiquito en Chile — Haberes",
    description:
      "Cuánto tiempo tiene el empleador para pagar el finiquito tras el término del contrato, según el art. 177 del Código del Trabajo.",
    h1: "¿Cuánto tiempo tiene el empleador para pagar el finiquito?",
    calc: "/finiquito",
    body: `
      <h1>¿Cuánto tiempo tiene el empleador para pagar el finiquito?</h1>
      <p class="lede">
        El finiquito debe ponerse a disposición del trabajador al momento del término de la relación laboral,
        y la ratificación ante la Inspección del Trabajo o un ministro de fe se rige por el artículo 177
        del Código del Trabajo. No hay un plazo legal de “días hábiles” distinto al de poner a disposición
        el documento y el pago cuando corresponde. Si hay disputa sobre montos, conviene documentar la
        reserva de derechos al firmar.
      </p>
      <h2>Qué dice el artículo 177</h2>
      <p>
        El artículo 177 del Código del Trabajo regula el finiquito, la renuncia y el mutuo acuerdo:
        deben constar por escrito y ser firmados por las partes. El instrumento, además, debe ser
        ratificado ante un inspector del trabajo o ante un notario público, oficial del Registro Civil
        o el secretario municipal del lugar, según las reglas del mismo artículo. La ratificación da
        fecha cierta y facilita la ejecución; no sustituye el pago de lo adeudado.
      </p>
      <h2>Pago y puesta a disposición</h2>
      <p>
        En la práctica laboral chilena, el empleador debe tener listo el finiquito y el pago
        (o la liquidación de haberes del término) cuando termina el contrato. Retrasar el pago
        puede generar intereses, reajustes y eventuales multas administrativas si la Inspección
        constata infracción. El monto depende de la causal (arts. 159, 160 y 161): no todas
        generan indemnización por años de servicio ni aviso previo.
      </p>
      <h2>Qué incluir en el cálculo antes de firmar</h2>
      <ul>
        <li>Remuneraciones del mes proporcional y feriado pendiente o proporcional.</li>
        <li>Indemnización por años de servicio cuando la causal lo permite (art. 161 y art. 163).</li>
        <li>Indemnización sustitutiva de aviso previo si no se dio el aviso de treinta días (arts. 161 y 162).</li>
        <li>Descuentos legales solo si corresponden y están documentados.</li>
      </ul>
      <h2>Cómo usarlo en Haberes</h2>
      <p>
        Use la <a href="/finiquito">calculadora de finiquito</a> con la causal correcta y las fechas
        de ingreso y término. Luego, en la cuenta de empresa, emita la carta con logo y firma.
        La carta no reemplaza la ratificación ante la Inspección del Trabajo ni ante un ministro de fe
        (art. 177).
      </p>
      <p class="actions"><a class="btn" href="/finiquito">Calcular finiquito</a>
      <a class="btn btn-ghost" href="/guias/me-reservo-el-derecho-en-el-finiquito">Me reservo el derecho</a></p>
    `,
  },
  {
    slug: "con-que-sueldo-se-calcula-el-finiquito",
    title: "Con qué sueldo se calcula el finiquito — Haberes Chile",
    description:
      "Base de cálculo del finiquito: última remuneración, gratificación art. 50, tope de 90 UF y feriado proporcional.",
    h1: "¿Con qué sueldo se calcula el finiquito?",
    calc: "/finiquito",
    body: `
      <h1>¿Con qué sueldo se calcula el finiquito?</h1>
      <p class="lede">
        La indemnización por años de servicio y la sustitutiva de aviso previo se calculan sobre
        la última remuneración mensual del trabajador, con el tope de noventa unidades de fomento
        previsto para cotizaciones previsionales cuando corresponde aplicar ese límite en la práctica
        de liquidación. La gratificación del artículo 50, si se paga mensualmente, integra la base.
        El feriado se liquida con la remuneración diaria (remuneración mensual dividido por treinta).
      </p>
      <h2>Base de la indemnización (arts. 161 y 163)</h2>
      <p>
        Cuando la causal da derecho a indemnización por años de servicio (artículo 161, con el
        cálculo del artículo 163), el monto es de treinta días de la última remuneración por cada
        año de servicio y fracción superior a seis meses, con tope de trescientos treinta días
        (once años). Haberes usa esa regla y aplica el tope de 90 UF a la base mensual de cotización
        cuando calcula indemnizaciones, de forma alineada con el resto de la liquidación.
      </p>
      <h2>Qué entra y qué no</h2>
      <ul>
        <li>Entra: sueldo base, gratificación art. 50 si corresponde, haberes imponibles habituales.</li>
        <li>Colación y movilización (art. 41) no son imponibles; se tratan aparte en la liquidación del mes.</li>
        <li>El feriado pendiente y el proporcional se pagan según días y remuneración diaria.</li>
      </ul>
      <h2>Ejemplo numérico (ficticio)</h2>
      <p>
        Trabajador con sueldo base $900.000, gratificación art. 50, ingreso el 1 de marzo de 2020 y
        término el 1 de marzo de 2026, causal necesidades de la empresa (art. 161), sin aviso previo,
        5 días de feriado pendiente y 7 de proporcional. La calculadora de Haberes estima indemnización
        por años de servicio, aviso sustitutivo y feriado; puede reproducirlo en
        <a href="/finiquito/art-161-necesidades-de-la-empresa">la página de esa causal</a>.
      </p>
      <p class="actions"><a class="btn" href="/finiquito">Abrir calculadora de finiquito</a>
      <a class="btn btn-ghost" href="/guias/como-leer-una-liquidacion-de-sueldo">Leer una liquidación</a></p>
    `,
  },
  {
    slug: "finiquito-trabajadora-de-casa-particular",
    title: "Finiquito de trabajadora de casa particular — Haberes",
    description:
      "Cómo se finiquita a una trabajadora de casa particular: desahucio del art. 161, aviso e indemnización por años de servicio.",
    h1: "Cómo se finiquita a una trabajadora de casa particular",
    calc: "/finiquito",
    body: `
      <h1>Cómo se finiquita a una trabajadora de casa particular</h1>
      <p class="lede">
        El contrato de trabajadoras y trabajadores de casa particular puede terminar, entre otras
        causales, por desahucio escrito del empleador conforme al artículo 161 del Código del Trabajo.
        Ese desahucio exige aviso de treinta días o el pago de una indemnización equivalente a la
        última remuneración mensual. Si el contrato estuvo vigente un año o más, también corresponde
        la indemnización por años de servicio del artículo 163, con el tope legal.
      </p>
      <h2>Desahucio (art. 161)</h2>
      <p>
        El artículo 161 señala expresamente que, en el caso de los trabajadores de casa particular,
        el contrato puede terminar por desahucio escrito del empleador, con copia a la Inspección
        del Trabajo respectiva, y con anticipación de treinta días a lo menos, salvo que se pague
        la indemnización sustitutiva del aviso. No se trata de la misma causal que “necesidades de
        la empresa”, aunque ambas viven en el artículo 161.
      </p>
      <h2>Qué debe incluir el finiquito</h2>
      <ul>
        <li>Identificación de las partes y la causal (desahucio u otra aplicable).</li>
        <li>Haberes del mes, feriado pendiente y proporcional.</li>
        <li>Indemnización por años de servicio si hay un año o más de vigencia (art. 163).</li>
        <li>Aviso previo o su indemnización sustitutiva (art. 161).</li>
      </ul>
      <h2>Ratificación (art. 177)</h2>
      <p>
        El finiquito debe constar por escrito y ratificarse según el artículo 177. Haberes genera
        la carta para firmar; no reemplaza el trámite ante la Inspección del Trabajo ni ante un
        ministro de fe.
      </p>
      <p class="actions"><a class="btn" href="/finiquito/art-161-desahucio">Ver causal desahucio</a>
      <a class="btn btn-ghost" href="/finiquito">Calcular finiquito</a></p>
    `,
  },
  {
    slug: "me-reservo-el-derecho-en-el-finiquito",
    title: "Qué significa «me reservo el derecho» en el finiquito",
    description:
      "Qué implica firmar el finiquito con reserva de derechos, para qué sirve y qué no evita, según el artículo 177 del Código del Trabajo.",
    h1: "Qué significa «me reservo el derecho» en el finiquito",
    calc: "/finiquito",
    body: `
      <h1>Qué significa «me reservo el derecho» en el finiquito</h1>
      <p class="lede">
        «Me reservo el derecho» es una fórmula que el trabajador puede dejar escrita al firmar el
        finiquito para dejar constancia de que no está conforme con todos los montos o con la causal,
        y que no renuncia a reclamar lo que estime pendiente. El artículo 177 exige finiquito escrito
        y ratificado; la reserva no anula el documento, pero ayuda a que la firma no se interprete
        como un quicio total e irrevocable de toda controversia.
      </p>
      <h2>Para qué se usa</h2>
      <p>
        Suele usarse cuando hay duda sobre indemnizaciones, feriado, horas extras o la causal invocada.
        La reserva debe ser clara y concreta cuando sea posible (por ejemplo, discrepar del cálculo
        de años de servicio). Un abogado laboral puede precisar el texto según el caso.
      </p>
      <h2>Qué no hace la reserva</h2>
      <ul>
        <li>No reemplaza una demanda ni un reclamo formal ante la Inspección del Trabajo.</li>
        <li>No obliga al empleador a pagar de inmediato un monto distinto al del finiquito.</li>
        <li>No transforma una causal del artículo 160 (sin indemnización por años de servicio) en una del 161.</li>
      </ul>
      <h2>Antes de firmar</h2>
      <p>
        Revise causal, fechas, feriado e indemnizaciones con la
        <a href="/finiquito">calculadora de finiquito</a>. Si el monto no cuadra, documente la
        diferencia y consulte. Haberes estima; no es la Dirección del Trabajo ni asesoría legal.
      </p>
      <p class="actions"><a class="btn" href="/finiquito">Calcular finiquito</a>
      <a class="btn btn-ghost" href="/guias/plazo-de-pago-del-finiquito">Plazo de pago</a></p>
    `,
  },
  {
    slug: "como-leer-una-liquidacion-de-sueldo",
    title: "Cómo leer una liquidación de sueldo en Chile — Haberes",
    description:
      "Guía del formato de liquidación de sueldo: haberes, descuentos legales, líquido a pagar y qué revisar cada mes.",
    h1: "Cómo leer una liquidación de sueldo",
    calc: "/sueldo",
    body: `
      <h1>Cómo leer una liquidación de sueldo</h1>
      <p class="lede">
        Una liquidación de sueldo en Chile separa haberes (lo que se devenga) y descuentos (lo que
        se rebaja) para llegar al líquido a pagar. Los descuentos legales típicos son cotización
        AFP, salud (Fonasa o Isapre), seguro de cesantía del trabajador e impuesto único de segunda
        categoría. El documento debe identificar al empleador, al trabajador y el periodo.
      </p>
      <h2>Haberes imponibles y no imponibles</h2>
      <p>
        Los haberes imponibles (sueldo, gratificación art. 50, bonos imponibles) forman la base de
        cotizaciones. Colación y movilización del artículo 41 del Código del Trabajo no son
        imponibles ni tributables en los términos de esa norma, y suelen mostrarse aparte.
      </p>
      <h2>Descuentos legales</h2>
      <ul>
        <li>AFP: 10 % obligatorio más la comisión de la administradora (Circular 2414), con tope de 90 UF.</li>
        <li>Salud: 7 % Fonasa o el plan Isapre, con el mismo tope cuando aplica.</li>
        <li>Seguro de cesantía: aporte del trabajador según contrato.</li>
        <li>Impuesto único (IUSC) sobre la base tributable del mes.</li>
      </ul>
      <h2>Líquido a pagar</h2>
      <p>
        Es la suma de haberes menos descuentos. Si no cuadra con lo depositado, revise días
        trabajados, horas extras y descuentos voluntarios (anticipo, crédito). Puede estimar el
        líquido en la <a href="/sueldo">calculadora de sueldo líquido</a> o emitir el PDF con membrete
        desde <a href="/empresa">la cuenta de empresa</a>.
      </p>
      <p class="actions"><a class="btn" href="/sueldo">Calcular sueldo líquido</a>
      <a class="btn btn-ghost" href="/guias/formato-de-liquidacion-de-sueldo-chile">Formato y plantilla</a></p>
    `,
  },
  {
    slug: "formato-de-liquidacion-de-sueldo-chile",
    title: "Formato de liquidación de sueldo Chile — plantilla PDF",
    description:
      "Formato chileno de liquidación de sueldo para pymes: qué campos llevar, cómo emitir el PDF y diferencia con una planilla Excel.",
    h1: "Formato de liquidación de sueldo en Chile",
    calc: "/sueldo",
    body: `
      <h1>Formato de liquidación de sueldo en Chile</h1>
      <p class="lede">
        El formato habitual de una liquidación incluye datos del empleador y del trabajador,
        periodo, detalle de haberes, detalle de descuentos legales y el líquido a pagar. No existe
        un único formulario obligatorio idéntico para todas las empresas, pero sí debe ser claro,
        trazable y coherente con lo cotizado. Una planilla Excel sirve de borrador; el PDF firmado
        es el comprobante que se entrega al trabajador.
      </p>
      <h2>Campos mínimos útiles</h2>
      <ul>
        <li>Razón social, RUT y periodo de la liquidación.</li>
        <li>Nombre, RUT y cargo del trabajador.</li>
        <li>Haberes con nombre propio (no solo un total).</li>
        <li>AFP, salud, cesantía e impuesto único desglosados.</li>
        <li>Totales y líquido a pagar.</li>
      </ul>
      <h2>Excel frente a PDF</h2>
      <p>
        Un archivo Excel ayuda a armar la nómina del mes. El documento que se entrega y archiva
        suele ser el PDF con membrete. En Haberes, la cuenta de empresa genera ese PDF con logo y
        firma; el plan Pro agrega carga masiva y nómina bancaria.
      </p>
      <h2>Emitir el formato con Haberes</h2>
      <p>
        Calcule un caso suelto en <a href="/sueldo">sueldo líquido</a> o cargue la nómina en
        <a href="/empresa">empresa</a>. Para entender cada línea, lea
        <a href="/guias/como-leer-una-liquidacion-de-sueldo">cómo leer una liquidación</a>.
      </p>
      <p class="actions"><a class="btn" href="/empresa">Emitir liquidaciones</a>
      <a class="btn btn-ghost" href="/guias/liquidacion-de-sueldo-y-previred">Liquidación y Previred</a></p>
    `,
  },
  {
    slug: "liquidacion-de-sueldo-y-previred",
    title: "Liquidación de sueldo y Previred — qué estima Haberes",
    description:
      "Diferencia entre la liquidación estimada en Haberes y la declaración en Previred: cotizaciones, topes y responsabilidad del empleador.",
    h1: "Liquidación de sueldo y Previred",
    calc: "/sueldo",
    body: `
      <h1>Liquidación de sueldo y Previred</h1>
      <p class="lede">
        Previred es el canal de declaración y pago de cotizaciones previsionales. Haberes estima
        la liquidación de sueldo (haberes, descuentos y líquido) para armar el documento del
        trabajador. No declara ante Previred ni reemplaza esa obligación del empleador. Los montos
        deben contrastarse con las planillas oficiales antes de pagar cotizaciones.
      </p>
      <h2>Qué hace cada uno</h2>
      <ul>
        <li><strong>Haberes:</strong> calcula y emite liquidaciones y finiquitos con formato chileno.</li>
        <li><strong>Previred:</strong> declara y paga cotizaciones a AFP, salud, mutual y seguro de cesantía según las reglas vigentes.</li>
      </ul>
      <h2>Por qué pueden diferir</h2>
      <p>
        Topes en UF, días trabajados, licencias, reliquidaciones y códigos de la reforma previsional
        pueden hacer que la estimación del documento no coincida al peso con la declaración del mes.
        Haberes documenta sus supuestos (por ejemplo, aportes del empleador en el LRE van en cero
        cuando la tasa no está publicada para automatizar). El empleador sigue siendo responsable
        de la declaración correcta en Previred.
      </p>
      <h2>Flujo recomendado</h2>
      <p>
        Arme la liquidación en <a href="/sueldo">sueldo líquido</a> o en
        <a href="/empresa">empresa</a>, revise el PDF con el trabajador y declare cotizaciones en
        Previred con su software o planilla oficial. Si necesita el Libro de Remuneraciones
        Electrónico, la cuenta Pro genera un borrador CSV para revisar antes de subir a Mi DT.
      </p>
      <p class="actions"><a class="btn" href="/sueldo">Calcular sueldo líquido</a>
      <a class="btn btn-ghost" href="/empresa">Ir a mi empresa</a></p>
    `,
  },
];

const CAUSAL_PAGES = [
  {
    slug: "art-161-necesidades-de-la-empresa",
    causalId: "161-necesidades",
    title: "Finiquito por necesidades de la empresa (art. 161) — Haberes",
    description:
      "Qué indemnizaciones caben por necesidades de la empresa: años de servicio, aviso previo y feriado. Ejemplo numérico y calculadora.",
  },
  {
    slug: "art-159-renuncia-voluntaria",
    causalId: "159-b",
    title: "Finiquito por renuncia voluntaria (art. 159 b) — Haberes",
    description:
      "Renuncia del trabajador: sin indemnización por años de servicio ni aviso del empleador. Qué sí se paga y cómo calcularlo.",
  },
  {
    slug: "art-159-vencimiento-del-plazo",
    causalId: "159-d",
    title: "Finiquito por vencimiento del plazo (art. 159 d) — Haberes",
    description:
      "Término por vencimiento del plazo convenido: efectos indemnizatorios, feriado y ejemplo con la calculadora de Haberes.",
  },
  {
    slug: "art-160-incumplimiento-grave",
    causalId: "160-7",
    title: "Finiquito por incumplimiento grave (art. 160 N° 7) — Haberes",
    description:
      "Incumplimiento grave del contrato: sin indemnización por años de servicio. Qué se liquida igual y ejemplo numérico.",
  },
  {
    slug: "art-161-desahucio",
    causalId: "161-desahucio",
    title: "Finiquito por desahucio del empleador (art. 161) — Haberes",
    description:
      "Desahucio del art. 161: aviso de treinta días o indemnización sustitutiva, e indemnización por años de servicio si corresponde.",
  },
];

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

for (const g of GUIDES) {
  const crumbsItems = [
    { name: "Inicio", href: "/" },
    { name: "Guías", href: "/guias/como-leer-una-liquidacion-de-sueldo" },
    { name: g.h1, href: `/guias/${g.slug}` },
  ];
  // trim descriptions to <=160
  if (g.description.length > 160) {
    console.warn("desc larga", g.slug, g.description.length);
  }
  if (g.title.length > 65) console.warn("title largo", g.slug, g.title.length);
  const html = pageShell({
    title: g.title,
    description: g.description,
    canonical: `/guias/${g.slug}`,
    crumbsItems,
    article: { headline: g.h1 },
    body: g.body,
  });
  writeFileSync(join(root, "guias", `${g.slug}.html`), html);
  console.log("guia", g.slug);
}

for (const p of CAUSAL_PAGES) {
  const c = causalPorId(p.causalId);
  const r = calcularFiniquitoCompleto({ ...ejemploBase, causal: p.causalId }, { uf: FALLBACK_UF });
  const iasP = r.partidas.find((x) => x.key === "ias");
  const avisoP = r.partidas.find((x) => x.key === "aviso");
  const ferPend = r.partidas.find((x) => x.key === "feriadoPendiente");
  const ferProp = r.partidas.find((x) => x.key === "feriadoProporcional");

  let iasBlock;
  if (c.aplicaIas) {
    iasBlock = `<p>Esta causal <strong>sí</strong> puede dar derecho a indemnización por años de servicio
      cuando el contrato estuvo vigente un año o más (arts. 161 y 163). En el ejemplo: ${pesos(iasP.monto)}
      por ${r.anios} años sobre una remuneración mensual de ${pesos(r.remuneracionMensual)}.</p>`;
  } else {
    iasBlock = `<p>Esta causal <strong>no</strong> da derecho a indemnización por años de servicio
      (el artículo 160 y las letras del 159 que no remiten al 161 no generan esa partida).
      En el ejemplo la línea de IAS queda en ${pesos(0)} de forma explícita, no como un vacío.</p>`;
  }

  let avisoBlock;
  if (c.aplicaAviso) {
    avisoBlock = `<p>Corresponde aviso previo de treinta días o indemnización sustitutiva
      (arts. 161 y 162). En el ejemplo, sin aviso previo: ${pesos(avisoP.monto)}.</p>`;
  } else {
    avisoBlock = `<p>No corresponde indemnización sustitutiva de aviso previo del empleador por esta causal.
      En el ejemplo esa partida es ${pesos(0)}.</p>`;
  }

  const crumbsItems = [
    { name: "Inicio", href: "/" },
    { name: "Finiquito", href: "/finiquito" },
    { name: c.short, href: `/finiquito/${p.slug}` },
  ];

  const body = `
      <h1>${c.label}</h1>
      <p class="lede">${c.textoLegal}</p>
      <h2>Indemnización por años de servicio</h2>
      ${iasBlock}
      <h2>Aviso previo</h2>
      ${avisoBlock}
      <h2>Feriado</h2>
      <p>
        El feriado pendiente y el proporcional se liquidan con independencia de la causal, según los
        días adeudados. En el ejemplo: pendiente ${pesos(ferPend.monto)} (5 días) y proporcional
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
              .map((x) => `<tr><td>${x.label}</td><td>${pesos(x.monto)}</td></tr>`)
              .join("\n            ")}
            <tr><th>Total</th><th>${pesos(r.total)}</th></tr>
          </tbody>
        </table>
      </div>
      <h2>Calcular con esta causal</h2>
      <p>
        Abra la <a href="/finiquito?causal=${p.causalId}">calculadora de finiquito</a> con la causal
        precargada (parámetro <code>causal=${p.causalId}</code>) y ajuste fechas y montos.
      </p>
      <p class="actions">
        <a class="btn" href="/finiquito?causal=${p.causalId}">Abrir calculadora</a>
        <a class="btn btn-ghost" href="/guias/con-que-sueldo-se-calcula-el-finiquito">Con qué sueldo se calcula</a>
      </p>
  `;

  const html = pageShell({
    title: p.title,
    description: p.description,
    canonical: `/finiquito/${p.slug}`,
    crumbsItems,
    article: { headline: c.label },
    body,
  });
  writeFileSync(join(root, "finiquito", `${p.slug}.html`), html);
  console.log("causal", p.slug, pesos(r.total));
}

console.log("contenido generado");
