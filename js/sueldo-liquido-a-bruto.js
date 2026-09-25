import { calcularCostoEmpresa, calcularSueldo, roundPeso } from "./sueldo.js";

/** Misma tolerancia en pesos que el resto de los inversos del motor. */
export const TOLERANCIA_LIQUIDO_CLP = 1;

/**
 * Tope de búsqueda del bruto. Por encima, la página avisa en vez de
 * devolver un número sin sentido. No es un tope legal.
 */
export const TOPE_BRUTO_BUSQUEDA = 500_000_000;

function contratoDe(raw) {
  const c = String(raw || "indefinido").toLowerCase().trim();
  return c === "plazo_fijo" || c === "plazo fijo" || c === "plazo" ? "plazo_fijo" : "indefinido";
}

function perfil(input = {}) {
  const salud = String(input.salud || "fonasa").toLowerCase() === "isapre" ? "isapre" : "fonasa";
  return {
    afp: String(input.afp || "modelo").toLowerCase(),
    salud,
    isaprePactado: salud === "isapre" ? roundPeso(Math.max(0, Number(input.isaprePactado) || 0)) : 0,
    contrato: contratoDe(input.contrato),
    cotizaCesantia: input.cotizaCesantia !== false,
    jornada: Number(input.jornada) > 0 ? Number(input.jornada) : 42,
    horasExtras: Math.max(0, Number(input.horasExtras) || 0),
    bonos: roundPeso(Math.max(0, Number(input.bonos) || 0)),
    otrosImponibles: roundPeso(Math.max(0, Number(input.otrosImponibles) || 0)),
    colacion: roundPeso(Math.max(0, Number(input.colacion) || 0)),
    movilizacion: roundPeso(Math.max(0, Number(input.movilizacion) || 0)),
    otrosNoImponibles: roundPeso(Math.max(0, Number(input.otrosNoImponibles) || 0)),
    gratificacionArt50: Boolean(input.gratificacionArt50),
    otrosDescuentos: roundPeso(Math.max(0, Number(input.otrosDescuentos) || 0)),
  };
}

function extrasDistintosDeCero(base) {
  return (
    base.horasExtras > 0 ||
    base.bonos > 0 ||
    base.otrosImponibles > 0 ||
    base.colacion > 0 ||
    base.movilizacion > 0 ||
    base.otrosNoImponibles > 0 ||
    base.otrosDescuentos > 0 ||
    base.gratificacionArt50 ||
    base.isaprePactado > 0
  );
}

/**
 * Invierte `calcularSueldo`: busca el sueldo base entero cuyo líquido
 * queda a $1 del objetivo. AFP, salud, cesantía, IUSC y topes UF salen
 * del motor; esta función solo elige el bruto.
 *
 * Líquido 0 → bruto 0. Si los no imponibles fijos ya superan el objetivo,
 * o el tope de búsqueda no alcanza, `ok` es false y no hay NaN.
 *
 * El costo empresa reusa `calcularCostoEmpresa` (mutual adicional 0, tasa
 * básica ya modelada). Si hay haberes extra que ese helper no recibe,
 * `costoEmpresa` queda en null.
 */
export function calcularSueldoLiquidoABruto(input = {}, indicadores = {}) {
  const target = roundPeso(Number(input.liquidoObjetivo ?? input.liquido ?? input.monto) || 0);
  const base = perfil(input);
  const evaluar = (sueldoBase) => calcularSueldo({ ...base, sueldoBase }, indicadores);

  const fallo = (motivo, calc, extra = {}) =>
    empaquetar({
      ok: false,
      motivo,
      bruto: null,
      target,
      base,
      calc,
      indicadores,
      ...extra,
    });

  if (!(target > 0)) {
    const calc = evaluar(0);
    return empaquetar({ ok: true, motivo: "cero", bruto: 0, target: 0, base, calc, indicadores });
  }

  const enCero = evaluar(0);
  if (enCero.liquido > target + TOLERANCIA_LIQUIDO_CLP) {
    return fallo("supera_minimo", enCero, { liquidoMinimo: enCero.liquido });
  }

  let hi = Math.min(TOPE_BRUTO_BUSQUEDA, Math.max(target, 1));
  let guard = 0;
  while (evaluar(hi).liquido + TOLERANCIA_LIQUIDO_CLP < target && hi < TOPE_BRUTO_BUSQUEDA && guard < 40) {
    hi = Math.min(TOPE_BRUTO_BUSQUEDA, hi * 2);
    guard += 1;
  }

  const enHi = evaluar(hi);
  if (enHi.liquido + TOLERANCIA_LIQUIDO_CLP < target) {
    return fallo("tope", enHi, { topeBruto: TOPE_BRUTO_BUSQUEDA, liquidoAlcanzado: enHi.liquido });
  }

  let lo = 0;
  for (let i = 0; i < 60 && lo < hi; i++) {
    const mid = lo + Math.floor((hi - lo) / 2);
    const liq = evaluar(mid).liquido;
    if (liq >= target) hi = mid;
    else lo = mid + 1;
  }

  let best = hi;
  let bestDiff = Math.abs(evaluar(hi).liquido - target);
  for (const cand of [hi - 1, hi + 1]) {
    if (cand < 0 || cand > TOPE_BRUTO_BUSQUEDA) continue;
    const diff = Math.abs(evaluar(cand).liquido - target);
    if (diff < bestDiff) {
      best = cand;
      bestDiff = diff;
    }
  }

  const calc = evaluar(best);
  if (bestDiff > TOLERANCIA_LIQUIDO_CLP || !Number.isFinite(calc.liquido)) {
    return fallo("sin_solucion", calc, { diferencia: bestDiff });
  }

  return empaquetar({ ok: true, motivo: "ok", bruto: best, target, base, calc, indicadores });
}

function empaquetar({ ok, motivo, bruto, target, base, calc, indicadores }) {
  const cesantiaTrabajadorApagada = base.contrato === "indefinido" && base.cotizaCesantia === false;
  const muestraCosto = ok && bruto != null && !extrasDistintosDeCero(base) && !cesantiaTrabajadorApagada;
  let costo = null;
  if (muestraCosto && bruto === 0) {
    costo = { costoEmpresa: 0, totalAportes: 0 };
  } else if (muestraCosto && bruto > 0) {
    costo = calcularCostoEmpresa(
      {
        modo: "bruto",
        monto: bruto,
        afp: base.afp,
        salud: base.salud,
        contrato: base.contrato,
        mutualAdicionalPct: 0,
      },
      indicadores,
    );
  }

  return {
    ok: Boolean(ok) && Number.isFinite(bruto),
    motivo,
    liquidoObjetivo: target,
    bruto: ok ? bruto : null,
    liquido: Number.isFinite(calc?.liquido) ? calc.liquido : null,
    diferencia: ok && calc ? calc.liquido - target : null,
    imponible: calc?.imponible ?? null,
    totalHaberes: calc?.totalHaberes ?? null,
    totalDescuentos: calc?.totalDescuentos ?? null,
    baseTributable: calc?.baseTributable ?? null,
    iusc: calc?.iusc ?? null,
    afp: calc?.afp ?? null,
    salud: calc?.salud ?? null,
    cesantia: calc?.cesantia ?? null,
    haberes: calc?.haberes ?? [],
    descuentos: calc?.descuentos ?? [],
    uf: calc?.uf ?? null,
    contrato: base.contrato,
    cotizaCesantia: base.contrato === "indefinido" && base.cotizaCesantia !== false,
    costoEmpresa: costo ? costo.costoEmpresa : null,
    aportesEmpleador: costo ? costo.totalAportes : null,
    costoDisponible: Boolean(costo),
    detalle: calc,
  };
}
