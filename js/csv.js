import { parseNumber } from "./format.js";

const AFP_ALIASES = {
  uno: "uno",
  modelo: "modelo",
  planvital: "planvital",
  "plan vital": "planvital",
  habitat: "habitat",
  hábitat: "habitat",
  capital: "capital",
  cuprum: "cuprum",
  provida: "provida",
  provída: "provida",
};

function normHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function parseLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function mapAfp(v) {
  const k = String(v || "modelo").trim().toLowerCase();
  return AFP_ALIASES[k] || "modelo";
}

function mapSalud(v) {
  const k = String(v || "fonasa").trim().toLowerCase();
  return k.includes("isapre") ? "isapre" : "fonasa";
}

function mapContrato(v) {
  const k = String(v || "indefinido").trim().toLowerCase();
  if (k.includes("plazo") || k.includes("fijo") || k === "determinado") return "plazo_fijo";
  return "indefinido";
}

function truthy(v) {
  const k = String(v || "").trim().toLowerCase();
  return k === "1" || k === "si" || k === "sí" || k === "true" || k === "yes";
}

/**
 * CSV esperado:
 * nombre,rut,cargo,sueldo_base,afp,salud,plan_isapre,contrato,horas_extras,bonos,colacion,movilizacion,gratificacion
 */
export function parseTrabajadoresCsv(text) {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]).map(normHeader);
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseLine(lines[i]);
    const rec = {};
    headers.forEach((h, idx) => {
      rec[h] = cols[idx] ?? "";
    });
    const nombre = rec.nombre || rec.nombre_completo || rec.trabajador || "";
    if (!nombre && !rec.rut) continue;
    rows.push({
      id: `t_${Date.now()}_${i}_${Math.random().toString(16).slice(2, 8)}`,
      nombre: String(nombre).trim(),
      rut: String(rec.rut || "").trim(),
      cargo: String(rec.cargo || rec.puesto || "").trim(),
      sueldoBase: parseNumber(rec.sueldo_base || rec.sueldo || rec.base || 0),
      afp: mapAfp(rec.afp),
      salud: mapSalud(rec.salud),
      isaprePactado: parseNumber(rec.plan_isapre || rec.isapre || rec.pactado || 0),
      contrato: mapContrato(rec.contrato || rec.tipo_contrato),
      horasExtras: parseNumber(rec.horas_extras || rec.he || 0),
      bonos: parseNumber(rec.bonos || rec.bono || 0),
      colacion: parseNumber(rec.colacion || 0),
      movilizacion: parseNumber(rec.movilizacion || 0),
      gratificacionArt50: rec.gratificacion == null || rec.gratificacion === ""
        ? false
        : truthy(rec.gratificacion),
      jornada: parseNumber(rec.jornada) || 42,
    });
  }
  return rows;
}

export const CSV_EJEMPLO = `nombre,rut,cargo,sueldo_base,afp,salud,plan_isapre,contrato,horas_extras,bonos,colacion,movilizacion,gratificacion
Ana Pérez,12.345.678-5,Administradora,1000000,modelo,fonasa,0,indefinido,0,0,50000,40000,no
Luis Soto,9.876.543-3,Operario,800000,habitat,fonasa,0,plazo_fijo,8,30000,40000,35000,si
`;
