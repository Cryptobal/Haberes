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
import { CAUSALES, causalPorId } from "../js/causales.js";
import { parseTrabajadoresCsv } from "../js/csv.js";
import {
  aniosServicio,
  calcularFiniquito,
  calcularFiniquitoCompleto,
  feriadoProporcional,
  vigenciaUnAnioOMas,
} from "../js/finiquito.js";
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

console.log("\nCausales del Código del Trabajo");
const ids159 = CAUSALES.filter((c) => c.articulo === "159").map((c) => c.letra);
assert("Art. 159 letras a–f", ids159.join(",") === "a,b,c,d,e,f", ids159.join(","));
assert(
  "Art. 160 numerales y letras",
  CAUSALES.filter((c) => c.articulo === "160").length === 13 &&
    CAUSALES.some((c) => c.id === "160-1-a") &&
    CAUSALES.some((c) => c.id === "160-1-f") &&
    CAUSALES.some((c) => c.id === "160-4-b") &&
    CAUSALES.some((c) => c.id === "160-7"),
);
assert(
  "Art. 161 necesidades y desahucio",
  Boolean(causalPorId("161-necesidades")?.aplicaIas) &&
    Boolean(causalPorId("161-desahucio")?.aplicaAviso) &&
    causalPorId("159-a")?.aplicaIas === false &&
    causalPorId("160-7")?.aplicaAviso === false,
);
assert(
  "No hay causales inventadas fuera de 159/160/161",
  CAUSALES.every((c) => c.articulo === "159" || c.articulo === "160" || c.articulo === "161"),
);
assert("21 causales oficiales", CAUSALES.length === 21, String(CAUSALES.length));

console.log("\nFiniquito completo (empresa)");
assert("Un año o más: 12 meses", vigenciaUnAnioOMas("2020-01-15", "2021-01-15") === true);
assert("Menos de un año: 8 meses", vigenciaUnAnioOMas("2020-01-15", "2020-09-15") === false);

const full161 = calcularFiniquitoCompleto(
  {
    causal: "161-necesidades",
    ingreso: "2020-01-15",
    termino: "2023-08-20",
    remuneracion: 1_000_000,
    diasMes: 20,
    gratificacionArt50: true,
    diasFeriadoPendiente: 5,
    diasFeriadoProporcional: 10,
    avisoPrevio: false,
  },
  { uf: FALLBACK_UF },
);
assert(
  "Remuneración del mes 20/30",
  full161.remuneracionMes === Math.round((1_000_000 * 20) / 30),
  String(full161.remuneracionMes),
);
assert(
  "Gratificación proporcional usa tope art. 50",
  full161.gratMensual === GRATIFICACION_TOPE &&
    full161.gratificacionMes === Math.round((GRATIFICACION_TOPE * 20) / 30),
  String(full161.gratificacionMes),
);
assert(
  "Partidas obligatorias presentes",
  ["remuneracionMes", "gratificacion", "feriadoPendiente", "feriadoProporcional", "ias", "aviso"].every((k) =>
    full161.partidas.some((p) => p.key === k),
  ),
);
assert("Art. 161 completo incluye IAS y aviso", full161.ias > 0 && full161.aviso > 0);
assert("Feriado pendiente distinto del proporcional", full161.feriadoPendiente > 0 && full161.feriadoProporcional > 0);

const full159 = calcularFiniquitoCompleto(
  {
    causal: "159-b",
    ingreso: "2020-01-15",
    termino: "2023-08-20",
    remuneracion: 1_000_000,
    diasMes: 30,
    diasFeriadoPendiente: 2,
    diasFeriadoProporcional: 3,
    avisoPrevio: false,
  },
  { uf: FALLBACK_UF },
);
assert("Renuncia 159-b sin IAS ni aviso", full159.ias === 0 && full159.aviso === 0 && full159.feriadoPendiente > 0);

const fullCorto = calcularFiniquitoCompleto(
  {
    causal: "161-desahucio",
    ingreso: "2020-01-15",
    termino: "2020-09-15",
    remuneracion: 1_000_000,
    diasMes: 15,
    avisoPrevio: false,
  },
  { uf: FALLBACK_UF },
);
assert("Art. 161 con menos de un año: sin IAS, con aviso", fullCorto.ias === 0 && fullCorto.aviso > 0);

const namedSueldo = calcularSueldo(
  {
    sueldoBase: 1_000_000,
    afp: "modelo",
    salud: "fonasa",
    contrato: "indefinido",
    haberesExtra: [
      { nombre: "Bono producción", monto: 50000, imponible: true },
      { nombre: "Asignación de movilización extra", monto: 10000, imponible: false },
    ],
  },
  { uf: FALLBACK_UF },
);
assert(
  "Haber nombrado imponible entra a AFP",
  namedSueldo.imponible === 1_050_000,
  String(namedSueldo.imponible),
);
assert(
  "Haber nombrado no imponible no entra a AFP y sí al líquido",
  namedSueldo.imponible === 1_050_000 && namedSueldo.liquido === namedSueldo.totalHaberes - namedSueldo.totalDescuentos,
);
assert(
  "Líneas de haberes incluyen el nombre",
  namedSueldo.haberes.some((h) => h.label === "Bono producción" && h.monto === 50000),
);

console.log("\nCSV y RUT");
const csv = parseTrabajadoresCsv(
  "nombre,rut,cargo,sueldo_base,afp,salud,contrato,colacion\nAna,12345678-5,Admin,1000000,modelo,fonasa,indefinido,50000\n",
);
assert("CSV parsea 1 trabajador", csv.length === 1 && csv[0].sueldoBase === 1_000_000);
const csvNamed = parseTrabajadoresCsv(
  readFileSync(join(root, "ejemplos/trabajadores.csv"), "utf8"),
);
assert("CSV ejemplo tiene filas", csvNamed.length >= 2);
assert(
  "CSV ejemplo bonos nombrados imponible y no",
  csvNamed[0].haberesExtra?.length >= 2 &&
    csvNamed[0].haberesExtra[0].imponible === true &&
    csvNamed[0].haberesExtra[1].imponible === false &&
    csvNamed[0].haberesExtra[0].nombre &&
    csvNamed[0].haberesExtra[1].nombre,
  JSON.stringify(csvNamed[0].haberesExtra),
);
assert("RUT 12.345.678-5 válido", validarRut("12.345.678-5"));
assert("DV RUT 12345678", dvRut("12345678") === "5");

console.log("\nXLSX pago masivo y cupo Gratis");
const { writeXlsx, readXlsxFirstSheet } = await import("../js/xlsx.js");
const { xlsxPagoMasivo, xlsxPagoEjemplo, splitRut } = await import("../js/pago.js");
const { puedeEmitir, puedeCargaMasiva, GRATIS_LIMITE } = await import("../js/plan.js");

const xlsxBytes = writeXlsx([
  {
    name: "Haberes",
    rows: [
      ["nombre", "rut", "monto"],
      ["Ana Pérez", "12.345.678-5", 818200],
    ],
  },
]);
assert("xlsx zip PK", xlsxBytes[0] === 0x50 && xlsxBytes[1] === 0x4b);
const round = await readXlsxFirstSheet(xlsxBytes);
assert(
  "xlsx roundtrip",
  round[0]?.[0] === "nombre" && round[1]?.[0] === "Ana Pérez" && String(round[1]?.[2]) === "818200",
  JSON.stringify(round),
);

const pagoBytes = xlsxPagoMasivo({
  trabajadores: [
    {
      nombre: "Ana Pérez",
      rut: "12.345.678-5",
      sueldoBase: 1_000_000,
      afp: "modelo",
      salud: "fonasa",
      contrato: "indefinido",
      banco: "001",
      tipoCuenta: "corriente",
      nroCuenta: "12345678",
      email: "ana@empresa.cl",
    },
  ],
  indicadores: { uf: FALLBACK_UF },
  glosa: "Sueldo agosto 2026",
});
assert("xlsx pago masivo no vacío", pagoBytes.length > 500);
const pagoSheet = await readXlsxFirstSheet(pagoBytes);
assert(
  "xlsx canónico tiene líquido",
  pagoSheet[0]?.[0] === "nombre" &&
    pagoSheet[1]?.[0] === "Ana Pérez" &&
    Number(pagoSheet[1]?.[6]) === 818200 &&
    String(pagoSheet[1]?.[7]).includes("agosto"),
  JSON.stringify(pagoSheet[1]),
);
assert("xlsx ejemplo vacío", xlsxPagoEjemplo().length > 400);
assert("split RUT", splitRut("12.345.678-5").cuerpo === "12345678" && splitRut("12.345.678-5").dv === "5");

const gratisEmp = { plan: "gratis", movimientos: {} };
assert("Gratis permite 1 movimiento", puedeEmitir(gratisEmp, { tipo: "liquidacion", keys: ["a"] }).ok);
assert("Gratis bloquea 2 a la vez", puedeEmitir(gratisEmp, { tipo: "liquidacion", keys: ["a", "b"] }).ok === false);
assert("Gratis bloquea carga masiva", puedeCargaMasiva(gratisEmp).ok === false);
const lleno = {
  plan: "gratis",
  movimientos: {
    [`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`]: Array.from(
      { length: GRATIS_LIMITE },
      (_, i) => ({ tipo: "liquidacion", key: `k${i}` }),
    ),
  },
};
assert("Gratis bloquea el 6º", puedeEmitir(lleno, { tipo: "liquidacion", keys: ["nuevo"] }).ok === false);
assert("Pro ilimitado", puedeEmitir({ plan: "pro" }, { tipo: "liquidacion", keys: ["a", "b", "c"] }).ok);

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
  "js/causales.js",
  "js/finiquito.js",
  "js/indicadores.js",
  "js/csv.js",
  "js/xlsx.js",
  "js/pago.js",
  "js/plan.js",
  "js/storage.js",
  "js/print.js",
  "js/analytics.js",
  "api/reset-request.js",
  "api/reset-confirm.js",
  "api/register.js",
  "api/login.js",
  "api/logout.js",
  "api/me.js",
  "api/_lib.js",
  "api/profile.js",
  "api/logo.js",
  "api/firma.js",
  "api/documento.js",
  "api/_r2.js",
  "api/storage.js",
  "api/_pdf.js",
  "api/_admin.js",
  "api/admin-login.js",
  "api/movimiento.js",
  "sql/001.sql",
  "sql/002.sql",
  "sql/003.sql",
  "sql/004.sql",
  "como.html",
  "precios.html",
  "admin.html",
  "js/theme.js",
  "js/picker.js",
  "reset.html",
  "vercel.json",
  "scripts/verify.mjs",
];
for (const f of required) {
  assert(`existe ${f}`, existsSync(join(root, f)));
}

const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
assert("vercel.json cleanUrls", vercel.cleanUrls === true);
assert(
  "vercel.json headers /admin",
  JSON.stringify(vercel.headers || []).includes("/admin") &&
    JSON.stringify(vercel.headers || []).includes("noindex"),
);
assert(
  "vercel.json 301 /como-funciona → /como",
  Array.isArray(vercel.redirects) &&
    vercel.redirects.some(
      (r) => r.source === "/como-funciona" && r.destination === "/como" && r.permanent === true,
    ),
);

const htmlFiles = [
  "index.html",
  "sueldo.html",
  "finiquito.html",
  "empresa.html",
  "privacidad.html",
  "terminos.html",
  "reset.html",
  "como.html",
  "precios.html",
  "admin.html",
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
  assert(`${f} GTM-PCR596Z2`, /GTM-PCR596Z2/.test(html));
  assert(`${f} carga analytics.js`, /src="js\/analytics\.js"/.test(html));
  assert(`${f} no define GA4 falso`, !/HABERES_GA4\s*=\s*["']G-/.test(html));
  assert(`${f} enlace privacidad`, /href="\/privacidad"/.test(html));
  assert(`${f} enlace términos`, /href="\/terminos"/.test(html));
  assert(
    `${f} crédito lx3.ai`,
    /Proyecto desarrollado por/.test(html) &&
      /href="https:\/\/lx3\.ai"/.test(html) &&
      /mailto:contacto@lx3\.ai/.test(html),
  );
  assert(`${f} sin formulario de consulta laboral`, !/<form[^>][^>]*consulta|consulta laboral<\/(h|label)/i.test(html));
  assert(
    `${f} tema día/noche`,
    /haberes:theme/.test(html) && /data-theme-toggle/.test(html),
  );
}

const robots = readFileSync(join(root, "robots.txt"), "utf8");
assert("robots User-agent *", /User-agent:\s*\*/i.test(robots));
assert("robots Allow /", /Allow:\s*\//.test(robots));
assert("robots Disallow /admin", /Disallow:\s*\/admin/.test(robots));
assert("robots Sitemap", /Sitemap:\s*https:\/\/www\.haberes\.cl\/sitemap\.xml/.test(robots));

const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const expectedLocs = [
  "https://www.haberes.cl/",
  "https://www.haberes.cl/sueldo",
  "https://www.haberes.cl/finiquito",
  "https://www.haberes.cl/empresa",
  "https://www.haberes.cl/como",
  "https://www.haberes.cl/precios",
  "https://www.haberes.cl/privacidad",
  "https://www.haberes.cl/terminos",
];
assert("sitemap 8 URLs clean", expectedLocs.every((u) => locs.includes(u)) && locs.length === 8, locs.join(", "));
assert("sitemap sin admin ni reset", !locs.some((u) => /\/admin|\/reset/.test(u)));
assert("sitemap lastmod 2026-08-16", /<lastmod>2026-08-16<\/lastmod>/.test(sitemap));
assert("sitemap sin .html (cleanUrls)", !locs.some((u) => u.endsWith(".html")));

const analytics = readFileSync(join(root, "js/analytics.js"), "utf8");
assert(
  "analytics.js exige G- no vacío",
  /HABERES_GA4/.test(analytics) && /G-\[A-Z0-9/.test(analytics) && /if\s*\(!id/.test(analytics),
);
assert(
  "index no promete que todo corre en el navegador",
  !/Todo corre en su navegador/i.test(readFileSync(join(root, "index.html"), "utf8")),
);

console.log("\nAPI cuentas (fail closed, Argon2id)");
const prevDb = process.env.DATABASE_URL;
const prevDbUnpooled = process.env.DATABASE_URL_UNPOOLED;
const prevResend = process.env.RESEND_API_KEY;
delete process.env.DATABASE_URL;
delete process.env.DATABASE_URL_UNPOOLED;
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

function mockReq(method, body, ip = "203.0.113.10") {
  return { method, body, headers: { "x-forwarded-for": ip } };
}

const {
  hashPassword,
  verifyPassword,
  MIN_PASSWORD_LENGTH,
  RATE_LIMIT,
  rateLimit,
  SESSION_COOKIE,
  TOKEN_TTL_MS,
} = await import("../api/_lib.js");

assert("clave mínima 10", MIN_PASSWORD_LENGTH === 10, String(MIN_PASSWORD_LENGTH));
assert("rate limit 5 / 15 min", RATE_LIMIT.max === 5 && RATE_LIMIT.windowMs === 15 * 60 * 1000);
assert("reset TTL 30 min", TOKEN_TTL_MS === 30 * 60 * 1000);
assert("cookie de sesión", SESSION_COOKIE === "haberes_session");

const pwd = "tenchars!!";
const h1 = await hashPassword(pwd);
const h2 = await hashPassword(pwd);
assert("hash Argon2id", typeof h1 === "string" && h1.startsWith("$argon2id$"));
assert("parámetros Argon2id", /\$argon2id\$v=19\$m=19456,t=2,p=1\$/.test(h1));
assert("salt único por hash", h1 !== h2);
assert("verify Argon2id ok", (await verifyPassword(pwd, h1)) === true);
assert("verify Argon2id fail", (await verifyPassword("wrong-pass!", h1)) === false);

const rlKey = `verify:${Date.now()}`;
for (let i = 0; i < 5; i += 1) {
  assert(`rateLimit intento ${i + 1}`, rateLimit(rlKey) === true);
}
assert("rateLimit bloquea el 6º", rateLimit(rlKey) === false);

const register = (await import("../api/register.js")).default;
const login = (await import("../api/login.js")).default;
const resetRequest = (await import("../api/reset-request.js")).default;
const resetConfirm = (await import("../api/reset-confirm.js")).default;
const me = (await import("../api/me.js")).default;
const profile = (await import("../api/profile.js")).default;
const logoApi = (await import("../api/logo.js")).default;
const documento = (await import("../api/documento.js")).default;
const adminLogin = (await import("../api/admin-login.js")).default;
const movimientoMod = await import("../api/movimiento.js");
const movimiento = movimientoMod.default;
const { applyMovimientos } = movimientoMod;

const regRes = mockRes();
await register(mockReq("POST", { rut: "12.345.678-5", email: "a@b.cl", razonSocial: "SpA", password: "tenchars!!" }, "203.0.113.21"), regRes);
assert(
  "register 501 sin DATABASE_URL",
  regRes._out.statusCode === 501 && regRes._out.body?.reason === "no_backend",
  JSON.stringify(regRes._out.body),
);

const loginIp = "203.0.113.22";
const loginRes = mockRes();
await login(mockReq("POST", { rut: "12.345.678-5", password: "tenchars!!" }, loginIp), loginRes);
assert(
  "login 501 sin DATABASE_URL",
  loginRes._out.statusCode === 501 && loginRes._out.body?.reason === "no_backend",
  JSON.stringify(loginRes._out.body),
);
for (let i = 0; i < 4; i += 1) {
  await login(mockReq("POST", { rut: "12.345.678-5", password: "tenchars!!" }, loginIp), mockRes());
}
const login429 = mockRes();
await login(mockReq("POST", { rut: "12.345.678-5", password: "tenchars!!" }, loginIp), login429);
assert(
  "login 429 al 6º intento",
  login429._out.statusCode === 429 && login429._out.body?.reason === "rate_limited",
  JSON.stringify(login429._out.body),
);

const reqRes = mockRes();
await resetRequest(mockReq("POST", { rut: "76.123.456-0", email: "a@b.cl" }, "203.0.113.23"), reqRes);
assert(
  "reset-request 501 sin DATABASE_URL",
  reqRes._out.statusCode === 501 && reqRes._out.body?.ok === false && reqRes._out.body?.reason === "no_backend",
  JSON.stringify(reqRes._out.body),
);
const confRes = mockRes();
await resetConfirm(mockReq("POST", { token: "x", newPassword: "tenchars!!" }, "203.0.113.24"), confRes);
assert(
  "reset-confirm 501 sin DATABASE_URL",
  confRes._out.statusCode === 501 && confRes._out.body?.reason === "no_backend",
  JSON.stringify(confRes._out.body),
);
const meRes = mockRes();
await me({ method: "GET", headers: {} }, meRes);
assert(
  "me 501 sin DATABASE_URL",
  meRes._out.statusCode === 501 && meRes._out.body?.reason === "no_backend",
  JSON.stringify(meRes._out.body),
);

const profileRes = mockRes();
await profile({ method: "GET", headers: {} }, profileRes);
assert(
  "profile 501 sin DATABASE_URL",
  profileRes._out.statusCode === 501 && profileRes._out.body?.reason === "no_backend",
  JSON.stringify(profileRes._out.body),
);
const logoRes = mockRes();
await logoApi({ method: "GET", headers: {} }, logoRes);
assert(
  "logo 501 sin DATABASE_URL",
  logoRes._out.statusCode === 501 && logoRes._out.body?.reason === "no_backend",
  JSON.stringify(logoRes._out.body),
);
const docRes = mockRes();
await documento(mockReq("POST", { tipo: "finiquito" }, "203.0.113.26"), docRes);
assert(
  "documento 501 sin DATABASE_URL",
  docRes._out.statusCode === 501 && docRes._out.body?.reason === "no_backend",
  JSON.stringify(docRes._out.body),
);
const movRes = mockRes();
await movimiento(mockReq("POST", { tipo: "liquidacion", keys: ["a"] }, "203.0.113.27"), movRes);
assert(
  "movimiento 501 sin DATABASE_URL",
  movRes._out.statusCode === 501 && movRes._out.body?.reason === "no_backend",
  JSON.stringify(movRes._out.body),
);

function mockMovClient(existingKeys = []) {
  const { periodoMes } = movimientoMod;
  const periodo = periodoMes();
  const rows = existingKeys.map((key) => ["id", "co1", "liquidacion", key, periodo]);
  let inserts = 0;
  return {
    get inserts() {
      return inserts;
    },
    async query(sql, params = []) {
      if (/SELECT COUNT/.test(sql)) return { rows: [{ n: rows.length }] };
      if (/SELECT 1 FROM movimientos/.test(sql)) {
        const found = rows.some(
          (r) => r[1] === params[0] && r[4] === params[1] && r[2] === params[2] && r[3] === params[3],
        );
        return { rowCount: found ? 1 : 0, rows: found ? [{}] : [] };
      }
      if (/INSERT INTO movimientos/.test(sql)) {
        inserts += 1;
        rows.push(params);
        return { rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}
const dryClient = mockMovClient();
const dry = await applyMovimientos(dryClient, { id: "co1", plan: "gratis" }, {
  tipo: "liquidacion",
  keys: ["a"],
  commit: false,
});
assert(
  "applyMovimientos dry-run no inserta",
  dry.status === 200 && dry.body?.ok === true && dryClient.inserts === 0,
  JSON.stringify({ status: dry.status, inserts: dryClient.inserts }),
);
const commitClient = mockMovClient();
const committed = await applyMovimientos(commitClient, { id: "co1", plan: "gratis" }, {
  tipo: "liquidacion",
  keys: ["a"],
  commit: true,
});
assert(
  "applyMovimientos commit inserta una vez",
  committed.status === 200 && committed.body?.movimientosMes === 1 && commitClient.inserts === 1,
  JSON.stringify(committed.body),
);

const prevAdminE = process.env.ADMIN_EMAILS;
const prevAdminH = process.env.ADMIN_PASSWORD_HASH;
delete process.env.ADMIN_EMAILS;
delete process.env.ADMIN_PASSWORD_HASH;
const adminRes = mockRes();
await adminLogin(mockReq("POST", { email: "ops@example.com", password: "tenchars!!" }, "203.0.113.41"), adminRes);
assert(
  "admin-login 503 sin env",
  adminRes._out.statusCode === 503 && adminRes._out.body?.reason === "admin_unavailable",
  JSON.stringify(adminRes._out.body),
);
if (prevAdminE !== undefined) process.env.ADMIN_EMAILS = prevAdminE;
else delete process.env.ADMIN_EMAILS;
if (prevAdminH !== undefined) process.env.ADMIN_PASSWORD_HASH = prevAdminH;
else delete process.env.ADMIN_PASSWORD_HASH;

const R2_ENV_KEYS = [
  "R2_ACCOUNT_ID",
  "CLOUDFLARE_ACCOUNT_ID",
  "CF_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "AWS_ACCESS_KEY_ID",
  "R2_ACCESS_KEY",
  "R2_SECRET_ACCESS_KEY",
  "AWS_SECRET_ACCESS_KEY",
  "R2_SECRET",
  "R2_BUCKET",
  "R2_BUCKET_NAME",
  "BUCKET_NAME",
];
const prevR2 = Object.fromEntries(R2_ENV_KEYS.map((k) => [k, process.env[k]]));
function restoreR2Env() {
  for (const k of R2_ENV_KEYS) {
    if (prevR2[k] === undefined) delete process.env[k];
    else process.env[k] = prevR2[k];
  }
}
function clearR2Env() {
  for (const k of R2_ENV_KEYS) delete process.env[k];
}

const { hasR2, r2Config } = await import("../api/_r2.js");
const storageApi = (await import("../api/storage.js")).default;
clearR2Env();
assert("hasR2 false sin env", hasR2() === false);
assert("r2Config null sin env", r2Config() === null);

const storageOff = mockRes();
await storageApi({ method: "GET", headers: {} }, storageOff);
assert(
  "GET /api/storage false sin env",
  storageOff._out.statusCode === 200 &&
    storageOff._out.body?.ok === true &&
    storageOff._out.body?.storage === false &&
    Object.keys(storageOff._out.body).sort().join(",") === "ok,storage",
  Object.keys(storageOff._out.body || {}).join(","),
);
const storagePost = mockRes();
await storageApi(mockReq("POST", {}), storagePost);
assert(
  "POST /api/storage 405",
  storagePost._out.statusCode === 405 && storagePost._out.body?.reason === "method_not_allowed",
);

process.env.CLOUDFLARE_ACCOUNT_ID = "acct-cf";
process.env.AWS_ACCESS_KEY_ID = "key-aws";
process.env.AWS_SECRET_ACCESS_KEY = "secret-aws";
process.env.BUCKET_NAME = "haberes";
assert("hasR2 true con alias Cloudflare/AWS", hasR2() === true);
const aliasCfg = r2Config();
assert(
  "r2Config usa alias",
  aliasCfg?.accountId === "acct-cf" &&
    aliasCfg?.accessKeyId === "key-aws" &&
    aliasCfg?.secretAccessKey === "secret-aws" &&
    aliasCfg?.bucket === "haberes",
);

process.env.R2_ACCOUNT_ID = "acct-r2";
process.env.R2_ACCESS_KEY_ID = "key-r2";
process.env.R2_SECRET_ACCESS_KEY = "secret-r2";
process.env.R2_BUCKET = "haberes-r2";
const canonCfg = r2Config();
assert(
  "r2Config canónico gana al alias",
  canonCfg?.accountId === "acct-r2" &&
    canonCfg?.accessKeyId === "key-r2" &&
    canonCfg?.secretAccessKey === "secret-r2" &&
    canonCfg?.bucket === "haberes-r2",
);

clearR2Env();
process.env.R2_ACCOUNT_ID = "   ";
process.env.CF_ACCOUNT_ID = "acct-cf2";
process.env.R2_ACCESS_KEY = "key-short";
process.env.R2_SECRET = "secret-short";
process.env.R2_BUCKET_NAME = "haberes";
const blankCfg = r2Config();
assert(
  "r2Config salta vacíos y usa el siguiente",
  blankCfg?.accountId === "acct-cf2" &&
    blankCfg?.accessKeyId === "key-short" &&
    blankCfg?.secretAccessKey === "secret-short" &&
    blankCfg?.bucket === "haberes",
);

const storageOn = mockRes();
await storageApi({ method: "GET", headers: {} }, storageOn);
assert(
  "GET /api/storage true con alias",
  storageOn._out.statusCode === 200 &&
    storageOn._out.body?.ok === true &&
    storageOn._out.body?.storage === true &&
    Object.keys(storageOn._out.body).sort().join(",") === "ok,storage" &&
    !Object.values(storageOn._out.body).some((v) => typeof v === "string" && /acct-|key-|secret-/.test(v)),
);
restoreR2Env();

const resetIp = "203.0.113.25";
for (let i = 0; i < 5; i += 1) {
  await resetRequest(mockReq("POST", { rut: "12.345.678-5", email: "a@b.cl" }, resetIp), mockRes());
}
const reset429 = mockRes();
await resetRequest(mockReq("POST", { rut: "12.345.678-5", email: "a@b.cl" }, resetIp), reset429);
assert(
  "reset-request 429 al 6º intento",
  reset429._out.statusCode === 429 && reset429._out.body?.reason === "rate_limited",
  JSON.stringify(reset429._out.body),
);

if (prevDb !== undefined) process.env.DATABASE_URL = prevDb;
else delete process.env.DATABASE_URL;
if (prevDbUnpooled !== undefined) process.env.DATABASE_URL_UNPOOLED = prevDbUnpooled;
else delete process.env.DATABASE_URL_UNPOOLED;
if (prevResend !== undefined) process.env.RESEND_API_KEY = prevResend;
else delete process.env.RESEND_API_KEY;

const apiFiles = [
  "api/_lib.js",
  "api/_r2.js",
  "api/storage.js",
  "api/_pdf.js",
  "api/register.js",
  "api/login.js",
  "api/logout.js",
  "api/me.js",
  "api/profile.js",
  "api/logo.js",
  "api/firma.js",
  "api/_asset.js",
  "api/documento.js",
  "api/reset-request.js",
  "api/reset-confirm.js",
  "api/_admin.js",
  "api/admin-login.js",
  "api/admin-logout.js",
  "api/admin-me.js",
  "api/admin-companies.js",
  "api/movimiento.js",
];
for (const f of apiFiles) {
  const src = readFileSync(join(root, f), "utf8");
  assert(
    `${f} no loguea secretos`,
    !/console\.(log|info|debug|warn|error)\([^)]*(token|clave|password|email|rut|hash)/i.test(src),
  );
}

const libSrc = readFileSync(join(root, "api/_lib.js"), "utf8");
assert("sesión HttpOnly Secure SameSite=Lax", /HttpOnly/.test(libSrc) && /Secure/.test(libSrc) && /SameSite=Lax/.test(libSrc));
assert("sin scrypt para claves", !/scrypt/i.test(libSrc));
assert("hashPassword usa argon2", /argon2/i.test(libSrc) && /Argon2id/.test(libSrc));
assert("schema 004 en _lib", /004\.sql/.test(libSrc) && /INLINE_SCHEMA_004/.test(libSrc));

const sql = readFileSync(join(root, "sql/001.sql"), "utf8");
assert(
  "sql/001.sql tablas",
  /CREATE TABLE IF NOT EXISTS companies/i.test(sql) &&
    /password_reset_tokens/i.test(sql) &&
    /CREATE TABLE IF NOT EXISTS sessions/i.test(sql) &&
    /password_hash/.test(sql),
);
assert("sql/001.sql sin secretos", !/postgres(ql)?:\/\//i.test(sql) && !/DATABASE_URL\s*=/.test(sql));
const sql2 = readFileSync(join(root, "sql/002.sql"), "utf8");
assert(
  "sql/002.sql perfil y clave de objeto",
  /giro/.test(sql2) &&
    /direccion/.test(sql2) &&
    /logo_key/.test(sql2) &&
    /logo_content_type/.test(sql2) &&
    /documentos/.test(sql2) &&
    /object_key/.test(sql2) &&
    !/BYTEA/i.test(sql2) &&
    !/bytea/i.test(sql2),
);
assert("sql/002.sql sin secretos", !/postgres(ql)?:\/\//i.test(sql2) && !/DATABASE_URL\s*=/.test(sql2));
assert("sql/002.sql no rompe cuentas", /ADD COLUMN IF NOT EXISTS/i.test(sql2));
const sql3 = readFileSync(join(root, "sql/003.sql"), "utf8");
assert(
  "sql/003.sql firma, disabled_at y admin",
  /disabled_at/.test(sql3) &&
    /firma_key/.test(sql3) &&
    /firma_content_type/.test(sql3) &&
    /admin_sessions/.test(sql3) &&
    /ADD COLUMN IF NOT EXISTS/i.test(sql3),
);
assert("sql/003.sql sin secretos", !/postgres(ql)?:\/\//i.test(sql3) && !/DATABASE_URL\s*=/.test(sql3));
const sql4 = readFileSync(join(root, "sql/004.sql"), "utf8");
assert(
  "sql/004.sql plan y movimientos",
  /plan/.test(sql4) && /movimientos/.test(sql4) && /ADD COLUMN IF NOT EXISTS/i.test(sql4),
);
assert("sql/004.sql sin secretos", !/postgres(ql)?:\/\//i.test(sql4) && !/DATABASE_URL\s*=/.test(sql4));
assert("sin schema prisma inventado", !existsSync(join(root, "prisma")));
assert(
  "empresa.html olvido honesto",
  /Olvidé mi clave/.test(readFileSync(join(root, "empresa.html"), "utf8")) &&
    /no se puede enviar por correo/i.test(readFileSync(join(root, "empresa.html"), "utf8")),
);
assert(
  "empresa.html POST register/login",
  /\/api\/register/.test(readFileSync(join(root, "js/app-empresa.js"), "utf8")) &&
    /\/api\/login/.test(readFileSync(join(root, "js/app-empresa.js"), "utf8")),
);
const empHtml = readFileSync(join(root, "empresa.html"), "utf8");
const empJs = readFileSync(join(root, "js/app-empresa.js"), "utf8");
assert("empresa.html sin input type=date", !/<input[^>]*type="date"/i.test(empHtml));
assert(
  "empresa.html sin select nativo de trabajador, periodo o causal",
  !/<select\b/i.test(empHtml),
);
assert(
  "empresa.html pickers custom",
  /id="pickTrabajadores"/.test(empHtml) &&
    /id="pickPeriodo"/.test(empHtml) &&
    /id="pickCausal"/.test(empHtml),
);
assert(
  "empresa.html workspace con pestañas",
  /data-tab="empresa"/.test(empHtml) &&
    /data-tab="trabajadores"/.test(empHtml) &&
    /data-tab="documentos"/.test(empHtml),
);
assert("empresa.html vista previa iframe", /id="docPreviewFrame"/.test(empHtml) && /id="panelPreview"/.test(empHtml));
assert("empresa.html giro y dirección", /id="perfilGiro"/.test(empHtml) && /id="perfilDireccion"/.test(empHtml));
assert("empresa.html logo file", /id="logoFile"/.test(empHtml));
assert("empresa.html firma file", /id="firmaFile"/.test(empHtml));
assert("empresa.html Cargar CSV y Descargar ejemplo", /Cargar CSV/.test(empHtml) && /Descargar ejemplo/.test(empHtml) && /btn-row/.test(empHtml));
assert("empresa.html pago masivo XLSX", /btnPagoXlsx/.test(empHtml) && /btnPagoEjemplo/.test(empHtml));
assert("empresa.html haberes nombrados", /id="emHaberes"/.test(empHtml) && /Añadir haber/.test(empHtml));
assert("empresa.html feriado pendiente y proporcional", /finFeriadoPend/.test(empHtml) && /finFeriadoProp/.test(empHtml));
assert("app-empresa no usa window.open", !/window\.open/.test(empJs));
assert("app-empresa no usa window.confirm", !/window\.confirm/.test(empJs) && /confirmDialog/.test(empJs));
assert("app-empresa vista previa srcdoc", /mostrarVistaPrevia/.test(empJs) && /srcdoc/.test(readFileSync(join(root, "js/print.js"), "utf8")));
assert(
  "app-empresa perfil, documento, logo y firma",
  /\/api\/profile/.test(empJs) && /\/api\/documento/.test(empJs) && /\/api\/logo/.test(empJs) && /\/api\/firma/.test(empJs),
);
assert(
  "app-empresa movimientos y xlsx de pago",
  /registrarMovimientosRemoto/.test(empJs) &&
    /xlsxPagoMasivo/.test(empJs) &&
    /\/api\/movimiento/.test(readFileSync(join(root, "js/plan.js"), "utf8")),
);
const bajarPdfSrc = empJs.slice(empJs.indexOf("async function bajarPdf"), empJs.indexOf('el("btnPdfLiquidacion")'));
assert(
  "Descargar PDF no cuenta movimiento si falla el almacenamiento",
  /no_storage/.test(bajarPdfSrc) &&
    /el almacenamiento no está configurado/.test(bajarPdfSrc) &&
    bajarPdfSrc.indexOf("apiDownloadPdf") < bajarPdfSrc.indexOf("consumirMovimientos") &&
    bajarPdfSrc.indexOf("if (!blob)") < bajarPdfSrc.indexOf("consumirMovimientos") &&
    bajarPdfSrc.indexOf("consumirMovimientos") > bajarPdfSrc.indexOf("return;"),
);
const docSrc = readFileSync(join(root, "api/documento.js"), "utf8");
assert(
  "documento no_storage antes de insertar movimientos",
  /if \(!hasR2\(\)\) return noStorage/.test(docSrc) &&
    docSrc.indexOf("if (!hasR2()) return noStorage(res)") < docSrc.indexOf("commit: true") &&
    docSrc.indexOf("await r2Put") < docSrc.indexOf("commit: true") &&
    docSrc.indexOf("commit: false") < docSrc.indexOf("await r2Put") &&
    docSrc.indexOf("commit: false") > docSrc.indexOf("if (!hasR2()) return noStorage(res)"),
);
assert("app-empresa editar y eliminar trabajador", /deleteTrabajador/.test(empJs) && /updateTrabajador/.test(empJs));
assert("app-empresa CSV upsert por RUT", /upsertTrabajadores/.test(empJs));
assert(
  "finiquito público sin date/select nativo",
  !/<input[^>]*type="date"/i.test(readFileSync(join(root, "finiquito.html"), "utf8")) &&
    !/<select\b/i.test(readFileSync(join(root, "finiquito.html"), "utf8")) &&
    /id="pickCausal"/.test(readFileSync(join(root, "finiquito.html"), "utf8")),
);
assert(
  "sueldo público sin select nativo",
  !/<select\b/i.test(readFileSync(join(root, "sueldo.html"), "utf8")) &&
    /id="pickAfp"/.test(readFileSync(join(root, "sueldo.html"), "utf8")) &&
    /id="pickContrato"/.test(readFileSync(join(root, "sueldo.html"), "utf8")) &&
    /id="pickSalud"/.test(readFileSync(join(root, "sueldo.html"), "utf8")),
);
const pickerSrc = readFileSync(join(root, "js/picker.js"), "utf8");
const pickerInit = (pickerSrc.match(/root\.innerHTML = `([\s\S]*?)`;/) || [])[1] || "";
assert(
  "picker cerrado por defecto, sin search en el layout",
  /picker-panel" hidden/.test(pickerInit) &&
    !/picker-search/.test(pickerInit) &&
    /unmountSearch/.test(pickerSrc) &&
    /closeAllPickers/.test(pickerSrc) &&
    /Escape/.test(pickerSrc),
);
assert(
  "css panel picker oculto de verdad",
  /picker-panel\[hidden\]/.test(readFileSync(join(root, "css/app.css"), "utf8")) &&
    /display:\s*none\s*!important/.test(readFileSync(join(root, "css/app.css"), "utf8")),
);
assert(
  "css paneles día/mes/año con min-width, sin display flex en el bloque base",
  /\.date-selects\s+\.picker-panel\s*\{[^}]*min-width:\s*max\(100%,\s*12\.5rem\)/.test(
    readFileSync(join(root, "css/app.css"), "utf8"),
  ) &&
    !/\.date-selects\s+\.picker-panel\s*\{[^}]*display:\s*flex/.test(
      readFileSync(join(root, "css/app.css"), "utf8"),
    ),
);
assert("admin.html noindex", /noindex/.test(readFileSync(join(root, "admin.html"), "utf8")));
assert(
  "admin sin hashes en la UI",
  !/\$argon2/i.test(readFileSync(join(root, "admin.html"), "utf8")) &&
    !/\$argon2/i.test(readFileSync(join(root, "js/app-admin.js"), "utf8")),
);
assert("cookie admin haberes_admin", /haberes_admin/.test(readFileSync(join(root, "api/_admin.js"), "utf8")));
assert(
  "admin sin clave por defecto",
  !/changeme|admin123|haberes-admin|DEFAULT_PASSWORD/i.test(readFileSync(join(root, "api/_admin.js"), "utf8")),
);
assert(
  "precios: Gratis 5 movimientos y Pro 14990, sin cobro con tarjeta",
  /Gratis/.test(readFileSync(join(root, "precios.html"), "utf8")) &&
    /14\.990/.test(readFileSync(join(root, "precios.html"), "utf8")) &&
    /5 movimientos/i.test(readFileSync(join(root, "precios.html"), "utf8")) &&
    /CSV\/XLSX/.test(readFileSync(join(root, "precios.html"), "utf8")) &&
    !/a[uú]n no se cobra/i.test(readFileSync(join(root, "precios.html"), "utf8")) &&
    !/mercadopago|Mercado Pago/i.test(readFileSync(join(root, "precios.html"), "utf8")),
);
const css = readFileSync(join(root, "css/app.css"), "utf8");
assert(
  "css radios recortados, no absolute sueltos",
  /\.seg label \{[\s\S]*position:\s*relative/.test(css) &&
    /clip-path:\s*inset\(50%\)/.test(css) &&
    !/\.seg input \{\s*position:\s*absolute;\s*opacity:\s*0/.test(css),
);
assert(
  "css --on-ink crema de día y verde de noche",
  /:root\s*\{[\s\S]*?--on-ink:\s*#f6f4ef/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--on-ink:\s*#12382c/.test(css),
);
assert(
  "css texto sobre --ink usa --on-ink",
  /\.btn\s*\{[\s\S]*?color:\s*var\(--on-ink\)/.test(css) &&
    /\.btn:hover\s*\{[\s\S]*?color:\s*var\(--on-ink\)/.test(css) &&
    /\.seg input:checked \+ span[\s\S]*?color:\s*var\(--on-ink\)/.test(css) &&
    /\.steps li::before[\s\S]*?color:\s*var\(--on-ink\)/.test(css) &&
    /\.ws-tab\[aria-selected="true"\][\s\S]*?color:\s*var\(--on-ink\)/.test(css),
);
assert("css cream #f6f4ef solo en el token --on-ink", (css.match(/#f6f4ef/g) || []).length === 1);
assert(
  "css --warn-line cálido, notice sin negro",
  /:root\s*\{[\s\S]*?--warn-line:/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--warn-line:\s*#c4a35a/.test(css) &&
    /\.notice\s*\{[\s\S]*?border:\s*1px solid var\(--warn-line\)/.test(css) &&
    !/\.notice\s*\{[^}]*#000/.test(css),
);
assert(
  "css noche --line y --line-strong más claros que el papel",
  /html\[data-theme="night"\]\s*\{[\s\S]*?--line:\s*#5a6b66/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--line-strong:\s*#6e827c/.test(css),
);
assert(
  "css picker elevado y opción seleccionada obvia de noche",
  /\.picker-panel\s*\{[\s\S]*?background:\s*var\(--surface-2\)/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--surface-2:\s*#222b28/.test(css) &&
    /\.picker-option\[aria-selected="true"\]/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--option-on-bg:\s*var\(--ink\)/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--option-on-fg:\s*var\(--on-ink\)/.test(css),
);
assert("css dos columnas desde 900px", /@media \(min-width: 900px\)/.test(css));
assert(
  "index y como describen Gratis/Pro",
  /5 movimientos/i.test(readFileSync(join(root, "index.html"), "utf8")) &&
    /14\.990/.test(readFileSync(join(root, "index.html"), "utf8")) &&
    /5 movimientos/i.test(readFileSync(join(root, "como.html"), "utf8")),
);
const r2src = readFileSync(join(root, "api/_r2.js"), "utf8");
assert("R2 sin CORS público", !/Access-Control-Allow-Origin/i.test(r2src) && !/r2\.dev/.test(r2src));
assert("R2 lee solo process.env", /R2_ACCOUNT_ID/.test(r2src) && /process\.env/.test(r2src));
assert("R2 no imprime secretos", !/console\.(log|info|debug|warn|error)/.test(r2src));
assert(
  "R2 acepta alias Cloudflare/AWS",
  /CLOUDFLARE_ACCOUNT_ID/.test(r2src) &&
    /CF_ACCOUNT_ID/.test(r2src) &&
    /AWS_ACCESS_KEY_ID/.test(r2src) &&
    /R2_ACCESS_KEY/.test(r2src) &&
    /AWS_SECRET_ACCESS_KEY/.test(r2src) &&
    /R2_SECRET/.test(r2src) &&
    /R2_BUCKET_NAME/.test(r2src) &&
    /BUCKET_NAME/.test(r2src),
);
const storageSrc = readFileSync(join(root, "api/storage.js"), "utf8");
assert(
  "storage no revela variables",
  /hasR2/.test(storageSrc) &&
    !/missing|R2_ACCOUNT_ID|CLOUDFLARE|AWS_/.test(storageSrc) &&
    !/console\./.test(storageSrc),
);
const meSrc = readFileSync(join(root, "api/me.js"), "utf8");
assert("me incluye storage boolean", /storage:\s*hasR2\(\)/.test(meSrc));
const adminMeSrc = readFileSync(join(root, "api/admin-me.js"), "utf8");
assert("admin-me incluye storage boolean", /storage:\s*hasR2\(\)/.test(adminMeSrc));
assert(
  "reset.html pide newPassword",
  /newPassword/.test(readFileSync(join(root, "js/app-reset.js"), "utf8")) &&
    /\/api\/reset-confirm/.test(readFileSync(join(root, "js/app-reset.js"), "utf8")),
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
  if (/postgres(ql)?:\/\/[^\s"'`]+/i.test(text) || /DATABASE_URL\s*=\s*\S+/.test(text)) {
    fail("sin cadenas de conexión", p);
    leaked = true;
  }
  if (/ADMIN_PASSWORD_HASH\s*=\s*['"]?\$argon2/.test(text)) {
    fail("sin hash de admin en git", p);
    leaked = true;
  }
}
if (!leaked) ok("sin tokens Mercado Pago ni código OPAI");

assert("disclaimer constante presente", DISCLAIMER.includes("Dirección del Trabajo") && DISCLAIMER.includes("Previred"));
assert("disclaimer finiquito Inspección", DISCLAIMER_FINIQUITO.includes("Inspección del Trabajo"));

console.log(`\n${passed} ok, ${failed} fail`);
if (failed) process.exit(1);
console.log("PASS");
