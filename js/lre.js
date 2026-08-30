// Libro de Remuneraciones Electrónico (LRE) de la Dirección del Trabajo.
//
// Fuente del formato: "Libro de Remuneraciones Electrónico — Manual de usuario",
// Dirección del Trabajo, versión 8.0 (marzo 2023), Anexo N°1 "Conceptos" y
// Anexo N°2 "Tablas de validación".
// https://static-content.api.dirtrab.cl/dt-docs/lre/lre_instrucciones_de_carga.pdf
//
// Reglas de forma del mismo manual (sección 6.2 y 7):
// - Nombre del archivo: rutempleador_aaaamm, extensión .csv
// - Delimitador: punto y coma (;)
// - Codificación: ANSI
// - Fechas: dd/mm/aaaa
// - RUT: sin puntos, con guion y dígito verificador, sin cero inicial
// - Montos: enteros, positivos, mayores o iguales a cero
// - Conceptos opcionales sin dato: campo vacío (no cero)
// - El archivo lleva encabezados y no admite quitar ni agregar columnas
//
// Este módulo genera un borrador para revisar antes de subir a Mi DT: los
// aportes del empleador (mutual, SIS, reforma Ley 21.735) van en 0. La
// estimación de esas tasas vive en /costo-empresa; el LRE no las rellena
// porque la mutual adicional depende de la siniestralidad de cada empresa
// y la DT aún no publica códigos propios para el detalle de la reforma.

import { sumaAnticiposPrestamos } from "./novedades.js";
import { calcularSueldo, roundPeso } from "./sueldo.js";

// ---------------------------------------------------------------------------
// Anexo N°1: las 147 columnas, en el orden oficial de la tabla.
// ---------------------------------------------------------------------------

export const LRE_COLUMNAS = [
  // Categoría 1: identificación del trabajador (40)
  [1101, "Rut trabajador"],
  [1102, "Fecha inicio contrato"],
  [1103, "Fecha término de contrato"],
  [1104, "Causal término de contrato"],
  [1105, "Región prestación de servicios"],
  [1106, "Comuna prestación de servicios"],
  [1170, "Tipo impuesto a la renta"],
  [1146, "Técnico extranjero exención cot. previsionales"],
  [1107, "Código tipo de jornada"],
  [1108, "Persona con discapacidad - pensionado por invalidez"],
  [1109, "Pensionado por vejez"],
  [1141, "AFP"],
  [1142, "IPS (ExINP)"],
  [1143, "FONASA - ISAPRE"],
  [1151, "AFC"],
  [1110, "CCAF"],
  [1152, "Org. administrador ley 16.744"],
  [1111, "Nro cargas familiares legales autorizadas"],
  [1112, "Nro de cargas familiares maternales"],
  [1113, "Nro de cargas familiares invalidez"],
  [1114, "Tramo asignación familiar"],
  [1171, "Rut org sindical 1"],
  [1172, "Rut org sindical 2"],
  [1173, "Rut org sindical 3"],
  [1174, "Rut org sindical 4"],
  [1175, "Rut org sindical 5"],
  [1176, "Rut org sindical 6"],
  [1177, "Rut org sindical 7"],
  [1178, "Rut org sindical 8"],
  [1179, "Rut org sindical 9"],
  [1180, "Rut org sindical 10"],
  [1115, "Nro días trabajados en el mes"],
  [1116, "Nro días de licencia médica en el mes"],
  [1117, "Nro días de vacaciones en el mes"],
  [1118, "Subsidio trabajador joven"],
  [1154, "Puesto trabajo pesado"],
  [1155, "APVI"],
  [1157, "APVC"],
  [1131, "Indemnización a todo evento"],
  [1132, "Tasa indemnización a todo evento"],
  // Categoría 2, subcategoría 1: haberes imponibles y tributables (25)
  [2101, "Sueldo"],
  [2102, "Sobresueldo"],
  [2103, "Comisiones"],
  [2104, "Semana corrida"],
  [2105, "Participación"],
  [2106, "Gratificación"],
  [2107, "Recargo 30% día domingo"],
  [2108, "Remun. variable pagada en vacaciones"],
  [2109, "Remun. variable pagada en clausura"],
  [2110, "Aguinaldo"],
  [2111, "Bonos u otras remun. fijas mensuales"],
  [2112, "Tratos"],
  [2113, "Bonos u otras remun. variables"],
  [2114, "Ejercicio opción no pactada en contrato"],
  [2115, "Beneficios en especie constitutivos de remun."],
  [2116, "Remuneraciones bimestrales"],
  [2117, "Remuneraciones trimestrales"],
  [2118, "Remuneraciones cuatrimestrales"],
  [2119, "Remuneraciones semestrales"],
  [2120, "Remuneraciones anuales"],
  [2121, "Participación anual"],
  [2122, "Gratificación anual"],
  [2123, "Otras remuneraciones superiores a un mes"],
  [2124, "Pago por horas de trabajo sindical"],
  [2161, "Sueldo empresarial"],
  // Subcategoría 2: imponibles y no tributables (4)
  [2201, "Subsidio por incapacidad laboral por licencia médica"],
  [2202, "Beca de estudio"],
  [2203, "Gratificaciones de zona"],
  [2204, "Otros ingresos no constitutivos de renta"],
  // Subcategoría 3: no imponibles y no tributables (18, en el orden del anexo)
  [2301, "Colación"],
  [2302, "Movilización"],
  [2303, "Viáticos"],
  [2304, "Asignación de pérdida de caja"],
  [2305, "Asignación de desgaste herramienta"],
  [2311, "Asignación familiar legal"],
  [2306, "Gastos por causa del trabajo"],
  [2307, "Gastos por cambio de residencia"],
  [2308, "Sala cuna"],
  [2309, "Asignación trabajo a distancia o teletrabajo"],
  [2347, "Depósito convenido hasta UF 900"],
  [2310, "Alojamiento por razones de trabajo"],
  [2312, "Asignación de traslación"],
  [2313, "Indemnización por feriado legal"],
  [2314, "Indemnización años de servicio"],
  [2315, "Indemnización sustitutiva del aviso previo"],
  [2316, "Indemnización fuero maternal"],
  [2331, "Indemnización a todo evento"],
  // Subcategoría 4: no imponibles y tributables (2)
  [2417, "Indemnizaciones voluntarias tributables"],
  [2418, "Indemnizaciones contractuales tributables"],
  // Categoría 3: descuentos (37)
  [3141, "Cotización obligatoria previsional (AFP o IPS)"],
  [3143, "Cotización obligatoria salud 7%"],
  [3144, "Cotización voluntaria para salud"],
  [3151, "Cotización AFC - trabajador"],
  [3146, "Cotizaciones técnico extranjero"],
  [3147, "Descuento depósito convenido hasta UF 900 anual"],
  [3155, "Cotización APVI modalidad A"],
  [3156, "Cotización APVI modalidad B hasta UF 50"],
  [3157, "Cotización APVC modalidad A"],
  [3158, "Cotización APVC modalidad B hasta UF 50"],
  [3161, "Impuesto retenido por remuneraciones"],
  [3162, "Impuesto retenido por indemnizaciones"],
  [3163, "Mayor retención de impuestos solicitada"],
  [3164, "Impuesto retenido reliquidación otros períodos"],
  [3165, "Diferencia impuesto reliquidación este período"],
  [3166, "Retención préstamo clase media 2020"],
  [3167, "Rebaja zona extrema DL 889"],
  [3171, "Cuota sindical 1"],
  [3172, "Cuota sindical 2"],
  [3173, "Cuota sindical 3"],
  [3174, "Cuota sindical 4"],
  [3175, "Cuota sindical 5"],
  [3176, "Cuota sindical 6"],
  [3177, "Cuota sindical 7"],
  [3178, "Cuota sindical 8"],
  [3179, "Cuota sindical 9"],
  [3180, "Cuota sindical 10"],
  [3110, "Crédito social CCAF"],
  [3181, "Cuota vivienda o educación"],
  [3182, "Crédito cooperativas de ahorro"],
  [3183, "Otros descuentos autorizados por el trabajador"],
  [3154, "Cotización adicional trabajo pesado - trabajador"],
  [3184, "Donaciones culturales y de reconstrucción"],
  [3185, "Otros descuentos"],
  [3186, "Pensiones de alimentos"],
  [3187, "Descuento mujer casada"],
  [3188, "Descuentos por anticipos y préstamos"],
  // Categoría 4: aportes del empleador (6)
  [4151, "Aporte AFC - empleador"],
  [4152, "Aporte empleador seguro accidentes del trabajo y Ley SANNA"],
  [4131, "Aporte empleador indemnización a todo evento"],
  [4154, "Aporte adicional trabajo pesado - empleador"],
  [4155, "Aporte empleador seguro invalidez y sobrevivencia"],
  [4157, "Aporte empleador APVC"],
  // Categoría 5: totales (15)
  [5201, "Total haberes"],
  [5210, "Total haberes imponibles y tributables"],
  [5220, "Total haberes imponibles no tributables"],
  [5230, "Total haberes no imponibles y no tributables"],
  [5240, "Total haberes no imponibles y tributables"],
  [5301, "Total descuentos"],
  [5361, "Total descuentos impuestos a las remuneraciones"],
  [5362, "Total descuentos impuestos por indemnizaciones"],
  [5341, "Total descuentos por cotizaciones del trabajador"],
  [5302, "Total otros descuentos"],
  [5410, "Total aportes empleador"],
  [5501, "Total líquido"],
  [5502, "Total indemnizaciones"],
  [5564, "Total indemnizaciones tributables"],
  [5565, "Total indemnizaciones no tributables"],
];

// ---------------------------------------------------------------------------
// Anexo N°2: tablas de validación que el sitio necesita.
// ---------------------------------------------------------------------------

// Tabla N°9: AFP (cód 1141). Claves = valores internos del sitio.
export const LRE_AFP = {
  provida: 6,
  planvital: 11,
  cuprum: 13,
  habitat: 14,
  uno: 19,
  capital: 31,
  modelo: 103,
};

// Tabla N°11: Fonasa / Isapre (cód 1143). Solo isapres abiertas más Fonasa.
export const LRE_SALUD = {
  fonasa: { codigo: 102, nombre: "Fonasa" },
  cruzblanca: { codigo: 1, nombre: "Isapre Cruz Blanca" },
  banmedica: { codigo: 3, nombre: "Isapre Banmédica" },
  colmena: { codigo: 4, nombre: "Isapre Colmena" },
  consalud: { codigo: 9, nombre: "Isapre Consalud" },
  vidatres: { codigo: 12, nombre: "Isapre Vida Tres" },
  nuevamasvida: { codigo: 43, nombre: "Isapre Nueva Masvida" },
  esencial: { codigo: 44, nombre: "Isapre Esencial" },
};

// Tabla N°2: región de prestación de servicios (cód 1105).
export const LRE_REGIONES = [
  [1, "Tarapacá"],
  [2, "Antofagasta"],
  [3, "Atacama"],
  [4, "Coquimbo"],
  [5, "Valparaíso"],
  [6, "O'Higgins"],
  [7, "Maule"],
  [8, "Biobío"],
  [9, "Araucanía"],
  [10, "Los Lagos"],
  [11, "Aysén"],
  [12, "Magallanes"],
  [13, "Metropolitana"],
  [14, "Los Ríos"],
  [15, "Arica y Parinacota"],
  [16, "Ñuble"],
];

// Tabla N°14: organismo administrador ley 16.744 (cód 1152).
export const LRE_MUTUALES = [
  [0, "Sin mutual (ISL)"],
  [1, "ACHS"],
  [2, "Mutual de Seguridad CChC"],
  [3, "IST"],
];

// Muestra de la Tabla N°3 (comunas) para sugerencias. La tabla completa vive
// en el manual oficial; el código exacto lo escribe la empresa una vez.
export const LRE_COMUNAS_FRECUENTES = [
  [13101, "Santiago"],
  [13114, "Las Condes"],
  [13123, "Providencia"],
  [13122, "Peñalolén"],
  [13112, "La Pintana"],
  [13126, "Quinta Normal"],
  [13201, "Puente Alto"],
  [13401, "San Bernardo"],
  [13501, "Melipilla"],
  [13601, "Talagante"],
  [5101, "Valparaíso"],
  [8101, "Concepción"],
  [6101, "Rancagua"],
  [7101, "Talca"],
  [9101, "Temuco"],
  [4101, "La Serena"],
  [10101, "Puerto Montt"],
  [2101, "Antofagasta"],
  [3101, "Copiapó"],
  [1101, "Iquique"],
  [15101, "Arica"],
  [12101, "Punta Arenas"],
  [11101, "Coihaique"],
];

export const LRE_MANUAL_URL =
  "https://static-content.api.dirtrab.cl/dt-docs/lre/lre_instrucciones_de_carga.pdf";

// ---------------------------------------------------------------------------
// Utilidades de formato
// ---------------------------------------------------------------------------

export function rutParaLre(rut) {
  const limpio = String(rut || "")
    .replace(/[.\s]/g, "")
    .toUpperCase();
  if (!/^\d{1,8}-[\dK]$/.test(limpio)) return "";
  return limpio.replace(/^0+/, "");
}

export function fechaParaLre(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function nombreArchivoLre(rutEmpresa, periodo) {
  const rut = rutParaLre(rutEmpresa) || "empresa";
  const p = /^(\d{4})-(\d{2})$/.exec(String(periodo || ""));
  const aaaamm = p ? `${p[1]}${p[2]}` : "";
  return `${rut}_${aaaamm}.csv`;
}

// Jornada parcial: art. 40 bis del Código del Trabajo, hasta dos tercios de
// la jornada ordinaria (42 h × 2/3 = 28 h). Tabla N°6: 101 ordinaria, 201 parcial.
export function codigoJornada(horasSemana) {
  const h = Number(horasSemana) || 42;
  return h <= 28 ? 201 : 101;
}

// El manual exige codificación ANSI. Los caracteres del formato (tildes, ñ, °)
// comparten punto de código en Latin-1 y Windows-1252; el resto se degrada a "?".
export function codificarAnsi(texto) {
  const bytes = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto.charCodeAt(i);
    bytes[i] = c <= 255 ? c : 0x3f;
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Datos que el borrador aún no puede completar por sí solo
// ---------------------------------------------------------------------------

export function datosFaltantesLre(trabajador) {
  const faltan = [];
  if (!rutParaLre(trabajador.rut)) faltan.push("RUT válido");
  if (!fechaParaLre(trabajador.fechaIngreso)) faltan.push("fecha de ingreso");
  const salud = String(trabajador.salud || "fonasa").toLowerCase();
  if (!LRE_SALUD[salud]) faltan.push("isapre específica");
  return faltan;
}

// ---------------------------------------------------------------------------
// Generación
// ---------------------------------------------------------------------------

function filaLre(trabajador, contexto, indicadores) {
  const c = calcularSueldo(trabajador, indicadores);
  const v = {};

  const salud = LRE_SALUD[String(trabajador.salud || "fonasa").toLowerCase()];
  const bonosImp = roundPeso(
    (c.haberes || [])
      .filter((h) => h.imponible && !["sueldoBase", "horasExtras", "gratificacion"].includes(h.key))
      .reduce((s, h) => s + h.monto, 0),
  );
  const colacionCalc = roundPeso((c.haberes || []).find((h) => h.key === "colacion")?.monto || 0);
  const movilizacionCalc = roundPeso((c.haberes || []).find((h) => h.key === "movilizacion")?.monto || 0);
  const otrosNoImp = roundPeso(Math.max(0, c.noImponible - colacionCalc - movilizacionCalc));
  const saludVoluntaria = Math.max(0, c.salud.monto - c.salud.legal);
  const cotizaciones = c.afp.monto + c.salud.monto + c.cesantia.monto;
  const namedDesc = Array.isArray(c.descuentosNombrados) ? c.descuentosNombrados : [];
  const anticiposPrestamos = sumaAnticiposPrestamos(namedDesc);
  const otrosDescLegal = namedDesc
    .filter((d) => d.tipo === "legal" || d.tipo === "vivienda_educacion")
    .reduce((s, d) => s + roundPeso(d.monto), 0);
  const otrosDescuentos = roundPeso(
    (namedDesc.length ? 0 : Number(trabajador.otrosDescuentos) || 0) + otrosDescLegal,
  );
  const diasTrabajados = c.dias?.diasTrabajados ?? 30;
  const diasLicencia = c.dias?.diasLicencia || 0;
  const diasVacaciones = c.dias?.diasVacaciones || 0;

  // Identificación
  v[1101] = rutParaLre(trabajador.rut);
  v[1102] = fechaParaLre(trabajador.fechaIngreso);
  v[1105] = contexto.region || "";
  v[1106] = contexto.comuna || "";
  v[1170] = 1; // impuesto único de segunda categoría
  v[1146] = 0;
  v[1107] = codigoJornada(trabajador.jornada);
  v[1108] = 0;
  v[1109] = 0;
  v[1141] = LRE_AFP[String(trabajador.afp || "modelo").toLowerCase()] ?? "";
  v[1142] = 0;
  v[1143] = salud ? salud.codigo : "";
  v[1151] = 1;
  v[1110] = 0;
  v[1152] = contexto.mutual ?? 0;
  v[1115] = diasTrabajados;
  if (diasLicencia) v[1116] = diasLicencia;
  if (diasVacaciones) v[1117] = diasVacaciones;
  v[1118] = 0;
  v[1155] = 0;
  v[1157] = 0;
  v[1131] = 0;

  // Haberes
  v[2101] = c.sueldoBase;
  if (c.montoHorasExtras) v[2102] = c.montoHorasExtras;
  if (c.gratificacion) v[2106] = c.gratificacion;
  if (bonosImp) v[2111] = bonosImp;
  if (colacionCalc) v[2301] = colacionCalc;
  if (movilizacionCalc) v[2302] = movilizacionCalc;
  if (otrosNoImp) v[2306] = otrosNoImp; // devoluciones de gastos, art. 41 inciso 2

  // Descuentos
  v[3141] = c.afp.monto;
  v[3143] = c.salud.legal;
  if (saludVoluntaria) v[3144] = saludVoluntaria;
  if (c.cesantia.monto) v[3151] = c.cesantia.monto;
  v[3161] = c.iusc;
  if (otrosDescuentos) v[3183] = otrosDescuentos;
  if (anticiposPrestamos) v[3188] = anticiposPrestamos;

  // Aportes del empleador: /costo-empresa estima Ley 21.735, cesantía,
  // mutual y SANNA; el LRE sigue en 0 para que el contador complete la
  // tasa adicional SUSESO. La DT exige el campo pero acepta cero.
  v[4152] = 0;
  v[4155] = 0;

  // Totales
  v[5201] = c.totalHaberes;
  v[5210] = c.imponible;
  v[5220] = 0;
  v[5230] = c.noImponible;
  v[5240] = 0;
  v[5301] = c.totalDescuentos;
  v[5361] = c.iusc;
  v[5341] = cotizaciones;
  v[5302] = roundPeso(c.totalDescuentos - c.iusc - cotizaciones);
  v[5410] = 0;
  v[5501] = c.liquido;
  v[5564] = 0;

  return v;
}

export function generarLre({ trabajadores = [], contexto = {}, indicadores = {} } = {}) {
  const encabezado = LRE_COLUMNAS.map(([cod, nombre]) => `${nombre}(${cod})`).join(";");
  const lineas = trabajadores.map((t) => {
    const v = filaLre(t, contexto, indicadores);
    return LRE_COLUMNAS.map(([cod]) => (v[cod] === undefined || v[cod] === "" ? "" : String(v[cod]))).join(";");
  });
  return [encabezado, ...lineas].join("\r\n") + "\r\n";
}
