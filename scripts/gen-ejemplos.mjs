/**
 * Genera ejemplos/ desde la única fuente canónica (js/csv.js + cálculo real).
 * Uso: node scripts/gen-ejemplos.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FALLBACK_UF } from "../js/constants.js";
import { CSV_CABECERA, CSV_EJEMPLO, parseTrabajadoresCsv } from "../js/csv.js";
import { calcularSueldo } from "../js/sueldo.js";
import { filasPago } from "../js/pago.js";
import { renderNomina, perfilPorId } from "../js/nomina.js";
import { writeXlsx } from "../js/xlsx.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "ejemplos");
mkdirSync(outDir, { recursive: true });

const csvText = CSV_EJEMPLO.trimEnd() + "\n";
if (!csvText.startsWith(CSV_CABECERA)) {
  throw new Error("CSV_EJEMPLO no empieza con CSV_CABECERA");
}
writeFileSync(join(outDir, "trabajadores.csv"), csvText, "utf8");

const trabajadores = parseTrabajadoresCsv(csvText);
if (trabajadores.length !== 3) throw new Error(`Se esperaban 3 trabajadores, hay ${trabajadores.length}`);

const esperados = [988656, 988031, 1570949];
for (let i = 0; i < 3; i += 1) {
  const calc = calcularSueldo(trabajadores[i], { uf: FALLBACK_UF });
  if (calc.liquido !== esperados[i]) {
    throw new Error(
      `Líquido de ${trabajadores[i].nombre}: ${calc.liquido}, esperado ${esperados[i]}`,
    );
  }
}

const header = CSV_CABECERA.split(",");
const xlsxRows = [
  header,
  ...csvText
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      // Parse simple CSV (sin comillas anidadas en el ejemplo)
      return line.split(",");
    }),
];
writeFileSync(join(outDir, "trabajadores.xlsx"), writeXlsx([{ name: "Trabajadores", rows: xlsxRows }]));

const filas = filasPago({
  trabajadores,
  indicadores: { uf: FALLBACK_UF },
  glosa: "Sueldo agosto 2026",
});
const nomina = renderNomina(perfilPorId("generico_xlsx"), filas, { filename: "nomina-pago" });
writeFileSync(join(outDir, "nomina-pago.xlsx"), nomina.bytes);

console.log("ejemplos/trabajadores.csv");
console.log("ejemplos/trabajadores.xlsx");
console.log("ejemplos/nomina-pago.xlsx");
console.log("líquidos:", filas.map((f) => f.monto).join(", "));
