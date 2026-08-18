#!/usr/bin/env node
/**
 * Verificación de cifras oficiales y de la estructura del sitio Haberes.
 * Ejecutar: node scripts/verify.mjs
 */
import { readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync, statSync } from "node:fs";
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
  TEXTO_LEGAL_MAX,
  TOPE_AFP_SALUD_UF,
  TOPE_CESANTIA_UF,
  resumirTextoLegal,
} from "../js/constants.js";
import { CAUSALES, causalPorId } from "../js/causales.js";
import { parseNovedadesCsv, parseTrabajadoresCsv } from "../js/csv.js";
import {
  aniosServicio,
  calcularFiniquito,
  calcularFiniquitoCompleto,
  feriadoProporcional,
  vigenciaUnAnioOMas,
} from "../js/finiquito.js";
import {
  diasDelPeriodo,
  inputDesdeFichaYNovedades,
  proporcional,
  validarArt58,
} from "../js/novedades.js";
import {
  calcularIusc,
  calcularSueldo,
  gratificacionArt50,
  tasaAfp,
  valorHoraExtra,
} from "../js/sueldo.js";
import { clp, dvRut, validarRut } from "../js/format.js";
import {
  LRE_AFP,
  LRE_COLUMNAS,
  LRE_REGIONES,
  LRE_SALUD,
  codificarAnsi,
  codigoJornada,
  fechaParaLre,
  generarLre,
  nombreArchivoLre,
  rutParaLre,
} from "../js/lre.js";
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

console.log("No regresión · mes completo sin novedades");
{
  const csvNamed0 = parseTrabajadoresCsv(readFileSync(join(root, "ejemplos/trabajadores.csv"), "utf8"));
  const liqs0 = csvNamed0.map((t) => calcularSueldo(t, { uf: FALLBACK_UF }).liquido);
  assert(
    "No regresión: Ana/Luis/Camila sin novedades → 988656 / 988031 / 1570949",
    liqs0[0] === 988656 && liqs0[1] === 988031 && liqs0[2] === 1570949,
    JSON.stringify(liqs0),
  );
}

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

const homeCtrl = calcularSueldo(
  {
    sueldoBase: 1_200_000,
    afp: "modelo",
    salud: "fonasa",
    contrato: "indefinido",
    gratificacionArt50: true,
  },
  { uf: FALLBACK_UF },
);
assert("control 1.200.000 gratificación 219115", homeCtrl.gratificacion === 219115, String(homeCtrl.gratificacion));
assert("control 1.200.000 imponible 1419115", homeCtrl.imponible === 1_419_115, String(homeCtrl.imponible));
assert("control 1.200.000 AFP 150142", homeCtrl.afp.monto === 150142, String(homeCtrl.afp.monto));
assert("control 1.200.000 salud 99338", homeCtrl.salud.monto === 99338, String(homeCtrl.salud.monto));
assert("control 1.200.000 cesantía 8515", homeCtrl.cesantia.monto === 8515, String(homeCtrl.cesantia.monto));
assert("control 1.200.000 base 1161120", homeCtrl.baseTributable === 1_161_120, String(homeCtrl.baseTributable));
assert("control 1.200.000 IUSC 7754", homeCtrl.iusc === 7754, String(homeCtrl.iusc));
assert("control 1.200.000 líquido 1153366", homeCtrl.liquido === 1_153_366, String(homeCtrl.liquido));

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

const f161fer = calcularFiniquito(
  {
    articulo: "161",
    ingreso: "2020-01-15",
    termino: "2023-08-20",
    remuneracion: 1_000_000,
    avisoPrevio: true,
    diasFeriadoPendiente: 5,
    diasFeriadoProporcional: 10,
    otros: 50_000,
  },
  { uf: FALLBACK_UF },
);
assert(
  "Público desglosa feriado pendiente, proporcional y otros",
  f161fer.feriadoPendiente === Math.round((5 * 1_000_000) / 30) &&
    f161fer.feriadoProporcional === Math.round((10 * 1_000_000) / 30) &&
    f161fer.feriado === f161fer.feriadoPendiente + f161fer.feriadoProporcional &&
    f161fer.otros === 50_000 &&
    f161fer.aviso === 0,
);

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
{
  const { CSV_CABECERA } = await import("../js/csv.js");
  const { readXlsxFirstSheet: readXlsxSheet } = await import("../js/xlsx.js");
  const publicado = readFileSync(join(root, "ejemplos/trabajadores.csv"), "utf8");
  const headerPub = publicado.trim().split(/\r?\n/)[0];
  assert("CSV ejemplo encabezado = CSV_CABECERA", headerPub === CSV_CABECERA, headerPub);
  assert(
    "CSV ejemplo fechaIngreso y jornada",
    csvNamed.length === 3 &&
      csvNamed.every((t) => t.fechaIngreso && t.jornada === 42),
    JSON.stringify(csvNamed.map((t) => ({ f: t.fechaIngreso, j: t.jornada }))),
  );
  const liqs = csvNamed.map((t) => calcularSueldo(t, { uf: FALLBACK_UF }).liquido);
  assert(
    "CSV ejemplo líquidos Ana/Luis/Camila",
    liqs[0] === 988656 && liqs[1] === 988031 && liqs[2] === 1570949,
    JSON.stringify(liqs),
  );
  const xlsxEj = await readXlsxSheet(
    new Uint8Array(readFileSync(join(root, "ejemplos/trabajadores.xlsx"))),
  );
  const fromXlsx = parseTrabajadoresCsv(
    xlsxEj.map((row) => row.join(",")).join("\n"),
  );
  assert(
    "XLSX ejemplo misma nómina que CSV",
    fromXlsx.length === 3 &&
      fromXlsx[0].nombre === csvNamed[0].nombre &&
      fromXlsx[2].nombre === csvNamed[2].nombre,
  );
}
assert("RUT 12.345.678-5 válido", validarRut("12.345.678-5"));
assert("DV RUT 12345678", dvRut("12345678") === "5");

console.log("\nXLSX pago masivo y cupo Gratis");
const { writeXlsx, readXlsxFirstSheet } = await import("../js/xlsx.js");
const { xlsxPagoMasivo, xlsxPagoEjemplo, splitRut } = await import("../js/pago.js");
const { puedeEmitir, puedeCargaMasiva, GRATIS_LIMITE, isPro } = await import("../js/plan.js");

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
assert("isPro respeta vigencia", isPro({ plan: "pro", planUntil: "2099-01-01T00:00:00Z" }) === true);
assert("isPro vencido es Gratis", isPro({ plan: "pro", planUntil: "2000-01-01T00:00:00Z" }) === false);

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
  "favicon.ico",
  "favicon.svg",
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
  "api/_admin-ops.js",
  "api/_ga4.js",
  "api/admin-login.js",
  "api/admin-producto.js",
  "api/admin-trafico.js",
  "api/movimiento.js",
  "sql/001.sql",
  "sql/002.sql",
  "sql/003.sql",
  "sql/004.sql",
  "sql/005.sql",
  "sql/007.sql",
  "sql/008.sql",
  "como.html",
  "precios.html",
  "admin.html",
  "js/theme.js",
  "js/picker.js",
  "js/checkout.js",
  "js/app-precios.js",
  "api/checkout.js",
  "api/mp-webhook.js",
  "api/_mp.js",
  "api/flow-webhook.js",
  "api/_flow.js",
  "api/sitemap.js",
  "api/_sitemap.js",
  ".vercelignore",
  "js/ui.js",
  "js/overlay.js",
  "reset.html",
  "vercel.json",
  "scripts/verify.mjs",
];
for (const f of required) {
  assert(`existe ${f}`, existsSync(join(root, f)));
}

const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
assert("vercel.json cleanUrls", vercel.cleanUrls === true);
assert("vercel.json trailingSlash false", vercel.trailingSlash === false);
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
assert(
  "vercel.json no redirige /guias al home",
  Array.isArray(vercel.redirects) &&
    !vercel.redirects.some((r) => r.source === "/guias" && r.destination === "/"),
);
assert(
  "vercel.json rewrite /sitemap.xml → /api/sitemap",
  Array.isArray(vercel.rewrites) &&
    vercel.rewrites.some((r) => r.source === "/sitemap.xml" && r.destination === "/api/sitemap"),
);
assert(
  "vercel.json rewrite /sitemap → /api/sitemap",
  Array.isArray(vercel.rewrites) &&
    vercel.rewrites.some((r) => r.source === "/sitemap" && r.destination === "/api/sitemap"),
);
assert(
  "vercel.json Content-Type sitemap text/xml",
  JSON.stringify(vercel.headers || []).includes("/sitemap.xml") &&
    JSON.stringify(vercel.headers || []).includes("text/xml; charset=utf-8"),
);
const vercelIgnore = readFileSync(join(root, ".vercelignore"), "utf8");
assert(
  ".vercelignore excluye sitemap.xml estático",
  /^\s*sitemap\.xml\s*$/m.test(vercelIgnore),
);
assert(
  ".gitignore excluye /sitemap.xml",
  /^\s*\/sitemap\.xml\s*$/m.test(readFileSync(join(root, ".gitignore"), "utf8")),
);
assert("sitemap.xml no está en la raíz", !existsSync(join(root, "sitemap.xml")));

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
    `${f} disclaimer legal / no DT / no Previred`,
    /Documento generado por Haberes/.test(html) &&
      /Direcci[oó]n del Trabajo/i.test(html) &&
      /Previred/i.test(html) &&
      /asesor[ií]a legal/i.test(html) &&
      !/inteligencia artificial/i.test(html) &&
      !/generada por IA/i.test(html) &&
      !/Estimaci[oó]n con IA/i.test(html) &&
      !/estimaci[oó]n de software/i.test(html),
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
  assert(`${f} toggle sol/luna`, /ic-sun/.test(html) && /ic-moon/.test(html));
  assert(`${f} sin prefers-color-scheme`, !/prefers-color-scheme/.test(html));
  assert(
    `${f} hamburguesa y cajón`,
    /data-nav-burger/.test(html) &&
      /id="navDrawer"/.test(html) &&
      /data-nav-drawer/.test(html) &&
      /data-nav-scrim/.test(html) &&
      /data-nav-close/.test(html) &&
      /Cerrar/.test(html),
  );
  const header = html.match(/<header class="site-header">[\s\S]*?<\/header>/);
  assert(
    `${f} cajón fuera de .site-header`,
    Boolean(header) && !/data-nav-drawer/.test(header[0]) && /data-nav-drawer/.test(html),
  );
  assert(
    `${f} chrome Cómo, Precios y Empezar gratis`,
    /href="\/como"/.test(header[0]) &&
      /href="\/precios"/.test(header[0]) &&
      /Empezar gratis/.test(header[0]) &&
      !/Para mi empresa/.test(header[0]) &&
      !/Pagar con Mercado Pago/.test(header[0]) &&
      !/Pagar con Flow/.test(header[0]),
  );
  assert(`${f} script de app con módulos`, /type="module"[^>]*js\/app-/.test(html));
  assert(`${f} favicon.svg`, /favicon\.svg" type="image\/svg\+xml"/.test(html));
  assert(`${f} favicon.ico`, /favicon\.ico" sizes="32x32"/.test(html));
}

console.log("\nNavegación móvil");
const appEntries = [
  "js/app-home.js",
  "js/app-sueldo.js",
  "js/app-finiquito.js",
  "js/app-empresa.js",
  "js/app-admin.js",
  "js/app-reset.js",
  "js/app-precios.js",
];
for (const f of appEntries) {
  assert(`${f} llama wireNav()`, /wireNav\(\s*\)/.test(readFileSync(join(root, f), "utf8")));
}
const uiSrc = readFileSync(join(root, "js/ui.js"), "utf8");
assert("ui.js define wireDrawer", /function wireDrawer/.test(uiSrc) && /export function wireNav/.test(uiSrc));
assert(
  "ui.js hidrata cuenta en la cabecera",
  /hydrateAccountNav/.test(uiSrc) && /refreshAccountNav/.test(uiSrc) && /data-nav-salir/.test(uiSrc),
);
assert("ui.js monta el cajón en document.body", /document\.body\.append\(\s*drawer\s*\)/.test(uiSrc));
assert(
  "ui.js abre/cierra con el atributo hidden",
  /removeAttribute\(\s*["']hidden["']\s*\)/.test(uiSrc) &&
    /setAttribute\(\s*["']hidden["']/.test(uiSrc) &&
    /data-nav-close/.test(uiSrc) &&
    /data-nav-scrim/.test(uiSrc) &&
    /Escape/.test(uiSrc),
);
assert("ui.js no usa dialog nativo para el menú", !/showModal|HTMLDialogElement|createElement\(\s*["']dialog["']\)/.test(uiSrc));

const robots = readFileSync(join(root, "robots.txt"), "utf8");
assert("robots User-agent *", /User-agent:\s*\*/i.test(robots));
assert("robots Allow /", /Allow:\s*\//.test(robots));
assert("robots Disallow /admin", /Disallow:\s*\/admin/.test(robots));
assert("robots Disallow /api", /Disallow:\s*\/api/.test(robots));
assert("robots no Disallow /guias ni calculadoras", !/Disallow:\s*\/guias/.test(robots) && !/Disallow:\s*\/sueldo/.test(robots) && !/Disallow:\s*\/finiquito/.test(robots));
assert("robots Sitemap", /Sitemap:\s*https:\/\/www\.haberes\.cl\/sitemap\.xml/.test(robots));

const { seoPaths, GUIDE_SLUGS, CAUSAL_PAGES, BASE_PATHS } = await import("../content/registry.js");
const { buildSitemapXml } = await import("../api/_sitemap.js");
const sitemap = buildSitemapXml();
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const expectedFromRegistry = seoPaths().map((p) =>
  p === "/" ? "https://www.haberes.cl/" : `https://www.haberes.cl${p}`,
);
assert(
  "sitemap URLs = registro SEO (base + guías + 21 causales)",
  locs.length === expectedFromRegistry.length &&
    expectedFromRegistry.every((u) => locs.includes(u)) &&
    GUIDE_SLUGS.length >= 16 &&
    CAUSAL_PAGES.length === 21 &&
    BASE_PATHS.includes("/sueldo") &&
    BASE_PATHS.includes("/finiquito"),
  `${locs.length} vs ${expectedFromRegistry.length}`,
);
assert(
  "content/guias tiene un md por guía del registro",
  GUIDE_SLUGS.every((s) => existsSync(join(root, "content/guias", `${s}.md`))),
);
assert(
  "content/causales tiene un md por causal",
  CAUSAL_PAGES.every((p) => existsSync(join(root, "content/causales", `${p.slug}.md`))),
);
assert("docs/seo-map.md existe", existsSync(join(root, "docs/seo-map.md")));
assert(
  "páginas SEO tienen calculadora embebida o CTA empresa",
  GUIDE_SLUGS.every((s) => {
    const html = readFileSync(join(root, "guias", `${s}.html`), "utf8");
    return /data-seo-calc=/.test(html) && /href="\/empresa"/.test(html) && /DISCLAIMER|Inspección del Trabajo|Previred/.test(html);
  }) &&
    CAUSAL_PAGES.every((p) => {
      const html = readFileSync(join(root, "finiquito", `${p.slug}.html`), "utf8");
      return /data-seo-calc=/.test(html) && /href="\/empresa"/.test(html) && /application\/ld\+json/.test(html);
    }),
);
assert(
  "guías: cajón cerrado antes de main (no anida contenido)",
  GUIDE_SLUGS.every((s) => {
    const html = readFileSync(join(root, "guias", `${s}.html`), "utf8");
    const headerEnd = html.indexOf("</header>");
    const drawer = html.indexOf('data-nav-drawer');
    const drawerClose = html.indexOf("</div>", html.indexOf("nav-drawer-foot"));
    const main = html.indexOf("<main");
    return headerEnd > 0 && drawer > headerEnd && drawerClose > drawer && main > drawerClose;
  }),
);
assert("sitemap sin admin ni reset", !locs.some((u) => /\/admin|\/reset/.test(u)));
assert("sitemap lastmod presente", /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sitemap));
assert("sitemap sin .html (cleanUrls)", !locs.some((u) => u.endsWith(".html")));
assert(
  "sitemap cada URL tiene archivo",
  locs.every((u) => {
    const path = u.replace("https://www.haberes.cl", "").replace(/\/$/, "") || "/index";
    const file =
      path === "/index" || path === ""
        ? join(root, "index.html")
        : join(root, path.slice(1) + ".html");
    return existsSync(file);
  }),
);
assert(
  "guías y causales enlazan favicon.ico y svg",
  GUIDE_SLUGS.every((s) => {
    const html = readFileSync(join(root, "guias", `${s}.html`), "utf8");
    return /href="\.\.\/favicon\.ico"/.test(html) && /href="\.\.\/favicon\.svg"/.test(html);
  }) &&
    CAUSAL_PAGES.every((p) => {
      const html = readFileSync(join(root, "finiquito", `${p.slug}.html`), "utf8");
      return /href="\.\.\/favicon\.ico"/.test(html) && /href="\.\.\/favicon\.svg"/.test(html);
    }),
);
const faviconIco = readFileSync(join(root, "favicon.ico"));
assert(
  "favicon.ico es ICO 32×32",
  faviconIco[0] === 0 &&
    faviconIco[1] === 0 &&
    faviconIco[2] === 1 &&
    faviconIco[3] === 0 &&
    faviconIco.length > 16,
);

console.log("\nGuías: disclaimer según tema");
function noticeDisclaimer(html) {
  const m = html.match(/<p class="notice u-mt-6">([\s\S]*?)<\/p>/);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

const guiaHtmlFiles = readdirSync(join(root, "guias")).filter((f) => f.endsWith(".html"));
assert("hay páginas en guias/", guiaHtmlFiles.length >= 7, String(guiaHtmlFiles.length));
for (const f of guiaHtmlFiles) {
  const html = readFileSync(join(root, "guias", f), "utf8");
  const notice = noticeDisclaimer(html);
  const esFiniquito = /finiquito/.test(f);
  if (esFiniquito) {
    assert(
      `guias/${f} disclaimer de finiquito`,
      notice.includes("Inspección del Trabajo") &&
        /ratificaci[oó]n del finiquito/i.test(notice) &&
        /pago efectivo/i.test(notice) &&
        !notice.includes("Documento generado por Haberes"),
    );
  } else {
    assert(
      `guias/${f} disclaimer de liquidación`,
      notice.includes("Documento generado por Haberes") &&
        /Direcci[oó]n del Trabajo/i.test(notice) &&
        /Previred/i.test(notice) &&
        /asesor[ií]a legal ni previsional/i.test(notice) &&
        !/ratificaci[oó]n del finiquito/i.test(notice),
    );
  }
}

for (const f of readdirSync(join(root, "finiquito")).filter((x) => x.endsWith(".html"))) {
  const html = readFileSync(join(root, "finiquito", f), "utf8");
  const notice = noticeDisclaimer(html);
  assert(
    `finiquito/${f} disclaimer de finiquito`,
    notice.includes("Inspección del Trabajo") &&
      /ratificaci[oó]n del finiquito/i.test(notice) &&
      /pago efectivo/i.test(notice),
  );
}

const genContent = readFileSync(join(root, "scripts/gen-content-seo.mjs"), "utf8");
assert(
  "gen-content-seo elige disclaimer según path",
  /disclaimerForPath/.test(genContent) &&
    /DISCLAIMER, DISCLAIMER_FINIQUITO/.test(genContent) &&
    /\/finiquito\/\.test\(canonical\)/.test(genContent),
);

assert("gen-sitemap.mjs existe", existsSync(join(root, "scripts/gen-sitemap.mjs")));
assert(
  "package.json script sitemap",
  /"sitemap":\s*"node scripts\/gen-sitemap\.mjs"/.test(readFileSync(join(root, "package.json"), "utf8")),
);
const genSitemapSrc = readFileSync(join(root, "scripts/gen-sitemap.mjs"), "utf8");
assert(
  "gen-sitemap usa api/_sitemap.js",
  /from ["']\.\.\/api\/_sitemap\.js["']/.test(genSitemapSrc),
);
assert(
  "gen-sitemap no escribe sitemap.xml en la raíz",
  !/writeFileSync/.test(genSitemapSrc),
);
const sitemapSrc = readFileSync(join(root, "api/sitemap.js"), "utf8");
assert("api/sitemap.js no usa _lib ni pg", !/from ["']\.\/_lib\.js["']/.test(sitemapSrc) && !/\bpg\b/.test(sitemapSrc));
assert(
  "api/sitemap.js Content-Type text/xml",
  /SITEMAP_CONTENT_TYPE/.test(sitemapSrc) &&
    /text\/xml; charset=utf-8/.test(readFileSync(join(root, "api/_sitemap.js"), "utf8")),
);
assert("api/sitemap.js sin Content-Disposition", !/setHeader\([^)]*content-disposition/i.test(sitemapSrc));

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
    send(payload) {
      out.body = payload;
      return res;
    },
    end(payload) {
      if (payload !== undefined) out.body = payload;
      return res;
    },
  };
  res._out = out;
  return res;
}

function mockReq(method, body, ip = "203.0.113.10") {
  return { method, body, headers: { "x-forwarded-for": ip } };
}

console.log("\nSitemap API (curl / Googlebot / sin cabeceras de navegador)");
const sitemapHandler = (await import("../api/sitemap.js")).default;
const { sitemapLocs: sitemapApiLocs, SITEMAP_CONTENT_TYPE } = await import("../api/_sitemap.js");

function invokeSitemap(req) {
  const res = mockRes();
  sitemapHandler(req, res);
  return res._out;
}

const sitemapNoHeaders = invokeSitemap({ method: "GET" });
assert("GET sitemap sin headers 200", sitemapNoHeaders.statusCode === 200);
assert(
  "GET sitemap sin headers xml urlset",
  typeof sitemapNoHeaders.body === "string" &&
    sitemapNoHeaders.body.includes('<?xml version="1.0" encoding="UTF-8"?>') &&
    sitemapNoHeaders.body.includes("<urlset") &&
    sitemapNoHeaders.body.includes("</urlset>"),
);
assert(
  "GET sitemap Content-Type text/xml",
  /text\/xml/i.test(String(sitemapNoHeaders.headers["Content-Type"] || sitemapNoHeaders.headers["content-type"] || "")) &&
    SITEMAP_CONTENT_TYPE.includes("charset=utf-8"),
);
const apiLocs = [...String(sitemapNoHeaders.body).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
assert(
  "GET sitemap mismas URLs públicas",
  sitemapApiLocs().every((u) => apiLocs.includes(u)) && apiLocs.length === sitemapApiLocs().length,
  apiLocs.join(", "),
);
assert("GET sitemap sin admin ni reset", !apiLocs.some((u) => /\/admin|\/reset/.test(u)));

const sitemapCurl = invokeSitemap({
  method: "GET",
  headers: { accept: "*/*", "user-agent": "curl/8.5.0" },
});
assert("GET sitemap curl UA 200 xml", sitemapCurl.statusCode === 200 && /<urlset/.test(String(sitemapCurl.body)));

const sitemapBot = invokeSitemap({
  method: "GET",
  headers: {
    accept: "*/*",
    "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  },
});
assert("GET sitemap Googlebot 200 xml", sitemapBot.statusCode === 200 && /<urlset/.test(String(sitemapBot.body)));

const sitemapEmpty = invokeSitemap({});
assert("GET sitemap req vacío 200 xml", sitemapEmpty.statusCode === 200 && /<urlset/.test(String(sitemapEmpty.body)));

const sitemapHead = invokeSitemap({ method: "HEAD" });
assert("HEAD sitemap 200", sitemapHead.statusCode === 200);
assert(
  "GET sitemap sin Content-Disposition",
  !Object.keys(sitemapNoHeaders.headers).some((k) => /content-disposition/i.test(k)),
);
const sitemapXmlAccept = invokeSitemap({
  method: "GET",
  headers: { accept: "application/xml", "user-agent": "Googlebot" },
});
assert(
  "GET sitemap Accept application/xml 200",
  sitemapXmlAccept.statusCode === 200 && /<urlset/.test(String(sitemapXmlAccept.body)),
);

const sitemapPost = invokeSitemap({ method: "POST" });
assert("POST sitemap 405", sitemapPost.statusCode === 405);

console.log("\nServidor local: sitemap, favicon, trailing slash");
const { handleRequest } = await import("./serve.mjs");
const { createServer } = await import("node:http");
const localSrv = createServer(handleRequest);
await new Promise((resolve) => localSrv.listen(0, "127.0.0.1", resolve));
const localPort = localSrv.address().port;
const localBase = `http://127.0.0.1:${localPort}`;

async function hitLocal(path, opts = {}) {
  const res = await fetch(localBase + path, { redirect: "manual", ...opts });
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    type: res.headers.get("content-type") || "",
    location: res.headers.get("location") || "",
    disposition: res.headers.get("content-disposition") || "",
    text: buf.toString("utf8"),
    buf,
  };
}

try {
  const pretty = await hitLocal("/sitemap.xml", {
    headers: {
      Accept: "application/xml",
      "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    },
  });
  const prettyShort = await hitLocal("/sitemap");
  const apiSm = await hitLocal("/api/sitemap");
  assert("GET /sitemap.xml 200 text/xml", pretty.status === 200 && /text\/xml/i.test(pretty.type));
  assert("GET /sitemap 200 text/xml", prettyShort.status === 200 && /text\/xml/i.test(prettyShort.type));
  assert("GET /api/sitemap 200 text/xml", apiSm.status === 200 && /text\/xml/i.test(apiSm.type));
  assert(
    "/sitemap.xml = /api/sitemap",
    pretty.text === apiSm.text && prettyShort.text === apiSm.text && /<urlset/.test(pretty.text),
  );
  assert("/sitemap.xml sin content-disposition", pretty.disposition === "");
  assert(
    "/sitemap.xml URLs = registro (incluye /guias)",
    [...pretty.text.matchAll(/<loc>/g)].length === seoPaths().length &&
      seoPaths().includes("/guias") &&
      seoPaths().length === 46,
  );
  const prettyHead = await hitLocal("/sitemap.xml", { method: "HEAD" });
  assert("HEAD /sitemap.xml 200", prettyHead.status === 200 && prettyHead.text === "");
  const icoHit = await hitLocal("/favicon.ico");
  const svgHit = await hitLocal("/favicon.svg");
  assert("GET /favicon.ico 200", icoHit.status === 200 && /icon/.test(icoHit.type) && icoHit.buf.length > 16);
  assert("GET /favicon.svg 200", svgHit.status === 200 && /svg/.test(svgHit.type));
  for (const p of ["/sueldo/", "/finiquito/", "/empresa/", "/precios/", "/como/", "/privacidad/", "/terminos/", "/guias/finiquito/"]) {
    const r = await hitLocal(p);
    assert(`301 ${p}`, r.status === 301 && r.location === p.replace(/\/+$/, ""), `${p} → ${r.status} ${r.location}`);
  }
  const guiasSlash = await hitLocal("/guias/");
  assert("301 /guias/ → /guias", guiasSlash.status === 301 && guiasSlash.location === "/guias");
  const guiasBare = await hitLocal("/guias");
  assert(
    "GET /guias 200 hub",
    guiasBare.status === 200 &&
      /Guías de liquidación y finiquito/.test(guiasBare.text) &&
      /href="\/guias\/liquidacion-de-sueldo"/.test(guiasBare.text) &&
      /href="\/guias\/finiquito"/.test(guiasBare.text),
  );
  writeFileSync(join(root, "sitemap.xml"), "<urlset>STATIC-LEFTOVER</urlset>");
  try {
    const afterLeftover = await hitLocal("/sitemap.xml");
    assert(
      "XML estático no gana a /sitemap.xml",
      afterLeftover.status === 200 &&
        /<loc>/.test(afterLeftover.text) &&
        !afterLeftover.text.includes("STATIC-LEFTOVER"),
    );
  } finally {
    unlinkSync(join(root, "sitemap.xml"));
  }
} finally {
  await new Promise((resolve, reject) => localSrv.close((err) => (err ? reject(err) : resolve())));
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
const enviarApi = (await import("../api/enviar.js")).default;
const enviarRes = mockRes();
await enviarApi(mockReq("POST", { tipo: "liquidacion", trabajadores: [] }, "203.0.113.40"), enviarRes);
assert(
  "enviar 501 sin DATABASE_URL",
  enviarRes._out.statusCode === 501 && enviarRes._out.body?.reason === "no_backend",
  JSON.stringify(enviarRes._out.body),
);
const enviarGet = mockRes();
await enviarApi({ method: "GET", headers: {} }, enviarGet);
assert(
  "GET /api/enviar solo ok y mail",
  enviarGet._out.statusCode === 200 &&
    enviarGet._out.body?.ok === true &&
    typeof enviarGet._out.body?.mail === "boolean" &&
    !/RESEND|DATABASE|R2_/i.test(JSON.stringify(enviarGet._out.body)),
  JSON.stringify(enviarGet._out.body),
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

console.log("\nCheckout Mercado Pago");
const MP_TOKEN_KEYS = [
  "mp_access_token",
  "mp_access",
  "MP_ACCESS_YOKEN",
  "Mp:access_token",
  "MP_ACCESS_TOKEN",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MP_ACCESS_TOKEN_PROD",
  "MP_ACCESS",
];
const prevMpToks = Object.fromEntries(MP_TOKEN_KEYS.map((k) => [k, process.env[k]]));
const prevMpSec = process.env.MP_WEBHOOK_SECRET;
const prevMpSec2 = process.env.MERCADOPAGO_WEBHOOK_SECRET;
function clearMpEnv() {
  for (const k of MP_TOKEN_KEYS) delete process.env[k];
  delete process.env.MP_WEBHOOK_SECRET;
  delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
}
function restoreMpEnv() {
  for (const k of MP_TOKEN_KEYS) {
    if (prevMpToks[k] === undefined) delete process.env[k];
    else process.env[k] = prevMpToks[k];
  }
  if (prevMpSec === undefined) delete process.env.MP_WEBHOOK_SECRET;
  else process.env.MP_WEBHOOK_SECRET = prevMpSec;
  if (prevMpSec2 === undefined) delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  else process.env.MERCADOPAGO_WEBHOOK_SECRET = prevMpSec2;
}
clearMpEnv();

const {
  PRO_AMOUNT_CLP,
  MP_TOKEN_ENV,
  hasMp,
  mpAccessToken,
  verifyMpSignature,
  applyFetchedPayment,
  applyFetchedPreapproval,
  createProCheckout,
} = await import("../api/_mp.js");
const checkoutMod = await import("../api/checkout.js");
const checkout = checkoutMod.default;
const { handleCheckout, configuredProviders, normalizeProvider } = checkoutMod;
const { default: mpWebhook, handleMpWebhook } = await import("../api/mp-webhook.js");
const { createHmac } = await import("node:crypto");

assert("Pro cobra 17838 CLP", PRO_AMOUNT_CLP === 17838, String(PRO_AMOUNT_CLP));
assert("hasMp false sin token", hasMp() === false);
assert("mpAccessToken vacío sin env", mpAccessToken() === "");
assert(
  "MP_TOKEN_ENV: mp_access_token primero",
  MP_TOKEN_ENV[0] === "mp_access_token" &&
    MP_TOKEN_ENV.includes("mp_access") &&
    MP_TOKEN_ENV.includes("MP_ACCESS_YOKEN") &&
    MP_TOKEN_ENV.includes("MP_ACCESS_TOKEN") &&
    MP_TOKEN_ENV.includes("MERCADOPAGO_ACCESS_TOKEN") &&
    MP_TOKEN_ENV.includes("MP_ACCESS_TOKEN_PROD") &&
    MP_TOKEN_ENV.includes("MP_ACCESS"),
);

process.env.MP_ACCESS_TOKEN = "unit-mp-canonical";
process.env.mp_access_token = "unit-mp-vercel";
assert("mp_access_token gana al canónico", mpAccessToken() === "unit-mp-vercel");
delete process.env.mp_access_token;
process.env.mp_access = "unit-mp-short-alias";
assert("mp_access funciona si no hay mp_access_token", mpAccessToken() === "unit-mp-short-alias");
delete process.env.mp_access;
delete process.env.MP_ACCESS_TOKEN;
process.env.MP_ACCESS_YOKEN = "unit-mp-typo";
assert("MP_ACCESS_YOKEN funciona", hasMp() === true && mpAccessToken() === "unit-mp-typo");
delete process.env.MP_ACCESS_YOKEN;
process.env.MP_ACCESS = "unit-mp-short";
assert("MP_ACCESS funciona", hasMp() === true && mpAccessToken() === "unit-mp-short");
delete process.env.MP_ACCESS;
assert("sin alias no hay token", hasMp() === false);

const chkAnon = mockRes();
await checkout(mockReq("POST", {}, "203.0.113.81"), chkAnon);
assert(
  "checkout 401 sin sesión",
  chkAnon._out.statusCode === 401 && chkAnon._out.body?.reason === "unauthorized",
  JSON.stringify(chkAnon._out.body),
);

const chkCookie = mockRes();
await checkout(
  { method: "POST", body: {}, headers: { "x-forwarded-for": "203.0.113.82", cookie: "haberes_session=unit-session" } },
  chkCookie,
);
assert(
  "checkout 501 sin DATABASE_URL con sesión",
  chkCookie._out.statusCode === 501 && chkCookie._out.body?.reason === "no_backend",
  JSON.stringify(chkCookie._out.body),
);

process.env.MP_ACCESS_TOKEN = "unit-mp-token";
assert("hasMp true con alias", hasMp() === true);
const fakeFetch = async (url) => {
  const u = String(url);
  if (u.includes("/preapproval") && !u.includes("/checkout/")) {
    return {
      ok: true,
      status: 201,
      json: async () => ({ init_point: "https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=unit" }),
    };
  }
  if (u.includes("/checkout/preferences")) {
    throw new Error("preference fallback must not run");
  }
  throw new Error("live MP blocked in verify");
};
const created = await createProCheckout({ id: "co-unit", email: "pyme@example.cl" }, { fetchImpl: fakeFetch });
assert(
  "checkout mock init_point de preapproval sin API viva",
  created.ok === true &&
    created.kind === "preapproval" &&
    String(created.init_point).includes("mercadopago.cl"),
  JSON.stringify(created),
);
const fakeFetchFailSub = async (url) => {
  const u = String(url);
  if (u.includes("/preapproval") && !u.includes("/checkout/")) {
    return { ok: false, status: 400, json: async () => ({ message: "no_sub" }) };
  }
  if (u.includes("/checkout/preferences")) {
    return {
      ok: true,
      status: 201,
      json: async () => ({ init_point: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=unit" }),
    };
  }
  throw new Error("live MP blocked in verify");
};
const createdFail = await createProCheckout(
  { id: "co-unit", email: "pyme@example.cl" },
  { fetchImpl: fakeFetchFailSub },
);
assert(
  "checkout no cae en cobro de 31 días si falla la suscripción",
  createdFail.ok === false && createdFail.reason === "mp_subscription_unavailable",
  JSON.stringify(createdFail),
);
delete process.env.MP_ACCESS_TOKEN;

let applyHits = 0;
const unsigned = mockRes();
process.env.MP_WEBHOOK_SECRET = "unit-webhook-secret";
process.env.MP_ACCESS_TOKEN = "unit-mp-token";
await handleMpWebhook(
  {
    method: "POST",
    body: { type: "payment", data: { id: "999" }, status: "approved", external_reference: "co1" },
    headers: { "x-forwarded-for": "203.0.113.83" },
    url: "/api/mp-webhook?data.id=999&type=payment",
  },
  unsigned,
  {
    fetchImpl: async () => {
      applyHits += 1;
      return { ok: true, status: 200, json: async () => ({ status: "approved" }) };
    },
    applyPayment: async () => {
      applyHits += 10;
    },
  },
);
assert(
  "webhook unsigned 401",
  unsigned._out.statusCode === 401 && unsigned._out.body?.reason === "unauthorized" && applyHits === 0,
  JSON.stringify({ status: unsigned._out.statusCode, hits: applyHits, body: unsigned._out.body }),
);

applyHits = 0;
const forged = mockRes();
await handleMpWebhook(
  {
    method: "POST",
    body: { type: "payment", data: { id: "999" } },
    headers: {
      "x-forwarded-for": "203.0.113.84",
      "x-signature": "ts=1704908010,v1=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      "x-request-id": "req-unit",
    },
    url: "/api/mp-webhook?data.id=999&type=payment",
  },
  forged,
  {
    fetchImpl: async () => {
      applyHits += 1;
      return { ok: true, status: 200, json: async () => ({}) };
    },
    applyPayment: async () => {
      applyHits += 10;
    },
  },
);
assert(
  "webhook forged 401 sin voltear plan",
  forged._out.statusCode === 401 && applyHits === 0,
  JSON.stringify({ status: forged._out.statusCode, hits: applyHits }),
);

const ts = "1704908010";
const dataId = "999";
const requestId = "req-unit";
const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
const goodV1 = createHmac("sha256", "unit-webhook-secret").update(manifest, "utf8").digest("hex");
assert(
  "firma MP oficial",
  verifyMpSignature({
    secret: "unit-webhook-secret",
    xSignature: `ts=${ts},v1=${goodV1}`,
    xRequestId: requestId,
    dataId,
  }) === true,
);
assert(
  "firma MP rechaza otra",
  verifyMpSignature({
    secret: "unit-webhook-secret",
    xSignature: `ts=${ts},v1=${goodV1.replace(/a/g, "b")}`,
    xRequestId: requestId,
    dataId,
  }) === false,
);

applyHits = 0;
let appliedPlan = null;
const signed = mockRes();
await handleMpWebhook(
  {
    method: "POST",
    body: { type: "payment", data: { id: "999" } },
    headers: {
      "x-forwarded-for": "203.0.113.85",
      "x-signature": `ts=${ts},v1=${goodV1}`,
      "x-request-id": requestId,
    },
    url: "/api/mp-webhook?data.id=999&type=payment",
  },
  signed,
  {
    fetchImpl: async (url) => {
      applyHits += 1;
      if (String(url).includes("/v1/payments/999")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 999,
            status: "approved",
            transaction_amount: 17838,
            currency_id: "CLP",
            external_reference: "co1",
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    },
    applyPayment: async (_client, payment) => {
      appliedPlan = payment.status === "approved" ? "pro" : "gratis";
    },
    withDb: async (fn) => fn({}),
  },
);
assert(
  "webhook firmado consulta MP y no usa el body crudo",
  signed._out.statusCode === 200 && applyHits === 1 && appliedPlan === "pro",
  JSON.stringify({ status: signed._out.statusCode, hits: applyHits, plan: appliedPlan }),
);

function mockPayClient(row) {
  const state = { row: { ...row }, sql: [] };
  return {
    state,
    async query(sql, params = []) {
      state.sql.push(sql);
      if (/SELECT id, plan, mp_payment_id/.test(sql)) {
        return { rows: state.row ? [state.row] : [] };
      }
      if (/SET plan = 'pro'/.test(sql)) {
        state.row = { ...state.row, plan: "pro", mp_payment_id: params[1], plan_until: params[2] };
        return { rowCount: 1 };
      }
      if (/SET plan = 'gratis'/.test(sql)) {
        if (state.row && String(state.row.mp_payment_id) === String(params[1])) {
          state.row = { ...state.row, plan: "gratis", plan_until: null };
          return { rowCount: 1, rows: [{ id: state.row.id }] };
        }
        return { rowCount: 0, rows: [] };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

const payClient = mockPayClient({ id: "co1", plan: "gratis", mp_payment_id: null, plan_until: null });
const approved = await applyFetchedPayment(payClient, {
  id: "pay-1",
  status: "approved",
  transaction_amount: 17838,
  currency_id: "CLP",
  external_reference: "co1",
});
assert(
  "pago aprobado activa Pro",
  approved.applied && approved.plan === "pro" && payClient.state.row.plan === "pro",
  JSON.stringify(approved),
);
const pending = await applyFetchedPayment(payClient, {
  id: "pay-2",
  status: "pending",
  transaction_amount: 17838,
  currency_id: "CLP",
  external_reference: "co1",
});
assert("pago pendiente no cambia plan", pending.applied === false && payClient.state.row.plan === "pro");
const refunded = await applyFetchedPayment(payClient, {
  id: "pay-1",
  status: "refunded",
  external_reference: "co1",
});
assert(
  "reembolso vuelve a Gratis",
  refunded.applied && refunded.plan === "gratis" && payClient.state.row.plan === "gratis",
  JSON.stringify(refunded),
);

function mockPreClient(row) {
  const state = { row: { ...row }, sql: [], notified: 0 };
  return {
    state,
    async query(sql, params = []) {
      state.sql.push(sql);
      if (/SET plan = 'pro'/.test(sql) && /mp_preapproval_id/.test(sql)) {
        state.row = { ...state.row, plan: "pro", mp_preapproval_id: params[1], plan_until: null };
        return { rowCount: 1 };
      }
      if (/SET plan = 'gratis'/.test(sql) && /mp_preapproval_id/.test(sql)) {
        if (state.row && String(state.row.mp_preapproval_id) === String(params[1])) {
          state.row = { ...state.row, plan: "gratis", plan_until: null };
          return { rowCount: 1, rows: [{ id: state.row.id, email: "pyme@example.cl", razon_social: "Pyme" }] };
        }
        return { rowCount: 0, rows: [] };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}
const preClient = mockPreClient({ id: "co1", plan: "gratis", mp_preapproval_id: null, plan_until: "2099-01-01T00:00:00Z" });
let preNotified = 0;
const authorized = await applyFetchedPreapproval(preClient, {
  id: "pre-1",
  status: "authorized",
  external_reference: "co1",
});
assert(
  "preapproval autorizado activa Pro sin plan_until",
  authorized.applied &&
    authorized.plan === "pro" &&
    preClient.state.row.plan === "pro" &&
    preClient.state.row.plan_until == null,
  JSON.stringify(authorized),
);
const cancelledPre = await applyFetchedPreapproval(
  preClient,
  { id: "pre-1", status: "cancelled", external_reference: "co1" },
  {
    notify: async () => {
      preNotified += 1;
    },
  },
);
assert(
  "preapproval cancelado vuelve a Gratis y avisa",
  cancelledPre.applied &&
    cancelledPre.plan === "gratis" &&
    preClient.state.row.plan === "gratis" &&
    preNotified === 1,
  JSON.stringify({ cancelledPre, preNotified }),
);

const hookGet = mockRes();
await mpWebhook({ method: "GET", headers: {} }, hookGet);
assert("webhook GET 200", hookGet._out.statusCode === 200 && hookGet._out.body?.ok === true);

restoreMpEnv();

console.log("\nCheckout Flow");
const FLOW_ENV_KEYS = [
  "FLOW_API_KEY",
  "flow_api_key",
  "FLOW_APIKEY",
  "FLOW_KEY",
  "API_KEY",
  "FLOW_API_KEY_PROD",
  "FLOW_APIKEY_PROD",
  "FLOW_API_KEEY",
  "FLOW_API_YKEY",
  "FLOW_SECRET_KEY",
  "flow_secret_key",
  "FLOW_SECRET",
  "SECRET_KEY",
  "FLOW_SECRET_KEY_PROD",
  "FLOW_SECRETKEY",
  "FLOW_SECREY_KEY",
  "FLOW_API_URL",
  "FLOW_BASE_URL",
  "FLOW_SANDBOX",
];
const prevFlowEnv = Object.fromEntries(FLOW_ENV_KEYS.map((k) => [k, process.env[k]]));
function clearFlowEnv() {
  for (const k of FLOW_ENV_KEYS) delete process.env[k];
}
function restoreFlowEnv() {
  for (const k of FLOW_ENV_KEYS) {
    if (prevFlowEnv[k] === undefined) delete process.env[k];
    else process.env[k] = prevFlowEnv[k];
  }
}
clearFlowEnv();

const {
  FLOW_API_KEY_ENV,
  FLOW_SECRET_KEY_ENV,
  hasFlow,
  flowApiKey,
  flowSecretKey,
  flowApiBase,
  flowSign,
  flowRedirectUrl,
  companyIdFromStatus,
  applyFetchedFlowStatus,
  applyFetchedFlowInvoice,
  applyFlowCardRegistered,
  createFlowCheckout,
  createFlowOrder,
  FLOW_PLAN_ID,
  readFlowToken,
} = await import("../api/_flow.js");
const { default: flowWebhook, handleFlowWebhook } = await import("../api/flow-webhook.js");

assert("hasFlow false sin claves", hasFlow() === false);
assert(
  "alias Flow apiKey y secretKey",
  FLOW_API_KEY_ENV.includes("FLOW_API_KEY") &&
    FLOW_API_KEY_ENV.includes("FLOW_APIKEY") &&
    FLOW_API_KEY_ENV.includes("API_KEY") &&
    FLOW_API_KEY_ENV.includes("FLOW_API_KEY_PROD") &&
    FLOW_API_KEY_ENV.includes("FLOW_API_YKEY") &&
    FLOW_SECRET_KEY_ENV.includes("FLOW_SECRET_KEY") &&
    FLOW_SECRET_KEY_ENV.includes("SECRET_KEY") &&
    FLOW_SECRET_KEY_ENV.includes("FLOW_SECREY_KEY"),
);

process.env.FLOW_API_KEY = "unit-flow-canonical";
process.env.flow_api_key = "unit-flow-lower";
assert("FLOW_API_KEY gana a flow_api_key", flowApiKey() === "unit-flow-canonical");
delete process.env.FLOW_API_KEY;
assert("flow_api_key funciona si no hay FLOW_API_KEY", flowApiKey() === "unit-flow-lower");
delete process.env.flow_api_key;
process.env.FLOW_API_YKEY = "unit-flow-typo";
process.env.FLOW_SECREY_KEY = "unit-flow-secret-typo";
assert("typos Flow tipo MP_ACCESS_YOKEN", hasFlow() === true && flowApiKey() === "unit-flow-typo" && flowSecretKey() === "unit-flow-secret-typo");
delete process.env.FLOW_API_YKEY;
delete process.env.FLOW_SECREY_KEY;
assert("sin alias Flow no hay claves", hasFlow() === false);

const flowSignParams = { apiKey: "1F90971E-8276-4715-97FF-2BLG5030EE3B", token: "AJ089FF5467367" };
const flowExpected = createHmac("sha256", "my secret")
  .update("apiKey1F90971E-8276-4715-97FF-2BLG5030EE3BtokenAJ089FF5467367", "utf8")
  .digest("hex");
assert("firma Flow oficial key+value ordenado", flowSign(flowSignParams, "my secret") === flowExpected);
assert(
  "firma Flow ignora s y ordena claves",
  flowSign({ token: "AJ089FF5467367", s: "nope", apiKey: "1F90971E-8276-4715-97FF-2BLG5030EE3B" }, "my secret") ===
    flowExpected,
);
assert(
  "firma Flow distinta con otro secreto",
  flowSign(flowSignParams, "other secret") !== flowExpected,
);
assert(
  "redirect Flow url?token=",
  flowRedirectUrl("https://www.flow.cl/app/web/pay.php", "TOK") ===
    "https://www.flow.cl/app/web/pay.php?token=TOK",
);
assert(
  "company_id desde optional y commerceOrder",
  companyIdFromStatus({ optional: { company_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" } }) ===
    "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" &&
    companyIdFromStatus({
      commerceOrder: "pro-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-1-abcd",
    }) === "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
);

assert("normalizeProvider default mp", normalizeProvider(undefined) === "mp" && normalizeProvider("FLOW") === "flow");
const chkGet = mockRes();
await checkout(mockReq("GET", null, "203.0.113.90"), chkGet);
assert(
  "GET checkout lista providers sin sesión",
  chkGet._out.statusCode === 200 &&
    chkGet._out.body?.ok === true &&
    Array.isArray(chkGet._out.body?.providers) &&
    chkGet._out.body.providers.includes("flow") === false,
  JSON.stringify(chkGet._out.body),
);

const chkFlowAnon = mockRes();
await checkout(mockReq("POST", { provider: "flow" }, "203.0.113.91"), chkFlowAnon);
assert(
  "checkout Flow 401 sin sesión",
  chkFlowAnon._out.statusCode === 401 && chkFlowAnon._out.body?.reason === "unauthorized",
  JSON.stringify(chkFlowAnon._out.body),
);

process.env.FLOW_API_KEY = "unit-flow-key";
process.env.FLOW_SECRET_KEY = "unit-flow-secret";
assert("hasFlow true con alias", hasFlow() === true);
assert("Flow API prod por defecto", flowApiBase() === "https://www.flow.cl/api");
process.env.FLOW_SANDBOX = "1";
assert("FLOW_SANDBOX=1 usa sandbox", flowApiBase() === "https://sandbox.flow.cl/api");
delete process.env.FLOW_SANDBOX;
process.env.FLOW_API_URL = "https://sandbox.flow.cl/api/";
assert("FLOW_API_URL gana y recorta slash", flowApiBase() === "https://sandbox.flow.cl/api");
delete process.env.FLOW_API_URL;

const fakeFlowFetch = async (url, opts) => {
  const u = String(url);
  if (!u.includes("/payment/create")) throw new Error("live Flow blocked in verify");
  const body = String(opts?.body || "");
  if (!body.includes("apiKey=") || !body.includes("s=")) throw new Error("create must be signed form");
  return {
    ok: true,
    status: 200,
    json: async () => ({
      url: "https://www.flow.cl/app/web/pay.php",
      token: "unit-flow-token",
      flowOrder: 776655,
    }),
  };
};
const flowCreated = await createFlowOrder(
  { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", email: "pyme@example.cl" },
  { fetchImpl: fakeFlowFetch },
);
assert(
  "checkout Flow one-shot mock init_point sin API viva",
  flowCreated.ok === true &&
    String(flowCreated.init_point) === "https://www.flow.cl/app/web/pay.php?token=unit-flow-token",
  JSON.stringify(flowCreated),
);

const flowHits = [];
const fakeFlowSubFetch = async (url, opts) => {
  const u = String(url);
  const body = String(opts?.body || "");
  flowHits.push(u);
  if (u.includes("/plans/get")) {
    return { ok: false, status: 400, json: async () => ({ code: 404 }) };
  }
  if (u.includes("/plans/create")) {
    if (!body.includes("periods_number=0") || !body.includes("interval=3") || !body.includes("amount=17838")) {
      throw new Error("plan must be monthly 17838 indefinite");
    }
    return { ok: true, status: 200, json: async () => ({ planId: FLOW_PLAN_ID }) };
  }
  if (u.includes("/customer/create")) {
    return { ok: true, status: 200, json: async () => ({ customerId: "cus_unit" }) };
  }
  if (u.includes("/customer/register")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ url: "https://www.flow.cl/app/web/pay.php", token: "unit-reg-token" }),
    };
  }
  if (u.includes("/payment/create")) throw new Error("subscription path must not fall back to payment/create");
  throw new Error(`live Flow blocked in verify: ${u}`);
};
const flowSub = await createFlowCheckout(
  {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    email: "pyme@example.cl",
    razon_social: "Pyme SpA",
  },
  { fetchImpl: fakeFlowSubFetch },
);
assert(
  "checkout Flow suscripción plan+cliente+tarjeta",
  flowSub.ok === true &&
    flowSub.kind === "flow_subscription" &&
    flowSub.customerId === "cus_unit" &&
    String(flowSub.init_point) === "https://www.flow.cl/app/web/pay.php?token=unit-reg-token",
  JSON.stringify(flowSub),
);
const fakeFlowSubFail = async (url) => {
  const u = String(url);
  if (u.includes("/plans/")) return { ok: false, status: 400, json: async () => ({ message: "no_plans" }) };
  if (u.includes("/payment/create")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ url: "https://www.flow.cl/app/web/pay.php", token: "should-not" }),
    };
  }
  throw new Error("live Flow blocked in verify");
};
const flowSubFail = await createFlowCheckout(
  { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", email: "pyme@example.cl", razon_social: "Pyme" },
  { fetchImpl: fakeFlowSubFail },
);
assert(
  "checkout Flow no vende un mes suelto si falla el plan",
  flowSubFail.ok === false && flowSubFail.reason === "flow_subscription_unavailable",
  JSON.stringify(flowSubFail),
);

const flowProv = mockRes();
await handleCheckout(
  {
    method: "POST",
    body: { provider: "flow" },
    headers: { "x-forwarded-for": "203.0.113.92", cookie: "haberes_session=unit-session" },
  },
  flowProv,
  {
    hasDatabaseUrl: () => true,
    requireCompany: async () => ({ id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", email: "pyme@example.cl" }),
    hasMp: () => true,
    hasFlow: () => true,
    createMp: async () => ({ ok: true, init_point: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=nope" }),
    createFlow: async () => ({
      ok: true,
      init_point: "https://www.flow.cl/app/web/pay.php?token=from-provider",
    }),
  },
);
assert(
  "checkout body provider flow no usa MP",
  flowProv._out.statusCode === 200 &&
    flowProv._out.body?.ok === true &&
    flowProv._out.body?.provider === "flow" &&
    String(flowProv._out.body?.init_point).includes("flow.cl"),
  JSON.stringify(flowProv._out.body),
);

const mpDefault = mockRes();
await handleCheckout(
  {
    method: "POST",
    body: {},
    headers: { "x-forwarded-for": "203.0.113.93", cookie: "haberes_session=unit-session" },
  },
  mpDefault,
  {
    hasDatabaseUrl: () => true,
    requireCompany: async () => ({ id: "co1", email: "pyme@example.cl" }),
    hasMp: () => true,
    hasFlow: () => true,
    createMp: async () => ({ ok: true, init_point: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=unit" }),
    createFlow: async () => ({ ok: true, init_point: "https://www.flow.cl/app/web/pay.php?token=nope" }),
  },
);
assert(
  "checkout sin provider sigue MP",
  mpDefault._out.statusCode === 200 &&
    mpDefault._out.body?.provider === "mp" &&
    String(mpDefault._out.body?.init_point).includes("mercadopago.cl"),
  JSON.stringify(mpDefault._out.body),
);

let flowApplyHits = 0;
const missingTok = mockRes();
await handleFlowWebhook(
  { method: "POST", body: {}, headers: { "x-forwarded-for": "203.0.113.94" } },
  missingTok,
  {
    fetchImpl: async () => {
      flowApplyHits += 1;
      return { ok: true, status: 200, json: async () => ({ status: 2 }) };
    },
    applyStatus: async () => {
      flowApplyHits += 10;
    },
  },
);
assert(
  "webhook Flow sin token no voltea plan",
  missingTok._out.statusCode === 200 && flowApplyHits === 0,
  JSON.stringify({ status: missingTok._out.statusCode, hits: flowApplyHits, body: missingTok._out.body }),
);

flowApplyHits = 0;
const unknownTok = mockRes();
await handleFlowWebhook(
  { method: "POST", body: { token: "unknown-token" }, headers: { "x-forwarded-for": "203.0.113.95" } },
  unknownTok,
  {
    fetchImpl: async () => {
      flowApplyHits += 1;
      return { ok: false, status: 400, json: async () => ({ code: 404, message: "not found" }) };
    },
    applyStatus: async () => {
      flowApplyHits += 10;
    },
    getRegisterStatus: async () => ({ ok: false, data: null }),
  },
);
assert(
  "webhook Flow token desconocido no voltea plan",
  unknownTok._out.statusCode === 200 && flowApplyHits === 1,
  JSON.stringify({ status: unknownTok._out.statusCode, hits: flowApplyHits }),
);

assert(
  "readFlowToken form-urlencoded",
  readFlowToken({ body: "token=abc123", headers: {}, url: "/api/flow-webhook" }) === "abc123",
);

flowApplyHits = 0;
let flowAppliedPlan = null;
const paidHook = mockRes();
await handleFlowWebhook(
  { method: "POST", body: { token: "paid-token", status: "2" }, headers: { "x-forwarded-for": "203.0.113.96" } },
  paidHook,
  {
    fetchImpl: async (url) => {
      flowApplyHits += 1;
      if (String(url).includes("/payment/getStatus")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            flowOrder: 776655,
            commerceOrder: "pro-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-1-abcd",
            status: 2,
            subject: "Haberes Pro — 1 mes",
            currency: "CLP",
            amount: 17838,
            optional: { company_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    },
    applyStatus: async (_client, status) => {
      flowAppliedPlan = Number(status.status) === 2 ? "pro" : "gratis";
    },
    getRegisterStatus: async () => ({ ok: false, data: null }),
    withDb: async (fn) => fn({}),
  },
);
assert(
  "webhook Flow consulta getStatus y no usa el body crudo",
  paidHook._out.statusCode === 200 && flowApplyHits === 1 && flowAppliedPlan === "pro",
  JSON.stringify({ status: paidHook._out.statusCode, hits: flowApplyHits, plan: flowAppliedPlan }),
);

function mockFlowClient(row) {
  const state = { row: { ...row }, sql: [] };
  return {
    state,
    async query(sql, params = []) {
      state.sql.push(sql);
      if (/SELECT id, plan, flow_token/.test(sql)) {
        return { rows: state.row ? [state.row] : [] };
      }
      if (/SET plan = 'pro'/.test(sql)) {
        state.row = {
          ...state.row,
          plan: "pro",
          flow_token: params[1],
          flow_order: params[2],
          flow_commerce_order: params[3],
          plan_until: params[4],
        };
        return { rowCount: 1 };
      }
      if (/SET plan = 'gratis'/.test(sql)) {
        if (state.row && String(state.row.flow_token) === String(params[1])) {
          state.row = { ...state.row, plan: "gratis", plan_until: null };
          return { rowCount: 1, rows: [{ id: state.row.id }] };
        }
        return { rowCount: 0, rows: [] };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

const flowClient = mockFlowClient({
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  plan: "gratis",
  flow_token: null,
  plan_until: null,
});
const flowPaid = await applyFetchedFlowStatus(
  flowClient,
  {
    flowOrder: 776655,
    commerceOrder: "pro-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-1-abcd",
    status: 2,
    currency: "CLP",
    amount: 17838,
    optional: { company_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
  },
  "paid-token",
);
assert(
  "pago Flow aprobado activa Pro",
  flowPaid.applied && flowPaid.plan === "pro" && flowClient.state.row.plan === "pro",
  JSON.stringify(flowPaid),
);
const flowPending = await applyFetchedFlowStatus(
  flowClient,
  {
    status: 1,
    currency: "CLP",
    amount: 17838,
    optional: { company_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
  },
  "other-token",
);
assert("pago Flow pendiente no cambia plan", flowPending.applied === false && flowClient.state.row.plan === "pro");
const flowRejectedOther = await applyFetchedFlowStatus(
  flowClient,
  {
    status: 3,
    optional: { company_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
  },
  "other-token",
);
assert(
  "Flow rechazado de otro token no baja Pro",
  flowRejectedOther.applied === false && flowClient.state.row.plan === "pro",
);
const flowCanceled = await applyFetchedFlowStatus(
  flowClient,
  {
    status: 4,
    optional: { company_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
  },
  "paid-token",
);
assert(
  "Flow anulado del cobro activo vuelve a Gratis",
  flowCanceled.applied && flowCanceled.plan === "gratis" && flowClient.state.row.plan === "gratis",
  JSON.stringify(flowCanceled),
);

function mockFlowSubClient(row) {
  const state = { row: { ...row }, sql: [] };
  return {
    state,
    async query(sql, params = []) {
      state.sql.push(sql);
      if (/FROM companies WHERE flow_customer_id/.test(sql) || /FROM companies WHERE flow_subscription_id/.test(sql) || /FROM companies WHERE id =/.test(sql)) {
        return { rows: state.row ? [state.row] : [] };
      }
      if (/SET plan = 'pro'/.test(sql) && /flow_customer_id/.test(sql)) {
        state.row = {
          ...state.row,
          plan: "pro",
          plan_until: null,
          flow_customer_id: params[1] || state.row.flow_customer_id,
          flow_subscription_id: params[2] || state.row.flow_subscription_id,
          flow_plan_id: params[3] || state.row.flow_plan_id,
        };
        return { rowCount: 1 };
      }
      if (/SET plan = 'gratis'/.test(sql)) {
        state.row = { ...state.row, plan: "gratis", plan_until: null };
        return { rowCount: 1, rows: [{ id: state.row.id, email: "pyme@example.cl", razon_social: "Pyme" }] };
      }
      if (/SELECT \* FROM companies/.test(sql)) {
        return { rows: state.row ? [state.row] : [] };
      }
      return { rows: state.row ? [state.row] : [], rowCount: 0 };
    },
  };
}
const flowSubClient = mockFlowSubClient({
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  plan: "gratis",
  flow_customer_id: "cus_unit",
  flow_subscription_id: null,
  flow_plan_id: FLOW_PLAN_ID,
  email: "pyme@example.cl",
  razon_social: "Pyme",
});
const cardReg = await applyFlowCardRegistered(
  flowSubClient,
  { customerId: "cus_unit", status: "1" },
  {
    fetchImpl: async (url) => {
      if (String(url).includes("/subscription/create")) {
        return { ok: true, status: 200, json: async () => ({ subscriptionId: "sus_unit" }) };
      }
      throw new Error("unexpected Flow call");
    },
  },
);
assert(
  "registro de tarjeta Flow crea suscripción y activa Pro",
  cardReg.applied &&
    cardReg.plan === "pro" &&
    flowSubClient.state.row.plan === "pro" &&
    flowSubClient.state.row.flow_subscription_id === "sus_unit" &&
    flowSubClient.state.row.plan_until == null,
  JSON.stringify(cardReg),
);
const invPaid = await applyFetchedFlowInvoice(flowSubClient, {
  customerId: "cus_unit",
  subscriptionId: "sus_unit",
  status: 1,
  currency: "CLP",
  amount: 17838,
});
assert("invoice Flow pagado renueva Pro", invPaid.applied && invPaid.plan === "pro", JSON.stringify(invPaid));
let flowMail = 0;
const invFail = await applyFetchedFlowInvoice(
  flowSubClient,
  { customerId: "cus_unit", subscriptionId: "sus_unit", status: 2, currency: "CLP", amount: 17838 },
  {
    notify: async () => {
      flowMail += 1;
    },
  },
);
assert(
  "invoice Flow fallido vuelve a Gratis y avisa",
  invFail.applied && invFail.plan === "gratis" && flowSubClient.state.row.plan === "gratis" && flowMail === 1,
  JSON.stringify({ invFail, flowMail }),
);

const flowHookGet = mockRes();
await flowWebhook({ method: "GET", headers: {} }, flowHookGet);
assert("webhook Flow GET 200", flowHookGet._out.statusCode === 200 && flowHookGet._out.body?.ok === true);

assert("configuredProviders incluye flow con claves", configuredProviders().includes("flow"));
clearFlowEnv();
assert("configuredProviders sin flow si no hay claves", configuredProviders().includes("flow") === false);
restoreFlowEnv();

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

const {
  classifySubscription,
  paymentProvider,
  paymentIdsPublic,
  summarizeSubscriptions,
  companyAdminPublic,
  parseProductoPeriod,
  parseTraficoPeriod,
  productoFromCounts,
  PRO_GROSS_CLP,
} = await import("../api/_admin-ops.js");
const nowOps = Date.parse("2026-08-18T12:00:00.000Z");
assert("suscripción Pro abierta", classifySubscription({ plan: "pro", plan_until: null }, nowOps) === "pro_vigente");
assert(
  "suscripción Pro vencida",
  classifySubscription({ plan: "pro", plan_until: "2026-07-01T00:00:00.000Z" }, nowOps) === "vencida",
);
assert(
  "suscripción Gratis expirada sigue vencida",
  classifySubscription({ plan: "gratis", plan_until: "2026-07-01T00:00:00.000Z" }, nowOps) === "vencida",
);
assert("suscripción Gratis", classifySubscription({ plan: "gratis", plan_until: null }, nowOps) === "gratis");
assert("proveedor MP", paymentProvider({ mp_preapproval_id: "pre_1" }) === "mp");
assert("proveedor Flow", paymentProvider({ flow_subscription_id: "sus_1" }) === "flow");
assert(
  "proveedor ambos",
  paymentProvider({ mp_payment_id: "pay_1", flow_order: "ord_1" }) === "mp_flow",
);
assert("proveedor ninguno", paymentProvider({}) === null);
const ids = paymentIdsPublic({
  mp_payment_id: "pay_1",
  flow_token: "tok_secret",
  flow_subscription_id: "sus_1",
  password_hash: "$argon2id$no",
});
assert(
  "ids de cobro sin token ni hash",
  ids.mpPaymentId === "pay_1" &&
    ids.flowSubscriptionId === "sus_1" &&
    ids.flowToken == null &&
    !JSON.stringify(ids).includes("argon2") &&
    !JSON.stringify(ids).includes("tok_secret"),
);
const pub = companyAdminPublic(
  {
    id: "c1",
    rut: "760864285",
    email: "pyme@example.cl",
    razon_social: "Pyme SpA",
    created_at: "2026-08-01T00:00:00.000Z",
    disabled_at: null,
    plan: "pro",
    plan_until: null,
    mp_preapproval_id: "pre_1",
    has_logo: true,
    documentos: 3,
    password_hash: "$argon2id$hidden",
  },
  nowOps,
);
assert(
  "companyAdminPublic sin secretos y Pro vigente",
  pub.plan === "pro" &&
    pub.status === "pro_vigente" &&
    pub.vigencia.kind === "open" &&
    pub.provider === "mp" &&
    !Object.prototype.hasOwnProperty.call(pub, "password_hash") &&
    JSON.stringify(pub).includes("pyme@example.cl") &&
    !JSON.stringify(pub).includes("argon2"),
);
const sum = summarizeSubscriptions(
  [
    { plan: "pro", plan_until: null },
    { plan: "pro", plan_until: "2026-07-01T00:00:00.000Z" },
    { plan: "gratis", plan_until: null },
    { plan: "gratis", plan_until: null },
  ],
  nowOps,
);
assert(
  "resumen Pro/Gratis/vencidas y estimado 17838",
  sum.pro === 1 &&
    sum.vencidas === 1 &&
    sum.gratis === 2 &&
    sum.ingresosEstimadosClp === PRO_GROSS_CLP &&
    sum.ingresosEstimados.totalClp === 17838 &&
    sum.cobroFallido.available === false &&
    sum.proNuevosSemana.available === false &&
    sum.bajasSemana.available === false,
  JSON.stringify(sum),
);
assert("período producto 7 o 30", parseProductoPeriod("7") === 7 && parseProductoPeriod("99") === 30);
assert("período tráfico 7 o 28", parseTraficoPeriod("7") === 7 && parseTraficoPeriod("x") === 28);
const prod = productoFromCounts({ accountsNew: 2, documents: 4, movements: 1, envios: 0 }, 7, "2026-08-11T12:00:00.000Z");
assert(
  "producto sin checkout inventado",
  prod.accountsNew === 2 &&
    prod.documents === 4 &&
    prod.checkoutsStarted.available === false &&
    prod.checkoutsPaid.available === false,
);

const {
  ga4Configured,
  ga4PropertyId,
  ga4ServiceAccount,
  parseServiceAccountJson,
  mapGa4Channel,
  foldChannels,
  parseGa4Batch,
  ga4OperatorError,
  clearGa4Cache,
  loadGa4Report,
  ga4NotConfiguredBody,
} = await import("../api/_ga4.js");
const { handleAdminTrafico } = await import("../api/admin-trafico.js");
const { handleAdminProducto } = await import("../api/admin-producto.js");

const prevGa4 = {
  GA4_PROPERTY_ID: process.env.GA4_PROPERTY_ID,
  GOOGLE_ANALYTICS_PROPERTY_ID: process.env.GOOGLE_ANALYTICS_PROPERTY_ID,
  GA4_SERVICE_ACCOUNT_JSON: process.env.GA4_SERVICE_ACCOUNT_JSON,
  GOOGLE_APPLICATION_CREDENTIALS_JSON: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
};
function restoreGa4Env() {
  for (const [k, v] of Object.entries(prevGa4)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}
delete process.env.GA4_PROPERTY_ID;
delete process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
delete process.env.GA4_SERVICE_ACCOUNT_JSON;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
clearGa4Cache();
assert("GA4 no configurado sin env", ga4Configured() === false);
const missing = await loadGa4Report({ env: {}, fetchImpl: async () => { throw new Error("no fetch"); } });
assert(
  "GA4 missing no inventa cifras",
  missing.connected === false &&
    missing.reason === "ga4_not_configured" &&
    missing.sessions == null &&
    Array.isArray(missing.willShow) &&
    missing.willShow.includes("sesiones"),
  JSON.stringify(missing),
);
process.env.GOOGLE_ANALYTICS_PROPERTY_ID = "properties/123456";
process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON.stringify({
  client_email: "ga4@example.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
});
assert("GA4 property alias", ga4PropertyId() === "123456");
assert("GA4 service account alias", ga4ServiceAccount()?.client_email === "ga4@example.iam.gserviceaccount.com");
assert("GA4 configurado con alias", ga4Configured() === true);
assert("SA JSON inválido", parseServiceAccountJson("{") === null);
assert("canal orgánico", mapGa4Channel("Organic Search") === "organic");
assert("canal pago Display", mapGa4Channel("Display") === "paid");
assert(
  "canales agrupados",
  JSON.stringify(foldChannels([{ name: "Organic Search", sessions: 4 }, { name: "Email", sessions: 1 }])) ===
    JSON.stringify({ organic: 4, direct: 0, referral: 0, paid: 0, other: 1 }),
);
const parsedBatch = parseGa4Batch({
  reports: [
    { rows: [{ metricValues: [{ value: "10" }, { value: "7" }] }] },
    { rows: [{ dimensionValues: [{ value: "Direct" }], metricValues: [{ value: "3" }] }] },
    { rows: [{ dimensionValues: [{ value: "Santiago" }], metricValues: [{ value: "5" }] }] },
    { rows: [{ dimensionValues: [{ value: "Chile" }], metricValues: [{ value: "8" }] }] },
    { rows: [{ dimensionValues: [{ value: "/sueldo" }], metricValues: [{ value: "2" }] }] },
  ],
});
assert(
  "parse GA4 batch",
  parsedBatch.sessions === 10 &&
    parsedBatch.users === 7 &&
    parsedBatch.channels.direct === 3 &&
    parsedBatch.cities[0].name === "Santiago" &&
    parsedBatch.landings[0].name === "/sueldo",
);
assert("error GA4 403 en lenguaje operador", /cuenta de servicio/.test(ga4OperatorError({ error: { code: 403, status: "PERMISSION_DENIED" } }, 403)));

const fakeToken = async () => ({ ok: true, token: "ya29.unit" });
const fakeGa4Ok = async (url, init) => {
  const u = String(url);
  if (u.includes("oauth2.googleapis.com")) throw new Error("token path should be injected");
  if (!u.includes("batchRunReports")) throw new Error(`unexpected ${u}`);
  const body = JSON.parse(init.body);
  assert("GA4 pide 7 u 28 días", body.requests[0].dateRanges[0].startDate === "7daysAgo");
  return {
    ok: true,
    status: 200,
    json: async () => ({
      reports: [
        { rows: [{ metricValues: [{ value: "21" }, { value: "11" }] }] },
        { rows: [{ dimensionValues: [{ value: "Organic Search" }], metricValues: [{ value: "12" }] }] },
        { rows: [{ dimensionValues: [{ value: "(not set)" }], metricValues: [{ value: "9" }] }] },
        { rows: [{ dimensionValues: [{ value: "Chile" }], metricValues: [{ value: "21" }] }] },
        { rows: [{ dimensionValues: [{ value: "/" }], metricValues: [{ value: "6" }] }] },
      ],
    }),
  };
};
clearGa4Cache();
const okReport = await loadGa4Report({
  env: process.env,
  periodDays: 7,
  fetchImpl: fakeGa4Ok,
  getAccessToken: fakeToken,
});
assert(
  "GA4 informe mockeado",
  okReport.ok === true &&
    okReport.connected === true &&
    okReport.sessions === 21 &&
    okReport.channels.organic === 12 &&
    okReport.cities.length === 0 &&
    okReport.countries[0].name === "Chile",
  JSON.stringify(okReport),
);

const fakeGa4Fail = async () => ({
  ok: false,
  status: 403,
  json: async () => ({ error: { code: 403, status: "PERMISSION_DENIED", message: "stack\ntrace" } }),
});
clearGa4Cache();
const failReport = await loadGa4Report({
  env: process.env,
  periodDays: 28,
  fetchImpl: fakeGa4Fail,
  getAccessToken: fakeToken,
});
assert(
  "GA4 error sin stack",
  failReport.ok === false &&
    failReport.connected === true &&
    /cuenta de servicio/.test(failReport.error) &&
    !/stack/.test(JSON.stringify(failReport)),
  JSON.stringify(failReport),
);

const passAdmin = async () => ({ email: "ops@example.com" });
const traficoMissing = mockRes();
clearGa4Cache();
delete process.env.GA4_PROPERTY_ID;
delete process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
delete process.env.GA4_SERVICE_ACCOUNT_JSON;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
await handleAdminTrafico({ method: "GET", url: "/api/admin-trafico?period=7" }, traficoMissing, {
  requireAdmin: passAdmin,
  env: {},
  fetchImpl: async () => { throw new Error("no"); },
});
assert(
  "admin-trafico 200 no conectado",
  traficoMissing._out.statusCode === 200 &&
    traficoMissing._out.body?.connected === false &&
    traficoMissing._out.body?.reason === "ga4_not_configured",
  JSON.stringify(traficoMissing._out.body),
);
const traficoErr = mockRes();
await handleAdminTrafico({ method: "GET", url: "/api/admin-trafico" }, traficoErr, {
  requireAdmin: passAdmin,
  loadGa4Report: async () => ({ ok: false, connected: true, reason: "ga4_error", error: "GA4 rechazó el acceso." }),
});
assert(
  "admin-trafico error de API",
  traficoErr._out.statusCode === 200 &&
    traficoErr._out.body?.ok === false &&
    traficoErr._out.body?.error === "GA4 rechazó el acceso.",
);
const trafico405 = mockRes();
await handleAdminTrafico(mockReq("POST", {}), trafico405, { requireAdmin: passAdmin });
assert("admin-trafico 405", trafico405._out.statusCode === 405);

const prodRes = mockRes();
await handleAdminProducto({ method: "GET", url: "/api/admin-producto?period=7" }, prodRes, {
  requireAdmin: passAdmin,
  now: nowOps,
  withDb: async (fn) =>
    fn({
      query: async () => ({ rows: [{ n: 3 }] }),
    }),
});
assert(
  "admin-producto agrega cuentas y omite checkout",
  prodRes._out.statusCode === 200 &&
    prodRes._out.body?.producto?.accountsNew === 3 &&
    prodRes._out.body?.producto?.periodDays === 7 &&
    prodRes._out.body?.producto?.checkoutsPaid?.available === false,
  JSON.stringify(prodRes._out.body),
);
restoreGa4Env();
clearGa4Cache();

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
  "api/_admin-ops.js",
  "api/_ga4.js",
  "api/admin-login.js",
  "api/admin-logout.js",
  "api/admin-me.js",
  "api/admin-companies.js",
  "api/admin-producto.js",
  "api/admin-trafico.js",
  "api/movimiento.js",
  "api/_mp.js",
  "api/checkout.js",
  "api/mp-webhook.js",
  "api/_flow.js",
  "api/flow-webhook.js",
  "api/sitemap.js",
  "api/_sitemap.js",
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
assert("schema 005 en _lib", /005\.sql/.test(libSrc) && /INLINE_SCHEMA_005/.test(libSrc));
assert("schema 007 en _lib", /007\.sql/.test(libSrc) && /INLINE_SCHEMA_007/.test(libSrc));
assert("schema 008 en _lib", /008\.sql/.test(libSrc) && /INLINE_SCHEMA_008/.test(libSrc));

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
const sql5 = readFileSync(join(root, "sql/005.sql"), "utf8");
assert(
  "sql/005.sql cobro Mercado Pago",
  /mp_payment_id/.test(sql5) &&
    /mp_preapproval_id/.test(sql5) &&
    /plan_until/.test(sql5) &&
    /ADD COLUMN IF NOT EXISTS/i.test(sql5),
);
assert("sql/005.sql sin secretos", !/postgres(ql)?:\/\//i.test(sql5) && !/DATABASE_URL\s*=/.test(sql5));
const sql7 = readFileSync(join(root, "sql/007.sql"), "utf8");
assert(
  "sql/007.sql cobro Flow",
  /flow_token/.test(sql7) &&
    /flow_order/.test(sql7) &&
    /flow_commerce_order/.test(sql7) &&
    /ADD COLUMN IF NOT EXISTS/i.test(sql7),
);
assert("sql/007.sql sin secretos", !/postgres(ql)?:\/\//i.test(sql7) && !/DATABASE_URL\s*=/.test(sql7));
const sql8 = readFileSync(join(root, "sql/008.sql"), "utf8");
assert(
  "sql/008.sql suscripción Flow",
  /flow_customer_id/.test(sql8) &&
    /flow_subscription_id/.test(sql8) &&
    /flow_plan_id/.test(sql8) &&
    /ADD COLUMN IF NOT EXISTS/i.test(sql8),
);
assert("sql/008.sql sin secretos", !/postgres(ql)?:\/\//i.test(sql8) && !/DATABASE_URL\s*=/.test(sql8));
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
const empJs = [
  "js/app-empresa.js",
  "js/empresa-trabajadores.js",
  "js/empresa-documentos.js",
  "js/empresa-nomina.js",
  "js/empresa-lre.js",
]
  .map((f) => readFileSync(join(root, f), "utf8"))
  .join("\n");
const empDocJs = readFileSync(join(root, "js/empresa-documentos.js"), "utf8");
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
assert("empresa.html Pasar a Pro", /btnPasarPro/.test(empHtml) && /14\.990/.test(empHtml));
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
    /descargarNomina/.test(empJs) &&
    /\/api\/movimiento/.test(readFileSync(join(root, "js/plan.js"), "utf8")),
);
assert(
  "app-empresa refresca la cabecera al entrar",
  /refreshAccountNav/.test(empJs),
);
assert(
  "app-empresa checkout y retorno de pago",
  /startProCheckout/.test(empJs) &&
    /pago === "ok"/.test(empJs) &&
    /Pro se activa cuando Mercado Pago o Flow confirman/.test(empJs) &&
    /\/api\/checkout/.test(readFileSync(join(root, "js/checkout.js"), "utf8")) &&
    /provider/.test(readFileSync(join(root, "js/checkout.js"), "utf8")) &&
    !/emp\.plan\s*=\s*["']pro["']/.test(empJs),
);
const bajarPdfSrc = empDocJs.slice(empDocJs.indexOf("async function bajarPdf"), empDocJs.indexOf('el("btnPdfLiquidacion")'));
assert(
  "Descargar PDF no cuenta movimiento si falla el almacenamiento",
  /no_storage/.test(bajarPdfSrc) &&
    /el almacenamiento no está configurado/.test(bajarPdfSrc) &&
    bajarPdfSrc.indexOf("apiDownloadPdf") < bajarPdfSrc.indexOf("consumirMovimientos") &&
    bajarPdfSrc.indexOf("if (!blob)") < bajarPdfSrc.indexOf("consumirMovimientos") &&
    bajarPdfSrc.indexOf("consumirMovimientos") > bajarPdfSrc.indexOf("return;"),
);
const docSrc = readFileSync(join(root, "api/documento.js"), "utf8");
const docLibSrc = readFileSync(join(root, "api/_documento.js"), "utf8");
assert(
  "documento no_storage antes de insertar movimientos",
  /if \(!hasR2\(\)\) return noStorage/.test(docSrc) &&
    docSrc.indexOf("if (!hasR2()) return noStorage(res)") < docSrc.indexOf("commit: true") &&
    docLibSrc.indexOf("await r2Put") >= 0 &&
    docSrc.indexOf("commit: false") < docSrc.indexOf("commit: true") &&
    docSrc.indexOf("commit: false") > docSrc.indexOf("if (!hasR2()) return noStorage(res)"),
);
assert(
  "enviar no fusiona PDF de varios trabajadores",
  !/mergePdfs/.test(readFileSync(join(root, "api/enviar.js"), "utf8")) &&
    /generarYGuardarPdf/.test(readFileSync(join(root, "api/enviar.js"), "utf8")),
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
  "css panel calendario con min-width, sin display flex en el bloque base",
  /\.date-field\s+\.picker-panel\s*\{[^}]*min-width:\s*max\(100%,\s*18\.5rem\)/.test(
    readFileSync(join(root, "css/app.css"), "utf8"),
  ) &&
    !/\.date-field\s+\.picker-panel\s*\{[^}]*display:\s*flex/.test(
      readFileSync(join(root, "css/app.css"), "utf8"),
    ),
);
assert(
  "fecha como calendario, no tres selects",
  /createDateField/.test(readFileSync(join(root, "js/picker.js"), "utf8")) &&
    /date-cal-grid/.test(readFileSync(join(root, "js/picker.js"), "utf8")) &&
    /createDateField/.test(readFileSync(join(root, "js/ui.js"), "utf8")) &&
    !/data-pick-d/.test(readFileSync(join(root, "js/ui.js"), "utf8")),
);
assert(
  "finiquito público desglosa feriado pendiente, proporcional y otros",
  /id="diasFeriadoPend"/.test(readFileSync(join(root, "finiquito.html"), "utf8")) &&
    /id="outFeriadoPend"/.test(readFileSync(join(root, "finiquito.html"), "utf8")) &&
    /id="outOtros"/.test(readFileSync(join(root, "finiquito.html"), "utf8")) &&
    /diasFeriadoPendiente/.test(readFileSync(join(root, "js/app-finiquito.js"), "utf8")),
);
assert("empresa.html resumen de finiquito", /id="finResumen"/.test(empHtml) && /id="finOutPartidas"/.test(empHtml));
assert("admin.html noindex", /noindex/.test(readFileSync(join(root, "admin.html"), "utf8")));
const adminHtml = readFileSync(join(root, "admin.html"), "utf8");
const adminJs = readFileSync(join(root, "js/app-admin.js"), "utf8");
assert(
  "admin tres pestañas Suscripciones Producto Tráfico",
  /data-tab="suscripciones"/.test(adminHtml) &&
    /data-tab="producto"/.test(adminHtml) &&
    /data-tab="trafico"/.test(adminHtml) &&
    /Tráfico \(GA4\)/.test(adminHtml) &&
    /data-tab-panel="suscripciones"/.test(adminHtml),
);
assert(
  "admin sin hashes en la UI",
  !/\$argon2/i.test(adminHtml) && !/\$argon2/i.test(adminJs),
);
assert("admin no pide claves GA4", !/GA4_SERVICE_ACCOUNT|private_key|BEGIN PRIVATE/i.test(adminHtml));
assert(
  "admin no inventa visitas",
  /GA4 no está conectado/.test(adminJs) && /no se muestran visitas inventadas/i.test(adminJs),
);
assert("admin excepción de plan", /excepci[oó]n/i.test(adminHtml) && /override de emergencia/i.test(adminJs));
assert(
  "admin pinta empresas tras cargar",
  /renderResumen\(data\.summary,\s*data\.listed\)/.test(adminJs) &&
    /renderCompanies\(companies\)/.test(adminJs),
);
assert("cookie admin haberes_admin", /haberes_admin/.test(readFileSync(join(root, "api/_admin.js"), "utf8")));
assert(
  "admin sin clave por defecto",
  !/changeme|admin123|haberes-admin|DEFAULT_PASSWORD/i.test(readFileSync(join(root, "api/_admin.js"), "utf8")),
);
assert(
  "GA4 aliases de entorno",
  /GA4_PROPERTY_ID/.test(readFileSync(join(root, "api/_ga4.js"), "utf8")) &&
    /GOOGLE_ANALYTICS_PROPERTY_ID/.test(readFileSync(join(root, "api/_ga4.js"), "utf8")) &&
    /GA4_SERVICE_ACCOUNT_JSON/.test(readFileSync(join(root, "api/_ga4.js"), "utf8")) &&
    /GOOGLE_APPLICATION_CREDENTIALS_JSON/.test(readFileSync(join(root, "api/_ga4.js"), "utf8")),
);
assert(
  "sin tracker casero de visitas",
  !/geolocation|ipapi|ip-api|pageview.?pixel/i.test(readFileSync(join(root, "api/_ga4.js"), "utf8")) &&
    !/geolocation|ipapi|pageview.?pixel/i.test(adminJs),
);
assert(
  "admin-companies no selecciona password_hash",
  !/password_hash/.test(readFileSync(join(root, "api/admin-companies.js"), "utf8")),
);
const preciosHtml = readFileSync(join(root, "precios.html"), "utf8");
assert(
  "precios: Gratis vs Pro mensual automático",
  /Gratis/.test(preciosHtml) &&
    /14\.990/.test(preciosHtml) &&
    /5(, de a uno| documentos)/i.test(preciosHtml) &&
    /CSV\/XLSX/.test(preciosHtml) &&
    /Pagar con Mercado Pago/.test(preciosHtml) &&
    /Pagar con Flow/.test(preciosHtml) &&
    /suscripci[oó]n mensual/i.test(preciosHtml) &&
    /class="compare"/.test(preciosHtml) &&
    /confirmaci[oó]n del pago/i.test(preciosHtml) &&
    !/webhook/i.test(preciosHtml) &&
    !/31 d[ií]as/i.test(preciosHtml) &&
    !/pulse de nuevo/i.test(preciosHtml) &&
    !/No hay cobro con tarjeta/i.test(preciosHtml) &&
    !/a[uú]n no se cobra/i.test(preciosHtml),
);
const css = readFileSync(join(root, "css/app.css"), "utf8");
assert(
  "css [hidden] global con display none !important",
  /(?:^|\n)\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(css),
);
assert(
  "css hamburguesa i no intercepta el clic",
  /\.nav-burger i\s*\{[^}]*pointer-events:\s*none/.test(css),
);
assert(
  "css cajón fixed a viewport y oculto de verdad",
  /\.nav-drawer\s*\{[\s\S]*?position:\s*fixed/.test(css) &&
    /\.nav-drawer\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(css),
);
assert(
  "css radios recortados, no absolute sueltos",
  /\.seg label \{[\s\S]*position:\s*relative/.test(css) &&
    /clip-path:\s*inset\(50%\)/.test(css) &&
    !/\.seg input \{\s*position:\s*absolute;\s*opacity:\s*0/.test(css),
);
assert(
  "css --on-ink crema de día y verde de noche",
  /:root\s*\{[\s\S]*?--on-ink:\s*#f6f4ef/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--on-ink:\s*#04231a/.test(css),
);
assert(
  "css texto sobre --ink usa --on-ink",
  /\.btn\s*\{[\s\S]*?color:\s*var\(--on-ink\)/.test(css) &&
    /\.btn:hover\s*\{[\s\S]*?color:\s*var\(--on-ink\)/.test(css) &&
    /\.seg input:checked \+ span[\s\S]*?color:\s*var\(--on-ink\)/.test(css) &&
    /\.steps li::before[\s\S]*?color:\s*var\(--on-ink\)/.test(css) &&
    /\.ws-tab\[aria-selected="true"\][\s\S]*?color:\s*var\(--on-ink\)/.test(css),
);
assert(
  "css cream #f6f4ef en --on-ink de día",
  /:root\s*\{[\s\S]*?--on-ink:\s*#f6f4ef/.test(css) &&
    (css.match(/#f6f4ef/g) || []).length >= 1,
);
assert(
  "css --warn-line cálido, notice sin negro",
  /:root\s*\{[\s\S]*?--warn-line:/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--warn-line:\s*#6b5a30/.test(css) &&
    /\.notice\s*\{[\s\S]*?border:\s*1px solid var\(--warn-line\)/.test(css) &&
    !/\.notice\s*\{[^}]*#000/.test(css),
);
assert(
  "css noche --line y --line-strong discretos",
  /html\[data-theme="night"\]\s*\{[\s\S]*?--line:\s*#273029/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--line-strong:\s*#3a453f/.test(css),
);
assert(
  "css picker elevado y opción seleccionada obvia de noche",
  /\.picker-panel\s*\{[\s\S]*?background:\s*var\(--surface-2\)/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--surface-2:\s*#181d1b/.test(css) &&
    /\.picker-option\[aria-selected="true"\]/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--option-on-bg:\s*var\(--ink\)/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--option-on-fg:\s*var\(--on-ink\)/.test(css),
);
assert("css dos columnas desde 900px", /@media \(min-width: 900px\)/.test(css));
assert(
  "index y como describen Gratis/Pro",
  /5 documentos/i.test(readFileSync(join(root, "index.html"), "utf8")) &&
    /14\.990/.test(readFileSync(join(root, "index.html"), "utf8")) &&
    /5 documentos/i.test(readFileSync(join(root, "como.html"), "utf8")) &&
    /Registre su empresa/i.test(readFileSync(join(root, "como.html"), "utf8")) &&
    /Pase a Pro/i.test(readFileSync(join(root, "como.html"), "utf8")),
);
const r2src = readFileSync(join(root, "api/_r2.js"), "utf8");
assert("R2 sin CORS público", !/Access-Control-Allow-Origin/i.test(r2src) && !/r2\.dev/.test(r2src));
assert("R2 lee solo process.env", /R2_ACCOUNT_ID/.test(r2src) && /process\.env/.test(r2src));
assert("R2 no imprime secretos", !/console\.(log|info|debug|warn|error)/.test(r2src));
const mpSrc = readFileSync(join(root, "api/_mp.js"), "utf8") + readFileSync(join(root, "api/checkout.js"), "utf8") + readFileSync(join(root, "api/mp-webhook.js"), "utf8");
assert("MP no imprime secretos", !/console\.(log|info|debug|warn|error)/.test(mpSrc));
assert(
  "MP acepta alias de token y secreto",
  /mp_access_token/.test(mpSrc) &&
    /MP_ACCESS_YOKEN/.test(mpSrc) &&
    /MERCADOPAGO_ACCESS_TOKEN/.test(mpSrc) &&
    /MP_ACCESS_TOKEN_PROD/.test(mpSrc) &&
    /MERCADOPAGO_WEBHOOK_SECRET/.test(mpSrc) &&
    /notification_url/.test(mpSrc) &&
    /external_reference/.test(mpSrc),
);
const flowSrc =
  readFileSync(join(root, "api/_flow.js"), "utf8") +
  readFileSync(join(root, "api/flow-webhook.js"), "utf8") +
  readFileSync(join(root, "api/checkout.js"), "utf8");
assert("Flow no imprime secretos", !/console\.(log|info|debug|warn|error)/.test(flowSrc));
assert(
  "Flow acepta alias de apiKey y secretKey",
  /FLOW_API_KEY/.test(flowSrc) &&
    /FLOW_APIKEY/.test(flowSrc) &&
    /FLOW_API_YKEY/.test(flowSrc) &&
    /FLOW_SECRET_KEY/.test(flowSrc) &&
    /FLOW_SECREY_KEY/.test(flowSrc) &&
    /SECRET_KEY/.test(flowSrc) &&
    /payment\/create/.test(flowSrc) &&
    /payment\/getStatus/.test(flowSrc) &&
    /plans\/create/.test(flowSrc) &&
    /customer\/create/.test(flowSrc) &&
    /customer\/register/.test(flowSrc) &&
    /subscription\/create/.test(flowSrc) &&
    /urlConfirmation/.test(flowSrc),
);
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
assert("me incluye providers de cobro", /providers:\s*configuredProviders\(\)/.test(meSrc));
const adminMeSrc = readFileSync(join(root, "api/admin-me.js"), "utf8");
assert("admin-me incluye storage boolean", /storage:\s*hasR2\(\)/.test(adminMeSrc));
assert(
  "reset.html pide newPassword",
  /newPassword/.test(readFileSync(join(root, "js/app-reset.js"), "utf8")) &&
    /\/api\/reset-confirm/.test(readFileSync(join(root, "js/app-reset.js"), "utf8")),
);
assert(
  "privacidad: local + mindicador + cobro Mercado Pago + no venta",
  /localStorage|este navegador/i.test(readFileSync(join(root, "privacidad.html"), "utf8")) &&
    /mindicador\.cl/.test(readFileSync(join(root, "privacidad.html"), "utf8")) &&
    /Mercado Pago/.test(readFileSync(join(root, "privacidad.html"), "utf8")) &&
    /Flow/.test(readFileSync(join(root, "privacidad.html"), "utf8")) &&
    /No vendemos datos personales/.test(readFileSync(join(root, "privacidad.html"), "utf8")) &&
    !/No hay cobro ni pasarela/.test(readFileSync(join(root, "privacidad.html"), "utf8")),
);
assert(
  "términos: no DT, carta no reemplaza Inspección / ministro de fe",
  /ministro de fe/.test(readFileSync(join(root, "terminos.html"), "utf8")) &&
    /Inspecci[oó]n del Trabajo/.test(readFileSync(join(root, "terminos.html"), "utf8")) &&
    /Mercado Pago/.test(readFileSync(join(root, "terminos.html"), "utf8")),
);

const cartaHint = readFileSync(join(root, "js/print.js"), "utf8") + readFileSync(join(root, "empresa.html"), "utf8");
assert(
  "Carta finiquito: firmas + no reemplaza Inspección",
  /Inspecci[oó]n del Trabajo/i.test(cartaHint) && /testigo/i.test(cartaHint),
);

console.log("\nHigiene");
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
  if (/APP_USR-|TEST-[0-9a-f-]{8,}/i.test(text)) {
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


console.log("\nLibro de Remuneraciones Electrónico (formato DT v8.0, marzo 2023)");
{
  const idxDe = (cod) => LRE_COLUMNAS.findIndex(([c]) => c === cod);
  assert("LRE: 147 columnas", LRE_COLUMNAS.length === 147, String(LRE_COLUMNAS.length));
  assert("LRE: abre con Rut trabajador (1101)", LRE_COLUMNAS[0][0] === 1101);
  assert("LRE: cierra con total indemnizaciones no tributables (5565)", LRE_COLUMNAS[146][0] === 5565);
  assert("LRE: categorías en bloque (identificación 40, haberes 49, descuentos 37)",
    idxDe(2101) === 40 && idxDe(3141) === 89 && idxDe(4151) === 126 && idxDe(5201) === 132);
  assert("LRE: orden del anexo en no imponibles (2311 tras 2305; 2347 entre 2309 y 2310)",
    idxDe(2311) === idxDe(2305) + 1 && idxDe(2347) === idxDe(2309) + 1 && idxDe(2310) === idxDe(2347) + 1);

  assert("LRE Tabla 9: códigos AFP",
    LRE_AFP.provida === 6 && LRE_AFP.planvital === 11 && LRE_AFP.cuprum === 13 &&
      LRE_AFP.habitat === 14 && LRE_AFP.uno === 19 && LRE_AFP.capital === 31 && LRE_AFP.modelo === 103);
  assert("LRE Tabla 11: Fonasa 102 e isapres abiertas",
    LRE_SALUD.fonasa.codigo === 102 && LRE_SALUD.cruzblanca.codigo === 1 &&
      LRE_SALUD.banmedica.codigo === 3 && LRE_SALUD.colmena.codigo === 4 &&
      LRE_SALUD.consalud.codigo === 9 && LRE_SALUD.vidatres.codigo === 12 &&
      LRE_SALUD.nuevamasvida.codigo === 43 && LRE_SALUD.esencial.codigo === 44);
  assert("LRE Tabla 2: 16 regiones, 13 Metropolitana, 16 Ñuble",
    LRE_REGIONES.length === 16 &&
      LRE_REGIONES.find(([c]) => c === 13)[1] === "Metropolitana" &&
      LRE_REGIONES.find(([c]) => c === 16)[1] === "Ñuble");
  assert("LRE Tabla 6: jornada 42 h ordinaria (101), 28 h parcial art. 40 bis (201)",
    codigoJornada(42) === 101 && codigoJornada(30) === 101 && codigoJornada(28) === 201 && codigoJornada(20) === 201);

  assert("LRE: RUT sin puntos, con guion, sin cero inicial",
    rutParaLre("12.345.678-5") === "12345678-5" && rutParaLre("06.876.543-2") === "6876543-2" && rutParaLre("basura") === "");
  assert("LRE: fecha dd/mm/aaaa", fechaParaLre("2023-03-01") === "01/03/2023" && fechaParaLre("") === "");
  assert("LRE: nombre de archivo rutempleador_aaaamm.csv",
    nombreArchivoLre("76.086.428-5", "2026-08") === "76086428-5_202608.csv");

  const trabajador = {
    nombre: "Ana",
    rut: "12.345.678-5",
    sueldoBase: 1000000,
    afp: "modelo",
    salud: "fonasa",
    contrato: "indefinido",
    fechaIngreso: "2023-03-01",
    gratificacionArt50: true,
    colacion: 50000,
    movilizacion: 40000,
  };
  const calc = calcularSueldo(trabajador, fallbackIndicadores());
  const csvLre = generarLre({
    trabajadores: [trabajador],
    contexto: { region: 13, comuna: 13101, mutual: 1 },
    indicadores: fallbackIndicadores(),
  });
  const [encabezado, fila] = csvLre.split("\r\n");
  const cols = encabezado.split(";");
  const vals = fila.split(";");
  const en = (cod) => vals[cols.findIndex((c) => c.endsWith(`(${cod})`))];
  const num = (cod) => Number(en(cod) || 0);

  assert("LRE: encabezado y fila con 147 campos", cols.length === 147 && vals.length === 147);
  assert("LRE: encabezado Nombre(código)", cols[0] === "Rut trabajador(1101)" && cols[146] === "Total indemnizaciones no tributables(5565)");
  assert("LRE: CRLF y cierre de línea", csvLre.includes("\r\n") && csvLre.endsWith("\r\n"));
  assert("LRE: opcional sin dato queda vacío, no cero", en("2103") === "" && en("1116") === "");
  assert("LRE: identificación (rut, fecha, región, comuna, AFP Modelo 103, Fonasa 102)",
    en("1101") === "12345678-5" && en("1102") === "01/03/2023" && en("1105") === "13" &&
      en("1106") === "13101" && en("1141") === "103" && en("1143") === "102");
  assert("LRE: montos idénticos al cálculo de la liquidación",
    num("2101") === calc.sueldoBase && num("2106") === calc.gratificacion &&
      num("3141") === calc.afp.monto && num("3143") === calc.salud.legal &&
      num("3151") === calc.cesantia.monto && num("3161") === calc.iusc && num("5501") === calc.liquido);
  assert("LRE: total haberes cuadra con sus subcategorías (5201 = 5210+5220+5230+5240)",
    num("5201") === num("5210") + num("5220") + num("5230") + num("5240") && num("5201") === calc.totalHaberes);
  assert("LRE: total descuentos cuadra (5301 = 5361+5341+5302)",
    num("5301") === num("5361") + num("5341") + num("5302") && num("5301") === calc.totalDescuentos);
  assert("LRE: aportes del empleador en 0 (borrador honesto, sin tasas inventadas)",
    en("4152") === "0" && en("4155") === "0" && en("5410") === "0");

  const bytes = codificarAnsi(csvLre);
  assert("LRE: codificación ANSI (bytes ≤ 255, ó = 243, fuera de Latin-1 degrada a ?)",
    Math.max(...bytes) <= 255 && codificarAnsi("ó")[0] === 243 && codificarAnsi("€")[0] === 0x3f);

  const csvConIngreso = parseTrabajadoresCsv(
    "nombre,rut,salud,fecha_ingreso\nAna,12.345.678-5,banmedica,01/03/2023\nLuis,9.876.543-3,fonasa,2025-01-15\n",
  );
  assert("CSV: fecha_ingreso acepta dd/mm/aaaa y aaaa-mm-dd",
    csvConIngreso[0].fechaIngreso === "2023-03-01" && csvConIngreso[1].fechaIngreso === "2025-01-15");
  assert("CSV: salud reconoce isapre específica para el LRE", csvConIngreso[0].salud === "banmedica");

  const html = readFileSync(join(root, "empresa.html"), "utf8");
  assert("empresa.html: panel LRE con descarga y manual oficial",
    html.includes("btnLreCsv") && html.includes("Libro de Remuneraciones") && html.includes("dt-docs/lre"));
  assert("empresa.html: ficha con fecha de ingreso (selector propio)", html.includes("altaFechaIngreso"));
  assert("empresa.html: fecha de término en ficha", html.includes("altaFechaTermino"));
  assert("empresa.html: novedades del mes", html.includes("Novedades del mes") && html.includes("novAusencia"));
  assert(
    "empresa.html: LRE ya no afirma 30 días fijos",
    !html.includes("usa 30 días trabajados por persona"),
  );
  const readme = readFileSync(join(root, "README.md"), "utf8");
  assert(
    "README: LRE ya no afirma 30 días fijos por persona",
    !readme.includes("se usan 30 días trabajados por persona") &&
      readme.toLowerCase().includes("novedades"),
  );

  // LRE con novedades reales
  const anaLre = inputDesdeFichaYNovedades(
    {
      nombre: "Ana Pérez",
      rut: "12.345.678-5",
      sueldoBase: 1_000_000,
      afp: "modelo",
      salud: "fonasa",
      contrato: "indefinido",
      colacion: 50_000,
      movilizacion: 40_000,
      fechaIngreso: "2023-03-01",
    },
    {
      diasAusencia: 3,
      diasLicencia: 5,
      haberesExtra: [{ nombre: "Bono producción", monto: 80_000, imponible: true }],
      descuentos: [{ nombre: "Cuota préstamo", monto: 120_000, tipo: "convencional" }],
    },
    { periodo: "2026-08" },
  );
  const csvAna = generarLre({
    trabajadores: [anaLre],
    contexto: { region: 13, comuna: 13101, mutual: 0 },
    indicadores: fallbackIndicadores(),
  });
  const colsAna = csvAna.trim().split(/\r?\n/)[0].split(";");
  const valsAna = csvAna.trim().split(/\r?\n/)[1].split(";");
  const enAna = (cod) => valsAna[colsAna.findIndex((c) => c.includes(`(${cod})`))];
  assert("LRE: 1115 = 22 días trabajados (no 30)", enAna("1115") === "22", enAna("1115"));
  assert("LRE: 1116 = 5 días licencia", enAna("1116") === "5", enAna("1116"));
  assert("LRE: 3188 = anticipos+préstamos 120000", enAna("3188") === "120000", enAna("3188"));
}

console.log("\nDías trabajados y proporcionalidad");
{
  const d22 = diasDelPeriodo({ diasAusencia: 3, diasLicencia: 5 });
  assert("3 ausencia + 5 licencia → 22 días", d22.diasTrabajados === 22 && d22.diasBase === 30);
  assert("sueldo 1e6 × 22/30 → 733333", proporcional(1_000_000, 22) === 733333);

  const ana = calcularSueldo(
    {
      sueldoBase: 1_000_000,
      afp: "modelo",
      salud: "fonasa",
      contrato: "indefinido",
      colacion: 50_000,
      movilizacion: 40_000,
      haberesExtra: [{ nombre: "Bono producción", monto: 80_000, imponible: true }],
      diasAusencia: 3,
      diasLicencia: 5,
      descuentos: [{ nombre: "Cuota préstamo", monto: 120_000, tipo: "convencional" }],
    },
    { uf: FALLBACK_UF },
  );
  assert("caso §3 imponible 813333", ana.imponible === 813333, String(ana.imponible));
  assert("caso §3 no imponible 66000", ana.noImponible === 66_000, String(ana.noImponible));
  assert("caso §3 AFP 86051", ana.afp.monto === 86_051, String(ana.afp.monto));
  assert("caso §3 salud 56933", ana.salud.monto === 56_933, String(ana.salud.monto));
  assert("caso §3 cesantía 4880", ana.cesantia.monto === 4_880, String(ana.cesantia.monto));
  assert("caso §3 total haberes 879333", ana.totalHaberes === 879_333, String(ana.totalHaberes));
  assert("caso §3 líquido 611469", ana.liquido === 611_469, String(ana.liquido));
  assert(
    "descuento con nombre en salida",
    ana.descuentos.some((d) => d.label === "Cuota préstamo" && d.monto === 120_000),
  );

  assert(
    "ingreso día 16 → diasBase 15",
    diasDelPeriodo({ periodo: "2026-08", fechaIngreso: "2026-08-16" }).diasBase === 15,
  );
  assert(
    "término día 10 → diasBase 10",
    diasDelPeriodo({ periodo: "2026-08", fechaTermino: "2026-08-10" }).diasBase === 10,
  );
  assert(
    "término día 31 → diasBase 30",
    diasDelPeriodo({ periodo: "2026-08", fechaTermino: "2026-08-31" }).diasBase === 30,
  );
  assert(
    "mes 31 y mes 28 → mismo diasBase 30 si trabaja completo",
    diasDelPeriodo({ periodo: "2026-08" }).diasBase === 30 &&
      diasDelPeriodo({ periodo: "2026-02" }).diasBase === 30,
  );
  assert(
    "vacaciones no restan días trabajados",
    diasDelPeriodo({ diasVacaciones: 15 }).diasTrabajados === 30,
  );
  assert(
    "pagaCarencia false: licencia 5 descuenta 5",
    diasDelPeriodo({ diasLicencia: 5, pagaCarencia: false }).diasTrabajados === 25,
  );
  assert(
    "pagaCarencia true + licencia 5: paga 3 de carencia → 28",
    diasDelPeriodo({ diasLicencia: 5, pagaCarencia: true }).diasTrabajados === 28,
  );

  const he30 = calcularSueldo(
    { sueldoBase: 800_000, horasExtras: 8, jornada: 42 },
    { uf: FALLBACK_UF },
  );
  const he15 = calcularSueldo(
    {
      sueldoBase: 800_000,
      horasExtras: 8,
      jornada: 42,
      diasTrabajadosManual: 15,
      diasAusencia: 0,
      diasLicencia: 0,
    },
    { uf: FALLBACK_UF },
  );
  assert(
    "horas extras no se proporcionalizan",
    he30.montoHorasExtras === he15.montoHorasExtras && he30.montoHorasExtras > 0,
    `${he30.montoHorasExtras} vs ${he15.montoHorasExtras}`,
  );

  const capped = diasDelPeriodo({ diasAusencia: 40, diasLicencia: 10 });
  assert(
    "días trabajados nunca negativos ni > diasBase",
    capped.diasTrabajados >= 0 &&
      capped.diasTrabajados <= capped.diasBase &&
      capped.avisoTope === true,
  );
}

console.log("\nDescuentos y artículo 58");
{
  const vOk = validarArt58({
    totalHaberes: 879_333,
    descuentos: [{ monto: 120_000, tipo: "convencional" }],
  });
  assert("tope 15 % de 879333 = 131900", vOk.tope15 === 131_900);
  assert("120000 no dispara aviso art. 58", vOk.supera15 === false);

  const vEx = validarArt58({
    totalHaberes: 879_333,
    descuentos: [{ monto: 150_000, tipo: "convencional" }],
  });
  assert("150000 dispara exceso 18100", vEx.supera15 && vEx.exceso15 === 18_100);

  const vAnt = validarArt58({
    totalHaberes: 879_333,
    descuentos: [{ monto: 500_000, tipo: "anticipo" }],
  });
  assert("anticipo no dispara aviso del 15 %", vAnt.supera15 === false && vAnt.anticipos === 500_000);

  const neg = calcularSueldo(
    {
      sueldoBase: 100_000,
      descuentos: [{ nombre: "Préstamo", monto: 500_000, tipo: "convencional" }],
      diasAusencia: 0,
    },
    { uf: FALLBACK_UF },
  );
  assert("líquido negativo señalado", neg.liquidoNegativo === true && neg.liquido < 0);
}

console.log("\nNovedades por planilla");
{
  const novPath = join(root, "ejemplos/novedades.csv");
  assert("existe ejemplos/novedades.csv", existsSync(novPath));
  const parsed = parseNovedadesCsv(readFileSync(novPath, "utf8"), {
    rutsConocidos: ["12345678-5", "9876543-3", "11111111-1"],
  });
  assert("parseNovedadesCsv: 3 filas", parsed.rows.length === 3, String(parsed.rows.length));
  assert(
    "Ana: 3 ausencia, 5 licencia, descuento convencional",
    parsed.rows[0].diasAusencia === 3 &&
      parsed.rows[0].diasLicencia === 5 &&
      parsed.rows[0].descuentos[0]?.tipo === "convencional" &&
      parsed.rows[0].descuentos[0]?.monto === 120_000,
  );
  assert(
    "Luis: anticipo no convencional",
    parsed.rows[1].descuentos[0]?.tipo === "anticipo",
  );
  const unk = parseNovedadesCsv("rut,dias_ausencia\n1.234.567-4,1\n", {
    rutsConocidos: ["12345678-5"],
  });
  assert(
    "RUT desconocido en rechazados",
    unk.rows.length === 0 && unk.rechazados.some((r) => r.rut.includes("1.234.567")),
  );
  const dup = parseNovedadesCsv("rut,dias_ausencia\n12.345.678-5,1\n12.345.678-5,2\n");
  assert("RUT duplicado invalida archivo", Boolean(dup.error) && /duplicado/i.test(dup.error));
}

assert(
  "disclaimer constante presente",
  DISCLAIMER.includes("Documento generado por Haberes") &&
    DISCLAIMER.includes("Dirección del Trabajo") &&
    DISCLAIMER.includes("Previred") &&
    !/inteligencia artificial|generada por IA|estimaci[oó]n de software/i.test(DISCLAIMER),
);
assert(
  "disclaimer finiquito Inspección",
  DISCLAIMER_FINIQUITO.includes("Inspección del Trabajo") &&
    /pago efectivo/i.test(DISCLAIMER_FINIQUITO) &&
    !/inteligencia artificial|generada por IA|estimaci[oó]n de software/i.test(DISCLAIMER_FINIQUITO),
);

console.log("\nProducto público sin IA");
{
  const banned = /inteligencia artificial|generada por IA|Estimaci[oó]n con IA|estimaci[oó]n de software/i;
  const skipNames = new Set(["verify.mjs"]);
  function walk(dir, acc = []) {
    for (const name of readdirSync(dir)) {
      if (name === ".git" || name === "node_modules") continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p, acc);
      else acc.push(p);
    }
    return acc;
  }
  let hit = "";
  for (const p of walk(root)) {
    if (skipNames.has(p.split("/").pop())) continue;
    if (!/\.(html|js|mjs|md|xml|txt|css)$/.test(p)) continue;
    const text = readFileSync(p, "utf8");
    if (banned.test(text)) {
      hit = p.replace(root + "/", "");
      break;
    }
  }
  assert("repo público sin frases de IA", !hit, hit);
}

console.log("\nPDF liquidación y finiquito");
{
  const { inflateSync } = await import("node:zlib");
  function pdfText(buf) {
    const raw = Buffer.from(buf).toString("latin1");
    const parts = [];
    const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let m;
    while ((m = re.exec(raw))) {
      let content = m[1];
      try {
        content = inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
      } catch {
        /* uncompressed */
      }
      for (const hx of content.matchAll(/<([0-9A-Fa-f]+)>/g)) {
        parts.push(Buffer.from(hx[1], "hex").toString("latin1"));
      }
    }
    return parts.join("\n");
  }
  const { buildLiquidacionPdf, buildFiniquitoPdf, PDF_LAYOUT } = await import("../api/_pdf.js");
  const { liquidacionHtml, cartaFiniquitoHtml } = await import("../js/print.js");
  assert("márgenes PDF ≥ 48pt", PDF_LAYOUT.margin >= 48);
  assert("logo máx ~56pt", PDF_LAYOUT.logoMaxH === 56);
  assert("firma máx ~48pt", PDF_LAYOUT.firmaMaxH === 48);
  assert("hueco líquido ≥ 16pt", PDF_LAYOUT.gapAfterDescuentos >= 16);
  assert("hueco firmas ≥ 40pt", PDF_LAYOUT.gapBeforeFirmas >= 40);

  const muro =
    "Artículo 161 del Código del Trabajo: el empleador podrá poner término al contrato invocando necesidades de la empresa. ".repeat(
      8,
    );
  assert("texto legal corto se conserva", resumirTextoLegal("Mutuo acuerdo.", "Art. 159") === "Mutuo acuerdo.");
  assert(
    "texto legal largo se resume",
    resumirTextoLegal(muro, "Art. 161 — Necesidades de la empresa").includes("Art. 161") &&
      resumirTextoLegal(muro, "Art. 161 — Necesidades de la empresa").length < TEXTO_LEGAL_MAX,
  );

  const calc = calcularSueldo(
    {
      sueldoBase: 1_000_000,
      afp: "modelo",
      salud: "fonasa",
      contrato: "indefinido",
      colacion: 40000,
      cargo: "Administrativa",
    },
    { uf: FALLBACK_UF },
  );
  const empresa = {
    razonSocial: "Gard SpA",
    rut: "76.123.456-0",
    giro: "Servicios de seguridad",
    direccion: "Santiago",
  };
  const trabajador = { nombre: "Ana Pérez", rut: "12.345.678-5", cargo: "Administrativa" };
  const png1 = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const liqPdf = await buildLiquidacionPdf({
    empresa,
    trabajador,
    periodo: "Agosto 2026",
    calc,
    logoBytes: png1,
    logoType: "image/png",
    firmaBytes: png1,
    firmaType: "image/png",
  });
  const liqText = pdfText(liqPdf);
  assert("PDF liquidación no vacío", liqPdf.length > 800);
  assert("PDF liquidación título", /LIQUIDACI/.test(liqText));
  assert("PDF liquidación trabajador en bloque", /Trabajador/.test(liqText) && /Administrativa/.test(liqText));
  assert("PDF liquidación tablas", /Haberes/.test(liqText) && /Descuentos/.test(liqText) && /L/.test(liqText));
  assert("PDF liquidación sin IA", !bannedPdf(liqText));
  assert("PDF liquidación disclaimer Haberes", /Haberes/.test(liqText) && /Previred/.test(liqText));

  const full = calcularFiniquitoCompleto(
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
  const finPdf = await buildFiniquitoPdf({
    empresa,
    trabajador: { ...trabajador, ingreso: "2020-01-15", termino: "2023-08-20" },
    fin: full,
    ciudad: "Santiago",
    logoBytes: png1,
    logoType: "image/png",
    firmaBytes: png1,
    firmaType: "image/png",
  });
  const finText = pdfText(finPdf);
  assert("PDF finiquito no vacío", finPdf.length > 800);
  assert("PDF finiquito título", /CARTA DE FINIQUITO/.test(finText));
  assert("PDF finiquito Total, no estimado", /Total/.test(finText) && !/Total estimado/.test(finText));
  assert("PDF finiquito sin muro art. 163", !/tope de 330 d/.test(finText));
  assert("PDF finiquito sin IA", !bannedPdf(finText));
  assert("PDF finiquito Inspección o pago efectivo", /Inspecci|pago efectivo/.test(finText));

  const prevLiq = liquidacionHtml({ empresa, trabajador, periodo: "Agosto 2026", calc });
  const prevFin = cartaFiniquitoHtml({
    empresa,
    trabajador: { ...trabajador, ingreso: "15-01-2020", termino: "20-08-2023" },
    fin: full,
  });
  assert("preview liquidación grilla 2 columnas", /grid-template-columns: 1fr 1fr/.test(prevLiq) && /Trabajador/.test(prevLiq));
  assert("preview líquido con aire", /margin-top: 16pt/.test(prevLiq) && /Líquido a pago/.test(prevLiq));
  assert("preview firma sobre la línea", /firma-line/.test(prevLiq) && /max-height: 48px/.test(prevLiq));
  assert("preview finiquito Total", /<td>Total<\/td>/.test(prevFin) && !/Total estimado/.test(prevFin));
  assert("preview finiquito sin muro 330", !/tope de 330 d/.test(prevFin));
  assert(
    "preview sin IA",
    !bannedPdf(prevLiq) && !bannedPdf(prevFin) && /Documento generado por Haberes/.test(prevLiq),
  );
}

function bannedPdf(text) {
  return /inteligencia artificial|generada por IA|Estimaci[oó]n con IA|estimaci[oó]n de software/i.test(text);
}

console.log("\nInstituciones financieras");
{
  const { INSTITUCIONES_CL, buscarInstitucion, FUENTE_CODIGOS } = await import("../js/bancos.js");
  assert("fuente de códigos documentada", Boolean(FUENTE_CODIGOS));
  const by = (c) => INSTITUCIONES_CL.find((i) => i.codigo === c);
  assert("053 es Banco Ripley", by("053")?.nombre === "Banco Ripley");
  assert("055 es Banco Consorcio", by("055")?.nombre === "Banco Consorcio");
  const codes = INSTITUCIONES_CL.map((i) => i.codigo);
  assert(
    "códigos únicos de 3 dígitos ordenados",
    codes.every((c) => /^\d{3}$/.test(c)) &&
      new Set(codes).size === codes.length &&
      [...codes].sort().join() === codes.join(),
  );
  assert(
    "prepago y cooperativas presentes",
    ["743", "875", "730", "732", "738", "741", "672", "504"].every((c) => by(c)),
  );
  assert(
    "cada institución tiene tipo válido",
    INSTITUCIONES_CL.every((i) => ["banco", "cooperativa", "prepago", "otro"].includes(i.tipo)),
  );
  assert("alias mercado pago → 875", buscarInstitucion("mercado pago")?.codigo === "875");
  assert("alias BancoEstado → 012", buscarInstitucion("BancoEstado")?.codigo === "012");
  assert("alias banco de chile → 001", buscarInstitucion("banco de chile")?.codigo === "001");
}

console.log("\nPerfiles de nómina");
{
  const {
    PERFILES_NOMINA,
    renderNomina,
    perfilPorId,
    largoFijoEsperado,
    aLatin1,
  } = await import("../js/nomina.js");
  const ids = PERFILES_NOMINA.map((p) => p.id);
  assert("perfiles id únicos", new Set(ids).size === ids.length);
  assert(
    "perfiles salida y verificado",
    PERFILES_NOMINA.every(
      (p) => ["csv", "txt_fijo", "xlsx"].includes(p.salida) && typeof p.verificado === "boolean",
    ),
  );
  assert(
    "verificado implica fuente",
    PERFILES_NOMINA.every((p) => !p.verificado || (p.fuente && String(p.fuente).trim())),
  );
  const fijo = perfilPorId("generico_txt_fijo");
  const filas = [
    {
      nombre: "Ana Pérez",
      rut: "12.345.678-5",
      banco: "001",
      bancoNombre: "Banco de Chile",
      tipo_cuenta: "corriente",
      nro_cuenta: "12345678",
      email: "ana@empresa.cl",
      monto: 988656,
      glosa: "Sueldo",
    },
  ];
  const outFijo = renderNomina(fijo, filas);
  const line = new TextDecoder("latin1").decode(outFijo.bytes).split(/\r?\n/).filter(Boolean)[0];
  assert(
    "txt fijo largo constante",
    line.length === largoFijoEsperado(fijo),
    `${line.length} vs ${largoFijoEsperado(fijo)}`,
  );
  const csvProf = perfilPorId("generico_csv");
  const outCsv = renderNomina(csvProf, filas);
  const csvText = new TextDecoder("latin1").decode(outCsv.bytes);
  assert(
    "CSV sin comentarios ni filas en blanco antes del encabezado",
    !csvText.startsWith("#") && !csvText.startsWith("\r") && !csvText.startsWith("\n") &&
      csvText.split(/\r?\n/)[0].includes("rut_cuerpo"),
  );
  assert("monto entero sin separadores", /0*988656/.test(csvText) && !/988\.656/.test(csvText) && !/988,656/.test(csvText));
  const xOut = renderNomina(perfilPorId("generico_xlsx"), filas);
  const { readXlsxFirstSheet: rx } = await import("../js/xlsx.js");
  // Léame is second sheet; first sheet is data without comment rows
  const first = await rx(xOut.bytes);
  assert("xlsx datos sin fila de aviso", first[0]?.[0] === "nombre" && Number(first[1]?.[6]) === 988656);
  assert("latin1 mapa directo", aLatin1("á")[0] === 0xe1 && aLatin1("€")[0] === 0x3f);
  const nominaEj = await rx(new Uint8Array(readFileSync(join(root, "ejemplos/nomina-pago.xlsx"))));
  assert(
    "nomina-pago ejemplo Ana 988656",
    nominaEj.some((row) => String(row[0]).includes("Ana") && Number(row[6]) === 988656),
    JSON.stringify(nominaEj.slice(0, 3)),
  );
}

console.log("\nTema noche");
{
  function parseTokens(block) {
    const map = {};
    for (const m of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
      map[m[1]] = m[2].trim();
    }
    return map;
  }
  function hexLum(hex) {
    const h = hex.replace("#", "").trim();
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
    const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const r = lin(n(0));
    const g = lin(n(2));
    const b = lin(n(4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrast(a, b) {
    const L1 = hexLum(a);
    const L2 = hexLum(b);
    if (L1 == null || L2 == null) return 99;
    const hi = Math.max(L1, L2);
    const lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  }
  const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  const nightBlock = css.match(/html\[data-theme="night"\]\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  const day = parseTokens(rootBlock);
  const night = parseTokens(nightBlock);
  const skip = new Set(["font", "ease", "shadow", "ring", "radius"]);
  const missing = Object.keys(day).filter((k) => !skip.has(k) && !(k in night) && !k.startsWith("s-") && !k.startsWith("t-") && !k.startsWith("r-") && !k.startsWith("dur-") && !["touch", "header-h", "shell", "sab", "sat"].includes(k));
  // Tokens de métrica tipografía/espaciado pueden omitirse en noche; exigir semánticos y superficies
  const must = ["paper", "surface", "surface-2", "surface-3", "text", "muted", "line", "danger", "success", "accent", "on-danger", "on-success", "on-accent", "paper-doc"];
  assert(
    "tokens noche cubren superficies y semánticos",
    must.every((k) => night[k]),
    must.filter((k) => !night[k]).join(","),
  );
  const Lp = hexLum(night.paper);
  const Ls = hexLum(night.surface);
  const Ls2 = hexLum(night["surface-2"]);
  const Ls3 = hexLum(night["surface-3"]);
  assert(
    "noche luminancia paper < surface < surface-2 < surface-3",
    Lp < Ls && Ls < Ls2 && Ls2 < Ls3,
    JSON.stringify({ Lp, Ls, Ls2, Ls3 }),
  );
  assert("contraste text/surface noche ≥ 4.5", contrast(night.text, night.surface) >= 4.5);
  assert("contraste muted/surface noche ≥ 4.5", contrast(night.muted, night.surface) >= 4.5);
  assert("contraste on-danger/danger ≥ 4.5", contrast(night["on-danger"], night.danger) >= 4.5);
  assert("contraste on-success/success ≥ 4.5", contrast(night["on-success"], night.success) >= 4.5);
  assert("contraste on-accent/accent ≥ 4.5", contrast(night["on-accent"], night.accent) >= 4.5);
  assert("contraste field-line/control-bg noche ≥ 3", contrast(night["field-line"], night["control-bg"]) >= 3);
  assert("contraste field-line/control-bg día ≥ 3", contrast(day["field-line"], day["control-bg"]) >= 3);
  const withoutPrint = css.replace(/@media print\s*\{[\s\S]*?\n\}/g, "");
  // Lista blanca: tokens de papel/primer plano de día (--paper-doc, --on-*)
  const withoutTokens = withoutPrint.replace(/--[\w-]+:\s*#[0-9a-fA-F]{3,8}\b/g, "");
  const whites = withoutTokens.match(/#fff(?:fff)?\b/gi) || [];
  assert(
    "sin #fff literal fuera de @media print y tokens",
    whites.length === 0,
    whites.join(","),
  );
}

assert(
  "enviar fail-closed no_mail y no_storage",
  /no_mail/.test(readFileSync(join(root, "api/enviar.js"), "utf8")) &&
    /mailConfigured\(\)/.test(readFileSync(join(root, "api/enviar.js"), "utf8")) &&
    /no_storage/.test(readFileSync(join(root, "api/enviar.js"), "utf8")) &&
    /sendDocumentEmail/.test(readFileSync(join(root, "api/_lib.js"), "utf8")),
);
assert("sql/006.sql envios", /CREATE TABLE IF NOT EXISTS envios/.test(readFileSync(join(root, "sql/006.sql"), "utf8")));
assert(
  "workerFromBody conserva email truncado",
  (() => {
    // lectura estática: el campo email aparece en _documento.js
    const src = readFileSync(join(root, "api/_documento.js"), "utf8");
    return /email:\s*String\(t\.email[^)]*\)\.trim\(\)\.slice\(0,\s*160\)/.test(src);
  })(),
);
assert(
  "empresa envío por correo en UI",
  /btnEnviarLiquidacion/.test(empHtml) && /btnEnviarCarta/.test(empHtml) && /\/api\/enviar/.test(readFileSync(join(root, "js/app-empresa-envio.js"), "utf8")),
);
assert(
  "index explica el servicio sin siglas en el lede",
  (() => {
    const html = readFileSync(join(root, "index.html"), "utf8");
    const m = html.match(/<p class="lede">([\s\S]*?)<\/p>/);
    const lede = m ? m[1] : "";
    return /Sin planilla, sin instalar nada/.test(lede) && !/\b(IUSC|AFP|art\.)\b/.test(lede);
  })(),
);

assert(
  "módulos empresa separados",
  existsSync(join(root, "js/empresa-trabajadores.js")) &&
    existsSync(join(root, "js/empresa-documentos.js")) &&
    existsSync(join(root, "js/empresa-nomina.js")) &&
    existsSync(join(root, "js/empresa-lre.js")) &&
    /bindEmpresaTrabajadores/.test(readFileSync(join(root, "js/app-empresa.js"), "utf8")) &&
    /bindEmpresaDocumentos/.test(readFileSync(join(root, "js/app-empresa.js"), "utf8")) &&
    /bindEmpresaNomina/.test(readFileSync(join(root, "js/app-empresa.js"), "utf8")) &&
    /bindEmpresaLre/.test(readFileSync(join(root, "js/app-empresa.js"), "utf8")),
);

/* ---------- SEO ---------- */
{
  const publicPages = [
    ["index.html", "/"],
    ["sueldo.html", "/sueldo"],
    ["finiquito.html", "/finiquito"],
    ["empresa.html", "/empresa"],
    ["como.html", "/como"],
    ["precios.html", "/precios"],
  ];
  for (const [file, path] of publicPages) {
    const html = readFileSync(join(root, file), "utf8");
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const desc = (html.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const canonical = (html.match(/rel="canonical" href="([^"]*)"/) || [])[1] || "";
    assert(`SEO title ${file}`, title.length > 0 && title.length <= 65 && !/^Haberes\b/.test(title), title);
    assert(
      `SEO description ${file}`,
      desc.length >= 110 &&
        desc.length <= 160 &&
        !/No es Dirección del Trabajo/.test(desc) &&
        !/\bIA\b/.test(desc),
      `${desc.length}:${desc}`,
    );
    assert(`SEO canonical ${file}`, canonical === `https://www.haberes.cl${path === "/" ? "/" : path}`);
    assert(
      `SEO og+twitter ${file}`,
      /property="og:title"/.test(html) &&
        /property="og:description"/.test(html) &&
        /property="og:url"/.test(html) &&
        /property="og:image"/.test(html) &&
        /name="twitter:card" content="summary_large_image"/.test(html),
    );
    assert(`SEO sin Google Fonts ${file}`, !/fonts\.googleapis\.com/.test(html));
    assert(
      `SEO charset temprano ${file}`,
      html.slice(0, 1024).includes('<meta charset="utf-8"'),
    );
    const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    assert(`SEO JSON-LD presente ${file}`, ldBlocks.length >= 1);
    for (const raw of ldBlocks) {
      let obj;
      try {
        obj = JSON.parse(raw);
      } catch {
        obj = null;
      }
      assert(`SEO JSON-LD válido ${file}`, obj && obj["@context"] && obj["@type"]);
      assert(
        `SEO sin AggregateRating/Review ${file}`,
        !/AggregateRating|"@type"\s*:\s*"Review"/.test(raw),
      );
      if (obj?.["@type"] === "FAQPage") {
        for (const q of obj.mainEntity || []) {
          assert(
            `SEO FAQ visible ${file}: ${q.name}`,
            html.includes(q.name),
          );
        }
      }
    }
  }
  assert("SEO título sueldo con calculadora y Chile", /Calculadora de sueldo líquido Chile/.test(readFileSync(join(root, "sueldo.html"), "utf8")));
  assert("SEO título finiquito con calculadora y Chile", /Calculadora de finiquito Chile/.test(readFileSync(join(root, "finiquito.html"), "utf8")));
  assert(
    "SEO H1 sueldo es calculadora Chile 2026",
    /<h1>Calculadora de sueldo l[ií]quido Chile 2026<\/h1>/.test(readFileSync(join(root, "sueldo.html"), "utf8")),
  );
  {
    const homeTitle = (readFileSync(join(root, "index.html"), "utf8").match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    assert(
      "SEO título home pymes, no calculadora",
      /pymes en Chile/.test(homeTitle) && !/calculadora/i.test(homeTitle) && homeTitle.length <= 65,
      homeTitle,
    );
  }
  {
    const liqTitle = (readFileSync(join(root, "guias/liquidacion-de-sueldo.html"), "utf8").match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    assert(
      "SEO guía liquidación informativa, sin calculadora en title",
      /liquidaci[oó]n de sueldo/i.test(liqTitle) && !/calculadora/i.test(liqTitle),
      liqTitle,
    );
  }
  {
    const finiGuideTitle = (readFileSync(join(root, "guias/finiquito.html"), "utf8").match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    assert(
      "SEO guía finiquito informativa, sin calculadora en title",
      /finiquito/i.test(finiGuideTitle) && !/calculadora/i.test(finiGuideTitle),
      finiGuideTitle,
    );
  }
  {
    const plazoHtml = readFileSync(join(root, "guias/plazo-de-pago-del-finiquito.html"), "utf8");
    assert(
      "SEO plazo finiquito 10 días hábiles art. 177",
      /10 d[ií]as h[aá]biles/i.test(plazoHtml) &&
        /177/.test(plazoHtml) &&
        /dt\.gob\.cl/.test(plazoHtml) &&
        !/al momento del t[eé]rmino de la relaci[oó]n laboral/i.test(plazoHtml),
    );
  }
  {
    const hub = readFileSync(join(root, "guias.html"), "utf8");
    assert("SEO hub /guias existe", existsSync(join(root, "guias.html")));
    assert(
      "SEO hub lista 16 guías agrupadas",
      GUIDE_SLUGS.length === 16 &&
        GUIDE_SLUGS.every((s) => hub.includes(`/guias/${s}`)) &&
        /Liquidaci[oó]n de sueldo/.test(hub) &&
        /<h2>Finiquito<\/h2>/.test(hub) &&
        /href="\/sueldo"/.test(hub) &&
        /href="\/finiquito"/.test(hub),
    );
    assert("SEO hub en sitemap", locs.includes("https://www.haberes.cl/guias"));
    assert(
      "SEO hub enlaza favicon.ico y svg",
      /href="favicon\.ico" sizes="32x32"/.test(hub) && /href="favicon\.svg" type="image\/svg\+xml"/.test(hub),
    );
  }
  assert(
    "SEO gratificación e IUSC sin constants.js en copy",
    !/js\/constants\.js/.test(readFileSync(join(root, "guias/gratificacion-legal.html"), "utf8")) &&
      !/js\/constants\.js/.test(readFileSync(join(root, "guias/impuesto-unico.html"), "utf8")),
  );
  assert(
    "SEO sueldo y finiquito tienen FAQPage",
    /"@type": "FAQPage"/.test(readFileSync(join(root, "sueldo.html"), "utf8")) &&
      /"@type": "FAQPage"/.test(readFileSync(join(root, "finiquito.html"), "utf8")),
  );
  assert("SEO fuentes autoalojadas", existsSync(join(root, "fonts/ibm-plex-sans-latin-400-normal.woff2")) && existsSync(join(root, "fonts/LICENSE")));
  assert("SEO og-default.png", existsSync(join(root, "img/og-default.png")));
  assert(
    "SEO guías del registro tienen HTML",
    GUIDE_SLUGS.every((s) => existsSync(join(root, "guias", `${s}.html`))),
  );
  assert(
    "SEO 21 causales tienen HTML",
    CAUSAL_PAGES.length === 21 &&
      CAUSAL_PAGES.every((p) => existsSync(join(root, "finiquito", `${p.slug}.html`))),
  );
  assert(
    "SEO guía finiquito tiene FAQPage + WebApplication",
    /"@type": "FAQPage"/.test(readFileSync(join(root, "guias/finiquito.html"), "utf8")) &&
      /"@type": "WebApplication"/.test(readFileSync(join(root, "guias/finiquito.html"), "utf8")),
  );
  for (const file of ["admin.html", "reset.html", "privacidad.html", "terminos.html"]) {
    assert(`SEO sin Google Fonts ${file}`, !/fonts\.googleapis\.com/.test(readFileSync(join(root, file), "utf8")));
  }
}

/* ---------- Tema y contraste (ampliado) ---------- */
{
  function hexLum(hex) {
    const h = String(hex || "").replace("#", "").trim();
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
    const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(n(0)) + 0.7152 * lin(n(2)) + 0.0722 * lin(n(4));
  }
  function contrast(a, b) {
    const L1 = hexLum(a);
    const L2 = hexLum(b);
    if (L1 == null || L2 == null) return 0;
    const hi = Math.max(L1, L2);
    const lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function parseTokens(block) {
    const out = {};
    for (const m of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
      const v = m[2].trim();
      if (v.startsWith("#")) out[m[1]] = v.slice(0, 7);
    }
    return out;
  }
  const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  const nightBlock = css.match(/html\[data-theme="night"\]\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  const day = parseTokens(rootBlock);
  const night = parseTokens(nightBlock);
  const pairs = [
    ["text", "surface"],
    ["text", "paper"],
    ["text", "surface-2"],
    ["text", "surface-3"],
    ["muted", "surface"],
    ["on-danger", "danger"],
    ["on-success", "success"],
    ["on-warn", "warn"],
    ["on-info", "info"],
    ["on-accent", "accent"],
    ["on-ink", "ink"],
  ];
  for (const [fg, bg] of pairs) {
    assert(
      `contraste noche ${fg}/${bg} ≥ 4.5`,
      contrast(night[fg], night[bg]) >= 4.5,
      String(contrast(night[fg], night[bg])),
    );
  }
  assert(
    "día luminancia surface > surface-2 > surface-3",
    hexLum(day.surface) > hexLum(day["surface-2"]) && hexLum(day["surface-2"]) > hexLum(day["surface-3"]),
    JSON.stringify({
      s: hexLum(day.surface),
      s2: hexLum(day["surface-2"]),
      s3: hexLum(day["surface-3"]),
    }),
  );
  assert("field-line declarado en ambos temas", day["field-line"] && night["field-line"]);
}

{
  console.log("\nTema e inicio");
  function listHtml(dir, acc = []) {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === ".git") continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) listHtml(p, acc);
      else if (name.endsWith(".html")) acc.push(p);
    }
    return acc;
  }
  const pages = listHtml(root);
  assert("48 páginas HTML", pages.length === 48, String(pages.length));
  for (const file of pages) {
    const html = readFileSync(file, "utf8");
    const rel = file.slice(root.length + 1);
    assert(`${rel} sin prefers-color-scheme`, !/prefers-color-scheme/.test(html));
    assert(`${rel} ic-sun e ic-moon`, /class="ic-sun"/.test(html) && /class="ic-moon"/.test(html));
  }
  const themeSrc = readFileSync(join(root, "js/theme.js"), "utf8");
  assert("js/theme.js sin prefers-color-scheme", !/prefers-color-scheme/.test(themeSrc));
  assert("js/theme.js preferred día", /function preferred\(\) \{\s*return "day";/.test(themeSrc));

  const home = readFileSync(join(root, "index.html"), "utf8");
  const demoCalc = calcularSueldo(
    {
      sueldoBase: 1_200_553,
      afp: "modelo",
      salud: "fonasa",
      contrato: "indefinido",
      gratificacionArt50: true,
    },
    { uf: FALLBACK_UF },
  );
  assert(
    "index demo montos estáticos",
    home.includes(clp(demoCalc.liquido)) &&
      home.includes(clp(demoCalc.gratificacion)) &&
      home.includes(clp(demoCalc.imponible)) &&
      home.includes(clp(demoCalc.afp.monto)) &&
      home.includes(clp(demoCalc.salud.monto)) &&
      home.includes(clp(demoCalc.cesantia.monto)) &&
      home.includes(clp(demoCalc.baseTributable)) &&
      home.includes(clp(demoCalc.iusc)) &&
      !/<output[^>]*>\s*[—\-]\s*</.test(home) &&
      !/<strong data-demo="[^"]+">\s*<\/strong>/.test(home),
  );
  assert("index un solo h1", (home.match(/<h1[\s>]/g) || []).length === 1);
  assert(
    "index slider IMM 553553 paso 1000 inicial 1200553",
    /id="homeBruto"[\s\S]*?min="553553"/.test(home) &&
      /id="homeBruto"[\s\S]*?step="1000"/.test(home) &&
      /id="homeBruto"[\s\S]*?value="1200553"/.test(home),
  );
  const faqLd = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => {
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    })
    .find((o) => o && o["@type"] === "FAQPage");
  const summaries = [...home.matchAll(/<summary>([\s\S]*?)<\/summary>/g)].map((m) =>
    m[1].replace(/<[^>]+>/g, "").trim(),
  );
  const names = (faqLd?.mainEntity || []).map((q) => q.name);
  assert(
    "index FAQPage mainEntity = details",
    names.length === 5 &&
      summaries.length === 5 &&
      names.every((n) => summaries.includes(n)) &&
      summaries.every((n) => names.includes(n)),
    JSON.stringify({ names, summaries }),
  );
  assert(
    "app-home.js importa calcularSueldo",
    /import\s*\{[^}]*calcularSueldo[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(
      readFileSync(join(root, "js/app-home.js"), "utf8"),
    ),
  );
  for (const f of [
    "ibm-plex-serif-latin-600-normal.woff2",
    "ibm-plex-serif-latin-700-normal.woff2",
    "ibm-plex-mono-latin-400-normal.woff2",
    "ibm-plex-mono-latin-500-normal.woff2",
  ]) {
    assert(`fuente ${f}`, existsSync(join(root, "fonts", f)));
  }
  const reveal = css.match(/(?:^|\n)\s*(?:\.reveal|\[data-reveal\])[^{]*\{[\s\S]*?\}/);
  if (reveal) {
    const hides = /opacity:\s*0|visibility:\s*hidden|display:\s*none/.test(reveal[0]);
    const jsScoped = /html\.js|\.js\s/.test(reveal[0]);
    assert("reveal no oculta secciones fuera de .js", !hides || jsScoped);
  } else {
    assert("reveal no oculta secciones fuera de .js", true);
  }
}

console.log(`\n${passed} ok, ${failed} fail`);
if (failed) process.exit(1);
console.log("PASS");
