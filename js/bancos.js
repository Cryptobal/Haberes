/**
 * Códigos de institución financiera Chile.
 * Fuente primaria: listado CMF (estados financieros por código de banco),
 * corroborado con tabla CLCMF (docs.shinkansen.tech, 24-04-2026) y listado Clay (03-08-2026).
 *
 * MACH y Chek: no aparece código propio en las fuentes consultadas.
 * MACH es producto de BCI (016); Chek de Banco Falabella (051).
 * Se exponen como alias visibles; confirmar contra el listado de destinos del portal
 * del banco antes de asignarles código propio.
 */
export const FUENTE_CODIGOS =
  "CMF Chile (estados financieros por código) + CLCMF Shinkansen 2026-04-24 + Clay 2026-08-03";

export const INSTITUCIONES_CL = [
  { codigo: "001", nombre: "Banco de Chile", tipo: "banco", alias: ["banco de chile", "chile", "edwards", "citi", "atlas", "credichile"] },
  { codigo: "009", nombre: "Banco Internacional", tipo: "banco", alias: ["internacional", "banco internacional"] },
  { codigo: "012", nombre: "BancoEstado", tipo: "banco", alias: ["bancoestado", "banco estado", "estado", "be"] },
  { codigo: "014", nombre: "Scotiabank Chile", tipo: "banco", alias: ["scotiabank", "scotia", "bancodesarrollo"] },
  { codigo: "016", nombre: "BCI / MACH", tipo: "banco", alias: ["bci", "tbanc", "banco nova", "mach"] },
  { codigo: "028", nombre: "Banco BICE", tipo: "banco", alias: ["bice", "banco bice"] },
  { codigo: "031", nombre: "HSBC Bank (Chile)", tipo: "banco", alias: ["hsbc"] },
  { codigo: "037", nombre: "Banco Santander", tipo: "banco", alias: ["santander", "banefe", "banco santander"] },
  { codigo: "039", nombre: "Itaú", tipo: "banco", alias: ["itau", "itaú", "corpbanca"] },
  { codigo: "041", nombre: "JP Morgan Chase Bank N.A.", tipo: "banco", alias: ["jp morgan", "jpmorgan", "chase"] },
  { codigo: "049", nombre: "Banco Security", tipo: "banco", alias: ["security", "banco security"] },
  { codigo: "051", nombre: "Banco Falabella / Chek", tipo: "banco", alias: ["falabella", "banco falabella", "chek"] },
  { codigo: "053", nombre: "Banco Ripley", tipo: "banco", alias: ["ripley", "banco ripley"] },
  { codigo: "055", nombre: "Banco Consorcio", tipo: "banco", alias: ["consorcio", "banco consorcio"] },
  { codigo: "059", nombre: "Banco BTG Pactual Chile", tipo: "banco", alias: ["btg", "btg pactual", "pactual"] },
  { codigo: "062", nombre: "Tanner Banco Digital", tipo: "banco", alias: ["tanner"] },
  { codigo: "063", nombre: "Tenpo Bank Chile", tipo: "banco", alias: ["tenpo bank"] },
  { codigo: "267", nombre: "Transbank", tipo: "otro", alias: ["transbank"] },
  { codigo: "504", nombre: "Scotiabank Azul (ex BBVA)", tipo: "banco", alias: ["scotiabank azul", "bbva", "azul"] },
  { codigo: "672", nombre: "Coopeuch", tipo: "cooperativa", alias: ["coopeuch"] },
  { codigo: "697", nombre: "La Polar Prepago", tipo: "prepago", alias: ["la polar", "polar prepago"] },
  { codigo: "699", nombre: "Tricot Prepago", tipo: "prepago", alias: ["tricot"] },
  { codigo: "729", nombre: "Prepago Los Héroes", tipo: "prepago", alias: ["los heroes", "los héroes", "prepago los heroes"] },
  { codigo: "730", nombre: "Tenpo", tipo: "prepago", alias: ["tenpo"] },
  { codigo: "732", nombre: "Tapp Caja Los Andes", tipo: "prepago", alias: ["tapp", "caja los andes", "tapp caja los andes"] },
  { codigo: "738", nombre: "Global66", tipo: "prepago", alias: ["global66", "global 66"] },
  { codigo: "739", nombre: "Haulmer Prepago", tipo: "prepago", alias: ["haulmer"] },
  { codigo: "741", nombre: "Copec Pay", tipo: "prepago", alias: ["copec", "copec pay"] },
  { codigo: "743", nombre: "Prex", tipo: "prepago", alias: ["prex"] },
  { codigo: "744", nombre: "SumUp Prepago", tipo: "prepago", alias: ["sumup"] },
  { codigo: "746", nombre: "Fintual", tipo: "prepago", alias: ["fintual"] },
  { codigo: "875", nombre: "Mercado Pago", tipo: "prepago", alias: ["mercado pago", "mercadopago", "mp"] },
];

const TIPO_LABEL = {
  banco: "Bancos",
  cooperativa: "Cooperativas",
  prepago: "Cuentas de prepago y billeteras",
  otro: "Otras instituciones",
};

function norm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function buscarInstitucion(raw) {
  const v = String(raw || "").trim();
  if (!v) return null;
  const byCode = INSTITUCIONES_CL.find((i) => i.codigo === v);
  if (byCode) return byCode;
  const m = v.match(/(\d{3})/);
  if (m) {
    const hit = INSTITUCIONES_CL.find((i) => i.codigo === m[1]);
    if (hit) return hit;
  }
  const n = norm(v);
  return (
    INSTITUCIONES_CL.find(
      (i) =>
        norm(i.nombre) === n ||
        norm(i.nombre).includes(n) ||
        i.alias.some((a) => norm(a) === n || n.includes(norm(a))),
    ) || null
  );
}

export function nombreInstitucion(raw) {
  const hit = buscarInstitucion(raw);
  if (!hit) return String(raw || "");
  return `${hit.nombre} (${hit.codigo})`;
}

export function codigoInstitucion(raw) {
  const hit = buscarInstitucion(raw);
  return hit ? hit.codigo : "";
}

/** Opciones para el selector, agrupadas por tipo. */
export function opcionesBancosAgrupadas() {
  const groups = [];
  for (const tipo of ["banco", "cooperativa", "prepago", "otro"]) {
    const items = INSTITUCIONES_CL.filter((i) => i.tipo === tipo);
    if (!items.length) continue;
    groups.push({
      label: TIPO_LABEL[tipo] || tipo,
      options: items.map((i) => ({
        value: i.codigo,
        label: `${i.nombre} (${i.codigo})`,
      })),
    });
  }
  return groups;
}

/** Lista plana compatibilidad con pickers existentes. */
export function opcionesBancosPlanas() {
  return INSTITUCIONES_CL.filter((i) => i.tipo !== "otro").map((i) => ({
    value: i.codigo,
    label: `${i.nombre} (${i.codigo})`,
    group: TIPO_LABEL[i.tipo] || i.tipo,
  }));
}
