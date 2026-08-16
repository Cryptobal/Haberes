#!/usr/bin/env node
/**
 * Verificación de cifras oficiales y de la estructura del sitio Haberes.
 * Ejecutar: node scripts/verify.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AFP_COMISION,
  DISCLAIMER,
  DISCLAIMER_FINIQUITO,
  FALLBACK_UF,
  FALLBACK_UTM,
  GRATIFICACION_TOPE,
  IMM,
  IUSC_TRAMOS,
  TOPE_AFP_SALUD_UF,
  TOPE_CESANTIA_UF,
} from "../js/constants.js";
import { parseTrabajadoresCsv } from "../js/csv.js";
import { aniosServicio, calcularFiniquito, feriadoProporcional } from "../js/finiquito.js";
import {
  calcularIusc,
  calcularSueldo,
  gratificacionArt50,
  tasaAfp,
  valorHoraExtra,
} from "../js/sueldo.js";
import { dvRut, validarRut } from "../js/format.js";
import { fallbackIndicadores } from "../js/indicadores.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
let passed = 0;

function ok(name) {
  passed += 1;
  console.log(`  ok  ${name}`);
}

function fail(name, detail) {
  failed += 1;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

function assert(name, cond, detail) {
  if (cond) ok(name);
  else fail(name, detail);
}

function close(a, b, eps = 0.01) {
  return Math.abs(a - b) <= eps;
}

console.log("Haberes verify\n");

console.log("Constantes oficiales");
assert("UF fallback", FALLBACK_UF === 40854.01, String(FALLBACK_UF));
assert("UTM fallback", FALLBACK_UTM === 71649, String(FALLBACK_UTM));
assert("IMM Ley 21.830", IMM === 553553, String(IMM));
assert("Tope gratificación art.50", GRATIFICACION_TOPE === 219115, String(GRATIFICACION_TOPE));
assert(
  "AFP Circular 2414",
  AFP_COMISION.uno === 0.49 &&
    AFP_COMISION.modelo === 0.58 &&
    AFP_COMISION.planvital === 1.16 &&
    AFP_COMISION.habitat === 1.27 &&
    AFP_COMISION.capital === 1.44 &&
    AFP_COMISION.cuprum === 1.44 &&
    AFP_COMISION.provida === 1.45,
);
assert("Tope AFP/salud 90 UF", TOPE_AFP_SALUD_UF === 90);
assert("Tope cesantía 135.2 UF", TOPE_CESANTIA_UF === 135.2);
assert("IUSC 8 tramos ago 2026", IUSC_TRAMOS.length === 8 && IUSC_TRAMOS[0].hasta === 967261.5);

console.log("\nHoras extras art. 32");
assert("800000 → extra ≈ 6666.67 (jornada 42)", close(valorHoraExtra(800000, 42), 6666.67, 0.01), String(valorHoraExtra(800000, 42)));

console.log("\nSueldo líquido");
const golden = calcularSueldo(
  { sueldoBase: 1_000_000, afp: "modelo", salud: "fonasa", contrato: "indefinido" },
  { uf: FALLBACK_UF },
);
assert(
  "1.000.000 Modelo indefinido Fonasa líquido = 818200",
  golden.liquido === 818200,
  String(golden.liquido),
);
assert("AFP 105.800", golden.afp.monto === 105800, String(golden.afp.monto));
assert("Salud 70.000", golden.salud.monto === 70000, String(golden.salud.monto));
assert("Cesantía 6.000", golden.cesantia.monto === 6000, String(golden.cesantia.monto));
assert("IUSC 0 bajo primer tramo", golden.iusc === 0, String(golden.iusc));
assert("Tasa AFP Modelo 10,58 %", close(tasaAfp("modelo"), 0.1058));

const plazo = calcularSueldo(
  { sueldoBase: 1_000_000, afp: "modelo", salud: "fonasa", contrato: "plazo_fijo" },
  { uf: FALLBACK_UF },
);
assert("Plazo fijo sin cesantía trabajador", plazo.cesantia.monto === 0);

const withNoImp = calcularSueldo(
  {
    sueldoBase: 1_000_000,
    afp: "modelo",
    salud: "fonasa",
    contrato: "indefinido",
    colacion: 40000,
    movilizacion: 30000,
  },
  { uf: FALLBACK_UF },
);
assert(
  "Colación/movilización art.41 no imponibles",
  withNoImp.imponible === 1_000_000 && withNoImp.liquido === 818200 + 70000,
  `imp=${withNoImp.imponible} liq=${withNoImp.liquido}`,
);

assert("Gratificación 25 % con tope", gratificacionArt50(1_000_000) === 219115);
assert("Gratificación bajo tope", gratificacionArt50(100_000) === 25000);

const topeAfp = calcularSueldo(
  { sueldoBase: 10_000_000, afp: "modelo", salud: "fonasa", contrato: "indefinido" },
  { uf: FALLBACK_UF },
);
assert(
  "AFP usa tope 90 UF",
  close(topeAfp.baseAfpSalud, 90 * FALLBACK_UF, 0.1),
  String(topeAfp.baseAfpSalud),
);
assert(
  "Cesantía usa tope 135.2 UF",
  close(topeAfp.baseCesantia, 135.2 * FALLBACK_UF, 0.1),
  String(topeAfp.baseCesantia),
);

const isapre = calcularSueldo(
  {
    sueldoBase: 1_000_000,
    afp: "modelo",
    salud: "isapre",
    isaprePactado: 90000,
    contrato: "indefinido",
  },
  { uf: FALLBACK_UF },
);
assert("Isapre cobra el mayor entre 7 % y pactado", isapre.salud.monto === 90000);

console.log("\nIUSC agosto 2026");
assert("≤ 967261.5 → 0", calcularIusc(967261.5) === 0);
assert(
  "2.000.000 → 4 % − 38690.46",
  calcularIusc(2_000_000) === Math.round(2_000_000 * 0.04 - 38690.46),
);
assert(
  "3.000.000 → 8 % − 124669.26",
  calcularIusc(3_000_000) === Math.round(3_000_000 * 0.08 - 124669.26),
);
assert(
  "4.500.000 → 13.5 % − 321704.01",
  calcularIusc(4_500_000) === Math.round(4_500_000 * 0.135 - 321704.01),
);
assert(
  "6.000.000 → 23 % − 798169.86",
  calcularIusc(6_000_000) === Math.round(6_000_000 * 0.23 - 798169.86),
);
assert(
  "8.000.000 → 30.4 % − 1275352.2",
  calcularIusc(8_000_000) === Math.round(8_000_000 * 0.304 - 1275352.2),
);
assert(
  "10.000.000 → 35 % − 1670854.68",
  calcularIusc(10_000_000) === Math.round(10_000_000 * 0.35 - 1670854.68),
);
assert(
  "sobre 22.211.190 → 40 % − 2781414.18",
  calcularIusc(25_000_000) === Math.round(25_000_000 * 0.4 - 2781414.18),
);

console.log("\nFiniquito");
assert("Fracción > 6 meses suma 1 año", aniosServicio("2020-01-15", "2023-08-20") === 4);
assert("Exactamente 6 meses no suma", aniosServicio("2020-01-15", "2023-07-15") === 3);
assert("Tope 11 años", aniosServicio("2000-01-01", "2020-01-01") === 11);
assert("Feriado dias*rem/30", feriadoProporcional(15, 900000) === 450000);

const f161 = calcularFiniquito(
  {
    articulo: "161",
    ingreso: "2020-01-15",
    termino: "2023-08-20",
    remuneracion: 1_000_000,
    avisoPrevio: false,
    diasFeriado: 10,
  },
  { uf: FALLBACK_UF },
);
assert("Art. 161 incluye IAS y aviso", f161.ias === 4_000_000 && f161.aviso === 1_000_000);
assert("Feriado 10 días * rem/30", f161.feriado === Math.round((10 * 1_000_000) / 30));

const f161aviso = calcularFiniquito(
  { articulo: "161", anios: 2, remuneracion: 1_000_000, avisoPrevio: true, diasFeriado: 0 },
  { uf: FALLBACK_UF },
);
assert("Con aviso previo no hay indemnización sustitutiva", f161aviso.aviso === 0);

const f159 = calcularFiniquito(
  {
    articulo: "159",
    ingreso: "2020-01-15",
    termino: "2023-08-20",
    remuneracion: 1_000_000,
    avisoPrevio: false,
    diasFeriado: 10,
  },
  { uf: FALLBACK_UF },
);
assert("Art. 159/160 sin IAS ni aviso", f159.ias === 0 && f159.aviso === 0 && f159.feriado > 0);

const f160 = calcularFiniquito(
  { articulo: "160", anios: 5, remuneracion: 2_000_000, avisoPrevio: false, diasFeriado: 0 },
  { uf: FALLBACK_UF },
);
assert("Art. 160 sin IAS ni aviso", f160.ias === 0 && f160.aviso === 0);

const alto = calcularFiniquito(
  { articulo: "161", anios: 2, remuneracion: 10_000_000, avisoPrevio: false, diasFeriado: 0 },
  { uf: FALLBACK_UF },
);
assert(
  "IAS/aviso tope 90 UF",
  close(alto.baseIas, 90 * FALLBACK_UF, 1),
  String(alto.baseIas),
);

console.log("\nCSV y RUT");
const csv = parseTrabajadoresCsv(
  "nombre,rut,cargo,sueldo_base,afp,salud,contrato,colacion\nAna,12345678-5,Admin,1000000,modelo,fonasa,indefinido,50000\n",
);
assert("CSV parsea 1 trabajador", csv.length === 1 && csv[0].sueldoBase === 1_000_000);
assert("RUT 12.345.678-5 válido", validarRut("12.345.678-5"));
assert("DV RUT 12345678", dvRut("12345678") === "5");

console.log("\nIndicadores");
const fb = fallbackIndicadores();
assert("Fallback indicadores", fb.uf === FALLBACK_UF && fb.utm === FALLBACK_UTM && fb.fuente === "fallback");

console.log("\nSitio estático");
const required = [
  "index.html",
  "sueldo.html",
  "finiquito.html",
  "empresa.html",
  "privacidad.html",
  "terminos.html",
  "robots.txt",
  "sitemap.xml",
  "css/app.css",
  "js/constants.js",
  "js/sueldo.js",
  "js/finiquito.js",
  "js/indicadores.js",
  "js/csv.js",
  "js/storage.js",
  "js/print.js",
  "js/analytics.js",
  "api/reset-request.js",
  "api/reset-confirm.js",
  "vercel.json",
  "scripts/verify.mjs",
];
for (const f of required) {
  assert(`existe ${f}`, existsSync(join(root, f)));
}

const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
assert("vercel.json cleanUrls", vercel.cleanUrls === true);

const htmlFiles = [
  "index.html",
  "sueldo.html",
  "finiquito.html",
  "empresa.html",
  "privacidad.html",
  "terminos.html",
];
for (const f of htmlFiles) {
  const html = readFileSync(join(root, f), "utf8");
  assert(
    `${f} disclaimer IA / no DT / no Previred`,
    /inteligencia artificial|estimaci[oó]n/i.test(html) &&
      /Direcci[oó]n del Trabajo/i.test(html) &&
      /Previred/i.test(html) &&
      /asesor[ií]a legal/i.test(html),
  );
  assert(`${f} canonical haberes.cl`, /rel="canonical" href="https:\/\/www\.haberes\.cl/.test(html));
  assert(`${f} og:url`, /property="og:url" content="https:\/\/www\.haberes\.cl/.test(html));
  assert(`${f} carga analytics.js`, /src="js\/analytics\.js"/.test(html));
  assert(`${f} no define GA4 falso`, !/HABERES_GA4\s*=\s*["']G-/.test(html));
  assert(`${f} enlace privacidad`, /href="\/privacidad"/.test(html));
  assert(`${f} enlace términos`, /href="\/terminos"/.test(html));
}

const robots = readFileSync(join(root, "robots.txt"), "utf8");
assert("robots User-agent *", /User-agent:\s*\*/i.test(robots));
assert("robots Allow /", /Allow:\s*\//.test(robots));
assert("robots Sitemap", /Sitemap:\s*https:\/\/www\.haberes\.cl\/sitemap\.xml/.test(robots));

const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const expectedLocs = [
  "https://www.haberes.cl/",
  "https://www.haberes.cl/sueldo",
  "https://www.haberes.cl/finiquito",
  "https://www.haberes.cl/empresa",
  "https://www.haberes.cl/privacidad",
  "https://www.haberes.cl/terminos",
];
assert("sitemap 6 URLs clean", expectedLocs.every((u) => locs.includes(u)) && locs.length === 6, locs.join(", "));
assert("sitemap lastmod 2026-08-16", /<lastmod>2026-08-16<\/lastmod>/.test(sitemap));
assert("sitemap sin .html (cleanUrls)", !locs.some((u) => u.endsWith(".html")));

const analytics = readFileSync(join(root, "js/analytics.js"), "utf8");
assert(
  "analytics.js exige G- no vacío",
  /HABERES_GA4/.test(analytics) && /G-\[A-Z0-9/.test(analytics) && /if\s*\(!id/.test(analytics),
);
assert("analytics.js no trae property de ejemplo", !/gtag\/js\?id=G-[A-Z0-9]+/.test(analytics));

console.log("\nAPI recuperación (fail closed)");
const prevDb = process.env.DATABASE_URL;
const prevResend = process.env.RESEND_API_KEY;
delete process.env.DATABASE_URL;
delete process.env.RESEND_API_KEY;

function mockRes() {
  const out = { statusCode: 200, body: null, headers: {} };
  const res = {
    setHeader(k, v) {
      out.headers[k] = v;
      return res;
    },
    status(code) {
      out.statusCode = code;
      return res;
    },
    json(payload) {
      out.body = payload;
      return res;
    },
  };
  res._out = out;
  return res;
}

const resetRequest = (await import("../api/reset-request.js")).default;
const resetConfirm = (await import("../api/reset-confirm.js")).default;
const reqRes = mockRes();
await resetRequest({ method: "POST", body: { rut: "76.123.456-0" } }, reqRes);
assert(
  "reset-request 501 sin DATABASE_URL",
  reqRes._out.statusCode === 501 && reqRes._out.body?.ok === false && reqRes._out.body?.reason === "no_backend",
  JSON.stringify(reqRes._out.body),
);
const confRes = mockRes();
await resetConfirm({ method: "POST", body: { token: "x", clave: "secreto" } }, confRes);
assert(
  "reset-confirm 501 sin DATABASE_URL",
  confRes._out.statusCode === 501 && confRes._out.body?.reason === "no_backend",
  JSON.stringify(confRes._out.body),
);
if (prevDb !== undefined) process.env.DATABASE_URL = prevDb;
if (prevResend !== undefined) process.env.RESEND_API_KEY = prevResend;

for (const f of ["api/reset-request.js", "api/reset-confirm.js", "api/_lib.js"]) {
  const src = readFileSync(join(root, f), "utf8");
  assert(
    `${f} no loguea secretos`,
    !/console\.(log|info|debug|warn|error)\([^)]*(token|clave|password)/i.test(src),
  );
}
assert("sin schema prisma inventado", !existsSync(join(root, "prisma")));
assert(
  "empresa.html olvido honesto",
  /Olvidé mi clave/.test(readFileSync(join(root, "empresa.html"), "utf8")) &&
    /no se puede enviar por correo/i.test(readFileSync(join(root, "empresa.html"), "utf8")),
);
assert(
  "privacidad: local + mindicador + no venta",
  /localStorage|este navegador/i.test(readFileSync(join(root, "privacidad.html"), "utf8")) &&
    /mindicador\.cl/.test(readFileSync(join(root, "privacidad.html"), "utf8")) &&
    /No vendemos datos personales/.test(readFileSync(join(root, "privacidad.html"), "utf8")),
);
assert(
  "términos: IA, no DT, carta no reemplaza Inspección / ministro de fe",
  /ministro de fe/.test(readFileSync(join(root, "terminos.html"), "utf8")) &&
    /Inspecci[oó]n del Trabajo/.test(readFileSync(join(root, "terminos.html"), "utf8")),
);

const cartaHint = readFileSync(join(root, "js/print.js"), "utf8") + readFileSync(join(root, "empresa.html"), "utf8");
assert(
  "Carta finiquito: firmas + no reemplaza Inspección",
  /Inspecci[oó]n del Trabajo/i.test(cartaHint) && /testigo/i.test(cartaHint),
);

console.log("\nHigiene");
const { readdirSync, statSync } = await import("node:fs");
function listFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

const files = listFiles(root);
let leaked = false;
for (const p of files) {
  if (p.endsWith("scripts/verify.mjs")) continue;
  const text = readFileSync(p, "utf8");
  if (/APP_USR-|TEST-[0-9a-f-]{8,}|access_token|mercadopago|MercadoPago/i.test(text)) {
    fail("sin tokens Mercado Pago", p);
    leaked = true;
  }
  if (/from ['\"]@opai|opai\/app\/|apps\/web\/src/i.test(text)) {
    fail("sin código OPAI", p);
    leaked = true;
  }
}
if (!leaked) ok("sin tokens Mercado Pago ni código OPAI");

assert("disclaimer constante presente", DISCLAIMER.includes("Dirección del Trabajo") && DISCLAIMER.includes("Previred"));
assert("disclaimer finiquito Inspección", DISCLAIMER_FINIQUITO.includes("Inspección del Trabajo"));

console.log(`\n${passed} ok, ${failed} fail`);
if (failed) process.exit(1);
console.log("PASS");
