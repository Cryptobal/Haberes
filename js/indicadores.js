import {
  FALLBACK_UF,
  FALLBACK_UTM,
  INDICADORES_CACHE_MS,
  MINDICADOR_URL,
  UF_MAX,
  UF_MIN,
} from "./constants.js";

const CACHE_KEY = "haberes:indicadores";

function storage() {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function validUf(n) {
  return Number.isFinite(n) && n >= UF_MIN && n <= UF_MAX;
}

export function fallbackIndicadores() {
  return {
    uf: FALLBACK_UF,
    utm: FALLBACK_UTM,
    fecha: null,
    fuente: "fallback",
  };
}

export function readCache(now = Date.now()) {
  const ls = storage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.savedAt) return null;
    if (now - data.savedAt > INDICADORES_CACHE_MS) return null;
    if (!validUf(data.uf)) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeCache(data) {
  const ls = storage();
  if (!ls) return;
  try {
    ls.setItem(CACHE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    /* ignore quota */
  }
}

export async function fetchIndicadores(fetcher = fetch) {
  const res = await fetcher(MINDICADOR_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`mindicador ${res.status}`);
  const json = await res.json();
  const uf = Number(json?.uf?.valor);
  const utm = Number(json?.utm?.valor);
  const fecha = json?.uf?.fecha || json?.utm?.fecha || null;
  if (!validUf(uf)) {
    return { ...fallbackIndicadores(), fecha, fuente: "fallback-rango" };
  }
  return {
    uf,
    utm: Number.isFinite(utm) && utm > 0 ? utm : FALLBACK_UTM,
    fecha,
    fuente: "mindicador",
  };
}

export async function getIndicadores() {
  const cached = readCache();
  if (cached) {
    return { uf: cached.uf, utm: cached.utm, fecha: cached.fecha, fuente: "cache" };
  }
  try {
    const live = await fetchIndicadores();
    writeCache(live);
    return live;
  } catch {
    return fallbackIndicadores();
  }
}
