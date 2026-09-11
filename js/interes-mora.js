import {
  INTERES_MORA_BASE_DIAS,
  INTERES_MORA_GOLD,
  IPC_INE,
  TMC_REAJUSTABLE_CERTIFICADO,
  TMC_REAJUSTABLE_DESDE,
  TMC_REAJUSTABLE_MENOS_UN_ANIO,
} from "./constants.js";

function roundPeso(n) {
  return Math.round(Number(n) || 0);
}

function parseIso(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

function toIso(dt) {
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function addDays(dt, n) {
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n);
}

function diffDays(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function mesAnteriorKey(iso) {
  const dt = parseIso(iso);
  if (!dt) return "";
  const prev = new Date(dt.getFullYear(), dt.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

export function lookupIpc(yyyyMm, tabla = IPC_INE) {
  const key = String(yyyyMm || "");
  const v = tabla[key];
  return Number.isFinite(v) && v > 0 ? v : null;
}

export function diasMoraInteres(fechaVencimiento, fechaPago) {
  const venc = parseIso(fechaVencimiento);
  const pago = parseIso(fechaPago);
  if (!venc || !pago) return { ok: false, diasMora: 0, diasCalendario: 0 };
  const diasCalendario = Math.max(0, diffDays(venc, pago));
  if (pago.getTime() < venc.getTime()) {
    return { ok: false, motivo: "pago_antes", diasMora: 0, diasCalendario: diffDays(venc, pago) };
  }
  const inicio = addDays(venc, 1);
  const fin = addDays(pago, -1);
  const diasMora = fin.getTime() < inicio.getTime() ? 0 : diffDays(inicio, fin) + 1;
  return { ok: true, diasMora, diasCalendario, inicio: toIso(inicio), fin: fin.getTime() >= inicio.getTime() ? toIso(fin) : "" };
}

function vacio() {
  return {
    ok: false,
    monto: 0,
    reajuste: 0,
    capitalReajustado: 0,
    intereses: 0,
    total: 0,
    diasMora: 0,
    diasCalendario: 0,
    variacionIpc: 0,
    variacionIpcPct: 0,
  };
}

/**
 * Reajuste IPC + interés por mora de remuneraciones u otros haberes
 * adeudados (art. 63 Código del Trabajo).
 *
 * IPC: variación entre el mes anterior al vencimiento y el mes precedente
 * al pago (consulta DT 1628/w3-article-60253; Dictamen 350/15).
 * Interés: sobre el monto ya reajustado, TMC de operaciones reajustables,
 * día siguiente al vencimiento hasta el día anterior al pago (ambos
 * inclusive), tasa anual / 360 (consulta DT 1628/w3-article-60612;
 * Ley 18.010 art. 11).
 */
export function calcularInteresMora(input = {}, tablaIpc = IPC_INE) {
  const monto = roundPeso(input.monto);
  const fechaVencimiento = String(input.fechaVencimiento || "").trim();
  const fechaPago = String(input.fechaPago || "").trim();
  const tasaIn = input.tasaAnualPct;
  const tasaUsuario = Number.isFinite(Number(tasaIn)) && String(tasaIn).trim() !== "";
  const tasaAnualPct = tasaUsuario ? Math.max(0, Number(tasaIn)) : TMC_REAJUSTABLE_MENOS_UN_ANIO;
  const tasaFuente = tasaUsuario && Math.abs(tasaAnualPct - TMC_REAJUSTABLE_MENOS_UN_ANIO) > 1e-9
    ? "usuario"
    : "cmf";

  const base = {
    ...vacio(),
    monto: Math.max(0, monto),
    fechaVencimiento,
    fechaPago,
    tasaAnualPct,
    tasaFuente,
    tasaCertificado: TMC_REAJUSTABLE_CERTIFICADO,
    tasaDesde: TMC_REAJUSTABLE_DESDE,
    baseDias: INTERES_MORA_BASE_DIAS,
    mesIpcInicial: "",
    mesIpcFinal: "",
    ipcInicial: 0,
    ipcFinal: 0,
    ipcFuente: "",
    periodoInteresDesde: "",
    periodoInteresHasta: "",
  };

  if (monto <= 0) return { ...base, motivo: "sin_monto" };

  const venc = parseIso(fechaVencimiento);
  const pago = parseIso(fechaPago);
  if (!venc || !pago) return { ...base, motivo: "sin_fecha" };
  if (pago.getTime() < venc.getTime()) {
    return { ...base, motivo: "pago_antes", diasCalendario: diffDays(venc, pago) };
  }

  const mora = diasMoraInteres(fechaVencimiento, fechaPago);
  const mesIpcInicial = mesAnteriorKey(fechaVencimiento);
  const mesIpcFinal = mesAnteriorKey(fechaPago);

  const ipcIniOverride = Number(input.ipcInicial);
  const ipcFinOverride = Number(input.ipcFinal);
  const usaOverride =
    Number.isFinite(ipcIniOverride) &&
    ipcIniOverride > 0 &&
    Number.isFinite(ipcFinOverride) &&
    ipcFinOverride > 0;

  const ipcInicial = usaOverride ? ipcIniOverride : lookupIpc(mesIpcInicial, tablaIpc);
  const ipcFinal = usaOverride ? ipcFinOverride : lookupIpc(mesIpcFinal, tablaIpc);
  const ipcFuente = usaOverride ? "usuario" : "ine";

  const comun = {
    ...base,
    diasMora: mora.diasMora,
    diasCalendario: mora.diasCalendario,
    periodoInteresDesde: mora.inicio || "",
    periodoInteresHasta: mora.fin || "",
    mesIpcInicial,
    mesIpcFinal,
    ipcInicial: ipcInicial || 0,
    ipcFinal: ipcFinal || 0,
    ipcFuente,
  };

  if (!ipcInicial || !ipcFinal) {
    return { ...comun, ok: false, motivo: "sin_ipc" };
  }

  const variacionIpc = ipcFinal / ipcInicial - 1;
  const reajuste = roundPeso(monto * variacionIpc);
  const capitalReajustado = monto + reajuste;
  const intereses = roundPeso(
    (capitalReajustado * (tasaAnualPct / 100) * mora.diasMora) / INTERES_MORA_BASE_DIAS,
  );
  const total = monto + reajuste + intereses;

  return {
    ...comun,
    ok: true,
    motivo: "",
    variacionIpc,
    variacionIpcPct: variacionIpc * 100,
    reajuste,
    capitalReajustado,
    intereses,
    total,
  };
}

export { INTERES_MORA_GOLD, TMC_REAJUSTABLE_MENOS_UN_ANIO };
