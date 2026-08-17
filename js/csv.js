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
  if (k.includes("banm")) return "banmedica";
  if (k.includes("colmena")) return "colmena";
  if (k.includes("consalud")) return "consalud";
  if (k.includes("cruz")) return "cruzblanca";
  if (k.includes("vida")) return "vidatres";
  if (k.includes("masvida")) return "nuevamasvida";
  if (k.includes("esencial")) return "esencial";
  return k.includes("isapre") ? "isapre" : "fonasa";
}

// Acepta aaaa-mm-dd o dd/mm/aaaa y devuelve ISO; cualquier otra cosa, vacío.
function parseFechaIso(v) {
  const t = String(v || "").trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (m) return t;
  m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(t);
  if (!m) return "";
  const p2 = (n) => String(n).padStart(2, "0");
  return `${m[3]}-${p2(m[2])}-${p2(m[1])}`;
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

function mapTipoCuenta(v) {
  const k = String(v || "corriente").trim().toLowerCase();
  if (k.includes("vista") || k === "juv") return "vista";
  if (k.includes("rut")) return "rut";
  return "corriente";
}

function parseNamedBonos(rec) {
  const byN = new Map();
  for (const [key, val] of Object.entries(rec)) {
    const m = String(key).match(/^bono_(\d+)_(nombre|monto|imponible)$/);
    if (!m) continue;
    const n = Number(m[1]);
    const field = m[2];
    if (!byN.has(n)) byN.set(n, { nombre: "", monto: 0, imponible: true });
    const row = byN.get(n);
    if (field === "nombre") row.nombre = String(val || "").trim();
    if (field === "monto") row.monto = parseNumber(val);
    if (field === "imponible") {
      row.imponible = val == null || String(val).trim() === "" ? true : truthy(val);
    }
  }
  const named = [...byN.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, row]) => row)
    .filter((row) => row.nombre || row.monto);
  if (named.length) return named;
  const legacy = parseNumber(rec.bonos || rec.bono || 0);
  if (legacy) return [{ nombre: "Bonos", monto: legacy, imponible: true }];
  return [];
}

/**
 * CSV/XLSX: nombre, rut, cargo, sueldo_base, afp, salud, plan_isapre, contrato,
 * horas_extras, colacion, movilizacion, gratificacion, email, banco, tipo_cuenta, nro_cuenta,
 * bono_N_nombre, bono_N_monto, bono_N_imponible (N = 1, 2, …)
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
    const haberesExtra = parseNamedBonos(rec);
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
      fechaIngreso: parseFechaIso(rec.fecha_ingreso || rec.fecha_inicio || rec.ingreso),
      horasExtras: parseNumber(rec.horas_extras || rec.he || 0),
      bonos: 0,
      haberesExtra,
      colacion: parseNumber(rec.colacion || 0),
      movilizacion: parseNumber(rec.movilizacion || 0),
      gratificacionArt50:
        rec.gratificacion == null || rec.gratificacion === "" ? false : truthy(rec.gratificacion),
      jornada: parseNumber(rec.jornada) || 42,
      email: String(rec.email || rec.correo || "").trim(),
      banco: String(rec.banco || rec.codigo_banco || "").trim(),
      tipoCuenta: mapTipoCuenta(rec.tipo_cuenta || rec.tipo_cta),
      nroCuenta: String(rec.nro_cuenta || rec.cuenta || rec.nro_cta || "").trim(),
    });
  }
  return rows;
}

export const CSV_CABECERA =
  "nombre,rut,cargo,sueldo_base,afp,salud,plan_isapre,contrato,fecha_ingreso,jornada,horas_extras,colacion,movilizacion,gratificacion,email,banco,tipo_cuenta,nro_cuenta,bono_1_nombre,bono_1_monto,bono_1_imponible,bono_2_nombre,bono_2_monto,bono_2_imponible";

export const CSV_EJEMPLO = `${CSV_CABECERA}
Ana Pérez,12.345.678-5,Administradora,1000000,modelo,fonasa,0,indefinido,01/03/2023,42,0,50000,40000,no,ana@empresa.cl,001,corriente,12345678,Bono producción,80000,si,Colación extra,15000,no
Luis Soto,9.876.543-3,Operario,800000,habitat,banmedica,45000,plazo_fijo,15/01/2025,42,8,40000,35000,si,luis@empresa.cl,012,vista,11111111,Bono asistencia,30000,si,Movilización extra,12000,no
Camila Núñez,11.111.111-1,Supervisora,1450000,uno,isapre,120000,indefinido,01/06/2022,42,2,60000,50000,si,camila@empresa.cl,037,corriente,98765432,Bono de cargo,90000,si,Asignación de movilización,20000,no
`;
