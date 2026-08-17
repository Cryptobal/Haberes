/** Mes convencional de remuneración fija mensual (DT Dictamen 5308/230). */
export const DIAS_MES_CONVENCIONAL = 30;

function roundPeso(n) {
  return Math.round(Number(n) || 0);
}

export const DESCUENTO_TIPOS = Object.freeze([
  "legal",
  "anticipo",
  "convencional",
  "vivienda_educacion",
]);

/**
 * Normaliza un bloque de novedades del período.
 * Forma pensada para fase K: (company_id, trabajador_id, periodo).
 */
export function normalizarNovedades(raw = {}, { periodo = "", trabajadorId = "" } = {}) {
  const n = raw && typeof raw === "object" ? raw : {};
  const haberesExtra = Array.isArray(n.haberesExtra)
    ? n.haberesExtra
        .slice(0, 30)
        .map((h) => ({
          nombre: String(h.nombre || h.label || "Haber").trim().slice(0, 80) || "Haber",
          monto: Math.max(0, roundPeso(h.monto)),
          imponible: h.imponible !== false,
        }))
        .filter((h) => h.monto !== 0 || h.nombre)
    : [];
  const descuentos = Array.isArray(n.descuentos)
    ? n.descuentos
        .slice(0, 30)
        .map((d) => {
          const tipo = String(d.tipo || "convencional").toLowerCase();
          return {
            nombre: String(d.nombre || "Descuento").trim().slice(0, 80) || "Descuento",
            monto: Math.max(0, roundPeso(d.monto)),
            tipo: DESCUENTO_TIPOS.includes(tipo) ? tipo : "convencional",
          };
        })
        .filter((d) => d.monto !== 0 || d.nombre)
    : [];
  const manual =
    n.diasTrabajadosManual == null || n.diasTrabajadosManual === ""
      ? null
      : Math.max(0, Math.min(31, Number(n.diasTrabajadosManual)));
  return {
    periodo: String(n.periodo || periodo || "").slice(0, 7),
    trabajadorId: String(n.trabajadorId || trabajadorId || "").slice(0, 64),
    diasAusencia: clampDias(n.diasAusencia),
    diasLicencia: clampDias(n.diasLicencia),
    diasVacaciones: clampDias(n.diasVacaciones),
    pagaCarencia: Boolean(n.pagaCarencia),
    horasExtras: Math.max(0, Number(n.horasExtras) || 0),
    haberesExtra,
    descuentos,
    diasTrabajadosManual: Number.isFinite(manual) ? manual : null,
    colacionFija: Boolean(n.colacionFija),
    movilizacionFija: Boolean(n.movilizacionFija),
    nota: String(n.nota || "").trim().slice(0, 200),
  };
}

function clampDias(v) {
  const n = Math.max(0, Math.min(31, Number(v) || 0));
  return Math.floor(n);
}

/**
 * Día del mes (1–31) desde ISO aaaa-mm-dd, o null.
 */
export function diaDeFecha(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = Number(m[3]);
  return d >= 1 && d <= 31 ? d : null;
}

/**
 * ¿La fecha cae dentro del período aaaa-mm?
 */
export function fechaEnPeriodo(iso, periodo) {
  const m = String(periodo || "").match(/^(\d{4})-(\d{2})$/);
  if (!m || !iso) return false;
  return String(iso).startsWith(`${m[1]}-${m[2]}`);
}

/**
 * Días base del período con mes convencional de 30.
 * Ingreso día D → 31 − D (tope 30). Término día D → min(D, 30).
 * Ambos en el mismo mes: se aplican juntos.
 */
export function diasBaseDelPeriodo({ periodo, fechaIngreso, fechaTermino } = {}) {
  let base = DIAS_MES_CONVENCIONAL;
  const ingresoEn = fechaEnPeriodo(fechaIngreso, periodo);
  const terminoEn = fechaEnPeriodo(fechaTermino, periodo);
  const dIn = ingresoEn ? diaDeFecha(fechaIngreso) : null;
  const dOut = terminoEn ? diaDeFecha(fechaTermino) : null;

  if (dIn != null && dOut != null) {
    // Del día de ingreso al de término, con tope 30 (día 31 no suma).
    const hasta = Math.min(dOut, DIAS_MES_CONVENCIONAL);
    const desde = Math.min(dIn, 31);
    base = Math.max(0, hasta - desde + 1);
    if (dOut >= 31 && dIn === 1) base = DIAS_MES_CONVENCIONAL;
    // Si el término es día 31 y el ingreso es 1, mes completo convencional = 30.
    // Si ingreso el 1 y término el 31: hasta=30, desde=1 → 30. OK.
  } else if (dIn != null) {
    base = Math.min(DIAS_MES_CONVENCIONAL, Math.max(0, 31 - dIn));
  } else if (dOut != null) {
    base = Math.min(dOut, DIAS_MES_CONVENCIONAL);
  }
  return Math.max(0, Math.min(DIAS_MES_CONVENCIONAL, base));
}

/**
 * Días de carencia que la empresa paga (solo si se obligó y licencia ≤ 10 días).
 * DFL 44 art. 14 / SUSESO: los 3 primeros de licencia ≤ 10 no dan subsidio;
 * el empleador solo los paga si se obligó por contrato.
 */
export function diasCarenciaPagados({ diasLicencia = 0, pagaCarencia = false } = {}) {
  const lic = clampDias(diasLicencia);
  if (!pagaCarencia || lic <= 0 || lic > 10) return 0;
  return Math.min(3, lic);
}

/**
 * Calcula días trabajados del período.
 * diasVacaciones no resta (feriado legal se paga).
 * diasTrabajadosManual sobrescribe el resultado (override explícito).
 */
export function diasDelPeriodo({
  periodo,
  fechaIngreso,
  fechaTermino,
  diasAusencia = 0,
  diasLicencia = 0,
  diasVacaciones = 0,
  pagaCarencia = false,
  diasTrabajadosManual = null,
  manual = null,
} = {}) {
  const diasBase = diasBaseDelPeriodo({ periodo, fechaIngreso, fechaTermino });
  const ausencia = clampDias(diasAusencia);
  const licencia = clampDias(diasLicencia);
  const vacaciones = clampDias(diasVacaciones);
  const carencia = diasCarenciaPagados({ diasLicencia: licencia, pagaCarencia });

  let ausenciaAjustada = ausencia;
  let licenciaAjustada = licencia;
  let avisoTope = false;
  if (ausencia + licencia > diasBase) {
    // Acotar sin negativos: primero ausencia, luego licencia.
    const room = diasBase;
    ausenciaAjustada = Math.min(ausencia, room);
    licenciaAjustada = Math.min(licencia, Math.max(0, room - ausenciaAjustada));
    avisoTope = true;
  }

  const carenciaAdj = diasCarenciaPagados({
    diasLicencia: licenciaAjustada,
    pagaCarencia,
  });
  let diasTrabajados = diasBase - ausenciaAjustada - licenciaAjustada + carenciaAdj;
  diasTrabajados = Math.max(0, Math.min(diasBase, diasTrabajados));

  const override =
    diasTrabajadosManual != null && diasTrabajadosManual !== ""
      ? diasTrabajadosManual
      : manual;
  let overrideActivo = false;
  if (override != null && override !== "") {
    const m = Math.max(0, Math.min(diasBase, Number(override)));
    if (Number.isFinite(m)) {
      diasTrabajados = m;
      overrideActivo = true;
    }
  }

  return {
    diasBase,
    diasAusencia: ausenciaAjustada,
    diasLicencia: licenciaAjustada,
    diasVacaciones: vacaciones,
    diasCarenciaPagados: carenciaAdj,
    diasTrabajados,
    overrideActivo,
    avisoTope,
    pagaCarencia: Boolean(pagaCarencia),
  };
}

/**
 * Proporcionaliza un monto mensual por días trabajados (÷ 30 × días).
 */
export function proporcional(monto, diasTrabajados, diasBase = DIAS_MES_CONVENCIONAL) {
  const m = Number(monto) || 0;
  const d = Number(diasTrabajados);
  const base = Number(diasBase) || DIAS_MES_CONVENCIONAL;
  if (!Number.isFinite(d) || d >= base) return roundPeso(m);
  if (d <= 0) return 0;
  return roundPeso((m / DIAS_MES_CONVENCIONAL) * d);
}

/**
 * Validación art. 58 inciso 2 CT + Dictamen 7051/332.
 * Base del 15 % = remuneración total bruta (total haberes), sin deducir cotizaciones.
 * Los anticipos NO entran al tope. Descuentos legales tampoco.
 * vivienda_educacion: tope 30 % (Ley 20.540), solo informativo aquí.
 */
export function validarArt58({ totalHaberes = 0, descuentos = [] } = {}) {
  const bruto = Math.max(0, roundPeso(totalHaberes));
  const lista = Array.isArray(descuentos) ? descuentos : [];
  const convencionales = lista
    .filter((d) => String(d.tipo || "").toLowerCase() === "convencional")
    .reduce((s, d) => s + Math.max(0, roundPeso(d.monto)), 0);
  const vivienda = lista
    .filter((d) => String(d.tipo || "").toLowerCase() === "vivienda_educacion")
    .reduce((s, d) => s + Math.max(0, roundPeso(d.monto)), 0);
  const anticipos = lista
    .filter((d) => String(d.tipo || "").toLowerCase() === "anticipo")
    .reduce((s, d) => s + Math.max(0, roundPeso(d.monto)), 0);

  const tope15 = roundPeso(bruto * 0.15);
  const tope30 = roundPeso(bruto * 0.3);
  const exceso15 = Math.max(0, convencionales - tope15);
  const exceso30 = Math.max(0, vivienda - tope30);

  return {
    totalHaberes: bruto,
    convencionales,
    anticipos,
    vivienda,
    tope15,
    tope30,
    exceso15,
    exceso30,
    supera15: exceso15 > 0,
    supera30: exceso30 > 0,
    cita: "Código del Trabajo art. 58 inciso 2; Dictamen 7051/332 de 19-12-1996",
  };
}

/** Suma de anticipos + convencionales para LRE 3188. */
export function sumaAnticiposPrestamos(descuentos = []) {
  return (Array.isArray(descuentos) ? descuentos : [])
    .filter((d) => {
      const t = String(d.tipo || "").toLowerCase();
      return t === "anticipo" || t === "convencional";
    })
    .reduce((s, d) => s + Math.max(0, roundPeso(d.monto)), 0);
}

/**
 * Combina ficha permanente + novedades del período para alimentar calcularSueldo.
 */
export function inputDesdeFichaYNovedades(trabajador = {}, novedades = {}, { periodo = "" } = {}) {
  const n = normalizarNovedades(novedades, {
    periodo: periodo || novedades.periodo,
    trabajadorId: trabajador.id,
  });
  const dias = diasDelPeriodo({
    periodo: n.periodo || periodo,
    fechaIngreso: trabajador.fechaIngreso || trabajador.ingreso,
    fechaTermino: trabajador.fechaTermino || trabajador.termino,
    diasAusencia: n.diasAusencia,
    diasLicencia: n.diasLicencia,
    diasVacaciones: n.diasVacaciones,
    pagaCarencia: n.pagaCarencia,
    diasTrabajadosManual: n.diasTrabajadosManual,
  });
  return {
    ...trabajador,
    horasExtras: n.horasExtras,
    haberesExtra: n.haberesExtra,
    descuentos: n.descuentos,
    colacionFija: n.colacionFija,
    movilizacionFija: n.movilizacionFija,
    dias,
    periodo: n.periodo || periodo,
  };
}

export function periodoActual(fecha = new Date()) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
