import { normalizeRut } from "./format.js";
import { normalizarNovedades, periodoActual } from "./novedades.js";

const DB_KEY = "haberes:empresas";
const SESSION_KEY = "haberes:sesion";
export const MIN_CLAVE = 10;
/** Versión de esquema local: 1 = novedades por período (horas/haberes variables fuera de la ficha). */
export const EMPRESA_SCHEMA_VERSION = 1;

function ls() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export async function hashClave(clave) {
  const enc = new TextEncoder().encode(`haberes:${clave}`);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let h = 2166136261;
  for (let i = 0; i < enc.length; i += 1) {
    h ^= enc[i];
    h = Math.imul(h, 16777619);
  }
  return `fnv_${(h >>> 0).toString(16)}`;
}

export function loadDb() {
  const store = ls();
  if (!store) return {};
  try {
    return JSON.parse(store.getItem(DB_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

export function saveDb(db) {
  const store = ls();
  if (!store) return;
  store.setItem(DB_KEY, JSON.stringify(db));
}

export function getSession() {
  const store = ls();
  if (!store) return null;
  try {
    return JSON.parse(store.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function setSession(rut) {
  const store = ls();
  if (!store) return;
  store.setItem(SESSION_KEY, JSON.stringify({ rut: normalizeRut(rut) }));
}

export function clearSession() {
  const store = ls();
  if (!store) return;
  store.removeItem(SESSION_KEY);
}

export async function registrarEmpresa({ rut, email, razonSocial, clave }) {
  const id = normalizeRut(rut);
  if (!id) throw new Error("RUT inválido");
  if (String(clave || "").length < MIN_CLAVE) {
    throw new Error("La clave debe tener al menos 10 caracteres");
  }
  const db = loadDb();
  if (db[id]) throw new Error("Ya existe una cuenta con ese RUT en este navegador");
  db[id] = {
    rut: id,
    email: String(email || "").trim().toLowerCase(),
    razonSocial: String(razonSocial || "").trim(),
    claveHash: await hashClave(clave),
    trabajadores: [],
    novedades: {},
    schemaVersion: EMPRESA_SCHEMA_VERSION,
    plan: "gratis",
    movimientos: {},
    createdAt: new Date().toISOString(),
  };
  saveDb(db);
  setSession(id);
  return db[id];
}

export async function entrarEmpresa({ rut, clave }) {
  const id = normalizeRut(rut);
  const db = loadDb();
  const emp = db[id];
  if (!emp) throw new Error("No hay una cuenta con ese RUT en este navegador");
  if (emp.remote && !emp.claveHash) {
    throw new Error("Esta cuenta está en el servidor. No se puede entrar solo en este navegador.");
  }
  const hash = await hashClave(clave);
  if (hash !== emp.claveHash) throw new Error("Clave incorrecta");
  setSession(id);
  return migrateEmpresa(emp);
}

export function ensureLocalEmpresa({ rut, email, razonSocial, giro, direccion, hasLogo, hasFirma, plan, planUntil }) {
  const id = normalizeRut(rut);
  if (!id) throw new Error("RUT inválido");
  const db = loadDb();
  const prev = db[id] || {};
  db[id] = {
    ...prev,
    rut: id,
    email: String(email || prev.email || "").trim().toLowerCase(),
    razonSocial: String(razonSocial || prev.razonSocial || "").trim(),
    giro: String(giro ?? prev.giro ?? "").trim(),
    direccion: String(direccion ?? prev.direccion ?? "").trim(),
    hasLogo: hasLogo == null ? Boolean(prev.hasLogo) : Boolean(hasLogo),
    hasFirma: hasFirma == null ? Boolean(prev.hasFirma) : Boolean(hasFirma),
    claveHash: prev.claveHash || "",
    trabajadores: prev.trabajadores || [],
    novedades: prev.novedades || {},
    schemaVersion: prev.schemaVersion || 0,
    plan: plan === "pro" || plan === "gratis" ? plan : prev.plan || "gratis",
    planUntil: planUntil === undefined ? prev.planUntil || null : planUntil,
    movimientos: prev.movimientos || {},
    createdAt: prev.createdAt || new Date().toISOString(),
    remote: true,
  };
  saveDb(db);
  setSession(id);
  return migrateEmpresa(db[id]);
}

export function empresaActual() {
  const ses = getSession();
  if (!ses?.rut) return null;
  const emp = loadDb()[ses.rut] || null;
  if (!emp) return null;
  return migrateEmpresa(emp);
}

/**
 * Migra horas extras y haberes variables de la ficha a novedades del período en curso.
 * Idempotente (schemaVersion >= 1).
 */
export function migrateEmpresa(emp) {
  if (!emp || typeof emp !== "object") return emp;
  if ((emp.schemaVersion || 0) >= EMPRESA_SCHEMA_VERSION) {
    if (!emp.novedades) emp.novedades = {};
    return emp;
  }
  const periodo = periodoActual();
  emp.novedades = emp.novedades && typeof emp.novedades === "object" ? emp.novedades : {};
  if (!emp.novedades[periodo]) emp.novedades[periodo] = {};
  for (const t of emp.trabajadores || []) {
    if (!t?.id) continue;
    const he = Number(t.horasExtras) || 0;
    const haberes = Array.isArray(t.haberesExtra) ? t.haberesExtra : [];
    const bonos = Number(t.bonos) || 0;
    if (!he && !haberes.length && !bonos) continue;
    const prev = emp.novedades[periodo][t.id] || {};
    const mergedHaberes =
      Array.isArray(prev.haberesExtra) && prev.haberesExtra.length
        ? prev.haberesExtra
        : haberes.length
          ? haberes
          : bonos
            ? [{ nombre: "Bonos", monto: bonos, imponible: true }]
            : [];
    emp.novedades[periodo][t.id] = normalizarNovedades(
      {
        ...prev,
        horasExtras: prev.horasExtras || he,
        haberesExtra: mergedHaberes,
      },
      { periodo, trabajadorId: t.id },
    );
    t.horasExtras = 0;
    t.haberesExtra = [];
    t.bonos = 0;
  }
  emp.schemaVersion = EMPRESA_SCHEMA_VERSION;
  guardarEmpresa(emp);
  return emp;
}

export function getNovedades(emp, periodo, trabajadorId) {
  const map = emp?.novedades?.[periodo] || {};
  return normalizarNovedades(map[trabajadorId] || {}, { periodo, trabajadorId });
}

export function setNovedades(emp, periodo, trabajadorId, patch) {
  if (!emp.novedades) emp.novedades = {};
  if (!emp.novedades[periodo]) emp.novedades[periodo] = {};
  emp.novedades[periodo][trabajadorId] = normalizarNovedades(
    { ...(emp.novedades[periodo][trabajadorId] || {}), ...patch },
    { periodo, trabajadorId },
  );
  guardarEmpresa(emp);
  return emp;
}

export function upsertNovedadesPorRut(emp, periodo, rows) {
  const byRut = new Map(
    (emp.trabajadores || [])
      .filter((t) => t.rut)
      .map((t) => [normalizeRut(t.rut), t]),
  );
  if (!emp.novedades) emp.novedades = {};
  if (!emp.novedades[periodo]) emp.novedades[periodo] = {};
  for (const row of rows || []) {
    const rut = normalizeRut(row.rut) || row.rut;
    const t = byRut.get(rut);
    if (!t) continue;
    emp.novedades[periodo][t.id] = normalizarNovedades(
      { ...(emp.novedades[periodo][t.id] || {}), ...row, rut: undefined },
      { periodo, trabajadorId: t.id },
    );
  }
  guardarEmpresa(emp);
  return emp;
}

export function cuentaLocalPorRut(rut) {
  const id = normalizeRut(rut);
  if (!id) return null;
  return loadDb()[id] || null;
}

export function borrarCuentaLocal(rut) {
  const id = normalizeRut(rut);
  if (!id) throw new Error("RUT inválido");
  const db = loadDb();
  if (!db[id]) throw new Error("No hay una cuenta con ese RUT en este navegador");
  delete db[id];
  saveDb(db);
  const ses = getSession();
  if (ses?.rut === id) clearSession();
}

export function guardarEmpresa(emp) {
  const db = loadDb();
  db[emp.rut] = emp;
  saveDb(db);
}

export function upsertTrabajadores(emp, rows, { replace = false } = {}) {
  const current = replace ? [] : [...(emp.trabajadores || [])];
  const byRut = new Map(current.filter((t) => t.rut).map((t) => [normalizeRut(t.rut), t]));
  const periodo = periodoActual();
  if (!emp.novedades) emp.novedades = {};
  if (!emp.novedades[periodo]) emp.novedades[periodo] = {};

  for (const row of rows) {
    const rut = normalizeRut(row.rut) || row.rut;
    const he = Number(row.horasExtras) || 0;
    const haberes = Array.isArray(row.haberesExtra) ? row.haberesExtra : [];
    const bonos = Number(row.bonos) || 0;
    const next = {
      ...row,
      rut,
      horasExtras: 0,
      haberesExtra: [],
      bonos: 0,
    };
    let id;
    if (rut && byRut.has(rut)) {
      const idx = current.findIndex((t) => normalizeRut(t.rut) === rut);
      if (idx >= 0) {
        id = current[idx].id;
        current[idx] = { ...current[idx], ...next, id };
      }
    } else {
      id = next.id || `t_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
      current.push({ ...next, id });
      if (rut) byRut.set(rut, { ...next, id });
    }
    if (id && (he || haberes.length || bonos)) {
      const prev = emp.novedades[periodo][id] || {};
      emp.novedades[periodo][id] = normalizarNovedades(
        {
          ...prev,
          horasExtras: he || prev.horasExtras || 0,
          haberesExtra: haberes.length
            ? haberes
            : bonos
              ? [{ nombre: "Bonos", monto: bonos, imponible: true }]
              : prev.haberesExtra || [],
        },
        { periodo, trabajadorId: id },
      );
    }
  }
  emp.trabajadores = current;
  emp.schemaVersion = Math.max(emp.schemaVersion || 0, EMPRESA_SCHEMA_VERSION);
  guardarEmpresa(emp);
  return emp;
}

export function updateTrabajador(emp, id, patch) {
  const list = [...(emp.trabajadores || [])];
  const idx = list.findIndex((t) => t.id === id);
  if (idx < 0) return emp;
  list[idx] = { ...list[idx], ...patch, id: list[idx].id };
  emp.trabajadores = list;
  guardarEmpresa(emp);
  return emp;
}

export function deleteTrabajador(emp, id) {
  emp.trabajadores = (emp.trabajadores || []).filter((t) => t.id !== id);
  guardarEmpresa(emp);
  return emp;
}
