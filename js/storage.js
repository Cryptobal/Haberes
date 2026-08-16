import { normalizeRut } from "./format.js";

const DB_KEY = "haberes:empresas";
const SESSION_KEY = "haberes:sesion";
export const MIN_CLAVE = 10;

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
  return emp;
}

export function ensureLocalEmpresa({ rut, email, razonSocial, giro, direccion, hasLogo }) {
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
    claveHash: prev.claveHash || "",
    trabajadores: prev.trabajadores || [],
    createdAt: prev.createdAt || new Date().toISOString(),
    remote: true,
  };
  saveDb(db);
  setSession(id);
  return db[id];
}

export function empresaActual() {
  const ses = getSession();
  if (!ses?.rut) return null;
  return loadDb()[ses.rut] || null;
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
  for (const row of rows) {
    const rut = normalizeRut(row.rut) || row.rut;
    const next = { ...row, rut };
    if (rut && byRut.has(rut)) {
      const idx = current.findIndex((t) => normalizeRut(t.rut) === rut);
      if (idx >= 0) current[idx] = { ...current[idx], ...next, id: current[idx].id };
    } else {
      current.push(next);
      if (rut) byRut.set(rut, next);
    }
  }
  emp.trabajadores = current;
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
