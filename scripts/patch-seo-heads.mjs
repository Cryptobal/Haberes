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
  "horas-extras.html": {
    path: "/horas-extras",
    title: "Calcular horas extras Chile 2026 — Haberes",
    description:
      "Calcule el valor de una hora extra y el total a pagar: sueldo base, jornada semanal y recargo 50 % (art. 32). Resultado al instante y gratis.",
    ogImage: "/img/og-default.png",
    jsonld: (url) => [
      ORG,
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Calcular horas extras — Haberes",
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
            name: "¿Cuál es el recargo mínimo de la hora extra?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "El artículo 32 del Código del Trabajo fija un recargo del 50 % sobre el sueldo convenido para la jornada ordinaria. Ese es el mínimo legal; el pacto puede ser mayor.",
            },
          },
          {
            "@type": "Question",
            name: "¿Sobre qué sueldo se calcula la hora extra?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Sobre el sueldo pactado de la jornada ordinaria, no sobre el mes proporcional. Haberes usa la fórmula de la Dirección del Trabajo: sueldo / 30 × 28 / (jornada × 4) × 1,5.",
            },
          },
          {
            "@type": "Question",
            name: "¿Las horas extras cambian el sueldo líquido?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Sí. El recargo es imponible y entra a la liquidación. Use esta página para el valor de la hora y el total; para ver el efecto en el líquido abra la calculadora de sueldo.",
            },
          },
        ],
      },
    ],
  },
  "gratificacion.html": {
    path: "/gratificacion",
    title: "Calcular gratificación Chile 2026 — Haberes",
    description:
      "Calcule la gratificación legal art. 50: 25 % del imponible con tope mensual 4,75 IMM. Sueldo base, extras y bonos. Resultado al instante y gratis.",
    ogImage: "/img/og-default.png",
    jsonld: (url) => [
      ORG,
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Calcular gratificación — Haberes",
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
            name: "¿Cómo se calcula la gratificación del artículo 50?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "El 25 % de la remuneración mensual imponible (sueldo base, horas extras y bonos imponibles), con un tope de 4,75 ingresos mínimos mensuales al año. Haberes aplica ese tope mes a mes: $219.115 en 2026.",
            },
          },
          {
            "@type": "Question",
            name: "¿Cuál es el tope mensual de la gratificación art. 50 en 2026?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "El tope mensual es $219.115. Sale de 4,75 × $553.553 / 12, en peso entero. Si el 25 % queda bajo ese monto, se paga el 25 %; si lo supera, se paga el tope.",
            },
          },
          {
            "@type": "Question",
            name: "¿Las horas extras y los bonos entran a la gratificación?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Sí, si son imponibles. Entran a la misma base que el sueldo: 25 % de (sueldo base + extras + bonos), con el tope. Colación y movilización del artículo 41 no entran.",
            },
          },
        ],
      },
    ],
  },
  "impuesto-unico.html": {
    path: "/impuesto-unico",
    title: "Calcular impuesto único Chile 2026 — Haberes",
    description:
      "Calcule el impuesto único de segunda categoría sobre la renta líquida imponible. Tabla SII agosto 2026: tramo, rebaja y monto del mes al instante. Gratis.",
    ogImage: "/img/og-default.png",
    jsonld: (url) => [
      ORG,
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Calcular impuesto único — Haberes",
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
            name: "¿Qué es la renta líquida imponible?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Es la base del impuesto único: haberes imponibles menos AFP, salud y, si corresponde, el seguro de cesantía del trabajador. No es el sueldo bruto ni el líquido a pago. Colación y movilización del artículo 41 no entran.",
            },
          },
          {
            "@type": "Question",
            name: "¿Hasta qué monto está exento el impuesto único en agosto 2026?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "En la tabla mensual de agosto de 2026 del SII el tramo exento llega a $967.261,50 (13,5 UTM). Es la misma tabla que usa la calculadora de sueldo líquido. El SII publica un mes nuevo cuando cambia la UTM.",
            },
          },
          {
            "@type": "Question",
            name: "¿Cómo se calcula el impuesto único?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Se busca el tramo de la renta líquida imponible, se multiplica por el factor y se resta la cantidad a rebajar. El resultado se redondea al peso. Si el tramo es exento, el impuesto es $0.",
            },
          },
        ],
      },
    ],
  },
  "cotizaciones-previsionales.html": {
    path: "/cotizaciones-previsionales",
    title: "Calcular cotizaciones previsionales Chile 2026 — Haberes",
    description:
      "Calcule AFP (10 % + comisión), salud Fonasa 7 % y cesantía del trabajador indefinido, con topes en UF. Resultado al instante y gratis.",
    ogImage: "/img/og-default.png",
    jsonld: (url) => [
      ORG,
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Calcular cotizaciones previsionales — Haberes",
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
            name: "¿Qué cotizaciones del trabajador incluye esta página?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "AFP (10 % obligatorio más la comisión de la AFP), salud Fonasa 7 % y el seguro de cesantía del trabajador con contrato indefinido (0,6 %). No incluye cotización del empleador, SIS, mutual ni líneas de la Ley 21.735: Haberes todavía no modela esas líneas.",
            },
          },
          {
            "@type": "Question",
            name: "¿Qué topes imponibles usa Haberes?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "AFP y salud se calculan sobre la base imponible hasta 90 UF. El seguro de cesantía del trabajador, hasta 135,2 UF. Si el sueldo supera el tope, la base se corta ahí. Los pesos del tope salen de la UF del mes.",
            },
          },
          {
            "@type": "Question",
            name: "¿La comisión de la AFP va aparte del 10 % obligatorio?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Sí. El 10 % es la cotización obligatoria de pensión. La comisión es un porcentaje extra que cobra cada AFP (Circular 2414). Haberes suma ambos sobre la misma base, con el tope de 90 UF.",
            },
          },
          {
            "@type": "Question",
            name: "¿Esto es lo mismo que calcular sueldo líquido?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Aquí solo se ven cotizaciones previsionales del trabajador. El líquido también resta el impuesto único y suma haberes no imponibles. Para el efecto en el líquido use la calculadora de sueldo líquido.",
            },
          },
          {
            "@type": "Question",
            name: "¿Haberes declara estas cotizaciones en Previred?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Haberes es una herramienta de liquidaciones para pymes. No es Previred ni la Dirección del Trabajo. Contraste siempre antes de declarar o pagar.",
            },
          },
        ],
      },
    ],
  },
  "recargo-domingo-comercio.html": {
    path: "/recargo-domingo-comercio",
    title: "Calcular recargo domingo comercio Chile 2026 — Haberes",
    description:
      "Calcule el recargo mínimo 30 % por horas ordinarias en domingo del comercio (art. 38 N°7). Distinto de las horas extras. Resultado al instante y gratis.",
    ogImage: "/img/og-default.png",
    jsonld: (url) => [
      ORG,
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Calcular recargo domingo comercio — Haberes",
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
            name: "¿Cuánto recargo se paga por trabajar el domingo en el comercio?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "El artículo 38 N°7 del Código del Trabajo manda remunerar las horas ordinarias trabajadas en domingo con un recargo de, a lo menos, un 30 % sobre el sueldo convenido para la jornada ordinaria. El pacto puede ser mayor. Haberes usa el mínimo 30 % y la misma base de hora de la Dirección del Trabajo: sueldo / 30 × 28 / (jornada × 4).",
            },
          },
          {
            "@type": "Question",
            name: "¿El recargo del domingo es lo mismo que las horas extras?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Las horas extras (artículo 32) son las que exceden la jornada ordinaria semanal y llevan recargo 50 %. El 30 % del artículo 38 es un recargo distinto, sobre horas ordinarias en domingo en comercio o servicios que atienden al público. Si ese domingo además hubo extras, la DT toma como base la hora ordinaria más el 30 % y sobre eso aplica el 50 %.",
            },
          },
          {
            "@type": "Question",
            name: "¿El 30 % también se paga si abrimos un festivo?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "El recargo del 30 % está escrito para las horas ordinarias en día domingo, no para el festivo por el solo hecho de ser feriado. En festivo trabajado el Código sí exige un día de descanso en compensación. Si las horas de ese día exceden la jornada semanal, se pagan como extras (artículo 32). No invente un porcentaje de festivo: si el caso es dudoso, consulte a su contador o a la DT.",
            },
          },
          {
            "@type": "Question",
            name: "¿El recargo reemplaza el día de descanso?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. El recargo es pago. Aparte, las empresas exceptuadas del descanso dominical deben otorgar un día de descanso a la semana por el domingo trabajado, y otro por cada festivo en que se prestaron servicios. En el comercio del N°7, el artículo 38 bis añade siete días domingo de descanso al año, con excepciones. Haberes no cuenta esos días aquí.",
            },
          },
          {
            "@type": "Question",
            name: "¿El recargo entra al sueldo líquido?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Sí: es remuneración y se liquida junto con las remuneraciones del período. En el Libro de Remuneraciones Electrónico esa línea es el código 2107. Esta página estima solo el recargo. Para ver AFP, salud e impuesto único use la calculadora de sueldo líquido.",
            },
          },
        ],
      },
    ],
  },
  "semana-corrida.html": {
    path: "/semana-corrida",
    title: "Calcular semana corrida Chile 2026 — Haberes",
    description:
      "Calcule la semana corrida (art. 45): promedio diario de variables por domingo y festivo. Distinto del recargo domingo comercio. Resultado al instante y gratis.",
    ogImage: "/img/og-default.png",
    jsonld: (url) => [
      ORG,
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Calcular semana corrida — Haberes",
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
            name: "¿Qué es la semana corrida?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Es la remuneración en dinero por los días domingo y festivos que el artículo 45 del Código del Trabajo reconoce a quienes se pagan por día y a quienes combinan sueldo mensual con remuneraciones variables (comisiones o tratos). La Dirección del Trabajo también la llama pago del séptimo día.",
            },
          },
        ],
      },
    ],
  },
  "asignacion-familiar.html": {
    path: "/asignacion-familiar",
    title: "Calcular asignación familiar Chile 2026 — Haberes",
    description:
      "Calcule la asignación familiar por carga según tramos Ley 21.830 (desde mayo 2026). El empleador paga y recupera. No es sueldo líquido ni SUF.",
    ogImage: "/img/og-default.png",
    jsonld: (url) => [
      ORG,
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Calcular asignación familiar — Haberes",
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
            name: "¿Cuál es el valor de la asignación familiar en 2026?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "A contar del 1 de mayo de 2026, la Ley 21.830 fija $22.601 por carga si el ingreso mensual no excede $649.039; $13.870 si supera esa cifra y no excede $947.990; $4.382 si supera $947.990 y no excede $1.478.539; y $0 sobre $1.478.539. La carga con invalidez declarada por la COMPIN da derecho al duplo (D.F.L. N° 150, art. 14).",
            },
          },
          {
            "@type": "Question",
            name: "¿La asignación familiar es lo mismo que el SUF?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Esta página cubre la asignación familiar y maternal del Sistema Único de Prestaciones Familiares (D.F.L. N° 150): el empleador la paga con la liquidación si las cargas están acreditadas y después recupera. El SUF (subsidio familiar, Ley 18.020) lo tramitan las municipalidades. Haberes no abre una página /suf.",
            },
          },
        ],
      },
    ],
  },
  "colacion-movilizacion.html": {
    path: "/colacion-movilizacion",
    title: "Calcular colación y movilización Chile 2026 — Haberes",
    description:
      "Calcule colación y movilización (art. 41): total, efecto en la base imponible y cuándo pasan a ser remuneración. No es el sueldo líquido.",
    ogImage: "/img/og-default.png",
    jsonld: (url) => [
      ORG,
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Calcular colación y movilización — Haberes",
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
            name: "¿La colación y la movilización son imponibles?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Por regla, no, si cubren el gasto de comida o transporte para que el trabajador preste servicios. El artículo 41 del Código del Trabajo dice que esas asignaciones no constituyen remuneración. Si son contraprestación o pierden ese carácter de gasto, sí entran a cotizaciones e impuesto único.",
            },
          },
          {
            "@type": "Question",
            name: "¿Hay un tope legal de colación o movilización?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "El Código del Trabajo no publica un monto máximo. Haberes no inventa un tope en UF. Un monto desproporcionado respecto del gasto real de comida o transporte puede hacer que la Dirección del Trabajo o el SII las traten como remuneración. Eso lo resuelve su contador o la Inspección, no esta página.",
            },
          },
        ],
      },
    ],
  },
  "sueldo-minimo.html": {
    path: "/sueldo-minimo",
    title: "Calcular sueldo mínimo Chile 2026 — Haberes",
    description:
      "Calcule el IMM 2026 (Ley 21.830): piso legal del sueldo base, jornada parcial y tope art. 50. No es el sueldo líquido con AFP ni salud.",
    ogImage: "/img/og-default.png",
    jsonld: (url) => [
      ORG,
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Calcular sueldo mínimo — Haberes",
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
            name: "¿Cuál es el sueldo mínimo en Chile en 2026?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Desde el 1 de mayo de 2026, la Ley 21.830 (Diario Oficial 22 de junio de 2026) fija el ingreso mínimo mensual en $553.553 para trabajadores de 18 a 65 años; $412.938 para menores de 18 y mayores de 65; y $356.815 para fines no remuneracionales. Ese último monto no es sueldo base.",
            },
          },
          {
            "@type": "Question",
            name: "¿Esta página calcula el sueldo líquido?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Esta página estima el piso legal del sueldo base (IMM), la proporcionalidad por jornada parcial y el tope del artículo 50. No descuenta AFP, salud, cesantía ni impuesto único. Para el líquido use la calculadora de sueldo líquido. No abre /imm ni /ingreso-minimo.",
            },
          },
        ],
      },
    ],
  },
  "vacaciones-proporcionales.html": {
    path: "/vacaciones-proporcionales",
    title: "Calcular vacaciones proporcionales Chile 2026 — Haberes",
    description:
      "Calcule vacaciones proporcionales (feriado proporcional): días × remuneración / 30. Artículo 67, 15 días hábiles. Resultado al instante y gratis.",
    ogImage: "/img/og-default.png",
    jsonld: (url) => [
      ORG,
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Calcular vacaciones proporcionales — Haberes",
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
            name: "¿Vacaciones proporcionales y feriado proporcional son lo mismo?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "En el lenguaje laboral chileno se habla de feriado. «Vacaciones proporcionales» es la forma habitual de buscar el mismo concepto al término del contrato.",
            },
          },
          {
            "@type": "Question",
            name: "¿Cómo se calcula el feriado proporcional?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Se liquida según los días de feriado adeudados multiplicados por la remuneración diaria (remuneración mensual dividida por treinta). En Haberes: días × remuneración / 30, redondeado al peso.",
            },
          },
          {
            "@type": "Question",
            name: "¿Cuántos días de feriado anual fija el artículo 67?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "El artículo 67 del Código del Trabajo contempla 15 días hábiles de feriado anual después de un año de servicio. El proporcional es la fracción del año incompleto; usted indica los días, como en el finiquito.",
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
