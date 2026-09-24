#!/usr/bin/env node
/**
 * Verificación de cifras oficiales y de la estructura del sitio Haberes.
 * Ejecutar: node scripts/verify.mjs
 */
import { readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AFP_COMISION,
  ASIGNACION_FAMILIAR_TRAMOS,
  CESANTIA_EMPLEADOR_INDEFINIDO,
  CESANTIA_EMPLEADOR_INDEFINIDO_CIC,
  CESANTIA_EMPLEADOR_INDEFINIDO_FCS,
  CESANTIA_EMPLEADOR_PLAZO_CIC,
  CESANTIA_EMPLEADOR_PLAZO_FCS,
  CESANTIA_EMPLEADOR_PLAZO_FIJO,
  DISCLAIMER,
  DISCLAIMER_FINIQUITO,
  FALLBACK_UF,
  FALLBACK_UTM,
  GRATIFICACION_TOPE,
  IMM,
  IMM_ANTERIOR,
  IMM_MENOR_MAYOR,
  IMM_NO_REMUNERACIONAL,
  INTERES_MORA_GOLD,
  IPC_INE,
  IUSC_TRAMOS,
  LEY_21735_CRP,
  LEY_21735_CUENTA_INDIVIDUAL,
  LEY_21735_SSP,
  LEY_21735_TASA,
  MUTUAL_TASA_BASICA,
  SANNA_TASA,
  TEXTO_LEGAL_MAX,
  TOPE_AFP_SALUD_UF,
  TOPE_APV_REGIMEN_B_UF,
  TOPE_CESANTIA_UF,
  TMC_REAJUSTABLE_MENOS_UN_ANIO,
  TRABAJO_MENOS_PESADO_REBAJA_ANIOS_POR_BLOQUE,
  TRABAJO_MENOS_PESADO_REBAJA_MAX,
  TRABAJO_MENOS_PESADO_TASA_EMPLEADOR,
  TRABAJO_MENOS_PESADO_TASA_TRABAJADOR,
  TRABAJO_PESADO_ANIOS_BLOQUE,
  TRABAJO_PESADO_REBAJA_ANIOS_POR_BLOQUE,
  TRABAJO_PESADO_REBAJA_MAX,
  TRABAJO_PESADO_TASA_EMPLEADOR,
  TRABAJO_PESADO_TASA_TRABAJADOR,
  TUTELA_MESES_MAX,
  TUTELA_MESES_MIN,
  OBRA_FAENA_FACTOR_PLENO,
  PRESCRIPCION_GOLD,
  DESCANSO_COMPENSATORIO_GOLD,
  CUOTA_INCLUSION_LABORAL,
  DONACION_INCLUSION_IMM_ANUAL,
  INCLUSION_LABORAL_GOLD,
  JORNADA_ORDINARIA_MAX_H,
  JORNADA_ORDINARIA_MIN_H,
  JORNADA_ORDINARIA_REF_H,
  JORNADA_PARCIAL_FERIADO_BASE_DIAS,
  JORNADA_PARCIAL_FRACCION_TOPE,
  JORNADA_PARCIAL_GOLD,
  JORNADA_PARCIAL_TOLERANCIA_H,
  TELETRABAJO_DESCONEXION_MIN_H,
  TELETRABAJO_GOLD,
  TELETRABAJO_PERIODO_H,
  TELETRABAJO_TOLERANCIA_H,
  BANDAS_HORARIAS_EDAD_MAX_ANIOS,
  BANDAS_HORARIAS_GOLD,
  BANDAS_HORARIAS_MAX_MIN,
  PACTO_4X3_DIAS_MAX,
  PACTO_4X3_DIAS_MIN,
  PACTO_4X3_GOLD,
  PACTO_4X3_TOPE_DIARIO_H,
  PACTO_4X3_TOPE_SEMANAL_H,
  PACTO_4X3_VIGENCIA_GENERAL,
  JORNADA_EXCEPCIONAL_DIAS_EXTRA_41,
  JORNADA_EXCEPCIONAL_DIAS_EXTRA_42,
  JORNADA_EXCEPCIONAL_GOLD,
  JORNADA_EXCEPCIONAL_TOPE_AUTORIZABLE_H,
  JORNADA_EXCEPCIONAL_TOPE_ORDINARIO_2026_H,
  JORNADA_EXCEPCIONAL_TOPE_ORDINARIO_2028_H,
  JORNADA_BISEMANAL_GOLD,
  JORNADA_BISEMANAL_MAX_DIAS_TRABAJO,
  JORNADA_BISEMANAL_MIN_DIAS_DESCANSO,
  COMPENSACION_HE_AVISO_HORAS,
  COMPENSACION_HE_GOLD,
  COMPENSACION_HE_JORNADA_DIARIA_42_5,
  COMPENSACION_HE_JORNADA_DIARIA_DEFAULT,
  COMPENSACION_HE_PLAZO_MESES,
  COMPENSACION_HE_RECARGO,
  COMPENSACION_HE_TOPE_DIAS,
  PACTO_HE_GOLD,
  PACTO_HE_TOPE_DIARIO,
  CONTRATO_PLAZO_FIJO_GOLD,
  TERMINO_ANTICIPADO_PLAZO_FIJO_GOLD,
  PERMISO_SIN_GOCE_GOLD,
  ZONA_EXTREMA_GOLD,
  PROMEDIO_REMUNERACIONES_GOLD,
  ANTIGUEDAD_LABORAL_GOLD,
  TOPE_IMPONIBLE_GOLD,
  GRADO_1A_EUS_ZONA_EXTREMA,
  INCREMENTO_ASIGNACION_ZONA_LEY_19354,
  CONTRATO_PLAZO_FIJO_TOLERANCIA_DIAS,
  CONTRATO_PLAZO_FIJO_TOPE_GENERAL_MESES,
  CONTRATO_PLAZO_FIJO_TOPE_TITULO_MESES,
  UMBRAL_INCLUSION_LABORAL,
  RECARGO_168_DEFAULT,
  RECARGO_168_PORCENTAJES,
  RETENCION_BOLETA_ANIO_DEFAULT,
  RETENCION_BOLETA_HONORARIOS,
  UMBRAL_SALA_CUNA,
  POSTNATAL_PARENTAL_SEMANAS_COMPLETA,
  POSTNATAL_PARENTAL_SEMANAS_MIN_MADRE,
  POSTNATAL_PARENTAL_SEMANAS_PARCIAL,
  DESCANSO_PRENATAL_SEMANAS,
  DESCANSO_PRENATAL_DIAS,
  DESCANSO_POSTNATAL_SEMANAS,
  DESCANSO_POSTNATAL_DIAS,
  HORA_LACTANCIA_DIAS_DEFAULT,
  HORA_LACTANCIA_EDAD_MAX_MESES,
  HORA_LACTANCIA_MINUTOS_LEGAL,
  HORA_LACTANCIA_MINUTOS_MAX,
  resumirTextoLegal,
} from "../js/constants.js";
import { CAUSALES, causalPorId } from "../js/causales.js";
import { parseNovedadesCsv, parseTrabajadoresCsv } from "../js/csv.js";
import {
  aniosServicio,
  calcularAvisoPrevio,
  calcularFiniquito,
  calcularFiniquitoCasaParticular,
  calcularFiniquitoCompleto,
  calcularIas,
  calcularIndemnizacionObraFaena,
  calcularTutelaLaboral,
  calcularDespidoInjustificado,
  factorIndemnizacionObraFaena,
  feriadoProporcional,
  mesesObraFaena,
  vigenciaUnAnioOMas,
} from "../js/finiquito.js";
import {
  diasDelPeriodo,
  inputDesdeFichaYNovedades,
  proporcional,
  validarArt58,
} from "../js/novedades.js";
import {
  calcularAsignacionFamiliar,
  calcularAguinaldo,
  calcularColacionMovilizacion,
  calcularCostoEmpresa,
  calcularFeriadoProgresivo,
  calcularFeriadoAnual,
  calcularIusc,
  calcularRecargoDomingoComercio,
  calcularFeriadoIrrenunciable,
  calcularSeguroCesantia,
  calcularTrabajoPesado,
  calcularSemanaCorrida,
  calcularSueldo,
  calcularDescuentoAtrasosInasistencias,
  calcularLicenciaMedica,
  calcularBoletaHonorarios,
  calcularRetencionJudicial,
  calcularApv,
  calcularSalaCuna,
  calcularPostnatalParental,
  calcularFueroMaternal,
  calcularPermisoPrenatal,
  calcularNulidadDespido,
  calcularPermisoPaternidad,
  calcularPermisoMatrimonio,
  calcularPermisoFallecimiento,
  calcularInteresMora,
  calcularHoraLactancia,
  calcularJornada40Horas,
  topeJornadaOrdinaria,
  calcularSueldoMinimo,
  calcularSueldoProporcional,
  diasCalendarioFraccionMes,
  brutoDesdeLiquido,
  gratificacionArt50,
  tasaAfp,
  valorHoraExtra,
  valorHoraOrdinaria,
} from "../js/sueldo.js";
import { calcularViatico } from "../js/viatico.js";
import { clp, dvRut, validarRut } from "../js/format.js";
import {
  LRE_AFP,
  LRE_COLUMNAS,
  LRE_REGIONES,
  LRE_SALUD,
  codificarAnsi,
  codigoJornada,
  fechaParaLre,
  generarLre,
  nombreArchivoLre,
  rutParaLre,
} from "../js/lre.js";
import { fallbackIndicadores } from "../js/indicadores.js";
import { calcularPrescripcionLaboral } from "../js/prescripcion-laboral.js";
import { calcularDescansoCompensatorio } from "../js/descanso-compensatorio.js";
import { calcularInclusionLaboral } from "../js/inclusion-laboral.js";
import { calcularJornadaParcial } from "../js/jornada-parcial.js";
import { calcularTeletrabajo } from "../js/teletrabajo.js";
import { calcularBandasHorarias } from "../js/bandas-horarias.js";
import { calcularPacto4x3 } from "../js/pacto-4x3.js";
import { calcularJornadaExcepcional } from "../js/jornada-excepcional.js";
import { calcularJornadaBisemanal } from "../js/jornada-bisemanal.js";
import { calcularCompensacionHorasExtras } from "../js/compensacion-horas-extras.js";
import { calcularPactoHorasExtras } from "../js/pacto-horas-extras.js";
import { calcularContratoPlazoFijo } from "../js/contrato-plazo-fijo.js";
import { calcularTerminoAnticipadoPlazoFijo } from "../js/termino-anticipado-plazo-fijo.js";
import { calcularPermisoSinGoce, diasCorridosDelMes } from "../js/permiso-sin-goce.js";
import {
  calcularZonaExtrema,
  pctIncrementadoDesdeBase,
  zonaExtremaPorId,
} from "../js/zona-extrema.js";
import { calcularPromedioRemuneraciones } from "../js/promedio-remuneraciones.js";
import {
  calcularAntiguedadLaboral,
  diasEntreIso,
  esFraccionSuperiorSeisMeses,
  sumarMesesIso,
  textoAntiguedad,
} from "../js/antiguedad-laboral.js";
import { calcularTopeImponible, ufValida } from "../js/tope-imponible.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
let passed = 0;

function ok(name) {
  passed += 1;
  console.log(`  ok  ${name}`);
}

function fail(name, detail) {
  failed += 1;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

function assert(name, cond, detail) {
  if (cond) ok(name);
  else fail(name, detail);
}

function close(a, b, eps = 0.01) {
  return Math.abs(a - b) <= eps;
}

console.log("Haberes verify\n");

console.log("No regresión · mes completo sin novedades");
{
  const csvNamed0 = parseTrabajadoresCsv(readFileSync(join(root, "ejemplos/trabajadores.csv"), "utf8"));
  const liqs0 = csvNamed0.map((t) => calcularSueldo(t, { uf: FALLBACK_UF }).liquido);
  assert(
    "No regresión: Ana/Luis/Camila sin novedades → 988656 / 988031 / 1570949",
    liqs0[0] === 988656 && liqs0[1] === 988031 && liqs0[2] === 1570949,
    JSON.stringify(liqs0),
  );
}

console.log("Constantes oficiales");
assert("UF fallback", FALLBACK_UF === 40854.01, String(FALLBACK_UF));
assert("UTM fallback", FALLBACK_UTM === 71649, String(FALLBACK_UTM));
assert("IMM Ley 21.830", IMM === 553553, String(IMM));
assert("IMM menor/mayor Ley 21.830", IMM_MENOR_MAYOR === 412938, String(IMM_MENOR_MAYOR));
assert("IMM no remuneracional Ley 21.830", IMM_NO_REMUNERACIONAL === 356815, String(IMM_NO_REMUNERACIONAL));
assert("IMM anterior Ley 21.751 ene-2026", IMM_ANTERIOR === 539000, String(IMM_ANTERIOR));
assert("Tope gratificación art.50", GRATIFICACION_TOPE === 219115, String(GRATIFICACION_TOPE));
assert(
  "AFP Circular 2414",
  AFP_COMISION.uno === 0.49 &&
    AFP_COMISION.modelo === 0.58 &&
    AFP_COMISION.planvital === 1.16 &&
    AFP_COMISION.habitat === 1.27 &&
    AFP_COMISION.capital === 1.44 &&
    AFP_COMISION.cuprum === 1.44 &&
    AFP_COMISION.provida === 1.45,
);
assert("Tope AFP/salud 90 UF", TOPE_AFP_SALUD_UF === 90);
assert("Obra o faena factor pleno 2,5", OBRA_FAENA_FACTOR_PLENO === 2.5);
assert(
  "Descanso compensatorio gold 4+1−2 → 3",
  DESCANSO_COMPENSATORIO_GOLD.pendientes === 3 &&
    DESCANSO_COMPENSATORIO_GOLD.valorDia === 30_000 &&
    DESCANSO_COMPENSATORIO_GOLD.estimacion === 90_000,
);
assert(
  "Jornada parcial gold 40/20 → $450.000 y 7,50 días",
  JORNADA_PARCIAL_GOLD.medioTiempo.sueldoParcial === 450_000 &&
    JORNADA_PARCIAL_GOLD.medioTiempo.diasFeriado === 7.5 &&
    JORNADA_PARCIAL_GOLD.excede.cumpleTope === false &&
    JORNADA_PARCIAL_GOLD.alTope.sueldoParcial === 533_400,
);
assert(
  "Permiso sin goce gold $900.000 / 30 × 3 → $90.000 y $810.000",
  PERMISO_SIN_GOCE_GOLD.corridos30.descuento === 90_000 &&
    PERMISO_SIN_GOCE_GOLD.corridos30.sueldoMes === 810_000 &&
    PERMISO_SIN_GOCE_GOLD.laborables20.descuento === 90_000 &&
    PERMISO_SIN_GOCE_GOLD.ceroDias.descuento === 0 &&
    PERMISO_SIN_GOCE_GOLD.ceroDias.sueldoMes === 900_000,
);
assert(
  "Término anticipado plazo fijo gold $800.000, 1-abr-2026→1-jul-2026 → $2.400.000",
  TERMINO_ANTICIPADO_PLAZO_FIJO_GOLD.tresMeses800.sueldoMensual === 800_000 &&
    TERMINO_ANTICIPADO_PLAZO_FIJO_GOLD.tresMeses800.fechaTerminoAnticipado === "2026-04-01" &&
    TERMINO_ANTICIPADO_PLAZO_FIJO_GOLD.tresMeses800.fechaTerminoPactada === "2026-07-01" &&
    TERMINO_ANTICIPADO_PLAZO_FIJO_GOLD.tresMeses800.mesesRemanentes === 3 &&
    TERMINO_ANTICIPADO_PLAZO_FIJO_GOLD.tresMeses800.diasRemanentes === 91 &&
    TERMINO_ANTICIPADO_PLAZO_FIJO_GOLD.tresMeses800.remuneracionRemanente === 2_400_000 &&
    TERMINO_ANTICIPADO_PLAZO_FIJO_GOLD.mesesSolo.remuneracionRemanente === 2_400_000 &&
    TERMINO_ANTICIPADO_PLAZO_FIJO_GOLD.mismoDia.remuneracionRemanente === 0,
);
assert(
  "Promedio remuneraciones gold 800+200 / 800+400 / 800+100 → $1.033.333",
  PROMEDIO_REMUNERACIONES_GOLD.tresMeses.promedio === 1_033_333 &&
    PROMEDIO_REMUNERACIONES_GOLD.tresMeses.suma === 3_100_000 &&
    PROMEDIO_REMUNERACIONES_GOLD.tresMeses.n === 3 &&
    PROMEDIO_REMUNERACIONES_GOLD.dosMeses.promedio === 1_100_000 &&
    PROMEDIO_REMUNERACIONES_GOLD.dosMeses.n === 2,
);
assert(
  "Antigüedad laboral gold 2020-01-15→2026-07-15 = 6a 6m 0d / IAS 6 / feriado 78",
  ANTIGUEDAD_LABORAL_GOLD.seisAniosSeisMeses.anosCompletos === 6 &&
    ANTIGUEDAD_LABORAL_GOLD.seisAniosSeisMeses.mesesRemanentes === 6 &&
    ANTIGUEDAD_LABORAL_GOLD.seisAniosSeisMeses.diasRemanentes === 0 &&
    ANTIGUEDAD_LABORAL_GOLD.seisAniosSeisMeses.anosIAS === 6 &&
    ANTIGUEDAD_LABORAL_GOLD.seisAniosSeisMeses.mesesFeriado === 78 &&
    ANTIGUEDAD_LABORAL_GOLD.visperaAniversario.anosIAS === 5 &&
    ANTIGUEDAD_LABORAL_GOLD.mismoDia.anosIAS === 0,
);
assert(
  "Tope imponible gold UF 39.000: 90 UF = $3.510.000, 135,2 UF = $5.272.800; $4.000.000 → exceso $490.000",
  TOPE_IMPONIBLE_GOLD.uf === 39_000 &&
    TOPE_IMPONIBLE_GOLD.topeAfpSaludPesos === 3_510_000 &&
    TOPE_IMPONIBLE_GOLD.topeAfpSaludPesos === TOPE_AFP_SALUD_UF * TOPE_IMPONIBLE_GOLD.uf &&
    TOPE_IMPONIBLE_GOLD.topeCesantiaPesos === 5_272_800 &&
    TOPE_IMPONIBLE_GOLD.topeCesantiaPesos === Math.round(TOPE_CESANTIA_UF * TOPE_IMPONIBLE_GOLD.uf) &&
    TOPE_IMPONIBLE_GOLD.bajoTope.excesoAfpSalud === 0 &&
    TOPE_IMPONIBLE_GOLD.bajoTope.margenAfpSalud === 10_000 &&
    TOPE_IMPONIBLE_GOLD.sobreTopeAfp.excesoAfpSalud === 490_000 &&
    TOPE_IMPONIBLE_GOLD.sobreAmbosTopes.excesoCesantia === 727_200,
);
assert(
  "Bandas horarias gold 09:00–18:00 ±60 y 08:30–17:30 −30",
  BANDAS_HORARIAS_MAX_MIN === 60 &&
    BANDAS_HORARIAS_EDAD_MAX_ANIOS === 12 &&
    BANDAS_HORARIAS_GOLD.anticipar60.horaInicioNueva === "08:00" &&
    BANDAS_HORARIAS_GOLD.anticipar60.horaFinNueva === "17:00" &&
    BANDAS_HORARIAS_GOLD.retrasar60.horaInicioNueva === "10:00" &&
    BANDAS_HORARIAS_GOLD.retrasar60.horaFinNueva === "19:00" &&
    BANDAS_HORARIAS_GOLD.anticipar30.horaInicioNueva === "08:00" &&
    BANDAS_HORARIAS_GOLD.cero.horaInicioNueva === "09:00" &&
    BANDAS_HORARIAS_GOLD.excede.ok === false,
);
assert(
  "Pacto 4×3 gold 40/4=10, 36/4=9, 42 sin reducción y tope diario",
  PACTO_4X3_TOPE_SEMANAL_H === 40 &&
    PACTO_4X3_TOPE_DIARIO_H === 10 &&
    PACTO_4X3_DIAS_MIN === 4 &&
    PACTO_4X3_DIAS_MAX === 6 &&
    PACTO_4X3_VIGENCIA_GENERAL === "2028-04-26" &&
    PACTO_4X3_GOLD.clasico40.horasDiarias === 10 &&
    PACTO_4X3_GOLD.clasico40.diasDescanso === 3 &&
    PACTO_4X3_GOLD.clasico40.elegibilidad === "ahora" &&
    PACTO_4X3_GOLD.treintaSeis.horasDiarias === 9 &&
    PACTO_4X3_GOLD.cuarentaDosSinReduccion.ok === false &&
    PACTO_4X3_GOLD.cuarentaDosSinReduccion.horasDiarias === 0 &&
    PACTO_4X3_GOLD.topeDiario.ok === false &&
    PACTO_4X3_GOLD.topeDiario.motivo === "tope" &&
    PACTO_4X3_GOLD.cincoDias42.horasDiarias === 42 / 5 &&
    PACTO_4X3_GOLD.cincoDias42.elegibilidad === "ahora" &&
    PACTO_4X3_GOLD.diasFraccion.motivo === "dias" &&
    PACTO_4X3_GOLD.diasFraccion.ok === false,
);
assert(
  "Jornada excepcional gold PHSC 42/41/48 y días extra 0/4,5/9",
  JORNADA_EXCEPCIONAL_TOPE_AUTORIZABLE_H === 42 &&
    JORNADA_EXCEPCIONAL_TOPE_ORDINARIO_2026_H === 42 &&
    JORNADA_EXCEPCIONAL_TOPE_ORDINARIO_2028_H === 40 &&
    JORNADA_EXCEPCIONAL_DIAS_EXTRA_42 === 9 &&
    JORNADA_EXCEPCIONAL_DIAS_EXTRA_41 === 4.5 &&
    JORNADA_EXCEPCIONAL_GOLD.sietePorSiete2026.phsc === 42 &&
    JORNADA_EXCEPCIONAL_GOLD.sietePorSiete2026.diasAdicionales === 0 &&
    JORNADA_EXCEPCIONAL_GOLD.sietePorSiete2028.diasAdicionales === 9 &&
    JORNADA_EXCEPCIONAL_GOLD.phsc41_2028.phsc === 41 &&
    JORNADA_EXCEPCIONAL_GOLD.phsc41_2028.diasAdicionales === 4.5 &&
    JORNADA_EXCEPCIONAL_GOLD.cuatroPorDoce.phsc === 48 &&
    JORNADA_EXCEPCIONAL_GOLD.cuatroPorDoce.ok === false &&
    JORNADA_EXCEPCIONAL_GOLD.cincoPor84.phsc === 42 &&
    JORNADA_EXCEPCIONAL_GOLD.ceroTrabajo.motivo === "datos" &&
    JORNADA_EXCEPCIONAL_GOLD.cicloInconsistente.motivo === "ciclo",
);
assert(
  "Jornada bisemanal gold art. 39: máx. 12 días, mín. 3 descanso, 10×4/80 h → 40,00",
  JORNADA_BISEMANAL_MAX_DIAS_TRABAJO === 12 &&
    JORNADA_BISEMANAL_MIN_DIAS_DESCANSO === 3 &&
    JORNADA_BISEMANAL_GOLD.diezPorCuatro2028.diasCiclo === 14 &&
    JORNADA_BISEMANAL_GOLD.diezPorCuatro2028.promedioSemanal === 40 &&
    JORNADA_BISEMANAL_GOLD.diezPorCuatro2028.cumpleArt39 === true &&
    JORNADA_BISEMANAL_GOLD.docePorTres2028.diasCiclo === 15 &&
    JORNADA_BISEMANAL_GOLD.docePorTres2028.promedioSemanal === 39.2 &&
    JORNADA_BISEMANAL_GOLD.superaTope2028.promedioSemanal === 42 &&
    JORNADA_BISEMANAL_GOLD.superaTope2028.regimen === "supera_tope" &&
    JORNADA_BISEMANAL_GOLD.descansoDos.cumpleArt39 === false &&
    JORNADA_BISEMANAL_GOLD.descansoDos.regimen === "invalido_art39" &&
    JORNADA_BISEMANAL_GOLD.treceDias.cumpleArt39 === false &&
    JORNADA_BISEMANAL_GOLD.ceroTrabajo.motivo === "datos" &&
    JORNADA_BISEMANAL_GOLD.descansoNegativo.motivo === "descanso",
);
assert(
  "Compensación HE gold 16×1,5=24 h → 3,00 días, tope 5 y 8 HE fraccionada",
  COMPENSACION_HE_RECARGO === 1.5 &&
    COMPENSACION_HE_TOPE_DIAS === 5 &&
    COMPENSACION_HE_PLAZO_MESES === 6 &&
    COMPENSACION_HE_AVISO_HORAS === 48 &&
    COMPENSACION_HE_JORNADA_DIARIA_DEFAULT === 8 &&
    COMPENSACION_HE_JORNADA_DIARIA_42_5 === 42 / 5 &&
    COMPENSACION_HE_GOLD.clasico16.horasFeriado === 24 &&
    COMPENSACION_HE_GOLD.clasico16.diasEquivalentes === 3 &&
    COMPENSACION_HE_GOLD.clasico16.diasDentroTope === 3 &&
    COMPENSACION_HE_GOLD.topeAnual.diasFueraTope === 1 &&
    COMPENSACION_HE_GOLD.fraccion.diasEquivalentes === 1.5 &&
    COMPENSACION_HE_GOLD.fraccion.diasCompletos === 1 &&
    COMPENSACION_HE_GOLD.sueldo800.equivalenciaPago === 112_000 &&
    COMPENSACION_HE_GOLD.cero.ok === false,
);
assert("Tope cesantía 135.2 UF", TOPE_CESANTIA_UF === 135.2);
assert(
  "Trabajo pesado CEN 2 %+2 % y 1 %+1 %",
  TRABAJO_PESADO_TASA_TRABAJADOR === 2 &&
    TRABAJO_PESADO_TASA_EMPLEADOR === 2 &&
    TRABAJO_MENOS_PESADO_TASA_TRABAJADOR === 1 &&
    TRABAJO_MENOS_PESADO_TASA_EMPLEADOR === 1 &&
    TRABAJO_PESADO_ANIOS_BLOQUE === 5 &&
    TRABAJO_PESADO_REBAJA_ANIOS_POR_BLOQUE === 2 &&
    TRABAJO_PESADO_REBAJA_MAX === 10 &&
    TRABAJO_MENOS_PESADO_REBAJA_ANIOS_POR_BLOQUE === 1 &&
    TRABAJO_MENOS_PESADO_REBAJA_MAX === 5,
);
assert("Tope APV Régimen B 50 UF", TOPE_APV_REGIMEN_B_UF === 50);
assert(
  "Cesantía empleador Ley 19.728",
  CESANTIA_EMPLEADOR_INDEFINIDO === 0.024 && CESANTIA_EMPLEADOR_PLAZO_FIJO === 0.03,
);
assert(
  "Cesantía CIC/FCS Ley 19.728",
  CESANTIA_EMPLEADOR_INDEFINIDO_CIC === 0.016 &&
    CESANTIA_EMPLEADOR_INDEFINIDO_FCS === 0.008 &&
    CESANTIA_EMPLEADOR_PLAZO_CIC === 0.028 &&
    CESANTIA_EMPLEADOR_PLAZO_FCS === 0.002 &&
    close(CESANTIA_EMPLEADOR_INDEFINIDO_CIC + CESANTIA_EMPLEADOR_INDEFINIDO_FCS, CESANTIA_EMPLEADOR_INDEFINIDO, 1e-12) &&
    close(CESANTIA_EMPLEADOR_PLAZO_CIC + CESANTIA_EMPLEADOR_PLAZO_FCS, CESANTIA_EMPLEADOR_PLAZO_FIJO, 1e-12),
);
assert(
  "Ley 21.735 ago-2026 3,5 % con SIS incluido",
  LEY_21735_TASA === 0.035 &&
    LEY_21735_CUENTA_INDIVIDUAL === 0.001 &&
    LEY_21735_CRP === 0.009 &&
    LEY_21735_SSP === 0.025 &&
    close(LEY_21735_CUENTA_INDIVIDUAL + LEY_21735_CRP + LEY_21735_SSP, LEY_21735_TASA, 1e-12),
);
assert("Mutual básica 0,90 % y SANNA 0,03 %", MUTUAL_TASA_BASICA === 0.009 && SANNA_TASA === 0.0003);
assert("IUSC 8 tramos ago 2026", IUSC_TRAMOS.length === 8 && IUSC_TRAMOS[0].hasta === 967261.5);
assert(
  "Asignación familiar 4 tramos Ley 21.830",
  ASIGNACION_FAMILIAR_TRAMOS.length === 4 &&
    ASIGNACION_FAMILIAR_TRAMOS[0].hasta === 649039 &&
    ASIGNACION_FAMILIAR_TRAMOS[0].monto === 22601 &&
    ASIGNACION_FAMILIAR_TRAMOS[1].hasta === 947990 &&
    ASIGNACION_FAMILIAR_TRAMOS[1].monto === 13870 &&
    ASIGNACION_FAMILIAR_TRAMOS[2].hasta === 1478539 &&
    ASIGNACION_FAMILIAR_TRAMOS[2].monto === 4382 &&
    ASIGNACION_FAMILIAR_TRAMOS[3].monto === 0,
);

console.log("\nHoras extras art. 32");
assert("800000 → extra ≈ 6666.67 (jornada 42)", close(valorHoraExtra(800000, 42), 6666.67, 0.01), String(valorHoraExtra(800000, 42)));
assert(
  "fórmula DT: sueldo/30×28/(jornada×4)×1,5",
  close(valorHoraExtra(1_000_000, 42), (1_000_000 / 30) * 28 / (42 * 4) * 1.5, 0.0001),
  String(valorHoraExtra(1_000_000, 42)),
);
assert("sueldo 0 → hora extra 0", valorHoraExtra(0, 42) === 0);
assert("jornada 45: 800000 → extra ≈ 6222.22", close(valorHoraExtra(800000, 45), 6222.22, 0.01), String(valorHoraExtra(800000, 45)));
assert(
  "10 extras de 800000/42 ≈ 66667",
  Math.round(valorHoraExtra(800000, 42) * 10) === 66667,
  String(Math.round(valorHoraExtra(800000, 42) * 10)),
);
{
  const heApp = readFileSync(join(root, "js/app-horas-extras.js"), "utf8");
  assert(
    "app-horas-extras usa valorHoraExtra",
    /import\s*\{[^}]*valorHoraExtra[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(heApp) &&
      /valorHoraExtra\s*\(/.test(heApp),
  );
}

console.log("\nPacto horas extras arts. 31 y 32");
{
  const g = PACTO_HE_GOLD.conPacto;
  const con = calcularPactoHorasExtras({
    remuneracion: g.remuneracion,
    jornadaSemanal: g.jornadaSemanal,
    horasExtras: g.horasExtras,
    hayPacto: true,
  });
  assert(
    "840000/42 con pacto: hora ordinaria redondeada 4667",
    Math.round(con.valorHoraOrdinaria) === g.horaOrdinariaRedondeada &&
      Math.round(con.valorHoraOrdinaria) === Math.round(valorHoraOrdinaria(840_000, 42)),
    String(con.valorHoraOrdinaria),
  );
  assert(
    "840000/42 con pacto: hora extra 7000",
    Math.round(con.valorHoraExtra) === g.horaExtraRedondeada &&
      Math.round(con.valorHoraExtra) === Math.round(valorHoraExtra(840_000, 42)) &&
      close(con.valorHoraExtra, valorHoraExtra(840_000, 42), 0.0001),
    String(con.valorHoraExtra),
  );
  assert(
    "840000/42/10 HE con pacto: total 70000 y sin alerta de pacto",
    Math.round(con.total) === g.totalRedondeado &&
      Math.round(con.total) === Math.round(valorHoraExtra(840_000, 42) * 10) &&
      con.faltaPactoEscrito === false &&
      con.excedeTopeDiario === false &&
      con.hayPacto === true,
    String(con.total),
  );
  const sin = calcularPactoHorasExtras({
    remuneracion: PACTO_HE_GOLD.sinPacto.remuneracion,
    jornadaSemanal: PACTO_HE_GOLD.sinPacto.jornadaSemanal,
    horasExtras: PACTO_HE_GOLD.sinPacto.horasExtras,
    hayPacto: false,
  });
  assert(
    "840000/42/10 HE sin pacto: mismo monto y alerta de pacto escrito",
    Math.round(sin.valorHoraOrdinaria) === Math.round(con.valorHoraOrdinaria) &&
      Math.round(sin.valorHoraExtra) === Math.round(con.valorHoraExtra) &&
      Math.round(sin.total) === Math.round(con.total) &&
      sin.total === con.total &&
      sin.faltaPactoEscrito === true &&
      sin.excedeTopeDiario === false,
  );
  const tope = calcularPactoHorasExtras({
    remuneracion: PACTO_HE_GOLD.topeDiario.remuneracion,
    jornadaSemanal: PACTO_HE_GOLD.topeDiario.jornadaSemanal,
    horasExtras: PACTO_HE_GOLD.topeDiario.horasExtras,
    hayPacto: true,
    horasDiaMasLargo: PACTO_HE_GOLD.topeDiario.horasDiaMasLargo,
  });
  assert(
    "3 HE en un día: alerta de exceso sobre 2 h/día",
    tope.excedeTopeDiario === true &&
      tope.faltaPactoEscrito === false &&
      tope.topeDiario === PACTO_HE_TOPE_DIARIO &&
      PACTO_HE_TOPE_DIARIO === 2 &&
      calcularPactoHorasExtras({
        remuneracion: 840_000,
        jornadaSemanal: 42,
        horasExtras: 10,
        hayPacto: true,
        horasDiaMasLargo: 2,
      }).excedeTopeDiario === false,
  );
  const pheMod = readFileSync(join(root, "js/pacto-horas-extras.js"), "utf8");
  const pheApp = readFileSync(join(root, "js/app-pacto-horas-extras.js"), "utf8");
  assert(
    "pacto-horas-extras reutiliza valorHoraExtra y valorHoraOrdinaria",
    /import\s*\{[^}]*valorHoraExtra[^}]*valorHoraOrdinaria[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(pheMod) ||
      /import\s*\{[^}]*valorHoraOrdinaria[^}]*valorHoraExtra[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(pheMod),
  );
  assert(
    "app-pacto-horas-extras usa calcularPactoHorasExtras y muestra alertas",
    /import\s*\{[^}]*calcularPactoHorasExtras[^}]*\}\s*from\s*["']\.\/pacto-horas-extras\.js["']/.test(pheApp) &&
      /calcularPactoHorasExtras\s*\(/.test(pheApp) &&
      /outAlertaPacto/.test(pheApp) &&
      /outAlertaTope/.test(pheApp) &&
      /faltaPactoEscrito/.test(pheApp) &&
      /excedeTopeDiario/.test(pheApp),
  );
}

console.log("\nRecargo domingo comercio art. 38 N°7");
assert(
  "hora ordinaria 800000/42 ≈ 4444.44",
  close(valorHoraOrdinaria(800000, 42), 4444.44, 0.01),
  String(valorHoraOrdinaria(800000, 42)),
);
assert(
  "hora extra = hora ordinaria × 1,5",
  close(valorHoraExtra(800000, 42), valorHoraOrdinaria(800000, 42) * 1.5, 0.0001),
);
{
  const rd = calcularRecargoDomingoComercio({ sueldoBase: 800000, jornada: 42, horasOrdinarias: 8 });
  assert(
    "800000/42/8h recargo ≈ 10666.67",
    close(rd.recargoTotal, 10666.67, 0.01),
    String(rd.recargoTotal),
  );
  assert(
    "800000/42/8h recargo redondeado 10667",
    Math.round(rd.recargoTotal) === 10667,
    String(Math.round(rd.recargoTotal)),
  );
  assert("recargo es 30 % de la hora × horas", close(rd.recargoHora, rd.valorHoraOrdinaria * 0.3, 0.0001));
  assert("hora en domingo = ordinaria + recargo", close(rd.horaDomingo, rd.valorHoraOrdinaria * 1.3, 0.0001));
}
{
  const dt = calcularRecargoDomingoComercio({ sueldoBase: 225000, jornada: 45, horasOrdinarias: 9 });
  assert("DT 2611/39 recargo 9h = 3150", close(dt.recargoTotal, 3150, 0.01), String(dt.recargoTotal));
  assert("DT 2611/39 hora ordinaria ≈ 1167", Math.round(dt.valorHoraOrdinaria) === 1167, String(dt.valorHoraOrdinaria));
  assert("DT 2611/39 hora domingo ≈ 1517", Math.round(dt.horaDomingo) === 1517, String(dt.horaDomingo));
  assert(
    "DT 2611/39 hora extra domingo ≈ 2275",
    Math.round(dt.horaExtraDomingo) === 2275,
    String(dt.horaExtraDomingo),
  );
}
assert(
  "sueldo 0 → recargo 0",
  calcularRecargoDomingoComercio({ sueldoBase: 0, jornada: 42, horasOrdinarias: 8 }).recargoTotal === 0,
);
assert(
  "0 horas → recargo 0",
  calcularRecargoDomingoComercio({ sueldoBase: 800000, jornada: 42, horasOrdinarias: 0 }).recargoTotal === 0,
);
{
  const rdApp = readFileSync(join(root, "js/app-recargo-domingo-comercio.js"), "utf8");
  assert(
    "app-recargo-domingo-comercio usa calcularRecargoDomingoComercio",
    /import\s*\{[^}]*calcularRecargoDomingoComercio[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(rdApp) &&
      /calcularRecargoDomingoComercio\s*\(/.test(rdApp),
  );
}

console.log("\nFeriado irrenunciable art. 32 + Ley 19.973");
{
  const fi = calcularFeriadoIrrenunciable({
    sueldoBase: 800000,
    jornada: 42,
    horasTrabajadas: 8,
  });
  assert(
    "800000/42 hora ordinaria ≈ 4444.44",
    close(fi.valorHoraOrdinaria, 4444.44, 0.01),
    String(fi.valorHoraOrdinaria),
  );
  assert(
    "hora con recargo = valorHoraExtra",
    close(fi.horaConRecargo, valorHoraExtra(800000, 42), 0.0001),
  );
  assert(
    "800000/42/8h total ≈ 53333.33",
    close(fi.total, 53333.33, 0.01) && Math.round(fi.total) === 53333,
    String(fi.total),
  );
  assert(
    "descanso 8 h ≈ 0.95 días (jornada/5)",
    close(fi.horasDescansoEquivalentes, 8, 0.0001) && close(fi.diasDescansoEquivalentes, 8 / (42 / 5), 0.0001),
    String(fi.diasDescansoEquivalentes),
  );
  assert(
    "factor bajo el mínimo se clampa a 1,5",
    close(
      calcularFeriadoIrrenunciable({ sueldoBase: 800000, jornada: 42, horasTrabajadas: 8, factorRecargo: 1.2 })
        .factor,
      1.5,
      0.0001,
    ),
  );
  const doble = calcularFeriadoIrrenunciable({
    sueldoBase: 800000,
    jornada: 42,
    horasTrabajadas: 8,
    factorRecargo: 2,
  });
  assert(
    "factor 2,0 = hora ordinaria × 2",
    close(doble.horaConRecargo, fi.valorHoraOrdinaria * 2, 0.0001) && doble.factor === 2,
  );
  assert(
    "sueldo 0 → total 0",
    calcularFeriadoIrrenunciable({ sueldoBase: 0, jornada: 42, horasTrabajadas: 8 }).total === 0,
  );
  assert(
    "0 horas → total 0",
    calcularFeriadoIrrenunciable({ sueldoBase: 800000, jornada: 42, horasTrabajadas: 0 }).total === 0,
  );
  const fiApp = readFileSync(join(root, "js/app-feriado-irrenunciable.js"), "utf8");
  assert(
    "app-feriado-irrenunciable usa calcularFeriadoIrrenunciable",
    /import\s*\{[^}]*calcularFeriadoIrrenunciable[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(fiApp) &&
      /calcularFeriadoIrrenunciable\s*\(/.test(fiApp),
  );
  assert(
    "app-feriado-irrenunciable no usa numVal para factor ni horas (punto decimal)",
    !/numVal\s*\(\s*["']factorRecargo["']/.test(fiApp) &&
      !/numVal\s*\(\s*["']horasFeriado["']/.test(fiApp) &&
      /decimalVal/.test(fiApp),
  );
}

console.log("\nAsignación familiar Ley 21.830");
{
  const a = calcularAsignacionFamiliar({ ingresoMensual: 600_000, cargas: 2 });
  assert("600000 / 2 cargas = 45202", a.total === 45202, String(a.total));
  assert("600000 tramo 1 monto 22601", a.tramo === 1 && a.montoCarga === 22601);
}
assert(
  "límite tramo 1: 649039 → 22601",
  calcularAsignacionFamiliar({ ingresoMensual: 649_039, cargas: 1 }).total === 22601,
);
assert(
  "inicio tramo 2: 649040 → 13870",
  calcularAsignacionFamiliar({ ingresoMensual: 649_040, cargas: 1 }).total === 13870,
);
assert(
  "límite tramo 2: 947990 → 13870",
  calcularAsignacionFamiliar({ ingresoMensual: 947_990, cargas: 1 }).total === 13870,
);
assert(
  "inicio tramo 3: 947991 → 4382",
  calcularAsignacionFamiliar({ ingresoMensual: 947_991, cargas: 1 }).total === 4382,
);
assert(
  "límite tramo 3: 1478539 → 4382",
  calcularAsignacionFamiliar({ ingresoMensual: 1_478_539, cargas: 1 }).total === 4382,
);
assert(
  "sobre tope: 1478540 → 0",
  calcularAsignacionFamiliar({ ingresoMensual: 1_478_540, cargas: 3 }).total === 0,
);
assert(
  "duplo COMPIN: 600000 / 1 invalidez = 45202",
  calcularAsignacionFamiliar({ ingresoMensual: 600_000, cargasInvalidez: 1 }).total === 45202,
);
assert(
  "mixto: 1 simple + 1 duplo = 67803",
  calcularAsignacionFamiliar({ ingresoMensual: 600_000, cargas: 1, cargasInvalidez: 1 }).total === 67803,
);
{
  const cmApp = readFileSync(join(root, "js/app-colacion-movilizacion.js"), "utf8");
  assert(
    "app-colacion-movilizacion usa calcularColacionMovilizacion",
    /import\s*\{[^}]*calcularColacionMovilizacion[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(cmApp) &&
      /calcularColacionMovilizacion\s*\(/.test(cmApp),
  );
}
{
  const noImp = calcularColacionMovilizacion({
    colacion: 50_000,
    movilizacion: 40_000,
    sueldoBase: 800_000,
  });
  assert(
    "colación+movilización no imponibles total 90000 extra base 0",
    noImp.totalAsignaciones === 90_000 &&
      noImp.noImponible === 90_000 &&
      noImp.extraImponible === 0 &&
      noImp.extraLiquido === 90_000 &&
      noImp.extraDescuentos === 0,
    `${noImp.totalAsignaciones} ${noImp.extraImponible} ${noImp.extraLiquido}`,
  );
  const imp = calcularColacionMovilizacion({
    colacion: 50_000,
    movilizacion: 40_000,
    sueldoBase: 800_000,
    colacionNoImponible: false,
    movilizacionNoImponible: false,
  });
  assert(
    "colación+movilización imponibles extra líquido 73638",
    imp.extraImponible === 90_000 &&
      imp.noImponible === 0 &&
      imp.extraLiquido === 73_638 &&
      imp.extraDescuentos === 16_362,
    `${imp.extraImponible} ${imp.extraLiquido} ${imp.extraDescuentos}`,
  );
  const mixto = calcularColacionMovilizacion({
    colacion: 50_000,
    movilizacion: 40_000,
    sueldoBase: 800_000,
    colacionNoImponible: true,
    movilizacionNoImponible: false,
  });
  assert(
    "colación no imponible + movilización imponible mixto",
    mixto.noImponible === 50_000 &&
      mixto.extraImponible === 40_000 &&
      mixto.extraLiquido === 82_728,
    `${mixto.noImponible} ${mixto.extraImponible} ${mixto.extraLiquido}`,
  );
}
{
  const viaApp = readFileSync(join(root, "js/app-viatico.js"), "utf8");
  const viaMod = readFileSync(join(root, "js/viatico.js"), "utf8");
  assert(
    "app-viatico usa calcularViatico",
    /import\s*\{[^}]*calcularViatico[^}]*\}\s*from\s*["']\.\/viatico\.js["']/.test(viaApp) &&
      /calcularViatico\s*\(/.test(viaApp),
  );
  assert(
    "viatico reutiliza calcularSueldo",
    /import\s*\{[^}]*calcularSueldo[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(viaMod) &&
      /calcularSueldo\s*\(/.test(viaMod),
  );
  const noImp = calcularViatico({
    montoDiario: 45_000,
    dias: 5,
    sueldoBase: 800_000,
  });
  assert(
    "viático 45000 × 5 no imponible total 225000 extra líquido 225000",
    noImp.total === 225_000 &&
      noImp.noImponible === 225_000 &&
      noImp.extraImponible === 0 &&
      noImp.extraLiquido === 225_000 &&
      noImp.extraDescuentos === 0,
    `${noImp.total} ${noImp.noImponible} ${noImp.extraLiquido}`,
  );
  const imp = calcularViatico({
    montoDiario: 45_000,
    dias: 5,
    sueldoBase: 800_000,
    imponible: true,
  });
  assert(
    "viático imponible extra líquido 184095",
    imp.total === 225_000 &&
      imp.extraImponible === 225_000 &&
      imp.noImponible === 0 &&
      imp.extraLiquido === 184_095 &&
      imp.extraLiquido < 225_000 &&
      imp.extraDescuentos === 40_905,
    `${imp.extraImponible} ${imp.extraLiquido}`,
  );
  const ceroDias = calcularViatico({ montoDiario: 45_000, dias: 0, sueldoBase: 800_000 });
  const ceroMonto = calcularViatico({ montoDiario: 0, dias: 5, sueldoBase: 800_000 });
  assert(
    "viático 0 días o monto 0 deja totales en 0",
    ceroDias.total === 0 &&
      ceroDias.noImponible === 0 &&
      ceroDias.extraImponible === 0 &&
      ceroDias.extraLiquido === 0 &&
      ceroMonto.total === 0 &&
      ceroMonto.extraLiquido === 0,
  );
}
assert(
  "0 cargas → 0",
  calcularAsignacionFamiliar({ ingresoMensual: 600_000, cargas: 0 }).total === 0,
);
{
  const afApp = readFileSync(join(root, "js/app-asignacion-familiar.js"), "utf8");
  assert(
    "app-asignacion-familiar usa calcularAsignacionFamiliar",
    /import\s*\{[^}]*calcularAsignacionFamiliar[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(afApp) &&
      /calcularAsignacionFamiliar\s*\(/.test(afApp),
  );
}

console.log("\nSueldo mínimo IMM Ley 21.830");
{
  const smApp = readFileSync(join(root, "js/app-sueldo-minimo.js"), "utf8");
  assert(
    "app-sueldo-minimo usa calcularSueldoMinimo",
    /import\s*\{[^}]*calcularSueldoMinimo[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(smApp) &&
      /calcularSueldoMinimo\s*\(/.test(smApp),
  );
  const full = calcularSueldoMinimo({
    tramo: "general",
    horasSemana: 42,
    sueldoBase: 539_000,
    mesesReliquidacion: 2,
  });
  assert(
    "IMM 18-65 / 42h / base 539000 → gap 14553 grat 3638 reliquidación 36382",
    full.imm === 553553 &&
      full.immProporcional === 553553 &&
      full.gap === 14553 &&
      full.gratificacionSobreDelta === 3638 &&
      full.reliquidacionMes === 18191 &&
      full.reliquidacionTotal === 36382 &&
      full.topeGratificacionArt50 === 219115 &&
      full.immNoRemuneracional === 356815 &&
      full.jornadaOrdinaria === 42,
    JSON.stringify({
      gap: full.gap,
      grat: full.gratificacionSobreDelta,
      total: full.reliquidacionTotal,
    }),
  );
  const mitad = calcularSueldoMinimo({ tramo: "general", horasSemana: 21 });
  assert(
    "IMM 18-65 / 21h → proporcional 276777",
    mitad.immProporcional === 276777 && mitad.factor === 0.5,
    String(mitad.immProporcional),
  );
  const historica = calcularSueldoMinimo({ tramo: "general", horasSemana: 22.5 });
  assert(
    "IMM 18-65 / 22.5h sobre 42h → 296546 (no la mitad de 45h)",
    historica.immProporcional === 296546,
    String(historica.immProporcional),
  );
  const cap = calcularSueldoMinimo({ tramo: "general", horasSemana: 45 });
  assert("horas sobre 42 no suben el IMM", cap.immProporcional === 553553 && cap.factor === 1);
  const menor = calcularSueldoMinimo({ tramo: "menorMayor", horasSemana: 42 });
  assert(
    "tramo menor/mayor jornada completa 412938",
    menor.imm === 412938 && menor.immProporcional === 412938,
    String(menor.immProporcional),
  );
}

console.log("\nSemana corrida art. 45");
{
  const a = calcularSemanaCorrida({
    remuneracionesVariables: 600_000,
    diasQueDebioLaborar: 24,
    domingosFestivos: 5,
  });
  assert("600000 / 24 × 5 = 125000", a.total === 125000, String(a.total));
  assert("promedio diario 25000", a.promedioDiario === 25000, String(a.promedioDiario));
}
{
  const sem = calcularSemanaCorrida({
    remuneracionesVariables: 180_000,
    diasQueDebioLaborar: 6,
    domingosFestivos: 1,
  });
  assert("guía semanal 180000 / 6 × 1 = 30000", sem.total === 30000, String(sem.total));
}
{
  const fest = calcularSemanaCorrida({
    remuneracionesVariables: 180_000,
    diasQueDebioLaborar: 6,
    domingosFestivos: 2,
  });
  assert("guía semanal + festivo 180000 / 6 × 2 = 60000", fest.total === 60000, String(fest.total));
}
{
  const mixto = calcularSemanaCorrida({
    remuneracionesVariables: 120_000,
    diasQueDebioLaborar: 6,
    domingosFestivos: 1,
  });
  assert("mixto solo variable 120000 / 6 × 1 = 20000", mixto.total === 20000, String(mixto.total));
}
assert(
  "0 días → 0 (sin dividir)",
  calcularSemanaCorrida({ remuneracionesVariables: 600_000, diasQueDebioLaborar: 0, domingosFestivos: 5 }).total === 0,
);
assert(
  "0 descansos → 0",
  calcularSemanaCorrida({ remuneracionesVariables: 600_000, diasQueDebioLaborar: 24, domingosFestivos: 0 }).total === 0,
);
assert(
  "0 variables → 0",
  calcularSemanaCorrida({ remuneracionesVariables: 0, diasQueDebioLaborar: 24, domingosFestivos: 5 }).total === 0,
);
assert(
  "redondeo peso 100000 / 3 × 1 = 33333",
  calcularSemanaCorrida({ remuneracionesVariables: 100_000, diasQueDebioLaborar: 3, domingosFestivos: 1 }).total === 33333,
);
{
  const scApp = readFileSync(join(root, "js/app-semana-corrida.js"), "utf8");
  assert(
    "app-semana-corrida usa calcularSemanaCorrida",
    /import\s*\{[^}]*calcularSemanaCorrida[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(scApp) &&
      /calcularSemanaCorrida\s*\(/.test(scApp),
  );
}

console.log("\nFeriado progresivo art. 68");
{
  const unmet = calcularFeriadoProgresivo({ aniosEmpleadoresAnteriores: 5, aniosEmpleadorActual: 4 });
  assert("base incumplida 5+4 → 0 extra", unmet.diasExtra === 0 && unmet.baseCumplida === false, JSON.stringify(unmet));
}
{
  const d1 = calcularFeriadoProgresivo({ aniosEmpleadoresAnteriores: 10, aniosEmpleadorActual: 3 });
  assert(
    "base 10 + 3 actual → 1 extra, anual 16",
    d1.diasExtra === 1 && d1.diasFeriadoAnual === 16 && d1.baseCumplida === true,
    JSON.stringify(d1),
  );
}
{
  const d2 = calcularFeriadoProgresivo({ aniosEmpleadoresAnteriores: 10, aniosEmpleadorActual: 6 });
  assert(
    "base 10 + 6 actual → 2 extra, anual 17",
    d2.diasExtra === 2 && d2.diasFeriadoAnual === 17,
    JSON.stringify(d2),
  );
}
{
  const mismo = calcularFeriadoProgresivo({ aniosEmpleadoresAnteriores: 0, aniosEmpleadorActual: 13 });
  assert(
    "13 años mismo empleador → 1 extra (no 16 por sumar 13 a secas)",
    mismo.diasExtra === 1 && mismo.diasFeriadoAnual === 16,
    JSON.stringify(mismo),
  );
}
{
  const doce = calcularFeriadoProgresivo({ aniosEmpleadoresAnteriores: 0, aniosEmpleadorActual: 12 });
  assert("12 años mismo empleador → 0 extra", doce.diasExtra === 0 && doce.diasFeriadoAnual === 15, JSON.stringify(doce));
}
{
  const mito = calcularFeriadoProgresivo({ aniosEmpleadoresAnteriores: 13, aniosEmpleadorActual: 2 });
  assert(
    "13 anteriores (tope 10) + 2 actual → 0 extra",
    mito.diasExtra === 0 && mito.aniosAnterioresAcreditables === 10,
    JSON.stringify(mito),
  );
}
{
  const plata = calcularFeriadoProgresivo({
    aniosEmpleadoresAnteriores: 10,
    aniosEmpleadorActual: 3,
    remuneracionMensual: 900_000,
  });
  assert(
    "1 extra × 900000 / 30 = 30000 (misma convención que feriado proporcional)",
    plata.valorExtra === 30000 && plata.valorExtra === feriadoProporcional(1, 900_000),
    String(plata.valorExtra),
  );
}
{
  const sur = calcularFeriadoProgresivo({
    aniosEmpleadoresAnteriores: 10,
    aniosEmpleadorActual: 3,
    feriadoBasico: 20,
  });
  assert("Magallanes/Aysén/Palena 20 + 1 extra = 21", sur.diasFeriadoAnual === 21 && sur.feriadoBasico === 20);
}
assert(
  "10 años solo actuales → 0 extra (falta el tramo de 3 nuevos)",
  calcularFeriadoProgresivo({ aniosEmpleadoresAnteriores: 0, aniosEmpleadorActual: 10 }).diasExtra === 0,
);

console.log("\nSueldo proporcional (mes incompleto, DT /30)");
{
  assert("600000 × 15 días → 300000", calcularSueldoProporcional({ remuneracion: 600_000, dias: 15 }).bruto === 300_000);
  assert("900000 × 15 días → 450000", calcularSueldoProporcional({ remuneracion: 900_000, dias: 15 }).bruto === 450_000);
  assert(
    "1000000 × 10 días → 333333 (roundPeso de Haberes)",
    calcularSueldoProporcional({ remuneracion: 1_000_000, dias: 10 }).bruto === 333_333 &&
      proporcional(1_000_000, 10) === 333_333,
  );
  assert(
    "mes completo 31 días → 600000 (no 31/30)",
    calcularSueldoProporcional({ remuneracion: 600_000, dias: 31, mesCompleto: true }).bruto === 600_000,
  );
  assert(
    "mes completo febrero 28 días → 600000",
    calcularSueldoProporcional({ remuneracion: 600_000, dias: 28, mesCompleto: true }).bruto === 600_000 &&
      proporcional(600_000, 28) === 560_000,
  );
  const ene25 = calcularSueldoProporcional({ remuneracion: 600_000, ingreso: "2026-01-25" });
  assert(
    "ingreso 25-ene mes 31 → 7 días → 140000",
    ene25.dias === 7 && ene25.bruto === 140_000 && diasCalendarioFraccionMes({ ingreso: "2026-01-25" }).dias === 7,
    JSON.stringify(ene25),
  );
  const feb16 = calcularSueldoProporcional({ remuneracion: 600_000, ingreso: "2026-02-16" });
  assert(
    "ingreso 16-feb no bisiesto → 13 días → 260000",
    feb16.dias === 13 && feb16.bruto === 260_000 && diasCalendarioFraccionMes({ ingreso: "2026-02-16" }).dias === 13,
    JSON.stringify(feb16),
  );
  assert("0 días → 0", calcularSueldoProporcional({ remuneracion: 600_000, dias: 0 }).bruto === 0);
  assert(
    "fracción >30 usa el motor proporcional (d≥30 = pactado, no 31/30)",
    calcularSueldoProporcional({ remuneracion: 600_000, dias: 31 }).bruto === 600_000 &&
      proporcional(600_000, 31) === 600_000 &&
      proporcional(600_000, 31) !== Math.round((600_000 * 31) / 30),
  );
  assert(
    "liquidación 31−D no se usa aquí (25-ene sigue siendo 6 en diasBaseDelPeriodo)",
    diasDelPeriodo({ periodo: "2026-01", fechaIngreso: "2026-01-25" }).diasBase === 6,
  );
  const spApp = readFileSync(join(root, "js/app-sueldo-proporcional.js"), "utf8");
  assert(
    "app-sueldo-proporcional usa calcularSueldoProporcional",
    /import\s*\{[^}]*calcularSueldoProporcional[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(spApp) &&
      /calcularSueldoProporcional\s*\(/.test(spApp),
  );
}

console.log("\nDescuento atrasos e inasistencias (DT /30, valor hora)");
{
  const g1 = calcularDescuentoAtrasosInasistencias({
    remuneracion: 800_000,
    jornada: 42,
    diasInasistencia: 1,
    horasAtraso: 1,
    minutosAtraso: 0,
  });
  assert(
    "800000, 42h, 1 día + 60 min → valor día 26666.67, hora 4444.44, descuento 31111, bruto 768889",
    close(g1.valorDiario, 800_000 / 30) &&
      close(g1.valorHora, (800_000 / 30) * 28 / (42 * 4)) &&
      close(g1.descuentoTotalRaw, 31_111.111111) &&
      g1.descuentoTotal === 31_111 &&
      g1.brutoRestante === 768_889,
    JSON.stringify(g1),
  );
  const g2 = calcularDescuentoAtrasosInasistencias({
    remuneracion: 600_000,
    jornada: 42,
    minutosAtraso: 30,
  });
  assert(
    "600000, 42h, 30 min → hora 3333.33, descuento 1667, bruto 598333",
    close(g2.valorHora, 3_333.333333) &&
      close(g2.descuentoTotalRaw, 1_666.666667) &&
      g2.descuentoTotal === 1_667 &&
      g2.brutoRestante === 598_333,
    JSON.stringify(g2),
  );
  const g3 = calcularDescuentoAtrasosInasistencias({
    remuneracion: 900_000,
    jornada: 40,
    horasAtraso: 2,
    minutosAtraso: 15,
  });
  assert(
    "900000, 40h, 2h15 → hora 5250, descuento 11813, bruto 888187",
    close(g3.valorHora, 5_250) &&
      close(g3.descuentoTotalRaw, 11_812.5) &&
      g3.descuentoTotal === 11_813 &&
      g3.brutoRestante === 888_187,
    JSON.stringify(g3),
  );
  assert(
    "descuento no excede remuneración",
    calcularDescuentoAtrasosInasistencias({ remuneracion: 100_000, diasInasistencia: 31 }).descuentoTotal ===
      100_000 &&
      calcularDescuentoAtrasosInasistencias({ remuneracion: 100_000, diasInasistencia: 31 }).brutoRestante === 0,
  );
  assert(
    "inputs negativos → 0",
    calcularDescuentoAtrasosInasistencias({
      remuneracion: -1,
      diasInasistencia: -2,
      horasAtraso: -1,
      minutosAtraso: -5,
    }).descuentoTotal === 0,
  );
  const daApp = readFileSync(join(root, "js/app-descuento-atrasos.js"), "utf8");
  assert(
    "app-descuento-atrasos usa calcularDescuentoAtrasosInasistencias",
    /import\s*\{[^}]*calcularDescuentoAtrasosInasistencias[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(daApp) &&
      /calcularDescuentoAtrasosInasistencias\s*\(/.test(daApp),
  );
}

console.log("\nLicencia médica (empleador /30 + SIL D.F.L. 44)");
{
  const g1 = calcularLicenciaMedica({ remuneracion: 900_000, diasLicencia: 10 });
  assert(
    "900000, 10 días licencia → valor día 30000, 20 trabajados, bruto empleador 600000",
    close(g1.valorDiario, 30_000) &&
      g1.diasTrabajados === 20 &&
      g1.brutoEmpleador === 600_000 &&
      proporcional(900_000, 20) === 600_000,
    JSON.stringify(g1),
  );
  const g2 = calcularLicenciaMedica({
    remuneracion: 600_000,
    diasLicencia: 0,
    neta1: 650_000,
    neta2: 650_000,
    neta3: 650_000,
  });
  assert(
    "600000, 0 días licencia → bruto empleador 600000, SIL 0",
    g2.diasTrabajados === 30 &&
      g2.brutoEmpleador === 600_000 &&
      g2.silCompleto &&
      g2.silTramo === 0,
    JSON.stringify(g2),
  );
  const g3 = calcularLicenciaMedica({
    remuneracion: 800_000,
    diasLicencia: 30,
    neta1: 700_000,
    neta2: 700_000,
    neta3: 700_000,
  });
  assert(
    "800000, 30 días, 3 netas 700000 → bruto 0, base SIL 700000, diario 23333.33, tramo 700000",
    g3.diasTrabajados === 0 &&
      g3.brutoEmpleador === 0 &&
      g3.silCompleto &&
      g3.baseSil === 700_000 &&
      close(g3.diarioSil, 700_000 / 30) &&
      g3.silTramo === 700_000,
    JSON.stringify(g3),
  );
  assert(
    "sin las 3 netas → SIL incompleto, empleador sí se calcula",
    calcularLicenciaMedica({ remuneracion: 800_000, diasLicencia: 7, neta1: 650_000, neta2: 650_000 })
      .silCompleto === false &&
      calcularLicenciaMedica({ remuneracion: 800_000, diasLicencia: 7, neta1: 650_000, neta2: 650_000 })
        .brutoEmpleador === proporcional(800_000, 23) &&
      calcularLicenciaMedica({ remuneracion: 800_000, diasLicencia: 7, neta1: 650_000, neta2: 650_000 })
        .silTramo === 0,
  );
  assert(
    "días licencia >30 se recortan a 30; negativos → 0",
    calcularLicenciaMedica({ remuneracion: 800_000, diasLicencia: 31 }).diasTrabajados === 0 &&
      calcularLicenciaMedica({ remuneracion: -1, diasLicencia: -4 }).brutoEmpleador === 0,
  );
  const lmApp = readFileSync(join(root, "js/app-licencia-medica.js"), "utf8");
  assert(
    "app-licencia-medica usa calcularLicenciaMedica",
    /import\s*\{[^}]*calcularLicenciaMedica[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(lmApp) &&
      /calcularLicenciaMedica\s*\(/.test(lmApp),
  );
}

console.log("\nBoleta de honorarios (retención Ley 21.133 / SII)");
{
  assert(
    "tasas boleta 2025–2028 Ley 21.133 / SII, sin inventar otros años",
    RETENCION_BOLETA_ANIO_DEFAULT === 2026 &&
      RETENCION_BOLETA_HONORARIOS[2025] === 0.145 &&
      RETENCION_BOLETA_HONORARIOS[2026] === 0.1525 &&
      RETENCION_BOLETA_HONORARIOS[2027] === 0.16 &&
      RETENCION_BOLETA_HONORARIOS[2028] === 0.17 &&
      RETENCION_BOLETA_HONORARIOS[2024] == null &&
      RETENCION_BOLETA_HONORARIOS[2029] == null,
  );
  const g1 = calcularBoletaHonorarios({ modo: "bruto", monto: 1_000_000, anio: 2026 });
  assert(
    "gold 2026 bruto 1000000 → retención 152500, líquido 847500",
    g1.ok &&
      g1.tasa === 0.1525 &&
      g1.bruto === 1_000_000 &&
      g1.retencion === 152_500 &&
      g1.liquido === 847_500,
    JSON.stringify(g1),
  );
  const g2 = calcularBoletaHonorarios({ modo: "liquido", monto: 847_500, anio: 2026 });
  assert(
    "gold 2026 líquido 847500 → bruto 1000000, retención 152500",
    g2.ok && g2.bruto === 1_000_000 && g2.retencion === 152_500 && g2.liquido === 847_500,
    JSON.stringify(g2),
  );
  const g3 = calcularBoletaHonorarios({ modo: "bruto", monto: 100_000, anio: 2026 });
  assert(
    "ejemplo SII 2026 bruto 100000 → retención 15250, líquido 84750",
    g3.retencion === 15_250 && g3.liquido === 84_750,
    JSON.stringify(g3),
  );
  assert(
    "2025/2027/2028 sobre 1000000",
    calcularBoletaHonorarios({ monto: 1_000_000, anio: 2025 }).retencion === 145_000 &&
      calcularBoletaHonorarios({ monto: 1_000_000, anio: 2025 }).liquido === 855_000 &&
      calcularBoletaHonorarios({ monto: 1_000_000, anio: 2027 }).retencion === 160_000 &&
      calcularBoletaHonorarios({ monto: 1_000_000, anio: 2028 }).retencion === 170_000,
  );
  assert(
    "inputs negativos → 0; año desconocido usa 2026",
    calcularBoletaHonorarios({ monto: -1, anio: 2026 }).bruto === 0 &&
      calcularBoletaHonorarios({ monto: 1_000_000, anio: 2019 }).ok === false &&
      calcularBoletaHonorarios({ monto: 1_000_000, anio: 2019 }).anio === 2026 &&
      calcularBoletaHonorarios({ monto: 1_000_000, anio: 2019 }).retencion === 152_500,
  );
  const bhApp = readFileSync(join(root, "js/app-boleta-honorarios.js"), "utf8");
  assert(
    "app-boleta-honorarios usa calcularBoletaHonorarios",
    /import\s*\{[^}]*calcularBoletaHonorarios[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(bhApp) &&
      /calcularBoletaHonorarios\s*\(/.test(bhApp),
  );
}

console.log("\nRetención judicial (Ley 14.908 art. 8, pensión de alimentos)");
{
  const g1 = calcularRetencionJudicial({
    base: 900_000,
    modo: "fijo",
    montoFijo: 250_000,
  });
  assert(
    "900000 líquido, orden fija 250000 → retención 250000, remanente 650000",
    g1.retencionAlimentos === 250_000 &&
      g1.remanente === 650_000 &&
      g1.ordenada === 250_000 &&
      g1.topeAplicado === false,
    JSON.stringify(g1),
  );
  const g2 = calcularRetencionJudicial({
    base: 1_000_000,
    modo: "porcentaje",
    porcentaje: 30,
  });
  assert(
    "1000000 base, 30% → retención 300000, remanente 700000",
    g2.retencionAlimentos === 300_000 &&
      g2.remanente === 700_000 &&
      g2.ordenada === 300_000 &&
      g2.modo === "porcentaje",
    JSON.stringify(g2),
  );
  const cap = calcularRetencionJudicial({
    base: 200_000,
    modo: "fijo",
    montoFijo: 250_000,
  });
  assert(
    "orden fija mayor que la base → retiene la base, remanente 0, tope",
    cap.retencionAlimentos === 200_000 &&
      cap.remanente === 0 &&
      cap.topeAplicado === true &&
      cap.ordenExcedeBase === true,
    JSON.stringify(cap),
  );
  const otras = calcularRetencionJudicial({
    base: 900_000,
    modo: "fijo",
    montoFijo: 250_000,
    otrasRetenciones: 100_000,
  });
  assert(
    "otras retenciones 100000 tras alimentos → remanente 550000",
    otras.retencionAlimentos === 250_000 &&
      otras.otrasAplicadas === 100_000 &&
      otras.remanente === 550_000 &&
      otras.topeAplicado === false,
    JSON.stringify(otras),
  );
  assert(
    "60% de 1000000 no se recorta a un tope legal inventado",
    calcularRetencionJudicial({ base: 1_000_000, modo: "porcentaje", porcentaje: 60 })
      .retencionAlimentos === 600_000 &&
      calcularRetencionJudicial({ base: 1_000_000, modo: "porcentaje", porcentaje: 60 })
        .remanente === 400_000,
  );
  assert(
    "inputs negativos → 0; modo desconocido se trata como fijo",
    calcularRetencionJudicial({
      base: -1,
      modo: "otro",
      montoFijo: -50,
      porcentaje: -10,
      otrasRetenciones: -1,
    }).retencionAlimentos === 0 &&
      calcularRetencionJudicial({ base: 100_000, modo: "otro", montoFijo: 40_000 }).modo ===
        "fijo",
  );
  const rjApp = readFileSync(join(root, "js/app-retencion-judicial.js"), "utf8");
  assert(
    "app-retencion-judicial usa calcularRetencionJudicial",
    /import\s*\{[^}]*calcularRetencionJudicial[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(rjApp) &&
      /calcularRetencionJudicial\s*\(/.test(rjApp),
  );
}

console.log("\nAPV Régimen B (art. 42 bis LIR, liquidación del mes)");
{
  const g = calcularApv(
    {
      sueldoBase: 2_000_000,
      apvRegimenB: 100_000,
      afp: "modelo",
      salud: "fonasa",
      contrato: "indefinido",
    },
    { uf: FALLBACK_UF },
  );
  assert(
    "gold 2000000 bruto, APV B 100000 → IUSC 26766→22766, ahorro 4000, líquido 1513634",
    g.afp.monto === 211_600 &&
      g.salud.monto === 140_000 &&
      g.cesantia.monto === 12_000 &&
      g.cotizacionesLegales === 363_600 &&
      g.baseTributableSinApv === 1_636_400 &&
      g.baseTributableConApv === 1_536_400 &&
      g.iuscSinApv === 26_766 &&
      g.iuscConApv === 22_766 &&
      g.ahorroIusc === 4_000 &&
      g.liquidoSinApv === 1_609_634 &&
      g.liquidoConApv === 1_513_634 &&
      g.apvDescontado === 100_000 &&
      g.costoLiquido === 96_000 &&
      g.sinAhorroIusc === false,
    JSON.stringify({
      afp: g.afp.monto,
      salud: g.salud.monto,
      cesantia: g.cesantia.monto,
      baseSin: g.baseTributableSinApv,
      baseCon: g.baseTributableConApv,
      iuscSin: g.iuscSinApv,
      iuscCon: g.iuscConApv,
      ahorro: g.ahorroIusc,
      liqSin: g.liquidoSinApv,
      liqCon: g.liquidoConApv,
    }),
  );
  const sin = calcularSueldo(
    { sueldoBase: 2_000_000, afp: "modelo", salud: "fonasa", contrato: "indefinido" },
    { uf: FALLBACK_UF },
  );
  assert(
    "APV no cambia AFP/salud/cesantía ni la base previsional",
    g.afp.monto === sin.afp.monto &&
      g.salud.monto === sin.salud.monto &&
      g.cesantia.monto === sin.cesantia.monto &&
      g.imponible === sin.imponible &&
      g.baseTributableSinApv === sin.baseTributable &&
      g.iuscSinApv === sin.iusc &&
      g.liquidoSinApv === sin.liquido,
  );
  const low = calcularApv(
    {
      sueldoBase: IMM,
      apvRegimenB: 50_000,
      afp: "modelo",
      salud: "fonasa",
      contrato: "indefinido",
    },
    { uf: FALLBACK_UF },
  );
  assert(
    "IMM 553553 + APV B 50000 → IUSC 0, aviso sin ahorro, sí descuenta líquido",
    low.iuscSinApv === 0 &&
      low.iuscConApv === 0 &&
      low.ahorroIusc === 0 &&
      low.sinAhorroIusc === true &&
      low.apvDescontado === 50_000 &&
      low.liquidoConApv === low.liquidoSinApv - 50_000 &&
      low.baseTributableSinApv === 452_917,
    JSON.stringify({
      iusc: low.iuscSinApv,
      base: low.baseTributableSinApv,
      liqSin: low.liquidoSinApv,
      liqCon: low.liquidoConApv,
    }),
  );
  const mid = calcularApv({ sueldoBase: 900_000, apvRegimenB: 80_000 }, { uf: FALLBACK_UF });
  assert(
    "900000 bruto (bajo IUSC) + APV no reduce impuesto",
    mid.iuscSinApv === 0 && mid.ahorroIusc === 0 && mid.sinAhorroIusc === true,
  );
  const cap = calcularApv(
    { sueldoBase: 2_000_000, apvRegimenB: 3_000_000 },
    { uf: FALLBACK_UF },
  );
  assert(
    "APV sobre 50 UF se corta al tope mensual",
    cap.topeUfAplicado === true &&
      cap.topeMensual === 2_042_701 &&
      cap.apvDescontado === 2_042_701 &&
      cap.apvTributable === 1_636_400 &&
      cap.baseTributableConApv === 0 &&
      cap.iuscConApv === 0,
    JSON.stringify({
      tope: cap.topeMensual,
      desc: cap.apvDescontado,
      trib: cap.apvTributable,
    }),
  );
  assert(
    "APV 0 no cambia líquido ni IUSC",
    calcularApv({ sueldoBase: 2_000_000, apvRegimenB: 0 }, { uf: FALLBACK_UF }).liquidoConApv ===
      sin.liquido &&
      calcularApv({ sueldoBase: 2_000_000, apvRegimenB: 0 }, { uf: FALLBACK_UF }).ahorroIusc === 0,
  );
  const apvApp = readFileSync(join(root, "js/app-apv.js"), "utf8");
  assert(
    "app-apv usa calcularApv",
    /import\s*\{[^}]*calcularApv[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(apvApp) &&
      /calcularApv\s*\(/.test(apvApp),
  );
}

console.log("\nSala cuna art. 203 (umbral 20 y costo al establecimiento)");
{
  const g = calcularSalaCuna({
    trabajadoras: 22,
    ninos: 2,
    costoUnitario: 350_000,
  });
  assert(
    "gold 22 trabajadoras, 2 niños, 350000 → obligada sí, costo 700000",
    g.obligada === true &&
      g.simulacion === false &&
      g.umbral === 20 &&
      g.umbral === UMBRAL_SALA_CUNA &&
      g.trabajadoras === 22 &&
      g.ninos === 2 &&
      g.costoUnitario === 350_000 &&
      g.costoMensual === 700_000,
    JSON.stringify(g),
  );
  const bajo = calcularSalaCuna({
    trabajadoras: 19,
    ninos: 2,
    costoUnitario: 350_000,
  });
  assert(
    "19 trabajadoras → no obligada; costo simulado 700000",
    bajo.obligada === false &&
      bajo.simulacion === true &&
      bajo.costoMensual === 700_000,
    JSON.stringify(bajo),
  );
  assert(
    "umbral inclusivo: 20 trabajadoras obliga",
    calcularSalaCuna({ trabajadoras: 20, ninos: 1, costoUnitario: 350_000 }).obligada === true,
  );
  assert(
    "22 trabajadoras y 0 niños: obliga, costo 0",
    calcularSalaCuna({ trabajadoras: 22, ninos: 0, costoUnitario: 350_000 }).obligada === true &&
      calcularSalaCuna({ trabajadoras: 22, ninos: 0, costoUnitario: 350_000 }).costoMensual === 0,
  );
  assert(
    "inputs negativos → 0 y no obliga",
    calcularSalaCuna({ trabajadoras: -5, ninos: -2, costoUnitario: -100 }).obligada === false &&
      calcularSalaCuna({ trabajadoras: -5, ninos: -2, costoUnitario: -100 }).costoMensual === 0 &&
      calcularSalaCuna({ trabajadoras: -5, ninos: -2, costoUnitario: -100 }).trabajadoras === 0,
  );
  const scApp = readFileSync(join(root, "js/app-sala-cuna.js"), "utf8");
  assert(
    "app-sala-cuna usa calcularSalaCuna",
    /import\s*\{[^}]*calcularSalaCuna[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(scApp) &&
      /calcularSalaCuna\s*\(/.test(scApp),
  );
}

console.log("\nPostnatal parental art. 197 bis (completa 12 vs parcial 18)");
{
  const g = calcularPostnatalParental({
    baseSil: 900_000,
    estipendiosFijos: 900_000,
  });
  assert(
    "gold 900000: diario 30000; completa 84×30000=2520000; parcial 126×15000=1890000 + empleador 1890000",
    g.baseSil === 900_000 &&
      g.silDesdeNetas === false &&
      g.diarioCompleto === 30_000 &&
      g.diarioParcial === 15_000 &&
      g.semanasCompleta === 12 &&
      g.semanasCompleta === POSTNATAL_PARENTAL_SEMANAS_COMPLETA &&
      g.diasCompleta === 84 &&
      g.subsidioCompleta === 2_520_000 &&
      g.empleadorCompleta === 0 &&
      g.ingresoCompleta === 2_520_000 &&
      g.semanasParcial === 18 &&
      g.semanasParcial === POSTNATAL_PARENTAL_SEMANAS_PARCIAL &&
      g.diasParcial === 126 &&
      g.subsidioParcial === 1_890_000 &&
      g.empleadorParcial === 1_890_000 &&
      g.ingresoParcial === 3_780_000 &&
      g.diferenciaIngreso === 1_260_000 &&
      g.diarioEmpleador === 15_000,
    JSON.stringify(g),
  );
  const netas = calcularPostnatalParental({
    baseSil: 1,
    estipendiosFijos: 900_000,
    neta1: 800_000,
    neta2: 900_000,
    neta3: 1_000_000,
  });
  assert(
    "3 netas 800/900/1000 → base 900000 (DFL 44 art. 8) y mismo gold",
    netas.silDesdeNetas === true &&
      netas.baseSil === 900_000 &&
      netas.subsidioCompleta === 2_520_000 &&
      netas.subsidioParcial === 1_890_000 &&
      netas.empleadorParcial === 1_890_000,
    JSON.stringify(netas),
  );
  const sinFijos = calcularPostnatalParental({
    baseSil: 900_000,
    estipendiosFijos: 0,
  });
  assert(
    "sin estipendios fijos: parcial solo subsidio 1890000; completa suma más",
    sinFijos.empleadorParcial === 0 &&
      sinFijos.ingresoParcial === 1_890_000 &&
      sinFijos.ingresoCompleta === 2_520_000 &&
      sinFijos.diferenciaIngreso === -630_000,
  );
  const cesion = calcularPostnatalParental({
    baseSil: 900_000,
    estipendiosFijos: 900_000,
    semanasPadre: 6,
  });
  assert(
    "ceder 6 sem: madre completa 42×30000=1260000; parcial 84×15000+empleador 1260000",
    cesion.semanasPadreCompleta === 6 &&
      cesion.semanasMadreCompleta === POSTNATAL_PARENTAL_SEMANAS_MIN_MADRE &&
      cesion.diasMadreCompleta === 42 &&
      cesion.subsidioMadreCompleta === 1_260_000 &&
      cesion.semanasPadreParcial === 6 &&
      cesion.semanasMadreParcial === 12 &&
      cesion.diasMadreParcial === 84 &&
      cesion.subsidioMadreParcial === 1_260_000 &&
      cesion.empleadorMadreParcial === 1_260_000 &&
      cesion.ingresoMadreParcialRestante === 2_520_000 &&
      cesion.ingresoCompleta === 2_520_000,
    JSON.stringify(cesion),
  );
  assert(
    "ceder 12 sem se recorta a 6 en completa y 12 en parcial",
    calcularPostnatalParental({ baseSil: 900_000, semanasPadre: 12 }).semanasPadreCompleta === 6 &&
      calcularPostnatalParental({ baseSil: 900_000, semanasPadre: 12 }).semanasPadreParcial === 12 &&
      calcularPostnatalParental({ baseSil: 900_000, semanasPadre: 12 }).semanasMadreParcial === 6,
  );
  assert(
    "inputs negativos → 0",
    calcularPostnatalParental({ baseSil: -1, estipendiosFijos: -4, semanasPadre: -3 }).baseSil === 0 &&
      calcularPostnatalParental({ baseSil: -1, estipendiosFijos: -4 }).subsidioCompleta === 0 &&
      calcularPostnatalParental({ baseSil: -1, estipendiosFijos: -4 }).empleadorParcial === 0,
  );
  const pppApp = readFileSync(join(root, "js/app-postnatal-parental.js"), "utf8");
  assert(
    "app-postnatal-parental usa calcularPostnatalParental",
    /import\s*\{[^}]*calcularPostnatalParental[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(pppApp) &&
      /calcularPostnatalParental\s*\(/.test(pppApp),
  );
}

console.log("\nPermiso prenatal art. 195 (42 días corridos + SIL DFL 44)");
{
  const g = calcularPermisoPrenatal({
    fechaParto: "2026-03-01",
    baseSil: 900_000,
  });
  assert(
    "gold parto 2026-03-01 → inicio 2026-01-18, fin prenatal 2026-02-28, fin postnatal 2026-05-23, SIL 1260000",
    g.ok === true &&
      g.modo === "parto" &&
      g.fechaInicioPrenatal === "2026-01-18" &&
      g.fechaFinPrenatal === "2026-02-28" &&
      g.fechaParto === "2026-03-01" &&
      g.fechaInicioPostnatal === "2026-03-01" &&
      g.fechaFinPostnatal === "2026-05-23" &&
      g.semanasPrenatal === 6 &&
      g.semanasPrenatal === DESCANSO_PRENATAL_SEMANAS &&
      g.diasPrenatal === 42 &&
      g.diasPrenatal === DESCANSO_PRENATAL_DIAS &&
      g.semanasPostnatal === 12 &&
      g.semanasPostnatal === DESCANSO_POSTNATAL_SEMANAS &&
      g.diasPostnatal === 84 &&
      g.diasPostnatal === DESCANSO_POSTNATAL_DIAS &&
      g.baseSil === 900_000 &&
      g.silDesdeNetas === false &&
      g.diarioSil === 30_000 &&
      g.subsidioPrenatal === 1_260_000,
    JSON.stringify(g),
  );
  const fromInicio = calcularPermisoPrenatal({
    modo: "inicio",
    fechaInicio: "2026-01-18",
    baseSil: 900_000,
  });
  assert(
    "modo inicio 2026-01-18 → parto 2026-03-01 (mismo gold)",
    fromInicio.ok === true &&
      fromInicio.fechaParto === "2026-03-01" &&
      fromInicio.fechaFinPrenatal === "2026-02-28" &&
      fromInicio.fechaFinPostnatal === "2026-05-23" &&
      fromInicio.subsidioPrenatal === 1_260_000,
    JSON.stringify(fromInicio),
  );
  const leap = calcularPermisoPrenatal({ fechaParto: "2024-03-01", baseSil: 900_000 });
  assert(
    "bisiesto parto 2024-03-01 → inicio 2024-01-19 (feb 29)",
    leap.ok === true &&
      leap.fechaInicioPrenatal === "2024-01-19" &&
      leap.fechaFinPrenatal === "2024-02-29" &&
      leap.subsidioPrenatal === 1_260_000,
    JSON.stringify(leap),
  );
  const netas = calcularPermisoPrenatal({
    fechaParto: "2026-03-01",
    baseSil: 1,
    neta1: 800_000,
    neta2: 900_000,
    neta3: 1_000_000,
  });
  assert(
    "3 netas 800/900/1000 → base 900000 (DFL 44 art. 8) y mismo subsidio",
    netas.silDesdeNetas === true &&
      netas.baseSil === 900_000 &&
      netas.subsidioPrenatal === 1_260_000,
    JSON.stringify(netas),
  );
  assert(
    "sin fecha → ok false; inputs negativos → base 0",
    calcularPermisoPrenatal({ fechaParto: "", baseSil: 900_000 }).ok === false &&
      calcularPermisoPrenatal({ modo: "inicio", fechaInicio: "", baseSil: 900_000 }).ok === false &&
      calcularPermisoPrenatal({ fechaParto: "2026-03-01", baseSil: -1 }).baseSil === 0 &&
      calcularPermisoPrenatal({ fechaParto: "2026-03-01", baseSil: -1 }).subsidioPrenatal === 0,
  );
  const ppnApp = readFileSync(join(root, "js/app-permiso-prenatal.js"), "utf8");
  assert(
    "app-permiso-prenatal usa calcularPermisoPrenatal",
    /import\s*\{[^}]*calcularPermisoPrenatal[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(ppnApp) &&
      /calcularPermisoPrenatal\s*\(/.test(ppnApp),
  );
}


console.log("\nNulidad del despido art. 162 (remuneraciones hasta convalidación)");
{
  const g = calcularNulidadDespido({
    remuneracion: 900_000,
    fechaDespido: "2026-01-01",
    fechaConvalidacion: "2026-03-31",
  });
  assert(
    "gold 900000, 2026-01-01 → 2026-03-31 → 90 días, $2.700.000",
    g.ok === true &&
      g.dias === 90 &&
      g.mesesConvencionales === 3 &&
      g.divisor === 30 &&
      g.remuneracion === 900_000 &&
      g.prestaciones === 0 &&
      g.baseMensual === 900_000 &&
      g.valorDiario === 30_000 &&
      g.remuneracionesAdeudadas === 2_700_000 &&
      g.prestacionesAdeudadas === 0 &&
      g.total === 2_700_000 &&
      g.fechaDespido === "2026-01-01" &&
      g.fechaConvalidacion === "2026-03-31",
    JSON.stringify(g),
  );
  const conPrest = calcularNulidadDespido({
    remuneracion: 900_000,
    prestaciones: 150_000,
    fechaDespido: "2026-01-01",
    fechaConvalidacion: "2026-03-31",
  });
  assert(
    "gold + prestaciones 150000 → diario 35000, total 3150000",
    conPrest.ok === true &&
      conPrest.baseMensual === 1_050_000 &&
      conPrest.valorDiario === 35_000 &&
      conPrest.remuneracionesAdeudadas === 2_700_000 &&
      conPrest.prestacionesAdeudadas === 450_000 &&
      conPrest.total === 3_150_000,
    JSON.stringify(conPrest),
  );
  const mismoDia = calcularNulidadDespido({
    remuneracion: 900_000,
    fechaDespido: "2026-03-01",
    fechaConvalidacion: "2026-03-01",
  });
  assert(
    "mismo día → 1 × 30000 = 30000",
    mismoDia.ok === true && mismoDia.dias === 1 && mismoDia.total === 30_000,
    JSON.stringify(mismoDia),
  );
  const feb = calcularNulidadDespido({
    remuneracion: 900_000,
    fechaDespido: "2026-02-01",
    fechaConvalidacion: "2026-02-28",
  });
  assert(
    "febrero 2026 (28 días) → 840000 (no el mes entero)",
    feb.ok === true && feb.dias === 28 && feb.total === 840_000,
    JSON.stringify(feb),
  );
  const mar31 = calcularNulidadDespido({
    remuneracion: 900_000,
    fechaDespido: "2026-03-01",
    fechaConvalidacion: "2026-03-31",
  });
  assert(
    "marzo 31 días → 31 × 30000 = 930000",
    mar31.ok === true && mar31.dias === 31 && mar31.total === 930_000,
    JSON.stringify(mar31),
  );
  assert(
    "sin fechas / invertidas / negativos",
    calcularNulidadDespido({ remuneracion: 900_000 }).ok === false &&
      calcularNulidadDespido({
        remuneracion: 900_000,
        fechaDespido: "2026-03-31",
        fechaConvalidacion: "2026-01-01",
      }).motivo === "convalidacion_antes" &&
      calcularNulidadDespido({
        remuneracion: -1,
        prestaciones: -4,
        fechaDespido: "2026-01-01",
        fechaConvalidacion: "2026-03-31",
      }).total === 0,
  );
  const ndApp = readFileSync(join(root, "js/app-nulidad-despido.js"), "utf8");
  assert(
    "app-nulidad-despido usa calcularNulidadDespido",
    /import\s*\{[^}]*calcularNulidadDespido[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(ndApp) &&
      /calcularNulidadDespido\s*\(/.test(ndApp),
  );
}

console.log("\nHora de lactancia art. 206 (valor hora DT, diario y mensual)");
{
  const g = calcularHoraLactancia({
    remuneracion: 900_000,
    jornada: 42,
    diasLaborales: 20,
    minutosDiarios: 60,
  });
  const hora = valorHoraOrdinaria(900_000, 42);
  assert(
    "gold 900000 / 42 h / 20 días / 60 min → hora 5000, diario 5000, mensual 100000",
    close(g.valorHora, hora, 0.0001) &&
      close(g.valorHora, 5_000, 0.0001) &&
      g.valorDiario === 5_000 &&
      g.valorMensual === 100_000 &&
      g.valorMensual === g.valorDiario * 20 &&
      g.vigente === true &&
      g.minutosDiarios === HORA_LACTANCIA_MINUTOS_LEGAL &&
      g.minutosLegal === 60 &&
      g.edadMaxMeses === HORA_LACTANCIA_EDAD_MAX_MESES,
    JSON.stringify(g),
  );
  const mitad = calcularHoraLactancia({
    remuneracion: 900_000,
    jornada: 42,
    diasLaborales: 20,
    minutosDiarios: 30,
  });
  assert(
    "30 min/día → mitad del diario y mensual del caso 60 min",
    mitad.valorDiario === 2_500 &&
      mitad.valorMensual === 50_000 &&
      mitad.valorMensual === g.valorMensual / 2 &&
      mitad.valorDiario === g.valorDiario / 2 &&
      mitad.esFraccion === true,
    JSON.stringify(mitad),
  );
  const fuera = calcularHoraLactancia({
    remuneracion: 900_000,
    jornada: 42,
    diasLaborales: 20,
    minutosDiarios: 60,
    edadMeses: 24,
  });
  assert(
    "hijo ≥24 meses → aviso de vigencia; mismo monto que el gold",
    fuera.vigente === false &&
      fuera.edadMeses === 24 &&
      fuera.valorDiario === g.valorDiario &&
      fuera.valorMensual === g.valorMensual &&
      close(fuera.valorHora, g.valorHora, 0.0001),
    JSON.stringify(fuera),
  );
  assert(
    "23 meses sigue vigente; 24 no",
    calcularHoraLactancia({ remuneracion: 900_000, edadMeses: 23 }).vigente === true &&
      calcularHoraLactancia({ remuneracion: 900_000, edadMeses: 24 }).vigente === false &&
      calcularHoraLactancia({ remuneracion: 900_000, edadMeses: 30 }).vigente === false,
  );
  const tope = calcularHoraLactancia({
    remuneracion: 900_000,
    jornada: 42,
    diasLaborales: 20,
    minutosDiarios: 180,
  });
  assert(
    "minutos sobre 120 se recortan al techo de la herramienta",
    tope.minutosDiarios === HORA_LACTANCIA_MINUTOS_MAX &&
      tope.minutosRecortados === true &&
      tope.minutosIngresados === 180,
    JSON.stringify(tope),
  );
  assert(
    "inputs negativos → 0",
    calcularHoraLactancia({ remuneracion: -1, jornada: -4, diasLaborales: -3, minutosDiarios: -10 }).valorMensual === 0 &&
      calcularHoraLactancia({ remuneracion: -1 }).valorHora === 0,
  );
  assert(
    "días por defecto 22",
    calcularHoraLactancia({ remuneracion: 900_000, jornada: 42, minutosDiarios: 60 }).diasLaborales ===
      HORA_LACTANCIA_DIAS_DEFAULT,
  );
  const hlApp = readFileSync(join(root, "js/app-hora-lactancia.js"), "utf8");
  assert(
    "app-hora-lactancia usa calcularHoraLactancia",
    /import\s*\{[^}]*calcularHoraLactancia[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(hlApp) &&
      /calcularHoraLactancia\s*\(/.test(hlApp),
  );
}

console.log("\nJornada 40 horas Ley 21.561 (tope, rebaja y valor hora DT)");
{
  assert("tope 26-abr-2026 → 42", topeJornadaOrdinaria("2026-04-26") === 42);
  assert("tope 25-abr-2028 → 42", topeJornadaOrdinaria("2028-04-25") === 42);
  assert("tope 26-abr-2028 → 40", topeJornadaOrdinaria("2028-04-26") === 40);
  assert("tope 26-abr-2024 → 44", topeJornadaOrdinaria("2024-04-26") === 44);
  assert("tope 25-abr-2024 → 45", topeJornadaOrdinaria("2024-04-25") === 45);
  const g = calcularJornada40Horas({
    fecha: "2026-09-08",
    jornadaPactada: 44,
    dias: 5,
    remuneracion: 840_000,
  });
  assert(
    "gold 44 h / 5 días / sep 2026 → tope 42, rebaja 2 h en 1 h × 2 días",
    g.tope === 42 &&
      g.horasARebajar === 2 &&
      g.minutosARebajar === 120 &&
      g.bloques.length === 2 &&
      g.bloques[0] === 60 &&
      g.bloques[1] === 60 &&
      g.jornadaAjustada === 42 &&
      g.superaTope === true,
    JSON.stringify(g),
  );
  const hora42 = (840_000 / 30) * 28 / (42 * 4);
  assert(
    "gold rem 840000 jornada 42 → valor hora 4666.66… → $4.667",
    g.valorHoraAjustadaPesos === 4667 &&
      close(g.valorHoraAjustada, hora42) &&
      g.valorHoraAjustadaPesos === Math.round(hora42),
    String(g.valorHoraAjustadaPesos),
  );
  const h45 = calcularJornada40Horas({
    fecha: "2026-09-08",
    jornadaPactada: 45,
    dias: 5,
    remuneracion: 840_000,
  });
  const hora45 = (840_000 / 30) * 28 / (45 * 4);
  assert(
    "gold rem 840000 jornada 45 histórico → valor hora 4355.55… → $4.356, menor que 42 h",
    h45.valorHoraPactadaPesos === 4356 &&
      close(h45.valorHoraPactada, hora45) &&
      h45.valorHoraPactadaPesos < g.valorHoraAjustadaPesos &&
      h45.horasARebajar === 3,
    JSON.stringify({ pesos: h45.valorHoraPactadaPesos, raw: h45.valorHoraPactada }),
  );
  const g6 = calcularJornada40Horas({
    fecha: "2026-09-08",
    jornadaPactada: 44,
    dias: 6,
    remuneracion: 840_000,
  });
  assert(
    "gold 44 h / 6 días → 50 + 50 + 20 min (ORD. 253/21)",
    g6.tope === 42 &&
      g6.bloques.length === 3 &&
      g6.bloques[0] === 50 &&
      g6.bloques[1] === 50 &&
      g6.bloques[2] === 20,
    JSON.stringify(g6.bloques),
  );
  const j40App = readFileSync(join(root, "js/app-jornada-40-horas.js"), "utf8");
    assert(
      "app-jornada-40-horas usa calcularJornada40Horas",
      /import\s*\{[^}]*calcularJornada40Horas[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(j40App) &&
        /calcularJornada40Horas\s*\(/.test(j40App),
    );
    assert(
      "app-jornada-40-horas deriva el tope de hoy con topeJornadaOrdinaria",
      /topeJornadaOrdinaria/.test(j40App) && /actualizarTopeHoyCopy/.test(j40App),
    );
}

console.log("\nPermiso paternidad art. 195 (5 días pagados)");
{
  const g1 = calcularPermisoPaternidad({
    fechaParto: "2026-01-05",
    goce: "continuo",
    remuneracion: 900_000,
  });
  assert(
    "lunes 5 ene 2026 continuo → término viernes 9, reintegro lunes 12, goce 150000",
    g1.ok &&
      g1.fechaTermino === "2026-01-09" &&
      g1.fechaReintegro === "2026-01-12" &&
      g1.diasHabilesConsumidos === 5 &&
      g1.diasCorridos === 7 &&
      g1.valorDia === 30_000 &&
      g1.goceRemuneracion === 150_000 &&
      g1.feriados.length === 0 &&
      g1.dias[0] === "2026-01-05" &&
      g1.dias[4] === "2026-01-09",
    JSON.stringify(g1),
  );
  const g2 = calcularPermisoPaternidad({
    fechaParto: "2026-04-30",
    goce: "continuo",
    remuneracion: 900_000,
  });
  assert(
    "jueves 30 abr 2026: 1 may no consume; término 7 may, reintegro 8 may",
    g2.ok &&
      g2.fechaTermino === "2026-05-07" &&
      g2.fechaReintegro === "2026-05-08" &&
      g2.diasHabilesConsumidos === 5 &&
      g2.feriados.some((f) => f.fecha === "2026-05-01") &&
      g2.dias.includes("2026-04-30") &&
      !g2.dias.includes("2026-05-01") &&
      g2.goceRemuneracion === 150_000,
    JSON.stringify(g2),
  );
  const frac = calcularPermisoPaternidad({
    fechaParto: "2026-01-05",
    fechaInicio: "2026-01-12",
    goce: "fraccionado",
    remuneracion: 900_000,
  });
  assert(
    "fraccionado desde lunes 12 ene → término 16, reintegro 19, ventana 6 ene–6 feb",
    frac.ok &&
      frac.fechaTermino === "2026-01-16" &&
      frac.fechaReintegro === "2026-01-19" &&
      frac.ventanaDesde === "2026-01-06" &&
      frac.ventanaHasta === "2026-02-06" &&
      frac.dentroDelMes === true,
    JSON.stringify(frac),
  );
  assert(
    "fraccionado fuera del mes → ok false",
    calcularPermisoPaternidad({
      fechaParto: "2026-01-05",
      fechaInicio: "2026-02-07",
      goce: "fraccionado",
      remuneracion: 900_000,
    }).motivo === "fuera_del_mes",
  );
  assert(
    "inputs negativos → rem 0 y goce 0",
    calcularPermisoPaternidad({ remuneracion: -1, fechaParto: "2026-01-05" }).goceRemuneracion === 0 &&
      calcularPermisoPaternidad({ remuneracion: -4 }).ok === false,
  );
  const ppApp = readFileSync(join(root, "js/app-permiso-paternidad.js"), "utf8");
  assert(
    "app-permiso-paternidad usa calcularPermisoPaternidad",
    /import\s*\{[^}]*calcularPermisoPaternidad[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(ppApp) &&
      /calcularPermisoPaternidad\s*\(/.test(ppApp),
  );
}

console.log("\nPermiso matrimonio art. 207 bis (5 días hábiles pagados)");
{
  const g1 = calcularPermisoMatrimonio({
    fechaEvento: "2026-01-05",
    ubicacion: "dia",
    remuneracion: 900_000,
  });
  assert(
    "lunes 5 ene 2026 desde el día → término viernes 9, reintegro lunes 12, costo 150000",
    g1.ok &&
      g1.fechaInicio === "2026-01-05" &&
      g1.fechaTermino === "2026-01-09" &&
      g1.fechaReintegro === "2026-01-12" &&
      g1.diasHabilesConsumidos === 5 &&
      g1.diasCalendario === 5 &&
      g1.diasCorridos === 7 &&
      g1.valorDia === 30_000 &&
      g1.goceRemuneracion === 150_000 &&
      g1.fechaAviso === "2025-12-06" &&
      g1.fechaCertificado === "2026-02-04" &&
      g1.feriados.length === 0 &&
      g1.dias[0] === "2026-01-05" &&
      g1.dias[4] === "2026-01-09",
    JSON.stringify(g1),
  );
  const g2 = calcularPermisoMatrimonio({
    fechaEvento: "2026-04-30",
    ubicacion: "dia",
    remuneracion: 900_000,
  });
  assert(
    "jueves 30 abr 2026: 1 may no consume; término 7 may, reintegro 8 may",
    g2.ok &&
      g2.fechaTermino === "2026-05-07" &&
      g2.fechaReintegro === "2026-05-08" &&
      g2.diasHabilesConsumidos === 5 &&
      g2.feriados.some((f) => f.fecha === "2026-05-01") &&
      g2.dias.includes("2026-04-30") &&
      !g2.dias.includes("2026-05-01") &&
      g2.sabados.some((s) => s.fecha === "2026-05-02"),
    JSON.stringify(g2),
  );
  const antes = calcularPermisoMatrimonio({
    fechaEvento: "2026-01-05",
    ubicacion: "antes",
    remuneracion: 900_000,
  });
  assert(
    "antes: 5 ene 2026 termina ese día; inicio 29 dic; 1 ene no consume",
    antes.ok &&
      antes.fechaInicio === "2025-12-29" &&
      antes.fechaTermino === "2026-01-05" &&
      antes.fechaReintegro === "2026-01-06" &&
      antes.diasCalendario === 8 &&
      antes.dias.includes("2026-01-02") &&
      !antes.dias.includes("2026-01-01") &&
      antes.feriados.some((f) => f.fecha === "2026-01-01"),
    JSON.stringify(antes),
  );
  const fuera = calcularPermisoMatrimonio({
    fechaEvento: "2026-01-12",
    ubicacion: "inicio",
    fechaInicio: "2026-01-05",
    remuneracion: 900_000,
  });
  assert(
    "inicio que no incluye la celebración no procede",
    fuera.ok === false && fuera.motivo === "no_incluye_evento",
  );
  assert(
    "remuneración negativa → costo 0; sin fecha → ok false",
    calcularPermisoMatrimonio({ remuneracion: -1, fechaEvento: "2026-01-05" }).goceRemuneracion === 0 &&
      calcularPermisoMatrimonio({ remuneracion: -4 }).ok === false,
  );
  const pmApp = readFileSync(join(root, "js/app-permiso-matrimonio.js"), "utf8");
  assert(
    "app-permiso-matrimonio usa calcularPermisoMatrimonio",
    /import\s*\{[^}]*calcularPermisoMatrimonio[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(pmApp) &&
      /calcularPermisoMatrimonio\s*\(/.test(pmApp),
  );
}

console.log("\nPermiso fallecimiento art. 66 (días pagados según vínculo)");
{
  const hijo = calcularPermisoFallecimiento({ vinculo: "hijo", remuneracion: 900_000 });
  assert(
    "gold hijo $900.000 → 10 corridos, $300.000",
    hijo.ok &&
      hijo.diasPermiso === 10 &&
      hijo.tipoDias === "corridos" &&
      hijo.valorDia === 30_000 &&
      hijo.goceRemuneracion === 300_000 &&
      hijo.fuero === true,
    JSON.stringify(hijo),
  );
  const conyuge = calcularPermisoFallecimiento({ vinculo: "conyuge", remuneracion: 900_000 });
  assert(
    "gold cónyuge/AUC $900.000 → 7 corridos, $210.000",
    conyuge.ok &&
      conyuge.diasPermiso === 7 &&
      conyuge.tipoDias === "corridos" &&
      conyuge.goceRemuneracion === 210_000 &&
      conyuge.fuero === true,
    JSON.stringify(conyuge),
  );
  const padre = calcularPermisoFallecimiento({ vinculo: "padre_madre", remuneracion: 900_000 });
  assert(
    "gold padre/madre $900.000 → 4 hábiles, $120.000",
    padre.ok &&
      padre.diasPermiso === 4 &&
      padre.tipoDias === "habiles" &&
      padre.goceRemuneracion === 120_000 &&
      padre.fuero === false,
    JSON.stringify(padre),
  );
  const gestacion = calcularPermisoFallecimiento({
    vinculo: "hijo_gestacion",
    remuneracion: 900_000,
  });
  assert(
    "gold hijo en gestación $900.000 → 7 hábiles, $210.000",
    gestacion.ok &&
      gestacion.diasPermiso === 7 &&
      gestacion.tipoDias === "habiles" &&
      gestacion.goceRemuneracion === 210_000 &&
      gestacion.fuero === false,
    JSON.stringify(gestacion),
  );
  const gFecha = calcularPermisoFallecimiento({
    vinculo: "hijo",
    fechaFallecimiento: "2026-01-05",
    remuneracion: 900_000,
  });
  assert(
    "lunes 5 ene 2026 hijo → término 14 ene, reintegro 15 ene, $300000",
    gFecha.ok &&
      gFecha.fechaInicio === "2026-01-05" &&
      gFecha.fechaTermino === "2026-01-14" &&
      gFecha.fechaReintegro === "2026-01-15" &&
      gFecha.diasCalendario === 10 &&
      gFecha.goceRemuneracion === 300_000 &&
      gFecha.dias[0] === "2026-01-05" &&
      gFecha.dias[9] === "2026-01-14",
    JSON.stringify(gFecha),
  );
  const gHabil = calcularPermisoFallecimiento({
    vinculo: "padre_madre",
    fechaFallecimiento: "2026-04-30",
    remuneracion: 900_000,
  });
  assert(
    "jueves 30 abr 2026 padre: 1 may no consume; término 6 may, reintegro 7 may",
    gHabil.ok &&
      gHabil.fechaTermino === "2026-05-06" &&
      gHabil.fechaReintegro === "2026-05-07" &&
      gHabil.diasHabilesConsumidos === 4 &&
      gHabil.feriados.some((f) => f.fecha === "2026-05-01") &&
      gHabil.dias.includes("2026-04-30") &&
      !gHabil.dias.includes("2026-05-01") &&
      gHabil.goceRemuneracion === 120_000,
    JSON.stringify(gHabil),
  );
  const hermano = calcularPermisoFallecimiento({ vinculo: "hermano", remuneracion: 900_000 });
  assert(
    "hermano comparte cupo de 4 hábiles con padre/madre",
    hermano.diasPermiso === 4 &&
      hermano.tipoDias === "habiles" &&
      hermano.goceRemuneracion === 120_000,
  );
  assert(
    "remuneración negativa → monto 0; sin vínculo → ok false",
    calcularPermisoFallecimiento({ vinculo: "hijo", remuneracion: -1 }).goceRemuneracion === 0 &&
      calcularPermisoFallecimiento({ remuneracion: 900_000 }).ok === false,
  );
  const pfApp = readFileSync(join(root, "js/app-permiso-fallecimiento.js"), "utf8");
  assert(
    "app-permiso-fallecimiento usa calcularPermisoFallecimiento",
    /import\s*\{[^}]*calcularPermisoFallecimiento[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(pfApp) &&
      /calcularPermisoFallecimiento\s*\(/.test(pfApp),
  );
}

console.log("\nInterés por mora art. 63 (reajuste IPC + TMC reajustable)");
{
  // Gold: $1.000.000, 31-mar-2026 → 30-jun-2026, IPC 100→101,2, tasa 6 %.
  // Días de mora DT: 1-abr a 29-jun inclusive = 90. Reajuste 12.000; interés 15.180.
  const gold = calcularInteresMora(INTERES_MORA_GOLD);
  assert(
    "gold 1.000.000 / 31-mar-2026 / 30-jun-2026 / 6 % / IPC 1,2 % → 90 días, 12.000 + 15.180 = 1.027.180",
    gold.ok &&
      gold.diasMora === 90 &&
      gold.diasCalendario === 91 &&
      gold.reajuste === 12_000 &&
      gold.capitalReajustado === 1_012_000 &&
      gold.intereses === 15_180 &&
      gold.total === 1_027_180 &&
      Math.abs(gold.variacionIpcPct - 1.2) < 1e-9 &&
      gold.mesIpcInicial === "2026-02" &&
      gold.mesIpcFinal === "2026-05",
    JSON.stringify(gold),
  );
  const ine = calcularInteresMora({
    monto: 1_000_000,
    fechaVencimiento: "2026-03-31",
    fechaPago: "2026-06-30",
  });
  const varIne = IPC_INE["2026-05"] / IPC_INE["2026-02"] - 1;
  const reajIne = Math.round(1_000_000 * varIne);
  const intIne = Math.round(((1_000_000 + reajIne) * (TMC_REAJUSTABLE_MENOS_UN_ANIO / 100) * 90) / 360);
  assert(
    "tabla INE feb/may 2026 + TMC 6,72 % sobre el mismo tramo",
    ine.ok &&
      ine.diasMora === 90 &&
      ine.ipcInicial === IPC_INE["2026-02"] &&
      ine.ipcFinal === IPC_INE["2026-05"] &&
      ine.tasaAnualPct === 6.72 &&
      ine.reajuste === reajIne &&
      ine.intereses === intIne &&
      ine.total === 1_000_000 + reajIne + intIne,
    JSON.stringify({ ine, reajIne, intIne }),
  );
  assert(
    "mismo mes: 0 % IPC; pagar al día siguiente → 0 días de interés",
    calcularInteresMora({
      monto: 1_000_000,
      fechaVencimiento: "2026-03-31",
      fechaPago: "2026-04-01",
      ipcInicial: 100,
      ipcFinal: 100,
      tasaAnualPct: 6,
    }).diasMora === 0 &&
      calcularInteresMora({
        monto: 1_000_000,
        fechaVencimiento: "2026-03-10",
        fechaPago: "2026-03-20",
        ipcInicial: 100,
        ipcFinal: 100,
        tasaAnualPct: 6,
      }).reajuste === 0,
  );
  assert(
    "pago antes / sin monto / sin fecha → ok false",
    calcularInteresMora({
      monto: 1_000_000,
      fechaVencimiento: "2026-06-30",
      fechaPago: "2026-03-31",
      ipcInicial: 100,
      ipcFinal: 101,
    }).motivo === "pago_antes" &&
      calcularInteresMora({ fechaVencimiento: "2026-03-31", fechaPago: "2026-06-30" }).motivo ===
        "sin_monto" &&
      calcularInteresMora({ monto: 1000 }).motivo === "sin_fecha",
  );
  assert(
    "IPC INE dic-2025 a ago-2026 (SII + boletín INE agosto)",
    IPC_INE["2025-12"] === 109.26 &&
      IPC_INE["2026-01"] === 109.71 &&
      IPC_INE["2026-02"] === 109.7 &&
      IPC_INE["2026-03"] === 110.75 &&
      IPC_INE["2026-04"] === 112.18 &&
      IPC_INE["2026-05"] === 112.37 &&
      IPC_INE["2026-06"] === 112.35 &&
      IPC_INE["2026-07"] === 112.45 &&
      IPC_INE["2026-08"] === 113.15 &&
      TMC_REAJUSTABLE_MENOS_UN_ANIO === 6.72,
  );
  const imApp = readFileSync(join(root, "js/app-interes-mora.js"), "utf8");
  assert(
    "app-interes-mora usa calcularInteresMora",
    /import\s*\{[^}]*calcularInteresMora[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(imApp) &&
      /calcularInteresMora\s*\(/.test(imApp) &&
      /function decimalVal/.test(imApp) &&
      !/\balert\s*\(/.test(imApp),
  );
}

console.log("\nFuero maternal art. 201 (calendario; parental excluido)");
{
  // Fuente: art. 201 CT (BCN) + consulta DT 14/03/2025 (un año y 84 días) + ORD. N°3366.
  // Parto 2026-01-05 + 84 días (12 sem arts. 195/197) = 2026-03-30; fuero + 1 año = 2027-03-30.
  const g = calcularFueroMaternal({ fechaParto: "2026-01-05", modalidad: "postnatal" });
  assert(
    "gold parto 2026-01-05 solo postnatal → 2026-03-30 / fuero 2027-03-30",
    g.ok &&
      g.fechaTerminoPostnatal === "2026-03-30" &&
      g.fechaTerminoFuero === "2027-03-30" &&
      g.fechaTerminoParental === "" &&
      g.diasPostnatal === 84 &&
      g.parentalExtiendeFuero === false &&
      g.fechaInicioPrenatal === "2025-11-24",
    JSON.stringify(g),
  );
  const completa = calcularFueroMaternal({ fechaParto: "2026-01-05", modalidad: "completa" });
  assert(
    "gold + parental completo 12 sem: parental 2026-06-22; fuero no cambia",
    completa.ok &&
      completa.fechaTerminoPostnatal === "2026-03-30" &&
      completa.fechaTerminoFuero === "2027-03-30" &&
      completa.fechaTerminoParental === "2026-06-22" &&
      completa.diasParental === 84 &&
      completa.parentalExtiendeFuero === false,
    JSON.stringify(completa),
  );
  const parcial = calcularFueroMaternal({ fechaParto: "2026-01-05", modalidad: "parcial" });
  assert(
    "gold + parental parcial 18 sem: parental 2026-08-03; fuero no cambia",
    parcial.ok &&
      parcial.fechaTerminoPostnatal === "2026-03-30" &&
      parcial.fechaTerminoFuero === "2027-03-30" &&
      parcial.fechaTerminoParental === "2026-08-03" &&
      parcial.diasParental === 126 &&
      parcial.parentalExtiendeFuero === false,
    JSON.stringify(parcial),
  );
  const supl = calcularFueroMaternal({
    fechaParto: "2026-01-05",
    modalidad: "completa",
    diasSuplementario: 18,
  });
  assert(
    "gold suplementario art. 196 18 días → postnatal 2026-04-17, fuero 2027-04-17",
    supl.ok &&
      supl.fechaTerminoPostnatal === "2026-04-17" &&
      supl.fechaTerminoFuero === "2027-04-17" &&
      supl.suplementarioExtiendeFuero === true &&
      supl.diasPostnatal === 102,
    JSON.stringify(supl),
  );
  const fase = calcularFueroMaternal({
    fechaParto: "2026-01-05",
    modalidad: "completa",
    referencia: "2026-09-10",
  });
  assert(
    "fase 2026-09-10 tras parental y antes del fuero → fuero",
    fase.fase === "fuero",
    JSON.stringify(fase),
  );
  assert(
    "sin fecha → ok false; parental no inventa monto",
    calcularFueroMaternal({}).ok === false &&
      calcularFueroMaternal({}).motivo === "sin_fecha" &&
      !("goceRemuneracion" in calcularFueroMaternal({ fechaParto: "2026-01-05" })),
  );
  const fmApp = readFileSync(join(root, "js/app-fuero-maternal.js"), "utf8");
  assert(
    "app-fuero-maternal usa calcularFueroMaternal",
    /import\s*\{[^}]*calcularFueroMaternal[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(fmApp) &&
      /calcularFueroMaternal\s*\(/.test(fmApp) &&
      !/\balert\s*\(/.test(fmApp) &&
      !/\bconfirm\s*\(/.test(fmApp) &&
      !/\bprompt\s*\(/.test(fmApp) &&
      !/window\.open/.test(fmApp),
  );
}

{
  const fpApp = readFileSync(join(root, "js/app-feriado-progresivo.js"), "utf8");
  assert(
    "app-feriado-progresivo usa calcularFeriadoProgresivo",
    /import\s*\{[^}]*calcularFeriadoProgresivo[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(fpApp) &&
      /calcularFeriadoProgresivo\s*\(/.test(fpApp),
  );
}

console.log("\nFeriado anual art. 67 (días hábiles)");
{
  const g1 = calcularFeriadoAnual({ fechaInicio: "2026-01-05", diasHabiles: 15 });
  assert(
    "lunes 5 ene 2026 / 15 hábiles → viernes 23, reintegro lunes 26, 21 corridos",
    g1.ok &&
      g1.fechaTermino === "2026-01-23" &&
      g1.fechaReintegro === "2026-01-26" &&
      g1.diasCorridos === 21 &&
      g1.diasHabilesConsumidos === 15 &&
      g1.feriados.length === 0 &&
      g1.domingos.length === 3,
    JSON.stringify(g1),
  );
  const g2 = calcularFeriadoAnual({ fechaInicio: "2026-04-20", diasHabiles: 15 });
  assert(
    "lunes 20 abr 2026 / 15 hábiles: 1 may no consume; término 11 may, reintegro 12 may",
    g2.ok &&
      g2.fechaTermino === "2026-05-11" &&
      g2.fechaReintegro === "2026-05-12" &&
      g2.diasCorridos === 22 &&
      g2.feriados.some((f) => f.fecha === "2026-05-01") &&
      !g2.feriados.some((f) => f.fecha === "2026-04-03"),
    JSON.stringify(g2),
  );
  const sur = calcularFeriadoAnual({ fechaInicio: "2026-01-05", diasHabiles: 20 });
  assert(
    "extremo sur 20 hábiles desde 5 ene → 30 ene / reintegro 2 feb / 28 corridos",
    sur.fechaTermino === "2026-01-30" && sur.fechaReintegro === "2026-02-02" && sur.diasCorridos === 28,
    JSON.stringify(sur),
  );
  const extra = calcularFeriadoAnual({
    fechaInicio: "2026-01-05",
    diasHabiles: 15,
    diasProgresivos: 1,
  });
  assert(
    "15 + 1 progresivo indicado (no recalculado) → 16 hábiles, término 26 ene",
    extra.diasATomar === 16 && extra.fechaTermino === "2026-01-26" && extra.fechaReintegro === "2026-01-27",
    JSON.stringify(extra),
  );
  const faApp = readFileSync(join(root, "js/app-feriado-anual.js"), "utf8");
  assert(
    "app-feriado-anual usa calcularFeriadoAnual",
    /import\s*\{[^}]*calcularFeriadoAnual[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(faApp) &&
      /calcularFeriadoAnual\s*\(/.test(faApp),
  );
}

console.log("\nSueldo líquido");
const golden = calcularSueldo(
  { sueldoBase: 1_000_000, afp: "modelo", salud: "fonasa", contrato: "indefinido" },
  { uf: FALLBACK_UF },
);
assert(
  "1.000.000 Modelo indefinido Fonasa líquido = 818200",
  golden.liquido === 818200,
  String(golden.liquido),
);
assert("AFP 105.800", golden.afp.monto === 105800, String(golden.afp.monto));
assert("Salud 70.000", golden.salud.monto === 70000, String(golden.salud.monto));
assert("Cesantía 6.000", golden.cesantia.monto === 6000, String(golden.cesantia.monto));
assert("IUSC 0 bajo primer tramo", golden.iusc === 0, String(golden.iusc));
assert("Tasa AFP Modelo 10,58 %", close(tasaAfp("modelo"), 0.1058));

const plazo = calcularSueldo(
  { sueldoBase: 1_000_000, afp: "modelo", salud: "fonasa", contrato: "plazo_fijo" },
  { uf: FALLBACK_UF },
);
assert("Plazo fijo sin cesantía trabajador", plazo.cesantia.monto === 0);

const withNoImp = calcularSueldo(
  {
    sueldoBase: 1_000_000,
    afp: "modelo",
    salud: "fonasa",
    contrato: "indefinido",
    colacion: 40000,
    movilizacion: 30000,
  },
  { uf: FALLBACK_UF },
);
assert(
  "Colación/movilización art.41 no imponibles",
  withNoImp.imponible === 1_000_000 && withNoImp.liquido === 818200 + 70000,
  `imp=${withNoImp.imponible} liq=${withNoImp.liquido}`,
);

assert("Gratificación 25 % con tope", gratificacionArt50(1_000_000) === 219115);
assert("Gratificación bajo tope", gratificacionArt50(100_000) === 25000);
assert("Gratificación 800000 → 200000 (bajo tope)", gratificacionArt50(800_000) === 200_000);
assert("Gratificación 900000 → tope 219115", gratificacionArt50(900_000) === GRATIFICACION_TOPE);
assert(
  "Gratificación extras+bonos bajo tope",
  gratificacionArt50(700_000, 50_000, 50_000) === 200_000,
);
assert(
  "Gratificación extras+bonos con tope",
  gratificacionArt50(800_000, 50_000, 50_000) === GRATIFICACION_TOPE,
);
{
  const grApp = readFileSync(join(root, "js/app-gratificacion.js"), "utf8");
  assert(
    "app-gratificacion usa gratificacionArt50",
    /import\s*\{[^}]*gratificacionArt50[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(grApp) &&
      /gratificacionArt50\s*\(/.test(grApp),
  );
}
{
  const fijo = calcularAguinaldo({
    modo: "fijo",
    montoFijo: 50_000,
    sueldoBase: 800_000,
    trabajadores: 1,
    imponible: true,
  });
  assert("aguinaldo fijo 50000", fijo.porTrabajador === 50_000 && fijo.totalPlanilla === 50_000, String(fijo.porTrabajador));
  assert(
    "aguinaldo fijo imponible extra líquido 40910",
    fijo.extraLiquido === 40_910 && fijo.extraDescuentos === 9_090 && fijo.extraImponible === 50_000,
    `${fijo.extraLiquido} ${fijo.extraDescuentos}`,
  );
  const planilla = calcularAguinaldo({
    modo: "fijo",
    montoFijo: 50_000,
    sueldoBase: 800_000,
    trabajadores: 10,
    imponible: true,
  });
  assert(
    "aguinaldo 10 trabajadores planilla 500000",
    planilla.porTrabajador === 50_000 &&
      planilla.totalPlanilla === 500_000 &&
      planilla.extraLiquidoPlanilla === 409_100,
    String(planilla.totalPlanilla),
  );
  const pct = calcularAguinaldo({
    modo: "porcentaje",
    porcentaje: 10,
    sueldoBase: 800_000,
    trabajadores: 5,
    imponible: true,
  });
  assert(
    "aguinaldo 10 % de 800000 × 5",
    pct.porTrabajador === 80_000 && pct.totalPlanilla === 400_000 && pct.modo === "porcentaje",
    `${pct.porTrabajador} ${pct.totalPlanilla}`,
  );
  const noImp = calcularAguinaldo({
    modo: "fijo",
    montoFijo: 50_000,
    sueldoBase: 800_000,
    trabajadores: 1,
    imponible: false,
  });
  assert(
    "aguinaldo no imponible extra = haber",
    noImp.extraLiquido === 50_000 && noImp.extraDescuentos === 0 && noImp.extraImponible === 0,
    `${noImp.extraLiquido} ${noImp.extraDescuentos}`,
  );
  const agApp = readFileSync(join(root, "js/app-aguinaldo.js"), "utf8");
  assert(
    "app-aguinaldo usa calcularAguinaldo",
    /import\s*\{[^}]*calcularAguinaldo[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(agApp) &&
      /calcularAguinaldo\s*\(/.test(agApp),
  );
}
{
  const ind = { uf: FALLBACK_UF };
  const demo = calcularCostoEmpresa(
    { modo: "bruto", monto: 800_000, contrato: "indefinido" },
    ind,
  );
  assert(
    "costo empresa 800000 indefinido = 854640",
    demo.ley21735.monto === 28_000 &&
      demo.cesantiaEmpleador.monto === 19_200 &&
      demo.mutual.monto === 7_200 &&
      demo.sanna.monto === 240 &&
      demo.totalAportes === 54_640 &&
      demo.costoEmpresa === 854_640 &&
      demo.liquido === 654_560,
    JSON.stringify({
      ley: demo.ley21735.monto,
      ces: demo.cesantiaEmpleador.monto,
      mutual: demo.mutual.monto,
      sanna: demo.sanna.monto,
      aportes: demo.totalAportes,
      costo: demo.costoEmpresa,
    }),
  );
  assert(
    "costo empresa Ley 21.735 desglose 0,1+0,9+2,5",
    demo.ley21735.cuentaIndividual.monto === 800 &&
      demo.ley21735.crp.monto === 7_200 &&
      demo.ley21735.ssp.monto === 20_000 &&
      demo.ley21735.monto === 28_000,
  );
  const plazo = calcularCostoEmpresa(
    { modo: "bruto", monto: 800_000, contrato: "plazo_fijo" },
    ind,
  );
  assert(
    "costo empresa plazo fijo cesantía 3 %",
    plazo.cesantiaEmpleador.tasa === 0.03 &&
      plazo.cesantiaEmpleador.monto === 24_000 &&
      plazo.costoEmpresa === 859_440,
    String(plazo.costoEmpresa),
  );
  const grat = calcularCostoEmpresa(
    { modo: "bruto", monto: 800_000, contrato: "indefinido", gratificacionArt50: true },
    ind,
  );
  assert(
    "costo empresa con grat art. 50",
    grat.gratificacion === 200_000 &&
      grat.imponible === 1_000_000 &&
      grat.totalAportes === 68_300 &&
      grat.costoEmpresa === 1_068_300,
    String(grat.costoEmpresa),
  );
  const liq = calcularSueldo(
    { sueldoBase: 800_000, afp: "modelo", salud: "fonasa", contrato: "indefinido" },
    ind,
  );
  assert(
    "brutoDesdeLiquido 654560 → 800000",
    brutoDesdeLiquido(liq.liquido, { afp: "modelo", salud: "fonasa", contrato: "indefinido" }, ind) === 800_000 &&
      liq.liquido === 654_560,
  );
  const fromLiq = calcularCostoEmpresa(
    { modo: "liquido", monto: 654_560, contrato: "indefinido" },
    ind,
  );
  assert(
    "costo empresa desde líquido 654560",
    fromLiq.sueldoBase === 800_000 && fromLiq.costoEmpresa === 854_640,
    `${fromLiq.sueldoBase} ${fromLiq.costoEmpresa}`,
  );
  const tope = calcularCostoEmpresa(
    { modo: "bruto", monto: 10_000_000, contrato: "indefinido" },
    ind,
  );
  assert(
    "costo empresa respeta tope 90 UF y 135,2 UF",
    close(tope.baseAfpSalud, TOPE_AFP_SALUD_UF * FALLBACK_UF, 0.1) &&
      close(tope.baseCesantia, TOPE_CESANTIA_UF * FALLBACK_UF, 0.1) &&
      tope.ley21735.monto === 128_691 &&
      tope.cesantiaEmpleador.monto === 132_563,
    `${tope.ley21735.monto} ${tope.cesantiaEmpleador.monto}`,
  );
  const ceApp = readFileSync(join(root, "js/app-costo-empresa.js"), "utf8");
  assert(
    "app-costo-empresa usa calcularCostoEmpresa",
    /import\s*\{[^}]*calcularCostoEmpresa[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(ceApp) &&
      /calcularCostoEmpresa\s*\(/.test(ceApp),
  );
}
{
  const ind = { uf: FALLBACK_UF };
  const demo = calcularSeguroCesantia({ sueldoBase: 800_000, contrato: "indefinido" }, ind);
  const sueldoDemo = calcularSueldo(
    { sueldoBase: 800_000, afp: "modelo", salud: "fonasa", contrato: "indefinido" },
    ind,
  );
  const costoDemo = calcularCostoEmpresa(
    { modo: "bruto", monto: 800_000, contrato: "indefinido" },
    ind,
  );
  assert(
    "seguro cesantía 800000 indefinido reusa motor",
    demo.trabajador.monto === sueldoDemo.cesantia.monto &&
      demo.empleador.monto === costoDemo.cesantiaEmpleador.monto &&
      demo.trabajador.monto === 4_800 &&
      demo.empleador.monto === 19_200 &&
      demo.empleador.cic.monto === 12_800 &&
      demo.empleador.fcs.monto === 6_400 &&
      demo.cuentaIndividual.monto === 17_600 &&
      demo.fondoSolidario.monto === 6_400 &&
      demo.total === 24_000 &&
      demo.trabajador.cic.monto === 4_800 &&
      demo.trabajador.fcs.monto === 0,
    JSON.stringify({
      trab: demo.trabajador.monto,
      emp: demo.empleador.monto,
      cic: demo.cuentaIndividual.monto,
      fcs: demo.fondoSolidario.monto,
    }),
  );
  const plazo = calcularSeguroCesantia({ sueldoBase: 800_000, contrato: "plazo_fijo" }, ind);
  const obra = calcularSeguroCesantia({ sueldoBase: 800_000, contrato: "obra" }, ind);
  const costoPlazo = calcularCostoEmpresa(
    { modo: "bruto", monto: 800_000, contrato: "plazo_fijo" },
    ind,
  );
  assert(
    "seguro cesantía 800000 plazo fijo 3 % empleador",
    plazo.trabajador.monto === 0 &&
      plazo.empleador.tasa === 0.03 &&
      plazo.empleador.monto === 24_000 &&
      plazo.empleador.cic.monto === 22_400 &&
      plazo.empleador.fcs.monto === 1_600 &&
      plazo.cuentaIndividual.monto === 22_400 &&
      plazo.fondoSolidario.monto === 1_600 &&
      plazo.total === 24_000 &&
      plazo.empleador.monto === costoPlazo.cesantiaEmpleador.monto,
    JSON.stringify({ emp: plazo.empleador.monto, cic: plazo.empleador.cic.monto }),
  );
  assert(
    "seguro cesantía obra = plazo fijo",
    obra.empleador.monto === plazo.empleador.monto &&
      obra.trabajador.monto === 0 &&
      obra.contrato === "plazo_fijo",
  );
  const tope = calcularSeguroCesantia({ sueldoBase: 10_000_000, contrato: "indefinido" }, ind);
  assert(
    "seguro cesantía respeta tope 135,2 UF",
    close(tope.baseCesantia, TOPE_CESANTIA_UF * FALLBACK_UF, 0.1) &&
      tope.empleador.monto === 132_563 &&
      tope.empleador.cic.monto + tope.empleador.fcs.monto === tope.empleador.monto &&
      tope.trabajador.monto + tope.empleador.monto === tope.total,
    `${tope.empleador.monto} ${tope.baseCesantia}`,
  );
  const scApp = readFileSync(join(root, "js/app-seguro-cesantia.js"), "utf8");
  assert(
    "app-seguro-cesantia usa calcularSeguroCesantia",
    /import\s*\{[^}]*calcularSeguroCesantia[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(scApp) &&
      /calcularSeguroCesantia\s*\(/.test(scApp),
  );
}

{
  const indTp = { uf: FALLBACK_UF };
  const goldTpCalc = calcularTrabajoPesado(
    { remuneracionImponible: 1_000_000, calificacion: "pesado" },
    indTp,
  );
  assert(
    "gold trabajo pesado 1000000 2 %+2 % → 20000 + 20000 = 40000",
    goldTpCalc.cotTrabajador === 20_000 &&
      goldTpCalc.cotEmpleador === 20_000 &&
      goldTpCalc.totalMes === 40_000 &&
      goldTpCalc.imponibleEfectiva === 1_000_000 &&
      goldTpCalc.topeAplicado === false,
    JSON.stringify({ t: goldTpCalc.cotTrabajador, e: goldTpCalc.cotEmpleador, tot: goldTpCalc.totalMes }),
  );
  const menosTp = calcularTrabajoPesado(
    { remuneracionImponible: 1_000_000, calificacion: "menos_pesado" },
    indTp,
  );
  assert(
    "gold trabajo menos pesado 1000000 1 %+1 % → 10000 + 10000 = 20000",
    menosTp.cotTrabajador === 10_000 &&
      menosTp.cotEmpleador === 10_000 &&
      menosTp.totalMes === 20_000 &&
      menosTp.calificacion === "menos_pesado",
    JSON.stringify({ t: menosTp.cotTrabajador, e: menosTp.cotEmpleador }),
  );
  const topeTp = calcularTrabajoPesado(
    { remuneracionImponible: 10_000_000, calificacion: "pesado" },
    indTp,
  );
  const topePesosTp = TOPE_AFP_SALUD_UF * FALLBACK_UF;
  const cotTopeTp = Math.round(topePesosTp * 0.02);
  assert(
    "trabajo pesado respeta tope AFP 90 UF",
    close(topeTp.imponibleEfectiva, topePesosTp, 0.1) &&
      topeTp.topeAplicado === true &&
      topeTp.cotTrabajador === cotTopeTp &&
      topeTp.cotEmpleador === cotTopeTp &&
      topeTp.totalMes === cotTopeTp * 2 &&
      10_000_000 > topePesosTp,
    `${topeTp.cotTrabajador} ${topeTp.imponibleEfectiva}`,
  );
  const rebaja10 = calcularTrabajoPesado({
    remuneracionImponible: 1_000_000,
    calificacion: "pesado",
    aniosCotizados: 10,
  });
  const rebaja25 = calcularTrabajoPesado({
    remuneracionImponible: 1_000_000,
    calificacion: "pesado",
    aniosCotizados: 25,
  });
  const rebajaMenos10 = calcularTrabajoPesado({
    remuneracionImponible: 1_000_000,
    calificacion: "menos_pesado",
    aniosCotizados: 10,
  });
  const rebajaMenos25 = calcularTrabajoPesado({
    remuneracionImponible: 1_000_000,
    calificacion: "menos_pesado",
    aniosCotizados: 25,
  });
  assert(
    "rebaja edad: 10 años → 4/2; 25 años → tope 10/5",
    rebaja10.aniosRebaja === 4 &&
      rebaja25.aniosRebaja === 10 &&
      rebajaMenos10.aniosRebaja === 2 &&
      rebajaMenos25.aniosRebaja === 5,
    JSON.stringify({
      r10: rebaja10.aniosRebaja,
      r25: rebaja25.aniosRebaja,
      m10: rebajaMenos10.aniosRebaja,
      m25: rebajaMenos25.aniosRebaja,
    }),
  );
  const tpApp = readFileSync(join(root, "js/app-trabajo-pesado.js"), "utf8");
  assert(
    "app-trabajo-pesado usa calcularTrabajoPesado",
    /import\s*\{[^}]*calcularTrabajoPesado[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(tpApp) &&
      /calcularTrabajoPesado\s*\(/.test(tpApp),
  );
}
{
  const iuApp = readFileSync(join(root, "js/app-impuesto-unico.js"), "utf8");
  assert(
    "app-impuesto-unico usa calcularIusc",
    /import\s*\{[^}]*calcularIusc[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(iuApp) &&
      /calcularIusc\s*\(/.test(iuApp),
  );
}
{
  const cpApp = readFileSync(join(root, "js/app-cotizaciones-previsionales.js"), "utf8");
  assert(
    "app-cotizaciones-previsionales usa calcularSueldo y tasaAfp",
    /import\s*\{[^}]*calcularSueldo[^}]*tasaAfp[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(cpApp) &&
      /calcularSueldo\s*\(/.test(cpApp) &&
      /tasaAfp\s*\(/.test(cpApp),
  );
}

const homeCtrl = calcularSueldo(
  {
    sueldoBase: 1_200_000,
    afp: "modelo",
    salud: "fonasa",
    contrato: "indefinido",
    gratificacionArt50: true,
  },
  { uf: FALLBACK_UF },
);
assert("control 1.200.000 gratificación 219115", homeCtrl.gratificacion === 219115, String(homeCtrl.gratificacion));
assert("control 1.200.000 imponible 1419115", homeCtrl.imponible === 1_419_115, String(homeCtrl.imponible));
assert("control 1.200.000 AFP 150142", homeCtrl.afp.monto === 150142, String(homeCtrl.afp.monto));
assert("control 1.200.000 salud 99338", homeCtrl.salud.monto === 99338, String(homeCtrl.salud.monto));
assert("control 1.200.000 cesantía 8515", homeCtrl.cesantia.monto === 8515, String(homeCtrl.cesantia.monto));
assert("control 1.200.000 base 1161120", homeCtrl.baseTributable === 1_161_120, String(homeCtrl.baseTributable));
assert("control 1.200.000 IUSC 7754", homeCtrl.iusc === 7754, String(homeCtrl.iusc));
assert("control 1.200.000 líquido 1153366", homeCtrl.liquido === 1_153_366, String(homeCtrl.liquido));

const topeAfp = calcularSueldo(
  { sueldoBase: 10_000_000, afp: "modelo", salud: "fonasa", contrato: "indefinido" },
  { uf: FALLBACK_UF },
);
assert(
  "AFP usa tope 90 UF",
  close(topeAfp.baseAfpSalud, 90 * FALLBACK_UF, 0.1),
  String(topeAfp.baseAfpSalud),
);
assert(
  "Cesantía usa tope 135.2 UF",
  close(topeAfp.baseCesantia, 135.2 * FALLBACK_UF, 0.1),
  String(topeAfp.baseCesantia),
);

const isapre = calcularSueldo(
  {
    sueldoBase: 1_000_000,
    afp: "modelo",
    salud: "isapre",
    isaprePactado: 90000,
    contrato: "indefinido",
  },
  { uf: FALLBACK_UF },
);
assert("Isapre cobra el mayor entre 7 % y pactado", isapre.salud.monto === 90000);

console.log("\nIUSC agosto 2026");
assert("≤ 967261.5 → 0", calcularIusc(967261.5) === 0);
assert("800.000 exento → 0", calcularIusc(800_000) === 0);
assert("1.500.000 → 21310", calcularIusc(1_500_000) === 21310);
assert(
  "2.000.000 → 4 % − 38690.46",
  calcularIusc(2_000_000) === Math.round(2_000_000 * 0.04 - 38690.46),
);
assert(
  "3.000.000 → 8 % − 124669.26",
  calcularIusc(3_000_000) === Math.round(3_000_000 * 0.08 - 124669.26),
);
assert(
  "4.500.000 → 13.5 % − 321704.01",
  calcularIusc(4_500_000) === Math.round(4_500_000 * 0.135 - 321704.01),
);
assert(
  "6.000.000 → 23 % − 798169.86",
  calcularIusc(6_000_000) === Math.round(6_000_000 * 0.23 - 798169.86),
);
assert(
  "8.000.000 → 30.4 % − 1275352.2",
  calcularIusc(8_000_000) === Math.round(8_000_000 * 0.304 - 1275352.2),
);
assert(
  "10.000.000 → 35 % − 1670854.68",
  calcularIusc(10_000_000) === Math.round(10_000_000 * 0.35 - 1670854.68),
);
assert(
  "sobre 22.211.190 → 40 % − 2781414.18",
  calcularIusc(25_000_000) === Math.round(25_000_000 * 0.4 - 2781414.18),
);

console.log("\nFiniquito");
assert("Fracción > 6 meses suma 1 año", aniosServicio("2020-01-15", "2023-08-20") === 4);
assert("Exactamente 6 meses no suma", aniosServicio("2020-01-15", "2023-07-15") === 3);
assert("Tope 11 años", aniosServicio("2000-01-01", "2020-01-01") === 11);
assert("4 años 4 meses no redondea", aniosServicio("2020-01-15", "2024-05-15") === 4);
assert("4 años 7 meses redondea a 5", aniosServicio("2020-01-15", "2024-08-15") === 5);
{
  const ias4y4m = calcularIas(
    { ingreso: "2020-01-15", termino: "2024-05-15", remuneracion: 1_000_000, avisoPrevio: true },
    { uf: FALLBACK_UF },
  );
  assert(
    "IAS 4 años 4 meses × $1.000.000 = $4.000.000 (sin redondeo, sin aviso)",
    ias4y4m.anios === 4 &&
      ias4y4m.ias === 4_000_000 &&
      ias4y4m.aviso === 0 &&
      ias4y4m.vigenciaUnAnio &&
      !ias4y4m.recortoTopeUf &&
      !ias4y4m.recortoTopeAnios,
    String(ias4y4m.ias),
  );
  const ias4y7m = calcularIas(
    { ingreso: "2020-01-15", termino: "2024-08-15", remuneracion: 1_000_000, avisoPrevio: true },
    { uf: FALLBACK_UF },
  );
  assert("IAS 4 años 7 meses → 5 × $1.000.000 = $5.000.000", ias4y7m.anios === 5 && ias4y7m.ias === 5_000_000);
  const iasTopeAnios = calcularIas(
    { ingreso: "2000-01-01", termino: "2020-01-01", remuneracion: 1_000_000, avisoPrevio: true },
    { uf: FALLBACK_UF },
  );
  assert(
    "IAS tope 11 años (20 años → 11 × $1.000.000)",
    iasTopeAnios.anios === 11 && iasTopeAnios.ias === 11_000_000 && iasTopeAnios.recortoTopeAnios,
  );
  const iasTopeUf = calcularIas(
    { ingreso: "2020-01-15", termino: "2022-01-15", remuneracion: 10_000_000, avisoPrevio: false },
    { uf: FALLBACK_UF },
  );
  const tope90 = 90 * FALLBACK_UF;
  assert(
    "IAS tope 90 UF: 2 años × min($10.000.000, 90 UF)",
    iasTopeUf.anios === 2 &&
      iasTopeUf.baseIas === Math.round(tope90) &&
      iasTopeUf.ias === Math.round(2 * tope90) &&
      iasTopeUf.aviso === Math.round(tope90) &&
      iasTopeUf.recortoTopeUf &&
      iasTopeUf.ias === 7_353_722 &&
      iasTopeUf.aviso === 3_676_861,
    `${iasTopeUf.baseIas} ${iasTopeUf.ias} ${iasTopeUf.aviso}`,
  );
  const iasCorta = calcularIas(
    { ingreso: "2025-01-15", termino: "2025-10-15", remuneracion: 1_000_000, avisoPrevio: false },
    { uf: FALLBACK_UF },
  );
  assert(
    "IAS menos de un año → $0; aviso sustitutivo sí",
    iasCorta.ias === 0 && iasCorta.anios === 0 && !iasCorta.vigenciaUnAnio && iasCorta.aviso === 1_000_000,
  );
  const iasGuia = calcularIas(
    { ingreso: "2020-03-01", termino: "2026-03-01", remuneracion: 900_000, avisoPrevio: false },
    { uf: FALLBACK_UF },
  );
  assert(
    "IAS ejemplo guía 6 × $900.000 = $5.400.000 + aviso $900.000",
    iasGuia.anios === 6 && iasGuia.ias === 5_400_000 && iasGuia.aviso === 900_000,
  );
  const finMatch = calcularFiniquito(
    {
      articulo: "161",
      ingreso: "2020-01-15",
      termino: "2023-08-20",
      remuneracion: 1_000_000,
      avisoPrevio: false,
      diasFeriado: 0,
    },
    { uf: FALLBACK_UF },
  );
  const iasMatch = calcularIas(
    { ingreso: "2020-01-15", termino: "2023-08-20", remuneracion: 1_000_000, avisoPrevio: false },
    { uf: FALLBACK_UF },
  );
  assert(
    "IAS reusa calcularFiniquito (4 años, $4.000.000 + aviso $1.000.000)",
    iasMatch.ias === finMatch.ias &&
      iasMatch.aviso === finMatch.aviso &&
      iasMatch.baseIas === finMatch.baseIas &&
      iasMatch.ias === 4_000_000 &&
      iasMatch.aviso === 1_000_000,
  );
}
{
  const iasApp = readFileSync(join(root, "js/app-indemnizacion-anos-servicio.js"), "utf8");
  assert(
    "app-indemnizacion-anos-servicio usa calcularIas",
    /import\s*\{[^}]*calcularIas[^}]*\}\s*from\s*["']\.\/finiquito\.js["']/.test(iasApp) &&
      /calcularIas\s*\(/.test(iasApp),
  );
}

console.log("\nAutodespido art. 171 (reusa calcularIas; gold 2026)");
{
  // Fuente: art. 171 CT (BCN / ORD. N°335/2) + consulta DT w3-article-60579.
  // Núcleo: IAS art. 163 + aviso art. 162 inc. 4 si el juez acoge. Recargo 50/80 % no se calcula aquí.
  const gold = calcularIas(
    { ingreso: "2020-03-01", termino: "2026-03-01", remuneracion: 1_000_000, avisoPrevio: true },
    { uf: FALLBACK_UF },
  );
  assert(
    "gold 2026 base $1.000.000 × 6 años exactos → IAS $6.000.000 (roundPeso)",
    gold.anios === 6 &&
      gold.ias === 6_000_000 &&
      gold.aviso === 0 &&
      gold.totalIasAviso === 6_000_000 &&
      gold.vigenciaUnAnio &&
      !gold.recortoTopeUf &&
      !gold.recortoTopeAnios &&
      gold.baseIas === 1_000_000,
    JSON.stringify({ anios: gold.anios, ias: gold.ias, aviso: gold.aviso, total: gold.totalIasAviso }),
  );
  const goldAviso = calcularIas(
    { ingreso: "2020-03-01", termino: "2026-03-01", remuneracion: 1_000_000, avisoPrevio: false },
    { uf: FALLBACK_UF },
  );
  assert(
    "gold 2026 + aviso sustitutivo → total $7.000.000",
    goldAviso.anios === 6 &&
      goldAviso.ias === 6_000_000 &&
      goldAviso.aviso === 1_000_000 &&
      goldAviso.totalIasAviso === 7_000_000,
    JSON.stringify({ ias: goldAviso.ias, aviso: goldAviso.aviso, total: goldAviso.totalIasAviso }),
  );
  const frac = calcularIas(
    { ingreso: "2020-03-01", termino: "2026-10-01", remuneracion: 1_000_000, avisoPrevio: true },
    { uf: FALLBACK_UF },
  );
  assert(
    "6 años 7 meses → 7 × $1.000.000 = $7.000.000",
    frac.anios === 7 && frac.ias === 7_000_000,
    String(frac.ias),
  );
  const adApp = readFileSync(join(root, "js/app-autodespido.js"), "utf8");
  assert(
    "app-autodespido usa calcularIas (no reimplementa la fórmula)",
    /import\s*\{[^}]*calcularIas[^}]*\}\s*from\s*["']\.\/finiquito\.js["']/.test(adApp) &&
      /calcularIas\s*\(/.test(adApp) &&
      !/\balert\s*\(/.test(adApp) &&
      !/\bconfirm\s*\(/.test(adApp) &&
      !/\bprompt\s*\(/.test(adApp) &&
      !/window\.open/.test(adApp),
  );
}

console.log("\nIndemnización obra o faena art. 163 (Ley 21.122; gold 2026)");
{
  // Fuentes: art. 159 N°5, 163 inciso, 172 y 23 transitorio CT; Ley 21.122;
  // consulta DT w3-article-118059 y dictamen 954/9. Valor día = rem/30, roundPeso.
  const gold = calcularIndemnizacionObraFaena(
    { ingreso: "2026-01-01", termino: "2026-09-01", remuneracion: 900_000, celebracion: "2026-01-01" },
    { uf: FALLBACK_UF },
  );
  assert(
    "gold 2026 base $900.000 × 8 meses exactos → 20 días × $30.000 = $600.000 (roundPeso)",
    gold.mesesComputables === 8 &&
      gold.diasIndemnizacion === 20 &&
      gold.valorDia === 30_000 &&
      gold.monto === 600_000 &&
      gold.factor === OBRA_FAENA_FACTOR_PLENO &&
      gold.vigenciaUnMes &&
      !gold.recortoTopeUf &&
      gold.base === 900_000 &&
      gold.motivo === "ok",
    JSON.stringify({
      meses: gold.mesesComputables,
      dias: gold.diasIndemnizacion,
      monto: gold.monto,
      factor: gold.factor,
    }),
  );
  const frac15 = calcularIndemnizacionObraFaena(
    { ingreso: "2026-01-01", termino: "2026-09-16", remuneracion: 900_000 },
    { uf: FALLBACK_UF },
  );
  assert(
    "8 meses y 15 días → 15 no suma; siguen 8 meses y $600.000",
    frac15.diasFraccion === 15 && frac15.mesesComputables === 8 && frac15.monto === 600_000,
    JSON.stringify({ dias: frac15.diasFraccion, meses: frac15.mesesComputables, monto: frac15.monto }),
  );
  const frac16 = calcularIndemnizacionObraFaena(
    { ingreso: "2026-01-01", termino: "2026-09-17", remuneracion: 900_000 },
    { uf: FALLBACK_UF },
  );
  assert(
    "8 meses y 16 días → 9 × 2,5 = 22,5 días → $675.000",
    frac16.mesesComputables === 9 &&
      frac16.diasIndemnizacion === 22.5 &&
      frac16.monto === 675_000,
    JSON.stringify({ meses: frac16.mesesComputables, dias: frac16.diasIndemnizacion, monto: frac16.monto }),
  );
  const corto = calcularIndemnizacionObraFaena(
    { ingreso: "2026-01-01", termino: "2026-01-20", remuneracion: 900_000 },
    { uf: FALLBACK_UF },
  );
  assert(
    "menos de un mes → $0",
    corto.mesesComputables === 0 && corto.monto === 0 && corto.motivo === "menos_un_mes",
    JSON.stringify({ meses: corto.mesesComputables, monto: corto.monto, motivo: corto.motivo }),
  );
  assert(
    "gradualidad dictamen 954/9: 1 / 1,5 / 2 / 2,5",
    factorIndemnizacionObraFaena("2020-03-01") === 1 &&
      factorIndemnizacionObraFaena("2020-07-01") === 1.5 &&
      factorIndemnizacionObraFaena("2021-07-01") === 2 &&
      factorIndemnizacionObraFaena("2022-01-01") === 2.5 &&
      factorIndemnizacionObraFaena("2018-12-31") === 0,
  );
  const ofApp = readFileSync(join(root, "js/app-obra-faena.js"), "utf8");
  assert(
    "app-obra-faena usa calcularIndemnizacionObraFaena (no reimplementa la fórmula)",
    /import\s*\{[^}]*calcularIndemnizacionObraFaena[^}]*\}\s*from\s*["']\.\/finiquito\.js["']/.test(ofApp) &&
      /calcularIndemnizacionObraFaena\s*\(/.test(ofApp) &&
      !/\balert\s*\(/.test(ofApp) &&
      !/\bconfirm\s*\(/.test(ofApp) &&
      !/\bprompt\s*\(/.test(ofApp) &&
      !/window\.open/.test(ofApp),
  );
  assert(
    "mesesObraFaena 8 meses exactos",
    mesesObraFaena("2026-01-01", "2026-09-01").mesesComputables === 8,
  );
}

console.log("\nPrescripción laboral art. 510 y art. 168 (gold 2026)");
{
  // Fuentes: art. 510 y 168 CT (BCN idNorma=207436); consulta DT w3-article-60622.
  // Días hábiles: lun–vie excl. FERIADOS_LEGALES_CL; art. 168 cuenta desde el día
  // siguiente a la separación (art. 48 Código Civil).
  const gGen = calcularPrescripcionLaboral({
    modo: PRESCRIPCION_GOLD.generales.modo,
    fechaAncla: PRESCRIPCION_GOLD.generales.fechaAncla,
    fechaHoy: "2026-03-01",
  });
  assert(
    "gold derechos generales 2024-03-15 → 2026-03-15",
    gGen.ok &&
      gGen.fechaLimite === "2026-03-15" &&
      gGen.estado === "por_vencer" &&
      gGen.norma.includes("510"),
    JSON.stringify(gGen),
  );
  const gPost = calcularPrescripcionLaboral({
    modo: PRESCRIPCION_GOLD.postTermino.modo,
    fechaAncla: PRESCRIPCION_GOLD.postTermino.fechaAncla,
    fechaHoy: "2026-04-01",
  });
  assert(
    "gold post-término 2026-01-15 → 2026-07-15",
    gPost.ok && gPost.fechaLimite === "2026-07-15" && gPost.estado === "vigente",
    JSON.stringify(gPost),
  );
  const gHe = calcularPrescripcionLaboral({
    modo: PRESCRIPCION_GOLD.horasExtras.modo,
    fechaAncla: PRESCRIPCION_GOLD.horasExtras.fechaAncla,
    fechaHoy: "2026-03-01",
  });
  assert(
    "gold HE 2025-09-30 → 2026-03-30",
    gHe.ok && gHe.fechaLimite === "2026-03-30" && gHe.hermana === "/horas-extras",
    JSON.stringify(gHe),
  );
  const gNul = calcularPrescripcionLaboral({
    modo: PRESCRIPCION_GOLD.nulidad162.modo,
    fechaAncla: PRESCRIPCION_GOLD.nulidad162.fechaAncla,
    fechaHoy: "2026-04-01",
  });
  assert(
    "gold nulidad 162 2026-01-10 → 2026-07-10",
    gNul.ok && gNul.fechaLimite === "2026-07-10" && gNul.hermana === "/nulidad-despido",
    JSON.stringify(gNul),
  );
  const g168 = calcularPrescripcionLaboral({
    modo: PRESCRIPCION_GOLD.art168.modo,
    fechaAncla: PRESCRIPCION_GOLD.art168.fechaAncla,
    fechaHoy: "2026-02-01",
  });
  assert(
    "gold art. 168 2026-01-02 → 2026-03-27 (60 hábiles lun–vie + feriados legales)",
    g168.ok &&
      g168.fechaLimite === "2026-03-27" &&
      g168.tipoPlazo === "habiles" &&
      g168.plazoValor === 60 &&
      g168.hermana === "/despido-injustificado",
    JSON.stringify(g168),
  );
  const gVen = calcularPrescripcionLaboral({
    modo: PRESCRIPCION_GOLD.vencido.modo,
    fechaAncla: PRESCRIPCION_GOLD.vencido.fechaAncla,
    fechaHoy: "2026-09-15",
  });
  assert(
    "gold vencido término 2025-01-01 → límite 2025-07-01 estado vencido",
    gVen.ok &&
      gVen.fechaLimite === "2025-07-01" &&
      gVen.estado === "vencido" &&
      gVen.diasRestantes < 0,
    JSON.stringify(gVen),
  );
  const rec = calcularPrescripcionLaboral({
    modo: "post_termino",
    fechaAncla: "2026-01-15",
    fechaReclamoDt: "2026-02-01",
    fechaHoy: "2026-03-01",
  });
  assert(
    "reclamo DT anota suspensión y tope 1 año; no mueve el límite de 6 meses",
    rec.suspensionReclamo &&
      rec.topeUnAnio === "2027-01-15" &&
      rec.fechaLimite === "2026-07-15",
    JSON.stringify(rec),
  );
  const plApp = readFileSync(join(root, "js/app-prescripcion-laboral.js"), "utf8");
  assert(
    "app-prescripcion-laboral usa calcularPrescripcionLaboral",
    /import\s*\{[^}]*calcularPrescripcionLaboral[^}]*\}\s*from\s*["']\.\/prescripcion-laboral\.js["']/.test(plApp) &&
      /calcularPrescripcionLaboral\s*\(/.test(plApp) &&
      !/\balert\s*\(/.test(plApp),
  );
}

console.log("\nDescanso compensatorio art. 38 (gold 2026)");
{
  // Fuentes: art. 35–38 CT (BCN idNorma=207436); ORD. 2938/227 y ORD. 712/20 DT.
  // 1 día por domingo trabajado + 1 por festivo trabajado − ya otorgados.
  // Valor día educativo = rem/30, roundPeso. No es recargo 30 % art. 38 N°7.
  const g = DESCANSO_COMPENSATORIO_GOLD;
  const gold = calcularDescansoCompensatorio({
    domingos: g.domingos,
    festivos: g.festivos,
    otorgados: g.otorgados,
    remuneracion: g.remuneracion,
  });
  assert(
    "gold 4 domingos + 1 festivo − 2 otorgados → 3 días; $900.000 / 30 × 3 = $90.000 (roundPeso)",
    gold.pendientes === 3 &&
      gold.generados === 5 &&
      gold.valorDia === 30_000 &&
      gold.estimacion === 90_000 &&
      gold.remuneracion === 900_000,
    JSON.stringify(gold),
  );
  const cero = calcularDescansoCompensatorio({
    domingos: 2,
    festivos: 0,
    otorgados: 5,
    remuneracion: 900_000,
  });
  assert(
    "más otorgados que generados → 0 pendientes y $0",
    cero.pendientes === 0 && cero.estimacion === 0 && cero.generados === 2,
    JSON.stringify(cero),
  );
  const sinRem = calcularDescansoCompensatorio({
    domingos: 4,
    festivos: 1,
    otorgados: 2,
    remuneracion: 0,
  });
  assert(
    "sin remuneración: 3 días y estimación 0",
    sinRem.pendientes === 3 && sinRem.valorDia === 0 && sinRem.estimacion === 0,
    JSON.stringify(sinRem),
  );
  const neg = calcularDescansoCompensatorio({
    domingos: -3,
    festivos: 1.9,
    otorgados: -1,
    remuneracion: 600_000,
  });
  assert(
    "negativos a 0; festivos 1,9 → 1; rem/30 × 1 = $20.000",
    neg.domingos === 0 &&
      neg.festivos === 1 &&
      neg.otorgados === 0 &&
      neg.pendientes === 1 &&
      neg.valorDia === 20_000 &&
      neg.estimacion === 20_000,
    JSON.stringify(neg),
  );
  const dcApp = readFileSync(join(root, "js/app-descanso-compensatorio.js"), "utf8");
  assert(
    "app-descanso-compensatorio usa calcularDescansoCompensatorio",
    /import\s*\{[^}]*calcularDescansoCompensatorio[^}]*\}\s*from\s*["']\.\/descanso-compensatorio\.js["']/.test(dcApp) &&
      /calcularDescansoCompensatorio\s*\(/.test(dcApp) &&
      !/\balert\s*\(/.test(dcApp) &&
      !/\bconfirm\s*\(/.test(dcApp),
  );
}

console.log("\nInclusión laboral Ley 21.015 (gold 2026)");
{
  // Fuentes: Ley 21.015 (BCN 1103997); arts. 157 bis y 157 ter CT (207436);
  // DS N°64 art. 6 c) entero inferior (BCN 1114287); ORD. 1513/42 DT;
  // donación piso 24 IMM / persona / año. IMM = constants.IMM (Ley 21.830).
  assert(
    "constantes inclusión: umbral 100, 1 %, 24 IMM",
    UMBRAL_INCLUSION_LABORAL === 100 &&
      CUOTA_INCLUSION_LABORAL === 0.01 &&
      DONACION_INCLUSION_IMM_ANUAL === 24 &&
      INCLUSION_LABORAL_GOLD.umbral.donacion === 24 * IMM,
  );
  const bajo = calcularInclusionLaboral(INCLUSION_LABORAL_GOLD.bajoUmbral);
  assert(
    "gold dotación 80 → no aplica; cuota 0; gap 0; donación 0",
    bajo.aplica === false &&
      bajo.cuota === 0 &&
      bajo.gap === 0 &&
      bajo.donacion === 0 &&
      bajo.dotacion === 80,
    JSON.stringify(bajo),
  );
  const umbral = calcularInclusionLaboral(INCLUSION_LABORAL_GOLD.umbral);
  assert(
    "gold 100 contratados 0 → cuota 1, gap 1, donación 24×IMM",
    umbral.aplica &&
      umbral.cuota === 1 &&
      umbral.gap === 1 &&
      umbral.donacion === 24 * IMM &&
      umbral.donacion === 13_285_272 &&
      umbral.imm === IMM,
    JSON.stringify(umbral),
  );
  const redondeo = calcularInclusionLaboral(INCLUSION_LABORAL_GOLD.redondeo);
  assert(
    "gold 250 contratados 2 → 2,5 al entero inferior = 2; gap 0; donación 0",
    redondeo.aplica &&
      redondeo.cuota === 2 &&
      redondeo.gap === 0 &&
      redondeo.donacion === 0,
    JSON.stringify(redondeo),
  );
  const cumple = calcularInclusionLaboral(INCLUSION_LABORAL_GOLD.cumple);
  assert(
    "gold 250 contratados 3 ≥ cuota 2 → gap 0, donación 0",
    cumple.aplica &&
      cumple.cuota === 2 &&
      cumple.gap === 0 &&
      cumple.donacion === 0,
    JSON.stringify(cumple),
  );
  const gapUno = calcularInclusionLaboral({ dotacion: 250, contratados: 1 });
  assert(
    "250 contratados 1 → cuota 2, gap 1, donación 24×IMM",
    gapUno.cuota === 2 && gapUno.gap === 1 && gapUno.donacion === 24 * IMM,
    JSON.stringify(gapUno),
  );
  const decimales = calcularInclusionLaboral({
    dotacion: 149.9,
    contratados: -2,
    imm: 0,
  });
  assert(
    "149,9 → 149; 1,49 al entero inferior = 1; contratados negativos → 0",
    decimales.dotacion === 149 &&
      decimales.contratados === 0 &&
      decimales.cuota === 1 &&
      decimales.gap === 1 &&
      decimales.imm === IMM,
    JSON.stringify(decimales),
  );
  const immCustom = calcularInclusionLaboral({
    dotacion: 100,
    contratados: 0,
    imm: 500_000,
  });
  assert(
    "IMM opcional 500.000 → donación 12.000.000",
    immCustom.donacion === 12_000_000 && immCustom.imm === 500_000,
    JSON.stringify(immCustom),
  );
  const ilApp = readFileSync(join(root, "js/app-inclusion-laboral.js"), "utf8");
  assert(
    "app-inclusion-laboral usa calcularInclusionLaboral",
    /import\s*\{[^}]*calcularInclusionLaboral[^}]*\}\s*from\s*["']\.\/inclusion-laboral\.js["']/.test(ilApp) &&
      /calcularInclusionLaboral\s*\(/.test(ilApp) &&
      !/\balert\s*\(/.test(ilApp) &&
      !/\bconfirm\s*\(/.test(ilApp),
  );
}

console.log("\nJornada parcial art. 40 bis (gold 2026)");
{
  // Fuentes: art. 40 bis y 67 CT (BCN 207436); Ley 21.561 (BCN 1191554).
  // Tope = (2/3)×ordinaria; sueldo = round(ref × parcial / ordinaria);
  // feriado días = 15 × parcial / ordinaria; % = 100 × parcial / ordinaria.
  // Comparación del tope con tolerancia 0,01 h.
  assert(
    "constantes jornada parcial: 2/3, 15 días, 0,01 h, 40 h ref, rango 30–45",
    JORNADA_PARCIAL_FRACCION_TOPE === 2 / 3 &&
      JORNADA_PARCIAL_FERIADO_BASE_DIAS === 15 &&
      JORNADA_PARCIAL_TOLERANCIA_H === 0.01 &&
      JORNADA_ORDINARIA_REF_H === 40 &&
      JORNADA_ORDINARIA_MIN_H === 30 &&
      JORNADA_ORDINARIA_MAX_H === 45,
  );
  const medio = calcularJornadaParcial(JORNADA_PARCIAL_GOLD.medioTiempo);
  const gMedio = JORNADA_PARCIAL_GOLD.medioTiempo;
  assert(
    "gold 40 h / 20 h / $900.000 → cumple, máx 26,67, $450.000, 50 %, 7,50 días",
    medio.cumpleTope === true &&
      medio.maxParcialHoras === gMedio.maxParcialHoras &&
      Number(medio.maxParcialHoras.toFixed(2)) === 26.67 &&
      medio.sueldoParcial === 450_000 &&
      medio.porcentajeJornada === 50 &&
      medio.diasFeriado === 7.5,
    JSON.stringify(medio),
  );
  const excede = calcularJornadaParcial(JORNADA_PARCIAL_GOLD.excede);
  assert(
    "gold 40 h / 30 h / $900.000 → no cumple tope; proporcional $675.000, 75 %, 11,25 días",
    excede.cumpleTope === false &&
      excede.horasParcialContrato === 30 &&
      excede.maxParcialHoras === (2 / 3) * 40 &&
      30 > 26.67 &&
      excede.sueldoParcial === 675_000 &&
      excede.porcentajeJornada === 75 &&
      excede.diasFeriado === 11.25,
    JSON.stringify(excede),
  );
  const o45 = calcularJornadaParcial(JORNADA_PARCIAL_GOLD.ordinaria45);
  assert(
    "gold 45 h / 30 h / $900.000 → cumple, máx 30, $600.000, 66,67 %, 10 días",
    o45.cumpleTope === true &&
      o45.maxParcialHoras === 30 &&
      o45.sueldoParcial === 600_000 &&
      Number(o45.porcentajeJornada.toFixed(2)) === 66.67 &&
      o45.diasFeriado === 10,
    JSON.stringify(o45),
  );
  const tope = calcularJornadaParcial(JORNADA_PARCIAL_GOLD.alTope);
  assert(
    "gold 40 h / 26,67 h / $800.000 → cumple ≈ tope; $533.400; ~66,675 %; ~10,00 días",
    tope.cumpleTope === true &&
      tope.horasParcialContrato === 26.67 &&
      tope.sueldoParcial === 533_400 &&
      tope.sueldoParcial === Math.round((800_000 * 26.67) / 40) &&
      Math.abs(tope.porcentajeJornada - 66.675) < 1e-10 &&
      Math.abs(tope.diasFeriado - (15 * 26.67) / 40) < 1e-10 &&
      tope.horasParcialContrato - tope.maxParcialHoras <= JORNADA_PARCIAL_TOLERANCIA_H,
    JSON.stringify(tope),
  );
  const cero = calcularJornadaParcial({
    jornadaOrdinariaSemanal: 0,
    horasParcialContrato: 20,
    sueldoOrdinarioReferencia: 900_000,
  });
  assert(
    "ordinaria 0 → máximo 0, sueldo 0, no cumple",
    cero.jornadaOrdinariaSemanal === 0 &&
      cero.maxParcialHoras === 0 &&
      cero.sueldoParcial === 0 &&
      cero.cumpleTope === false,
    JSON.stringify(cero),
  );
  const clamp = calcularJornadaParcial({
    jornadaOrdinariaSemanal: 50,
    horasParcialContrato: -3,
    sueldoOrdinarioReferencia: 900_000,
  });
  assert(
    "ordinaria 50 se acota a 45; horas negativas → 0",
    clamp.jornadaOrdinariaSemanal === 45 &&
      clamp.horasParcialContrato === 0 &&
      clamp.maxParcialHoras === 30 &&
      clamp.sueldoParcial === 0,
    JSON.stringify(clamp),
  );
  const jpApp = readFileSync(join(root, "js/app-jornada-parcial.js"), "utf8");
  assert(
    "app-jornada-parcial usa calcularJornadaParcial",
    /import\s*\{[^}]*calcularJornadaParcial[^}]*\}\s*from\s*["']\.\/jornada-parcial\.js["']/.test(jpApp) &&
      /calcularJornadaParcial\s*\(/.test(jpApp) &&
      !/\balert\s*\(/.test(jpApp) &&
      !/\bconfirm\s*\(/.test(jpApp) &&
      !/\bprompt\s*\(/.test(jpApp),
  );
}

console.log("\nTeletrabajo y derecho a desconexión Ley 21.220 (gold 2026)");
{
  // Fuentes: Ley 21.220 (BCN 1143741); arts. 152 quáter A y ss., 152 quáter J CT (207436);
  // DT consulta desconexión (w3-article-118665). 12 h continuas / 24 h; tolerancia 0,01 h.
  // valorDia = rem/30; estimación = valorDia × días. Modalidad informativa.
  assert(
    "constantes teletrabajo: 12 h, 24 h, tolerancia 0,01 h",
    TELETRABAJO_DESCONEXION_MIN_H === 12 &&
      TELETRABAJO_PERIODO_H === 24 &&
      TELETRABAJO_TOLERANCIA_H === 0.01 &&
      TELETRABAJO_GOLD.jornada0900.cumpleDesconexion === true &&
      TELETRABAJO_GOLD.jornada0800.cumpleDesconexion === false &&
      TELETRABAJO_GOLD.remDias.estimacionDiasModalidad === 300_000,
  );
  const g9 = calcularTeletrabajo(TELETRABAJO_GOLD.jornada0900);
  assert(
    "gold 09:00–18:00 → 9 h jornada, 15 h desconexión, cumple",
    g9.horasJornadaDiaria === 9 &&
      g9.horasDesconexion === 15 &&
      g9.cumpleDesconexion === true &&
      g9.fuenteJornada === "intervalo",
    JSON.stringify(g9),
  );
  const g8 = calcularTeletrabajo(TELETRABAJO_GOLD.jornada0800);
  assert(
    "gold 08:00–22:00 → 14 h jornada, 10 h desconexión, no cumple",
    g8.horasJornadaDiaria === 14 &&
      g8.horasDesconexion === 10 &&
      g8.cumpleDesconexion === false,
    JSON.stringify(g8),
  );
  const gRem = calcularTeletrabajo(TELETRABAJO_GOLD.remDias);
  assert(
    "gold rem $900.000 × 10 días → valorDia 30.000, estimación 300.000",
    gRem.valorDia === 30_000 &&
      gRem.estimacionDiasModalidad === 300_000 &&
      gRem.remuneracionMensual === 900_000 &&
      gRem.diasTeletrabajoMes === 10,
    JSON.stringify(gRem),
  );
  const porHoras = calcularTeletrabajo({ horasJornadaDiaria: 9 });
  assert(
    "horasJornadaDiaria 9 sin intervalo → 15 h desconexión, cumple",
    porHoras.fuenteJornada === "horas" &&
      porHoras.horasJornadaDiaria === 9 &&
      porHoras.horasDesconexion === 15 &&
      porHoras.cumpleDesconexion === true,
    JSON.stringify(porHoras),
  );
  const medianoche = calcularTeletrabajo({
    horaInicioJornada: "22:00",
    horaFinJornada: "06:00",
  });
  assert(
    "cruce de medianoche 22:00–06:00 → 8 h jornada, 16 h desconexión, cumple",
    medianoche.horasJornadaDiaria === 8 &&
      medianoche.horasDesconexion === 16 &&
      medianoche.cumpleDesconexion === true,
    JSON.stringify(medianoche),
  );
  const tope = calcularTeletrabajo({ horasJornadaDiaria: 12 });
  assert(
    "jornada 12 h → desconexión 12 h, cumple (igual al mínimo)",
    tope.horasDesconexion === 12 && tope.cumpleDesconexion === true,
    JSON.stringify(tope),
  );
  const bajo = calcularTeletrabajo({ horasJornadaDiaria: 12.02 });
  assert(
    "jornada 12,02 h → desconexión 11,98 h, no cumple (fuera de tolerancia 0,01)",
    Math.abs(bajo.horasDesconexion - 11.98) < 1e-10 && bajo.cumpleDesconexion === false,
    JSON.stringify(bajo),
  );
  const modalidad = calcularTeletrabajo({
    horaInicioJornada: "09:00",
    horaFinJornada: "18:00",
    modalidad: "hibrido",
  });
  assert(
    "modalidad híbrido es informativa: no cambia 15 h ni el cumplimiento",
    modalidad.modalidad === "hibrido" &&
      modalidad.horasDesconexion === 15 &&
      modalidad.cumpleDesconexion === true,
    JSON.stringify(modalidad),
  );
  const ttApp = readFileSync(join(root, "js/app-teletrabajo.js"), "utf8");
  assert(
    "app-teletrabajo usa calcularTeletrabajo",
    /import\s*\{[^}]*calcularTeletrabajo[^}]*\}\s*from\s*["']\.\/teletrabajo\.js["']/.test(ttApp) &&
      /calcularTeletrabajo\s*\(/.test(ttApp) &&
      !/\balert\s*\(/.test(ttApp) &&
      !/\bconfirm\s*\(/.test(ttApp) &&
      !/\bprompt\s*\(/.test(ttApp),
  );
}


console.log("\nBandas horarias de cuidado familiar Ley 21.561 (gold 2026)");
{
  // Fuentes: DT w3-article-125814; Ley 21.561 BCN 1191554; CT 207436; Mintrab /40horas/.
  // Nuevo horario = contractual ± minutos (0–60), misma duración. >60 → ok false.
  const g1 = calcularBandasHorarias(BANDAS_HORARIAS_GOLD.anticipar60);
  const gold1 = BANDAS_HORARIAS_GOLD.anticipar60;
  assert(
    "gold 09:00–18:00 anticipar 60 → 08:00–17:00",
    g1.ok === true &&
      g1.horaInicioNueva === "08:00" &&
      g1.horaFinNueva === "17:00" &&
      g1.horaInicioNueva === gold1.horaInicioNueva &&
      g1.horaFinNueva === gold1.horaFinNueva &&
      g1.duracionMinutos === 9 * 60 &&
      g1.sentido === "anticipar" &&
      g1.minutos === 60,
    JSON.stringify(g1),
  );
  const g2 = calcularBandasHorarias(BANDAS_HORARIAS_GOLD.retrasar60);
  assert(
    "gold 09:00–18:00 retrasar 60 → 10:00–19:00",
    g2.ok === true &&
      g2.horaInicioNueva === "10:00" &&
      g2.horaFinNueva === "19:00" &&
      g2.horaInicioNueva === BANDAS_HORARIAS_GOLD.retrasar60.horaInicioNueva &&
      g2.horaFinNueva === BANDAS_HORARIAS_GOLD.retrasar60.horaFinNueva &&
      g2.duracionMinutos === 9 * 60 &&
      g2.sentido === "retrasar" &&
      g2.duracionMinutos === g1.duracionMinutos,
    JSON.stringify(g2),
  );
  const g3 = calcularBandasHorarias(BANDAS_HORARIAS_GOLD.anticipar30);
  assert(
    "gold 08:30–17:30 anticipar 30 → 08:00–17:00",
    g3.ok === true &&
      g3.horaInicioNueva === "08:00" &&
      g3.horaFinNueva === "17:00" &&
      g3.horaInicioNueva === BANDAS_HORARIAS_GOLD.anticipar30.horaInicioNueva &&
      g3.minutos === 30 &&
      g3.duracionMinutos === 9 * 60,
    JSON.stringify(g3),
  );
  const g0 = calcularBandasHorarias(BANDAS_HORARIAS_GOLD.cero);
  assert(
    "gold desplazamiento 0 → horario = contractual 09:00–18:00",
    g0.ok === true &&
      g0.horaInicioNueva === "09:00" &&
      g0.horaFinNueva === "18:00" &&
      g0.horaInicioNueva === g0.horaInicio &&
      g0.horaFinNueva === g0.horaFin &&
      g0.minutos === 0 &&
      g0.duracionMinutos === 9 * 60,
    JSON.stringify(g0),
  );
  assert(
    "ventana 09:00–18:00 → entrada 08:00–10:00 y salida 17:00–19:00",
    g1.ventanaInicioMin === "08:00" &&
      g1.ventanaInicioMax === "10:00" &&
      g1.ventanaFinMin === "17:00" &&
      g1.ventanaFinMax === "19:00",
    JSON.stringify({
      i: g1.ventanaInicioMin,
      x: g1.ventanaInicioMax,
      f: g1.ventanaFinMin,
      y: g1.ventanaFinMax,
    }),
  );
  const tope = calcularBandasHorarias(BANDAS_HORARIAS_GOLD.excede);
  assert(
    "minutos 90 → ok false (supera el tope de 60)",
    tope.ok === false &&
      tope.motivo === "tope" &&
      tope.minutos === 90 &&
      tope.horaInicioNueva === "" &&
      tope.horaFinNueva === "",
    JSON.stringify(tope),
  );
  const noche = calcularBandasHorarias({
    horaInicio: "22:00",
    horaFin: "06:00",
    sentido: "anticipar",
    minutos: 60,
  });
  assert(
    "cruce de medianoche 22:00–06:00 anticipar 60 → 21:00–05:00",
    noche.ok === true &&
      noche.horaInicioNueva === "21:00" &&
      noche.horaFinNueva === "05:00" &&
      noche.duracionMinutos === 8 * 60 &&
      noche.cruzaMedianoche === true,
    JSON.stringify(noche),
  );
  const sinHora = calcularBandasHorarias({ sentido: "anticipar", minutos: 60 });
  assert(
    "sin horario → ok false",
    sinHora.ok === false && sinHora.motivo === "horario",
    JSON.stringify(sinHora),
  );
  const bhApp = readFileSync(join(root, "js/app-bandas-horarias.js"), "utf8");
  assert(
    "app-bandas-horarias usa calcularBandasHorarias",
    /import\s*\{[^}]*calcularBandasHorarias[^}]*\}\s*from\s*["']\.\/bandas-horarias\.js["']/.test(bhApp) &&
      /calcularBandasHorarias\s*\(/.test(bhApp) &&
      !/\balert\s*\(/.test(bhApp) &&
      !/\bconfirm\s*\(/.test(bhApp) &&
      !/\bprompt\s*\(/.test(bhApp),
  );
}

console.log("\nPacto 4×3 Ley 21.561 art. 8° transitorio / art. 28 (gold 2026)");
{
  // Fuentes: Ley 21.561 BCN 1191554; CT 207436; ORD. 81/2, 82/3, 101; Mintrab /40horas/.
  const g1 = calcularPacto4x3(PACTO_4X3_GOLD.clasico40);
  assert(
    "gold 40 h / 4 días, ya ≤40 → 10,00 h/día, 3 descanso, elegible ahora",
    g1.ok === true &&
      g1.horasDiarias === 10 &&
      g1.horasDiarias === PACTO_4X3_GOLD.clasico40.horasDiarias &&
      g1.diasDescanso === 3 &&
      g1.diasDescanso === PACTO_4X3_GOLD.clasico40.diasDescanso &&
      g1.elegibilidad === "ahora" &&
      g1.cabeEnTopeDiario === true &&
      g1.horasParaReparto === 40,
    JSON.stringify(g1),
  );
  const g2 = calcularPacto4x3(PACTO_4X3_GOLD.treintaSeis);
  assert(
    "gold 36 h / 4 días → 9,00 h/día, 3 descanso, elegible ahora",
    g2.ok === true &&
      g2.horasDiarias === 9 &&
      g2.horasDiarias === PACTO_4X3_GOLD.treintaSeis.horasDiarias &&
      g2.diasDescanso === 3 &&
      g2.elegibilidad === "ahora" &&
      g2.reduccionAnticipada === false,
    JSON.stringify(g2),
  );
  const g3 = calcularPacto4x3(PACTO_4X3_GOLD.cuarentaDosSinReduccion);
  assert(
    "gold 42 h sin reducción → no elegible, sin horas/día inventadas",
    g3.ok === false &&
      g3.elegibilidad === "desde_2028" &&
      g3.motivo === "supera_40" &&
      g3.horasDiarias === 0 &&
      g3.horasDiarias === PACTO_4X3_GOLD.cuarentaDosSinReduccion.horasDiarias &&
      g3.horasParaReparto === 0 &&
      g3.diasDescanso === 3,
    JSON.stringify(g3),
  );
  const g4 = calcularPacto4x3(PACTO_4X3_GOLD.topeDiario);
  assert(
    "gold 40 h / 3 días → 13,33 h/día, no aplica (tope 10 h)",
    g4.ok === false &&
      g4.motivo === "tope" &&
      g4.elegibilidad === "no_aplica" &&
      g4.horasDiarias === 40 / 3 &&
      g4.horasDiarias === PACTO_4X3_GOLD.topeDiario.horasDiarias &&
      g4.cabeEnTopeDiario === false &&
      g4.diasDescanso === 4,
    JSON.stringify(g4),
  );
  const g5 = calcularPacto4x3(PACTO_4X3_GOLD.reduccion42);
  assert(
    "gold 42 h con reducción anticipada → reparte 40 h, 10,00 h/día, ahora",
    g5.ok === true &&
      g5.horasParaReparto === 40 &&
      g5.horasDiarias === 10 &&
      g5.elegibilidad === "ahora" &&
      g5.diasDescanso === 3,
    JSON.stringify(g5),
  );
  const g6 = calcularPacto4x3(PACTO_4X3_GOLD.cincoDias42);
  assert(
    "gold 42 h / 5 días sin reducción → 8,40 h/día, 2 descanso, elegible ahora",
    g6.ok === true &&
      g6.horasDiarias === 42 / 5 &&
      g6.horasDiarias === PACTO_4X3_GOLD.cincoDias42.horasDiarias &&
      g6.diasDescanso === 2 &&
      g6.elegibilidad === "ahora" &&
      g6.horasParaReparto === 42 &&
      g6.motivo === "",
    JSON.stringify(g6),
  );
  const g7 = calcularPacto4x3(PACTO_4X3_GOLD.diasFraccion);
  assert(
    "gold 40 h / 4,5 días → no aplica (días no enteros; no redondea a 5)",
    g7.ok === false &&
      g7.motivo === "dias" &&
      g7.elegibilidad === "no_aplica" &&
      g7.horasDiarias === 0 &&
      g7.diasTrabajo === 4.5 &&
      g7.diasDescanso === 2.5 &&
      g7.diasTrabajo === PACTO_4X3_GOLD.diasFraccion.diasTrabajo,
    JSON.stringify(g7),
  );
  const p43App = readFileSync(join(root, "js/app-pacto-4x3.js"), "utf8");
  assert(
    "app-pacto-4x3 usa calcularPacto4x3",
    /import\s*\{[^}]*calcularPacto4x3[^}]*\}\s*from\s*["']\.\/pacto-4x3\.js["']/.test(p43App) &&
      /calcularPacto4x3\s*\(/.test(p43App) &&
      !/\balert\s*\(/.test(p43App) &&
      !/\bconfirm\s*\(/.test(p43App) &&
      !/\bprompt\s*\(/.test(p43App),
  );
}

console.log("\nJornada excepcional art. 38 / DS 48 PHSC (gold 2026)");
{
  // Fuentes: CT 207436 art. 38 inc. 7-9; Ley 21.561 BCN 1191554; DS 48 BCN 1202792
  // art. 6-7 y quinto transitorio; ORD. 601/26 w3-article-128281.
  const g1 = calcularJornadaExcepcional(JORNADA_EXCEPCIONAL_GOLD.sietePorSiete2026);
  assert(
    "gold 7×12 + 7 rest, horizonte 2026 → PHSC 42,00, dentro ordinario, extra 0",
    g1.ok === true &&
      g1.horasCiclo === 84 &&
      g1.horasCiclo === JORNADA_EXCEPCIONAL_GOLD.sietePorSiete2026.horasCiclo &&
      g1.diasCiclo === 14 &&
      g1.phsc === 42 &&
      g1.phsc === JORNADA_EXCEPCIONAL_GOLD.sietePorSiete2026.phsc &&
      g1.phscRedondeado === 42 &&
      g1.regimen === "dentro_ordinario" &&
      g1.dentroTopeOrdinario === true &&
      g1.calificaInciso8 === false &&
      g1.diasAdicionales === 0 &&
      g1.topeOrdinarioH === 42,
    JSON.stringify(g1),
  );
  const g2 = calcularJornadaExcepcional(JORNADA_EXCEPCIONAL_GOLD.sietePorSiete2028);
  assert(
    "gold 7×12 + 7 rest, horizonte 2028 → PHSC 42,00, inciso 8°, extra 9",
    g2.ok === true &&
      g2.phsc === 42 &&
      g2.phsc === JORNADA_EXCEPCIONAL_GOLD.sietePorSiete2028.phsc &&
      g2.regimen === "inciso_8" &&
      g2.calificaInciso8 === true &&
      g2.dentroTopeOrdinario === false &&
      g2.diasAdicionales === 9 &&
      g2.diasAdicionales === JORNADA_EXCEPCIONAL_GOLD.sietePorSiete2028.diasAdicionales &&
      g2.topeOrdinarioH === 40,
    JSON.stringify(g2),
  );
  const g3 = calcularJornadaExcepcional(JORNADA_EXCEPCIONAL_GOLD.phsc41_2028);
  assert(
    "gold 7×(82/7) + 7 rest, horizonte 2028 → PHSC 41,00, extra 4,5",
    g3.ok === true &&
      g3.horasCiclo === 82 &&
      g3.horasCiclo === JORNADA_EXCEPCIONAL_GOLD.phsc41_2028.horasCiclo &&
      g3.phsc === 41 &&
      g3.phsc === JORNADA_EXCEPCIONAL_GOLD.phsc41_2028.phsc &&
      g3.regimen === "inciso_8" &&
      g3.diasAdicionales === 4.5 &&
      g3.diasAdicionales === JORNADA_EXCEPCIONAL_GOLD.phsc41_2028.diasAdicionales &&
      g3.topeOrdinarioH === 40,
    JSON.stringify(g3),
  );
  const g4 = calcularJornadaExcepcional(JORNADA_EXCEPCIONAL_GOLD.cuatroPorDoce);
  assert(
    "gold 4×12 + 3 rest → PHSC 48,00, supera tope 42, no autorizable",
    g4.ok === false &&
      g4.motivo === "supera_tope" &&
      g4.regimen === "supera_tope" &&
      g4.horasCiclo === 48 &&
      g4.phsc === 48 &&
      g4.phsc === JORNADA_EXCEPCIONAL_GOLD.cuatroPorDoce.phsc &&
      g4.diasAdicionales === 0 &&
      g4.calificaInciso8 === false,
    JSON.stringify(g4),
  );
  const g5 = calcularJornadaExcepcional(JORNADA_EXCEPCIONAL_GOLD.cincoPor84);
  assert(
    "gold 5×8,4 + 2 rest, horizonte 2026 → PHSC 42,00, dentro ordinario",
    g5.ok === true &&
      g5.horasCiclo === 42 &&
      g5.phsc === 42 &&
      g5.phsc === JORNADA_EXCEPCIONAL_GOLD.cincoPor84.phsc &&
      g5.regimen === "dentro_ordinario" &&
      g5.diasAdicionales === 0 &&
      g5.topeOrdinarioH === 42,
    JSON.stringify(g5),
  );
  const g6a = calcularJornadaExcepcional(JORNADA_EXCEPCIONAL_GOLD.ceroTrabajo);
  const g6b = calcularJornadaExcepcional(JORNADA_EXCEPCIONAL_GOLD.horasCero);
  assert(
    "gold 0 días trabajo u horas ≤0 → validación, sin inventar PHSC",
    g6a.ok === false &&
      g6a.motivo === "datos" &&
      g6a.phsc === 0 &&
      g6a.phsc === JORNADA_EXCEPCIONAL_GOLD.ceroTrabajo.phsc &&
      g6b.ok === false &&
      g6b.motivo === "datos" &&
      g6b.phsc === 0,
    JSON.stringify({ g6a, g6b }),
  );
  const g7a = calcularJornadaExcepcional(JORNADA_EXCEPCIONAL_GOLD.descansoNegativo);
  const g7b = calcularJornadaExcepcional(JORNADA_EXCEPCIONAL_GOLD.cicloInconsistente);
  assert(
    "gold descanso <0 o ciclo inconsistente → validación clara",
    g7a.ok === false &&
      g7a.motivo === "descanso" &&
      g7a.phsc === 0 &&
      g7b.ok === false &&
      g7b.motivo === "ciclo" &&
      g7b.phsc === 0 &&
      g7b.motivo === JORNADA_EXCEPCIONAL_GOLD.cicloInconsistente.motivo,
    JSON.stringify({ g7a, g7b }),
  );
  const jeApp = readFileSync(join(root, "js/app-jornada-excepcional.js"), "utf8");
  assert(
    "app-jornada-excepcional usa calcularJornadaExcepcional",
    /import\s*\{[^}]*calcularJornadaExcepcional[^}]*\}\s*from\s*["']\.\/jornada-excepcional\.js["']/.test(jeApp) &&
      /calcularJornadaExcepcional\s*\(/.test(jeApp) &&
      !/\balert\s*\(/.test(jeApp) &&
      !/\bconfirm\s*\(/.test(jeApp) &&
      !/\bprompt\s*\(/.test(jeApp),
  );
}

console.log("\nJornada bisemanal art. 39 CT (gold 2026/2028)");
{
  // Fuentes: CT 207436 art. 39 (hasta dos semanas ininterrumpidas; descansos
  // compensatorios aumentados en uno); Ley 21.561 BCN 1191554 (tope 42/40 h).
  const g1 = calcularJornadaBisemanal(JORNADA_BISEMANAL_GOLD.diezPorCuatro2028);
  assert(
    "gold 10 trabajo + 4 descanso, 80 h, horizonte 2028 → ciclo 14, promedio 40,00 exacto, cumple art. 39, dentro ordinario",
    g1.ok === true &&
      g1.diasCiclo === 14 &&
      g1.diasCiclo === JORNADA_BISEMANAL_GOLD.diezPorCuatro2028.diasCiclo &&
      g1.promedioSemanal === 40 &&
      g1.promedioSemanal === JORNADA_BISEMANAL_GOLD.diezPorCuatro2028.promedioSemanal &&
      g1.promedioSemanalRedondeado === 40 &&
      g1.topeOrdinarioH === 40 &&
      g1.cumpleArt39 === true &&
      g1.cumpleDiasTrabajo === true &&
      g1.cumpleDescanso === true &&
      g1.dentroTopeOrdinario === true &&
      g1.regimen === "dentro_ordinario" &&
      g1.horasDiariasPromedio === 8,
    JSON.stringify(g1),
  );
  const g2 = calcularJornadaBisemanal(JORNADA_BISEMANAL_GOLD.docePorTres2028);
  assert(
    "gold borde art. 39: 12 + 3, 84 h → ciclo 15, promedio 39,20, cumple",
    g2.ok === true &&
      g2.diasCiclo === 15 &&
      g2.promedioSemanal === 39.2 &&
      g2.promedioSemanal === JORNADA_BISEMANAL_GOLD.docePorTres2028.promedioSemanal &&
      g2.promedioSemanalRedondeado === 39.2 &&
      g2.cumpleArt39 === true &&
      g2.regimen === "dentro_ordinario" &&
      g2.topeOrdinarioH === 40,
    JSON.stringify(g2),
  );
  const g2b = calcularJornadaBisemanal(JORNADA_BISEMANAL_GOLD.superaTope2028);
  const g2c = calcularJornadaBisemanal({ ...JORNADA_BISEMANAL_GOLD.superaTope2028, horizonte: "2026" });
  assert(
    "gold 12 + 3, 90 h → promedio 42,00: supera tope 40 (2028) pero cabe en 42 (2026); art. 39 sí",
    g2b.ok === false &&
      g2b.motivo === "supera_tope" &&
      g2b.regimen === "supera_tope" &&
      g2b.promedioSemanal === 42 &&
      g2b.cumpleArt39 === true &&
      g2b.dentroTopeOrdinario === false &&
      g2b.topeOrdinarioH === 40 &&
      g2c.ok === true &&
      g2c.regimen === "dentro_ordinario" &&
      g2c.topeOrdinarioH === 42,
    JSON.stringify({ g2b, g2c }),
  );
  const g3 = calcularJornadaBisemanal(JORNADA_BISEMANAL_GOLD.descansoDos);
  assert(
    "gold descanso 2 < 3 → cumpleArt39 false, invalido_art39, promedio igual visible (46,67)",
    g3.ok === false &&
      g3.cumpleArt39 === false &&
      g3.cumpleDiasTrabajo === true &&
      g3.cumpleDescanso === false &&
      g3.regimen === "invalido_art39" &&
      g3.motivo === "art39_descanso" &&
      g3.diasCiclo === 12 &&
      g3.promedioSemanalRedondeado === 46.67,
    JSON.stringify(g3),
  );
  const g4 = calcularJornadaBisemanal(JORNADA_BISEMANAL_GOLD.treceDias);
  assert(
    "gold 13 días > 12 → cumpleArt39 false, invalido_art39, promedio 35,00",
    g4.ok === false &&
      g4.cumpleArt39 === false &&
      g4.cumpleDiasTrabajo === false &&
      g4.cumpleDescanso === true &&
      g4.regimen === "invalido_art39" &&
      g4.motivo === "art39_dias" &&
      g4.diasCiclo === 16 &&
      g4.promedioSemanal === 35,
    JSON.stringify(g4),
  );
  const g5a = calcularJornadaBisemanal(JORNADA_BISEMANAL_GOLD.ceroTrabajo);
  const g5b = calcularJornadaBisemanal(JORNADA_BISEMANAL_GOLD.horasCero);
  const g5c = calcularJornadaBisemanal(JORNADA_BISEMANAL_GOLD.descansoNegativo);
  const g5d = calcularJornadaBisemanal({ diasTrabajo: "x", diasDescanso: NaN, horasCiclo: -5 });
  const g5e = calcularJornadaBisemanal({ diasTrabajo: 10.5, diasDescanso: 4, horasCiclo: 80 });
  const sinNaN = (r) => Object.values(r).every((v) => typeof v !== "number" || Number.isFinite(v));
  assert(
    "gold ceros / negativos / no finitos / fracciones → salida segura en 0 sin NaN",
    g5a.ok === false &&
      g5a.motivo === "datos" &&
      g5a.promedioSemanal === 0 &&
      g5a.regimen === "error" &&
      g5b.ok === false &&
      g5b.motivo === "datos" &&
      g5b.promedioSemanal === 0 &&
      g5c.ok === false &&
      g5c.motivo === "descanso" &&
      g5c.promedioSemanal === 0 &&
      g5d.ok === false &&
      g5d.motivo === "datos" &&
      g5d.promedioSemanal === 0 &&
      g5d.diasCiclo === 0 &&
      g5e.ok === false &&
      g5e.motivo === "dias" &&
      [g5a, g5b, g5c, g5d, g5e].every(sinNaN),
    JSON.stringify({ g5a, g5b, g5c, g5d, g5e }),
  );
  const gSitio = calcularJornadaBisemanal({ diasTrabajo: 10, diasDescanso: 4, horasCiclo: 84 });
  assert(
    "horizonte sitio reutiliza topeJornadaOrdinaria (42 h en 2026) y 84 h en 14 días → 42,00 dentro",
    gSitio.horizonte === "sitio" &&
      gSitio.topeOrdinarioH === topeJornadaOrdinaria() &&
      gSitio.promedioSemanal === 42 &&
      (topeJornadaOrdinaria() === 42 ? gSitio.regimen === "dentro_ordinario" : gSitio.regimen === "supera_tope"),
    JSON.stringify(gSitio),
  );
  const jbApp = readFileSync(join(root, "js/app-jornada-bisemanal.js"), "utf8");
  assert(
    "app-jornada-bisemanal usa calcularJornadaBisemanal",
    /import\s*\{[^}]*calcularJornadaBisemanal[^}]*\}\s*from\s*["']\.\/jornada-bisemanal\.js["']/.test(jbApp) &&
      /calcularJornadaBisemanal\s*\(/.test(jbApp) &&
      !/\balert\s*\(/.test(jbApp) &&
      !/\bconfirm\s*\(/.test(jbApp) &&
      !/\bprompt\s*\(/.test(jbApp),
  );
  const jbLib = readFileSync(join(root, "js/jornada-bisemanal.js"), "utf8");
  assert(
    "jornada-bisemanal.js reutiliza topeOrdinarioHorizonte y constantes art. 39 (no inventa topes)",
    /import\s*\{[^}]*topeOrdinarioHorizonte[^}]*\}\s*from\s*["']\.\/jornada-excepcional\.js["']/.test(jbLib) &&
      /JORNADA_BISEMANAL_MAX_DIAS_TRABAJO/.test(jbLib) &&
      /JORNADA_BISEMANAL_MIN_DIAS_DESCANSO/.test(jbLib) &&
      !/\b12\b/.test(jbLib.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")) &&
      /\* 7\) \/ diasCiclo/.test(jbLib),
  );
}

console.log("\nCompensación HE por feriado art. 32 inc. 4° / Ley 21.561 (gold 2026)");
{
  // Fuentes: Ley 21.561 BCN 1191554; CT 207436 art. 32 inc. 4°;
  // ORD. 81/2, 199/5, 108, 387/11.
  const g1 = calcularCompensacionHorasExtras(COMPENSACION_HE_GOLD.clasico16);
  assert(
    "gold 16 HE × 1,5 = 24 h / 8 h → 3,00 días, dentro del tope 5",
    g1.ok === true &&
      g1.horasFeriado === 24 &&
      g1.horasFeriado === COMPENSACION_HE_GOLD.clasico16.horasFeriado &&
      g1.diasEquivalentes === 3 &&
      g1.diasEquivalentes === COMPENSACION_HE_GOLD.clasico16.diasEquivalentes &&
      g1.diasCompletos === 3 &&
      g1.horasRestantes === 0 &&
      g1.diasDentroTope === 3 &&
      g1.diasFueraTope === 0 &&
      g1.recargo === 1.5 &&
      g1.topeDias === 5,
    JSON.stringify(g1),
  );
  const g2 = calcularCompensacionHorasExtras(COMPENSACION_HE_GOLD.topeAnual);
  assert(
    "gold 32 HE / 8 h → 6,00 días: 5 dentro del tope, 1 a pagar",
    g2.ok === true &&
      g2.horasFeriado === 48 &&
      g2.diasEquivalentes === 6 &&
      g2.diasCompletos === 6 &&
      g2.diasDentroTope === 5 &&
      g2.diasFueraTope === 1 &&
      g2.diasFueraTope === COMPENSACION_HE_GOLD.topeAnual.diasFueraTope,
    JSON.stringify(g2),
  );
  const g3 = calcularCompensacionHorasExtras(COMPENSACION_HE_GOLD.fraccion);
  assert(
    "gold 8 HE / 8 h → 1,50 días: 1 completo y 4 h restantes (no medio día)",
    g3.ok === true &&
      g3.horasFeriado === 12 &&
      g3.diasEquivalentes === 1.5 &&
      g3.diasCompletos === 1 &&
      g3.horasRestantes === 4 &&
      g3.diasDentroTope === 1 &&
      g3.diasFueraTope === 0,
    JSON.stringify(g3),
  );
  const g4 = calcularCompensacionHorasExtras(COMPENSACION_HE_GOLD.jornada84);
  assert(
    "gold 16 HE / 8,4 h (42/5) → 2 días completos y horas restantes",
    g4.ok === true &&
      g4.horasFeriado === 24 &&
      g4.horasJornadaDiaria === 42 / 5 &&
      g4.diasEquivalentes === 24 / (42 / 5) &&
      g4.diasCompletos === 2 &&
      Math.abs(g4.horasRestantes - (24 - 16.8)) < 1e-9 &&
      g4.diasDentroTope === 2 &&
      g4.diasFueraTope === 0,
    JSON.stringify(g4),
  );
  const g5 = calcularCompensacionHorasExtras(COMPENSACION_HE_GOLD.sueldo800);
  assert(
    "gold 16 HE, $800.000, jornada 40 (8×5) → 1 HE $7.000, total $112.000",
    g5.ok === true &&
      g5.jornadaSemanal === 40 &&
      g5.valorHoraExtra === 7_000 &&
      g5.equivalenciaPago === 112_000 &&
      g5.equivalenciaPago === COMPENSACION_HE_GOLD.sueldo800.equivalenciaPago,
    JSON.stringify(g5),
  );
  const g6 = calcularCompensacionHorasExtras(COMPENSACION_HE_GOLD.cero);
  assert(
    "gold 0 HE → validación, sin inventar días",
    g6.ok === false &&
      g6.motivo === "horas" &&
      g6.diasEquivalentes === 0 &&
      g6.horasFeriado === 0,
    JSON.stringify(g6),
  );
  const cheApp = readFileSync(join(root, "js/app-compensacion-horas-extras.js"), "utf8");
  assert(
    "app-compensacion-horas-extras usa calcularCompensacionHorasExtras",
    /import\s*\{[^}]*calcularCompensacionHorasExtras[^}]*\}\s*from\s*["']\.\/compensacion-horas-extras\.js["']/.test(cheApp) &&
      /calcularCompensacionHorasExtras\s*\(/.test(cheApp) &&
      !/\balert\s*\(/.test(cheApp) &&
      !/\bconfirm\s*\(/.test(cheApp) &&
      !/\bprompt\s*\(/.test(cheApp),
  );
}

console.log("\nContrato a plazo fijo art. 159 N°4 (gold 2026)");
{
  // Fuentes: art. 159 N°4 CT (BCN 207436); DT ORD. 65/1 (w3-article-102862);
  // DT consulta renovación (w3-article-60792). Tope 12/24 meses; 1 día de tolerancia.
  assert(
    "constantes contrato plazo fijo: tope 12/24, tolerancia 1 día",
    CONTRATO_PLAZO_FIJO_TOPE_GENERAL_MESES === 12 &&
      CONTRATO_PLAZO_FIJO_TOPE_TITULO_MESES === 24 &&
      CONTRATO_PLAZO_FIJO_TOLERANCIA_DIAS === 1 &&
      CONTRATO_PLAZO_FIJO_GOLD.doceMeses.cumpleTope === true &&
      CONTRATO_PLAZO_FIJO_GOLD.dieciochoSinTitulo.cumpleTope === false &&
      CONTRATO_PLAZO_FIJO_GOLD.dieciochoConTitulo.cumpleTope === true &&
      CONTRATO_PLAZO_FIJO_GOLD.continuidad.seTransformaEnIndefinido === true,
  );
  const g12 = calcularContratoPlazoFijo(
    (({ fechaTermino, ...rest }) => rest)(CONTRATO_PLAZO_FIJO_GOLD.doceMeses),
  );
  assert(
    "gold 2026-01-01 + 12 meses sin título → tope 12, término 2027-01-01, cumple, no indefinido",
    g12.ok &&
      g12.topeLegalMeses === 12 &&
      g12.fechaTermino === "2027-01-01" &&
      g12.duracionMeses === 12 &&
      g12.duracionDias === 365 &&
      g12.cumpleTope === true &&
      g12.seTransformaEnIndefinido === false &&
      g12.motivoIndefinido === "ninguno" &&
      g12.fuentePlazo === "plazoMeses" &&
      g12.diasRestantes === 365,
    JSON.stringify(g12),
  );
  const g18 = calcularContratoPlazoFijo(
    (({ fechaTermino, ...rest }) => rest)(CONTRATO_PLAZO_FIJO_GOLD.dieciochoSinTitulo),
  );
  assert(
    "gold 2026-01-01 + 18 meses sin título → tope 12, término 2027-07-01, no cumple",
    g18.ok &&
      g18.topeLegalMeses === 12 &&
      g18.fechaTermino === "2027-07-01" &&
      g18.duracionMeses === 18 &&
      g18.cumpleTope === false &&
      g18.seTransformaEnIndefinido === false,
    JSON.stringify(g18),
  );
  const gTit = calcularContratoPlazoFijo(
    (({ fechaTermino, ...rest }) => rest)(CONTRATO_PLAZO_FIJO_GOLD.dieciochoConTitulo),
  );
  assert(
    "gold 2026-01-01 + 18 meses con título → tope 24, cumple",
    gTit.ok &&
      gTit.topeLegalMeses === 24 &&
      gTit.fechaTermino === "2027-07-01" &&
      gTit.cumpleTope === true &&
      gTit.seTransformaEnIndefinido === false &&
      gTit.motivoIndefinido === "ninguno",
    JSON.stringify(gTit),
  );
  const gRen = calcularContratoPlazoFijo(
    (({ fechaTermino, ...rest }) => rest)(CONTRATO_PLAZO_FIJO_GOLD.renovacionVencida),
  );
  assert(
    "gold renovación ya vencida → seTransformaEnIndefinido renovacion_agotada",
    gRen.ok &&
      gRen.seTransformaEnIndefinido === true &&
      gRen.motivoIndefinido === "renovacion_agotada" &&
      gRen.vencido === true &&
      gRen.diasRestantes === 0 &&
      gRen.fechaTermino === "2026-01-01",
    JSON.stringify(gRen),
  );
  const gCont = calcularContratoPlazoFijo(
    (({ fechaTermino, ...rest }) => rest)(CONTRATO_PLAZO_FIJO_GOLD.continuidad),
  );
  assert(
    "gold 18 meses con título + renovación + continuidad → indefinido combinado",
    gCont.ok &&
      gCont.cumpleTope === true &&
      gCont.seTransformaEnIndefinido === true &&
      gCont.motivoIndefinido === "renovacion_agotada_y_continuidad" &&
      gCont.topeLegalMeses === 24,
    JSON.stringify(gCont),
  );
  const soloCont = calcularContratoPlazoFijo({
    fechaInicio: "2026-01-01",
    plazoMeses: 12,
    continuaTrasVencimiento: true,
    fechaReferencia: "2026-01-01",
  });
  assert(
    "continuidad sola (sin renovación) → continuidad_tras_vencimiento",
    soloCont.seTransformaEnIndefinido === true &&
      soloCont.motivoIndefinido === "continuidad_tras_vencimiento" &&
      soloCont.cumpleTope === true,
    JSON.stringify(soloCont),
  );
  const expl = calcularContratoPlazoFijo({
    fechaInicio: "2026-01-01",
    plazoMeses: 12,
    fechaTermino: "2027-07-01",
    fechaReferencia: "2026-01-01",
  });
  assert(
    "fechaTermino explícita tiene precedencia sobre plazoMeses (18 meses > 12)",
    expl.fuentePlazo === "fechaTermino" &&
      expl.fechaTermino === "2027-07-01" &&
      expl.duracionMeses === 18 &&
      expl.cumpleTope === false,
    JSON.stringify(expl),
  );
  const ger = calcularContratoPlazoFijo({
    fechaInicio: "2026-01-01",
    plazoMeses: 18,
    esGerente: true,
    fechaReferencia: "2026-01-01",
  });
  assert(
    "esGerente activa tope 24 igual que el título",
    ger.topeLegalMeses === 24 && ger.cumpleTope === true,
    JSON.stringify(ger),
  );
  const vacio = calcularContratoPlazoFijo({ plazoMeses: 12 });
  assert(
    "sin fechaInicio → ok false",
    vacio.ok === false && vacio.motivo === "fecha_inicio",
    JSON.stringify(vacio),
  );
  const pfApp = readFileSync(join(root, "js/app-contrato-plazo-fijo.js"), "utf8");
  assert(
    "app-contrato-plazo-fijo usa calcularContratoPlazoFijo",
    /import\s*\{[^}]*calcularContratoPlazoFijo[^}]*\}\s*from\s*["']\.\/contrato-plazo-fijo\.js["']/.test(pfApp) &&
      /calcularContratoPlazoFijo\s*\(/.test(pfApp) &&
      !/\balert\s*\(/.test(pfApp) &&
      !/\bconfirm\s*\(/.test(pfApp) &&
      !/\bprompt\s*\(/.test(pfApp),
  );
}

console.log("\nTérmino anticipado plazo fijo art. 159 N°4 remanente (gold 2026)");
{
  // Fórmula: meses_remanentes = calendarMonthsBetween(anticipado, pactada)
  //   = Δaños×12 + Δmeses + (Δdías / último_día_mes_pactado)
  //   remuneración_remanente = round(meses_remanentes × sueldo_mensual)
  // Gold: 2026-04-01 → 2026-07-01 = 3,00 meses × $800.000 = $2.400.000
  // (91 días; no se usa días/30, que daría $2.426.667).
  const gold = TERMINO_ANTICIPADO_PLAZO_FIJO_GOLD.tresMeses800;
  const g1 = calcularTerminoAnticipadoPlazoFijo(gold);
  assert(
    "gold $800.000, 1-abr-2026 → 1-jul-2026 → 3,00 meses y $2.400.000",
    g1.ok === true &&
      g1.sueldoMensual === 800_000 &&
      g1.fechaTerminoAnticipado === "2026-04-01" &&
      g1.fechaTerminoPactada === "2026-07-01" &&
      g1.mesesRemanentes === 3 &&
      g1.mesesRemanentes === gold.mesesRemanentes &&
      g1.diasRemanentes === 91 &&
      g1.diasRemanentes === gold.diasRemanentes &&
      g1.remuneracionRemanente === 2_400_000 &&
      g1.remuneracionRemanente === gold.remuneracionRemanente &&
      g1.remuneracionRemanente === Math.round(3 * 800_000) &&
      g1.fuentePlazo === "fechaTerminoPactada",
    JSON.stringify(g1),
  );
  const gMeses = calcularTerminoAnticipadoPlazoFijo({
    sueldoMensual: gold.sueldoMensual,
    fechaTerminoAnticipado: gold.fechaTerminoAnticipado,
    mesesRemanentes: 3,
  });
  assert(
    "gold por meses remanentes (sin fecha pactada) → mismo $2.400.000",
    gMeses.ok === true &&
      gMeses.fuentePlazo === "mesesRemanentes" &&
      gMeses.fechaTerminoPactada === "2026-07-01" &&
      gMeses.mesesRemanentes === 3 &&
      gMeses.remuneracionRemanente === 2_400_000 &&
      gMeses.remuneracionRemanente ===
        TERMINO_ANTICIPADO_PLAZO_FIJO_GOLD.mesesSolo.remuneracionRemanente,
    JSON.stringify(gMeses),
  );
  const precedencia = calcularTerminoAnticipadoPlazoFijo({
    sueldoMensual: 800_000,
    fechaTerminoAnticipado: "2026-04-01",
    fechaTerminoPactada: "2026-07-01",
    mesesRemanentes: 1,
  });
  assert(
    "fecha pactada tiene precedencia sobre meses remanentes",
    precedencia.fuentePlazo === "fechaTerminoPactada" &&
      precedencia.mesesRemanentes === 3 &&
      precedencia.remuneracionRemanente === 2_400_000,
    JSON.stringify(precedencia),
  );
  const mismo = calcularTerminoAnticipadoPlazoFijo(
    TERMINO_ANTICIPADO_PLAZO_FIJO_GOLD.mismoDia,
  );
  assert(
    "mismas fechas → 0 meses y $0 remanente",
    mismo.ok === true &&
      mismo.mesesRemanentes === 0 &&
      mismo.diasRemanentes === 0 &&
      mismo.remuneracionRemanente === 0,
    JSON.stringify(mismo),
  );
  const invertido = calcularTerminoAnticipadoPlazoFijo({
    sueldoMensual: 800_000,
    fechaTerminoAnticipado: "2026-07-01",
    fechaTerminoPactada: "2026-04-01",
  });
  assert(
    "pactada anterior al anticipado → ok false",
    invertido.ok === false && invertido.motivo === "fecha_termino",
    JSON.stringify(invertido),
  );
  const sinSueldo = calcularTerminoAnticipadoPlazoFijo({
    fechaTerminoAnticipado: "2026-04-01",
    fechaTerminoPactada: "2026-07-01",
  });
  assert(
    "sin sueldo → ok false",
    sinSueldo.ok === false && sinSueldo.motivo === "sueldo",
    JSON.stringify(sinSueldo),
  );
  const tapApp = readFileSync(join(root, "js/app-termino-anticipado-plazo-fijo.js"), "utf8");
  assert(
    "app-termino-anticipado-plazo-fijo usa calcularTerminoAnticipadoPlazoFijo",
    /import\s*\{[^}]*calcularTerminoAnticipadoPlazoFijo[^}]*\}\s*from\s*["']\.\/termino-anticipado-plazo-fijo\.js["']/.test(tapApp) &&
      /calcularTerminoAnticipadoPlazoFijo\s*\(/.test(tapApp) &&
      !/\balert\s*\(/.test(tapApp) &&
      !/\bconfirm\s*\(/.test(tapApp) &&
      !/\bprompt\s*\(/.test(tapApp),
  );
}

console.log("\nPermiso sin goce de sueldo (gold 2026)");
{
  // Fuentes: CT BCN 207436; DT ORD. N°4593; consulta DT 60216 y 60602.
  // descuento = round((sueldoMensual / diasBase) × diasPermiso).
  const g1 = calcularPermisoSinGoce(PERMISO_SIN_GOCE_GOLD.corridos30);
  const gold1 = PERMISO_SIN_GOCE_GOLD.corridos30;
  assert(
    "gold $900.000 / 30 corridos × 3 → descuento $90.000, sueldo mes $810.000",
    g1.ok === true &&
      g1.descuento === 90_000 &&
      g1.sueldoMes === 810_000 &&
      g1.descuento === gold1.descuento &&
      g1.sueldoMes === gold1.sueldoMes &&
      g1.descuento === Math.round((900_000 / 30) * 3) &&
      g1.tipoBase === "corridos",
    JSON.stringify(g1),
  );
  const g2 = calcularPermisoSinGoce(PERMISO_SIN_GOCE_GOLD.laborables20);
  assert(
    "gold $900.000 / 20 laborables × 2 → descuento $90.000",
    g2.ok === true &&
      g2.descuento === 90_000 &&
      g2.sueldoMes === 810_000 &&
      g2.descuento === PERMISO_SIN_GOCE_GOLD.laborables20.descuento &&
      g2.tipoBase === "laborables" &&
      g2.diasBase === 20 &&
      g2.diasPermiso === 2,
    JSON.stringify(g2),
  );
  const g3 = calcularPermisoSinGoce(PERMISO_SIN_GOCE_GOLD.ceroDias);
  assert(
    "gold 0 días permiso → descuento 0, sueldo = sueldoMensual",
    g3.ok === true &&
      g3.descuento === 0 &&
      g3.sueldoMes === 900_000 &&
      g3.sueldoMes === g3.sueldoMensual &&
      g3.diasPermisoAplicados === 0,
    JSON.stringify(g3),
  );
  assert(
    "abril 2026 tiene 30 días corridos; febrero 2026 tiene 28",
    diasCorridosDelMes(2026, 4) === 30 && diasCorridosDelMes(2026, 2) === 28,
  );
  const autoMes = calcularPermisoSinGoce({
    sueldoMensual: 900_000,
    diasPermiso: 3,
    tipoBase: "corridos",
    mesIso: "2026-04",
  });
  assert(
    "sin diasBase, abril 2026 corridos → misma ficha $90.000",
    autoMes.ok === true &&
      autoMes.diasBase === 30 &&
      autoMes.descuento === 90_000 &&
      autoMes.sueldoMes === 810_000,
    JSON.stringify(autoMes),
  );
  const tope = calcularPermisoSinGoce({
    sueldoMensual: 900_000,
    diasBase: 30,
    diasPermiso: 40,
    tipoBase: "corridos",
  });
  assert(
    "días de permiso > base → descuento acotado al sueldo mensual",
    tope.ok === true &&
      tope.topeAplicado === true &&
      tope.diasPermisoAplicados === 30 &&
      tope.descuento === 900_000 &&
      tope.sueldoMes === 0,
    JSON.stringify(tope),
  );
  const sinBase = calcularPermisoSinGoce({
    sueldoMensual: 900_000,
    diasPermiso: 3,
    tipoBase: "laborables",
  });
  assert(
    "laborables sin diasBase → ok false",
    sinBase.ok === false && sinBase.motivo === "dias_base",
    JSON.stringify(sinBase),
  );
  const psgApp = readFileSync(join(root, "js/app-permiso-sin-goce.js"), "utf8");
  assert(
    "app-permiso-sin-goce usa calcularPermisoSinGoce",
    /import\s*\{[^}]*calcularPermisoSinGoce[^}]*\}\s*from\s*["']\.\/permiso-sin-goce\.js["']/.test(psgApp) &&
      /calcularPermisoSinGoce\s*\(/.test(psgApp) &&
      !/\balert\s*\(/.test(psgApp) &&
      !/\bconfirm\s*\(/.test(psgApp) &&
      !/\bprompt\s*\(/.test(psgApp),
  );
}

console.log("\nRebaja IUSC zona extrema (gold 2026)");
{
  // Fuentes: art. 13 D.L. 889; Circular SII 10/1976; Ley 19.354; D.L. 249 art. 7°;
  // Circular SII N° 32/2026 (grado 1-A $745.136, septiembre 2026).
  const g = calcularZonaExtrema(ZONA_EXTREMA_GOLD.iquique2000);
  const gold = ZONA_EXTREMA_GOLD.iquique2000;
  assert(
    "gold Iquique $2.000.000 × 56 % / grado 1-A $745.136",
    g.ok === true &&
      g.rentaAfecta === 2_000_000 &&
      g.pctIncrementado === 56 &&
      g.grado1A === GRADO_1A_EUS_ZONA_EXTREMA &&
      g.grado1A === 745_136 &&
      g.rebajaSinTope === 717_949 &&
      g.tope === 417_276 &&
      g.rebajaEfectiva === 417_276 &&
      g.rentaAfectaNueva === 1_582_724 &&
      g.rebajaSinTope === gold.rebajaSinTope &&
      g.tope === gold.tope &&
      g.rebajaEfectiva === gold.rebajaEfectiva &&
      g.rentaAfectaNueva === gold.rentaAfectaNueva &&
      g.rebajaSinTope === Math.round((2_000_000 * 56) / 156) &&
      g.tope === Math.round((745_136 * 56) / 100) &&
      g.rebajaEfectiva === Math.min(g.rebajaSinTope, g.tope) &&
      g.topeAplica === true &&
      g.iuscAntes === calcularIusc(2_000_000) &&
      g.iuscDespues === calcularIusc(1_582_724) &&
      g.ahorroIusc === Math.max(0, g.iuscAntes - g.iuscDespues),
    JSON.stringify(g),
  );
  assert(
    "Iquique 40 % × 1,4 Ley 19.354 = 56 %",
    pctIncrementadoDesdeBase(40) === 56 &&
      pctIncrementadoDesdeBase(gold.pctBase) === gold.pctIncrementado &&
      INCREMENTO_ASIGNACION_ZONA_LEY_19354 === 1.4 &&
      zonaExtremaPorId("iquique")?.pctBase === 40,
  );
  const bajoTope = calcularZonaExtrema({
    rentaAfecta: 500_000,
    pctIncrementado: 56,
    grado1A: 745_136,
    zonaId: "iquique",
  });
  assert(
    "renta $500.000 no choca el tope grado 1-A",
    bajoTope.ok === true &&
      bajoTope.rebajaSinTope === Math.round((500_000 * 56) / 156) &&
      bajoTope.tope === 417_276 &&
      bajoTope.rebajaEfectiva === bajoTope.rebajaSinTope &&
      bajoTope.topeAplica === false &&
      bajoTope.rentaAfectaNueva === 500_000 - bajoTope.rebajaEfectiva,
    JSON.stringify(bajoTope),
  );
  const sinRenta = calcularZonaExtrema({ pctIncrementado: 56, grado1A: 745_136 });
  assert(
    "sin renta afecta → ok false",
    sinRenta.ok === false && sinRenta.motivo === "renta",
    JSON.stringify(sinRenta),
  );
  const zeApp = readFileSync(join(root, "js/app-zona-extrema.js"), "utf8");
  assert(
    "app-zona-extrema usa calcularZonaExtrema y calcularIusc vía el módulo",
    /import\s*\{[^}]*calcularZonaExtrema[^}]*\}\s*from\s*["']\.\/zona-extrema\.js["']/.test(zeApp) &&
      /calcularZonaExtrema\s*\(/.test(zeApp) &&
      /calcularIusc/.test(readFileSync(join(root, "js/zona-extrema.js"), "utf8")) &&
      /from\s*["']\.\/sueldo\.js["']/.test(readFileSync(join(root, "js/zona-extrema.js"), "utf8")) &&
      !/\balert\s*\(/.test(zeApp) &&
      !/\bconfirm\s*\(/.test(zeApp) &&
      !/\bprompt\s*\(/.test(zeApp),
  );
}

console.log("\nPromedio remuneraciones art. 172 (gold 2026)");
{
  const g = calcularPromedioRemuneraciones(PROMEDIO_REMUNERACIONES_GOLD.tresMeses);
  const gold = PROMEDIO_REMUNERACIONES_GOLD.tresMeses;
  assert(
    "gold 800.000+200.000 / 800.000+400.000 / 800.000+100.000 → $1.033.333",
    g.ok === true &&
      g.n === 3 &&
      g.suma === 3_100_000 &&
      g.promedio === 1_033_333 &&
      g.promedio === gold.promedio &&
      g.meses[0].total === 1_000_000 &&
      g.meses[1].total === 1_200_000 &&
      g.meses[2].total === 900_000 &&
      g.promedio === Math.round((1_000_000 + 1_200_000 + 900_000) / 3),
    JSON.stringify(g),
  );
  const dos = calcularPromedioRemuneraciones(PROMEDIO_REMUNERACIONES_GOLD.dosMeses);
  assert(
    "solo 2 meses (M1+M2) → $1.100.000",
    dos.ok === true &&
      dos.n === 2 &&
      dos.suma === 2_200_000 &&
      dos.promedio === 1_100_000 &&
      dos.promedio === Math.round((1_000_000 + 1_200_000) / 2) &&
      dos.meses[2].valido === false,
    JSON.stringify(dos),
  );
  const soloVar = calcularPromedioRemuneraciones({
    incluirGratificacion: false,
    meses: [{ fija: 0, variables: 200_000, gratificacion: 0 }],
  });
  assert(
    "solo variables en un mes, fija 0 → cuenta el total",
    soloVar.ok === true &&
      soloVar.n === 1 &&
      soloVar.meses[0].total === 200_000 &&
      soloVar.promedio === 200_000,
    JSON.stringify(soloVar),
  );
  const vacio = calcularPromedioRemuneraciones({
    incluirGratificacion: false,
    meses: [
      { fija: 0, variables: 0, gratificacion: 50_000 },
      { fija: 0, variables: 0, gratificacion: 0 },
    ],
  });
  assert(
    "n=0 → error de validación",
    vacio.ok === false && vacio.motivo === "meses" && vacio.n === 0 && vacio.promedio === 0,
    JSON.stringify(vacio),
  );
  const gratOff = calcularPromedioRemuneraciones({
    incluirGratificacion: false,
    meses: [{ fija: 800_000, variables: 0, gratificacion: 50_000 }],
  });
  assert(
    "gratificación OFF no suma aunque el campo tenga número",
    gratOff.ok === true &&
      gratOff.n === 1 &&
      gratOff.meses[0].total === 800_000 &&
      gratOff.promedio === 800_000 &&
      gratOff.incluirGratificacion === false,
    JSON.stringify(gratOff),
  );
  const gratOn = calcularPromedioRemuneraciones({
    incluirGratificacion: true,
    meses: [{ fija: 800_000, variables: 0, gratificacion: 50_000 }],
  });
  assert(
    "gratificación ON suma el campo del mes",
    gratOn.ok === true && gratOn.meses[0].total === 850_000 && gratOn.promedio === 850_000,
    JSON.stringify(gratOn),
  );
  const prApp = readFileSync(join(root, "js/app-promedio-remuneraciones.js"), "utf8");
  assert(
    "app-promedio-remuneraciones usa calcularPromedioRemuneraciones",
    /import\s*\{[^}]*calcularPromedioRemuneraciones[^}]*\}\s*from\s*["']\.\/promedio-remuneraciones\.js["']/.test(prApp) &&
      /calcularPromedioRemuneraciones\s*\(/.test(prApp) &&
      !/\balert\s*\(/.test(prApp) &&
      !/\bconfirm\s*\(/.test(prApp) &&
      !/\bprompt\s*\(/.test(prApp),
  );
}

console.log("\nAntigüedad laboral fecha a fecha (gold 2026)");
{
  const gold = ANTIGUEDAD_LABORAL_GOLD.seisAniosSeisMeses;
  const g = calcularAntiguedadLaboral({ fechaInicio: gold.fechaInicio, fechaTermino: gold.fechaTermino });
  assert(
    "gold 2020-01-15 → 2026-07-15 = 6 años, 6 meses, 0 días; anosIAS 6; mesesFeriado 78",
    g.ok === true &&
      g.anosCompletos === 6 &&
      g.mesesRemanentes === 6 &&
      g.diasRemanentes === 0 &&
      g.anosIAS === 6 &&
      g.anosIAS === gold.anosIAS &&
      g.mesesFeriado === 78 &&
      g.mesesFeriado === gold.mesesFeriado &&
      g.mesesFeriado === g.anosCompletos * 12 + g.mesesRemanentes &&
      g.anosConFraccion === 6 &&
      g.fraccionSuperiorSeisMeses === false &&
      g.ultimoAniversario === "2026-01-15" &&
      g.ancla === "2026-07-15" &&
      g.diasCalendario === 2373 &&
      textoAntiguedad(g) === "6 años, 6 meses, 0 días",
    JSON.stringify(g),
  );
  const v = ANTIGUEDAD_LABORAL_GOLD.visperaAniversario;
  const vis = calcularAntiguedadLaboral({ fechaInicio: v.fechaInicio, fechaTermino: v.fechaTermino });
  assert(
    "2020-01-15 → 2026-01-14 = 5 años, 11 meses, 30 días; anosIAS 5 (no redondea a 6); mesesFeriado 71",
    vis.ok === true &&
      vis.anosCompletos === 5 &&
      vis.mesesRemanentes === 11 &&
      vis.diasRemanentes === 30 &&
      vis.anosIAS === 5 &&
      vis.anosIAS === v.anosIAS &&
      vis.mesesFeriado === 71 &&
      vis.anosConFraccion === 6 &&
      vis.fraccionSuperiorSeisMeses === true &&
      vis.ultimoAniversario === "2025-01-15" &&
      vis.ancla === "2025-12-15" &&
      textoAntiguedad(vis) === "5 años, 11 meses, 30 días",
    JSON.stringify(vis),
  );
  const z = ANTIGUEDAD_LABORAL_GOLD.mismoDia;
  const cero = calcularAntiguedadLaboral({ fechaInicio: z.fechaInicio, fechaTermino: z.fechaTermino });
  assert(
    "2024-03-01 → 2024-03-01 = 0 años, 0 meses, 0 días; anosIAS 0; mesesFeriado 0",
    cero.ok === true &&
      cero.anosCompletos === 0 &&
      cero.mesesRemanentes === 0 &&
      cero.diasRemanentes === 0 &&
      cero.anosIAS === 0 &&
      cero.anosConFraccion === 0 &&
      cero.mesesFeriado === 0 &&
      cero.diasCalendario === 0 &&
      textoAntiguedad(cero) === "0 años, 0 meses, 0 días",
    JSON.stringify(cero),
  );
  const orden = calcularAntiguedadLaboral({ fechaInicio: "2024-03-01", fechaTermino: "2024-02-01" });
  assert(
    "término < inicio → validación (sin NaN ni negativos)",
    orden.ok === false &&
      orden.motivo === "orden" &&
      orden.anosCompletos === 0 &&
      orden.mesesRemanentes === 0 &&
      orden.diasRemanentes === 0 &&
      orden.anosIAS === 0 &&
      orden.mesesFeriado === 0 &&
      Number.isFinite(orden.diasCalendario) &&
      orden.diasCalendario === 0 &&
      textoAntiguedad(orden) === "—",
    JSON.stringify(orden),
  );
  const sinInicio = calcularAntiguedadLaboral({ fechaInicio: "", fechaTermino: "2024-02-01" });
  const malInicio = calcularAntiguedadLaboral({ fechaInicio: "2024-13-01", fechaTermino: "2024-02-01" });
  const malTermino = calcularAntiguedadLaboral({ fechaInicio: "2024-01-01", fechaTermino: "2024-02-30" });
  assert(
    "fechas inválidas → motivo inicio / termino",
    sinInicio.ok === false &&
      sinInicio.motivo === "inicio" &&
      malInicio.ok === false &&
      malInicio.motivo === "inicio" &&
      malTermino.ok === false &&
      malTermino.motivo === "termino",
  );
  const hoy = calcularAntiguedadLaboral({ fechaInicio: "2020-01-15", fechaHoy: "2026-09-22" });
  assert(
    "término vacío = hoy (inyectado 2026-09-22) → 6a 8m 7d, terminoEsHoy",
    hoy.ok === true &&
      hoy.fechaTermino === "2026-09-22" &&
      hoy.terminoEsHoy === true &&
      hoy.anosCompletos === 6 &&
      hoy.mesesRemanentes === 8 &&
      hoy.diasRemanentes === 7 &&
      hoy.anosIAS === 6 &&
      hoy.mesesFeriado === 80,
    JSON.stringify(hoy),
  );
  const hoyReal = calcularAntiguedadLaboral({ fechaInicio: "2020-01-15" });
  assert(
    "término vacío sin fechaHoy → usa hoy en America/Santiago (ISO válido, ok)",
    hoyReal.ok === true && /^\d{4}-\d{2}-\d{2}$/.test(hoyReal.fechaTermino) && hoyReal.terminoEsHoy === true,
    JSON.stringify(hoyReal),
  );
  const visperaAniv = calcularAntiguedadLaboral({ fechaInicio: "2020-01-15", fechaTermino: "2026-07-14" });
  assert(
    "un día antes de los 6a 6m → 6a 5m 29d; días sueltos no suman mes (mesesFeriado 77)",
    visperaAniv.ok === true &&
      visperaAniv.anosCompletos === 6 &&
      visperaAniv.mesesRemanentes === 5 &&
      visperaAniv.diasRemanentes === 29 &&
      visperaAniv.mesesFeriado === 77 &&
      visperaAniv.anosConFraccion === 6,
    JSON.stringify(visperaAniv),
  );
  const bisiesto = calcularAntiguedadLaboral({ fechaInicio: "2024-02-29", fechaTermino: "2025-02-28" });
  const finMes = calcularAntiguedadLaboral({ fechaInicio: "2024-01-31", fechaTermino: "2024-02-29" });
  assert(
    "29-feb cumple año el 28-feb; 31-ene + 1 mes = 29-feb (recorte a fin de mes)",
    bisiesto.ok === true &&
      bisiesto.anosCompletos === 1 &&
      bisiesto.mesesRemanentes === 0 &&
      bisiesto.diasRemanentes === 0 &&
      finMes.ok === true &&
      finMes.anosCompletos === 0 &&
      finMes.mesesRemanentes === 1 &&
      finMes.diasRemanentes === 0 &&
      sumarMesesIso("2024-01-31", 1) === "2024-02-29" &&
      sumarMesesIso("2023-01-31", 1) === "2023-02-28" &&
      sumarMesesIso("2024-02-29", 12) === "2025-02-28" &&
      sumarMesesIso("2024-11-15", 2) === "2025-01-15" &&
      sumarMesesIso("no-fecha", 1) === "" &&
      diasEntreIso("2020-01-15", "2026-07-15") === 2373 &&
      diasEntreIso("2024-03-01", "2024-02-01") === -29,
    JSON.stringify({ bisiesto, finMes }),
  );
  assert(
    "regla art. 163: fracción estrictamente > 6 meses (6m 0d no; 6m 1d sí; 7m sí)",
    esFraccionSuperiorSeisMeses(6, 0) === false &&
      esFraccionSuperiorSeisMeses(6, 1) === true &&
      esFraccionSuperiorSeisMeses(7, 0) === true &&
      esFraccionSuperiorSeisMeses(5, 30) === false &&
      esFraccionSuperiorSeisMeses(11, 30) === true &&
      esFraccionSuperiorSeisMeses(0, 0) === false,
  );
  const iasCoherente = aniosServicio("2020-01-15", "2026-01-14", { tope: null });
  assert(
    "coherencia con /indemnizacion-anos-servicio: aniosServicio(2020-01-15→2026-01-14) = anosConFraccion = 6",
    iasCoherente === 6 && iasCoherente === vis.anosConFraccion && aniosServicio("2020-01-15", "2026-07-15", { tope: null }) === g.anosConFraccion,
    String(iasCoherente),
  );
  const alApp = readFileSync(join(root, "js/app-antiguedad-laboral.js"), "utf8");
  assert(
    "app-antiguedad-laboral usa calcularAntiguedadLaboral y hoyChileIso",
    /import\s*\{[^}]*calcularAntiguedadLaboral[^}]*\}\s*from\s*["']\.\/antiguedad-laboral\.js["']/.test(alApp) &&
      /calcularAntiguedadLaboral\s*\(/.test(alApp) &&
      /hoyChileIso/.test(alApp) &&
      !/\balert\s*\(/.test(alApp) &&
      !/\bconfirm\s*\(/.test(alApp) &&
      !/\bprompt\s*\(/.test(alApp),
  );
  const alLib = readFileSync(join(root, "js/antiguedad-laboral.js"), "utf8");
  assert(
    "antiguedad-laboral.js reutiliza parseIsoFecha/ymdIso (feriados.js) y hoyChileIso (America/Santiago)",
    /from\s*["']\.\/feriados\.js["']/.test(alLib) &&
      /parseIsoFecha/.test(alLib) &&
      /ymdIso/.test(alLib) &&
      /hoyChileIso/.test(alLib) &&
      /America\/Santiago/.test(readFileSync(join(root, "js/contrato-plazo-fijo.js"), "utf8")),
  );
}

console.log("\nTope imponible en UF y pesos (gold 2026, UF fija $39.000)");
{
  const G = TOPE_IMPONIBLE_GOLD;
  const bajo = calcularTopeImponible({ rentaImponible: G.bajoTope.rentaImponible, uf: G.uf });
  assert(
    "gold renta $3.500.000 / UF $39.000 → tope AFP/salud 90 UF = $3.510.000; afecta $3.500.000; exceso 0; margen $10.000",
    bajo.ok === true &&
      bajo.uf === 39_000 &&
      bajo.rentaImponible === 3_500_000 &&
      bajo.afpSalud.topeUf === 90 &&
      bajo.afpSalud.topeUf === TOPE_AFP_SALUD_UF &&
      bajo.afpSalud.topePesos === 3_510_000 &&
      bajo.afpSalud.topePesos === G.topeAfpSaludPesos &&
      bajo.afpSalud.basePesos === G.bajoTope.baseAfpSalud &&
      bajo.afpSalud.exceso === 0 &&
      bajo.afpSalud.margen === 10_000 &&
      bajo.afpSalud.supera === false &&
      bajo.cesantia.topeUf === 135.2 &&
      bajo.cesantia.topeUf === TOPE_CESANTIA_UF &&
      bajo.cesantia.topePesos === 5_272_800 &&
      bajo.cesantia.topePesos === G.topeCesantiaPesos &&
      bajo.cesantia.basePesos === 3_500_000 &&
      bajo.cesantia.exceso === 0 &&
      bajo.cesantia.supera === false &&
      Math.abs(bajo.rentaUf - 3_500_000 / 39_000) < 1e-9 &&
      bajo.afpSalud.porcentajeAfecto === 1,
    JSON.stringify(bajo),
  );
  const sobreAfp = calcularTopeImponible({ rentaImponible: G.sobreTopeAfp.rentaImponible, uf: G.uf });
  assert(
    "renta $4.000.000 → afecta AFP/salud $3.510.000, exceso $490.000; cesantía completa (exceso 0)",
    sobreAfp.ok === true &&
      sobreAfp.afpSalud.basePesos === 3_510_000 &&
      sobreAfp.afpSalud.basePesos === G.sobreTopeAfp.baseAfpSalud &&
      sobreAfp.afpSalud.exceso === 490_000 &&
      sobreAfp.afpSalud.exceso === G.sobreTopeAfp.excesoAfpSalud &&
      sobreAfp.afpSalud.margen === 0 &&
      sobreAfp.afpSalud.supera === true &&
      sobreAfp.cesantia.basePesos === 4_000_000 &&
      sobreAfp.cesantia.exceso === 0 &&
      sobreAfp.cesantia.supera === false &&
      Math.abs(sobreAfp.afpSalud.porcentajeAfecto - 0.8775) < 1e-9,
    JSON.stringify(sobreAfp),
  );
  const ambos = calcularTopeImponible({ rentaImponible: G.sobreAmbosTopes.rentaImponible, uf: G.uf });
  assert(
    "renta $6.000.000 → exceso AFP/salud $2.490.000; cesantía afecta $5.272.800, exceso $727.200",
    ambos.ok === true &&
      ambos.afpSalud.basePesos === 3_510_000 &&
      ambos.afpSalud.exceso === 2_490_000 &&
      ambos.afpSalud.exceso === G.sobreAmbosTopes.excesoAfpSalud &&
      ambos.cesantia.basePesos === 5_272_800 &&
      ambos.cesantia.basePesos === G.sobreAmbosTopes.baseCesantia &&
      ambos.cesantia.exceso === 727_200 &&
      ambos.cesantia.exceso === G.sobreAmbosTopes.excesoCesantia &&
      ambos.cesantia.supera === true,
    JSON.stringify(ambos),
  );
  const soloTopes = calcularTopeImponible({ rentaImponible: 0, uf: G.uf });
  assert(
    "renta 0 → solo topes (afecta 0, exceso 0, margen = tope, porcentajeAfecto 1)",
    soloTopes.ok === true &&
      soloTopes.rentaImponible === 0 &&
      soloTopes.rentaUf === 0 &&
      soloTopes.afpSalud.topePesos === 3_510_000 &&
      soloTopes.afpSalud.basePesos === 0 &&
      soloTopes.afpSalud.exceso === 0 &&
      soloTopes.afpSalud.margen === 3_510_000 &&
      soloTopes.afpSalud.porcentajeAfecto === 1 &&
      soloTopes.cesantia.margen === 5_272_800,
    JSON.stringify(soloTopes),
  );
  const porDefecto = calcularTopeImponible({ rentaImponible: 3_500_000 });
  const sueldoRef = calcularSueldo({ sueldoBase: 3_500_000, afp: "modelo", salud: "fonasa", contrato: "indefinido" }, { uf: FALLBACK_UF });
  assert(
    "sin UF → FALLBACK_UF; tope y base bit a bit iguales a calcularSueldo (topeAfpSalud/topeCesantia/baseAfpSalud/baseCesantia)",
    porDefecto.ok === true &&
      porDefecto.uf === FALLBACK_UF &&
      porDefecto.afpSalud.tope === sueldoRef.topeAfpSalud &&
      porDefecto.cesantia.tope === sueldoRef.topeCesantia &&
      porDefecto.afpSalud.base === sueldoRef.baseAfpSalud &&
      porDefecto.cesantia.base === sueldoRef.baseCesantia &&
      porDefecto.afpSalud.topePesos === Math.round(TOPE_AFP_SALUD_UF * FALLBACK_UF) &&
      porDefecto.afpSalud.topePesos === 3_676_861 &&
      porDefecto.cesantia.topePesos === 5_523_462,
    JSON.stringify({ porDefecto, topeAfpSalud: sueldoRef.topeAfpSalud, baseAfpSalud: sueldoRef.baseAfpSalud }),
  );
  const sobreRef = calcularSueldo({ sueldoBase: 6_000_000, afp: "modelo", salud: "fonasa", contrato: "indefinido" }, { uf: 39_000 });
  assert(
    "renta $6.000.000 / UF 39.000: base AFP/salud y cesantía coinciden con calcularSueldo",
    ambos.afpSalud.base === sobreRef.baseAfpSalud &&
      ambos.cesantia.base === sobreRef.baseCesantia &&
      ambos.afpSalud.tope === sobreRef.topeAfpSalud &&
      ambos.cesantia.tope === sobreRef.topeCesantia &&
      sobreRef.baseAfpSalud === 3_510_000 &&
      sobreRef.baseCesantia === 5_272_800,
    JSON.stringify({ baseAfpSalud: sobreRef.baseAfpSalud, baseCesantia: sobreRef.baseCesantia }),
  );
  const ufBaja = calcularTopeImponible({ rentaImponible: 1_000_000, uf: 1000 });
  const ufNaN = calcularTopeImponible({ rentaImponible: 1_000_000, uf: NaN });
  const rentaNeg = calcularTopeImponible({ rentaImponible: -5, uf: 39_000 });
  assert(
    "UF fuera de rango o NaN → motivo uf; renta negativa → motivo renta (sin NaN en salidas)",
    ufBaja.ok === false &&
      ufBaja.motivo === "uf" &&
      ufNaN.ok === false &&
      ufNaN.motivo === "uf" &&
      rentaNeg.ok === false &&
      rentaNeg.motivo === "renta" &&
      rentaNeg.afpSalud.topePesos === 0 &&
      rentaNeg.afpSalud.topeUf === 90 &&
      rentaNeg.cesantia.topeUf === 135.2 &&
      Number.isFinite(ufBaja.afpSalud.exceso) &&
      ufValida(39_000) === true &&
      ufValida(19_999) === false &&
      ufValida(80_001) === false &&
      ufValida("x") === false,
    JSON.stringify({ ufBaja, rentaNeg }),
  );
  const borde = calcularTopeImponible({ rentaImponible: 3_510_000, uf: 39_000 });
  const bordeMas = calcularTopeImponible({ rentaImponible: 3_510_001, uf: 39_000 });
  assert(
    "renta exactamente en el tope → no supera, exceso 0; un peso más → supera con exceso $1",
    borde.ok === true &&
      borde.afpSalud.supera === false &&
      borde.afpSalud.exceso === 0 &&
      borde.afpSalud.margen === 0 &&
      borde.afpSalud.basePesos === 3_510_000 &&
      bordeMas.afpSalud.supera === true &&
      bordeMas.afpSalud.exceso === 1 &&
      bordeMas.afpSalud.basePesos === 3_510_000,
    JSON.stringify({ borde, bordeMas }),
  );
  const decimal = calcularTopeImponible({ rentaImponible: 3_500_000.4, uf: 39_000 });
  assert(
    "renta con decimales se redondea al peso (roundPeso) antes de comparar",
    decimal.ok === true && decimal.rentaImponible === 3_500_000 && decimal.afpSalud.margen === 10_000,
    JSON.stringify(decimal),
  );
  const tiApp = readFileSync(join(root, "js/app-tope-imponible.js"), "utf8");
  assert(
    "app-tope-imponible usa calcularTopeImponible, mountIndicadores (mindicador con caché) y no usa alert/confirm/prompt",
    /import\s*\{[^}]*calcularTopeImponible[^}]*\}\s*from\s*["']\.\/tope-imponible\.js["']/.test(tiApp) &&
      /calcularTopeImponible\s*\(/.test(tiApp) &&
      /mountIndicadores\s*\(/.test(tiApp) &&
      /mindicador\.cl/.test(tiApp) &&
      !/\balert\s*\(/.test(tiApp) &&
      !/\bconfirm\s*\(/.test(tiApp) &&
      !/\bprompt\s*\(/.test(tiApp),
  );
  const tiLib = readFileSync(join(root, "js/tope-imponible.js"), "utf8");
  assert(
    "tope-imponible.js reutiliza TOPE_AFP_SALUD_UF / TOPE_CESANTIA_UF / roundPeso (no inventa topes)",
    /TOPE_AFP_SALUD_UF/.test(tiLib) &&
      /TOPE_CESANTIA_UF/.test(tiLib) &&
      /from\s*["']\.\/constants\.js["']/.test(tiLib) &&
      /roundPeso/.test(tiLib) &&
      /from\s*["']\.\/sueldo\.js["']/.test(tiLib) &&
      !/\b(87\.8|87,8|131\.9|131,9)\b/.test(tiLib),
  );
}

{
  const millon = calcularAvisoPrevio(
    { causal: "161-necesidades", remuneracion: 1_000_000, avisoPrevio: false },
    { uf: FALLBACK_UF },
  );
  assert(
    "Aviso $1.000.000 con derecho y sin preaviso → $1.000.000",
    millon.aviso === 1_000_000 && millon.aplicaAviso && millon.motivo === "ok",
    String(millon.aviso),
  );
  const seiscientos = calcularAvisoPrevio(
    { causal: "161-desahucio", remuneracion: 600_000, avisoPrevio: false },
    { uf: FALLBACK_UF },
  );
  assert("Aviso $600.000 → $600.000", seiscientos.aviso === 600_000, String(seiscientos.aviso));
  const sinDerecho = calcularAvisoPrevio(
    { causal: "160-7", remuneracion: 1_000_000, avisoPrevio: false },
    { uf: FALLBACK_UF },
  );
  assert(
    "Sin derecho a aviso (art. 160) → $0",
    sinDerecho.aviso === 0 && !sinDerecho.aplicaAviso && sinDerecho.motivo === "sin_derecho",
    String(sinDerecho.aviso),
  );
  const conHabituales = calcularAvisoPrevio(
    {
      causal: "161-necesidades",
      remuneracion: 500_000,
      colacion: 80_000,
      movilizacion: 70_000,
      avisoPrevio: false,
    },
    { uf: FALLBACK_UF },
  );
  assert(
    "Base art. 172: sueldo + colación + movilización habituales → $650.000",
    conHabituales.aviso === 650_000 && conHabituales.baseIngresada === 650_000,
    String(conHabituales.aviso),
  );
  const finSuma = calcularFiniquito(
    { articulo: "161", remuneracion: 500_000 + 80_000 + 70_000, avisoPrevio: false },
    { uf: FALLBACK_UF },
  );
  assert(
    "calcularAvisoPrevio reusa calcularFiniquito (suma colación/movilización y tope 90 UF)",
    conHabituales.aviso === finSuma.aviso && conHabituales.base === finSuma.baseIas,
  );
  const otorgado = calcularAvisoPrevio(
    { causal: "161-necesidades", remuneracion: 1_000_000, avisoPrevio: true },
    { uf: FALLBACK_UF },
  );
  assert("Con aviso de 30 días otorgado → $0", otorgado.aviso === 0 && otorgado.motivo === "aviso_otorgado");
  const topeUf = calcularAvisoPrevio(
    { causal: "161-necesidades", remuneracion: 10_000_000, avisoPrevio: false },
    { uf: FALLBACK_UF },
  );
  assert(
    "Aviso tope 90 UF: $10.000.000 → $3.676.861",
    topeUf.aviso === 3_676_861 && topeUf.recortoTopeUf,
    String(topeUf.aviso),
  );
}
{
  const avisoApp = readFileSync(join(root, "js/app-indemnizacion-aviso-previo.js"), "utf8");
  assert(
    "app-indemnizacion-aviso-previo usa calcularAvisoPrevio",
    /import\s*\{[^}]*calcularAvisoPrevio[^}]*\}\s*from\s*["']\.\/finiquito\.js["']/.test(avisoApp) &&
      /calcularAvisoPrevio\s*\(/.test(avisoApp),
  );
}
{
  assert("Tutela art. 489 rango legal 6–11", TUTELA_MESES_MIN === 6 && TUTELA_MESES_MAX === 11);
  const piso = calcularTutelaLaboral({ remuneracion: 1_000_000, meses: 6 });
  assert(
    "Tutela gold $1.000.000 × 6 → $6.000.000",
    piso.total === 6_000_000 && piso.meses === 6 && piso.piso === 6_000_000 && !piso.aplicaTopeUf,
    String(piso.total),
  );
  const techo = calcularTutelaLaboral({ remuneracion: 1_000_000, meses: 11 });
  assert(
    "Tutela gold $1.000.000 × 11 → $11.000.000",
    techo.total === 11_000_000 && techo.meses === 11 && techo.techo === 11_000_000,
    String(techo.total),
  );
  const ocho = calcularTutelaLaboral({ remuneracion: 900_000, meses: 8 });
  assert(
    "Tutela gold $900.000 × 8 → $7.200.000",
    ocho.total === 7_200_000 && ocho.meses === 8,
    String(ocho.total),
  );
  const def = calcularTutelaLaboral({ remuneracion: 1_000_000 });
  assert("Tutela default meses = piso 6", def.meses === 6 && def.total === 6_000_000);
  const bajo = calcularTutelaLaboral({ remuneracion: 1_000_000, meses: 5 });
  assert(
    "Tutela meses 5 se recorta a 6",
    bajo.meses === 6 && bajo.total === 6_000_000 && bajo.recortoRango,
  );
  const alto = calcularTutelaLaboral({ remuneracion: 1_000_000, meses: 12 });
  assert(
    "Tutela meses 12 se recorta a 11",
    alto.meses === 11 && alto.total === 11_000_000 && alto.recortoRango,
  );
  const sinUf = calcularTutelaLaboral({ remuneracion: 10_000_000, meses: 6 });
  assert(
    "Tutela no inventa tope 90 UF: $10.000.000 × 6 → $60.000.000",
    sinUf.total === 60_000_000 && sinUf.aplicaTopeUf === false,
    String(sinUf.total),
  );
  assert(
    "Tutela remuneración 0 o negativa → $0",
    calcularTutelaLaboral({ remuneracion: 0, meses: 6 }).total === 0 &&
      calcularTutelaLaboral({ remuneracion: -1, meses: 11 }).total === 0,
  );
  const tutelaApp = readFileSync(join(root, "js/app-tutela-laboral.js"), "utf8");
  assert(
    "app-tutela-laboral usa calcularTutelaLaboral",
    /import\s*\{[^}]*calcularTutelaLaboral[^}]*\}\s*from\s*["']\.\/finiquito\.js["']/.test(tutelaApp) &&
      /calcularTutelaLaboral\s*\(/.test(tutelaApp),
  );
  assert(
    "Art. 168 tramos 30/50/80/100",
    RECARGO_168_DEFAULT === 30 &&
      RECARGO_168_PORCENTAJES.join(",") === "30,50,80,100",
  );
  const g30 = calcularDespidoInjustificado({ baseIas: 3_000_000, porcentaje: 30 });
  assert(
    "Art. 168 gold $3.000.000 × 30 % → recargo $900.000, IAS+recargo $3.900.000",
    g30.recargo === 900_000 &&
      g30.totalIasConRecargo === 3_900_000 &&
      g30.baseIas === 3_000_000 &&
      g30.porcentaje === 30 &&
      g30.recargoSobreAviso === false &&
      g30.aviso === 0,
    JSON.stringify({ recargo: g30.recargo, total: g30.totalIasConRecargo }),
  );
  const g50 = calcularDespidoInjustificado({ baseIas: 3_000_000, porcentaje: 50 });
  assert(
    "Art. 168 gold $3.000.000 × 50 % → recargo $1.500.000, IAS+recargo $4.500.000",
    g50.recargo === 1_500_000 && g50.totalIasConRecargo === 4_500_000,
    String(g50.recargo),
  );
  const g80 = calcularDespidoInjustificado({ baseIas: 3_000_000, porcentaje: 80 });
  assert(
    "Art. 168 gold $3.000.000 × 80 % → recargo $2.400.000, IAS+recargo $5.400.000",
    g80.recargo === 2_400_000 && g80.totalIasConRecargo === 5_400_000,
    String(g80.recargo),
  );
  const g100 = calcularDespidoInjustificado({ baseIas: 3_000_000, porcentaje: 100 });
  assert(
    "Art. 168 gold $3.000.000 × 100 % → recargo $3.000.000, IAS+recargo $6.000.000",
    g100.recargo === 3_000_000 && g100.totalIasConRecargo === 6_000_000,
    String(g100.recargo),
  );
  const g1m = calcularDespidoInjustificado({ baseIas: 1_000_000, porcentaje: 30 });
  assert(
    "Art. 168 gold $1.000.000 × 30 % → recargo $300.000, IAS+recargo $1.300.000",
    g1m.recargo === 300_000 && g1m.totalIasConRecargo === 1_300_000,
    String(g1m.recargo),
  );
  const def168 = calcularDespidoInjustificado({ baseIas: 3_000_000 });
  assert("Art. 168 default tramo = 30 %", def168.porcentaje === 30 && def168.recargo === 900_000);
  const invalido = calcularDespidoInjustificado({ baseIas: 3_000_000, porcentaje: 40 });
  assert(
    "Art. 168 tramo 40 se recorta a 30",
    invalido.porcentaje === 30 && invalido.recargo === 900_000 && invalido.recortoTramo,
  );
  const round = calcularDespidoInjustificado({ baseIas: 1_000_001, porcentaje: 30 });
  assert(
    "Art. 168 usa roundPeso: $1.000.001 × 30 % → $300.000",
    round.recargo === 300_000 && round.totalIasConRecargo === 1_300_001,
    String(round.recargo),
  );
  const conAviso = calcularDespidoInjustificado(
    { baseIas: 3_000_000, porcentaje: 30, incluirAviso: true, remuneracion: 1_000_000 },
    { uf: FALLBACK_UF },
  );
  assert(
    "Art. 168 no recarga el aviso: aviso $1.000.000, recargo $900.000, total $4.900.000",
    conAviso.aviso === 1_000_000 &&
      conAviso.recargo === 900_000 &&
      conAviso.totalIasConRecargo === 3_900_000 &&
      conAviso.total === 4_900_000 &&
      conAviso.recargoSobreAviso === false,
    JSON.stringify({ aviso: conAviso.aviso, recargo: conAviso.recargo, total: conAviso.total }),
  );
  const helperIas = calcularDespidoInjustificado(
    { ingreso: "2020-01-15", termino: "2024-05-15", remuneracion: 1_000_000, porcentaje: 30 },
    { uf: FALLBACK_UF },
  );
  assert(
    "Art. 168 reusa calcularIas: 4 años × $1.000.000 → recargo $1.200.000",
    helperIas.baseIas === 4_000_000 &&
      helperIas.recargo === 1_200_000 &&
      helperIas.totalIasConRecargo === 5_200_000,
    String(helperIas.baseIas),
  );
  const aniosRem = calcularDespidoInjustificado(
    { anios: 3, remuneracion: 1_000_000, porcentaje: 50 },
    { uf: FALLBACK_UF },
  );
  assert(
    "Art. 168 reusa años × remuneración (tope art. 172): 3 × $1.000.000 × 50 % → $1.500.000",
    aniosRem.baseIas === 3_000_000 &&
      aniosRem.recargo === 1_500_000 &&
      aniosRem.totalIasConRecargo === 4_500_000,
    String(aniosRem.baseIas),
  );
  assert(
    "Art. 168 base 0 o negativa → $0",
    calcularDespidoInjustificado({ baseIas: 0, porcentaje: 80 }).recargo === 0 &&
      calcularDespidoInjustificado({ baseIas: -1, porcentaje: 100 }).recargo === 0,
  );
  const despidoApp = readFileSync(join(root, "js/app-despido-injustificado.js"), "utf8");
  assert(
    "app-despido-injustificado usa calcularDespidoInjustificado",
    /import\s*\{[^}]*calcularDespidoInjustificado[^}]*\}\s*from\s*["']\.\/finiquito\.js["']/.test(despidoApp) &&
      /calcularDespidoInjustificado\s*\(/.test(despidoApp),
  );
}
assert("Feriado dias*rem/30", feriadoProporcional(15, 900000) === 450000);
assert("Feriado 10 días × 900000 / 30 = 300000", feriadoProporcional(10, 900000) === 300000);
assert("Feriado 0 días → 0", feriadoProporcional(0, 900000) === 0);
{
  const vpApp = readFileSync(join(root, "js/app-vacaciones-proporcionales.js"), "utf8");
  assert(
    "app-vacaciones-proporcionales usa feriadoProporcional",
    /import\s*\{[^}]*feriadoProporcional[^}]*\}\s*from\s*["']\.\/finiquito\.js["']/.test(vpApp) &&
      /feriadoProporcional\s*\(/.test(vpApp),
  );
}

console.log("\nFiniquito casa particular");
{
  const golden = calcularFiniquitoCasaParticular(
    {
      ingreso: "2023-03-01",
      termino: "2026-03-01",
      remuneracion: 500_000,
      causal: "desahucio",
      avisoPrevio: false,
      diasMes: 1,
      diasFeriadoPendiente: 5,
      diasFeriadoProporcional: 0,
    },
    { uf: FALLBACK_UF },
  );
  assert(
    "casa particular golden desahucio: empleador $600.000, IAS $0, AFP $199.800",
    golden.remuneracionMes === 16_667 &&
      golden.feriadoPendiente === 83_333 &&
      golden.aviso === 500_000 &&
      golden.ias === 0 &&
      golden.totalEmpleador === 600_000 &&
      golden.iteEstimado === 199_800 &&
      golden.mesesIte === 36 &&
      golden.mesesIteActual === 36 &&
      golden.mesesItePrevia === 0,
    JSON.stringify({
      rem: golden.remuneracionMes,
      fer: golden.feriadoPendiente,
      aviso: golden.aviso,
      total: golden.totalEmpleador,
      ite: golden.iteEstimado,
    }),
  );
  const renuncia = calcularFiniquitoCasaParticular(
    {
      ingreso: "2023-03-01",
      termino: "2026-03-01",
      remuneracion: 500_000,
      causal: "renuncia",
      diasMes: 1,
      diasFeriadoPendiente: 5,
      diasFeriadoProporcional: 0,
    },
    { uf: FALLBACK_UF },
  );
  assert(
    "casa particular renuncia: sin aviso, total $100.000, mismo fondo AFP",
    renuncia.aviso === 0 && renuncia.totalEmpleador === 100_000 && renuncia.iteEstimado === 199_800,
  );
  const split = calcularFiniquitoCasaParticular(
    {
      ingreso: "2019-01-01",
      termino: "2021-01-01",
      remuneracion: 500_000,
      causal: "renuncia",
      diasMes: 0,
      diasFeriadoPendiente: 0,
      diasFeriadoProporcional: 0,
    },
    { uf: FALLBACK_UF },
  );
  assert(
    "casa particular ITE 4,11 % hasta oct. 2020 y 1,11 % después",
    split.mesesIte === 24 &&
      split.mesesItePrevia === 21 &&
      split.mesesIteActual === 3 &&
      split.iteEstimado === 448_200,
    `${split.mesesItePrevia}+${split.mesesIteActual} ${split.iteEstimado}`,
  );
  const cap = calcularFiniquitoCasaParticular(
    {
      ingreso: "2000-01-01",
      termino: "2020-01-01",
      remuneracion: 500_000,
      causal: "renuncia",
      diasMes: 0,
      diasFeriadoPendiente: 0,
      diasFeriadoProporcional: 0,
    },
    { uf: FALLBACK_UF },
  );
  assert(
    "casa particular ITE tope 11 años (no 20)",
    cap.mesesIte === 132 && cap.recortoTopeAnios && cap.iteEstimado === 2_712_600,
  );
  const prueba = calcularFiniquitoCasaParticular(
    {
      ingreso: "2026-03-01",
      termino: "2026-03-12",
      remuneracion: 500_000,
      causal: "desahucio",
      avisoPrevio: false,
    },
    { uf: FALLBACK_UF },
  );
  assert(
    "casa particular período de prueba: sin aviso, solo días",
    prueba.prueba && prueba.aviso === 0 && prueba.diasMes === 12 && prueba.remuneracionMes === 200_000,
  );
  const topeUf = calcularFiniquitoCasaParticular(
    {
      ingreso: "2023-03-01",
      termino: "2026-03-01",
      remuneracion: 10_000_000,
      causal: "desahucio",
      avisoPrevio: false,
      diasMes: 0,
      diasFeriadoPendiente: 0,
      diasFeriadoProporcional: 0,
    },
    { uf: FALLBACK_UF },
  );
  assert(
    "casa particular aviso tope 90 UF (no se inventa otro tope)",
    topeUf.aviso === 3_676_861 && topeUf.recortoTopeUf && topeUf.ias === 0,
  );
  const cpApp = readFileSync(join(root, "js/app-finiquito-casa-particular.js"), "utf8");
  assert(
    "app-finiquito-casa-particular usa calcularFiniquitoCasaParticular",
    /import\s*\{[^}]*calcularFiniquitoCasaParticular[^}]*\}\s*from\s*["']\.\/finiquito\.js["']/.test(cpApp) &&
      /calcularFiniquitoCasaParticular\s*\(/.test(cpApp),
  );
}

const f161 = calcularFiniquito(
  {
    articulo: "161",
    ingreso: "2020-01-15",
    termino: "2023-08-20",
    remuneracion: 1_000_000,
    avisoPrevio: false,
    diasFeriado: 10,
  },
  { uf: FALLBACK_UF },
);
assert("Art. 161 incluye IAS y aviso", f161.ias === 4_000_000 && f161.aviso === 1_000_000);
assert("Feriado 10 días * rem/30", f161.feriado === Math.round((10 * 1_000_000) / 30));

const f161fer = calcularFiniquito(
  {
    articulo: "161",
    ingreso: "2020-01-15",
    termino: "2023-08-20",
    remuneracion: 1_000_000,
    avisoPrevio: true,
    diasFeriadoPendiente: 5,
    diasFeriadoProporcional: 10,
    otros: 50_000,
  },
  { uf: FALLBACK_UF },
);
assert(
  "Público desglosa feriado pendiente, proporcional y otros",
  f161fer.feriadoPendiente === Math.round((5 * 1_000_000) / 30) &&
    f161fer.feriadoProporcional === Math.round((10 * 1_000_000) / 30) &&
    f161fer.feriado === f161fer.feriadoPendiente + f161fer.feriadoProporcional &&
    f161fer.otros === 50_000 &&
    f161fer.aviso === 0,
);

const f161aviso = calcularFiniquito(
  { articulo: "161", anios: 2, remuneracion: 1_000_000, avisoPrevio: true, diasFeriado: 0 },
  { uf: FALLBACK_UF },
);
assert("Con aviso previo no hay indemnización sustitutiva", f161aviso.aviso === 0);

const f159 = calcularFiniquito(
  {
    articulo: "159",
    ingreso: "2020-01-15",
    termino: "2023-08-20",
    remuneracion: 1_000_000,
    avisoPrevio: false,
    diasFeriado: 10,
  },
  { uf: FALLBACK_UF },
);
assert("Art. 159/160 sin IAS ni aviso", f159.ias === 0 && f159.aviso === 0 && f159.feriado > 0);

const f160 = calcularFiniquito(
  { articulo: "160", anios: 5, remuneracion: 2_000_000, avisoPrevio: false, diasFeriado: 0 },
  { uf: FALLBACK_UF },
);
assert("Art. 160 sin IAS ni aviso", f160.ias === 0 && f160.aviso === 0);

const alto = calcularFiniquito(
  { articulo: "161", anios: 2, remuneracion: 10_000_000, avisoPrevio: false, diasFeriado: 0 },
  { uf: FALLBACK_UF },
);
assert(
  "IAS/aviso tope 90 UF",
  close(alto.baseIas, 90 * FALLBACK_UF, 1),
  String(alto.baseIas),
);

console.log("\nCausales del Código del Trabajo");
const ids159 = CAUSALES.filter((c) => c.articulo === "159").map((c) => c.letra);
assert("Art. 159 letras a–f", ids159.join(",") === "a,b,c,d,e,f", ids159.join(","));
assert(
  "Art. 160 numerales y letras",
  CAUSALES.filter((c) => c.articulo === "160").length === 13 &&
    CAUSALES.some((c) => c.id === "160-1-a") &&
    CAUSALES.some((c) => c.id === "160-1-f") &&
    CAUSALES.some((c) => c.id === "160-4-b") &&
    CAUSALES.some((c) => c.id === "160-7"),
);
assert(
  "Art. 161 necesidades y desahucio",
  Boolean(causalPorId("161-necesidades")?.aplicaIas) &&
    Boolean(causalPorId("161-desahucio")?.aplicaAviso) &&
    causalPorId("159-a")?.aplicaIas === false &&
    causalPorId("160-7")?.aplicaAviso === false,
);
assert(
  "No hay causales inventadas fuera de 159/160/161",
  CAUSALES.every((c) => c.articulo === "159" || c.articulo === "160" || c.articulo === "161"),
);
assert("21 causales oficiales", CAUSALES.length === 21, String(CAUSALES.length));

console.log("\nFiniquito completo (empresa)");
assert("Un año o más: 12 meses", vigenciaUnAnioOMas("2020-01-15", "2021-01-15") === true);
assert("Menos de un año: 8 meses", vigenciaUnAnioOMas("2020-01-15", "2020-09-15") === false);

const full161 = calcularFiniquitoCompleto(
  {
    causal: "161-necesidades",
    ingreso: "2020-01-15",
    termino: "2023-08-20",
    remuneracion: 1_000_000,
    diasMes: 20,
    gratificacionArt50: true,
    diasFeriadoPendiente: 5,
    diasFeriadoProporcional: 10,
    avisoPrevio: false,
  },
  { uf: FALLBACK_UF },
);
assert(
  "Remuneración del mes 20/30",
  full161.remuneracionMes === Math.round((1_000_000 * 20) / 30),
  String(full161.remuneracionMes),
);
assert(
  "Gratificación proporcional usa tope art. 50",
  full161.gratMensual === GRATIFICACION_TOPE &&
    full161.gratificacionMes === Math.round((GRATIFICACION_TOPE * 20) / 30),
  String(full161.gratificacionMes),
);
assert(
  "Partidas obligatorias presentes",
  ["remuneracionMes", "gratificacion", "feriadoPendiente", "feriadoProporcional", "ias", "aviso"].every((k) =>
    full161.partidas.some((p) => p.key === k),
  ),
);
assert("Art. 161 completo incluye IAS y aviso", full161.ias > 0 && full161.aviso > 0);
assert("Feriado pendiente distinto del proporcional", full161.feriadoPendiente > 0 && full161.feriadoProporcional > 0);

const full159 = calcularFiniquitoCompleto(
  {
    causal: "159-b",
    ingreso: "2020-01-15",
    termino: "2023-08-20",
    remuneracion: 1_000_000,
    diasMes: 30,
    diasFeriadoPendiente: 2,
    diasFeriadoProporcional: 3,
    avisoPrevio: false,
  },
  { uf: FALLBACK_UF },
);
assert("Renuncia 159-b sin IAS ni aviso", full159.ias === 0 && full159.aviso === 0 && full159.feriadoPendiente > 0);

const fullCorto = calcularFiniquitoCompleto(
  {
    causal: "161-desahucio",
    ingreso: "2020-01-15",
    termino: "2020-09-15",
    remuneracion: 1_000_000,
    diasMes: 15,
    avisoPrevio: false,
  },
  { uf: FALLBACK_UF },
);
assert("Art. 161 con menos de un año: sin IAS, con aviso", fullCorto.ias === 0 && fullCorto.aviso > 0);

const namedSueldo = calcularSueldo(
  {
    sueldoBase: 1_000_000,
    afp: "modelo",
    salud: "fonasa",
    contrato: "indefinido",
    haberesExtra: [
      { nombre: "Bono producción", monto: 50000, imponible: true },
      { nombre: "Asignación de movilización extra", monto: 10000, imponible: false },
    ],
  },
  { uf: FALLBACK_UF },
);
assert(
  "Haber nombrado imponible entra a AFP",
  namedSueldo.imponible === 1_050_000,
  String(namedSueldo.imponible),
);
assert(
  "Haber nombrado no imponible no entra a AFP y sí al líquido",
  namedSueldo.imponible === 1_050_000 && namedSueldo.liquido === namedSueldo.totalHaberes - namedSueldo.totalDescuentos,
);
assert(
  "Líneas de haberes incluyen el nombre",
  namedSueldo.haberes.some((h) => h.label === "Bono producción" && h.monto === 50000),
);

console.log("\nCSV y RUT");
const csv = parseTrabajadoresCsv(
  "nombre,rut,cargo,sueldo_base,afp,salud,contrato,colacion\nAna,12345678-5,Admin,1000000,modelo,fonasa,indefinido,50000\n",
);
assert("CSV parsea 1 trabajador", csv.length === 1 && csv[0].sueldoBase === 1_000_000);
const csvNamed = parseTrabajadoresCsv(
  readFileSync(join(root, "ejemplos/trabajadores.csv"), "utf8"),
);
assert("CSV ejemplo tiene filas", csvNamed.length >= 2);
assert(
  "CSV ejemplo bonos nombrados imponible y no",
  csvNamed[0].haberesExtra?.length >= 2 &&
    csvNamed[0].haberesExtra[0].imponible === true &&
    csvNamed[0].haberesExtra[1].imponible === false &&
    csvNamed[0].haberesExtra[0].nombre &&
    csvNamed[0].haberesExtra[1].nombre,
  JSON.stringify(csvNamed[0].haberesExtra),
);
{
  const { CSV_CABECERA } = await import("../js/csv.js");
  const { readXlsxFirstSheet: readXlsxSheet } = await import("../js/xlsx.js");
  const publicado = readFileSync(join(root, "ejemplos/trabajadores.csv"), "utf8");
  const headerPub = publicado.trim().split(/\r?\n/)[0];
  assert("CSV ejemplo encabezado = CSV_CABECERA", headerPub === CSV_CABECERA, headerPub);
  assert(
    "CSV ejemplo fechaIngreso y jornada",
    csvNamed.length === 3 &&
      csvNamed.every((t) => t.fechaIngreso && t.jornada === 42),
    JSON.stringify(csvNamed.map((t) => ({ f: t.fechaIngreso, j: t.jornada }))),
  );
  const liqs = csvNamed.map((t) => calcularSueldo(t, { uf: FALLBACK_UF }).liquido);
  assert(
    "CSV ejemplo líquidos Ana/Luis/Camila",
    liqs[0] === 988656 && liqs[1] === 988031 && liqs[2] === 1570949,
    JSON.stringify(liqs),
  );
  const xlsxEj = await readXlsxSheet(
    new Uint8Array(readFileSync(join(root, "ejemplos/trabajadores.xlsx"))),
  );
  const fromXlsx = parseTrabajadoresCsv(
    xlsxEj.map((row) => row.join(",")).join("\n"),
  );
  assert(
    "XLSX ejemplo misma nómina que CSV",
    fromXlsx.length === 3 &&
      fromXlsx[0].nombre === csvNamed[0].nombre &&
      fromXlsx[2].nombre === csvNamed[2].nombre,
  );
}
assert("RUT 12.345.678-5 válido", validarRut("12.345.678-5"));
assert("DV RUT 12345678", dvRut("12345678") === "5");

console.log("\nXLSX pago masivo y cupo Gratis");
const { writeXlsx, readXlsxFirstSheet } = await import("../js/xlsx.js");
const { xlsxPagoMasivo, xlsxPagoEjemplo, splitRut } = await import("../js/pago.js");
const { puedeEmitir, puedeCargaMasiva, GRATIS_LIMITE, isPro } = await import("../js/plan.js");

const xlsxBytes = writeXlsx([
  {
    name: "Haberes",
    rows: [
      ["nombre", "rut", "monto"],
      ["Ana Pérez", "12.345.678-5", 818200],
    ],
  },
]);
assert("xlsx zip PK", xlsxBytes[0] === 0x50 && xlsxBytes[1] === 0x4b);
const round = await readXlsxFirstSheet(xlsxBytes);
assert(
  "xlsx roundtrip",
  round[0]?.[0] === "nombre" && round[1]?.[0] === "Ana Pérez" && String(round[1]?.[2]) === "818200",
  JSON.stringify(round),
);

const pagoBytes = xlsxPagoMasivo({
  trabajadores: [
    {
      nombre: "Ana Pérez",
      rut: "12.345.678-5",
      sueldoBase: 1_000_000,
      afp: "modelo",
      salud: "fonasa",
      contrato: "indefinido",
      banco: "001",
      tipoCuenta: "corriente",
      nroCuenta: "12345678",
      email: "ana@empresa.cl",
    },
  ],
  indicadores: { uf: FALLBACK_UF },
  glosa: "Sueldo agosto 2026",
});
assert("xlsx pago masivo no vacío", pagoBytes.length > 500);
const pagoSheet = await readXlsxFirstSheet(pagoBytes);
assert(
  "xlsx canónico tiene líquido",
  pagoSheet[0]?.[0] === "nombre" &&
    pagoSheet[1]?.[0] === "Ana Pérez" &&
    Number(pagoSheet[1]?.[6]) === 818200 &&
    String(pagoSheet[1]?.[7]).includes("agosto"),
  JSON.stringify(pagoSheet[1]),
);
assert("xlsx ejemplo vacío", xlsxPagoEjemplo().length > 400);
assert("split RUT", splitRut("12.345.678-5").cuerpo === "12345678" && splitRut("12.345.678-5").dv === "5");

const gratisEmp = { plan: "gratis", movimientos: {} };
assert("Gratis permite 1 movimiento", puedeEmitir(gratisEmp, { tipo: "liquidacion", keys: ["a"] }).ok);
assert("Gratis bloquea 2 a la vez", puedeEmitir(gratisEmp, { tipo: "liquidacion", keys: ["a", "b"] }).ok === false);
assert("Gratis bloquea carga masiva", puedeCargaMasiva(gratisEmp).ok === false);
const lleno = {
  plan: "gratis",
  movimientos: {
    [`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`]: Array.from(
      { length: GRATIS_LIMITE },
      (_, i) => ({ tipo: "liquidacion", key: `k${i}` }),
    ),
  },
};
assert("Gratis bloquea el 6º", puedeEmitir(lleno, { tipo: "liquidacion", keys: ["nuevo"] }).ok === false);
assert("Pro ilimitado", puedeEmitir({ plan: "pro" }, { tipo: "liquidacion", keys: ["a", "b", "c"] }).ok);
assert("isPro respeta vigencia", isPro({ plan: "pro", planUntil: "2099-01-01T00:00:00Z" }) === true);
assert("isPro vencido es Gratis", isPro({ plan: "pro", planUntil: "2000-01-01T00:00:00Z" }) === false);

console.log("\nIndicadores");
const fb = fallbackIndicadores();
assert("Fallback indicadores", fb.uf === FALLBACK_UF && fb.utm === FALLBACK_UTM && fb.fuente === "fallback");

console.log("\nSitio estático");
const required = [
  "index.html",
  "sueldo.html",
  "horas-extras.html",
  "vacaciones-proporcionales.html",
  "gratificacion.html",
  "impuesto-unico.html",
  "cotizaciones-previsionales.html",
  "costo-empresa.html",
  "seguro-cesantia.html",
  "trabajo-pesado.html",
  "recargo-domingo-comercio.html",
  "feriado-irrenunciable.html",
  "semana-corrida.html",
  "asignacion-familiar.html",
  "colacion-movilizacion.html",
  "viatico.html",
  "sueldo-minimo.html",
  "descuento-atrasos.html",
  "licencia-medica.html",
  "boleta-honorarios.html",
  "retencion-judicial.html",
  "apv.html",
  "sala-cuna.html",
  "postnatal-parental.html",
  "permiso-prenatal.html",
  "nulidad-despido.html",
  "fuero-maternal.html",
  "permiso-paternidad.html",
  "permiso-matrimonio.html",
  "permiso-fallecimiento.html",
  "interes-mora.html",
  "hora-lactancia.html",
  "jornada-40-horas.html",
  "feriado-anual.html",
  "feriado-progresivo.html",
  "indemnizacion-anos-servicio.html",
  "aguinaldo.html",
  "finiquito-casa-particular.html",
  "sueldo-proporcional.html",
  "indemnizacion-aviso-previo.html",
  "tutela-laboral.html",
  "despido-injustificado.html",
  "autodespido.html",
  "obra-faena.html",
  "prescripcion-laboral.html",
  "descanso-compensatorio.html",
  "inclusion-laboral.html",
  "jornada-parcial.html",
  "teletrabajo.html",
  "bandas-horarias.html",
  "pacto-4x3.html",
  "jornada-excepcional.html",
  "jornada-bisemanal.html",
  "compensacion-horas-extras.html",
  "pacto-horas-extras.html",
  "contrato-plazo-fijo.html",
  "termino-anticipado-plazo-fijo.html",
  "permiso-sin-goce.html",
  "zona-extrema.html",
  "promedio-remuneraciones.html",
  "antiguedad-laboral.html",
  "tope-imponible.html",
  "finiquito.html",
  "js/app-horas-extras.js",
  "js/app-vacaciones-proporcionales.js",
  "js/app-gratificacion.js",
  "js/app-impuesto-unico.js",
  "js/app-cotizaciones-previsionales.js",
  "js/app-costo-empresa.js",
  "js/app-seguro-cesantia.js",
  "js/app-trabajo-pesado.js",
  "js/app-recargo-domingo-comercio.js",
  "js/app-feriado-irrenunciable.js",
  "js/app-semana-corrida.js",
  "js/app-asignacion-familiar.js",
  "js/app-colacion-movilizacion.js",
  "js/app-viatico.js",
  "js/app-sueldo-minimo.js",
  "js/app-descuento-atrasos.js",
  "js/app-licencia-medica.js",
  "js/app-boleta-honorarios.js",
  "js/app-retencion-judicial.js",
  "js/app-apv.js",
  "js/app-sala-cuna.js",
  "js/app-postnatal-parental.js",
  "js/app-permiso-prenatal.js",
  "js/app-nulidad-despido.js",
  "js/app-fuero-maternal.js",
  "js/app-permiso-paternidad.js",
  "js/app-permiso-matrimonio.js",
  "js/app-permiso-fallecimiento.js",
  "js/app-interes-mora.js",
  "js/app-hora-lactancia.js",
  "js/app-jornada-40-horas.js",
  "js/app-feriado-anual.js",
  "js/app-feriado-progresivo.js",
  "js/app-indemnizacion-anos-servicio.js",
  "js/app-aguinaldo.js",
  "js/app-finiquito-casa-particular.js",
  "js/app-sueldo-proporcional.js",
  "js/app-indemnizacion-aviso-previo.js",
  "js/app-tutela-laboral.js",
  "js/app-despido-injustificado.js",
  "js/app-autodespido.js",
  "js/app-obra-faena.js",
  "js/app-prescripcion-laboral.js",
  "js/app-descanso-compensatorio.js",
  "js/app-inclusion-laboral.js",
  "js/app-jornada-parcial.js",
  "js/app-teletrabajo.js",
  "js/app-bandas-horarias.js",
  "js/app-pacto-4x3.js",
  "js/app-jornada-excepcional.js",
  "js/app-jornada-bisemanal.js",
  "js/app-compensacion-horas-extras.js",
  "js/app-pacto-horas-extras.js",
  "js/app-contrato-plazo-fijo.js",
  "js/app-termino-anticipado-plazo-fijo.js",
  "js/app-permiso-sin-goce.js",
  "js/app-zona-extrema.js",
  "js/app-promedio-remuneraciones.js",
  "js/app-antiguedad-laboral.js",
  "js/app-tope-imponible.js",
  "empresa.html",
  "privacidad.html",
  "terminos.html",
  "robots.txt",
  "favicon.ico",
  "favicon.svg",
  "css/app.css",
  "js/constants.js",
  "js/sueldo.js",
  "js/viatico.js",
  "js/feriados.js",
  "js/interes-mora.js",
  "js/prescripcion-laboral.js",
  "js/descanso-compensatorio.js",
  "js/inclusion-laboral.js",
  "js/jornada-parcial.js",
  "js/teletrabajo.js",
  "js/bandas-horarias.js",
  "js/pacto-4x3.js",
  "js/jornada-excepcional.js",
  "js/jornada-bisemanal.js",
  "js/compensacion-horas-extras.js",
  "js/pacto-horas-extras.js",
  "js/contrato-plazo-fijo.js",
  "js/termino-anticipado-plazo-fijo.js",
  "js/permiso-sin-goce.js",
  "js/zona-extrema.js",
  "js/promedio-remuneraciones.js",
  "js/antiguedad-laboral.js",
  "js/tope-imponible.js",
  "js/causales.js",
  "js/finiquito.js",
  "js/indicadores.js",
  "js/csv.js",
  "js/xlsx.js",
  "js/pago.js",
  "js/plan.js",
  "js/storage.js",
  "js/print.js",
  "js/analytics.js",
  "api/reset-request.js",
  "api/reset-confirm.js",
  "api/register.js",
  "api/login.js",
  "api/logout.js",
  "api/me.js",
  "api/_lib.js",
  "api/profile.js",
  "api/logo.js",
  "api/firma.js",
  "api/documento.js",
  "api/_r2.js",
  "api/storage.js",
  "api/_pdf.js",
  "api/_admin.js",
  "api/_admin-ops.js",
  "api/_ga4.js",
  "api/admin-login.js",
  "api/admin-producto.js",
  "api/admin-trafico.js",
  "api/_outbound.js",
  "api/admin-outbound.js",
  "api/movimiento.js",
  "sql/001.sql",
  "sql/002.sql",
  "sql/003.sql",
  "sql/004.sql",
  "sql/005.sql",
  "sql/007.sql",
  "sql/008.sql",
  "sql/009.sql",
  "como.html",
  "precios.html",
  "admin.html",
  "js/theme.js",
  "js/picker.js",
  "js/checkout.js",
  "js/app-precios.js",
  "api/checkout.js",
  "api/mp-webhook.js",
  "api/_mp.js",
  "api/flow-webhook.js",
  "api/_flow.js",
  "api/sitemap.js",
  "api/_sitemap.js",
  ".vercelignore",
  "js/ui.js",
  "js/overlay.js",
  "reset.html",
  "vercel.json",
  "scripts/verify.mjs",
];
for (const f of required) {
  assert(`existe ${f}`, existsSync(join(root, f)));
}

const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
assert("vercel.json cleanUrls", vercel.cleanUrls === true);
assert("vercel.json trailingSlash false", vercel.trailingSlash === false);
assert(
  "vercel.json headers /admin",
  JSON.stringify(vercel.headers || []).includes("/admin") &&
    JSON.stringify(vercel.headers || []).includes("noindex"),
);
assert(
  "vercel.json 301 /como-funciona → /como",
  Array.isArray(vercel.redirects) &&
    vercel.redirects.some(
      (r) => r.source === "/como-funciona" && r.destination === "/como" && r.permanent === true,
    ),
);
assert(
  "vercel.json no redirige /guias al home",
  Array.isArray(vercel.redirects) &&
    !vercel.redirects.some((r) => r.source === "/guias" && r.destination === "/"),
);
assert(
  "vercel.json rewrite /sitemap.xml → /api/sitemap",
  Array.isArray(vercel.rewrites) &&
    vercel.rewrites.some((r) => r.source === "/sitemap.xml" && r.destination === "/api/sitemap"),
);
assert(
  "vercel.json rewrite /sitemap → /api/sitemap",
  Array.isArray(vercel.rewrites) &&
    vercel.rewrites.some((r) => r.source === "/sitemap" && r.destination === "/api/sitemap"),
);
assert(
  "vercel.json Content-Type sitemap text/xml",
  JSON.stringify(vercel.headers || []).includes("/sitemap.xml") &&
    JSON.stringify(vercel.headers || []).includes("text/xml; charset=utf-8"),
);
const vercelIgnore = readFileSync(join(root, ".vercelignore"), "utf8");
assert(
  ".vercelignore excluye sitemap.xml estático",
  /^\s*sitemap\.xml\s*$/m.test(vercelIgnore),
);
assert(
  ".vercelignore excluye docs/ (memo interno fuera del deploy)",
  /^\s*docs\/\s*$/m.test(vercelIgnore),
);
assert(
  ".gitignore excluye /sitemap.xml",
  /^\s*\/sitemap\.xml\s*$/m.test(readFileSync(join(root, ".gitignore"), "utf8")),
);
assert("sitemap.xml no está en la raíz", !existsSync(join(root, "sitemap.xml")));

const htmlFiles = [
  "index.html",
  "sueldo.html",
  "horas-extras.html",
  "vacaciones-proporcionales.html",
  "gratificacion.html",
  "impuesto-unico.html",
  "cotizaciones-previsionales.html",
  "costo-empresa.html",
  "seguro-cesantia.html",
  "trabajo-pesado.html",
  "recargo-domingo-comercio.html",
  "feriado-irrenunciable.html",
  "semana-corrida.html",
  "asignacion-familiar.html",
  "colacion-movilizacion.html",
  "viatico.html",
  "sueldo-minimo.html",
  "descuento-atrasos.html",
  "licencia-medica.html",
  "boleta-honorarios.html",
  "retencion-judicial.html",
  "apv.html",
  "sala-cuna.html",
  "postnatal-parental.html",
  "permiso-prenatal.html",
  "nulidad-despido.html",
  "fuero-maternal.html",
  "permiso-paternidad.html",
  "permiso-matrimonio.html",
  "permiso-fallecimiento.html",
  "interes-mora.html",
  "hora-lactancia.html",
  "jornada-40-horas.html",
  "feriado-anual.html",
  "feriado-progresivo.html",
  "indemnizacion-anos-servicio.html",
  "aguinaldo.html",
  "finiquito-casa-particular.html",
  "sueldo-proporcional.html",
  "indemnizacion-aviso-previo.html",
  "tutela-laboral.html",
  "despido-injustificado.html",
  "autodespido.html",
  "obra-faena.html",
  "prescripcion-laboral.html",
  "descanso-compensatorio.html",
  "inclusion-laboral.html",
  "jornada-parcial.html",
  "teletrabajo.html",
  "bandas-horarias.html",
  "pacto-4x3.html",
  "jornada-excepcional.html",
  "jornada-bisemanal.html",
  "compensacion-horas-extras.html",
  "pacto-horas-extras.html",
  "contrato-plazo-fijo.html",
  "termino-anticipado-plazo-fijo.html",
  "permiso-sin-goce.html",
  "zona-extrema.html",
  "promedio-remuneraciones.html",
  "antiguedad-laboral.html",
  "tope-imponible.html",
  "finiquito.html",
  "empresa.html",
  "privacidad.html",
  "terminos.html",
  "reset.html",
  "como.html",
  "precios.html",
  "admin.html",
];
for (const f of htmlFiles) {
  const html = readFileSync(join(root, f), "utf8");
  const disclaimerOk =
    /Direcci[oó]n del Trabajo/i.test(html) &&
    /Previred/i.test(html) &&
    /asesor[ií]a legal/i.test(html) &&
    /Haberes/.test(html) &&
    !/inteligencia artificial/i.test(html) &&
    !/generada por IA/i.test(html) &&
    !/Estimaci[oó]n con IA/i.test(html) &&
    !/estimaci[oó]n de software/i.test(html) &&
    (f === "cotizaciones-previsionales.html"
      ? !/Documento generado por Haberes/.test(html)
      : /Documento generado por Haberes/.test(html));
  assert(`${f} disclaimer legal / no DT / no Previred`, disclaimerOk);
  assert(`${f} canonical haberes.cl`, /rel="canonical" href="https:\/\/www\.haberes\.cl/.test(html));
  assert(`${f} og:url`, /property="og:url" content="https:\/\/www\.haberes\.cl/.test(html));
  assert(`${f} GTM-PCR596Z2`, /GTM-PCR596Z2/.test(html));
  assert(`${f} carga analytics.js`, /src="js\/analytics\.js"/.test(html));
  assert(`${f} no define GA4 falso`, !/HABERES_GA4\s*=\s*["']G-/.test(html));
  assert(`${f} enlace privacidad`, /href="\/privacidad"/.test(html));
  assert(`${f} enlace términos`, /href="\/terminos"/.test(html));
  assert(
    `${f} crédito lx3.ai`,
    /Proyecto desarrollado por/.test(html) &&
      /href="https:\/\/lx3\.ai"/.test(html) &&
      /mailto:contacto@lx3\.ai/.test(html),
  );
  assert(`${f} sin formulario de consulta laboral`, !/<form[^>][^>]*consulta|consulta laboral<\/(h|label)/i.test(html));
  assert(
    `${f} tema día/noche`,
    /haberes:theme/.test(html) && /data-theme-toggle/.test(html),
  );
  assert(`${f} toggle sol/luna`, /ic-sun/.test(html) && /ic-moon/.test(html));
  assert(`${f} sin prefers-color-scheme`, !/prefers-color-scheme/.test(html));
  assert(
    `${f} hamburguesa y cajón`,
    /data-nav-burger/.test(html) &&
      /id="navDrawer"/.test(html) &&
      /data-nav-drawer/.test(html) &&
      /data-nav-scrim/.test(html) &&
      /data-nav-close/.test(html) &&
      /Cerrar/.test(html),
  );
  const header = html.match(/<header class="site-header">[\s\S]*?<\/header>/);
  assert(
    `${f} cajón fuera de .site-header`,
    Boolean(header) && !/data-nav-drawer/.test(header[0]) && /data-nav-drawer/.test(html),
  );
  assert(
    `${f} chrome Cómo, Precios y Empezar gratis`,
    /href="\/como"/.test(header[0]) &&
      /href="\/precios"/.test(header[0]) &&
      /Empezar gratis/.test(header[0]) &&
      !/Para mi empresa/.test(header[0]) &&
      !/Pagar con Mercado Pago/.test(header[0]) &&
      !/Pagar con Flow/.test(header[0]),
  );
  assert(`${f} script de app con módulos`, /type="module"[^>]*js\/app-/.test(html));
  assert(`${f} favicon.svg`, /favicon\.svg" type="image\/svg\+xml"/.test(html));
  assert(`${f} favicon.ico`, /favicon\.ico" sizes="32x32"/.test(html));
}

console.log("\nNavegación móvil");
const appEntries = [
  "js/app-home.js",
  "js/app-sueldo.js",
  "js/app-horas-extras.js",
  "js/app-vacaciones-proporcionales.js",
  "js/app-gratificacion.js",
  "js/app-impuesto-unico.js",
  "js/app-cotizaciones-previsionales.js",
  "js/app-costo-empresa.js",
  "js/app-seguro-cesantia.js",
  "js/app-trabajo-pesado.js",
  "js/app-recargo-domingo-comercio.js",
  "js/app-feriado-irrenunciable.js",
  "js/app-semana-corrida.js",
  "js/app-asignacion-familiar.js",
  "js/app-colacion-movilizacion.js",
  "js/app-viatico.js",
  "js/app-sueldo-minimo.js",
  "js/app-descuento-atrasos.js",
  "js/app-licencia-medica.js",
  "js/app-boleta-honorarios.js",
  "js/app-retencion-judicial.js",
  "js/app-apv.js",
  "js/app-sala-cuna.js",
  "js/app-postnatal-parental.js",
  "js/app-permiso-prenatal.js",
  "js/app-nulidad-despido.js",
  "js/app-fuero-maternal.js",
  "js/app-permiso-paternidad.js",
  "js/app-permiso-matrimonio.js",
  "js/app-permiso-fallecimiento.js",
  "js/app-interes-mora.js",
  "js/app-hora-lactancia.js",
  "js/app-jornada-40-horas.js",
  "js/app-feriado-anual.js",
  "js/app-feriado-progresivo.js",
  "js/app-indemnizacion-anos-servicio.js",
  "js/app-aguinaldo.js",
  "js/app-finiquito-casa-particular.js",
  "js/app-sueldo-proporcional.js",
  "js/app-indemnizacion-aviso-previo.js",
  "js/app-tutela-laboral.js",
  "js/app-despido-injustificado.js",
  "js/app-autodespido.js",
  "js/app-obra-faena.js",
  "js/app-prescripcion-laboral.js",
  "js/app-descanso-compensatorio.js",
  "js/app-inclusion-laboral.js",
  "js/app-jornada-parcial.js",
  "js/app-teletrabajo.js",
  "js/app-bandas-horarias.js",
  "js/app-pacto-4x3.js",
  "js/app-jornada-excepcional.js",
  "js/app-jornada-bisemanal.js",
  "js/app-compensacion-horas-extras.js",
  "js/app-pacto-horas-extras.js",
  "js/app-contrato-plazo-fijo.js",
  "js/app-termino-anticipado-plazo-fijo.js",
  "js/app-permiso-sin-goce.js",
  "js/app-zona-extrema.js",
  "js/app-promedio-remuneraciones.js",
  "js/app-antiguedad-laboral.js",
  "js/app-tope-imponible.js",
  "js/app-finiquito.js",
  "js/app-empresa.js",
  "js/app-admin.js",
  "js/app-reset.js",
  "js/app-precios.js",
];
for (const f of appEntries) {
  assert(`${f} llama wireNav()`, /wireNav\(\s*\)/.test(readFileSync(join(root, f), "utf8")));
}
const uiSrc = readFileSync(join(root, "js/ui.js"), "utf8");
assert("ui.js define wireDrawer", /function wireDrawer/.test(uiSrc) && /export function wireNav/.test(uiSrc));
assert(
  "ui.js hidrata cuenta en la cabecera",
  /hydrateAccountNav/.test(uiSrc) && /refreshAccountNav/.test(uiSrc) && /data-nav-salir/.test(uiSrc),
);
assert("ui.js monta el cajón en document.body", /document\.body\.append\(\s*drawer\s*\)/.test(uiSrc));
assert(
  "ui.js abre/cierra con el atributo hidden",
  /removeAttribute\(\s*["']hidden["']\s*\)/.test(uiSrc) &&
    /setAttribute\(\s*["']hidden["']/.test(uiSrc) &&
    /data-nav-close/.test(uiSrc) &&
    /data-nav-scrim/.test(uiSrc) &&
    /Escape/.test(uiSrc),
);
assert("ui.js no usa dialog nativo para el menú", !/showModal|HTMLDialogElement|createElement\(\s*["']dialog["']\)/.test(uiSrc));

const robots = readFileSync(join(root, "robots.txt"), "utf8");
assert("robots User-agent *", /User-agent:\s*\*/i.test(robots));
assert("robots Allow /", /Allow:\s*\//.test(robots));
assert("robots Disallow /admin", /Disallow:\s*\/admin/.test(robots));
assert("robots Disallow /api", /Disallow:\s*\/api/.test(robots));
assert("robots Disallow /docs", /Disallow:\s*\/docs/.test(robots));
assert("robots no Disallow /guias ni calculadoras", !/Disallow:\s*\/guias/.test(robots) && !/Disallow:\s*\/sueldo/.test(robots) && !/Disallow:\s*\/finiquito/.test(robots) && !/Disallow:\s*\/horas-extras/.test(robots) && !/Disallow:\s*\/vacaciones-proporcionales/.test(robots) && !/Disallow:\s*\/gratificacion/.test(robots) && !/Disallow:\s*\/impuesto-unico/.test(robots) && !/Disallow:\s*\/cotizaciones-previsionales/.test(robots) && !/Disallow:\s*\/costo-empresa/.test(robots) && !/Disallow:\s*\/seguro-cesantia/.test(robots) && !/Disallow:\s*\/trabajo-pesado/.test(robots) && !/Disallow:\s*\/nulidad-despido/.test(robots) && !/Disallow:\s*\/tutela-laboral/.test(robots) && !/Disallow:\s*\/despido-injustificado/.test(robots) && !/Disallow:\s*\/autodespido/.test(robots) && !/Disallow:\s*\/obra-faena/.test(robots) && !/Disallow:\s*\/prescripcion-laboral/.test(robots) && !/Disallow:\s*\/descanso-compensatorio/.test(robots) && !/Disallow:\s*\/recargo-domingo-comercio/.test(robots) && !/Disallow:\s*\/feriado-irrenunciable/.test(robots) && !/Disallow:\s*\/feriado-anual/.test(robots) && !/Disallow:\s*\/semana-corrida/.test(robots) && !/Disallow:\s*\/asignacion-familiar/.test(robots) && !/Disallow:\s*\/colacion-movilizacion/.test(robots) && !/Disallow:\s*\/feriado-progresivo/.test(robots) && !/Disallow:\s*\/indemnizacion-anos-servicio/.test(robots) && !/Disallow:\s*\/aguinaldo/.test(robots) && !/Disallow:\s*\/finiquito-casa-particular/.test(robots) && !/Disallow:\s*\/sueldo-proporcional/.test(robots) && !/Disallow:\s*\/sueldo-minimo/.test(robots) && !/Disallow:\s*\/descuento-atrasos/.test(robots) && !/Disallow:\s*\/licencia-medica/.test(robots) && !/Disallow:\s*\/boleta-honorarios/.test(robots) && !/Disallow:\s*\/retencion-judicial/.test(robots) && !/Disallow:\s*\/apv/.test(robots) && !/Disallow:\s*\/sala-cuna/.test(robots) && !/Disallow:\s*\/postnatal-parental/.test(robots) && !/Disallow:\s*\/permiso-prenatal/.test(robots) && !/Disallow:\s*\/fuero-maternal/.test(robots) && !/Disallow:\s*\/permiso-paternidad/.test(robots) && !/Disallow:\s*\/permiso-matrimonio/.test(robots) && !/Disallow:\s*\/permiso-fallecimiento/.test(robots) && !/Disallow:\s*\/interes-mora/.test(robots) && !/Disallow:\s*\/hora-lactancia/.test(robots) && !/Disallow:\s*\/jornada-40-horas/.test(robots) && !/Disallow:\s*\/jornada-parcial/.test(robots) && !/Disallow:\s*\/teletrabajo/.test(robots) && !/Disallow:\s*\/bandas-horarias/.test(robots) && !/Disallow:\s*\/pacto-4x3/.test(robots) && !/Disallow:\s*\/jornada-excepcional/.test(robots) && !/Disallow:\s*\/jornada-bisemanal/.test(robots) && !/Disallow:\s*\/compensacion-horas-extras/.test(robots) && !/Disallow:\s*\/pacto-horas-extras/.test(robots) && !/Disallow:\s*\/contrato-plazo-fijo/.test(robots) && !/Disallow:\s*\/termino-anticipado-plazo-fijo/.test(robots) && !/Disallow:\s*\/permiso-sin-goce/.test(robots) && !/Disallow:\s*\/zona-extrema/.test(robots) && !/Disallow:\s*\/promedio-remuneraciones/.test(robots) && !/Disallow:\s*\/antiguedad-laboral/.test(robots) && !/Disallow:\s*\/tope-imponible/.test(robots) && !/Disallow:\s*\/indemnizacion-aviso-previo/.test(robots) && !/Disallow:\s*\/inclusion-laboral/.test(robots));
assert("robots Sitemap", /Sitemap:\s*https:\/\/www\.haberes\.cl\/sitemap\.xml/.test(robots));

const { seoPaths, GUIDE_SLUGS, GUIDES, CAUSAL_PAGES, BASE_PATHS, lastmodForPath } = await import("../content/registry.js");
const { buildSitemapXml } = await import("../api/_sitemap.js");
const sitemap = buildSitemapXml();
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const expectedFromRegistry = seoPaths().map((p) =>
  p === "/" ? "https://www.haberes.cl/" : `https://www.haberes.cl${p}`,
);
assert(
  "sitemap URLs = registro SEO (base + guías + 21 causales)",
  locs.length === expectedFromRegistry.length &&
    expectedFromRegistry.every((u) => locs.includes(u)) &&
    GUIDE_SLUGS.length >= 16 &&
    CAUSAL_PAGES.length === 21 &&
    BASE_PATHS.includes("/sueldo") &&
    BASE_PATHS.includes("/finiquito") &&
    BASE_PATHS.includes("/horas-extras") &&
    BASE_PATHS.includes("/vacaciones-proporcionales") &&
    BASE_PATHS.includes("/gratificacion") &&
    BASE_PATHS.includes("/impuesto-unico") &&
    BASE_PATHS.includes("/cotizaciones-previsionales") &&
    BASE_PATHS.includes("/costo-empresa") &&
    BASE_PATHS.includes("/seguro-cesantia") &&
    BASE_PATHS.includes("/trabajo-pesado") &&
    BASE_PATHS.includes("/recargo-domingo-comercio") &&
    BASE_PATHS.includes("/feriado-irrenunciable") &&
    BASE_PATHS.includes("/feriado-anual") &&
    BASE_PATHS.includes("/semana-corrida") &&
    BASE_PATHS.includes("/asignacion-familiar") &&
    BASE_PATHS.includes("/colacion-movilizacion") &&
    BASE_PATHS.includes("/viatico") &&
    BASE_PATHS.includes("/feriado-progresivo") &&
    BASE_PATHS.includes("/indemnizacion-anos-servicio") &&
    BASE_PATHS.includes("/aguinaldo") &&
    BASE_PATHS.includes("/finiquito-casa-particular") &&
    BASE_PATHS.includes("/sueldo-proporcional") &&
    BASE_PATHS.includes("/sueldo-minimo") &&
    BASE_PATHS.includes("/descuento-atrasos") &&
    BASE_PATHS.includes("/licencia-medica") &&
    BASE_PATHS.includes("/boleta-honorarios") &&
    BASE_PATHS.includes("/retencion-judicial") &&
    BASE_PATHS.includes("/apv") &&
    BASE_PATHS.includes("/sala-cuna") &&
    BASE_PATHS.includes("/postnatal-parental") &&
    BASE_PATHS.includes("/permiso-prenatal") &&
    BASE_PATHS.includes("/fuero-maternal") &&
    BASE_PATHS.includes("/permiso-paternidad") &&
    BASE_PATHS.includes("/permiso-matrimonio") &&
    BASE_PATHS.includes("/permiso-fallecimiento") &&
    BASE_PATHS.includes("/interes-mora") &&
    BASE_PATHS.includes("/hora-lactancia") &&
    BASE_PATHS.includes("/jornada-40-horas") &&
    BASE_PATHS.includes("/indemnizacion-aviso-previo") &&
    BASE_PATHS.includes("/nulidad-despido"),
    BASE_PATHS.includes("/tutela-laboral"),
    BASE_PATHS.includes("/despido-injustificado"),
    BASE_PATHS.includes("/autodespido") &&
    BASE_PATHS.includes("/obra-faena") &&
    BASE_PATHS.includes("/prescripcion-laboral") &&
    BASE_PATHS.includes("/descanso-compensatorio") &&
    BASE_PATHS.includes("/inclusion-laboral") &&
    BASE_PATHS.includes("/jornada-parcial") &&
    BASE_PATHS.includes("/teletrabajo") &&
    BASE_PATHS.includes("/bandas-horarias") &&
    BASE_PATHS.includes("/pacto-4x3") &&
    BASE_PATHS.includes("/jornada-excepcional") &&
    BASE_PATHS.includes("/jornada-bisemanal") &&
    BASE_PATHS.includes("/compensacion-horas-extras") &&
    BASE_PATHS.includes("/pacto-horas-extras") &&
    BASE_PATHS.includes("/contrato-plazo-fijo") &&
    BASE_PATHS.includes("/termino-anticipado-plazo-fijo") &&
    BASE_PATHS.includes("/permiso-sin-goce") &&
    BASE_PATHS.includes("/zona-extrema") &&
    BASE_PATHS.includes("/promedio-remuneraciones") &&
    BASE_PATHS.includes("/antiguedad-laboral") &&
    BASE_PATHS.includes("/tope-imponible"),
  `${locs.length} vs ${expectedFromRegistry.length}`,
);
assert(
  "content/guias tiene un md por guía del registro",
  GUIDE_SLUGS.every((s) => existsSync(join(root, "content/guias", `${s}.md`))),
);
assert(
  "content/causales tiene un md por causal",
  CAUSAL_PAGES.every((p) => existsSync(join(root, "content/causales", `${p.slug}.md`))),
);
assert("docs/seo-map.md existe", existsSync(join(root, "docs/seo-map.md")));
assert(
  "memo interno de operación existe y no es página pública",
  existsSync(join(root, "docs/INTERNO-USO-DE-IA.md")) &&
    !existsSync(join(root, "ia.html")) &&
    !existsSync(join(root, "etica.html")) &&
    !existsSync(join(root, "gobernanza.html")),
);
assert(
  "sitemap sin /docs ni páginas de IA",
  !locs.some((u) => /\/docs|\/ia\b|\/etica|\/gobernanza/.test(u)),
);
assert(
  "páginas SEO tienen calculadora embebida o CTA empresa",
  GUIDE_SLUGS.every((s) => {
    const html = readFileSync(join(root, "guias", `${s}.html`), "utf8");
    return /data-seo-calc=/.test(html) && /href="\/empresa"/.test(html) && /DISCLAIMER|Inspección del Trabajo|Previred/.test(html);
  }) &&
    CAUSAL_PAGES.every((p) => {
      const html = readFileSync(join(root, "finiquito", `${p.slug}.html`), "utf8");
      return /data-seo-calc=/.test(html) && /href="\/empresa"/.test(html) && /application\/ld\+json/.test(html);
    }),
);
assert(
  "guías: cajón cerrado antes de main (no anida contenido)",
  GUIDE_SLUGS.every((s) => {
    const html = readFileSync(join(root, "guias", `${s}.html`), "utf8");
    const headerEnd = html.indexOf("</header>");
    const drawer = html.indexOf('data-nav-drawer');
    const drawerClose = html.indexOf("</div>", html.indexOf("nav-drawer-foot"));
    const main = html.indexOf("<main");
    return headerEnd > 0 && drawer > headerEnd && drawerClose > drawer && main > drawerClose;
  }),
);
assert("sitemap sin admin ni reset", !locs.some((u) => /\/admin|\/reset/.test(u)));
assert("sitemap lastmod presente", /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sitemap));
assert(
  "sitemap lastmod por URL (guías espesadas 2026-08-18 y 2026-08-19)",
  lastmodForPath("/guias/liquidacion-de-sueldo") === "2026-08-18" &&
    lastmodForPath("/guias/finiquito") === "2026-08-18" &&
    lastmodForPath("/guias/impuesto-unico") === "2026-08-18" &&
    lastmodForPath("/guias/carta-aviso-termino-contrato") === "2026-08-18" &&
    lastmodForPath("/guias/gratificacion-legal") === "2026-08-18" &&
    lastmodForPath("/guias/indemnizacion-por-anos-de-servicio") === "2026-08-19" &&
    lastmodForPath("/guias/semana-corrida") === "2026-08-27" &&
    lastmodForPath("/guias/aguinaldo-fiestas-patrias") === "2026-08-30" &&
    lastmodForPath("/guias/horas-extras") === "2026-08-31" &&
    lastmodForPath("/guias/me-reservo-el-derecho-en-el-finiquito") === "2026-09-07" &&
    lastmodForPath("/guias/vacaciones-proporcionales") === "2026-09-14" &&
    lastmodForPath("/guias/liquidacion-de-sueldo-y-previred") === "2026-09-21" &&
    lastmodForPath("/guias") === "2026-09-21" &&
    /<loc>https:\/\/www\.haberes\.cl\/guias\/liquidacion-de-sueldo<\/loc>\s*<lastmod>2026-08-18<\/lastmod>/.test(sitemap) &&
    /<loc>https:\/\/www\.haberes\.cl\/guias\/gratificacion-legal<\/loc>\s*<lastmod>2026-08-18<\/lastmod>/.test(sitemap) &&
    /<loc>https:\/\/www\.haberes\.cl\/guias\/indemnizacion-por-anos-de-servicio<\/loc>\s*<lastmod>2026-08-19<\/lastmod>/.test(sitemap) &&
    /<loc>https:\/\/www\.haberes\.cl\/guias\/semana-corrida<\/loc>\s*<lastmod>2026-08-27<\/lastmod>/.test(sitemap) &&
    /<loc>https:\/\/www\.haberes\.cl\/guias\/aguinaldo-fiestas-patrias<\/loc>\s*<lastmod>2026-08-30<\/lastmod>/.test(sitemap) &&
    /<loc>https:\/\/www\.haberes\.cl\/guias\/horas-extras<\/loc>\s*<lastmod>2026-08-31<\/lastmod>/.test(sitemap) &&
    /<loc>https:\/\/www\.haberes\.cl\/guias\/me-reservo-el-derecho-en-el-finiquito<\/loc>\s*<lastmod>2026-09-07<\/lastmod>/.test(sitemap) &&
    /<loc>https:\/\/www\.haberes\.cl\/guias\/vacaciones-proporcionales<\/loc>\s*<lastmod>2026-09-14<\/lastmod>/.test(sitemap) &&
    /<loc>https:\/\/www\.haberes\.cl\/guias\/liquidacion-de-sueldo-y-previred<\/loc>\s*<lastmod>2026-09-21<\/lastmod>/.test(sitemap) &&
    /<loc>https:\/\/www\.haberes\.cl\/guias<\/loc>\s*<lastmod>2026-09-21<\/lastmod>/.test(sitemap),
);
assert("sin ruta /blog ni /noticias", !existsSync(join(root, "blog.html")) && !existsSync(join(root, "noticias.html")));
assert("sitemap sin .html (cleanUrls)", !locs.some((u) => u.endsWith(".html")));
assert(
  "sitemap cada URL tiene archivo",
  locs.every((u) => {
    const path = u.replace("https://www.haberes.cl", "").replace(/\/$/, "") || "/index";
    const file =
      path === "/index" || path === ""
        ? join(root, "index.html")
        : join(root, path.slice(1) + ".html");
    return existsSync(file);
  }),
);
assert(
  "guías y causales enlazan favicon.ico y svg",
  GUIDE_SLUGS.every((s) => {
    const html = readFileSync(join(root, "guias", `${s}.html`), "utf8");
    return /href="\.\.\/favicon\.ico"/.test(html) && /href="\.\.\/favicon\.svg"/.test(html);
  }) &&
    CAUSAL_PAGES.every((p) => {
      const html = readFileSync(join(root, "finiquito", `${p.slug}.html`), "utf8");
      return /href="\.\.\/favicon\.ico"/.test(html) && /href="\.\.\/favicon\.svg"/.test(html);
    }),
);
const faviconIco = readFileSync(join(root, "favicon.ico"));
assert(
  "favicon.ico es ICO 32×32",
  faviconIco[0] === 0 &&
    faviconIco[1] === 0 &&
    faviconIco[2] === 1 &&
    faviconIco[3] === 0 &&
    faviconIco.length > 16,
);
const faviconSvg = readFileSync(join(root, "favicon.svg"), "utf8");
assert(
  "favicon.svg tile 32×32 rx 8",
  /viewBox="0 0 32 32"/.test(faviconSvg) && /rx="8"/.test(faviconSvg),
);
assert(
  "favicon.svg geometría de dos columnas, no texto",
  (faviconSvg.match(/<rect /g) || []).length >= 11 &&
    !/<text[\s>]/.test(faviconSvg) &&
    !/<image[\s>]/.test(faviconSvg) &&
    !/data:image\//.test(faviconSvg),
);
assert(
  "favicon.svg colores tile crema",
  /#12382c/.test(faviconSvg) && /#f6f4ef/.test(faviconSvg),
);

console.log("\nGuías: disclaimer según tema");
function noticeDisclaimer(html) {
  const m = html.match(/<p class="notice u-mt-6">([\s\S]*?)<\/p>/);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

const guiaHtmlFiles = readdirSync(join(root, "guias")).filter((f) => f.endsWith(".html"));
assert("hay páginas en guias/", guiaHtmlFiles.length >= 7, String(guiaHtmlFiles.length));
for (const f of guiaHtmlFiles) {
  const html = readFileSync(join(root, "guias", f), "utf8");
  const notice = noticeDisclaimer(html);
  const esFiniquito = /finiquito/.test(f);
  if (esFiniquito) {
    assert(
      `guias/${f} disclaimer de finiquito`,
      notice.includes("Inspección del Trabajo") &&
        /ratificaci[oó]n del finiquito/i.test(notice) &&
        /pago efectivo/i.test(notice) &&
        !notice.includes("Documento generado por Haberes"),
    );
  } else {
    assert(
      `guias/${f} disclaimer de liquidación`,
      notice.includes("Documento generado por Haberes") &&
        /Direcci[oó]n del Trabajo/i.test(notice) &&
        /Previred/i.test(notice) &&
        /asesor[ií]a legal ni previsional/i.test(notice) &&
        !/ratificaci[oó]n del finiquito/i.test(notice),
    );
  }
}

for (const f of readdirSync(join(root, "finiquito")).filter((x) => x.endsWith(".html"))) {
  const html = readFileSync(join(root, "finiquito", f), "utf8");
  const notice = noticeDisclaimer(html);
  assert(
    `finiquito/${f} disclaimer de finiquito`,
    notice.includes("Inspección del Trabajo") &&
      /ratificaci[oó]n del finiquito/i.test(notice) &&
      /pago efectivo/i.test(notice),
  );
}

const genContent = readFileSync(join(root, "scripts/gen-content-seo.mjs"), "utf8");
assert(
  "gen-content-seo elige disclaimer según path",
  /disclaimerForPath/.test(genContent) &&
    /DISCLAIMER, DISCLAIMER_FINIQUITO/.test(genContent) &&
    /\/finiquito\/\.test\(canonical\)/.test(genContent),
);

assert("gen-sitemap.mjs existe", existsSync(join(root, "scripts/gen-sitemap.mjs")));
assert(
  "package.json script sitemap",
  /"sitemap":\s*"node scripts\/gen-sitemap\.mjs"/.test(readFileSync(join(root, "package.json"), "utf8")),
);
const genSitemapSrc = readFileSync(join(root, "scripts/gen-sitemap.mjs"), "utf8");
assert(
  "gen-sitemap usa api/_sitemap.js",
  /from ["']\.\.\/api\/_sitemap\.js["']/.test(genSitemapSrc),
);
assert(
  "gen-sitemap no escribe sitemap.xml en la raíz",
  !/writeFileSync/.test(genSitemapSrc),
);
const sitemapSrc = readFileSync(join(root, "api/sitemap.js"), "utf8");
assert("api/sitemap.js no usa _lib ni pg", !/from ["']\.\/_lib\.js["']/.test(sitemapSrc) && !/\bpg\b/.test(sitemapSrc));
assert(
  "api/sitemap.js Content-Type text/xml",
  /SITEMAP_CONTENT_TYPE/.test(sitemapSrc) &&
    /text\/xml; charset=utf-8/.test(readFileSync(join(root, "api/_sitemap.js"), "utf8")),
);
assert("api/sitemap.js sin Content-Disposition", !/setHeader\([^)]*content-disposition/i.test(sitemapSrc));

const analytics = readFileSync(join(root, "js/analytics.js"), "utf8");
assert(
  "analytics.js exige G- no vacío",
  /HABERES_GA4/.test(analytics) && /G-\[A-Z0-9/.test(analytics) && /if\s*\(!id/.test(analytics),
);
assert(
  "index no promete que todo corre en el navegador",
  !/Todo corre en su navegador/i.test(readFileSync(join(root, "index.html"), "utf8")),
);

console.log("\nAPI cuentas (fail closed, Argon2id)");
const prevDb = process.env.DATABASE_URL;
const prevDbUnpooled = process.env.DATABASE_URL_UNPOOLED;
const prevResend = process.env.RESEND_API_KEY;
delete process.env.DATABASE_URL;
delete process.env.DATABASE_URL_UNPOOLED;
delete process.env.RESEND_API_KEY;

function mockRes() {
  const out = { statusCode: 200, body: null, headers: {} };
  const res = {
    setHeader(k, v) {
      out.headers[k] = v;
      return res;
    },
    status(code) {
      out.statusCode = code;
      return res;
    },
    json(payload) {
      out.body = payload;
      return res;
    },
    send(payload) {
      out.body = payload;
      return res;
    },
    end(payload) {
      if (payload !== undefined) out.body = payload;
      return res;
    },
  };
  res._out = out;
  return res;
}

function mockReq(method, body, ip = "203.0.113.10") {
  return { method, body, headers: { "x-forwarded-for": ip } };
}

console.log("\nSitemap API (curl / Googlebot / sin cabeceras de navegador)");
const sitemapHandler = (await import("../api/sitemap.js")).default;
const { sitemapLocs: sitemapApiLocs, SITEMAP_CONTENT_TYPE } = await import("../api/_sitemap.js");

function invokeSitemap(req) {
  const res = mockRes();
  sitemapHandler(req, res);
  return res._out;
}

const sitemapNoHeaders = invokeSitemap({ method: "GET" });
assert("GET sitemap sin headers 200", sitemapNoHeaders.statusCode === 200);
assert(
  "GET sitemap sin headers xml urlset",
  typeof sitemapNoHeaders.body === "string" &&
    sitemapNoHeaders.body.includes('<?xml version="1.0" encoding="UTF-8"?>') &&
    sitemapNoHeaders.body.includes("<urlset") &&
    sitemapNoHeaders.body.includes("</urlset>"),
);
assert(
  "GET sitemap Content-Type text/xml",
  /text\/xml/i.test(String(sitemapNoHeaders.headers["Content-Type"] || sitemapNoHeaders.headers["content-type"] || "")) &&
    SITEMAP_CONTENT_TYPE.includes("charset=utf-8"),
);
const apiLocs = [...String(sitemapNoHeaders.body).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
assert(
  "GET sitemap mismas URLs públicas",
  sitemapApiLocs().every((u) => apiLocs.includes(u)) && apiLocs.length === sitemapApiLocs().length,
  apiLocs.join(", "),
);
assert("GET sitemap sin admin ni reset", !apiLocs.some((u) => /\/admin|\/reset/.test(u)));

const sitemapCurl = invokeSitemap({
  method: "GET",
  headers: { accept: "*/*", "user-agent": "curl/8.5.0" },
});
assert("GET sitemap curl UA 200 xml", sitemapCurl.statusCode === 200 && /<urlset/.test(String(sitemapCurl.body)));

const sitemapBot = invokeSitemap({
  method: "GET",
  headers: {
    accept: "*/*",
    "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  },
});
assert("GET sitemap Googlebot 200 xml", sitemapBot.statusCode === 200 && /<urlset/.test(String(sitemapBot.body)));

const sitemapEmpty = invokeSitemap({});
assert("GET sitemap req vacío 200 xml", sitemapEmpty.statusCode === 200 && /<urlset/.test(String(sitemapEmpty.body)));

const sitemapHead = invokeSitemap({ method: "HEAD" });
assert("HEAD sitemap 200", sitemapHead.statusCode === 200);
assert(
  "GET sitemap sin Content-Disposition",
  !Object.keys(sitemapNoHeaders.headers).some((k) => /content-disposition/i.test(k)),
);
const sitemapXmlAccept = invokeSitemap({
  method: "GET",
  headers: { accept: "application/xml", "user-agent": "Googlebot" },
});
assert(
  "GET sitemap Accept application/xml 200",
  sitemapXmlAccept.statusCode === 200 && /<urlset/.test(String(sitemapXmlAccept.body)),
);

const sitemapPost = invokeSitemap({ method: "POST" });
assert("POST sitemap 405", sitemapPost.statusCode === 405);

console.log("\nServidor local: sitemap, favicon, trailing slash");
const { handleRequest } = await import("./serve.mjs");
const { createServer } = await import("node:http");
const localSrv = createServer(handleRequest);
await new Promise((resolve) => localSrv.listen(0, "127.0.0.1", resolve));
const localPort = localSrv.address().port;
const localBase = `http://127.0.0.1:${localPort}`;

async function hitLocal(path, opts = {}) {
  const res = await fetch(localBase + path, { redirect: "manual", ...opts });
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    type: res.headers.get("content-type") || "",
    location: res.headers.get("location") || "",
    disposition: res.headers.get("content-disposition") || "",
    text: buf.toString("utf8"),
    buf,
  };
}

try {
  const pretty = await hitLocal("/sitemap.xml", {
    headers: {
      Accept: "application/xml",
      "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    },
  });
  const prettyShort = await hitLocal("/sitemap");
  const apiSm = await hitLocal("/api/sitemap");
  assert("GET /sitemap.xml 200 text/xml", pretty.status === 200 && /text\/xml/i.test(pretty.type));
  assert("GET /sitemap 200 text/xml", prettyShort.status === 200 && /text\/xml/i.test(prettyShort.type));
  assert("GET /api/sitemap 200 text/xml", apiSm.status === 200 && /text\/xml/i.test(apiSm.type));
  assert(
    "/sitemap.xml = /api/sitemap",
    pretty.text === apiSm.text && prettyShort.text === apiSm.text && /<urlset/.test(pretty.text),
  );
  assert("/sitemap.xml sin content-disposition", pretty.disposition === "");
  assert(
    "/sitemap.xml URLs = registro (incluye /guias)",
    [...pretty.text.matchAll(/<loc>/g)].length === seoPaths().length &&
      seoPaths().includes("/guias") &&
      seoPaths().length === 107,
  );
  const prettyHead = await hitLocal("/sitemap.xml", { method: "HEAD" });
  assert("HEAD /sitemap.xml 200", prettyHead.status === 200 && prettyHead.text === "");
  const icoHit = await hitLocal("/favicon.ico");
  const svgHit = await hitLocal("/favicon.svg");
  assert("GET /favicon.ico 200", icoHit.status === 200 && /icon/.test(icoHit.type) && icoHit.buf.length > 16);
  assert("GET /favicon.svg 200", svgHit.status === 200 && /svg/.test(svgHit.type));
  const docsMemo = await hitLocal("/docs/INTERNO-USO-DE-IA.md");
  const docsSeo = await hitLocal("/docs/seo-map.md");
  assert("GET /docs/INTERNO-USO-DE-IA.md 404", docsMemo.status === 404);
  assert("GET /docs/seo-map.md 404", docsSeo.status === 404);
  for (const p of ["/sueldo/", "/finiquito/", "/finiquito-casa-particular/", "/horas-extras/", "/recargo-domingo-comercio/", "/feriado-irrenunciable/", "/feriado-anual/", "/semana-corrida/", "/vacaciones-proporcionales/", "/feriado-progresivo/", "/indemnizacion-anos-servicio/", "/indemnizacion-aviso-previo/", "/nulidad-despido/", "/tutela-laboral/", "/despido-injustificado/", "/autodespido/", "/obra-faena/", "/prescripcion-laboral/", "/descanso-compensatorio/", "/inclusion-laboral/", "/jornada-parcial/", "/teletrabajo/", "/bandas-horarias/", "/pacto-4x3/", "/jornada-excepcional/", "/jornada-bisemanal/", "/compensacion-horas-extras/", "/pacto-horas-extras/", "/contrato-plazo-fijo/", "/termino-anticipado-plazo-fijo/", "/permiso-sin-goce/", "/zona-extrema/", "/promedio-remuneraciones/", "/antiguedad-laboral/", "/tope-imponible/", "/aguinaldo/", "/sueldo-proporcional/", "/sueldo-minimo/", "/descuento-atrasos/", "/licencia-medica/", "/boleta-honorarios/", "/retencion-judicial/", "/apv/", "/sala-cuna/", "/postnatal-parental/", "/permiso-prenatal/", "/fuero-maternal/", "/permiso-paternidad/", "/permiso-matrimonio/", "/permiso-fallecimiento/", "/interes-mora/", "/hora-lactancia/", "/jornada-40-horas/", "/gratificacion/", "/impuesto-unico/", "/cotizaciones-previsionales/", "/costo-empresa/", "/seguro-cesantia/", "/trabajo-pesado/", "/asignacion-familiar/", "/colacion-movilizacion/", "/viatico/", "/empresa/", "/precios/", "/como/", "/privacidad/", "/terminos/", "/guias/finiquito/"]) {
    const r = await hitLocal(p);
    assert(`301 ${p}`, r.status === 301 && r.location === p.replace(/\/+$/, ""), `${p} → ${r.status} ${r.location}`);
  }
  const guiasSlash = await hitLocal("/guias/");
  assert("301 /guias/ → /guias", guiasSlash.status === 301 && guiasSlash.location === "/guias");
  const guiasBare = await hitLocal("/guias");
  assert(
    "GET /guias 200 hub",
    guiasBare.status === 200 &&
      /Guías de liquidación y finiquito/.test(guiasBare.text) &&
      /href="\/guias\/liquidacion-de-sueldo"/.test(guiasBare.text) &&
      /href="\/guias\/finiquito"/.test(guiasBare.text) &&
      /Últimas actualizaciones/.test(guiasBare.text),
  );
  for (const p of [
    "/horas-extras",
    "/recargo-domingo-comercio",
    "/feriado-irrenunciable",
    "/feriado-anual",
    "/semana-corrida",
    "/vacaciones-proporcionales",
    "/feriado-progresivo",
    "/indemnizacion-anos-servicio",
    "/aguinaldo",
    "/finiquito-casa-particular",
    "/sueldo-proporcional",
    "/sueldo-minimo",
    "/descuento-atrasos",
    "/licencia-medica",
    "/boleta-honorarios",
    "/retencion-judicial",
    "/apv",
    "/sala-cuna",
    "/postnatal-parental",
    "/permiso-prenatal",
    "/fuero-maternal",
    "/permiso-paternidad",
    "/permiso-matrimonio",
    "/permiso-fallecimiento",
    "/interes-mora",
    "/hora-lactancia",
    "/jornada-40-horas",
    "/indemnizacion-aviso-previo",
    "/nulidad-despido",
    "/tutela-laboral",
    "/despido-injustificado",
    "/autodespido",
    "/obra-faena",
    "/prescripcion-laboral",
    "/descanso-compensatorio",
    "/inclusion-laboral",
    "/jornada-parcial",
    "/teletrabajo",
    "/bandas-horarias",
    "/pacto-4x3",
    "/jornada-excepcional",
    "/jornada-bisemanal",
    "/compensacion-horas-extras",
    "/pacto-horas-extras",
    "/contrato-plazo-fijo",
    "/termino-anticipado-plazo-fijo",
    "/permiso-sin-goce",
    "/zona-extrema",
    "/promedio-remuneraciones",
    "/antiguedad-laboral",
    "/tope-imponible",
    "/gratificacion",
    "/impuesto-unico",
    "/cotizaciones-previsionales",
    "/costo-empresa",
    "/seguro-cesantia",
    "/trabajo-pesado",
    "/asignacion-familiar",
    "/colacion-movilizacion",
    "/viatico",
    "/guias/liquidacion-de-sueldo",
    "/guias/finiquito",
    "/guias/impuesto-unico",
    "/guias/carta-aviso-termino-contrato",
    "/guias/gratificacion-legal",
    "/guias/indemnizacion-por-anos-de-servicio",
    "/guias/semana-corrida",
    "/guias/aguinaldo-fiestas-patrias",
  ]) {
    const r = await hitLocal(p);
    assert(`GET ${p} 200`, r.status === 200 && /<h1>/i.test(r.text) && /text\/html/i.test(r.type));
  }
  const noBlog = await hitLocal("/blog");
  const noNews = await hitLocal("/noticias");
  assert("GET /blog 404", noBlog.status === 404);
  assert("GET /noticias 404", noNews.status === 404);
  const aucAlias = await hitLocal("/permiso-auc");
  assert(
    "301 /permiso-auc → /permiso-matrimonio",
    aucAlias.status === 301 && aucAlias.location === "/permiso-matrimonio",
    `${aucAlias.status} ${aucAlias.location}`,
  );
  const prenatalAlias = await hitLocal("/descanso-prenatal");
  assert(
    "301 /descanso-prenatal → /permiso-prenatal",
    prenatalAlias.status === 301 && prenatalAlias.location === "/permiso-prenatal",
    `${prenatalAlias.status} ${prenatalAlias.location}`,
  );
  const despidoNuloAlias = await hitLocal("/despido-nulo");
  assert(
    "301 /despido-nulo → /nulidad-despido",
    despidoNuloAlias.status === 301 && despidoNuloAlias.location === "/nulidad-despido",
    `${despidoNuloAlias.status} ${despidoNuloAlias.location}`,
  );
  const convAlias = await hitLocal("/convalidacion-despido");
  assert(
    "301 /convalidacion-despido → /nulidad-despido",
    convAlias.status === 301 && convAlias.location === "/nulidad-despido",
    `${convAlias.status} ${convAlias.location}`,
  );
  const tutelaAlias = await hitLocal("/indemnizacion-tutela");
  assert(
    "301 /indemnizacion-tutela → /tutela-laboral",
    tutelaAlias.status === 301 && tutelaAlias.location === "/tutela-laboral",
    `${tutelaAlias.status} ${tutelaAlias.location}`,
  );
  const tutelaAlias2 = await hitLocal("/indemnizacion-derechos-fundamentales");
  assert(
    "301 /indemnizacion-derechos-fundamentales → /tutela-laboral",
    tutelaAlias2.status === 301 && tutelaAlias2.location === "/tutela-laboral",
    `${tutelaAlias2.status} ${tutelaAlias2.location}`,
  );
  const despidoAlias = await hitLocal("/recargo-despido-injustificado");
  assert(
    "301 /recargo-despido-injustificado → /despido-injustificado",
    despidoAlias.status === 301 && despidoAlias.location === "/despido-injustificado",
    `${despidoAlias.status} ${despidoAlias.location}`,
  );
  const despidoAlias2 = await hitLocal("/indemnizacion-despido-injustificado");
  assert(
    "301 /indemnizacion-despido-injustificado → /despido-injustificado",
    despidoAlias2.status === 301 && despidoAlias2.location === "/despido-injustificado",
    `${despidoAlias2.status} ${despidoAlias2.location}`,
  );
  const autodespidoAlias = await hitLocal("/despido-indirecto");
  assert(
    "301 /despido-indirecto → /autodespido",
    autodespidoAlias.status === 301 && autodespidoAlias.location === "/autodespido",
    `${autodespidoAlias.status} ${autodespidoAlias.location}`,
  );
  writeFileSync(join(root, "sitemap.xml"), "<urlset>STATIC-LEFTOVER</urlset>");
  try {
    const afterLeftover = await hitLocal("/sitemap.xml");
    assert(
      "XML estático no gana a /sitemap.xml",
      afterLeftover.status === 200 &&
        /<loc>/.test(afterLeftover.text) &&
        !afterLeftover.text.includes("STATIC-LEFTOVER"),
    );
  } finally {
    unlinkSync(join(root, "sitemap.xml"));
  }
} finally {
  await new Promise((resolve, reject) => localSrv.close((err) => (err ? reject(err) : resolve())));
}

const {
  hashPassword,
  verifyPassword,
  MIN_PASSWORD_LENGTH,
  RATE_LIMIT,
  rateLimit,
  SESSION_COOKIE,
  TOKEN_TTL_MS,
  sendSignupAvisoEmail,
  sendOpsAvisoEmail,
  signupAvisoTo,
  opsAvisoIdempotencyKey,
} = await import("../api/_lib.js");

assert("clave mínima 10", MIN_PASSWORD_LENGTH === 10, String(MIN_PASSWORD_LENGTH));
assert("rate limit 5 / 15 min", RATE_LIMIT.max === 5 && RATE_LIMIT.windowMs === 15 * 60 * 1000);
assert("reset TTL 30 min", TOKEN_TTL_MS === 30 * 60 * 1000);
assert("cookie de sesión", SESSION_COOKIE === "haberes_session");

const pwd = "tenchars!!";
const h1 = await hashPassword(pwd);
const h2 = await hashPassword(pwd);
assert("hash Argon2id", typeof h1 === "string" && h1.startsWith("$argon2id$"));
assert("parámetros Argon2id", /\$argon2id\$v=19\$m=19456,t=2,p=1\$/.test(h1));
assert("salt único por hash", h1 !== h2);
assert("verify Argon2id ok", (await verifyPassword(pwd, h1)) === true);
assert("verify Argon2id fail", (await verifyPassword("wrong-pass!", h1)) === false);

const rlKey = `verify:${Date.now()}`;
for (let i = 0; i < 5; i += 1) {
  assert(`rateLimit intento ${i + 1}`, rateLimit(rlKey) === true);
}
assert("rateLimit bloquea el 6º", rateLimit(rlKey) === false);

const registerMod = await import("../api/register.js");
const register = registerMod.default;
const { handleRegister } = registerMod;
const login = (await import("../api/login.js")).default;
const resetRequest = (await import("../api/reset-request.js")).default;
const resetConfirm = (await import("../api/reset-confirm.js")).default;
const me = (await import("../api/me.js")).default;
const profile = (await import("../api/profile.js")).default;
const logoApi = (await import("../api/logo.js")).default;
const documento = (await import("../api/documento.js")).default;
const adminLogin = (await import("../api/admin-login.js")).default;
const movimientoMod = await import("../api/movimiento.js");
const movimiento = movimientoMod.default;
const { applyMovimientos } = movimientoMod;

const regRes = mockRes();
await register(mockReq("POST", { rut: "12.345.678-5", email: "a@b.cl", razonSocial: "SpA", password: "tenchars!!" }, "203.0.113.21"), regRes);
assert(
  "register 501 sin DATABASE_URL",
  regRes._out.statusCode === 501 && regRes._out.body?.reason === "no_backend",
  JSON.stringify(regRes._out.body),
);

const altaBody = { rut: "12.345.678-5", email: "a@b.cl", razonSocial: "SpA", password: "tenchars!!" };
function registerTestDeps({ conflict = false, mailer } = {}) {
  const calls = [];
  return {
    calls,
    deps: {
      hasDatabaseUrl: () => true,
      hashPassword: async () => "hash",
      insertSession: async () => ({ token: "tok", expiresAt: new Date() }),
      sendSignupAvisoEmail:
        mailer ||
        (async (payload) => {
          calls.push(payload);
          return true;
        }),
      withDb: async (fn) =>
        fn({
          async query(sql) {
            if (sql === "BEGIN" || sql === "COMMIT") return {};
            if (/ROLLBACK/.test(sql)) return {};
            if (/INSERT INTO companies/.test(sql) && conflict) {
              const err = Object.assign(new Error("duplicate"), { code: "23505" });
              throw err;
            }
            return { rowCount: 1, rows: [] };
          },
        }),
    },
  };
}

const altaOk = registerTestDeps();
const altaRes = mockRes();
await handleRegister(mockReq("POST", altaBody), altaRes, altaOk.deps);
assert(
  "register 201 avisa una vez",
  altaRes._out.statusCode === 201 &&
    altaRes._out.body?.ok === true &&
    altaOk.calls.length === 1 &&
    altaOk.calls[0].email === "a@b.cl" &&
    altaOk.calls[0].rut === "12345678-5" &&
    altaOk.calls[0].razonSocial === "SpA" &&
    altaOk.calls[0].plan === "gratis" &&
    Boolean(altaOk.calls[0].companyId),
  JSON.stringify({ status: altaRes._out.statusCode, body: altaRes._out.body, calls: altaOk.calls }),
);
assert(
  "register 201 no incluye la clave",
  !/tenchars!!/.test(JSON.stringify(altaRes._out.body)) &&
    altaRes._out.body?.company?.password == null &&
    altaOk.calls[0].password == null,
  JSON.stringify(altaRes._out.body),
);

const dup = registerTestDeps({ conflict: true });
const dupRes = mockRes();
await handleRegister(mockReq("POST", altaBody), dupRes, dup.deps);
assert(
  "register 409 no avisa",
  dupRes._out.statusCode === 409 && dupRes._out.body?.reason === "conflict" && dup.calls.length === 0,
  JSON.stringify({ status: dupRes._out.statusCode, body: dupRes._out.body, calls: dup.calls }),
);

const bad = registerTestDeps();
const badRes = mockRes();
await handleRegister(mockReq("POST", { rut: "12.345.678-5", email: "no", razonSocial: "SpA", password: "short" }), badRes, bad.deps);
assert(
  "register 400 no avisa",
  badRes._out.statusCode === 400 && badRes._out.body?.reason === "invalid_payload" && bad.calls.length === 0,
  JSON.stringify({ status: badRes._out.statusCode, body: badRes._out.body, calls: bad.calls }),
);

const mailFalse = registerTestDeps({ mailer: async () => false });
const mailFalseRes = mockRes();
await handleRegister(mockReq("POST", altaBody), mailFalseRes, mailFalse.deps);
assert(
  "register 201 si el aviso devuelve false",
  mailFalseRes._out.statusCode === 201 && mailFalseRes._out.body?.ok === true,
  JSON.stringify(mailFalseRes._out.body),
);

const mailThrow = registerTestDeps({
  mailer: async () => {
    throw new Error("resend down");
  },
});
const mailThrowRes = mockRes();
await handleRegister(mockReq("POST", altaBody), mailThrowRes, mailThrow.deps);
assert(
  "register 201 si el aviso lanza",
  mailThrowRes._out.statusCode === 201 && mailThrowRes._out.body?.ok === true,
  JSON.stringify(mailThrowRes._out.body),
);

const noDbCalls = [];
const noDbRes = mockRes();
await handleRegister(mockReq("POST", altaBody), noDbRes, {
  sendSignupAvisoEmail: async (payload) => {
    noDbCalls.push(payload);
    return true;
  },
});
assert(
  "register 501 no avisa",
  noDbRes._out.statusCode === 501 && noDbCalls.length === 0,
  JSON.stringify({ status: noDbRes._out.statusCode, calls: noDbCalls }),
);

const dbDownCalls = [];
const dbDownRes = mockRes();
await handleRegister(mockReq("POST", altaBody), dbDownRes, {
  hasDatabaseUrl: () => true,
  sendSignupAvisoEmail: async (payload) => {
    dbDownCalls.push(payload);
    return true;
  },
  withDb: async () => {
    throw new Error("db down");
  },
});
assert(
  "register 503 no avisa",
  dbDownRes._out.statusCode === 503 && dbDownCalls.length === 0,
  JSON.stringify({ status: dbDownRes._out.statusCode, calls: dbDownCalls }),
);

assert("aviso default a Carlos", signupAvisoTo({}) === "carlos.irigoyen@gmail.com");
assert(
  "ADMIN_AVISO_EMAIL pisa el destino",
  signupAvisoTo({ ADMIN_AVISO_EMAIL: "ops@haberes.cl" }) === "ops@haberes.cl",
);
assert(
  "SIGNUP_AVISO_EMAIL si no hay ADMIN",
  signupAvisoTo({ SIGNUP_AVISO_EMAIL: "alt@haberes.cl" }) === "alt@haberes.cl",
);

let avisoFetch = null;
const avisoSent = await sendSignupAvisoEmail({
  razonSocial: "SpA",
  email: "a@b.cl",
  rut: "12345678-5",
  plan: "gratis",
  companyId: "co-1",
  env: {
    RESEND_API_KEY: "re_test",
    ADMIN_AVISO_EMAIL: "ops@haberes.cl",
  },
  fetchImpl: async (url, init) => {
    avisoFetch = { url, init };
    return { ok: true };
  },
});
const avisoMail = avisoFetch ? JSON.parse(avisoFetch.init.body) : {};
assert(
  "aviso Resend usa ADMIN_AVISO_EMAIL",
  avisoSent === true &&
    avisoMail.to?.[0] === "ops@haberes.cl" &&
    avisoMail.subject === "Nueva empresa en Haberes: SpA" &&
    /Razón social: SpA/.test(avisoMail.text) &&
    /Correo: a@b.cl/.test(avisoMail.text) &&
    /RUT: 12345678-5/.test(avisoMail.text) &&
    /Plan: gratis/.test(avisoMail.text) &&
    /\/admin/.test(avisoMail.text) &&
    !/tenchars!!/.test(avisoMail.text) &&
    avisoFetch.init.headers["Idempotency-Key"] === "haberes-signup-co-1",
  JSON.stringify(avisoMail),
);
const avisoNoKey = await sendSignupAvisoEmail({
  razonSocial: "SpA",
  email: "a@b.cl",
  rut: "12345678-5",
  plan: "gratis",
  env: {},
  fetchImpl: async () => {
    throw new Error("no fetch");
  },
});
assert("aviso sin API key no lanza", avisoNoKey === false);

assert(
  "idempotency checkout y Pro son distintas",
  opsAvisoIdempotencyKey({ kind: "checkout", companyId: "co-1", provider: "mp" }) ===
    "haberes-checkout-co-1-mp" &&
    opsAvisoIdempotencyKey({ kind: "checkout", companyId: "co-1", provider: "flow" }) ===
      "haberes-checkout-co-1-flow" &&
    opsAvisoIdempotencyKey({ kind: "pro", companyId: "co-1", eventId: "pay-9" }) ===
      "haberes-pro-co-1-pay-9",
);

let opsFetch = null;
const opsCheckoutSent = await sendOpsAvisoEmail({
  kind: "checkout",
  razonSocial: "Pyme SpA",
  email: "pyme@example.cl",
  rut: "12345678-5",
  provider: "mp",
  companyId: "co-1",
  env: {
    RESEND_API_KEY: "re_test",
    ADMIN_AVISO_EMAIL: "ops@haberes.cl",
  },
  fetchImpl: async (url, init) => {
    opsFetch = { url, init };
    return { ok: true };
  },
});
const opsCheckoutMail = opsFetch ? JSON.parse(opsFetch.init.body) : {};
assert(
  "aviso checkout Resend a operación",
  opsCheckoutSent === true &&
    opsCheckoutMail.to?.[0] === "ops@haberes.cl" &&
    opsCheckoutMail.subject === "Checkout Pro iniciado: Pyme SpA" &&
    /checkout iniciado/.test(opsCheckoutMail.text) &&
    /Razón social: Pyme SpA/.test(opsCheckoutMail.text) &&
    /RUT: 12345678-5/.test(opsCheckoutMail.text) &&
    /Correo: pyme@example.cl/.test(opsCheckoutMail.text) &&
    /Proveedor: Mercado Pago/.test(opsCheckoutMail.text) &&
    /\/admin/.test(opsCheckoutMail.text) &&
    opsFetch.init.headers["Idempotency-Key"] === "haberes-checkout-co-1-mp",
  JSON.stringify(opsCheckoutMail),
);

opsFetch = null;
const opsProSent = await sendOpsAvisoEmail({
  kind: "pro",
  razonSocial: "Pyme SpA",
  email: "pyme@example.cl",
  rut: "12345678-5",
  provider: "flow",
  companyId: "co-1",
  eventId: "pay-9",
  env: {
    RESEND_API_KEY: "re_test",
    SIGNUP_AVISO_EMAIL: "alt@haberes.cl",
  },
  fetchImpl: async (url, init) => {
    opsFetch = { url, init };
    return { ok: true };
  },
});
const opsProMail = opsFetch ? JSON.parse(opsFetch.init.body) : {};
assert(
  "aviso Pro activado Resend a operación",
  opsProSent === true &&
    opsProMail.to?.[0] === "alt@haberes.cl" &&
    opsProMail.subject === "Haberes Pro activado: Pyme SpA" &&
    /Pro activado/.test(opsProMail.text) &&
    /Proveedor: Flow/.test(opsProMail.text) &&
    /\/admin/.test(opsProMail.text) &&
    opsFetch.init.headers["Idempotency-Key"] === "haberes-pro-co-1-pay-9",
  JSON.stringify(opsProMail),
);

const opsNoKey = await sendOpsAvisoEmail({
  kind: "checkout",
  razonSocial: "Pyme SpA",
  email: "pyme@example.cl",
  rut: "12345678-5",
  provider: "mp",
  companyId: "co-1",
  env: {},
  fetchImpl: async () => {
    throw new Error("no fetch");
  },
});
assert("aviso ops sin API key no lanza", opsNoKey === false);

const opsFetchFail = await sendOpsAvisoEmail({
  kind: "pro",
  razonSocial: "Pyme SpA",
  email: "pyme@example.cl",
  rut: "12345678-5",
  provider: "mp",
  companyId: "co-1",
  eventId: "pay-fail",
  env: { RESEND_API_KEY: "re_test" },
  fetchImpl: async () => {
    throw new Error("resend down");
  },
});
assert("aviso ops si Resend falla no lanza", opsFetchFail === false);

const loginIp = "203.0.113.22";
const loginRes = mockRes();
await login(mockReq("POST", { rut: "12.345.678-5", password: "tenchars!!" }, loginIp), loginRes);
assert(
  "login 501 sin DATABASE_URL",
  loginRes._out.statusCode === 501 && loginRes._out.body?.reason === "no_backend",
  JSON.stringify(loginRes._out.body),
);
for (let i = 0; i < 4; i += 1) {
  await login(mockReq("POST", { rut: "12.345.678-5", password: "tenchars!!" }, loginIp), mockRes());
}
const login429 = mockRes();
await login(mockReq("POST", { rut: "12.345.678-5", password: "tenchars!!" }, loginIp), login429);
assert(
  "login 429 al 6º intento",
  login429._out.statusCode === 429 && login429._out.body?.reason === "rate_limited",
  JSON.stringify(login429._out.body),
);

const reqRes = mockRes();
await resetRequest(mockReq("POST", { rut: "76.123.456-0", email: "a@b.cl" }, "203.0.113.23"), reqRes);
assert(
  "reset-request 501 sin DATABASE_URL",
  reqRes._out.statusCode === 501 && reqRes._out.body?.ok === false && reqRes._out.body?.reason === "no_backend",
  JSON.stringify(reqRes._out.body),
);
const confRes = mockRes();
await resetConfirm(mockReq("POST", { token: "x", newPassword: "tenchars!!" }, "203.0.113.24"), confRes);
assert(
  "reset-confirm 501 sin DATABASE_URL",
  confRes._out.statusCode === 501 && confRes._out.body?.reason === "no_backend",
  JSON.stringify(confRes._out.body),
);
const meRes = mockRes();
await me({ method: "GET", headers: {} }, meRes);
assert(
  "me 501 sin DATABASE_URL",
  meRes._out.statusCode === 501 && meRes._out.body?.reason === "no_backend",
  JSON.stringify(meRes._out.body),
);

const profileRes = mockRes();
await profile({ method: "GET", headers: {} }, profileRes);
assert(
  "profile 501 sin DATABASE_URL",
  profileRes._out.statusCode === 501 && profileRes._out.body?.reason === "no_backend",
  JSON.stringify(profileRes._out.body),
);
const logoRes = mockRes();
await logoApi({ method: "GET", headers: {} }, logoRes);
assert(
  "logo 501 sin DATABASE_URL",
  logoRes._out.statusCode === 501 && logoRes._out.body?.reason === "no_backend",
  JSON.stringify(logoRes._out.body),
);
const docRes = mockRes();
await documento(mockReq("POST", { tipo: "finiquito" }, "203.0.113.26"), docRes);
assert(
  "documento 501 sin DATABASE_URL",
  docRes._out.statusCode === 501 && docRes._out.body?.reason === "no_backend",
  JSON.stringify(docRes._out.body),
);
const enviarApi = (await import("../api/enviar.js")).default;
const enviarRes = mockRes();
await enviarApi(mockReq("POST", { tipo: "liquidacion", trabajadores: [] }, "203.0.113.40"), enviarRes);
assert(
  "enviar 501 sin DATABASE_URL",
  enviarRes._out.statusCode === 501 && enviarRes._out.body?.reason === "no_backend",
  JSON.stringify(enviarRes._out.body),
);
const enviarGet = mockRes();
await enviarApi({ method: "GET", headers: {} }, enviarGet);
assert(
  "GET /api/enviar solo ok y mail",
  enviarGet._out.statusCode === 200 &&
    enviarGet._out.body?.ok === true &&
    typeof enviarGet._out.body?.mail === "boolean" &&
    !/RESEND|DATABASE|R2_/i.test(JSON.stringify(enviarGet._out.body)),
  JSON.stringify(enviarGet._out.body),
);
const movRes = mockRes();
await movimiento(mockReq("POST", { tipo: "liquidacion", keys: ["a"] }, "203.0.113.27"), movRes);
assert(
  "movimiento 501 sin DATABASE_URL",
  movRes._out.statusCode === 501 && movRes._out.body?.reason === "no_backend",
  JSON.stringify(movRes._out.body),
);

function mockMovClient(existingKeys = []) {
  const { periodoMes } = movimientoMod;
  const periodo = periodoMes();
  const rows = existingKeys.map((key) => ["id", "co1", "liquidacion", key, periodo]);
  let inserts = 0;
  return {
    get inserts() {
      return inserts;
    },
    async query(sql, params = []) {
      if (/SELECT COUNT/.test(sql)) return { rows: [{ n: rows.length }] };
      if (/SELECT 1 FROM movimientos/.test(sql)) {
        const found = rows.some(
          (r) => r[1] === params[0] && r[4] === params[1] && r[2] === params[2] && r[3] === params[3],
        );
        return { rowCount: found ? 1 : 0, rows: found ? [{}] : [] };
      }
      if (/INSERT INTO movimientos/.test(sql)) {
        inserts += 1;
        rows.push(params);
        return { rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}
const dryClient = mockMovClient();
const dry = await applyMovimientos(dryClient, { id: "co1", plan: "gratis" }, {
  tipo: "liquidacion",
  keys: ["a"],
  commit: false,
});
assert(
  "applyMovimientos dry-run no inserta",
  dry.status === 200 && dry.body?.ok === true && dryClient.inserts === 0,
  JSON.stringify({ status: dry.status, inserts: dryClient.inserts }),
);
const commitClient = mockMovClient();
const committed = await applyMovimientos(commitClient, { id: "co1", plan: "gratis" }, {
  tipo: "liquidacion",
  keys: ["a"],
  commit: true,
});
assert(
  "applyMovimientos commit inserta una vez",
  committed.status === 200 && committed.body?.movimientosMes === 1 && commitClient.inserts === 1,
  JSON.stringify(committed.body),
);

console.log("\nCheckout Mercado Pago");
const MP_TOKEN_KEYS = [
  "mp_access_token",
  "mp_access",
  "MP_ACCESS_YOKEN",
  "Mp:access_token",
  "MP_ACCESS_TOKEN",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MP_ACCESS_TOKEN_PROD",
  "MP_ACCESS",
];
const prevMpToks = Object.fromEntries(MP_TOKEN_KEYS.map((k) => [k, process.env[k]]));
const prevMpSec = process.env.MP_WEBHOOK_SECRET;
const prevMpSec2 = process.env.MERCADOPAGO_WEBHOOK_SECRET;
function clearMpEnv() {
  for (const k of MP_TOKEN_KEYS) delete process.env[k];
  delete process.env.MP_WEBHOOK_SECRET;
  delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
}
function restoreMpEnv() {
  for (const k of MP_TOKEN_KEYS) {
    if (prevMpToks[k] === undefined) delete process.env[k];
    else process.env[k] = prevMpToks[k];
  }
  if (prevMpSec === undefined) delete process.env.MP_WEBHOOK_SECRET;
  else process.env.MP_WEBHOOK_SECRET = prevMpSec;
  if (prevMpSec2 === undefined) delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  else process.env.MERCADOPAGO_WEBHOOK_SECRET = prevMpSec2;
}
clearMpEnv();

const {
  PRO_AMOUNT_CLP,
  MP_TOKEN_ENV,
  hasMp,
  mpAccessToken,
  verifyMpSignature,
  applyFetchedPayment,
  applyFetchedPreapproval,
  createProCheckout,
} = await import("../api/_mp.js");
const checkoutMod = await import("../api/checkout.js");
const checkout = checkoutMod.default;
const { handleCheckout, configuredProviders, normalizeProvider } = checkoutMod;
const { default: mpWebhook, handleMpWebhook } = await import("../api/mp-webhook.js");
const { createHmac } = await import("node:crypto");

assert("Pro cobra 17838 CLP", PRO_AMOUNT_CLP === 17838, String(PRO_AMOUNT_CLP));
assert("hasMp false sin token", hasMp() === false);
assert("mpAccessToken vacío sin env", mpAccessToken() === "");
assert(
  "MP_TOKEN_ENV: mp_access_token primero",
  MP_TOKEN_ENV[0] === "mp_access_token" &&
    MP_TOKEN_ENV.includes("mp_access") &&
    MP_TOKEN_ENV.includes("MP_ACCESS_YOKEN") &&
    MP_TOKEN_ENV.includes("MP_ACCESS_TOKEN") &&
    MP_TOKEN_ENV.includes("MERCADOPAGO_ACCESS_TOKEN") &&
    MP_TOKEN_ENV.includes("MP_ACCESS_TOKEN_PROD") &&
    MP_TOKEN_ENV.includes("MP_ACCESS"),
);

process.env.MP_ACCESS_TOKEN = "unit-mp-canonical";
process.env.mp_access_token = "unit-mp-vercel";
assert("mp_access_token gana al canónico", mpAccessToken() === "unit-mp-vercel");
delete process.env.mp_access_token;
process.env.mp_access = "unit-mp-short-alias";
assert("mp_access funciona si no hay mp_access_token", mpAccessToken() === "unit-mp-short-alias");
delete process.env.mp_access;
delete process.env.MP_ACCESS_TOKEN;
process.env.MP_ACCESS_YOKEN = "unit-mp-typo";
assert("MP_ACCESS_YOKEN funciona", hasMp() === true && mpAccessToken() === "unit-mp-typo");
delete process.env.MP_ACCESS_YOKEN;
process.env.MP_ACCESS = "unit-mp-short";
assert("MP_ACCESS funciona", hasMp() === true && mpAccessToken() === "unit-mp-short");
delete process.env.MP_ACCESS;
assert("sin alias no hay token", hasMp() === false);

const chkAnon = mockRes();
await checkout(mockReq("POST", {}, "203.0.113.81"), chkAnon);
assert(
  "checkout 401 sin sesión",
  chkAnon._out.statusCode === 401 && chkAnon._out.body?.reason === "unauthorized",
  JSON.stringify(chkAnon._out.body),
);

const chkCookie = mockRes();
await checkout(
  { method: "POST", body: {}, headers: { "x-forwarded-for": "203.0.113.82", cookie: "haberes_session=unit-session" } },
  chkCookie,
);
assert(
  "checkout 501 sin DATABASE_URL con sesión",
  chkCookie._out.statusCode === 501 && chkCookie._out.body?.reason === "no_backend",
  JSON.stringify(chkCookie._out.body),
);

process.env.MP_ACCESS_TOKEN = "unit-mp-token";
assert("hasMp true con alias", hasMp() === true);
const fakeFetch = async (url) => {
  const u = String(url);
  if (u.includes("/preapproval") && !u.includes("/checkout/")) {
    return {
      ok: true,
      status: 201,
      json: async () => ({ init_point: "https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=unit" }),
    };
  }
  if (u.includes("/checkout/preferences")) {
    throw new Error("preference fallback must not run");
  }
  throw new Error("live MP blocked in verify");
};
const created = await createProCheckout({ id: "co-unit", email: "pyme@example.cl" }, { fetchImpl: fakeFetch });
assert(
  "checkout mock init_point de preapproval sin API viva",
  created.ok === true &&
    created.kind === "preapproval" &&
    String(created.init_point).includes("mercadopago.cl"),
  JSON.stringify(created),
);
const fakeFetchFailSub = async (url) => {
  const u = String(url);
  if (u.includes("/preapproval") && !u.includes("/checkout/")) {
    return { ok: false, status: 400, json: async () => ({ message: "no_sub" }) };
  }
  if (u.includes("/checkout/preferences")) {
    return {
      ok: true,
      status: 201,
      json: async () => ({ init_point: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=unit" }),
    };
  }
  throw new Error("live MP blocked in verify");
};
const createdFail = await createProCheckout(
  { id: "co-unit", email: "pyme@example.cl" },
  { fetchImpl: fakeFetchFailSub },
);
assert(
  "checkout no cae en cobro de 31 días si falla la suscripción",
  createdFail.ok === false && createdFail.reason === "mp_subscription_unavailable",
  JSON.stringify(createdFail),
);
delete process.env.MP_ACCESS_TOKEN;

let applyHits = 0;
const unsigned = mockRes();
process.env.MP_WEBHOOK_SECRET = "unit-webhook-secret";
process.env.MP_ACCESS_TOKEN = "unit-mp-token";
await handleMpWebhook(
  {
    method: "POST",
    body: { type: "payment", data: { id: "999" }, status: "approved", external_reference: "co1" },
    headers: { "x-forwarded-for": "203.0.113.83" },
    url: "/api/mp-webhook?data.id=999&type=payment",
  },
  unsigned,
  {
    fetchImpl: async () => {
      applyHits += 1;
      return { ok: true, status: 200, json: async () => ({ status: "approved" }) };
    },
    applyPayment: async () => {
      applyHits += 10;
    },
  },
);
assert(
  "webhook unsigned 401",
  unsigned._out.statusCode === 401 && unsigned._out.body?.reason === "unauthorized" && applyHits === 0,
  JSON.stringify({ status: unsigned._out.statusCode, hits: applyHits, body: unsigned._out.body }),
);

applyHits = 0;
const forged = mockRes();
await handleMpWebhook(
  {
    method: "POST",
    body: { type: "payment", data: { id: "999" } },
    headers: {
      "x-forwarded-for": "203.0.113.84",
      "x-signature": "ts=1704908010,v1=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      "x-request-id": "req-unit",
    },
    url: "/api/mp-webhook?data.id=999&type=payment",
  },
  forged,
  {
    fetchImpl: async () => {
      applyHits += 1;
      return { ok: true, status: 200, json: async () => ({}) };
    },
    applyPayment: async () => {
      applyHits += 10;
    },
  },
);
assert(
  "webhook forged 401 sin voltear plan",
  forged._out.statusCode === 401 && applyHits === 0,
  JSON.stringify({ status: forged._out.statusCode, hits: applyHits }),
);

const ts = "1704908010";
const dataId = "999";
const requestId = "req-unit";
const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
const goodV1 = createHmac("sha256", "unit-webhook-secret").update(manifest, "utf8").digest("hex");
assert(
  "firma MP oficial",
  verifyMpSignature({
    secret: "unit-webhook-secret",
    xSignature: `ts=${ts},v1=${goodV1}`,
    xRequestId: requestId,
    dataId,
  }) === true,
);
assert(
  "firma MP rechaza otra",
  verifyMpSignature({
    secret: "unit-webhook-secret",
    xSignature: `ts=${ts},v1=${goodV1.replace(/a/g, "b")}`,
    xRequestId: requestId,
    dataId,
  }) === false,
);

applyHits = 0;
let appliedPlan = null;
const signed = mockRes();
await handleMpWebhook(
  {
    method: "POST",
    body: { type: "payment", data: { id: "999" } },
    headers: {
      "x-forwarded-for": "203.0.113.85",
      "x-signature": `ts=${ts},v1=${goodV1}`,
      "x-request-id": requestId,
    },
    url: "/api/mp-webhook?data.id=999&type=payment",
  },
  signed,
  {
    fetchImpl: async (url) => {
      applyHits += 1;
      if (String(url).includes("/v1/payments/999")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 999,
            status: "approved",
            transaction_amount: 17838,
            currency_id: "CLP",
            external_reference: "co1",
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    },
    applyPayment: async (_client, payment) => {
      appliedPlan = payment.status === "approved" ? "pro" : "gratis";
    },
    withDb: async (fn) => fn({}),
  },
);
assert(
  "webhook firmado consulta MP y no usa el body crudo",
  signed._out.statusCode === 200 && applyHits === 1 && appliedPlan === "pro",
  JSON.stringify({ status: signed._out.statusCode, hits: applyHits, plan: appliedPlan }),
);

const hookMailClient = mockPayClient({
  id: "co1",
  plan: "gratis",
  mp_payment_id: null,
  plan_until: null,
  email: "pyme@example.cl",
  rut: "12345678-5",
  razon_social: "Pyme SpA",
});
const hookMailThrow = mockRes();
await handleMpWebhook(
  {
    method: "POST",
    body: { type: "payment", data: { id: "999" } },
    headers: {
      "x-forwarded-for": "203.0.113.185",
      "x-signature": `ts=${ts},v1=${goodV1}`,
      "x-request-id": requestId,
    },
    url: "/api/mp-webhook?data.id=999&type=payment",
  },
  hookMailThrow,
  {
    fetchImpl: async (url) => {
      if (String(url).includes("/v1/payments/999")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 999,
            status: "approved",
            transaction_amount: 17838,
            currency_id: "CLP",
            external_reference: "co1",
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    },
    applyPayment: async (client, payment) =>
      applyFetchedPayment(client, payment, {
        notifyPro: async () => {
          throw new Error("resend down");
        },
      }),
    withDb: async (fn) => fn(hookMailClient),
  },
);
assert(
  "webhook MP activa Pro aunque el aviso lanza",
  hookMailThrow._out.statusCode === 200 &&
    hookMailThrow._out.body?.ok === true &&
    hookMailClient.state.row.plan === "pro",
  JSON.stringify({ status: hookMailThrow._out.statusCode, plan: hookMailClient.state.row.plan }),
);

function mockPayClient(row) {
  const state = { row: { ...row }, sql: [] };
  return {
    state,
    async query(sql, params = []) {
      state.sql.push(sql);
      if (/SELECT id, plan, mp_payment_id/.test(sql)) {
        return { rows: state.row ? [state.row] : [] };
      }
      if (/SET plan = 'pro'/.test(sql)) {
        state.row = { ...state.row, plan: "pro", mp_payment_id: params[1], plan_until: params[2] };
        return { rowCount: 1 };
      }
      if (/SET plan = 'gratis'/.test(sql)) {
        if (state.row && String(state.row.mp_payment_id) === String(params[1])) {
          state.row = { ...state.row, plan: "gratis", plan_until: null };
          return { rowCount: 1, rows: [{ id: state.row.id }] };
        }
        return { rowCount: 0, rows: [] };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

const payClient = mockPayClient({
  id: "co1",
  plan: "gratis",
  mp_payment_id: null,
  plan_until: null,
  email: "pyme@example.cl",
  rut: "12345678-5",
  razon_social: "Pyme SpA",
});
const payAviso = [];
const approved = await applyFetchedPayment(
  payClient,
  {
    id: "pay-1",
    status: "approved",
    transaction_amount: 17838,
    currency_id: "CLP",
    external_reference: "co1",
  },
  {
    notifyPro: async (row, meta) => {
      payAviso.push({ row, meta });
    },
  },
);
assert(
  "pago aprobado activa Pro",
  approved.applied && approved.plan === "pro" && payClient.state.row.plan === "pro",
  JSON.stringify(approved),
);
assert(
  "pago aprobado avisa a operación",
  payAviso.length === 1 &&
    payAviso[0].meta?.provider === "mp" &&
    payAviso[0].meta?.eventId === "pay-1" &&
    payAviso[0].row?.email === "pyme@example.cl",
  JSON.stringify(payAviso),
);
const payMailThrow = await applyFetchedPayment(
  mockPayClient({
    id: "co1",
    plan: "gratis",
    mp_payment_id: null,
    plan_until: null,
    email: "pyme@example.cl",
    rut: "12345678-5",
    razon_social: "Pyme SpA",
  }),
  {
    id: "pay-mail",
    status: "approved",
    transaction_amount: 17838,
    currency_id: "CLP",
    external_reference: "co1",
  },
  {
    notifyPro: async () => {
      throw new Error("resend down");
    },
  },
);
assert(
  "pago aprobado sigue si el aviso lanza",
  payMailThrow.applied && payMailThrow.plan === "pro",
  JSON.stringify(payMailThrow),
);
const pending = await applyFetchedPayment(payClient, {
  id: "pay-2",
  status: "pending",
  transaction_amount: 17838,
  currency_id: "CLP",
  external_reference: "co1",
});
assert("pago pendiente no cambia plan", pending.applied === false && payClient.state.row.plan === "pro");
const refunded = await applyFetchedPayment(payClient, {
  id: "pay-1",
  status: "refunded",
  external_reference: "co1",
});
assert(
  "reembolso vuelve a Gratis",
  refunded.applied && refunded.plan === "gratis" && payClient.state.row.plan === "gratis",
  JSON.stringify(refunded),
);

function mockPreClient(row) {
  const state = { row: { ...row }, sql: [], notified: 0 };
  return {
    state,
    async query(sql, params = []) {
      state.sql.push(sql);
      if (/SET plan = 'pro'/.test(sql) && /mp_preapproval_id/.test(sql)) {
        state.row = { ...state.row, plan: "pro", mp_preapproval_id: params[1], plan_until: null };
        return {
          rowCount: 1,
          rows: [
            {
              id: state.row.id,
              email: state.row.email,
              rut: state.row.rut,
              razon_social: state.row.razon_social,
            },
          ],
        };
      }
      if (/SET plan = 'gratis'/.test(sql) && /mp_preapproval_id/.test(sql)) {
        if (state.row && String(state.row.mp_preapproval_id) === String(params[1])) {
          state.row = { ...state.row, plan: "gratis", plan_until: null };
          return { rowCount: 1, rows: [{ id: state.row.id, email: "pyme@example.cl", razon_social: "Pyme" }] };
        }
        return { rowCount: 0, rows: [] };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}
const preClient = mockPreClient({
  id: "co1",
  plan: "gratis",
  mp_preapproval_id: null,
  plan_until: "2099-01-01T00:00:00Z",
  email: "pyme@example.cl",
  rut: "12345678-5",
  razon_social: "Pyme SpA",
});
let preNotified = 0;
const preAviso = [];
const authorized = await applyFetchedPreapproval(
  preClient,
  {
    id: "pre-1",
    status: "authorized",
    external_reference: "co1",
  },
  {
    notifyPro: async (row, meta) => {
      preAviso.push({ row, meta });
    },
  },
);
assert(
  "preapproval autorizado activa Pro sin plan_until",
  authorized.applied &&
    authorized.plan === "pro" &&
    preClient.state.row.plan === "pro" &&
    preClient.state.row.plan_until == null,
  JSON.stringify(authorized),
);
assert(
  "preapproval autorizado avisa a operación",
  preAviso.length === 1 && preAviso[0].meta?.provider === "mp" && preAviso[0].meta?.eventId === "pre-1",
  JSON.stringify(preAviso),
);
const cancelledPre = await applyFetchedPreapproval(
  preClient,
  { id: "pre-1", status: "cancelled", external_reference: "co1" },
  {
    notify: async () => {
      preNotified += 1;
    },
  },
);
assert(
  "preapproval cancelado vuelve a Gratis y avisa",
  cancelledPre.applied &&
    cancelledPre.plan === "gratis" &&
    preClient.state.row.plan === "gratis" &&
    preNotified === 1,
  JSON.stringify({ cancelledPre, preNotified }),
);

const hookGet = mockRes();
await mpWebhook({ method: "GET", headers: {} }, hookGet);
assert("webhook GET 200", hookGet._out.statusCode === 200 && hookGet._out.body?.ok === true);

restoreMpEnv();

console.log("\nCheckout Flow");
const FLOW_ENV_KEYS = [
  "FLOW_API_KEY",
  "flow_api_key",
  "FLOW_APIKEY",
  "FLOW_KEY",
  "API_KEY",
  "FLOW_API_KEY_PROD",
  "FLOW_APIKEY_PROD",
  "FLOW_API_KEEY",
  "FLOW_API_YKEY",
  "FLOW_SECRET_KEY",
  "flow_secret_key",
  "FLOW_SECRET",
  "SECRET_KEY",
  "FLOW_SECRET_KEY_PROD",
  "FLOW_SECRETKEY",
  "FLOW_SECREY_KEY",
  "FLOW_API_URL",
  "FLOW_BASE_URL",
  "FLOW_SANDBOX",
];
const prevFlowEnv = Object.fromEntries(FLOW_ENV_KEYS.map((k) => [k, process.env[k]]));
function clearFlowEnv() {
  for (const k of FLOW_ENV_KEYS) delete process.env[k];
}
function restoreFlowEnv() {
  for (const k of FLOW_ENV_KEYS) {
    if (prevFlowEnv[k] === undefined) delete process.env[k];
    else process.env[k] = prevFlowEnv[k];
  }
}
clearFlowEnv();

const {
  FLOW_API_KEY_ENV,
  FLOW_SECRET_KEY_ENV,
  hasFlow,
  flowApiKey,
  flowSecretKey,
  flowApiBase,
  flowSign,
  flowRedirectUrl,
  companyIdFromStatus,
  applyFetchedFlowStatus,
  applyFetchedFlowInvoice,
  applyFlowCardRegistered,
  createFlowCheckout,
  createFlowOrder,
  FLOW_PLAN_ID,
  readFlowToken,
} = await import("../api/_flow.js");
const { default: flowWebhook, handleFlowWebhook } = await import("../api/flow-webhook.js");

assert("hasFlow false sin claves", hasFlow() === false);
assert(
  "alias Flow apiKey y secretKey",
  FLOW_API_KEY_ENV.includes("FLOW_API_KEY") &&
    FLOW_API_KEY_ENV.includes("FLOW_APIKEY") &&
    FLOW_API_KEY_ENV.includes("API_KEY") &&
    FLOW_API_KEY_ENV.includes("FLOW_API_KEY_PROD") &&
    FLOW_API_KEY_ENV.includes("FLOW_API_YKEY") &&
    FLOW_SECRET_KEY_ENV.includes("FLOW_SECRET_KEY") &&
    FLOW_SECRET_KEY_ENV.includes("SECRET_KEY") &&
    FLOW_SECRET_KEY_ENV.includes("FLOW_SECREY_KEY"),
);

process.env.FLOW_API_KEY = "unit-flow-canonical";
process.env.flow_api_key = "unit-flow-lower";
assert("FLOW_API_KEY gana a flow_api_key", flowApiKey() === "unit-flow-canonical");
delete process.env.FLOW_API_KEY;
assert("flow_api_key funciona si no hay FLOW_API_KEY", flowApiKey() === "unit-flow-lower");
delete process.env.flow_api_key;
process.env.FLOW_API_YKEY = "unit-flow-typo";
process.env.FLOW_SECREY_KEY = "unit-flow-secret-typo";
assert("typos Flow tipo MP_ACCESS_YOKEN", hasFlow() === true && flowApiKey() === "unit-flow-typo" && flowSecretKey() === "unit-flow-secret-typo");
delete process.env.FLOW_API_YKEY;
delete process.env.FLOW_SECREY_KEY;
assert("sin alias Flow no hay claves", hasFlow() === false);

const flowSignParams = { apiKey: "1F90971E-8276-4715-97FF-2BLG5030EE3B", token: "AJ089FF5467367" };
const flowExpected = createHmac("sha256", "my secret")
  .update("apiKey1F90971E-8276-4715-97FF-2BLG5030EE3BtokenAJ089FF5467367", "utf8")
  .digest("hex");
assert("firma Flow oficial key+value ordenado", flowSign(flowSignParams, "my secret") === flowExpected);
assert(
  "firma Flow ignora s y ordena claves",
  flowSign({ token: "AJ089FF5467367", s: "nope", apiKey: "1F90971E-8276-4715-97FF-2BLG5030EE3B" }, "my secret") ===
    flowExpected,
);
assert(
  "firma Flow distinta con otro secreto",
  flowSign(flowSignParams, "other secret") !== flowExpected,
);
assert(
  "redirect Flow url?token=",
  flowRedirectUrl("https://www.flow.cl/app/web/pay.php", "TOK") ===
    "https://www.flow.cl/app/web/pay.php?token=TOK",
);
assert(
  "company_id desde optional y commerceOrder",
  companyIdFromStatus({ optional: { company_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" } }) ===
    "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" &&
    companyIdFromStatus({
      commerceOrder: "pro-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-1-abcd",
    }) === "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
);

assert("normalizeProvider default mp", normalizeProvider(undefined) === "mp" && normalizeProvider("FLOW") === "flow");
const chkGet = mockRes();
await checkout(mockReq("GET", null, "203.0.113.90"), chkGet);
assert(
  "GET checkout lista providers sin sesión",
  chkGet._out.statusCode === 200 &&
    chkGet._out.body?.ok === true &&
    Array.isArray(chkGet._out.body?.providers) &&
    chkGet._out.body.providers.includes("flow") === false,
  JSON.stringify(chkGet._out.body),
);

const chkFlowAnon = mockRes();
await checkout(mockReq("POST", { provider: "flow" }, "203.0.113.91"), chkFlowAnon);
assert(
  "checkout Flow 401 sin sesión",
  chkFlowAnon._out.statusCode === 401 && chkFlowAnon._out.body?.reason === "unauthorized",
  JSON.stringify(chkFlowAnon._out.body),
);

process.env.FLOW_API_KEY = "unit-flow-key";
process.env.FLOW_SECRET_KEY = "unit-flow-secret";
assert("hasFlow true con alias", hasFlow() === true);
assert("Flow API prod por defecto", flowApiBase() === "https://www.flow.cl/api");
process.env.FLOW_SANDBOX = "1";
assert("FLOW_SANDBOX=1 usa sandbox", flowApiBase() === "https://sandbox.flow.cl/api");
delete process.env.FLOW_SANDBOX;
process.env.FLOW_API_URL = "https://sandbox.flow.cl/api/";
assert("FLOW_API_URL gana y recorta slash", flowApiBase() === "https://sandbox.flow.cl/api");
delete process.env.FLOW_API_URL;

const fakeFlowFetch = async (url, opts) => {
  const u = String(url);
  if (!u.includes("/payment/create")) throw new Error("live Flow blocked in verify");
  const body = String(opts?.body || "");
  if (!body.includes("apiKey=") || !body.includes("s=")) throw new Error("create must be signed form");
  return {
    ok: true,
    status: 200,
    json: async () => ({
      url: "https://www.flow.cl/app/web/pay.php",
      token: "unit-flow-token",
      flowOrder: 776655,
    }),
  };
};
const flowCreated = await createFlowOrder(
  { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", email: "pyme@example.cl" },
  { fetchImpl: fakeFlowFetch },
);
assert(
  "checkout Flow one-shot mock init_point sin API viva",
  flowCreated.ok === true &&
    String(flowCreated.init_point) === "https://www.flow.cl/app/web/pay.php?token=unit-flow-token",
  JSON.stringify(flowCreated),
);

const flowHits = [];
const fakeFlowSubFetch = async (url, opts) => {
  const u = String(url);
  const body = String(opts?.body || "");
  flowHits.push(u);
  if (u.includes("/plans/get")) {
    return { ok: false, status: 400, json: async () => ({ code: 404 }) };
  }
  if (u.includes("/plans/create")) {
    if (!body.includes("periods_number=0") || !body.includes("interval=3") || !body.includes("amount=17838")) {
      throw new Error("plan must be monthly 17838 indefinite");
    }
    return { ok: true, status: 200, json: async () => ({ planId: FLOW_PLAN_ID }) };
  }
  if (u.includes("/customer/create")) {
    return { ok: true, status: 200, json: async () => ({ customerId: "cus_unit" }) };
  }
  if (u.includes("/customer/register")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ url: "https://www.flow.cl/app/web/pay.php", token: "unit-reg-token" }),
    };
  }
  if (u.includes("/payment/create")) throw new Error("subscription path must not fall back to payment/create");
  throw new Error(`live Flow blocked in verify: ${u}`);
};
const flowSub = await createFlowCheckout(
  {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    email: "pyme@example.cl",
    razon_social: "Pyme SpA",
  },
  { fetchImpl: fakeFlowSubFetch },
);
assert(
  "checkout Flow suscripción plan+cliente+tarjeta",
  flowSub.ok === true &&
    flowSub.kind === "flow_subscription" &&
    flowSub.customerId === "cus_unit" &&
    String(flowSub.init_point) === "https://www.flow.cl/app/web/pay.php?token=unit-reg-token",
  JSON.stringify(flowSub),
);
const fakeFlowSubFail = async (url) => {
  const u = String(url);
  if (u.includes("/plans/")) return { ok: false, status: 400, json: async () => ({ message: "no_plans" }) };
  if (u.includes("/payment/create")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ url: "https://www.flow.cl/app/web/pay.php", token: "should-not" }),
    };
  }
  throw new Error("live Flow blocked in verify");
};
const flowSubFail = await createFlowCheckout(
  { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", email: "pyme@example.cl", razon_social: "Pyme" },
  { fetchImpl: fakeFlowSubFail },
);
assert(
  "checkout Flow no vende un mes suelto si falla el plan",
  flowSubFail.ok === false && flowSubFail.reason === "flow_subscription_unavailable",
  JSON.stringify(flowSubFail),
);

const flowProv = mockRes();
const flowCheckoutAviso = [];
await handleCheckout(
  {
    method: "POST",
    body: { provider: "flow" },
    headers: { "x-forwarded-for": "203.0.113.92", cookie: "haberes_session=unit-session" },
  },
  flowProv,
  {
    hasDatabaseUrl: () => true,
    requireCompany: async () => ({
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      email: "pyme@example.cl",
      rut: "12345678-5",
      razon_social: "Pyme SpA",
    }),
    hasMp: () => true,
    hasFlow: () => true,
    createMp: async () => ({ ok: true, init_point: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=nope" }),
    createFlow: async () => ({
      ok: true,
      init_point: "https://www.flow.cl/app/web/pay.php?token=from-provider",
    }),
    notifyCheckout: async (company, meta) => {
      flowCheckoutAviso.push({ company, meta });
    },
  },
);
assert(
  "checkout body provider flow no usa MP",
  flowProv._out.statusCode === 200 &&
    flowProv._out.body?.ok === true &&
    flowProv._out.body?.provider === "flow" &&
    String(flowProv._out.body?.init_point).includes("flow.cl"),
  JSON.stringify(flowProv._out.body),
);
assert(
  "checkout Flow avisa a operación",
  flowCheckoutAviso.length === 1 &&
    flowCheckoutAviso[0].meta?.provider === "flow" &&
    flowCheckoutAviso[0].company?.email === "pyme@example.cl",
  JSON.stringify(flowCheckoutAviso),
);

const flowCheckoutFailAviso = [];
const flowCheckoutFail = mockRes();
await handleCheckout(
  {
    method: "POST",
    body: { provider: "flow" },
    headers: { "x-forwarded-for": "203.0.113.192", cookie: "haberes_session=unit-session" },
  },
  flowCheckoutFail,
  {
    hasDatabaseUrl: () => true,
    requireCompany: async () => ({ id: "co1", email: "pyme@example.cl" }),
    hasMp: () => true,
    hasFlow: () => true,
    createFlow: async () => ({ ok: false, reason: "flow_error" }),
    notifyCheckout: async (company, meta) => {
      flowCheckoutFailAviso.push({ company, meta });
    },
  },
);
assert(
  "checkout Flow 502 no avisa",
  flowCheckoutFail._out.statusCode === 502 && flowCheckoutFailAviso.length === 0,
  JSON.stringify({ status: flowCheckoutFail._out.statusCode, calls: flowCheckoutFailAviso }),
);

const flowCheckoutMailThrow = mockRes();
await handleCheckout(
  {
    method: "POST",
    body: { provider: "flow" },
    headers: { "x-forwarded-for": "203.0.113.194", cookie: "haberes_session=unit-session" },
  },
  flowCheckoutMailThrow,
  {
    hasDatabaseUrl: () => true,
    requireCompany: async () => ({ id: "co1", email: "pyme@example.cl", razon_social: "Pyme SpA" }),
    hasMp: () => false,
    hasFlow: () => true,
    createFlow: async () => ({
      ok: true,
      init_point: "https://www.flow.cl/app/web/pay.php?token=from-provider",
    }),
    notifyCheckout: async () => {
      throw new Error("resend down");
    },
  },
);
assert(
  "checkout Flow sigue si el aviso lanza",
  flowCheckoutMailThrow._out.statusCode === 200 && flowCheckoutMailThrow._out.body?.ok === true,
  JSON.stringify(flowCheckoutMailThrow._out.body),
);

const mpDefault = mockRes();
const mpCheckoutAviso = [];
await handleCheckout(
  {
    method: "POST",
    body: {},
    headers: { "x-forwarded-for": "203.0.113.93", cookie: "haberes_session=unit-session" },
  },
  mpDefault,
  {
    hasDatabaseUrl: () => true,
    requireCompany: async () => ({
      id: "co1",
      email: "pyme@example.cl",
      rut: "12345678-5",
      razon_social: "Pyme SpA",
    }),
    hasMp: () => true,
    hasFlow: () => true,
    createMp: async () => ({ ok: true, init_point: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=unit" }),
    createFlow: async () => ({ ok: true, init_point: "https://www.flow.cl/app/web/pay.php?token=nope" }),
    notifyCheckout: async (company, meta) => {
      mpCheckoutAviso.push({ company, meta });
    },
  },
);
assert(
  "checkout sin provider sigue MP",
  mpDefault._out.statusCode === 200 &&
    mpDefault._out.body?.provider === "mp" &&
    String(mpDefault._out.body?.init_point).includes("mercadopago.cl"),
  JSON.stringify(mpDefault._out.body),
);
assert(
  "checkout MP avisa a operación",
  mpCheckoutAviso.length === 1 &&
    mpCheckoutAviso[0].meta?.provider === "mp" &&
    mpCheckoutAviso[0].company?.email === "pyme@example.cl" &&
    mpCheckoutAviso[0].company?.razon_social === "Pyme SpA",
  JSON.stringify(mpCheckoutAviso),
);

const mpCheckoutMailThrow = mockRes();
await handleCheckout(
  {
    method: "POST",
    body: {},
    headers: { "x-forwarded-for": "203.0.113.193", cookie: "haberes_session=unit-session" },
  },
  mpCheckoutMailThrow,
  {
    hasDatabaseUrl: () => true,
    requireCompany: async () => ({ id: "co1", email: "pyme@example.cl", razon_social: "Pyme SpA" }),
    hasMp: () => true,
    hasFlow: () => false,
    createMp: async () => ({ ok: true, init_point: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=unit" }),
    notifyCheckout: async () => {
      throw new Error("resend down");
    },
  },
);
assert(
  "checkout MP sigue si el aviso lanza",
  mpCheckoutMailThrow._out.statusCode === 200 && mpCheckoutMailThrow._out.body?.ok === true,
  JSON.stringify(mpCheckoutMailThrow._out.body),
);

const mpCheckoutFailAviso = [];
const mpCheckoutFail = mockRes();
await handleCheckout(
  {
    method: "POST",
    body: {},
    headers: { "x-forwarded-for": "203.0.113.195", cookie: "haberes_session=unit-session" },
  },
  mpCheckoutFail,
  {
    hasDatabaseUrl: () => true,
    requireCompany: async () => ({ id: "co1", email: "pyme@example.cl" }),
    hasMp: () => true,
    hasFlow: () => false,
    createMp: async () => ({ ok: false, reason: "mp_error" }),
    notifyCheckout: async (company, meta) => {
      mpCheckoutFailAviso.push({ company, meta });
    },
  },
);
assert(
  "checkout MP 502 no avisa",
  mpCheckoutFail._out.statusCode === 502 && mpCheckoutFailAviso.length === 0,
  JSON.stringify({ status: mpCheckoutFail._out.statusCode, calls: mpCheckoutFailAviso }),
);

let flowApplyHits = 0;
const missingTok = mockRes();
await handleFlowWebhook(
  { method: "POST", body: {}, headers: { "x-forwarded-for": "203.0.113.94" } },
  missingTok,
  {
    fetchImpl: async () => {
      flowApplyHits += 1;
      return { ok: true, status: 200, json: async () => ({ status: 2 }) };
    },
    applyStatus: async () => {
      flowApplyHits += 10;
    },
  },
);
assert(
  "webhook Flow sin token no voltea plan",
  missingTok._out.statusCode === 200 && flowApplyHits === 0,
  JSON.stringify({ status: missingTok._out.statusCode, hits: flowApplyHits, body: missingTok._out.body }),
);

flowApplyHits = 0;
const unknownTok = mockRes();
await handleFlowWebhook(
  { method: "POST", body: { token: "unknown-token" }, headers: { "x-forwarded-for": "203.0.113.95" } },
  unknownTok,
  {
    fetchImpl: async () => {
      flowApplyHits += 1;
      return { ok: false, status: 400, json: async () => ({ code: 404, message: "not found" }) };
    },
    applyStatus: async () => {
      flowApplyHits += 10;
    },
    getRegisterStatus: async () => ({ ok: false, data: null }),
  },
);
assert(
  "webhook Flow token desconocido no voltea plan",
  unknownTok._out.statusCode === 200 && flowApplyHits === 1,
  JSON.stringify({ status: unknownTok._out.statusCode, hits: flowApplyHits }),
);

assert(
  "readFlowToken form-urlencoded",
  readFlowToken({ body: "token=abc123", headers: {}, url: "/api/flow-webhook" }) === "abc123",
);

flowApplyHits = 0;
let flowAppliedPlan = null;
const paidHook = mockRes();
await handleFlowWebhook(
  { method: "POST", body: { token: "paid-token", status: "2" }, headers: { "x-forwarded-for": "203.0.113.96" } },
  paidHook,
  {
    fetchImpl: async (url) => {
      flowApplyHits += 1;
      if (String(url).includes("/payment/getStatus")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            flowOrder: 776655,
            commerceOrder: "pro-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-1-abcd",
            status: 2,
            subject: "Haberes Pro — 1 mes",
            currency: "CLP",
            amount: 17838,
            optional: { company_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    },
    applyStatus: async (_client, status) => {
      flowAppliedPlan = Number(status.status) === 2 ? "pro" : "gratis";
    },
    getRegisterStatus: async () => ({ ok: false, data: null }),
    withDb: async (fn) => fn({}),
  },
);
assert(
  "webhook Flow consulta getStatus y no usa el body crudo",
  paidHook._out.statusCode === 200 && flowApplyHits === 1 && flowAppliedPlan === "pro",
  JSON.stringify({ status: paidHook._out.statusCode, hits: flowApplyHits, plan: flowAppliedPlan }),
);

const flowHookMailClient = mockFlowClient({
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  plan: "gratis",
  flow_token: null,
  plan_until: null,
  email: "pyme@example.cl",
  rut: "12345678-5",
  razon_social: "Pyme SpA",
});
const flowHookMailThrow = mockRes();
await handleFlowWebhook(
  { method: "POST", body: { token: "paid-token", status: "2" }, headers: { "x-forwarded-for": "203.0.113.196" } },
  flowHookMailThrow,
  {
    fetchImpl: async (url) => {
      if (String(url).includes("/payment/getStatus")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            flowOrder: 776655,
            commerceOrder: "pro-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-1-abcd",
            status: 2,
            currency: "CLP",
            amount: 17838,
            optional: { company_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    },
    applyStatus: async (client, status, token) =>
      applyFetchedFlowStatus(client, status, token, {
        notifyPro: async () => {
          throw new Error("resend down");
        },
      }),
    getRegisterStatus: async () => ({ ok: false, data: null }),
    withDb: async (fn) => fn(flowHookMailClient),
  },
);
assert(
  "webhook Flow activa Pro aunque el aviso lanza",
  flowHookMailThrow._out.statusCode === 200 &&
    flowHookMailThrow._out.body?.ok === true &&
    flowHookMailClient.state.row.plan === "pro",
  JSON.stringify({
    status: flowHookMailThrow._out.statusCode,
    plan: flowHookMailClient.state.row.plan,
  }),
);

function mockFlowClient(row) {
  const state = { row: { ...row }, sql: [] };
  return {
    state,
    async query(sql, params = []) {
      state.sql.push(sql);
      if (/SELECT id, plan, flow_token/.test(sql)) {
        return { rows: state.row ? [state.row] : [] };
      }
      if (/SET plan = 'pro'/.test(sql)) {
        state.row = {
          ...state.row,
          plan: "pro",
          flow_token: params[1],
          flow_order: params[2],
          flow_commerce_order: params[3],
          plan_until: params[4],
        };
        return { rowCount: 1 };
      }
      if (/SET plan = 'gratis'/.test(sql)) {
        if (state.row && String(state.row.flow_token) === String(params[1])) {
          state.row = { ...state.row, plan: "gratis", plan_until: null };
          return { rowCount: 1, rows: [{ id: state.row.id }] };
        }
        return { rowCount: 0, rows: [] };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

const flowClient = mockFlowClient({
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  plan: "gratis",
  flow_token: null,
  plan_until: null,
  email: "pyme@example.cl",
  rut: "12345678-5",
  razon_social: "Pyme SpA",
});
const flowPayAviso = [];
const flowPaid = await applyFetchedFlowStatus(
  flowClient,
  {
    flowOrder: 776655,
    commerceOrder: "pro-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-1-abcd",
    status: 2,
    currency: "CLP",
    amount: 17838,
    optional: { company_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
  },
  "paid-token",
  {
    notifyPro: async (row, meta) => {
      flowPayAviso.push({ row, meta });
    },
  },
);
assert(
  "pago Flow aprobado activa Pro",
  flowPaid.applied && flowPaid.plan === "pro" && flowClient.state.row.plan === "pro",
  JSON.stringify(flowPaid),
);
assert(
  "pago Flow aprobado avisa a operación",
  flowPayAviso.length === 1 &&
    flowPayAviso[0].meta?.provider === "flow" &&
    flowPayAviso[0].meta?.eventId === "paid-token",
  JSON.stringify(flowPayAviso),
);
const flowPayMailThrow = await applyFetchedFlowStatus(
  mockFlowClient({
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    plan: "gratis",
    flow_token: null,
    plan_until: null,
    email: "pyme@example.cl",
    rut: "12345678-5",
    razon_social: "Pyme SpA",
  }),
  {
    flowOrder: 776655,
    commerceOrder: "pro-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-1-abcd",
    status: 2,
    currency: "CLP",
    amount: 17838,
    optional: { company_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
  },
  "paid-token",
  {
    notifyPro: async () => {
      throw new Error("resend down");
    },
  },
);
assert(
  "pago Flow aprobado sigue si el aviso lanza",
  flowPayMailThrow.applied && flowPayMailThrow.plan === "pro",
  JSON.stringify(flowPayMailThrow),
);
const flowPending = await applyFetchedFlowStatus(
  flowClient,
  {
    status: 1,
    currency: "CLP",
    amount: 17838,
    optional: { company_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
  },
  "other-token",
);
assert("pago Flow pendiente no cambia plan", flowPending.applied === false && flowClient.state.row.plan === "pro");
const flowRejectedOther = await applyFetchedFlowStatus(
  flowClient,
  {
    status: 3,
    optional: { company_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
  },
  "other-token",
);
assert(
  "Flow rechazado de otro token no baja Pro",
  flowRejectedOther.applied === false && flowClient.state.row.plan === "pro",
);
const flowCanceled = await applyFetchedFlowStatus(
  flowClient,
  {
    status: 4,
    optional: { company_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
  },
  "paid-token",
);
assert(
  "Flow anulado del cobro activo vuelve a Gratis",
  flowCanceled.applied && flowCanceled.plan === "gratis" && flowClient.state.row.plan === "gratis",
  JSON.stringify(flowCanceled),
);

function mockFlowSubClient(row) {
  const state = { row: { ...row }, sql: [] };
  return {
    state,
    async query(sql, params = []) {
      state.sql.push(sql);
      if (/FROM companies WHERE flow_customer_id/.test(sql) || /FROM companies WHERE flow_subscription_id/.test(sql) || /FROM companies WHERE id =/.test(sql)) {
        return { rows: state.row ? [state.row] : [] };
      }
      if (/SET plan = 'pro'/.test(sql) && /flow_customer_id/.test(sql)) {
        state.row = {
          ...state.row,
          plan: "pro",
          plan_until: null,
          flow_customer_id: params[1] || state.row.flow_customer_id,
          flow_subscription_id: params[2] || state.row.flow_subscription_id,
          flow_plan_id: params[3] || state.row.flow_plan_id,
        };
        return { rowCount: 1 };
      }
      if (/SET plan = 'gratis'/.test(sql)) {
        state.row = { ...state.row, plan: "gratis", plan_until: null };
        return { rowCount: 1, rows: [{ id: state.row.id, email: "pyme@example.cl", razon_social: "Pyme" }] };
      }
      if (/SELECT \* FROM companies/.test(sql)) {
        return { rows: state.row ? [state.row] : [] };
      }
      return { rows: state.row ? [state.row] : [], rowCount: 0 };
    },
  };
}
const flowSubClient = mockFlowSubClient({
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  plan: "gratis",
  flow_customer_id: "cus_unit",
  flow_subscription_id: null,
  flow_plan_id: FLOW_PLAN_ID,
  email: "pyme@example.cl",
  razon_social: "Pyme",
});
const flowSubAviso = [];
const cardReg = await applyFlowCardRegistered(
  flowSubClient,
  { customerId: "cus_unit", status: "1" },
  {
    fetchImpl: async (url) => {
      if (String(url).includes("/subscription/create")) {
        return { ok: true, status: 200, json: async () => ({ subscriptionId: "sus_unit" }) };
      }
      throw new Error("unexpected Flow call");
    },
    notifyPro: async (row, meta) => {
      flowSubAviso.push({ row, meta });
    },
  },
);
assert(
  "registro de tarjeta Flow crea suscripción y activa Pro",
  cardReg.applied &&
    cardReg.plan === "pro" &&
    flowSubClient.state.row.plan === "pro" &&
    flowSubClient.state.row.flow_subscription_id === "sus_unit" &&
    flowSubClient.state.row.plan_until == null,
  JSON.stringify(cardReg),
);
assert(
  "registro de tarjeta Flow avisa a operación",
  flowSubAviso.length === 1 &&
    flowSubAviso[0].meta?.provider === "flow" &&
    flowSubAviso[0].meta?.eventId === "sus_unit",
  JSON.stringify(flowSubAviso),
);
const invPaid = await applyFetchedFlowInvoice(flowSubClient, {
  customerId: "cus_unit",
  subscriptionId: "sus_unit",
  status: 1,
  currency: "CLP",
  amount: 17838,
});
assert("invoice Flow pagado renueva Pro", invPaid.applied && invPaid.plan === "pro", JSON.stringify(invPaid));
let flowMail = 0;
const invFail = await applyFetchedFlowInvoice(
  flowSubClient,
  { customerId: "cus_unit", subscriptionId: "sus_unit", status: 2, currency: "CLP", amount: 17838 },
  {
    notify: async () => {
      flowMail += 1;
    },
  },
);
assert(
  "invoice Flow fallido vuelve a Gratis y avisa",
  invFail.applied && invFail.plan === "gratis" && flowSubClient.state.row.plan === "gratis" && flowMail === 1,
  JSON.stringify({ invFail, flowMail }),
);

const flowHookGet = mockRes();
await flowWebhook({ method: "GET", headers: {} }, flowHookGet);
assert("webhook Flow GET 200", flowHookGet._out.statusCode === 200 && flowHookGet._out.body?.ok === true);

assert("configuredProviders incluye flow con claves", configuredProviders().includes("flow"));
clearFlowEnv();
assert("configuredProviders sin flow si no hay claves", configuredProviders().includes("flow") === false);
restoreFlowEnv();

const prevAdminE = process.env.ADMIN_EMAILS;
const prevAdminH = process.env.ADMIN_PASSWORD_HASH;
delete process.env.ADMIN_EMAILS;
delete process.env.ADMIN_PASSWORD_HASH;
const adminRes = mockRes();
await adminLogin(mockReq("POST", { email: "ops@example.com", password: "tenchars!!" }, "203.0.113.41"), adminRes);
assert(
  "admin-login 503 sin env",
  adminRes._out.statusCode === 503 && adminRes._out.body?.reason === "admin_unavailable",
  JSON.stringify(adminRes._out.body),
);
if (prevAdminE !== undefined) process.env.ADMIN_EMAILS = prevAdminE;
else delete process.env.ADMIN_EMAILS;
if (prevAdminH !== undefined) process.env.ADMIN_PASSWORD_HASH = prevAdminH;
else delete process.env.ADMIN_PASSWORD_HASH;

const {
  classifySubscription,
  paymentProvider,
  paymentIdsPublic,
  summarizeSubscriptions,
  companyAdminPublic,
  parseProductoPeriod,
  parseTraficoPeriod,
  productoFromCounts,
  PRO_GROSS_CLP,
} = await import("../api/_admin-ops.js");
const nowOps = Date.parse("2026-08-18T12:00:00.000Z");
assert("suscripción Pro abierta", classifySubscription({ plan: "pro", plan_until: null }, nowOps) === "pro_vigente");
assert(
  "suscripción Pro vencida",
  classifySubscription({ plan: "pro", plan_until: "2026-07-01T00:00:00.000Z" }, nowOps) === "vencida",
);
assert(
  "suscripción Gratis expirada sigue vencida",
  classifySubscription({ plan: "gratis", plan_until: "2026-07-01T00:00:00.000Z" }, nowOps) === "vencida",
);
assert("suscripción Gratis", classifySubscription({ plan: "gratis", plan_until: null }, nowOps) === "gratis");
assert("proveedor MP", paymentProvider({ mp_preapproval_id: "pre_1" }) === "mp");
assert("proveedor Flow", paymentProvider({ flow_subscription_id: "sus_1" }) === "flow");
assert(
  "proveedor ambos",
  paymentProvider({ mp_payment_id: "pay_1", flow_order: "ord_1" }) === "mp_flow",
);
assert("proveedor ninguno", paymentProvider({}) === null);
const ids = paymentIdsPublic({
  mp_payment_id: "pay_1",
  flow_token: "tok_secret",
  flow_subscription_id: "sus_1",
  password_hash: "$argon2id$no",
});
assert(
  "ids de cobro sin token ni hash",
  ids.mpPaymentId === "pay_1" &&
    ids.flowSubscriptionId === "sus_1" &&
    ids.flowToken == null &&
    !JSON.stringify(ids).includes("argon2") &&
    !JSON.stringify(ids).includes("tok_secret"),
);
const pub = companyAdminPublic(
  {
    id: "c1",
    rut: "760864285",
    email: "pyme@example.cl",
    razon_social: "Pyme SpA",
    created_at: "2026-08-01T00:00:00.000Z",
    disabled_at: null,
    plan: "pro",
    plan_until: null,
    mp_preapproval_id: "pre_1",
    has_logo: true,
    documentos: 3,
    password_hash: "$argon2id$hidden",
  },
  nowOps,
);
assert(
  "companyAdminPublic sin secretos y Pro vigente",
  pub.plan === "pro" &&
    pub.status === "pro_vigente" &&
    pub.vigencia.kind === "open" &&
    pub.provider === "mp" &&
    !Object.prototype.hasOwnProperty.call(pub, "password_hash") &&
    JSON.stringify(pub).includes("pyme@example.cl") &&
    !JSON.stringify(pub).includes("argon2"),
);
const sum = summarizeSubscriptions(
  [
    { plan: "pro", plan_until: null },
    { plan: "pro", plan_until: "2026-07-01T00:00:00.000Z" },
    { plan: "gratis", plan_until: null },
    { plan: "gratis", plan_until: null },
  ],
  nowOps,
);
assert(
  "resumen Pro/Gratis/vencidas y estimado 17838",
  sum.pro === 1 &&
    sum.vencidas === 1 &&
    sum.gratis === 2 &&
    sum.ingresosEstimadosClp === PRO_GROSS_CLP &&
    sum.ingresosEstimados.totalClp === 17838 &&
    sum.cobroFallido.available === false &&
    sum.proNuevosSemana.available === false &&
    sum.bajasSemana.available === false,
  JSON.stringify(sum),
);
assert("período producto 7 o 30", parseProductoPeriod("7") === 7 && parseProductoPeriod("99") === 30);
assert("período tráfico 7 o 28", parseTraficoPeriod("7") === 7 && parseTraficoPeriod("x") === 28);
const prod = productoFromCounts({ accountsNew: 2, documents: 4, movements: 1, envios: 0 }, 7, "2026-08-11T12:00:00.000Z");
assert(
  "producto sin checkout inventado",
  prod.accountsNew === 2 &&
    prod.documents === 4 &&
    prod.checkoutsStarted.available === false &&
    prod.checkoutsPaid.available === false,
);

const {
  ga4Configured,
  ga4PropertyId,
  ga4ServiceAccount,
  parseServiceAccountJson,
  mapGa4Channel,
  foldChannels,
  parseGa4Batch,
  ga4OperatorError,
  clearGa4Cache,
  loadGa4Report,
  ga4NotConfiguredBody,
} = await import("../api/_ga4.js");
const { handleAdminTrafico } = await import("../api/admin-trafico.js");
const { handleAdminProducto } = await import("../api/admin-producto.js");

const prevGa4 = {
  GA4_PROPERTY_ID: process.env.GA4_PROPERTY_ID,
  GOOGLE_ANALYTICS_PROPERTY_ID: process.env.GOOGLE_ANALYTICS_PROPERTY_ID,
  GA4_SERVICE_ACCOUNT_JSON: process.env.GA4_SERVICE_ACCOUNT_JSON,
  GOOGLE_APPLICATION_CREDENTIALS_JSON: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
};
function restoreGa4Env() {
  for (const [k, v] of Object.entries(prevGa4)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}
delete process.env.GA4_PROPERTY_ID;
delete process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
delete process.env.GA4_SERVICE_ACCOUNT_JSON;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
clearGa4Cache();
assert("GA4 no configurado sin env", ga4Configured() === false);
assert("GA4 property default Haberes", ga4PropertyId({}) === "550712485");
assert("GA4 default no configura sin cuenta de servicio", ga4Configured({}) === false);
assert("GA4_PROPERTY_ID gana al default", ga4PropertyId({ GA4_PROPERTY_ID: "999" }) === "999");
const missing = await loadGa4Report({ env: {}, fetchImpl: async () => { throw new Error("no fetch"); } });
assert(
  "GA4 missing no inventa cifras",
  missing.connected === false &&
    missing.reason === "ga4_not_configured" &&
    missing.sessions == null &&
    Array.isArray(missing.willShow) &&
    missing.willShow.includes("sesiones"),
  JSON.stringify(missing),
);
process.env.GOOGLE_ANALYTICS_PROPERTY_ID = "properties/123456";
process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON.stringify({
  client_email: "ga4@example.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
});
assert("GA4 property alias", ga4PropertyId() === "123456");
assert("GA4 service account alias", ga4ServiceAccount()?.client_email === "ga4@example.iam.gserviceaccount.com");
assert("GA4 configurado con alias", ga4Configured() === true);
const ga4SaSample = JSON.stringify({
  client_email: "ga4@example.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
});
assert("GA4_PROPERTY alias extra", ga4PropertyId({ GA4_PROPERTY: "777888" }) === "777888");
assert("ANALYTICS_PROPERTY_ID alias extra", ga4PropertyId({ ANALYTICS_PROPERTY_ID: "555666" }) === "555666");
assert(
  "GOOGLE_SERVICE_ACCOUNT_JSON alias extra",
  ga4ServiceAccount({ GOOGLE_SERVICE_ACCOUNT_JSON: ga4SaSample })?.client_email === "ga4@example.iam.gserviceaccount.com",
);
assert(
  "GCLOUD_SERVICE_ACCOUNT_JSON alias extra",
  ga4ServiceAccount({ GCLOUD_SERVICE_ACCOUNT_JSON: ga4SaSample })?.client_email === "ga4@example.iam.gserviceaccount.com",
);
assert(
  "GA4 configurado con alias extra",
  ga4Configured({ GA4_PROPERTY: "777888", GOOGLE_SERVICE_ACCOUNT_JSON: ga4SaSample }) === true,
);
assert(
  "GA4 aliases vacíos siguen desconectados",
  ga4Configured({
    GA4_PROPERTY: "",
    ANALYTICS_PROPERTY_ID: "",
    GOOGLE_SERVICE_ACCOUNT_JSON: "",
    GCLOUD_SERVICE_ACCOUNT_JSON: "",
  }) === false,
);
assert(
  "GTM no configura la Data API",
  ga4PropertyId({ GA4_PROPERTY_ID: "GTM-PCR596Z2" }) === "" &&
    ga4PropertyId({ GA4_PROPERTY: "GTM-K3F8GGHV" }) === "" &&
    ga4Configured({
      GA4_PROPERTY_ID: "GTM-PCR596Z2",
      NEXT_PUBLIC_GTM_ID: "GTM-K3F8GGHV",
      GA4_SERVICE_ACCOUNT_JSON: ga4SaSample,
    }) === false,
);
assert(
  "GA4 howTo nombra env de Vercel",
  /GA4_PROPERTY_ID/.test(ga4NotConfiguredBody().howTo) &&
    /GA4_SERVICE_ACCOUNT_JSON/.test(ga4NotConfiguredBody().howTo) &&
    !/GTM-PCR596Z2|GTM-K3F8GGHV/.test(ga4NotConfiguredBody().howTo),
);
assert("SA JSON inválido", parseServiceAccountJson("{") === null);
assert("canal orgánico", mapGa4Channel("Organic Search") === "organic");
assert("canal pago Display", mapGa4Channel("Display") === "paid");
assert(
  "canales agrupados",
  JSON.stringify(foldChannels([{ name: "Organic Search", sessions: 4 }, { name: "Email", sessions: 1 }])) ===
    JSON.stringify({ organic: 4, direct: 0, referral: 0, paid: 0, other: 1 }),
);
const parsedBatch = parseGa4Batch({
  reports: [
    { rows: [{ metricValues: [{ value: "10" }, { value: "7" }] }] },
    { rows: [{ dimensionValues: [{ value: "Direct" }], metricValues: [{ value: "3" }] }] },
    { rows: [{ dimensionValues: [{ value: "Santiago" }], metricValues: [{ value: "5" }] }] },
    { rows: [{ dimensionValues: [{ value: "Chile" }], metricValues: [{ value: "8" }] }] },
    { rows: [{ dimensionValues: [{ value: "/sueldo" }], metricValues: [{ value: "2" }] }] },
  ],
});
assert(
  "parse GA4 batch",
  parsedBatch.sessions === 10 &&
    parsedBatch.users === 7 &&
    parsedBatch.channels.direct === 3 &&
    parsedBatch.cities[0].name === "Santiago" &&
    parsedBatch.landings[0].name === "/sueldo",
);
assert("error GA4 403 en lenguaje operador", /cuenta de servicio/.test(ga4OperatorError({ error: { code: 403, status: "PERMISSION_DENIED" } }, 403)));

const fakeToken = async () => ({ ok: true, token: "ya29.unit" });
const fakeGa4Ok = async (url, init) => {
  const u = String(url);
  if (u.includes("oauth2.googleapis.com")) throw new Error("token path should be injected");
  if (!u.includes("batchRunReports")) throw new Error(`unexpected ${u}`);
  const body = JSON.parse(init.body);
  assert("GA4 pide 7 u 28 días", body.requests[0].dateRanges[0].startDate === "7daysAgo");
  return {
    ok: true,
    status: 200,
    json: async () => ({
      reports: [
        { rows: [{ metricValues: [{ value: "21" }, { value: "11" }] }] },
        { rows: [{ dimensionValues: [{ value: "Organic Search" }], metricValues: [{ value: "12" }] }] },
        { rows: [{ dimensionValues: [{ value: "(not set)" }], metricValues: [{ value: "9" }] }] },
        { rows: [{ dimensionValues: [{ value: "Chile" }], metricValues: [{ value: "21" }] }] },
        { rows: [{ dimensionValues: [{ value: "/" }], metricValues: [{ value: "6" }] }] },
      ],
    }),
  };
};
clearGa4Cache();
const okReport = await loadGa4Report({
  env: process.env,
  periodDays: 7,
  fetchImpl: fakeGa4Ok,
  getAccessToken: fakeToken,
});
assert(
  "GA4 informe mockeado",
  okReport.ok === true &&
    okReport.connected === true &&
    okReport.sessions === 21 &&
    okReport.channels.organic === 12 &&
    okReport.cities.length === 0 &&
    okReport.countries[0].name === "Chile",
  JSON.stringify(okReport),
);

const fakeGa4Fail = async () => ({
  ok: false,
  status: 403,
  json: async () => ({ error: { code: 403, status: "PERMISSION_DENIED", message: "stack\ntrace" } }),
});
clearGa4Cache();
const failReport = await loadGa4Report({
  env: process.env,
  periodDays: 28,
  fetchImpl: fakeGa4Fail,
  getAccessToken: fakeToken,
});
assert(
  "GA4 error sin stack",
  failReport.ok === false &&
    failReport.connected === true &&
    /cuenta de servicio/.test(failReport.error) &&
    !/stack/.test(JSON.stringify(failReport)),
  JSON.stringify(failReport),
);

const passAdmin = async () => ({ email: "ops@example.com" });
const traficoMissing = mockRes();
clearGa4Cache();
delete process.env.GA4_PROPERTY_ID;
delete process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
delete process.env.GA4_SERVICE_ACCOUNT_JSON;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
await handleAdminTrafico({ method: "GET", url: "/api/admin-trafico?period=7" }, traficoMissing, {
  requireAdmin: passAdmin,
  env: {},
  fetchImpl: async () => { throw new Error("no"); },
});
assert(
  "admin-trafico 200 no conectado",
  traficoMissing._out.statusCode === 200 &&
    traficoMissing._out.body?.connected === false &&
    traficoMissing._out.body?.reason === "ga4_not_configured",
  JSON.stringify(traficoMissing._out.body),
);
const traficoErr = mockRes();
await handleAdminTrafico({ method: "GET", url: "/api/admin-trafico" }, traficoErr, {
  requireAdmin: passAdmin,
  loadGa4Report: async () => ({ ok: false, connected: true, reason: "ga4_error", error: "GA4 rechazó el acceso." }),
});
assert(
  "admin-trafico error de API",
  traficoErr._out.statusCode === 200 &&
    traficoErr._out.body?.ok === false &&
    traficoErr._out.body?.error === "GA4 rechazó el acceso.",
);
const trafico405 = mockRes();
await handleAdminTrafico(mockReq("POST", {}), trafico405, { requireAdmin: passAdmin });
assert("admin-trafico 405", trafico405._out.statusCode === 405);

const prodRes = mockRes();
await handleAdminProducto({ method: "GET", url: "/api/admin-producto?period=7" }, prodRes, {
  requireAdmin: passAdmin,
  now: nowOps,
  withDb: async (fn) =>
    fn({
      query: async () => ({ rows: [{ n: 3 }] }),
    }),
});
assert(
  "admin-producto agrega cuentas y omite checkout",
  prodRes._out.statusCode === 200 &&
    prodRes._out.body?.producto?.accountsNew === 3 &&
    prodRes._out.body?.producto?.periodDays === 7 &&
    prodRes._out.body?.producto?.checkoutsPaid?.available === false,
  JSON.stringify(prodRes._out.body),
);

const {
  summarizeOutbound,
  countAltasMismoCorreo,
  normalizeOutboundEstado,
  parseOutboundPayload,
  mapResendLastEvent,
} = await import("../api/_outbound.js");
const { handleAdminOutbound } = await import("../api/admin-outbound.js");
const emptyOut = summarizeOutbound([]);
assert(
  "outbound 0 filas es cero honesto",
  emptyOut.enviados === 0 &&
    emptyOut.entregados === 0 &&
    emptyOut.rebotes === 0 &&
    emptyOut.bajas === 0 &&
    emptyOut.tasaEntrega === 0 &&
    emptyOut.opens.available === false &&
    emptyOut.clicks.available === false,
  JSON.stringify(emptyOut),
);
const mixOut = summarizeOutbound([
  { estado: "delivered", email: "a@b.cl", baja: false },
  { estado: "delivered", email: "c@d.cl", baja: false },
  { estado: "bounced", email: "e@f.cl", baja: true },
  { estado: "sent", email: "g@h.cl", baja: false },
]);
assert(
  "outbound mezcla delivered/bounced",
  mixOut.enviados === 4 &&
    mixOut.entregados === 2 &&
    mixOut.rebotes === 1 &&
    mixOut.bajas === 1 &&
    mixOut.tasaEntrega === 0.5,
  JSON.stringify(mixOut),
);
assert(
  "outbound altas con mismo correo",
  countAltasMismoCorreo(
    [{ email: "a@b.cl" }, { email: "A@B.CL" }, { email: "x@y.cl" }],
    ["a@b.cl", "otro@z.cl"],
  ) === 1,
);
assert("outbound last_event opened cuenta como delivered", normalizeOutboundEstado("opened") === "delivered");
assert("outbound last_event Resend", mapResendLastEvent({ last_event: "bounced" }) === "bounced");
assert("outbound payload inválido", parseOutboundPayload({ email: "no" }) === null);
assert(
  "outbound payload ok",
  parseOutboundPayload({ email: "Ops@Pyme.cl", estado: "sent", empresa: "Pyme" })?.email === "ops@pyme.cl",
);

const outEmpty = mockRes();
await handleAdminOutbound({ method: "GET", url: "/api/admin-outbound?period=7" }, outEmpty, {
  requireAdmin: passAdmin,
  now: nowOps,
  env: {},
  withDb: async (fn) =>
    fn({
      query: async (sql) => {
        if (/FROM companies/.test(sql)) return { rows: [] };
        return { rows: [] };
      },
    }),
});
assert(
  "admin-outbound vacío sin inventar aperturas",
  outEmpty._out.statusCode === 200 &&
    outEmpty._out.body?.summary?.enviados === 0 &&
    outEmpty._out.body?.summary?.altasMismoCorreo === 0 &&
    outEmpty._out.body?.summary?.opens?.available === false &&
    Array.isArray(outEmpty._out.body?.sends) &&
    outEmpty._out.body.sends.length === 0,
  JSON.stringify(outEmpty._out.body),
);
const outMix = mockRes();
await handleAdminOutbound({ method: "GET", url: "/api/admin-outbound?period=30" }, outMix, {
  requireAdmin: passAdmin,
  now: nowOps,
  env: {},
  withDb: async (fn) =>
    fn({
      query: async (sql) => {
        if (/FROM companies/.test(sql)) return { rows: [{ email: "alta@pyme.cl" }] };
        return {
          rows: [
            { id: "1", created_at: "2026-08-17T00:00:00.000Z", empresa: "Alta", email: "alta@pyme.cl", estado: "delivered", baja: false },
            { id: "2", created_at: "2026-08-16T00:00:00.000Z", empresa: "Rebote", email: "no@pyme.cl", estado: "bounced", baja: false },
          ],
        };
      },
    }),
});
assert(
  "admin-outbound agrega delivered/bounced y alta por correo",
  outMix._out.statusCode === 200 &&
    outMix._out.body?.summary?.enviados === 2 &&
    outMix._out.body?.summary?.entregados === 1 &&
    outMix._out.body?.summary?.rebotes === 1 &&
    outMix._out.body?.summary?.altasMismoCorreo === 1 &&
    outMix._out.body?.summary?.opens?.available === false,
  JSON.stringify(outMix._out.body),
);
const outPost = mockRes();
await handleAdminOutbound(mockReq("POST", { email: "nueva@pyme.cl", estado: "sent", empresa: "Nueva" }), outPost, {
  requireAdmin: passAdmin,
  withDb: async (fn) =>
    fn({
      query: async () => ({
        rows: [
          {
            id: "n1",
            created_at: "2026-08-18T00:00:00.000Z",
            empresa: "Nueva",
            email: "nueva@pyme.cl",
            estado: "sent",
            baja: false,
            responded: null,
            lote: "2026-08-18",
            utm_content: null,
          },
        ],
      }),
    }),
});
assert(
  "admin-outbound POST registra envío",
  outPost._out.statusCode === 200 &&
    outPost._out.body?.send?.email === "nueva@pyme.cl" &&
    outPost._out.body?.send?.estado === "sent",
  JSON.stringify(outPost._out.body),
);
const out405 = mockRes();
await handleAdminOutbound(mockReq("PUT", {}), out405, { requireAdmin: passAdmin });
assert("admin-outbound 405", out405._out.statusCode === 405);
restoreGa4Env();
clearGa4Cache();

const R2_ENV_KEYS = [
  "R2_ACCOUNT_ID",
  "CLOUDFLARE_ACCOUNT_ID",
  "CF_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "AWS_ACCESS_KEY_ID",
  "R2_ACCESS_KEY",
  "R2_SECRET_ACCESS_KEY",
  "AWS_SECRET_ACCESS_KEY",
  "R2_SECRET",
  "R2_BUCKET",
  "R2_BUCKET_NAME",
  "BUCKET_NAME",
];
const prevR2 = Object.fromEntries(R2_ENV_KEYS.map((k) => [k, process.env[k]]));
function restoreR2Env() {
  for (const k of R2_ENV_KEYS) {
    if (prevR2[k] === undefined) delete process.env[k];
    else process.env[k] = prevR2[k];
  }
}
function clearR2Env() {
  for (const k of R2_ENV_KEYS) delete process.env[k];
}

const { hasR2, r2Config } = await import("../api/_r2.js");
const storageApi = (await import("../api/storage.js")).default;
clearR2Env();
assert("hasR2 false sin env", hasR2() === false);
assert("r2Config null sin env", r2Config() === null);

const storageOff = mockRes();
await storageApi({ method: "GET", headers: {} }, storageOff);
assert(
  "GET /api/storage false sin env",
  storageOff._out.statusCode === 200 &&
    storageOff._out.body?.ok === true &&
    storageOff._out.body?.storage === false &&
    Object.keys(storageOff._out.body).sort().join(",") === "ok,storage",
  Object.keys(storageOff._out.body || {}).join(","),
);
const storagePost = mockRes();
await storageApi(mockReq("POST", {}), storagePost);
assert(
  "POST /api/storage 405",
  storagePost._out.statusCode === 405 && storagePost._out.body?.reason === "method_not_allowed",
);

process.env.CLOUDFLARE_ACCOUNT_ID = "acct-cf";
process.env.AWS_ACCESS_KEY_ID = "key-aws";
process.env.AWS_SECRET_ACCESS_KEY = "secret-aws";
process.env.BUCKET_NAME = "haberes";
assert("hasR2 true con alias Cloudflare/AWS", hasR2() === true);
const aliasCfg = r2Config();
assert(
  "r2Config usa alias",
  aliasCfg?.accountId === "acct-cf" &&
    aliasCfg?.accessKeyId === "key-aws" &&
    aliasCfg?.secretAccessKey === "secret-aws" &&
    aliasCfg?.bucket === "haberes",
);

process.env.R2_ACCOUNT_ID = "acct-r2";
process.env.R2_ACCESS_KEY_ID = "key-r2";
process.env.R2_SECRET_ACCESS_KEY = "secret-r2";
process.env.R2_BUCKET = "haberes-r2";
const canonCfg = r2Config();
assert(
  "r2Config canónico gana al alias",
  canonCfg?.accountId === "acct-r2" &&
    canonCfg?.accessKeyId === "key-r2" &&
    canonCfg?.secretAccessKey === "secret-r2" &&
    canonCfg?.bucket === "haberes-r2",
);

clearR2Env();
process.env.R2_ACCOUNT_ID = "   ";
process.env.CF_ACCOUNT_ID = "acct-cf2";
process.env.R2_ACCESS_KEY = "key-short";
process.env.R2_SECRET = "secret-short";
process.env.R2_BUCKET_NAME = "haberes";
const blankCfg = r2Config();
assert(
  "r2Config salta vacíos y usa el siguiente",
  blankCfg?.accountId === "acct-cf2" &&
    blankCfg?.accessKeyId === "key-short" &&
    blankCfg?.secretAccessKey === "secret-short" &&
    blankCfg?.bucket === "haberes",
);

const storageOn = mockRes();
await storageApi({ method: "GET", headers: {} }, storageOn);
assert(
  "GET /api/storage true con alias",
  storageOn._out.statusCode === 200 &&
    storageOn._out.body?.ok === true &&
    storageOn._out.body?.storage === true &&
    Object.keys(storageOn._out.body).sort().join(",") === "ok,storage" &&
    !Object.values(storageOn._out.body).some((v) => typeof v === "string" && /acct-|key-|secret-/.test(v)),
);
restoreR2Env();

const resetIp = "203.0.113.25";
for (let i = 0; i < 5; i += 1) {
  await resetRequest(mockReq("POST", { rut: "12.345.678-5", email: "a@b.cl" }, resetIp), mockRes());
}
const reset429 = mockRes();
await resetRequest(mockReq("POST", { rut: "12.345.678-5", email: "a@b.cl" }, resetIp), reset429);
assert(
  "reset-request 429 al 6º intento",
  reset429._out.statusCode === 429 && reset429._out.body?.reason === "rate_limited",
  JSON.stringify(reset429._out.body),
);

if (prevDb !== undefined) process.env.DATABASE_URL = prevDb;
else delete process.env.DATABASE_URL;
if (prevDbUnpooled !== undefined) process.env.DATABASE_URL_UNPOOLED = prevDbUnpooled;
else delete process.env.DATABASE_URL_UNPOOLED;
if (prevResend !== undefined) process.env.RESEND_API_KEY = prevResend;
else delete process.env.RESEND_API_KEY;

const apiFiles = [
  "api/_lib.js",
  "api/_r2.js",
  "api/storage.js",
  "api/_pdf.js",
  "api/register.js",
  "api/login.js",
  "api/logout.js",
  "api/me.js",
  "api/profile.js",
  "api/logo.js",
  "api/firma.js",
  "api/_asset.js",
  "api/documento.js",
  "api/reset-request.js",
  "api/reset-confirm.js",
  "api/_admin.js",
  "api/_admin-ops.js",
  "api/_ga4.js",
  "api/admin-login.js",
  "api/admin-logout.js",
  "api/admin-me.js",
  "api/admin-companies.js",
  "api/admin-producto.js",
  "api/admin-trafico.js",
  "api/_outbound.js",
  "api/admin-outbound.js",
  "api/movimiento.js",
  "api/_mp.js",
  "api/checkout.js",
  "api/mp-webhook.js",
  "api/_flow.js",
  "api/flow-webhook.js",
  "api/sitemap.js",
  "api/_sitemap.js",
];
for (const f of apiFiles) {
  const src = readFileSync(join(root, f), "utf8");
  assert(
    `${f} no loguea secretos`,
    !/console\.(log|info|debug|warn|error)\([^)]*(token|clave|password|email|rut|hash)/i.test(src),
  );
}

const libSrc = readFileSync(join(root, "api/_lib.js"), "utf8");
assert("sesión HttpOnly Secure SameSite=Lax", /HttpOnly/.test(libSrc) && /Secure/.test(libSrc) && /SameSite=Lax/.test(libSrc));
assert("sin scrypt para claves", !/scrypt/i.test(libSrc));
assert("hashPassword usa argon2", /argon2/i.test(libSrc) && /Argon2id/.test(libSrc));
assert("schema 004 en _lib", /004\.sql/.test(libSrc) && /INLINE_SCHEMA_004/.test(libSrc));
assert("schema 005 en _lib", /005\.sql/.test(libSrc) && /INLINE_SCHEMA_005/.test(libSrc));
assert("schema 007 en _lib", /007\.sql/.test(libSrc) && /INLINE_SCHEMA_007/.test(libSrc));
assert("schema 008 en _lib", /008\.sql/.test(libSrc) && /INLINE_SCHEMA_008/.test(libSrc));
assert("schema 009 en _lib", /009\.sql/.test(libSrc) && /INLINE_SCHEMA_009/.test(libSrc) && /outbound_sends/.test(libSrc));

const sql = readFileSync(join(root, "sql/001.sql"), "utf8");
assert(
  "sql/001.sql tablas",
  /CREATE TABLE IF NOT EXISTS companies/i.test(sql) &&
    /password_reset_tokens/i.test(sql) &&
    /CREATE TABLE IF NOT EXISTS sessions/i.test(sql) &&
    /password_hash/.test(sql),
);
assert("sql/001.sql sin secretos", !/postgres(ql)?:\/\//i.test(sql) && !/DATABASE_URL\s*=/.test(sql));
const sql2 = readFileSync(join(root, "sql/002.sql"), "utf8");
assert(
  "sql/002.sql perfil y clave de objeto",
  /giro/.test(sql2) &&
    /direccion/.test(sql2) &&
    /logo_key/.test(sql2) &&
    /logo_content_type/.test(sql2) &&
    /documentos/.test(sql2) &&
    /object_key/.test(sql2) &&
    !/BYTEA/i.test(sql2) &&
    !/bytea/i.test(sql2),
);
assert("sql/002.sql sin secretos", !/postgres(ql)?:\/\//i.test(sql2) && !/DATABASE_URL\s*=/.test(sql2));
assert("sql/002.sql no rompe cuentas", /ADD COLUMN IF NOT EXISTS/i.test(sql2));
const sql3 = readFileSync(join(root, "sql/003.sql"), "utf8");
assert(
  "sql/003.sql firma, disabled_at y admin",
  /disabled_at/.test(sql3) &&
    /firma_key/.test(sql3) &&
    /firma_content_type/.test(sql3) &&
    /admin_sessions/.test(sql3) &&
    /ADD COLUMN IF NOT EXISTS/i.test(sql3),
);
assert("sql/003.sql sin secretos", !/postgres(ql)?:\/\//i.test(sql3) && !/DATABASE_URL\s*=/.test(sql3));
const sql4 = readFileSync(join(root, "sql/004.sql"), "utf8");
assert(
  "sql/004.sql plan y movimientos",
  /plan/.test(sql4) && /movimientos/.test(sql4) && /ADD COLUMN IF NOT EXISTS/i.test(sql4),
);
assert("sql/004.sql sin secretos", !/postgres(ql)?:\/\//i.test(sql4) && !/DATABASE_URL\s*=/.test(sql4));
const sql5 = readFileSync(join(root, "sql/005.sql"), "utf8");
assert(
  "sql/005.sql cobro Mercado Pago",
  /mp_payment_id/.test(sql5) &&
    /mp_preapproval_id/.test(sql5) &&
    /plan_until/.test(sql5) &&
    /ADD COLUMN IF NOT EXISTS/i.test(sql5),
);
assert("sql/005.sql sin secretos", !/postgres(ql)?:\/\//i.test(sql5) && !/DATABASE_URL\s*=/.test(sql5));
const sql7 = readFileSync(join(root, "sql/007.sql"), "utf8");
assert(
  "sql/007.sql cobro Flow",
  /flow_token/.test(sql7) &&
    /flow_order/.test(sql7) &&
    /flow_commerce_order/.test(sql7) &&
    /ADD COLUMN IF NOT EXISTS/i.test(sql7),
);
assert("sql/007.sql sin secretos", !/postgres(ql)?:\/\//i.test(sql7) && !/DATABASE_URL\s*=/.test(sql7));
const sql8 = readFileSync(join(root, "sql/008.sql"), "utf8");
assert(
  "sql/008.sql suscripción Flow",
  /flow_customer_id/.test(sql8) &&
    /flow_subscription_id/.test(sql8) &&
    /flow_plan_id/.test(sql8) &&
    /ADD COLUMN IF NOT EXISTS/i.test(sql8),
);
assert("sql/008.sql sin secretos", !/postgres(ql)?:\/\//i.test(sql8) && !/DATABASE_URL\s*=/.test(sql8));
const sql9 = readFileSync(join(root, "sql/009.sql"), "utf8");
assert(
  "sql/009.sql outbound_sends",
  /CREATE TABLE IF NOT EXISTS outbound_sends/.test(sql9) &&
    /resend_id/.test(sql9) &&
    /utm_content/.test(sql9) &&
    /responded/.test(sql9) &&
    /baja/.test(sql9),
);
assert("sql/009.sql sin secretos", !/postgres(ql)?:\/\//i.test(sql9) && !/DATABASE_URL\s*=/.test(sql9) && !/re_/.test(sql9));
assert("sin schema prisma inventado", !existsSync(join(root, "prisma")));
assert(
  "empresa.html olvido honesto",
  /Olvidé mi clave/.test(readFileSync(join(root, "empresa.html"), "utf8")) &&
    /no se puede enviar por correo/i.test(readFileSync(join(root, "empresa.html"), "utf8")),
);
assert(
  "empresa.html POST register/login",
  /\/api\/register/.test(readFileSync(join(root, "js/app-empresa.js"), "utf8")) &&
    /\/api\/login/.test(readFileSync(join(root, "js/app-empresa.js"), "utf8")),
);
const empHtml = readFileSync(join(root, "empresa.html"), "utf8");
const empJs = [
  "js/app-empresa.js",
  "js/empresa-trabajadores.js",
  "js/empresa-documentos.js",
  "js/empresa-nomina.js",
  "js/empresa-lre.js",
]
  .map((f) => readFileSync(join(root, f), "utf8"))
  .join("\n");
const empDocJs = readFileSync(join(root, "js/empresa-documentos.js"), "utf8");
assert("empresa.html sin input type=date", !/<input[^>]*type="date"/i.test(empHtml));
assert(
  "empresa.html sin select nativo de trabajador, periodo o causal",
  !/<select\b/i.test(empHtml),
);
assert(
  "empresa.html pickers custom",
  /id="pickTrabajadores"/.test(empHtml) &&
    /id="pickPeriodo"/.test(empHtml) &&
    /id="pickCausal"/.test(empHtml),
);
assert(
  "empresa.html workspace con pestañas",
  /data-tab="empresa"/.test(empHtml) &&
    /data-tab="trabajadores"/.test(empHtml) &&
    /data-tab="documentos"/.test(empHtml),
);
assert("empresa.html vista previa iframe", /id="docPreviewFrame"/.test(empHtml) && /id="panelPreview"/.test(empHtml));
assert("empresa.html giro y dirección", /id="perfilGiro"/.test(empHtml) && /id="perfilDireccion"/.test(empHtml));
assert("empresa.html logo file", /id="logoFile"/.test(empHtml));
assert("empresa.html firma file", /id="firmaFile"/.test(empHtml));
assert("empresa.html Cargar CSV y Descargar ejemplo", /Cargar CSV/.test(empHtml) && /Descargar ejemplo/.test(empHtml) && /btn-row/.test(empHtml));
assert("empresa.html pago masivo XLSX", /btnPagoXlsx/.test(empHtml) && /btnPagoEjemplo/.test(empHtml));
assert("empresa.html Pasar a Pro", /btnPasarPro/.test(empHtml) && /14\.990/.test(empHtml));
assert("empresa.html haberes nombrados", /id="emHaberes"/.test(empHtml) && /Añadir haber/.test(empHtml));
assert("empresa.html feriado pendiente y proporcional", /finFeriadoPend/.test(empHtml) && /finFeriadoProp/.test(empHtml));
assert("app-empresa no usa window.open", !/window\.open/.test(empJs));
assert("app-empresa no usa window.confirm", !/window\.confirm/.test(empJs) && /confirmDialog/.test(empJs));
assert("app-empresa vista previa srcdoc", /mostrarVistaPrevia/.test(empJs) && /srcdoc/.test(readFileSync(join(root, "js/print.js"), "utf8")));
assert(
  "app-empresa perfil, documento, logo y firma",
  /\/api\/profile/.test(empJs) && /\/api\/documento/.test(empJs) && /\/api\/logo/.test(empJs) && /\/api\/firma/.test(empJs),
);
assert(
  "app-empresa movimientos y xlsx de pago",
  /registrarMovimientosRemoto/.test(empJs) &&
    /descargarNomina/.test(empJs) &&
    /\/api\/movimiento/.test(readFileSync(join(root, "js/plan.js"), "utf8")),
);
assert(
  "app-empresa refresca la cabecera al entrar",
  /refreshAccountNav/.test(empJs),
);
assert(
  "app-empresa checkout y retorno de pago",
  /startProCheckout/.test(empJs) &&
    /pago === "ok"/.test(empJs) &&
    /Pro se activa cuando Mercado Pago o Flow confirman/.test(empJs) &&
    /\/api\/checkout/.test(readFileSync(join(root, "js/checkout.js"), "utf8")) &&
    /provider/.test(readFileSync(join(root, "js/checkout.js"), "utf8")) &&
    !/emp\.plan\s*=\s*["']pro["']/.test(empJs),
);
const bajarPdfSrc = empDocJs.slice(empDocJs.indexOf("async function bajarPdf"), empDocJs.indexOf('el("btnPdfLiquidacion")'));
assert(
  "Descargar PDF no cuenta movimiento si falla el almacenamiento",
  /no_storage/.test(bajarPdfSrc) &&
    /el almacenamiento no está configurado/.test(bajarPdfSrc) &&
    bajarPdfSrc.indexOf("apiDownloadPdf") < bajarPdfSrc.indexOf("consumirMovimientos") &&
    bajarPdfSrc.indexOf("if (!blob)") < bajarPdfSrc.indexOf("consumirMovimientos") &&
    bajarPdfSrc.indexOf("consumirMovimientos") > bajarPdfSrc.indexOf("return;"),
);
const docSrc = readFileSync(join(root, "api/documento.js"), "utf8");
const docLibSrc = readFileSync(join(root, "api/_documento.js"), "utf8");
assert(
  "documento no_storage antes de insertar movimientos",
  /if \(!hasR2\(\)\) return noStorage/.test(docSrc) &&
    docSrc.indexOf("if (!hasR2()) return noStorage(res)") < docSrc.indexOf("commit: true") &&
    docLibSrc.indexOf("await r2Put") >= 0 &&
    docSrc.indexOf("commit: false") < docSrc.indexOf("commit: true") &&
    docSrc.indexOf("commit: false") > docSrc.indexOf("if (!hasR2()) return noStorage(res)"),
);
assert(
  "enviar no fusiona PDF de varios trabajadores",
  !/mergePdfs/.test(readFileSync(join(root, "api/enviar.js"), "utf8")) &&
    /generarYGuardarPdf/.test(readFileSync(join(root, "api/enviar.js"), "utf8")),
);
assert("app-empresa editar y eliminar trabajador", /deleteTrabajador/.test(empJs) && /updateTrabajador/.test(empJs));
assert("app-empresa CSV upsert por RUT", /upsertTrabajadores/.test(empJs));
assert(
  "finiquito público sin date/select nativo",
  !/<input[^>]*type="date"/i.test(readFileSync(join(root, "finiquito.html"), "utf8")) &&
    !/<select\b/i.test(readFileSync(join(root, "finiquito.html"), "utf8")) &&
    /id="pickCausal"/.test(readFileSync(join(root, "finiquito.html"), "utf8")),
);
assert(
  "sueldo público sin select nativo",
  !/<select\b/i.test(readFileSync(join(root, "sueldo.html"), "utf8")) &&
    /id="pickAfp"/.test(readFileSync(join(root, "sueldo.html"), "utf8")) &&
    /id="pickContrato"/.test(readFileSync(join(root, "sueldo.html"), "utf8")) &&
    /id="pickSalud"/.test(readFileSync(join(root, "sueldo.html"), "utf8")),
);
const pickerSrc = readFileSync(join(root, "js/picker.js"), "utf8");
const pickerInit = (pickerSrc.match(/root\.innerHTML = `([\s\S]*?)`;/) || [])[1] || "";
assert(
  "picker cerrado por defecto, sin search en el layout",
  /picker-panel" hidden/.test(pickerInit) &&
    !/picker-search/.test(pickerInit) &&
    /unmountSearch/.test(pickerSrc) &&
    /closeAllPickers/.test(pickerSrc) &&
    /Escape/.test(pickerSrc),
);
assert(
  "css panel picker oculto de verdad",
  /picker-panel\[hidden\]/.test(readFileSync(join(root, "css/app.css"), "utf8")) &&
    /display:\s*none\s*!important/.test(readFileSync(join(root, "css/app.css"), "utf8")),
);
assert(
  "css panel calendario con min-width, sin display flex en el bloque base",
  /\.date-field\s+\.picker-panel\s*\{[^}]*min-width:\s*max\(100%,\s*18\.5rem\)/.test(
    readFileSync(join(root, "css/app.css"), "utf8"),
  ) &&
    !/\.date-field\s+\.picker-panel\s*\{[^}]*display:\s*flex/.test(
      readFileSync(join(root, "css/app.css"), "utf8"),
    ),
);
assert(
  "fecha como calendario, no tres selects",
  /createDateField/.test(readFileSync(join(root, "js/picker.js"), "utf8")) &&
    /date-cal-grid/.test(readFileSync(join(root, "js/picker.js"), "utf8")) &&
    /createDateField/.test(readFileSync(join(root, "js/ui.js"), "utf8")) &&
    !/data-pick-d/.test(readFileSync(join(root, "js/ui.js"), "utf8")),
);
assert(
  "finiquito público desglosa feriado pendiente, proporcional y otros",
  /id="diasFeriadoPend"/.test(readFileSync(join(root, "finiquito.html"), "utf8")) &&
    /id="outFeriadoPend"/.test(readFileSync(join(root, "finiquito.html"), "utf8")) &&
    /id="outOtros"/.test(readFileSync(join(root, "finiquito.html"), "utf8")) &&
    /diasFeriadoPendiente/.test(readFileSync(join(root, "js/app-finiquito.js"), "utf8")),
);
assert("empresa.html resumen de finiquito", /id="finResumen"/.test(empHtml) && /id="finOutPartidas"/.test(empHtml));
assert("admin.html noindex", /noindex/.test(readFileSync(join(root, "admin.html"), "utf8")));
const adminHtml = readFileSync(join(root, "admin.html"), "utf8");
const adminJs = readFileSync(join(root, "js/app-admin.js"), "utf8");
assert(
  "admin cuatro pestañas incluye Outbound",
  /data-tab="suscripciones"/.test(adminHtml) &&
    /data-tab="producto"/.test(adminHtml) &&
    /data-tab="trafico"/.test(adminHtml) &&
    /data-tab="outbound"/.test(adminHtml) &&
    /Tráfico \(GA4\)/.test(adminHtml) &&
    />Outbound</.test(adminHtml) &&
    /data-tab-panel="suscripciones"/.test(adminHtml) &&
    /data-tab-panel="outbound"/.test(adminHtml),
);
assert(
  "admin outbound no inventa aperturas",
  /sin dato/.test(adminJs) && /Aperturas/.test(adminJs) && !/open.?rate|tasa de apertura/i.test(adminJs),
);
assert(
  "admin sin hashes en la UI",
  !/\$argon2/i.test(adminHtml) && !/\$argon2/i.test(adminJs),
);
assert("admin no pide claves GA4", !/GA4_SERVICE_ACCOUNT|private_key|BEGIN PRIVATE/i.test(adminHtml));
assert(
  "admin no inventa visitas",
  /GA4 no está conectado/.test(adminJs) && /no se muestran visitas inventadas/i.test(adminJs),
);
assert(
  "admin howTo nombra GA4_PROPERTY_ID y GA4_SERVICE_ACCOUNT_JSON",
  /GA4_PROPERTY_ID/.test(adminJs) && /GA4_SERVICE_ACCOUNT_JSON/.test(adminJs),
);
assert("admin excepción de plan", /excepci[oó]n/i.test(adminHtml) && /override de emergencia/i.test(adminJs));
assert(
  "admin pinta empresas tras cargar",
  /renderResumen\(data\.summary,\s*data\.listed\)/.test(adminJs) &&
    /renderCompanies\(companies\)/.test(adminJs),
);
assert("cookie admin haberes_admin", /haberes_admin/.test(readFileSync(join(root, "api/_admin.js"), "utf8")));
assert(
  "admin sin clave por defecto",
  !/changeme|admin123|haberes-admin|DEFAULT_PASSWORD/i.test(readFileSync(join(root, "api/_admin.js"), "utf8")),
);
assert(
  "GA4 aliases de entorno",
  /GA4_PROPERTY_ID/.test(readFileSync(join(root, "api/_ga4.js"), "utf8")) &&
    /GOOGLE_ANALYTICS_PROPERTY_ID/.test(readFileSync(join(root, "api/_ga4.js"), "utf8")) &&
    /GA4_PROPERTY/.test(readFileSync(join(root, "api/_ga4.js"), "utf8")) &&
    /ANALYTICS_PROPERTY_ID/.test(readFileSync(join(root, "api/_ga4.js"), "utf8")) &&
    /GA4_SERVICE_ACCOUNT_JSON/.test(readFileSync(join(root, "api/_ga4.js"), "utf8")) &&
    /GOOGLE_APPLICATION_CREDENTIALS_JSON/.test(readFileSync(join(root, "api/_ga4.js"), "utf8")) &&
    /GOOGLE_SERVICE_ACCOUNT_JSON/.test(readFileSync(join(root, "api/_ga4.js"), "utf8")) &&
    /GCLOUD_SERVICE_ACCOUNT_JSON/.test(readFileSync(join(root, "api/_ga4.js"), "utf8")),
);
assert(
  "sin tracker casero de visitas",
  !/geolocation|ipapi|ip-api|pageview.?pixel/i.test(readFileSync(join(root, "api/_ga4.js"), "utf8")) &&
    !/geolocation|ipapi|pageview.?pixel/i.test(adminJs),
);
assert(
  "admin-companies no selecciona password_hash",
  !/password_hash/.test(readFileSync(join(root, "api/admin-companies.js"), "utf8")),
);
const preciosHtml = readFileSync(join(root, "precios.html"), "utf8");
assert(
  "precios: Gratis vs Pro mensual automático",
  /Gratis/.test(preciosHtml) &&
    /14\.990/.test(preciosHtml) &&
    /5(, de a uno| documentos)/i.test(preciosHtml) &&
    /CSV\/XLSX/.test(preciosHtml) &&
    /Pagar con Mercado Pago/.test(preciosHtml) &&
    /Pagar con Flow/.test(preciosHtml) &&
    /suscripci[oó]n mensual/i.test(preciosHtml) &&
    /class="compare"/.test(preciosHtml) &&
    /confirmaci[oó]n del pago/i.test(preciosHtml) &&
    !/webhook/i.test(preciosHtml) &&
    !/31 d[ií]as/i.test(preciosHtml) &&
    !/pulse de nuevo/i.test(preciosHtml) &&
    !/No hay cobro con tarjeta/i.test(preciosHtml) &&
    !/a[uú]n no se cobra/i.test(preciosHtml),
);
const css = readFileSync(join(root, "css/app.css"), "utf8");
assert(
  "css [hidden] global con display none !important",
  /(?:^|\n)\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(css),
);
assert(
  "css hamburguesa i no intercepta el clic",
  /\.nav-burger i\s*\{[^}]*pointer-events:\s*none/.test(css),
);
assert(
  "css cajón fixed a viewport y oculto de verdad",
  /\.nav-drawer\s*\{[\s\S]*?position:\s*fixed/.test(css) &&
    /\.nav-drawer\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(css),
);
assert(
  "css radios recortados, no absolute sueltos",
  /\.seg label \{[\s\S]*position:\s*relative/.test(css) &&
    /clip-path:\s*inset\(50%\)/.test(css) &&
    !/\.seg input \{\s*position:\s*absolute;\s*opacity:\s*0/.test(css),
);
assert(
  "css --on-ink crema de día y verde de noche",
  /:root\s*\{[\s\S]*?--on-ink:\s*#f6f4ef/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--on-ink:\s*#04231a/.test(css),
);
assert(
  "css texto sobre --ink usa --on-ink",
  /\.btn\s*\{[\s\S]*?color:\s*var\(--on-ink\)/.test(css) &&
    /\.btn:hover\s*\{[\s\S]*?color:\s*var\(--on-ink\)/.test(css) &&
    /\.seg input:checked \+ span[\s\S]*?color:\s*var\(--on-ink\)/.test(css) &&
    /\.steps li::before[\s\S]*?color:\s*var\(--on-ink\)/.test(css) &&
    /\.ws-tab\[aria-selected="true"\][\s\S]*?color:\s*var\(--on-ink\)/.test(css),
);
assert(
  "css cream #f6f4ef en --on-ink de día",
  /:root\s*\{[\s\S]*?--on-ink:\s*#f6f4ef/.test(css) &&
    (css.match(/#f6f4ef/g) || []).length >= 1,
);
assert(
  "css --warn-line cálido, notice sin negro",
  /:root\s*\{[\s\S]*?--warn-line:/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--warn-line:\s*#6b5a30/.test(css) &&
    /\.notice\s*\{[\s\S]*?border:\s*1px solid var\(--warn-line\)/.test(css) &&
    !/\.notice\s*\{[^}]*#000/.test(css),
);
assert(
  "css noche --line y --line-strong discretos",
  /html\[data-theme="night"\]\s*\{[\s\S]*?--line:\s*#273029/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--line-strong:\s*#3a453f/.test(css),
);
assert(
  "css picker elevado y opción seleccionada obvia de noche",
  /\.picker-panel\s*\{[\s\S]*?background:\s*var\(--surface-2\)/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--surface-2:\s*#181d1b/.test(css) &&
    /\.picker-option\[aria-selected="true"\]/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--option-on-bg:\s*var\(--ink\)/.test(css) &&
    /html\[data-theme="night"\]\s*\{[\s\S]*?--option-on-fg:\s*var\(--on-ink\)/.test(css),
);
assert("css dos columnas desde 900px", /@media \(min-width: 900px\)/.test(css));
assert(
  "index y como describen Gratis/Pro",
  /5 documentos/i.test(readFileSync(join(root, "index.html"), "utf8")) &&
    /14\.990/.test(readFileSync(join(root, "index.html"), "utf8")) &&
    /5 documentos/i.test(readFileSync(join(root, "como.html"), "utf8")) &&
    /Registre su empresa/i.test(readFileSync(join(root, "como.html"), "utf8")) &&
    /Pase a Pro/i.test(readFileSync(join(root, "como.html"), "utf8")),
);
const r2src = readFileSync(join(root, "api/_r2.js"), "utf8");
assert("R2 sin CORS público", !/Access-Control-Allow-Origin/i.test(r2src) && !/r2\.dev/.test(r2src));
assert("R2 lee solo process.env", /R2_ACCOUNT_ID/.test(r2src) && /process\.env/.test(r2src));
assert("R2 no imprime secretos", !/console\.(log|info|debug|warn|error)/.test(r2src));
const mpSrc = readFileSync(join(root, "api/_mp.js"), "utf8") + readFileSync(join(root, "api/checkout.js"), "utf8") + readFileSync(join(root, "api/mp-webhook.js"), "utf8");
assert("MP no imprime secretos", !/console\.(log|info|debug|warn|error)/.test(mpSrc));
assert(
  "MP acepta alias de token y secreto",
  /mp_access_token/.test(mpSrc) &&
    /MP_ACCESS_YOKEN/.test(mpSrc) &&
    /MERCADOPAGO_ACCESS_TOKEN/.test(mpSrc) &&
    /MP_ACCESS_TOKEN_PROD/.test(mpSrc) &&
    /MERCADOPAGO_WEBHOOK_SECRET/.test(mpSrc) &&
    /notification_url/.test(mpSrc) &&
    /external_reference/.test(mpSrc),
);
const flowSrc =
  readFileSync(join(root, "api/_flow.js"), "utf8") +
  readFileSync(join(root, "api/flow-webhook.js"), "utf8") +
  readFileSync(join(root, "api/checkout.js"), "utf8");
assert("Flow no imprime secretos", !/console\.(log|info|debug|warn|error)/.test(flowSrc));
assert(
  "Flow acepta alias de apiKey y secretKey",
  /FLOW_API_KEY/.test(flowSrc) &&
    /FLOW_APIKEY/.test(flowSrc) &&
    /FLOW_API_YKEY/.test(flowSrc) &&
    /FLOW_SECRET_KEY/.test(flowSrc) &&
    /FLOW_SECREY_KEY/.test(flowSrc) &&
    /SECRET_KEY/.test(flowSrc) &&
    /payment\/create/.test(flowSrc) &&
    /payment\/getStatus/.test(flowSrc) &&
    /plans\/create/.test(flowSrc) &&
    /customer\/create/.test(flowSrc) &&
    /customer\/register/.test(flowSrc) &&
    /subscription\/create/.test(flowSrc) &&
    /urlConfirmation/.test(flowSrc),
);
assert(
  "R2 acepta alias Cloudflare/AWS",
  /CLOUDFLARE_ACCOUNT_ID/.test(r2src) &&
    /CF_ACCOUNT_ID/.test(r2src) &&
    /AWS_ACCESS_KEY_ID/.test(r2src) &&
    /R2_ACCESS_KEY/.test(r2src) &&
    /AWS_SECRET_ACCESS_KEY/.test(r2src) &&
    /R2_SECRET/.test(r2src) &&
    /R2_BUCKET_NAME/.test(r2src) &&
    /BUCKET_NAME/.test(r2src),
);
const storageSrc = readFileSync(join(root, "api/storage.js"), "utf8");
assert(
  "storage no revela variables",
  /hasR2/.test(storageSrc) &&
    !/missing|R2_ACCOUNT_ID|CLOUDFLARE|AWS_/.test(storageSrc) &&
    !/console\./.test(storageSrc),
);
const meSrc = readFileSync(join(root, "api/me.js"), "utf8");
assert("me incluye storage boolean", /storage:\s*hasR2\(\)/.test(meSrc));
assert("me incluye providers de cobro", /providers:\s*configuredProviders\(\)/.test(meSrc));
const adminMeSrc = readFileSync(join(root, "api/admin-me.js"), "utf8");
assert("admin-me incluye storage boolean", /storage:\s*hasR2\(\)/.test(adminMeSrc));
assert(
  "reset.html pide newPassword",
  /newPassword/.test(readFileSync(join(root, "js/app-reset.js"), "utf8")) &&
    /\/api\/reset-confirm/.test(readFileSync(join(root, "js/app-reset.js"), "utf8")),
);
const privacidadHtml = readFileSync(join(root, "privacidad.html"), "utf8");
assert(
  "privacidad: stack real + Ley 21.719 + no venta",
  /localStorage|este navegador/i.test(privacidadHtml) &&
    /mindicador\.cl/.test(privacidadHtml) &&
    /Mercado Pago/.test(privacidadHtml) &&
    /Flow/.test(privacidadHtml) &&
    /No vendemos datos personales/.test(privacidadHtml) &&
    /Ley 21\.719/.test(privacidadHtml) &&
    /1 de diciembre de 2026/.test(privacidadHtml) &&
    /contacto@lx3\.ai/.test(privacidadHtml) &&
    /Neon/.test(privacidadHtml) &&
    /GTM-PCR596Z2/.test(privacidadHtml) &&
    /portabilidad/.test(privacidadHtml) &&
    /envios/.test(privacidadHtml) &&
    /siguen en este navegador/.test(privacidadHtml) &&
    !/No hay cobro ni pasarela/.test(privacidadHtml) &&
    !/hoy no se cobra/.test(privacidadHtml) &&
    !/GA4 solo se carga/.test(privacidadHtml) &&
    !/no se envía nada a Google/.test(privacidadHtml),
);
const terminosHtml = readFileSync(join(root, "terminos.html"), "utf8");
assert(
  "términos: planes actuales + carta no reemplaza Inspección / ministro de fe",
  /ministro de fe/.test(terminosHtml) &&
    /Inspecci[oó]n del Trabajo/.test(terminosHtml) &&
    /Mercado Pago/.test(terminosHtml) &&
    /5 documentos/.test(terminosHtml) &&
    /14\.990/.test(terminosHtml) &&
    /suscripci[oó]n mensual/.test(terminosHtml) &&
    !/hoy no se cobra/.test(terminosHtml),
);
assert(
  "páginas públicas no enlazan memo interno ni /ia /etica",
  htmlFiles.every((f) => {
    const html = readFileSync(join(root, f), "utf8");
    return !/INTERNO-USO-DE-IA|href="\/ia"|href="\/etica"|href="\/gobernanza"/.test(html);
  }),
);

const cartaHint = readFileSync(join(root, "js/print.js"), "utf8") + readFileSync(join(root, "empresa.html"), "utf8");
assert(
  "Carta finiquito: firmas + no reemplaza Inspección",
  /Inspecci[oó]n del Trabajo/i.test(cartaHint) && /testigo/i.test(cartaHint),
);

console.log("\nHigiene");
function listFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

const files = listFiles(root);
let leaked = false;
for (const p of files) {
  if (p.endsWith("scripts/verify.mjs")) continue;
  const text = readFileSync(p, "utf8");
  if (/APP_USR-|TEST-[0-9a-f-]{8,}/i.test(text)) {
    fail("sin tokens Mercado Pago", p);
    leaked = true;
  }
  if (/postgres(ql)?:\/\/[^\s"'`]+/i.test(text) || /DATABASE_URL\s*=\s*\S+/.test(text)) {
    fail("sin cadenas de conexión", p);
    leaked = true;
  }
  if (/ADMIN_PASSWORD_HASH\s*=\s*['"]?\$argon2/.test(text)) {
    fail("sin hash de admin en git", p);
    leaked = true;
  }
}
if (!leaked) ok("sin tokens Mercado Pago ni código OPAI");


console.log("\nLibro de Remuneraciones Electrónico (formato DT v8.0, marzo 2023)");
{
  const idxDe = (cod) => LRE_COLUMNAS.findIndex(([c]) => c === cod);
  assert("LRE: 147 columnas", LRE_COLUMNAS.length === 147, String(LRE_COLUMNAS.length));
  assert("LRE: abre con Rut trabajador (1101)", LRE_COLUMNAS[0][0] === 1101);
  assert("LRE: cierra con total indemnizaciones no tributables (5565)", LRE_COLUMNAS[146][0] === 5565);
  assert("LRE: categorías en bloque (identificación 40, haberes 49, descuentos 37)",
    idxDe(2101) === 40 && idxDe(3141) === 89 && idxDe(4151) === 126 && idxDe(5201) === 132);
  assert("LRE: orden del anexo en no imponibles (2311 tras 2305; 2347 entre 2309 y 2310)",
    idxDe(2311) === idxDe(2305) + 1 && idxDe(2347) === idxDe(2309) + 1 && idxDe(2310) === idxDe(2347) + 1);

  assert("LRE Tabla 9: códigos AFP",
    LRE_AFP.provida === 6 && LRE_AFP.planvital === 11 && LRE_AFP.cuprum === 13 &&
      LRE_AFP.habitat === 14 && LRE_AFP.uno === 19 && LRE_AFP.capital === 31 && LRE_AFP.modelo === 103);
  assert("LRE Tabla 11: Fonasa 102 e isapres abiertas",
    LRE_SALUD.fonasa.codigo === 102 && LRE_SALUD.cruzblanca.codigo === 1 &&
      LRE_SALUD.banmedica.codigo === 3 && LRE_SALUD.colmena.codigo === 4 &&
      LRE_SALUD.consalud.codigo === 9 && LRE_SALUD.vidatres.codigo === 12 &&
      LRE_SALUD.nuevamasvida.codigo === 43 && LRE_SALUD.esencial.codigo === 44);
  assert("LRE Tabla 2: 16 regiones, 13 Metropolitana, 16 Ñuble",
    LRE_REGIONES.length === 16 &&
      LRE_REGIONES.find(([c]) => c === 13)[1] === "Metropolitana" &&
      LRE_REGIONES.find(([c]) => c === 16)[1] === "Ñuble");
  assert("LRE Tabla 6: jornada 42 h ordinaria (101), 28 h parcial art. 40 bis (201)",
    codigoJornada(42) === 101 && codigoJornada(30) === 101 && codigoJornada(28) === 201 && codigoJornada(20) === 201);

  assert("LRE: RUT sin puntos, con guion, sin cero inicial",
    rutParaLre("12.345.678-5") === "12345678-5" && rutParaLre("06.876.543-2") === "6876543-2" && rutParaLre("basura") === "");
  assert("LRE: fecha dd/mm/aaaa", fechaParaLre("2023-03-01") === "01/03/2023" && fechaParaLre("") === "");
  assert("LRE: nombre de archivo rutempleador_aaaamm.csv",
    nombreArchivoLre("76.086.428-5", "2026-08") === "76086428-5_202608.csv");

  const trabajador = {
    nombre: "Ana",
    rut: "12.345.678-5",
    sueldoBase: 1000000,
    afp: "modelo",
    salud: "fonasa",
    contrato: "indefinido",
    fechaIngreso: "2023-03-01",
    gratificacionArt50: true,
    colacion: 50000,
    movilizacion: 40000,
  };
  const calc = calcularSueldo(trabajador, fallbackIndicadores());
  const csvLre = generarLre({
    trabajadores: [trabajador],
    contexto: { region: 13, comuna: 13101, mutual: 1 },
    indicadores: fallbackIndicadores(),
  });
  const [encabezado, fila] = csvLre.split("\r\n");
  const cols = encabezado.split(";");
  const vals = fila.split(";");
  const en = (cod) => vals[cols.findIndex((c) => c.endsWith(`(${cod})`))];
  const num = (cod) => Number(en(cod) || 0);

  assert("LRE: encabezado y fila con 147 campos", cols.length === 147 && vals.length === 147);
  assert("LRE: encabezado Nombre(código)", cols[0] === "Rut trabajador(1101)" && cols[146] === "Total indemnizaciones no tributables(5565)");
  assert("LRE: CRLF y cierre de línea", csvLre.includes("\r\n") && csvLre.endsWith("\r\n"));
  assert("LRE: opcional sin dato queda vacío, no cero", en("2103") === "" && en("1116") === "");
  assert("LRE: identificación (rut, fecha, región, comuna, AFP Modelo 103, Fonasa 102)",
    en("1101") === "12345678-5" && en("1102") === "01/03/2023" && en("1105") === "13" &&
      en("1106") === "13101" && en("1141") === "103" && en("1143") === "102");
  assert("LRE: montos idénticos al cálculo de la liquidación",
    num("2101") === calc.sueldoBase && num("2106") === calc.gratificacion &&
      num("3141") === calc.afp.monto && num("3143") === calc.salud.legal &&
      num("3151") === calc.cesantia.monto && num("3161") === calc.iusc && num("5501") === calc.liquido);
  assert("LRE: total haberes cuadra con sus subcategorías (5201 = 5210+5220+5230+5240)",
    num("5201") === num("5210") + num("5220") + num("5230") + num("5240") && num("5201") === calc.totalHaberes);
  assert("LRE: total descuentos cuadra (5301 = 5361+5341+5302)",
    num("5301") === num("5361") + num("5341") + num("5302") && num("5301") === calc.totalDescuentos);
  assert("LRE: aportes del empleador en 0 (borrador honesto, sin tasas inventadas)",
    en("4152") === "0" && en("4155") === "0" && en("5410") === "0");

  const bytes = codificarAnsi(csvLre);
  assert("LRE: codificación ANSI (bytes ≤ 255, ó = 243, fuera de Latin-1 degrada a ?)",
    Math.max(...bytes) <= 255 && codificarAnsi("ó")[0] === 243 && codificarAnsi("€")[0] === 0x3f);

  const csvConIngreso = parseTrabajadoresCsv(
    "nombre,rut,salud,fecha_ingreso\nAna,12.345.678-5,banmedica,01/03/2023\nLuis,9.876.543-3,fonasa,2025-01-15\n",
  );
  assert("CSV: fecha_ingreso acepta dd/mm/aaaa y aaaa-mm-dd",
    csvConIngreso[0].fechaIngreso === "2023-03-01" && csvConIngreso[1].fechaIngreso === "2025-01-15");
  assert("CSV: salud reconoce isapre específica para el LRE", csvConIngreso[0].salud === "banmedica");

  const html = readFileSync(join(root, "empresa.html"), "utf8");
  assert("empresa.html: panel LRE con descarga y manual oficial",
    html.includes("btnLreCsv") && html.includes("Libro de Remuneraciones") && html.includes("dt-docs/lre"));
  assert("empresa.html: ficha con fecha de ingreso (selector propio)", html.includes("altaFechaIngreso"));
  assert("empresa.html: fecha de término en ficha", html.includes("altaFechaTermino"));
  assert("empresa.html: novedades del mes", html.includes("Novedades del mes") && html.includes("novAusencia"));
  assert(
    "empresa.html: LRE ya no afirma 30 días fijos",
    !html.includes("usa 30 días trabajados por persona"),
  );
  const readme = readFileSync(join(root, "README.md"), "utf8");
  assert(
    "README: LRE ya no afirma 30 días fijos por persona",
    !readme.includes("se usan 30 días trabajados por persona") &&
      readme.toLowerCase().includes("novedades"),
  );

  // LRE con novedades reales
  const anaLre = inputDesdeFichaYNovedades(
    {
      nombre: "Ana Pérez",
      rut: "12.345.678-5",
      sueldoBase: 1_000_000,
      afp: "modelo",
      salud: "fonasa",
      contrato: "indefinido",
      colacion: 50_000,
      movilizacion: 40_000,
      fechaIngreso: "2023-03-01",
    },
    {
      diasAusencia: 3,
      diasLicencia: 5,
      haberesExtra: [{ nombre: "Bono producción", monto: 80_000, imponible: true }],
      descuentos: [{ nombre: "Cuota préstamo", monto: 120_000, tipo: "convencional" }],
    },
    { periodo: "2026-08" },
  );
  const csvAna = generarLre({
    trabajadores: [anaLre],
    contexto: { region: 13, comuna: 13101, mutual: 0 },
    indicadores: fallbackIndicadores(),
  });
  const colsAna = csvAna.trim().split(/\r?\n/)[0].split(";");
  const valsAna = csvAna.trim().split(/\r?\n/)[1].split(";");
  const enAna = (cod) => valsAna[colsAna.findIndex((c) => c.includes(`(${cod})`))];
  assert("LRE: 1115 = 22 días trabajados (no 30)", enAna("1115") === "22", enAna("1115"));
  assert("LRE: 1116 = 5 días licencia", enAna("1116") === "5", enAna("1116"));
  assert("LRE: 3188 = anticipos+préstamos 120000", enAna("3188") === "120000", enAna("3188"));
}

console.log("\nDías trabajados y proporcionalidad");
{
  const d22 = diasDelPeriodo({ diasAusencia: 3, diasLicencia: 5 });
  assert("3 ausencia + 5 licencia → 22 días", d22.diasTrabajados === 22 && d22.diasBase === 30);
  assert("sueldo 1e6 × 22/30 → 733333", proporcional(1_000_000, 22) === 733333);

  const ana = calcularSueldo(
    {
      sueldoBase: 1_000_000,
      afp: "modelo",
      salud: "fonasa",
      contrato: "indefinido",
      colacion: 50_000,
      movilizacion: 40_000,
      haberesExtra: [{ nombre: "Bono producción", monto: 80_000, imponible: true }],
      diasAusencia: 3,
      diasLicencia: 5,
      descuentos: [{ nombre: "Cuota préstamo", monto: 120_000, tipo: "convencional" }],
    },
    { uf: FALLBACK_UF },
  );
  assert("caso §3 imponible 813333", ana.imponible === 813333, String(ana.imponible));
  assert("caso §3 no imponible 66000", ana.noImponible === 66_000, String(ana.noImponible));
  assert("caso §3 AFP 86051", ana.afp.monto === 86_051, String(ana.afp.monto));
  assert("caso §3 salud 56933", ana.salud.monto === 56_933, String(ana.salud.monto));
  assert("caso §3 cesantía 4880", ana.cesantia.monto === 4_880, String(ana.cesantia.monto));
  assert("caso §3 total haberes 879333", ana.totalHaberes === 879_333, String(ana.totalHaberes));
  assert("caso §3 líquido 611469", ana.liquido === 611_469, String(ana.liquido));
  assert(
    "descuento con nombre en salida",
    ana.descuentos.some((d) => d.label === "Cuota préstamo" && d.monto === 120_000),
  );

  assert(
    "ingreso día 16 → diasBase 15",
    diasDelPeriodo({ periodo: "2026-08", fechaIngreso: "2026-08-16" }).diasBase === 15,
  );
  assert(
    "término día 10 → diasBase 10",
    diasDelPeriodo({ periodo: "2026-08", fechaTermino: "2026-08-10" }).diasBase === 10,
  );
  assert(
    "término día 31 → diasBase 30",
    diasDelPeriodo({ periodo: "2026-08", fechaTermino: "2026-08-31" }).diasBase === 30,
  );
  assert(
    "mes 31 y mes 28 → mismo diasBase 30 si trabaja completo",
    diasDelPeriodo({ periodo: "2026-08" }).diasBase === 30 &&
      diasDelPeriodo({ periodo: "2026-02" }).diasBase === 30,
  );
  assert(
    "vacaciones no restan días trabajados",
    diasDelPeriodo({ diasVacaciones: 15 }).diasTrabajados === 30,
  );
  assert(
    "pagaCarencia false: licencia 5 descuenta 5",
    diasDelPeriodo({ diasLicencia: 5, pagaCarencia: false }).diasTrabajados === 25,
  );
  assert(
    "pagaCarencia true + licencia 5: paga 3 de carencia → 28",
    diasDelPeriodo({ diasLicencia: 5, pagaCarencia: true }).diasTrabajados === 28,
  );

  const he30 = calcularSueldo(
    { sueldoBase: 800_000, horasExtras: 8, jornada: 42 },
    { uf: FALLBACK_UF },
  );
  const he15 = calcularSueldo(
    {
      sueldoBase: 800_000,
      horasExtras: 8,
      jornada: 42,
      diasTrabajadosManual: 15,
      diasAusencia: 0,
      diasLicencia: 0,
    },
    { uf: FALLBACK_UF },
  );
  assert(
    "horas extras no se proporcionalizan",
    he30.montoHorasExtras === he15.montoHorasExtras && he30.montoHorasExtras > 0,
    `${he30.montoHorasExtras} vs ${he15.montoHorasExtras}`,
  );

  const capped = diasDelPeriodo({ diasAusencia: 40, diasLicencia: 10 });
  assert(
    "días trabajados nunca negativos ni > diasBase",
    capped.diasTrabajados >= 0 &&
      capped.diasTrabajados <= capped.diasBase &&
      capped.avisoTope === true,
  );
}

console.log("\nDescuentos y artículo 58");
{
  const vOk = validarArt58({
    totalHaberes: 879_333,
    descuentos: [{ monto: 120_000, tipo: "convencional" }],
  });
  assert("tope 15 % de 879333 = 131900", vOk.tope15 === 131_900);
  assert("120000 no dispara aviso art. 58", vOk.supera15 === false);

  const vEx = validarArt58({
    totalHaberes: 879_333,
    descuentos: [{ monto: 150_000, tipo: "convencional" }],
  });
  assert("150000 dispara exceso 18100", vEx.supera15 && vEx.exceso15 === 18_100);

  const vAnt = validarArt58({
    totalHaberes: 879_333,
    descuentos: [{ monto: 500_000, tipo: "anticipo" }],
  });
  assert("anticipo no dispara aviso del 15 %", vAnt.supera15 === false && vAnt.anticipos === 500_000);

  const neg = calcularSueldo(
    {
      sueldoBase: 100_000,
      descuentos: [{ nombre: "Préstamo", monto: 500_000, tipo: "convencional" }],
      diasAusencia: 0,
    },
    { uf: FALLBACK_UF },
  );
  assert("líquido negativo señalado", neg.liquidoNegativo === true && neg.liquido < 0);
}

console.log("\nNovedades por planilla");
{
  const novPath = join(root, "ejemplos/novedades.csv");
  assert("existe ejemplos/novedades.csv", existsSync(novPath));
  const parsed = parseNovedadesCsv(readFileSync(novPath, "utf8"), {
    rutsConocidos: ["12345678-5", "9876543-3", "11111111-1"],
  });
  assert("parseNovedadesCsv: 3 filas", parsed.rows.length === 3, String(parsed.rows.length));
  assert(
    "Ana: 3 ausencia, 5 licencia, descuento convencional",
    parsed.rows[0].diasAusencia === 3 &&
      parsed.rows[0].diasLicencia === 5 &&
      parsed.rows[0].descuentos[0]?.tipo === "convencional" &&
      parsed.rows[0].descuentos[0]?.monto === 120_000,
  );
  assert(
    "Luis: anticipo no convencional",
    parsed.rows[1].descuentos[0]?.tipo === "anticipo",
  );
  const unk = parseNovedadesCsv("rut,dias_ausencia\n1.234.567-4,1\n", {
    rutsConocidos: ["12345678-5"],
  });
  assert(
    "RUT desconocido en rechazados",
    unk.rows.length === 0 && unk.rechazados.some((r) => r.rut.includes("1.234.567")),
  );
  const dup = parseNovedadesCsv("rut,dias_ausencia\n12.345.678-5,1\n12.345.678-5,2\n");
  assert("RUT duplicado invalida archivo", Boolean(dup.error) && /duplicado/i.test(dup.error));
}

assert(
  "disclaimer constante presente",
  DISCLAIMER.includes("Documento generado por Haberes") &&
    DISCLAIMER.includes("Dirección del Trabajo") &&
    DISCLAIMER.includes("Previred") &&
    !/inteligencia artificial|generada por IA|estimaci[oó]n de software/i.test(DISCLAIMER),
);
assert(
  "disclaimer finiquito Inspección",
  DISCLAIMER_FINIQUITO.includes("Inspección del Trabajo") &&
    /pago efectivo/i.test(DISCLAIMER_FINIQUITO) &&
    !/inteligencia artificial|generada por IA|estimaci[oó]n de software/i.test(DISCLAIMER_FINIQUITO),
);

console.log("\nProducto público sin IA");
{
  const banned = /inteligencia artificial|generada por IA|Estimaci[oó]n con IA|estimaci[oó]n de software/i;
  const skipNames = new Set(["verify.mjs"]);
  function walk(dir, acc = []) {
    for (const name of readdirSync(dir)) {
      if (name === ".git" || name === "node_modules") continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p, acc);
      else acc.push(p);
    }
    return acc;
  }
  let hit = "";
  for (const p of walk(root)) {
    if (skipNames.has(p.split("/").pop())) continue;
    if (!/\.(html|js|mjs|md|xml|txt|css)$/.test(p)) continue;
    const text = readFileSync(p, "utf8");
    if (banned.test(text)) {
      hit = p.replace(root + "/", "");
      break;
    }
  }
  assert("repo público sin frases de IA", !hit, hit);
}

console.log("\nPDF liquidación y finiquito");
{
  const { inflateSync } = await import("node:zlib");
  function pdfText(buf) {
    const raw = Buffer.from(buf).toString("latin1");
    const parts = [];
    const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let m;
    while ((m = re.exec(raw))) {
      let content = m[1];
      try {
        content = inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
      } catch {
        /* uncompressed */
      }
      for (const hx of content.matchAll(/<([0-9A-Fa-f]+)>/g)) {
        parts.push(Buffer.from(hx[1], "hex").toString("latin1"));
      }
    }
    return parts.join("\n");
  }
  const { buildLiquidacionPdf, buildFiniquitoPdf, PDF_LAYOUT } = await import("../api/_pdf.js");
  const { liquidacionHtml, cartaFiniquitoHtml } = await import("../js/print.js");
  assert("márgenes PDF ≥ 48pt", PDF_LAYOUT.margin >= 48);
  assert("logo máx ~56pt", PDF_LAYOUT.logoMaxH === 56);
  assert("firma máx ~48pt", PDF_LAYOUT.firmaMaxH === 48);
  assert("hueco líquido ≥ 16pt", PDF_LAYOUT.gapAfterDescuentos >= 16);
  assert("hueco firmas ≥ 40pt", PDF_LAYOUT.gapBeforeFirmas >= 40);

  const muro =
    "Artículo 161 del Código del Trabajo: el empleador podrá poner término al contrato invocando necesidades de la empresa. ".repeat(
      8,
    );
  assert("texto legal corto se conserva", resumirTextoLegal("Mutuo acuerdo.", "Art. 159") === "Mutuo acuerdo.");
  assert(
    "texto legal largo se resume",
    resumirTextoLegal(muro, "Art. 161 — Necesidades de la empresa").includes("Art. 161") &&
      resumirTextoLegal(muro, "Art. 161 — Necesidades de la empresa").length < TEXTO_LEGAL_MAX,
  );

  const calc = calcularSueldo(
    {
      sueldoBase: 1_000_000,
      afp: "modelo",
      salud: "fonasa",
      contrato: "indefinido",
      colacion: 40000,
      cargo: "Administrativa",
    },
    { uf: FALLBACK_UF },
  );
  const empresa = {
    razonSocial: "Gard SpA",
    rut: "76.123.456-0",
    giro: "Servicios de seguridad",
    direccion: "Santiago",
  };
  const trabajador = { nombre: "Ana Pérez", rut: "12.345.678-5", cargo: "Administrativa" };
  const png1 = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const liqPdf = await buildLiquidacionPdf({
    empresa,
    trabajador,
    periodo: "Agosto 2026",
    calc,
    logoBytes: png1,
    logoType: "image/png",
    firmaBytes: png1,
    firmaType: "image/png",
  });
  const liqText = pdfText(liqPdf);
  assert("PDF liquidación no vacío", liqPdf.length > 800);
  assert("PDF liquidación título", /LIQUIDACI/.test(liqText));
  assert("PDF liquidación trabajador en bloque", /Trabajador/.test(liqText) && /Administrativa/.test(liqText));
  assert("PDF liquidación tablas", /Haberes/.test(liqText) && /Descuentos/.test(liqText) && /L/.test(liqText));
  assert("PDF liquidación sin IA", !bannedPdf(liqText));
  assert("PDF liquidación disclaimer Haberes", /Haberes/.test(liqText) && /Previred/.test(liqText));

  const full = calcularFiniquitoCompleto(
    {
      causal: "161-necesidades",
      ingreso: "2020-01-15",
      termino: "2023-08-20",
      remuneracion: 1_000_000,
      diasMes: 20,
      gratificacionArt50: true,
      diasFeriadoPendiente: 5,
      diasFeriadoProporcional: 10,
      avisoPrevio: false,
    },
    { uf: FALLBACK_UF },
  );
  const finPdf = await buildFiniquitoPdf({
    empresa,
    trabajador: { ...trabajador, ingreso: "2020-01-15", termino: "2023-08-20" },
    fin: full,
    ciudad: "Santiago",
    logoBytes: png1,
    logoType: "image/png",
    firmaBytes: png1,
    firmaType: "image/png",
  });
  const finText = pdfText(finPdf);
  assert("PDF finiquito no vacío", finPdf.length > 800);
  assert("PDF finiquito título", /CARTA DE FINIQUITO/.test(finText));
  assert("PDF finiquito Total, no estimado", /Total/.test(finText) && !/Total estimado/.test(finText));
  assert("PDF finiquito sin muro art. 163", !/tope de 330 d/.test(finText));
  assert("PDF finiquito sin IA", !bannedPdf(finText));
  assert("PDF finiquito Inspección o pago efectivo", /Inspecci|pago efectivo/.test(finText));

  const prevLiq = liquidacionHtml({ empresa, trabajador, periodo: "Agosto 2026", calc });
  const prevFin = cartaFiniquitoHtml({
    empresa,
    trabajador: { ...trabajador, ingreso: "15-01-2020", termino: "20-08-2023" },
    fin: full,
  });
  assert("preview liquidación grilla 2 columnas", /grid-template-columns: 1fr 1fr/.test(prevLiq) && /Trabajador/.test(prevLiq));
  assert("preview líquido con aire", /margin-top: 16pt/.test(prevLiq) && /Líquido a pago/.test(prevLiq));
  assert("preview firma sobre la línea", /firma-line/.test(prevLiq) && /max-height: 48px/.test(prevLiq));
  assert("preview finiquito Total", /<td>Total<\/td>/.test(prevFin) && !/Total estimado/.test(prevFin));
  assert("preview finiquito sin muro 330", !/tope de 330 d/.test(prevFin));
  assert(
    "preview sin IA",
    !bannedPdf(prevLiq) && !bannedPdf(prevFin) && /Documento generado por Haberes/.test(prevLiq),
  );
}

function bannedPdf(text) {
  return /inteligencia artificial|generada por IA|Estimaci[oó]n con IA|estimaci[oó]n de software/i.test(text);
}

console.log("\nInstituciones financieras");
{
  const { INSTITUCIONES_CL, buscarInstitucion, FUENTE_CODIGOS } = await import("../js/bancos.js");
  assert("fuente de códigos documentada", Boolean(FUENTE_CODIGOS));
  const by = (c) => INSTITUCIONES_CL.find((i) => i.codigo === c);
  assert("053 es Banco Ripley", by("053")?.nombre === "Banco Ripley");
  assert("055 es Banco Consorcio", by("055")?.nombre === "Banco Consorcio");
  const codes = INSTITUCIONES_CL.map((i) => i.codigo);
  assert(
    "códigos únicos de 3 dígitos ordenados",
    codes.every((c) => /^\d{3}$/.test(c)) &&
      new Set(codes).size === codes.length &&
      [...codes].sort().join() === codes.join(),
  );
  assert(
    "prepago y cooperativas presentes",
    ["743", "875", "730", "732", "738", "741", "672", "504"].every((c) => by(c)),
  );
  assert(
    "cada institución tiene tipo válido",
    INSTITUCIONES_CL.every((i) => ["banco", "cooperativa", "prepago", "otro"].includes(i.tipo)),
  );
  assert("alias mercado pago → 875", buscarInstitucion("mercado pago")?.codigo === "875");
  assert("alias BancoEstado → 012", buscarInstitucion("BancoEstado")?.codigo === "012");
  assert("alias banco de chile → 001", buscarInstitucion("banco de chile")?.codigo === "001");
}

console.log("\nPerfiles de nómina");
{
  const {
    PERFILES_NOMINA,
    renderNomina,
    perfilPorId,
    largoFijoEsperado,
    aLatin1,
  } = await import("../js/nomina.js");
  const ids = PERFILES_NOMINA.map((p) => p.id);
  assert("perfiles id únicos", new Set(ids).size === ids.length);
  assert(
    "perfiles salida y verificado",
    PERFILES_NOMINA.every(
      (p) => ["csv", "txt_fijo", "xlsx"].includes(p.salida) && typeof p.verificado === "boolean",
    ),
  );
  assert(
    "verificado implica fuente",
    PERFILES_NOMINA.every((p) => !p.verificado || (p.fuente && String(p.fuente).trim())),
  );
  const fijo = perfilPorId("generico_txt_fijo");
  const filas = [
    {
      nombre: "Ana Pérez",
      rut: "12.345.678-5",
      banco: "001",
      bancoNombre: "Banco de Chile",
      tipo_cuenta: "corriente",
      nro_cuenta: "12345678",
      email: "ana@empresa.cl",
      monto: 988656,
      glosa: "Sueldo",
    },
  ];
  const outFijo = renderNomina(fijo, filas);
  const line = new TextDecoder("latin1").decode(outFijo.bytes).split(/\r?\n/).filter(Boolean)[0];
  assert(
    "txt fijo largo constante",
    line.length === largoFijoEsperado(fijo),
    `${line.length} vs ${largoFijoEsperado(fijo)}`,
  );
  const csvProf = perfilPorId("generico_csv");
  const outCsv = renderNomina(csvProf, filas);
  const csvText = new TextDecoder("latin1").decode(outCsv.bytes);
  assert(
    "CSV sin comentarios ni filas en blanco antes del encabezado",
    !csvText.startsWith("#") && !csvText.startsWith("\r") && !csvText.startsWith("\n") &&
      csvText.split(/\r?\n/)[0].includes("rut_cuerpo"),
  );
  assert("monto entero sin separadores", /0*988656/.test(csvText) && !/988\.656/.test(csvText) && !/988,656/.test(csvText));
  const xOut = renderNomina(perfilPorId("generico_xlsx"), filas);
  const { readXlsxFirstSheet: rx } = await import("../js/xlsx.js");
  // Léame is second sheet; first sheet is data without comment rows
  const first = await rx(xOut.bytes);
  assert("xlsx datos sin fila de aviso", first[0]?.[0] === "nombre" && Number(first[1]?.[6]) === 988656);
  assert("latin1 mapa directo", aLatin1("á")[0] === 0xe1 && aLatin1("€")[0] === 0x3f);
  const nominaEj = await rx(new Uint8Array(readFileSync(join(root, "ejemplos/nomina-pago.xlsx"))));
  assert(
    "nomina-pago ejemplo Ana 988656",
    nominaEj.some((row) => String(row[0]).includes("Ana") && Number(row[6]) === 988656),
    JSON.stringify(nominaEj.slice(0, 3)),
  );
}

console.log("\nTema noche");
{
  function parseTokens(block) {
    const map = {};
    for (const m of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
      map[m[1]] = m[2].trim();
    }
    return map;
  }
  function hexLum(hex) {
    const h = hex.replace("#", "").trim();
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
    const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const r = lin(n(0));
    const g = lin(n(2));
    const b = lin(n(4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrast(a, b) {
    const L1 = hexLum(a);
    const L2 = hexLum(b);
    if (L1 == null || L2 == null) return 99;
    const hi = Math.max(L1, L2);
    const lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  }
  const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  const nightBlock = css.match(/html\[data-theme="night"\]\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  const day = parseTokens(rootBlock);
  const night = parseTokens(nightBlock);
  const skip = new Set(["font", "ease", "shadow", "ring", "radius"]);
  const missing = Object.keys(day).filter((k) => !skip.has(k) && !(k in night) && !k.startsWith("s-") && !k.startsWith("t-") && !k.startsWith("r-") && !k.startsWith("dur-") && !["touch", "header-h", "shell", "sab", "sat"].includes(k));
  // Tokens de métrica tipografía/espaciado pueden omitirse en noche; exigir semánticos y superficies
  const must = ["paper", "surface", "surface-2", "surface-3", "text", "muted", "line", "danger", "success", "accent", "on-danger", "on-success", "on-accent", "paper-doc"];
  assert(
    "tokens noche cubren superficies y semánticos",
    must.every((k) => night[k]),
    must.filter((k) => !night[k]).join(","),
  );
  const Lp = hexLum(night.paper);
  const Ls = hexLum(night.surface);
  const Ls2 = hexLum(night["surface-2"]);
  const Ls3 = hexLum(night["surface-3"]);
  assert(
    "noche luminancia paper < surface < surface-2 < surface-3",
    Lp < Ls && Ls < Ls2 && Ls2 < Ls3,
    JSON.stringify({ Lp, Ls, Ls2, Ls3 }),
  );
  assert("contraste text/surface noche ≥ 4.5", contrast(night.text, night.surface) >= 4.5);
  assert("contraste muted/surface noche ≥ 4.5", contrast(night.muted, night.surface) >= 4.5);
  assert("contraste on-danger/danger ≥ 4.5", contrast(night["on-danger"], night.danger) >= 4.5);
  assert("contraste on-success/success ≥ 4.5", contrast(night["on-success"], night.success) >= 4.5);
  assert("contraste on-accent/accent ≥ 4.5", contrast(night["on-accent"], night.accent) >= 4.5);
  assert("contraste field-line/control-bg noche ≥ 3", contrast(night["field-line"], night["control-bg"]) >= 3);
  assert("contraste field-line/control-bg día ≥ 3", contrast(day["field-line"], day["control-bg"]) >= 3);
  const withoutPrint = css.replace(/@media print\s*\{[\s\S]*?\n\}/g, "");
  // Lista blanca: tokens de papel/primer plano de día (--paper-doc, --on-*)
  const withoutTokens = withoutPrint.replace(/--[\w-]+:\s*#[0-9a-fA-F]{3,8}\b/g, "");
  const whites = withoutTokens.match(/#fff(?:fff)?\b/gi) || [];
  assert(
    "sin #fff literal fuera de @media print y tokens",
    whites.length === 0,
    whites.join(","),
  );
}

assert(
  "enviar fail-closed no_mail y no_storage",
  /no_mail/.test(readFileSync(join(root, "api/enviar.js"), "utf8")) &&
    /mailConfigured\(\)/.test(readFileSync(join(root, "api/enviar.js"), "utf8")) &&
    /no_storage/.test(readFileSync(join(root, "api/enviar.js"), "utf8")) &&
    /sendDocumentEmail/.test(readFileSync(join(root, "api/_lib.js"), "utf8")) &&
    /sendSignupAvisoEmail/.test(readFileSync(join(root, "api/_lib.js"), "utf8")) &&
    /sendSignupAvisoEmail/.test(readFileSync(join(root, "api/register.js"), "utf8")) &&
    /sendOpsAvisoEmail/.test(readFileSync(join(root, "api/_lib.js"), "utf8")) &&
    /notifyCheckoutStarted/.test(readFileSync(join(root, "api/checkout.js"), "utf8")) &&
    /notifyProActivated/.test(readFileSync(join(root, "api/_mp.js"), "utf8")) &&
    /notifyProActivated/.test(readFileSync(join(root, "api/_flow.js"), "utf8")) &&
    /sendPlanDowngradeEmail/.test(readFileSync(join(root, "api/_lib.js"), "utf8")),
);
assert("sql/006.sql envios", /CREATE TABLE IF NOT EXISTS envios/.test(readFileSync(join(root, "sql/006.sql"), "utf8")));
assert(
  "workerFromBody conserva email truncado",
  (() => {
    // lectura estática: el campo email aparece en _documento.js
    const src = readFileSync(join(root, "api/_documento.js"), "utf8");
    return /email:\s*String\(t\.email[^)]*\)\.trim\(\)\.slice\(0,\s*160\)/.test(src);
  })(),
);
assert(
  "empresa envío por correo en UI",
  /btnEnviarLiquidacion/.test(empHtml) && /btnEnviarCarta/.test(empHtml) && /\/api\/enviar/.test(readFileSync(join(root, "js/app-empresa-envio.js"), "utf8")),
);
assert(
  "index explica el servicio sin siglas en el lede",
  (() => {
    const html = readFileSync(join(root, "index.html"), "utf8");
    const m = html.match(/<p class="lede">([\s\S]*?)<\/p>/);
    const lede = m ? m[1] : "";
    return /Sin planilla, sin instalar nada/.test(lede) && !/\b(IUSC|AFP|art\.)\b/.test(lede);
  })(),
);

assert(
  "módulos empresa separados",
  existsSync(join(root, "js/empresa-trabajadores.js")) &&
    existsSync(join(root, "js/empresa-documentos.js")) &&
    existsSync(join(root, "js/empresa-nomina.js")) &&
    existsSync(join(root, "js/empresa-lre.js")) &&
    /bindEmpresaTrabajadores/.test(readFileSync(join(root, "js/app-empresa.js"), "utf8")) &&
    /bindEmpresaDocumentos/.test(readFileSync(join(root, "js/app-empresa.js"), "utf8")) &&
    /bindEmpresaNomina/.test(readFileSync(join(root, "js/app-empresa.js"), "utf8")) &&
    /bindEmpresaLre/.test(readFileSync(join(root, "js/app-empresa.js"), "utf8")),
);

/* ---------- SEO ---------- */
{
  const publicPages = [
    ["index.html", "/"],
    ["sueldo.html", "/sueldo"],
    ["horas-extras.html", "/horas-extras"],
    ["vacaciones-proporcionales.html", "/vacaciones-proporcionales"],
    ["gratificacion.html", "/gratificacion"],
    ["impuesto-unico.html", "/impuesto-unico"],
    ["cotizaciones-previsionales.html", "/cotizaciones-previsionales"],
    ["costo-empresa.html", "/costo-empresa"],
    ["seguro-cesantia.html", "/seguro-cesantia"],
    ["trabajo-pesado.html", "/trabajo-pesado"],
    ["recargo-domingo-comercio.html", "/recargo-domingo-comercio"],
    ["feriado-irrenunciable.html", "/feriado-irrenunciable"],
    ["semana-corrida.html", "/semana-corrida"],
    ["asignacion-familiar.html", "/asignacion-familiar"],
    ["colacion-movilizacion.html", "/colacion-movilizacion"],
    ["viatico.html", "/viatico"],
    ["sueldo-minimo.html", "/sueldo-minimo"],
    ["descuento-atrasos.html", "/descuento-atrasos"],
    ["licencia-medica.html", "/licencia-medica"],
    ["boleta-honorarios.html", "/boleta-honorarios"],
    ["retencion-judicial.html", "/retencion-judicial"],
    ["apv.html", "/apv"],
    ["sala-cuna.html", "/sala-cuna"],
    ["postnatal-parental.html", "/postnatal-parental"],
    ["permiso-prenatal.html", "/permiso-prenatal"],
    ["fuero-maternal.html", "/fuero-maternal"],
    ["permiso-paternidad.html", "/permiso-paternidad"],
    ["permiso-matrimonio.html", "/permiso-matrimonio"],
    ["permiso-fallecimiento.html", "/permiso-fallecimiento"],
    ["interes-mora.html", "/interes-mora"],
    ["hora-lactancia.html", "/hora-lactancia"],
    ["jornada-40-horas.html", "/jornada-40-horas"],
    ["feriado-anual.html", "/feriado-anual"],
    ["feriado-progresivo.html", "/feriado-progresivo"],
    ["indemnizacion-anos-servicio.html", "/indemnizacion-anos-servicio"],
    ["aguinaldo.html", "/aguinaldo"],
    ["finiquito-casa-particular.html", "/finiquito-casa-particular"],
    ["sueldo-proporcional.html", "/sueldo-proporcional"],
    ["indemnizacion-aviso-previo.html", "/indemnizacion-aviso-previo"],
    ["nulidad-despido.html", "/nulidad-despido"],
    ["tutela-laboral.html", "/tutela-laboral"],
    ["despido-injustificado.html", "/despido-injustificado"],
    ["autodespido.html", "/autodespido"],
    ["obra-faena.html", "/obra-faena"],
    ["prescripcion-laboral.html", "/prescripcion-laboral"],
    ["descanso-compensatorio.html", "/descanso-compensatorio"],
    ["inclusion-laboral.html", "/inclusion-laboral"],
    ["jornada-parcial.html", "/jornada-parcial"],
    ["teletrabajo.html", "/teletrabajo"],
    ["bandas-horarias.html", "/bandas-horarias"],
    ["pacto-4x3.html", "/pacto-4x3"],
    ["jornada-excepcional.html", "/jornada-excepcional"],
    ["jornada-bisemanal.html", "/jornada-bisemanal"],
    ["compensacion-horas-extras.html", "/compensacion-horas-extras"],
    ["pacto-horas-extras.html", "/pacto-horas-extras"],
    ["contrato-plazo-fijo.html", "/contrato-plazo-fijo"],
    ["termino-anticipado-plazo-fijo.html", "/termino-anticipado-plazo-fijo"],
    ["permiso-sin-goce.html", "/permiso-sin-goce"],
    ["zona-extrema.html", "/zona-extrema"],
    ["promedio-remuneraciones.html", "/promedio-remuneraciones"],
    ["antiguedad-laboral.html", "/antiguedad-laboral"],
    ["tope-imponible.html", "/tope-imponible"],
    ["finiquito.html", "/finiquito"],
    ["empresa.html", "/empresa"],
    ["como.html", "/como"],
    ["precios.html", "/precios"],
  ];
  for (const [file, path] of publicPages) {
    const html = readFileSync(join(root, file), "utf8");
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const desc = (html.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const canonical = (html.match(/rel="canonical" href="([^"]*)"/) || [])[1] || "";
    assert(`SEO title ${file}`, title.length > 0 && title.length <= 65 && !/^Haberes\b/.test(title), title);
    assert(
      `SEO description ${file}`,
      desc.length >= 110 &&
        desc.length <= 160 &&
        !/No es Dirección del Trabajo/.test(desc) &&
        !/\bIA\b/.test(desc),
      `${desc.length}:${desc}`,
    );
    assert(`SEO canonical ${file}`, canonical === `https://www.haberes.cl${path === "/" ? "/" : path}`);
    assert(
      `SEO og+twitter ${file}`,
      /property="og:title"/.test(html) &&
        /property="og:description"/.test(html) &&
        /property="og:url"/.test(html) &&
        /property="og:image"/.test(html) &&
        /name="twitter:card" content="summary_large_image"/.test(html),
    );
    assert(`SEO sin Google Fonts ${file}`, !/fonts\.googleapis\.com/.test(html));
    assert(
      `SEO charset temprano ${file}`,
      html.slice(0, 1024).includes('<meta charset="utf-8"'),
    );
    const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    assert(`SEO JSON-LD presente ${file}`, ldBlocks.length >= 1);
    for (const raw of ldBlocks) {
      let obj;
      try {
        obj = JSON.parse(raw);
      } catch {
        obj = null;
      }
      assert(`SEO JSON-LD válido ${file}`, obj && obj["@context"] && obj["@type"]);
      assert(
        `SEO sin AggregateRating/Review ${file}`,
        !/AggregateRating|"@type"\s*:\s*"Review"/.test(raw),
      );
      if (obj?.["@type"] === "FAQPage") {
        for (const q of obj.mainEntity || []) {
          assert(
            `SEO FAQ visible ${file}: ${q.name}`,
            html.includes(q.name),
          );
        }
      }
    }
  }
  assert("SEO título sueldo con calculadora y Chile", /Calculadora de sueldo líquido Chile/.test(readFileSync(join(root, "sueldo.html"), "utf8")));
  assert("SEO título finiquito con calculadora y Chile", /Calculadora de finiquito Chile/.test(readFileSync(join(root, "finiquito.html"), "utf8")));
  assert(
    "SEO H1 sueldo es calculadora Chile 2026",
    /<h1>Calculadora de sueldo l[ií]quido Chile 2026<\/h1>/.test(readFileSync(join(root, "sueldo.html"), "utf8")),
  );
  {
    const heHtml = readFileSync(join(root, "horas-extras.html"), "utf8");
    const heTitle = (heHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const heH1 = (heHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const sueldoTitle = (readFileSync(join(root, "sueldo.html"), "utf8").match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (readFileSync(join(root, "sueldo.html"), "utf8").match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const guideHtml = readFileSync(join(root, "guias/horas-extras.html"), "utf8");
    const guideTitle = (guideHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const guideH1 = (guideHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    assert(
      "SEO title horas extras apunta a calcular horas extras",
      /calcular horas extras/i.test(heTitle) &&
        !/sueldo l[ií]quido/i.test(heTitle) &&
        heTitle !== sueldoTitle &&
        heTitle !== guideTitle &&
        heTitle.length <= 65,
      heTitle,
    );
    assert(
      "SEO H1 horas extras distinto de /sueldo y de la guía",
      /calcular horas extras/i.test(heH1) &&
        heH1 !== sueldoH1 &&
        heH1 !== guideH1 &&
        !/sueldo l[ií]quido/i.test(heH1),
      heH1,
    );
    assert("SEO horas extras cita art. 32", /art[ií]culo 32/i.test(heHtml) && /C[oó]digo del Trabajo/.test(heHtml));
    assert("SEO horas extras recargo mínimo 50 %", /50\s*%/.test(heHtml) && /m[ií]nimo/i.test(heHtml));
    assert("SEO horas extras enlaza guía y sueldo", /href="\/guias\/horas-extras"/.test(heHtml) && /href="\/sueldo"/.test(heHtml));
    assert("SEO guía horas extras enlaza la calculadora", /href="\/horas-extras"/.test(guideHtml));
    assert(
      "home y nav enlazan /horas-extras",
      /href="\/horas-extras"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/horas-extras" data-nav>Horas extras<\/a>/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/horas-extras" data-nav>Horas extras<\/a>/.test(heHtml),
    );
    assert(
      "sitemap incluye /horas-extras",
      locs.includes("https://www.haberes.cl/horas-extras") && lastmodForPath("/horas-extras") === "2026-08-20",
    );
  }
  {
    const vpHtml = readFileSync(join(root, "vacaciones-proporcionales.html"), "utf8");
    const vpTitle = (vpHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const vpH1 = (vpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const finiHtml = readFileSync(join(root, "finiquito.html"), "utf8");
    const finiTitle = (finiHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const finiH1 = (finiHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const guideHtml = readFileSync(join(root, "guias/vacaciones-proporcionales.html"), "utf8");
    const guideTitle = (guideHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const guideH1 = (guideHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    assert(
      "SEO title vacaciones proporcionales apunta a calcular vacaciones proporcionales",
      /calcular vacaciones proporcionales/i.test(vpTitle) &&
        !/calculadora de finiquito/i.test(vpTitle) &&
        vpTitle !== finiTitle &&
        vpTitle !== guideTitle &&
        vpTitle.length <= 65,
      vpTitle,
    );
    assert(
      "SEO H1 vacaciones proporcionales distinto de /finiquito y de la guía",
      /calcular vacaciones proporcionales/i.test(vpH1) &&
        vpH1 !== finiH1 &&
        vpH1 !== guideH1 &&
        !/calculadora de finiquito/i.test(vpH1),
      vpH1,
    );
    assert("SEO vacaciones proporcionales cita art. 67", /art[ií]culo 67/i.test(vpHtml) && /C[oó]digo del Trabajo/.test(vpHtml));
    assert("SEO vacaciones proporcionales 15 días hábiles", /15 d[ií]as h[aá]biles/i.test(vpHtml));
    assert(
      "SEO vacaciones proporcionales fórmula días×rem/30 y ejemplo 10×900000=300000",
      /d[ií]as\s*×\s*remuneraci[oó]n(?: mensual)?\s*\/\s*30/i.test(vpHtml) &&
        /10\s*×\s*900\.?000\s*\/\s*30/.test(vpHtml) &&
        /\$300\.000/.test(vpHtml) &&
        feriadoProporcional(10, 900000) === 300000,
    );
    assert(
      "SEO vacaciones proporcionales distingue feriado progresivo sin robarle el H1",
      /href="\/feriado-progresivo"/.test(vpHtml) &&
        /calcular feriado progresivo/i.test(vpHtml) &&
        !/calcular feriado progresivo/i.test(vpH1) &&
        !/calcular feriado progresivo/i.test(vpTitle),
    );
    assert(
      "SEO vacaciones proporcionales enlaza guía y finiquito",
      /href="\/guias\/vacaciones-proporcionales"/.test(vpHtml) && /href="\/finiquito"/.test(vpHtml),
    );
    assert("SEO guía vacaciones proporcionales enlaza la calculadora", /href="\/vacaciones-proporcionales"/.test(guideHtml));
    assert(
      "home y nav enlazan /vacaciones-proporcionales",
      /href="\/vacaciones-proporcionales"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/vacaciones-proporcionales" data-nav>Vacaciones proporcionales<\/a>/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/vacaciones-proporcionales" data-nav>Vacaciones proporcionales<\/a>/.test(vpHtml),
    );
    assert(
      "sitemap incluye /vacaciones-proporcionales",
      locs.includes("https://www.haberes.cl/vacaciones-proporcionales") &&
        lastmodForPath("/vacaciones-proporcionales") === "2026-08-21",
    );
  }
  {
    const fpHtml = readFileSync(join(root, "feriado-progresivo.html"), "utf8");
    const fpTitle = (fpHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const fpH1 = (fpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const fpDesc = (fpHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const vpHtml = readFileSync(join(root, "vacaciones-proporcionales.html"), "utf8");
    const vpTitle = (vpHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const vpH1 = (vpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const finiHtml = readFileSync(join(root, "finiquito.html"), "utf8");
    const finiTitle = (finiHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const finiH1 = (finiHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const demo = calcularFeriadoProgresivo({
      aniosEmpleadoresAnteriores: 10,
      aniosEmpleadorActual: 3,
      remuneracionMensual: 900_000,
    });
    const seis = calcularFeriadoProgresivo({ aniosEmpleadoresAnteriores: 10, aniosEmpleadorActual: 6 });
    const unmet = calcularFeriadoProgresivo({ aniosEmpleadoresAnteriores: 5, aniosEmpleadorActual: 4 });
    assert(
      "SEO title feriado progresivo apunta a calcular feriado progresivo",
      /calcular feriado progresivo/i.test(fpTitle) &&
        !/vacaciones proporcionales/i.test(fpTitle) &&
        !/calculadora de finiquito/i.test(fpTitle) &&
        fpTitle !== vpTitle &&
        fpTitle !== finiTitle &&
        fpTitle.length <= 65,
      fpTitle,
    );
    assert(
      "SEO H1 feriado progresivo distinto de /vacaciones-proporcionales y /finiquito",
      /calcular feriado progresivo/i.test(fpH1) &&
        fpH1 === "Calcular feriado progresivo Chile 2026" &&
        fpH1 !== vpH1 &&
        fpH1 !== finiH1 &&
        !/vacaciones proporcionales/i.test(fpH1) &&
        !/calculadora de finiquito/i.test(fpH1),
      fpH1,
    );
    assert(
      "SEO feriado progresivo meta distinta de /vacaciones-proporcionales",
      fpDesc && fpDesc !== ((vpHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO feriado progresivo cita art. 68, DT y Código",
      /art[ií]culo 68/i.test(fpHtml) &&
        /C[oó]digo del Trabajo/.test(fpHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60194/.test(fpHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60195/.test(fpHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(fpHtml),
    );
    assert(
      "SEO feriado progresivo ejemplos DT 0 / 1 / 2 días extra",
      unmet.diasExtra === 0 &&
        demo.diasExtra === 1 &&
        demo.diasFeriadoAnual === 16 &&
        demo.valorExtra === 30000 &&
        seis.diasExtra === 2 &&
        /0 d[ií]as extra/.test(fpHtml) &&
        /1 d[ií]a extra/.test(fpHtml) &&
        /2 d[ií]as extra/.test(fpHtml) &&
        /\$30\.000/.test(fpHtml) &&
        /\$900\.000/.test(fpHtml),
    );
    assert("SEO feriado progresivo FAQPage", /"@type": "FAQPage"/.test(fpHtml));
    assert(
      "SEO feriado progresivo no es vacaciones proporcionales ni IAS",
      /no es el valor en dinero de los d[ií]as no usados/i.test(fpHtml) &&
        /href="\/vacaciones-proporcionales"/.test(fpHtml) &&
        /href="\/finiquito"/.test(fpHtml) &&
        !existsSync(join(root, "vacaciones-progresivas.html")) &&
        !existsSync(join(root, "indemnizacion.html")),
    );
    assert(
      "SEO feriado progresivo métrica principal son días extra",
      /D[ií]as extra \(art\. 68\)/.test(fpHtml) && !/<p class="metric-label">Feriado proporcional<\/p>/.test(fpHtml),
    );
    assert(
      "home y nav enlazan /feriado-progresivo",
      /href="\/feriado-progresivo"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/feriado-progresivo" data-nav>Feriado progresivo<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/feriado-progresivo" data-nav>Feriado progresivo<\/a>/.test(fpHtml),
    );
    assert(
      "sitemap incluye /feriado-progresivo",
      locs.includes("https://www.haberes.cl/feriado-progresivo") &&
        lastmodForPath("/feriado-progresivo") === "2026-08-28",
    );
    assert(
      "seo-map documenta /feriado-progresivo y no-canibalizar /vacaciones-proporcionales",
      /\/feriado-progresivo/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/vacaciones-proporcionales`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no crear `\/vacaciones-progresivas`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "vacaciones proporcionales y su guía enlazan /feriado-progresivo",
      /href="\/feriado-progresivo"/.test(vpHtml) &&
        /href="\/feriado-progresivo"/.test(
          readFileSync(join(root, "guias/vacaciones-proporcionales.html"), "utf8"),
        ),
    );
  }
  {
    const iasHtml = readFileSync(join(root, "indemnizacion-anos-servicio.html"), "utf8");
    const iasTitle = (iasHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const iasH1 = (iasHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const iasDesc = (iasHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const finiHtml = readFileSync(join(root, "finiquito.html"), "utf8");
    const finiTitle = (finiHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const finiH1 = (finiHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const guideHtml = readFileSync(join(root, "guias/indemnizacion-por-anos-de-servicio.html"), "utf8");
    const guideTitle = (guideHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const guideH1 = (guideHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const demo = calcularIas(
      { ingreso: "2020-01-15", termino: "2024-05-15", remuneracion: 1_000_000, avisoPrevio: true },
      { uf: FALLBACK_UF },
    );
    const redondeo = calcularIas(
      { ingreso: "2020-01-15", termino: "2024-08-15", remuneracion: 1_000_000, avisoPrevio: true },
      { uf: FALLBACK_UF },
    );
    const topeAnios = calcularIas(
      { ingreso: "2000-01-01", termino: "2020-01-01", remuneracion: 1_000_000, avisoPrevio: true },
      { uf: FALLBACK_UF },
    );
    const topeUf = calcularIas(
      { ingreso: "2020-01-15", termino: "2022-01-15", remuneracion: 10_000_000, avisoPrevio: false },
      { uf: FALLBACK_UF },
    );
    assert(
      "SEO title IAS apunta a calcular indemnización por años de servicio",
      /calcular indemnizaci[oó]n por a[nñ]os de servicio/i.test(iasTitle) &&
        !/calculadora de finiquito/i.test(iasTitle) &&
        iasTitle !== finiTitle &&
        iasTitle !== guideTitle &&
        iasTitle.length <= 65,
      iasTitle,
    );
    assert(
      "SEO H1 IAS distinto de /finiquito y de la guía",
      iasH1 === "Calcular indemnización por años de servicio Chile 2026" &&
        iasH1 !== finiH1 &&
        iasH1 !== guideH1 &&
        !/calculadora de finiquito/i.test(iasH1),
      iasH1,
    );
    assert(
      "SEO IAS meta distinta de /finiquito y de la guía",
      iasDesc &&
        iasDesc !== ((finiHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        iasDesc !== ((guideHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO IAS cita art. 163, 172, DT y Código",
      /art[ií]culo 163/i.test(iasHtml) &&
        /art[ií]culo 172/i.test(iasHtml) &&
        /C[oó]digo del Trabajo/.test(iasHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60593/.test(iasHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60590/.test(iasHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60604/.test(iasHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(iasHtml),
    );
    assert(
      "SEO IAS golden 4 años 4 meses, redondeo, tope 11 y 90 UF",
      demo.anios === 4 &&
        demo.ias === 4_000_000 &&
        redondeo.anios === 5 &&
        redondeo.ias === 5_000_000 &&
        topeAnios.anios === 11 &&
        topeAnios.ias === 11_000_000 &&
        topeUf.ias === 7_353_722 &&
        topeUf.aviso === 3_676_861 &&
        /\$4\.000\.000/.test(iasHtml) &&
        /\$5\.000\.000/.test(iasHtml) &&
        /\$11\.000\.000/.test(iasHtml) &&
        /\$3\.676\.861/.test(iasHtml) &&
        /\$7\.353\.722/.test(iasHtml) &&
        /4 a[nñ]os y 4 meses/.test(iasHtml) &&
        /tope 11 a[nñ]os/.test(iasHtml),
    );
    assert("SEO IAS FAQPage", /"@type": "FAQPage"/.test(iasHtml));
    assert(
      "SEO IAS no es finiquito completo ni guía",
      /no incluye feriado proporcional/i.test(iasHtml) &&
        /href="\/finiquito"/.test(iasHtml) &&
        /href="\/guias\/indemnizacion-por-anos-de-servicio"/.test(iasHtml) &&
        !existsSync(join(root, "indemnizacion.html")),
    );
    assert(
      "SEO IAS métrica principal es la IAS, aviso opcional",
      /Indemnizaci[oó]n por a[nñ]os de servicio/.test(iasHtml) &&
        /Sumar indemnizaci[oó]n sustitutiva del aviso previo/.test(iasHtml) &&
        /Opcional y aparte/.test(iasHtml),
    );
    assert(
      "home y nav enlazan /indemnizacion-anos-servicio",
      /href="\/indemnizacion-anos-servicio"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/indemnizacion-anos-servicio" data-nav>Indemnizaci[oó]n a[nñ]os de servicio<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/indemnizacion-anos-servicio" data-nav>Indemnizaci[oó]n a[nñ]os de servicio<\/a>/.test(iasHtml),
    );
    assert(
      "sitemap incluye /indemnizacion-anos-servicio",
      locs.includes("https://www.haberes.cl/indemnizacion-anos-servicio") &&
        lastmodForPath("/indemnizacion-anos-servicio") === "2026-08-28",
    );
    assert(
      "seo-map documenta /indemnizacion-anos-servicio y no-canibalizar /finiquito",
      /\/indemnizacion-anos-servicio/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/finiquito`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no crear `\/indemnizacion`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "guía IAS y /finiquito enlazan /indemnizacion-anos-servicio",
      /href="\/indemnizacion-anos-servicio"/.test(guideHtml) &&
        /href="\/indemnizacion-anos-servicio"/.test(finiHtml),
    );
    assert(
      "SEO guía IAS sigue enlazando /finiquito",
      /href="\/finiquito"/.test(guideHtml),
    );
  }

  {
    const adHtml = readFileSync(join(root, "autodespido.html"), "utf8");
    const adTitle = (adHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const adH1 = (adHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const adDesc = (adHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const iasHtmlAd = readFileSync(join(root, "indemnizacion-anos-servicio.html"), "utf8");
    const avisoHtmlAd = readFileSync(join(root, "indemnizacion-aviso-previo.html"), "utf8");
    const finiHtmlAd = readFileSync(join(root, "finiquito.html"), "utf8");
    const vercelAd = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
    const serveAd = readFileSync(join(root, "scripts/serve.mjs"), "utf8");
    const goldAd = calcularIas(
      { ingreso: "2020-03-01", termino: "2026-03-01", remuneracion: 1_000_000, avisoPrevio: true },
      { uf: FALLBACK_UF },
    );
    const goldAdAviso = calcularIas(
      { ingreso: "2020-03-01", termino: "2026-03-01", remuneracion: 1_000_000, avisoPrevio: false },
      { uf: FALLBACK_UF },
    );
    assert(
      "SEO autodespido title único y corto",
      /calcular autodespido/i.test(adTitle) &&
        adTitle.length <= 65 &&
        !/calculadora de finiquito/i.test(adTitle) &&
        !/indemnizaci[oó]n por a[nñ]os de servicio/i.test(adTitle) &&
        adTitle !== ((iasHtmlAd.match(/<title>([^<]*)<\/title>/) || [])[1] || ""),
      adTitle,
    );
    assert(
      "SEO autodespido H1 único art. 171",
      adH1 === "Calcular autodespido Chile 2026" &&
        /art[ií]culo 171/.test(adHtml) &&
        !/art\. 168/.test(adH1) &&
        !/tutela/.test(adH1),
      adH1,
    );
    assert(
      "SEO autodespido description propia",
      adDesc.length >= 110 &&
        adDesc.length <= 160 &&
        /art\. 171/.test(adDesc) &&
        /autodespido/.test(adDesc) &&
        /despido indirecto/.test(adDesc),
      `${adDesc.length}:${adDesc}`,
    );
    assert(
      "SEO autodespido cita art. 171, BCN, DT y ORD 335/2",
      /art[ií]culo 171/.test(adHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(adHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60579/.test(adHtml) &&
        /110967/.test(adHtml) &&
        /art[ií]culo 163/.test(adHtml) &&
        /162/.test(adHtml),
    );
    assert(
      "SEO autodespido gold 2026 $6.000.000 en copy",
      goldAd.anios === 6 &&
        goldAd.ias === 6_000_000 &&
        goldAdAviso.aviso === 1_000_000 &&
        goldAdAviso.totalIasAviso === 7_000_000 &&
        /\$6\.000\.000/.test(adHtml) &&
        /\$7\.000\.000/.test(adHtml) &&
        /1 de marzo de 2020/.test(adHtml) &&
        /1 de marzo de 2026/.test(adHtml),
    );
    assert("SEO autodespido FAQPage", /"@type": "FAQPage"/.test(adHtml));
    assert(
      "SEO autodespido no canibaliza hermanas vetadas",
      /href="\/finiquito"/.test(adHtml) &&
        /href="\/indemnizacion-anos-servicio"/.test(adHtml) &&
        /href="\/indemnizacion-aviso-previo"/.test(adHtml) &&
        /href="\/guias\/carta-aviso-termino-contrato"/.test(adHtml) &&
        /href="\/guias\/me-reservo-el-derecho-en-el-finiquito"/.test(adHtml) &&
        /estimaci[oó]n educativa/.test(adHtml) &&
        /no constituye asesor[ií]a legal/i.test(adHtml) &&
        /no es una demanda/i.test(adHtml) &&
        /href="\/despido-injustificado"/.test(adHtml) &&
        /href="\/tutela-laboral"/.test(adHtml) &&
        /href="\/nulidad-despido"/.test(adHtml) &&
        !existsSync(join(root, "art-171.html")) &&
        !existsSync(join(root, "auto-despido.html")) &&
        !existsSync(join(root, "despido-indirecto.html")),
    );
    assert(
      "home y nav enlazan /autodespido",
      /href="\/autodespido"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/autodespido" data-nav>Autodespido<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/autodespido" data-nav>Autodespido<\/a>/.test(adHtml),
    );
    assert(
      "sitemap incluye /autodespido",
      locs.includes("https://www.haberes.cl/autodespido") &&
        lastmodForPath("/autodespido") === "2026-09-14",
    );
    assert(
      "seo-map documenta /autodespido y no-canibalizar hermanas",
      /\/autodespido/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/finiquito`, `\/indemnizacion-anos-servicio`, `\/indemnizacion-aviso-previo`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/art-171`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /autodespido en el cluster de finiquito",
      /href="\/autodespido"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Finiquito<\/h2>[\s\S]*href="\/autodespido"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /autodespido",
      /href="\/autodespido"/.test(iasHtmlAd) &&
        /href="\/autodespido"/.test(avisoHtmlAd) &&
        /href="\/autodespido"/.test(finiHtmlAd) &&
        /href="\/autodespido"/.test(readFileSync(join(root, "despido-injustificado.html"), "utf8")) &&
        /href="\/autodespido"/.test(readFileSync(join(root, "tutela-laboral.html"), "utf8")) &&
        /href="\/autodespido"/.test(readFileSync(join(root, "nulidad-despido.html"), "utf8")),
    );
    assert(
      "alias /despido-indirecto redirige a /autodespido",
      Array.isArray(vercelAd.redirects) &&
        vercelAd.redirects.some(
          (r) => r.source === "/despido-indirecto" && r.destination === "/autodespido" && r.permanent === true,
        ) &&
        /urlPath === "\/despido-indirecto"/.test(serveAd),
    );
  }
  {
    const ofHtml = readFileSync(join(root, "obra-faena.html"), "utf8");
    const ofTitle = (ofHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const ofH1 = (ofHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const ofDesc = (ofHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const iasHtmlOf = readFileSync(join(root, "indemnizacion-anos-servicio.html"), "utf8");
    const finiHtmlOf = readFileSync(join(root, "finiquito.html"), "utf8");
    const causalHtmlOf = readFileSync(join(root, "finiquito/art-159-conclusion-del-trabajo.html"), "utf8");
    const goldOf = calcularIndemnizacionObraFaena(
      { ingreso: "2026-01-01", termino: "2026-09-01", remuneracion: 900_000, celebracion: "2026-01-01" },
      { uf: FALLBACK_UF },
    );
    const goldOfFrac = calcularIndemnizacionObraFaena(
      { ingreso: "2026-01-01", termino: "2026-09-17", remuneracion: 900_000 },
      { uf: FALLBACK_UF },
    );
    assert(
      "SEO obra-faena title único y corto",
      /calcular indemnizaci[oó]n obra faena/i.test(ofTitle) &&
        ofTitle.length <= 65 &&
        !/calculadora de finiquito/i.test(ofTitle) &&
        !/indemnizaci[oó]n por a[nñ]os de servicio/i.test(ofTitle) &&
        ofTitle !== ((iasHtmlOf.match(/<title>([^<]*)<\/title>/) || [])[1] || ""),
      ofTitle,
    );
    assert(
      "SEO obra-faena H1 único art. 163 / 159 N°5",
      ofH1 === "Calcular indemnización obra faena Chile 2026" &&
        /art[ií]culo 163/.test(ofHtml) &&
        /159/.test(ofHtml) &&
        !/30 d[ií]as por a[nñ]o/.test(ofH1),
      ofH1,
    );
    assert(
      "SEO obra-faena description propia",
      ofDesc.length >= 110 &&
        ofDesc.length <= 160 &&
        /obra o faena/.test(ofDesc) &&
        /2,5/.test(ofDesc) &&
        /159/.test(ofDesc),
      `${ofDesc.length}:${ofDesc}`,
    );
    assert(
      "SEO obra-faena cita art. 163, 159 N°5, 10 bis, 172, BCN, DT y 954/9",
      /art[ií]culo 163/.test(ofHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(ofHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=1125900/.test(ofHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-118059/.test(ofHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-118056/.test(ofHtml) &&
        /954\/9/.test(ofHtml) &&
        /art[ií]culo 172/.test(ofHtml) &&
        /10 bis/.test(ofHtml),
    );
    assert(
      "SEO obra-faena gold 2026 $600.000 en copy",
      goldOf.mesesComputables === 8 &&
        goldOf.diasIndemnizacion === 20 &&
        goldOf.monto === 600_000 &&
        goldOfFrac.mesesComputables === 9 &&
        goldOfFrac.monto === 675_000 &&
        /\$600\.000/.test(ofHtml) &&
        /\$675\.000/.test(ofHtml) &&
        /1 de enero de 2026/.test(ofHtml) &&
        /1 de septiembre de 2026/.test(ofHtml),
    );
    assert("SEO obra-faena FAQPage", /"@type": "FAQPage"/.test(ofHtml));
    assert(
      "SEO obra-faena no canibaliza hermanas vetadas",
      /href="\/finiquito"/.test(ofHtml) &&
        /href="\/finiquito\/art-159-conclusion-del-trabajo"/.test(ofHtml) &&
        /href="\/indemnizacion-anos-servicio"/.test(ofHtml) &&
        /href="\/vacaciones-proporcionales"/.test(ofHtml) &&
        /href="\/despido-injustificado"/.test(ofHtml) &&
        /estimaci[oó]n educativa/.test(ofHtml) &&
        /no constituye asesor[ií]a legal/i.test(ofHtml) &&
        /no es finiquito completo/i.test(ofHtml) &&
        !existsSync(join(root, "finiquito-obra-faena.html")) &&
        !existsSync(join(root, "indemnizacion-obra-faena.html")),
    );
    assert(
      "home y nav enlazan /obra-faena",
      /href="\/obra-faena"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/obra-faena" data-nav>Obra o faena<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/obra-faena" data-nav>Obra o faena<\/a>/.test(ofHtml),
    );
    assert(
      "sitemap incluye /obra-faena",
      locs.includes("https://www.haberes.cl/obra-faena") &&
        lastmodForPath("/obra-faena") === "2026-09-14",
    );
    assert(
      "seo-map documenta /obra-faena y no-canibalizar hermanas",
      /\/obra-faena/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/finiquito`, `\/finiquito\/art-159-conclusion-del-trabajo`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/finiquito-obra-faena`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /obra-faena en el cluster de finiquito",
      /href="\/obra-faena"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Finiquito<\/h2>[\s\S]*href="\/obra-faena"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /obra-faena",
      /href="\/obra-faena"/.test(iasHtmlOf) &&
        /href="\/obra-faena"/.test(finiHtmlOf) &&
        /href="\/obra-faena"/.test(causalHtmlOf) &&
        /href="\/obra-faena"/.test(readFileSync(join(root, "despido-injustificado.html"), "utf8")) &&
        /href="\/obra-faena"/.test(readFileSync(join(root, "vacaciones-proporcionales.html"), "utf8")),
    );
  }
  {
    const plHtml = readFileSync(join(root, "prescripcion-laboral.html"), "utf8");
    const plTitle = (plHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const plH1 = (plHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const plDesc = (plHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const goldPl168 = calcularPrescripcionLaboral({
      modo: PRESCRIPCION_GOLD.art168.modo,
      fechaAncla: PRESCRIPCION_GOLD.art168.fechaAncla,
      fechaHoy: "2026-02-01",
    });
    assert(
      "SEO prescripción laboral title único y corto",
      /calcular prescripci[oó]n laboral/i.test(plTitle) &&
        plTitle.length <= 65 &&
        !/calculadora de finiquito/i.test(plTitle) &&
        !/despido injustificado/i.test(plTitle),
      plTitle,
    );
    assert(
      "SEO prescripción laboral H1 único art. 510",
      plH1 === "Calcular plazo de prescripción laboral Chile 2026" &&
        /art[ií]culo 510/.test(plHtml) &&
        /art[ií]culo 168/.test(plHtml) &&
        !/30 d[ií]as por a[nñ]o/.test(plH1),
      plH1,
    );
    assert(
      "SEO prescripción laboral description propia",
      plDesc.length >= 110 &&
        plDesc.length <= 160 &&
        /art\. 510/.test(plDesc) &&
        /168/.test(plDesc) &&
        /plazo/.test(plDesc),
      `${plDesc.length}:${plDesc}`,
    );
    assert(
      "SEO prescripción laboral cita art. 510, 168, BCN y DT 60622",
      /art[ií]culo 510/.test(plHtml) &&
        /art[ií]culo 168/.test(plHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(plHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60622/.test(plHtml) &&
        /alegarse en juicio/.test(plHtml),
    );
    assert(
      "SEO prescripción laboral gold 2026 en copy",
      goldPl168.fechaLimite === "2026-03-27" &&
        /15 de marzo de 2024/.test(plHtml) &&
        /15 de marzo de 2026/.test(plHtml) &&
        /15 de enero de 2026/.test(plHtml) &&
        /15 de julio de 2026/.test(plHtml) &&
        /30 de septiembre de 2025/.test(plHtml) &&
        /30 de marzo de 2026/.test(plHtml) &&
        /10 de enero de 2026/.test(plHtml) &&
        /10 de julio de 2026/.test(plHtml) &&
        /2 de enero de 2026/.test(plHtml) &&
        /27 de marzo de 2026/.test(plHtml) &&
        /1 de julio de 2025/.test(plHtml),
    );
    assert("SEO prescripción laboral FAQPage", /"@type": "FAQPage"/.test(plHtml));
    assert(
      "SEO prescripción laboral no canibaliza hermanas vetadas",
      /href="\/finiquito"/.test(plHtml) &&
        /href="\/despido-injustificado"/.test(plHtml) &&
        /href="\/nulidad-despido"/.test(plHtml) &&
        /href="\/autodespido"/.test(plHtml) &&
        /href="\/tutela-laboral"/.test(plHtml) &&
        /href="\/interes-mora"/.test(plHtml) &&
        /href="\/horas-extras"/.test(plHtml) &&
        /href="\/indemnizacion-anos-servicio"/.test(plHtml) &&
        /href="\/indemnizacion-aviso-previo"/.test(plHtml) &&
        /href="\/obra-faena"/.test(plHtml) &&
        /estimaci[oó]n educativa/.test(plHtml) &&
        /no constituye asesor[ií]a legal/i.test(plHtml) &&
        !existsSync(join(root, "art-510.html")) &&
        !existsSync(join(root, "plazo-prescripcion.html")) &&
        !existsSync(join(root, "60-dias-habiles.html")),
    );
    assert(
      "home y nav enlazan /prescripcion-laboral",
      /href="\/prescripcion-laboral"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/prescripcion-laboral" data-nav>Prescripción laboral<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/prescripcion-laboral" data-nav>Prescripción laboral<\/a>/.test(plHtml),
    );
    assert(
      "sitemap incluye /prescripcion-laboral",
      locs.includes("https://www.haberes.cl/prescripcion-laboral") &&
        lastmodForPath("/prescripcion-laboral") === "2026-09-15",
    );
    assert(
      "seo-map documenta /prescripcion-laboral y no-canibalizar hermanas",
      /\/prescripcion-laboral/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/finiquito`, `\/despido-injustificado`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/art-510`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /prescripcion-laboral en el cluster de finiquito",
      /href="\/prescripcion-laboral"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Finiquito<\/h2>[\s\S]*href="\/prescripcion-laboral"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /prescripcion-laboral",
      /href="\/prescripcion-laboral"/.test(readFileSync(join(root, "finiquito.html"), "utf8")) &&
        /href="\/prescripcion-laboral"/.test(readFileSync(join(root, "despido-injustificado.html"), "utf8")) &&
        /href="\/prescripcion-laboral"/.test(readFileSync(join(root, "horas-extras.html"), "utf8")) &&
        /href="\/prescripcion-laboral"/.test(readFileSync(join(root, "nulidad-despido.html"), "utf8")),
    );
  }
  {
    const dcHtml = readFileSync(join(root, "descanso-compensatorio.html"), "utf8");
    const dcTitle = (dcHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const dcH1 = (dcHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const dcDesc = (dcHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const rdHtmlDc = readFileSync(join(root, "recargo-domingo-comercio.html"), "utf8");
    const fiHtmlDc = readFileSync(join(root, "feriado-irrenunciable.html"), "utf8");
    const heHtmlDc = readFileSync(join(root, "horas-extras.html"), "utf8");
    const goldDc = calcularDescansoCompensatorio({
      domingos: DESCANSO_COMPENSATORIO_GOLD.domingos,
      festivos: DESCANSO_COMPENSATORIO_GOLD.festivos,
      otorgados: DESCANSO_COMPENSATORIO_GOLD.otorgados,
      remuneracion: DESCANSO_COMPENSATORIO_GOLD.remuneracion,
    });
    assert(
      "SEO descanso compensatorio title único y corto",
      /calcular descanso compensatorio/i.test(dcTitle) &&
        dcTitle.length <= 65 &&
        !/recargo domingo/i.test(dcTitle) &&
        !/horas extras/i.test(dcTitle),
      dcTitle,
    );
    assert(
      "SEO descanso compensatorio H1 único art. 38",
      dcH1 === "Calcular descanso compensatorio Chile 2026" &&
        /art[ií]culo 38/.test(dcHtml) &&
        !/30\s*%/.test(dcH1),
      dcH1,
    );
    assert(
      "SEO descanso compensatorio description propia",
      dcDesc.length >= 110 &&
        dcDesc.length <= 160 &&
        /art\. 38/.test(dcDesc) &&
        /descanso compensatorio/.test(dcDesc) &&
        /recargo 30/.test(dcDesc),
      `${dcDesc.length}:${dcDesc}`,
    );
    assert(
      "SEO descanso compensatorio cita art. 35–38, BCN, DT 2938/227 y 712/20",
      /art[ií]culo 35/.test(dcHtml) &&
        /art[ií]culo 38/.test(dcHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(dcHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-61852/.test(dcHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-111155/.test(dcHtml) &&
        /712\/20/.test(dcHtml),
    );
    assert(
      "SEO descanso compensatorio gold 2026 3 días y $90.000 en copy",
      goldDc.pendientes === 3 &&
        goldDc.estimacion === 90_000 &&
        /4 domingo/.test(dcHtml) &&
        /\$90\.000/.test(dcHtml) &&
        /3 d[ií]as pendientes/.test(dcHtml) &&
        /\$900\.000/.test(dcHtml),
    );
    assert("SEO descanso compensatorio FAQPage", /"@type": "FAQPage"/.test(dcHtml));
    assert(
      "SEO descanso compensatorio no canibaliza hermanas vetadas",
      /href="\/recargo-domingo-comercio"/.test(dcHtml) &&
        /href="\/feriado-irrenunciable"/.test(dcHtml) &&
        /href="\/horas-extras"/.test(dcHtml) &&
        /href="\/jornada-40-horas"/.test(dcHtml) &&
        /href="\/semana-corrida"/.test(dcHtml) &&
        /href="\/sueldo"/.test(dcHtml) &&
        /href="\/descuento-atrasos"/.test(dcHtml) &&
        /estimaci[oó]n educativa/.test(dcHtml) &&
        /no constituye asesor[ií]a legal/i.test(dcHtml) &&
        !existsSync(join(root, "descanso-dominical.html")) &&
        !existsSync(join(root, "dias-compensatorios.html")) &&
        !existsSync(join(root, "art-38.html")),
    );
    assert(
      "home y nav enlazan /descanso-compensatorio",
      /href="\/descanso-compensatorio"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/descanso-compensatorio" data-nav>Descanso compensatorio<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/descanso-compensatorio" data-nav>Descanso compensatorio<\/a>/.test(dcHtml) &&
        /href="\/descanso-compensatorio" data-nav>Descanso compensatorio<\/a>/.test(
          readFileSync(join(root, "js/ui.js"), "utf8"),
        ),
    );
    assert(
      "sitemap incluye /descanso-compensatorio",
      locs.includes("https://www.haberes.cl/descanso-compensatorio") &&
        lastmodForPath("/descanso-compensatorio") === "2026-09-15",
    );
    assert(
      "seo-map documenta /descanso-compensatorio y no-canibalizar hermanas",
      /\/descanso-compensatorio/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/recargo-domingo-comercio`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/descanso-dominical`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /descanso-compensatorio en el cluster de liquidación",
      /href="\/descanso-compensatorio"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Liquidaci[oó]n de sueldo<\/h2>[\s\S]*href="\/descanso-compensatorio"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /descanso-compensatorio",
      /href="\/descanso-compensatorio"/.test(rdHtmlDc) &&
        /href="\/descanso-compensatorio"/.test(fiHtmlDc) &&
        /href="\/descanso-compensatorio"/.test(heHtmlDc) &&
        /href="\/descanso-compensatorio"/.test(readFileSync(join(root, "jornada-40-horas.html"), "utf8")) &&
        /href="\/descanso-compensatorio"/.test(readFileSync(join(root, "semana-corrida.html"), "utf8")),
    );
  }
  {
    const ilHtml = readFileSync(join(root, "inclusion-laboral.html"), "utf8");
    const ilTitle = (ilHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const ilH1 = (ilHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const ilDesc = (ilHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const ceHtmlIl = readFileSync(join(root, "costo-empresa.html"), "utf8");
    const scHtmlIl = readFileSync(join(root, "sala-cuna.html"), "utf8");
    const smHtmlIl = readFileSync(join(root, "sueldo-minimo.html"), "utf8");
    const goldIl = calcularInclusionLaboral(INCLUSION_LABORAL_GOLD.umbral);
    const goldRed = calcularInclusionLaboral(INCLUSION_LABORAL_GOLD.redondeo);
    assert(
      "SEO inclusión laboral title único y corto",
      /calcular inclusión laboral/i.test(ilTitle) &&
        ilTitle.length <= 65 &&
        !/costo empresa/i.test(ilTitle) &&
        !/sueldo mínimo/i.test(ilTitle),
      ilTitle,
    );
    assert(
      "SEO inclusión laboral H1 único Ley 21.015",
      ilH1 === "Calcular inclusión laboral Chile 2026" &&
        /Ley N° 21\.015/.test(ilHtml) &&
        /1\s*%/.test(ilHtml),
      ilH1,
    );
    assert(
      "SEO inclusión laboral description propia",
      ilDesc.length >= 110 &&
        ilDesc.length <= 160 &&
        /Ley 21\.015/.test(ilDesc) &&
        /cuota del 1%/.test(ilDesc) &&
        /inclusión laboral/.test(ilDesc),
      `${ilDesc.length}:${ilDesc}`,
    );
    assert(
      "SEO inclusión laboral cita Ley 21.015, DS 64, 157 bis/ter, DT y 1513/42",
      /bcn\.cl\/leychile\/navegar\?idNorma=1103997/.test(ilHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=1114287/.test(ilHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(ilHtml) &&
        /157 bis/.test(ilHtml) &&
        /157 ter/.test(ilHtml) &&
        /dt\.gob\.cl\/portal\/1626\/w3-article-118013/.test(ilHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-125364/.test(ilHtml) &&
        /1513\/42/.test(ilHtml) &&
        /entero inferior/.test(ilHtml),
    );
    assert(
      "SEO inclusión laboral gold 2026 80/100/250 y $13.285.272 en copy",
      goldIl.cuota === 1 &&
        goldIl.donacion === 13_285_272 &&
        goldRed.cuota === 2 &&
        goldRed.gap === 0 &&
        /80/.test(ilHtml) &&
        /no aplica/.test(ilHtml) &&
        /\$13\.285\.272/.test(ilHtml) &&
        /250/.test(ilHtml) &&
        /2,5/.test(ilHtml),
    );
    assert("SEO inclusión laboral FAQPage", /"@type": "FAQPage"/.test(ilHtml));
    assert(
      "SEO inclusión laboral no canibaliza hermanas vetadas",
      /href="\/sala-cuna"/.test(ilHtml) &&
        /href="\/costo-empresa"/.test(ilHtml) &&
        /href="\/sueldo-minimo"/.test(ilHtml) &&
        /href="\/asignacion-familiar"/.test(ilHtml) &&
        /href="\/fuero-maternal"/.test(ilHtml) &&
        /href="\/postnatal-parental"/.test(ilHtml) &&
        /href="\/empresa"/.test(ilHtml) &&
        /estimaci[oó]n educativa/.test(ilHtml) &&
        /no constituye asesor[ií]a legal/i.test(ilHtml) &&
        !existsSync(join(root, "ley-21015.html")) &&
        !existsSync(join(root, "cuota-inclusion.html")) &&
        !existsSync(join(root, "donacion-inclusion.html")) &&
        !existsSync(join(root, "1-poriento.html")),
    );
    assert(
      "home y nav enlazan /inclusion-laboral",
      /href="\/inclusion-laboral"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/inclusion-laboral" data-nav>Inclusión laboral<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/inclusion-laboral" data-nav>Inclusión laboral<\/a>/.test(ilHtml) &&
        /href="\/inclusion-laboral" data-nav>Inclusión laboral<\/a>/.test(
          readFileSync(join(root, "js/ui.js"), "utf8"),
        ),
    );
    assert(
      "sitemap incluye /inclusion-laboral",
      locs.includes("https://www.haberes.cl/inclusion-laboral") &&
        lastmodForPath("/inclusion-laboral") === "2026-09-16",
    );
    assert(
      "seo-map documenta /inclusion-laboral y no-canibalizar hermanas",
      /\/inclusion-laboral/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/sala-cuna`, `\/costo-empresa`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/ley-21015`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /inclusion-laboral en el cluster de liquidación",
      /href="\/inclusion-laboral"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Liquidaci[oó]n de sueldo<\/h2>[\s\S]*href="\/inclusion-laboral"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /inclusion-laboral",
      /href="\/inclusion-laboral"/.test(ceHtmlIl) &&
        /href="\/inclusion-laboral"/.test(scHtmlIl) &&
        /href="\/inclusion-laboral"/.test(smHtmlIl) &&
        /href="\/inclusion-laboral"/.test(readFileSync(join(root, "empresa.html"), "utf8")),
    );
  }
  {
    const jpHtml = readFileSync(join(root, "jornada-parcial.html"), "utf8");
    const jpTitle = (jpHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const jpH1 = (jpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const jpDesc = (jpHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const j40HtmlJp = readFileSync(join(root, "jornada-40-horas.html"), "utf8");
    const sueldoHtmlJp = readFileSync(join(root, "sueldo.html"), "utf8");
    const spHtmlJp = readFileSync(join(root, "sueldo-proporcional.html"), "utf8");
    const vpHtmlJp = readFileSync(join(root, "vacaciones-proporcionales.html"), "utf8");
    const heHtmlJp = readFileSync(join(root, "horas-extras.html"), "utf8");
    const goldJp = calcularJornadaParcial(JORNADA_PARCIAL_GOLD.medioTiempo);
    const goldEx = calcularJornadaParcial(JORNADA_PARCIAL_GOLD.excede);
    const goldTope = calcularJornadaParcial(JORNADA_PARCIAL_GOLD.alTope);
    assert(
      "SEO jornada parcial title único y corto",
      /calcular jornada parcial/i.test(jpTitle) &&
        jpTitle.length <= 65 &&
        !/jornada 40 horas/i.test(jpTitle) &&
        !/sueldo l[ií]quido/i.test(jpTitle),
      jpTitle,
    );
    assert(
      "SEO jornada parcial H1 único tope 2/3",
      jpH1 === "Calcular jornada parcial Chile 2026" &&
        /art[ií]culo 40 bis/.test(jpHtml) &&
        /2\/3/.test(jpHtml),
      jpH1,
    );
    assert(
      "SEO jornada parcial description propia",
      jpDesc.length >= 110 &&
        jpDesc.length <= 160 &&
        /art\. 40 bis/.test(jpDesc) &&
        /jornada parcial/.test(jpDesc) &&
        /2\/3/.test(jpDesc),
      `${jpDesc.length}:${jpDesc}`,
    );
    assert(
      "SEO jornada parcial cita art. 40 bis, Ley 21.561, art. 67 y BCN",
      /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(jpHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=1191554/.test(jpHtml) &&
        /40 bis/.test(jpHtml) &&
        /art[ií]culo 67/.test(jpHtml) &&
        /Ley 21\.561/.test(jpHtml),
    );
    assert(
      "SEO jornada parcial gold 2026 20 h $450.000, 30 h no cumple y $533.400",
      goldJp.sueldoParcial === 450_000 &&
        goldJp.diasFeriado === 7.5 &&
        goldEx.cumpleTope === false &&
        goldEx.sueldoParcial === 675_000 &&
        goldTope.sueldoParcial === 533_400 &&
        /\$450\.000/.test(jpHtml) &&
        /\$675\.000/.test(jpHtml) &&
        /\$533\.400/.test(jpHtml) &&
        /26,67/.test(jpHtml) &&
        /7,50/.test(jpHtml) &&
        /no cumple/.test(jpHtml),
    );
    assert("SEO jornada parcial FAQPage", /"@type": "FAQPage"/.test(jpHtml));
    assert(
      "SEO jornada parcial no canibaliza hermanas vetadas",
      /href="\/jornada-40-horas"/.test(jpHtml) &&
        /href="\/sueldo"/.test(jpHtml) &&
        /href="\/sueldo-proporcional"/.test(jpHtml) &&
        /href="\/vacaciones-proporcionales"/.test(jpHtml) &&
        /href="\/horas-extras"/.test(jpHtml) &&
        /href="\/semana-corrida"/.test(jpHtml) &&
        /href="\/descuento-atrasos"/.test(jpHtml) &&
        /href="\/costo-empresa"/.test(jpHtml) &&
        /href="\/empresa"/.test(jpHtml) &&
        /estimaci[oó]n educativa/.test(jpHtml) &&
        /no constituye asesor[ií]a legal/i.test(jpHtml) &&
        !existsSync(join(root, "part-time.html")) &&
        !existsSync(join(root, "medio-tiempo.html")) &&
        !existsSync(join(root, "jornada-media.html")) &&
        !existsSync(join(root, "contrato-parcial.html")),
    );
    assert(
      "home y nav enlazan /jornada-parcial",
      /href="\/jornada-parcial"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/jornada-parcial" data-nav>Jornada parcial<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/jornada-parcial" data-nav>Jornada parcial<\/a>/.test(jpHtml) &&
        /href="\/jornada-parcial" data-nav>Jornada parcial<\/a>/.test(
          readFileSync(join(root, "js/ui.js"), "utf8"),
        ),
    );
    assert(
      "sitemap incluye /jornada-parcial",
      locs.includes("https://www.haberes.cl/jornada-parcial") &&
        lastmodForPath("/jornada-parcial") === "2026-09-16",
    );
    assert(
      "seo-map documenta /jornada-parcial y no-canibalizar hermanas",
      /\/jornada-parcial/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/jornada-40-horas`, `\/sueldo`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/part-time`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /jornada-parcial en el cluster de liquidación",
      /href="\/jornada-parcial"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Liquidaci[oó]n de sueldo<\/h2>[\s\S]*href="\/jornada-parcial"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/jornada-parcial"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /jornada-parcial",
      /href="\/jornada-parcial"/.test(j40HtmlJp) &&
        /href="\/jornada-parcial"/.test(sueldoHtmlJp) &&
        /href="\/jornada-parcial"/.test(spHtmlJp) &&
        /href="\/jornada-parcial"/.test(vpHtmlJp) &&
        /href="\/jornada-parcial"/.test(heHtmlJp) &&
        /href="\/jornada-parcial"/.test(readFileSync(join(root, "semana-corrida.html"), "utf8")) &&
        /href="\/jornada-parcial"/.test(readFileSync(join(root, "descuento-atrasos.html"), "utf8")) &&
        /href="\/jornada-parcial"/.test(readFileSync(join(root, "costo-empresa.html"), "utf8")) &&
        /href="\/jornada-parcial"/.test(readFileSync(join(root, "empresa.html"), "utf8")),
    );
  }
  {
    const ttHtml = readFileSync(join(root, "teletrabajo.html"), "utf8");
    const ttTitle = (ttHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const ttH1 = (ttHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const ttDesc = (ttHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const j40HtmlTt = readFileSync(join(root, "jornada-40-horas.html"), "utf8");
    const jpHtmlTt = readFileSync(join(root, "jornada-parcial.html"), "utf8");
    const heHtmlTt = readFileSync(join(root, "horas-extras.html"), "utf8");
    const dcHtmlTt = readFileSync(join(root, "descanso-compensatorio.html"), "utf8");
    const rdHtmlTt = readFileSync(join(root, "recargo-domingo-comercio.html"), "utf8");
    const daHtmlTt = readFileSync(join(root, "descuento-atrasos.html"), "utf8");
    const sueldoHtmlTt = readFileSync(join(root, "sueldo.html"), "utf8");
    const ceHtmlTt = readFileSync(join(root, "costo-empresa.html"), "utf8");
    const goldTt9 = calcularTeletrabajo(TELETRABAJO_GOLD.jornada0900);
    const goldTt8 = calcularTeletrabajo(TELETRABAJO_GOLD.jornada0800);
    const goldTtRem = calcularTeletrabajo(TELETRABAJO_GOLD.remDias);
    assert(
      "SEO teletrabajo title único y corto",
      /calcular teletrabajo/i.test(ttTitle) &&
        ttTitle.length <= 65 &&
        !/jornada 40 horas/i.test(ttTitle) &&
        !/sueldo l[ií]quido/i.test(ttTitle),
      ttTitle,
    );
    assert(
      "SEO teletrabajo H1 único Ley 21.220",
      ttH1 === "Calcular teletrabajo Chile 2026" &&
        /Ley 21\.220/.test(ttHtml) &&
        /152 qu[aá]ter J/.test(ttHtml) &&
        /derecho a desconexi[oó]n/.test(ttHtml),
      ttH1,
    );
    assert(
      "SEO teletrabajo description propia",
      ttDesc.length >= 110 &&
        ttDesc.length <= 160 &&
        /Ley 21\.220/.test(ttDesc) &&
        /teletrabajo/.test(ttDesc) &&
        /desconexi[oó]n/.test(ttDesc),
      `${ttDesc.length}:${ttDesc}`,
    );
    assert(
      "SEO teletrabajo cita Ley 21.220, art. 152 quáter, CT y DT",
      /bcn\.cl\/leychile\/navegar\?idNorma=1143741/.test(ttHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(ttHtml) &&
        /152 qu[aá]ter/.test(ttHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-118665/.test(ttHtml),
    );
    assert(
      "SEO teletrabajo gold 2026 09:00–18:00, 08:00–22:00 y $300.000 en copy",
      goldTt9.horasJornadaDiaria === 9 &&
        goldTt9.horasDesconexion === 15 &&
        goldTt9.cumpleDesconexion === true &&
        goldTt8.horasJornadaDiaria === 14 &&
        goldTt8.horasDesconexion === 10 &&
        goldTt8.cumpleDesconexion === false &&
        goldTtRem.valorDia === 30_000 &&
        goldTtRem.estimacionDiasModalidad === 300_000 &&
        /09:00/.test(ttHtml) &&
        /18:00/.test(ttHtml) &&
        /15/.test(ttHtml) &&
        /08:00/.test(ttHtml) &&
        /22:00/.test(ttHtml) &&
        /10&nbsp;h/.test(ttHtml) &&
        /\$30\.000/.test(ttHtml) &&
        /\$300\.000/.test(ttHtml) &&
        /no cumple/.test(ttHtml),
    );
    assert("SEO teletrabajo FAQPage", /"@type": "FAQPage"/.test(ttHtml));
    assert(
      "SEO teletrabajo no canibaliza hermanas vetadas",
      /href="\/jornada-40-horas"/.test(ttHtml) &&
        /href="\/jornada-parcial"/.test(ttHtml) &&
        /href="\/horas-extras"/.test(ttHtml) &&
        /href="\/descanso-compensatorio"/.test(ttHtml) &&
        /href="\/recargo-domingo-comercio"/.test(ttHtml) &&
        /href="\/descuento-atrasos"/.test(ttHtml) &&
        /href="\/sueldo"/.test(ttHtml) &&
        /href="\/costo-empresa"/.test(ttHtml) &&
        /href="\/empresa"/.test(ttHtml) &&
        /estimaci[oó]n educativa/.test(ttHtml) &&
        /no constituye asesor[ií]a legal/i.test(ttHtml) &&
        !existsSync(join(root, "home-office.html")) &&
        !existsSync(join(root, "trabajo-remoto.html")) &&
        !existsSync(join(root, "derecho-desconexion.html")) &&
        !existsSync(join(root, "ley-21220.html")),
    );
    assert(
      "home y nav enlazan /teletrabajo",
      /href="\/teletrabajo"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/teletrabajo" data-nav>Teletrabajo<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/teletrabajo" data-nav>Teletrabajo<\/a>/.test(ttHtml) &&
        /href="\/teletrabajo" data-nav>Teletrabajo<\/a>/.test(
          readFileSync(join(root, "js/ui.js"), "utf8"),
        ),
    );
    assert(
      "sitemap incluye /teletrabajo",
      locs.includes("https://www.haberes.cl/teletrabajo") &&
        lastmodForPath("/teletrabajo") === "2026-09-17",
    );
    assert(
      "seo-map documenta /teletrabajo y no-canibalizar hermanas",
      /\/teletrabajo/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/jornada-40-horas`, `\/jornada-parcial`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/home-office`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /teletrabajo en el cluster de liquidación",
      /href="\/teletrabajo"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Liquidaci[oó]n de sueldo<\/h2>[\s\S]*href="\/teletrabajo"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/teletrabajo"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /teletrabajo",
      /href="\/teletrabajo"/.test(j40HtmlTt) &&
        /href="\/teletrabajo"/.test(jpHtmlTt) &&
        /href="\/teletrabajo"/.test(heHtmlTt) &&
        /href="\/teletrabajo"/.test(dcHtmlTt) &&
        /href="\/teletrabajo"/.test(rdHtmlTt) &&
        /href="\/teletrabajo"/.test(daHtmlTt) &&
        /href="\/teletrabajo"/.test(sueldoHtmlTt) &&
        /href="\/teletrabajo"/.test(ceHtmlTt) &&
        /href="\/teletrabajo"/.test(readFileSync(join(root, "empresa.html"), "utf8")),
    );
  }
  {
    const pfHtml = readFileSync(join(root, "contrato-plazo-fijo.html"), "utf8");
    const pfTitle = (pfHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const pfH1 = (pfHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const pfDesc = (pfHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const finiHtmlPf = readFileSync(join(root, "finiquito.html"), "utf8");
    const causalHtmlPf = readFileSync(join(root, "finiquito/art-159-vencimiento-del-plazo.html"), "utf8");
    const ofHtmlPf = readFileSync(join(root, "obra-faena.html"), "utf8");
    const iasHtmlPf = readFileSync(join(root, "indemnizacion-anos-servicio.html"), "utf8");
    const avisoHtmlPf = readFileSync(join(root, "indemnizacion-aviso-previo.html"), "utf8");
    const plHtmlPf = readFileSync(join(root, "prescripcion-laboral.html"), "utf8");
    const goldPf12 = calcularContratoPlazoFijo(
      (({ fechaTermino, ...rest }) => rest)(CONTRATO_PLAZO_FIJO_GOLD.doceMeses),
    );
    const goldPf18 = calcularContratoPlazoFijo(
      (({ fechaTermino, ...rest }) => rest)(CONTRATO_PLAZO_FIJO_GOLD.dieciochoSinTitulo),
    );
    const goldPfTit = calcularContratoPlazoFijo(
      (({ fechaTermino, ...rest }) => rest)(CONTRATO_PLAZO_FIJO_GOLD.dieciochoConTitulo),
    );
    const goldPfCont = calcularContratoPlazoFijo(
      (({ fechaTermino, ...rest }) => rest)(CONTRATO_PLAZO_FIJO_GOLD.continuidad),
    );
    assert(
      "SEO contrato-plazo-fijo title único y corto",
      /calcular contrato a plazo fijo/i.test(pfTitle) &&
        pfTitle.length <= 65 &&
        !/calculadora de finiquito/i.test(pfTitle) &&
        !/sueldo l[ií]quido/i.test(pfTitle),
      pfTitle,
    );
    assert(
      "SEO contrato-plazo-fijo H1 único art. 159 N°4",
      pfH1 === "Calcular contrato a plazo fijo Chile 2026" &&
        /159/.test(pfHtml) &&
        /plazo fijo/.test(pfHtml) &&
        /indefinido/.test(pfHtml),
      pfH1,
    );
    assert(
      "SEO contrato-plazo-fijo description propia",
      pfDesc.length >= 110 &&
        pfDesc.length <= 160 &&
        /plazo fijo/.test(pfDesc) &&
        /indefinido/.test(pfDesc) &&
        /159/.test(pfDesc),
      `${pfDesc.length}:${pfDesc}`,
    );
    assert(
      "SEO contrato-plazo-fijo cita art. 159 N°4, BCN y DT",
      /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(pfHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-102862/.test(pfHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60792/.test(pfHtml) &&
        /159/.test(pfHtml),
    );
    assert(
      "SEO contrato-plazo-fijo gold 2026 12/18 meses en copy",
      goldPf12.topeLegalMeses === 12 &&
        goldPf12.fechaTermino === "2027-01-01" &&
        goldPf12.cumpleTope === true &&
        goldPf18.cumpleTope === false &&
        goldPfTit.topeLegalMeses === 24 &&
        goldPfTit.cumpleTope === true &&
        goldPfCont.seTransformaEnIndefinido === true &&
        /12 meses/.test(pfHtml) &&
        /18 meses/.test(pfHtml) &&
        /24 meses/.test(pfHtml) &&
        /1 de enero de 2027/.test(pfHtml) &&
        /1 de julio de 2027/.test(pfHtml) &&
        /no cumple/.test(pfHtml) &&
        /pasa a indefinido/.test(pfHtml),
    );
    assert("SEO contrato-plazo-fijo FAQPage", /"@type": "FAQPage"/.test(pfHtml));
    assert(
      "SEO contrato-plazo-fijo no canibaliza hermanas vetadas",
      /href="\/finiquito"/.test(pfHtml) &&
        /href="\/finiquito\/art-159-vencimiento-del-plazo"/.test(pfHtml) &&
        /href="\/obra-faena"/.test(pfHtml) &&
        /href="\/indemnizacion-anos-servicio"/.test(pfHtml) &&
        /href="\/indemnizacion-aviso-previo"/.test(pfHtml) &&
        /href="\/prescripcion-laboral"/.test(pfHtml) &&
        /href="\/despido-injustificado"/.test(pfHtml) &&
        /href="\/autodespido"/.test(pfHtml) &&
        /href="\/sueldo"/.test(pfHtml) &&
        /href="\/empresa"/.test(pfHtml) &&
        /href="\/termino-anticipado-plazo-fijo"/.test(pfHtml) &&
        /estimaci[oó]n educativa/.test(pfHtml) &&
        /no constituye asesor[ií]a legal/i.test(pfHtml) &&
        !existsSync(join(root, "plazo-fijo.html")) &&
        !existsSync(join(root, "contrato-fijo.html")) &&
        !existsSync(join(root, "paso-a-indefinido.html")) &&
        !existsSync(join(root, "art-159-4.html")),
    );
    assert(
      "home y nav enlazan /contrato-plazo-fijo",
      /href="\/contrato-plazo-fijo"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/contrato-plazo-fijo" data-nav>Contrato a plazo fijo<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/contrato-plazo-fijo" data-nav>Contrato a plazo fijo<\/a>/.test(pfHtml) &&
        /href="\/contrato-plazo-fijo" data-nav>Contrato a plazo fijo<\/a>/.test(
          readFileSync(join(root, "js/ui.js"), "utf8"),
        ),
    );
    assert(
      "sitemap incluye /contrato-plazo-fijo",
      locs.includes("https://www.haberes.cl/contrato-plazo-fijo") &&
        lastmodForPath("/contrato-plazo-fijo") === "2026-09-17",
    );
    assert(
      "seo-map documenta /contrato-plazo-fijo y no-canibalizar hermanas",
      /\/contrato-plazo-fijo/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/finiquito`, `\/finiquito\/art-159-vencimiento-del-plazo`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/plazo-fijo`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /contrato-plazo-fijo en el cluster de finiquito",
      /href="\/contrato-plazo-fijo"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Finiquito<\/h2>[\s\S]*href="\/contrato-plazo-fijo"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /contrato-plazo-fijo",
      /href="\/contrato-plazo-fijo"/.test(finiHtmlPf) &&
        /href="\/contrato-plazo-fijo"/.test(causalHtmlPf) &&
        /href="\/contrato-plazo-fijo"/.test(ofHtmlPf) &&
        /href="\/contrato-plazo-fijo"/.test(iasHtmlPf) &&
        /href="\/contrato-plazo-fijo"/.test(avisoHtmlPf) &&
        /href="\/contrato-plazo-fijo"/.test(plHtmlPf) &&
        /href="\/contrato-plazo-fijo"/.test(readFileSync(join(root, "despido-injustificado.html"), "utf8")) &&
        /href="\/contrato-plazo-fijo"/.test(readFileSync(join(root, "autodespido.html"), "utf8")) &&
        /href="\/contrato-plazo-fijo"/.test(readFileSync(join(root, "empresa.html"), "utf8")),
    );
  }
  {
    const tapHtml = readFileSync(join(root, "termino-anticipado-plazo-fijo.html"), "utf8");
    const tapTitle = (tapHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const tapH1 = (tapHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const tapDesc = (tapHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const finiHtmlTap = readFileSync(join(root, "finiquito.html"), "utf8");
    const causalHtmlTap = readFileSync(join(root, "finiquito/art-159-vencimiento-del-plazo.html"), "utf8");
    const ofHtmlTap = readFileSync(join(root, "obra-faena.html"), "utf8");
    const pfHtmlTap = readFileSync(join(root, "contrato-plazo-fijo.html"), "utf8");
    const goldTap = calcularTerminoAnticipadoPlazoFijo(
      TERMINO_ANTICIPADO_PLAZO_FIJO_GOLD.tresMeses800,
    );
    assert(
      "SEO término anticipado plazo fijo title único y corto",
      /calcular t[ée]rmino anticipado plazo fijo/i.test(tapTitle) &&
        tapTitle.length <= 65 &&
        !/calculadora de finiquito/i.test(tapTitle) &&
        !/sueldo l[ií]quido/i.test(tapTitle) &&
        !/paso a indefinido/i.test(tapTitle),
      tapTitle,
    );
    assert(
      "SEO término anticipado plazo fijo H1 único art. 159 N°4",
      tapH1 === "Calcular término anticipado plazo fijo Chile 2026" &&
        /159/.test(tapHtml) &&
        /remanente/.test(tapHtml) &&
        /plazo fijo/.test(tapHtml),
      tapH1,
    );
    assert(
      "SEO término anticipado plazo fijo description propia",
      tapDesc.length >= 110 &&
        tapDesc.length <= 160 &&
        /remanente/.test(tapDesc) &&
        /159/.test(tapDesc) &&
        /finiquito/.test(tapDesc),
      `${tapDesc.length}:${tapDesc}`,
    );
    assert(
      "SEO término anticipado plazo fijo cita art. 159 N°4 y BCN",
      /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(tapHtml) &&
        /159/.test(tapHtml) &&
        /160/.test(tapHtml),
    );
    assert(
      "SEO término anticipado plazo fijo gold 2026 $800.000 → $2.400.000 en copy",
      goldTap.ok === true &&
        goldTap.mesesRemanentes === 3 &&
        goldTap.diasRemanentes === 91 &&
        goldTap.remuneracionRemanente === 2_400_000 &&
        /800\.000/.test(tapHtml) &&
        /2\.400\.000/.test(tapHtml) &&
        /3,00/.test(tapHtml) &&
        /1 de abril de 2026/.test(tapHtml) &&
        /1 de julio de 2026/.test(tapHtml),
    );
    assert("SEO término anticipado plazo fijo FAQPage", /"@type": "FAQPage"/.test(tapHtml));
    assert(
      "SEO término anticipado plazo fijo no canibaliza hermanas vetadas",
      /href="\/contrato-plazo-fijo"/.test(tapHtml) &&
        /href="\/finiquito"/.test(tapHtml) &&
        /href="\/finiquito\/art-159-vencimiento-del-plazo"/.test(tapHtml) &&
        /href="\/obra-faena"/.test(tapHtml) &&
        /href="\/indemnizacion-anos-servicio"/.test(tapHtml) &&
        /href="\/indemnizacion-aviso-previo"/.test(tapHtml) &&
        /href="\/despido-injustificado"/.test(tapHtml) &&
        /href="\/autodespido"/.test(tapHtml) &&
        /href="\/nulidad-despido"/.test(tapHtml) &&
        /href="\/tutela-laboral"/.test(tapHtml) &&
        /href="\/prescripcion-laboral"/.test(tapHtml) &&
        /href="\/vacaciones-proporcionales"/.test(tapHtml) &&
        /href="\/feriado-anual"/.test(tapHtml) &&
        /href="\/sueldo"/.test(tapHtml) &&
        /href="\/sueldo-proporcional"/.test(tapHtml) &&
        /href="\/costo-empresa"/.test(tapHtml) &&
        /href="\/empresa"/.test(tapHtml) &&
        /href="\/permiso-sin-goce"/.test(tapHtml) &&
        /estimaci[oó]n educativa/.test(tapHtml) &&
        /no constituye asesor[ií]a legal/i.test(tapHtml) &&
        !existsSync(join(root, "indemnizacion-plazo-fijo.html")) &&
        !existsSync(join(root, "remanente-plazo-fijo.html")) &&
        !existsSync(join(root, "termino-plazo-fijo.html")) &&
        !existsSync(join(root, "salarios-remanentes.html")),
    );
    assert(
      "home y nav enlazan /termino-anticipado-plazo-fijo",
      /href="\/termino-anticipado-plazo-fijo"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/termino-anticipado-plazo-fijo" data-nav>T[ée]rmino anticipado plazo fijo<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/termino-anticipado-plazo-fijo" data-nav>T[ée]rmino anticipado plazo fijo<\/a>/.test(tapHtml) &&
        /href="\/termino-anticipado-plazo-fijo" data-nav>T[ée]rmino anticipado plazo fijo<\/a>/.test(
          readFileSync(join(root, "js/ui.js"), "utf8"),
        ),
    );
    assert(
      "sitemap incluye /termino-anticipado-plazo-fijo",
      locs.includes("https://www.haberes.cl/termino-anticipado-plazo-fijo") &&
        lastmodForPath("/termino-anticipado-plazo-fijo") === "2026-09-20",
    );
    assert(
      "seo-map documenta /termino-anticipado-plazo-fijo y no-canibalizar hermanas",
      /\/termino-anticipado-plazo-fijo/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/contrato-plazo-fijo`, `\/finiquito`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/indemnizacion-plazo-fijo`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /termino-anticipado-plazo-fijo en el cluster de finiquito",
      /href="\/termino-anticipado-plazo-fijo"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Finiquito<\/h2>[\s\S]*href="\/termino-anticipado-plazo-fijo"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /termino-anticipado-plazo-fijo",
      /href="\/termino-anticipado-plazo-fijo"/.test(finiHtmlTap) &&
        /href="\/termino-anticipado-plazo-fijo"/.test(causalHtmlTap) &&
        /href="\/termino-anticipado-plazo-fijo"/.test(ofHtmlTap) &&
        /href="\/termino-anticipado-plazo-fijo"/.test(pfHtmlTap) &&
        /href="\/termino-anticipado-plazo-fijo"/.test(
          readFileSync(join(root, "indemnizacion-anos-servicio.html"), "utf8"),
        ) &&
        /href="\/termino-anticipado-plazo-fijo"/.test(
          readFileSync(join(root, "despido-injustificado.html"), "utf8"),
        ) &&
        /href="\/termino-anticipado-plazo-fijo"/.test(readFileSync(join(root, "empresa.html"), "utf8")),
    );
  }
  {
    const psgHtml = readFileSync(join(root, "permiso-sin-goce.html"), "utf8");
    const psgTitle = (psgHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const psgH1 = (psgHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const psgDesc = (psgHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const daHtmlPsg = readFileSync(join(root, "descuento-atrasos.html"), "utf8");
    const spHtmlPsg = readFileSync(join(root, "sueldo-proporcional.html"), "utf8");
    const sueldoHtmlPsg = readFileSync(join(root, "sueldo.html"), "utf8");
    const lmHtmlPsg = readFileSync(join(root, "licencia-medica.html"), "utf8");
    const pmHtmlPsg = readFileSync(join(root, "permiso-matrimonio.html"), "utf8");
    const pfHtmlPsg = readFileSync(join(root, "permiso-fallecimiento.html"), "utf8");
    const goldPsg1 = calcularPermisoSinGoce(PERMISO_SIN_GOCE_GOLD.corridos30);
    const goldPsg2 = calcularPermisoSinGoce(PERMISO_SIN_GOCE_GOLD.laborables20);
    const goldPsg3 = calcularPermisoSinGoce(PERMISO_SIN_GOCE_GOLD.ceroDias);
    assert(
      "SEO permiso-sin-goce title único y corto",
      /calcular permiso sin goce/i.test(psgTitle) &&
        psgTitle.length <= 65 &&
        !/permiso matrimonio/i.test(psgTitle) &&
        !/sueldo l[ií]quido/i.test(psgTitle) &&
        !/descuento atrasos/i.test(psgTitle),
      psgTitle,
    );
    assert(
      "SEO permiso-sin-goce H1 único pacto",
      psgH1 === "Calcular permiso sin goce Chile 2026" &&
        /permiso sin goce/.test(psgHtml) &&
        /suspensi[oó]n convencional/.test(psgHtml) &&
        !/art\. 207 bis/.test(psgH1),
      psgH1,
    );
    assert(
      "SEO permiso-sin-goce description propia",
      psgDesc.length >= 110 &&
        psgDesc.length <= 160 &&
        /permiso sin goce/.test(psgDesc) &&
        /pacto/.test(psgDesc) &&
        !/permiso matrimonio/i.test(psgDesc),
      `${psgDesc.length}:${psgDesc}`,
    );
    assert(
      "SEO permiso-sin-goce cita CT, ORD 4593 y consulta DT",
      /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(psgHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-110215/.test(psgHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60216/.test(psgHtml) &&
        /4593/.test(psgHtml),
    );
    assert(
      "SEO permiso-sin-goce gold 2026 $90.000, $810.000 y 20 días en copy",
      goldPsg1.descuento === 90_000 &&
        goldPsg1.sueldoMes === 810_000 &&
        goldPsg2.descuento === 90_000 &&
        goldPsg3.descuento === 0 &&
        goldPsg3.sueldoMes === 900_000 &&
        /\$90\.000/.test(psgHtml) &&
        /\$810\.000/.test(psgHtml) &&
        /20/.test(psgHtml) &&
        /\$900\.000/.test(psgHtml),
    );
    assert("SEO permiso-sin-goce FAQPage", /"@type": "FAQPage"/.test(psgHtml));
    assert(
      "SEO permiso-sin-goce no canibaliza hermanas vetadas",
      /href="\/descuento-atrasos"/.test(psgHtml) &&
        /href="\/sueldo-proporcional"/.test(psgHtml) &&
        /href="\/sueldo"/.test(psgHtml) &&
        /href="\/licencia-medica"/.test(psgHtml) &&
        /href="\/permiso-matrimonio"/.test(psgHtml) &&
        /href="\/permiso-fallecimiento"/.test(psgHtml) &&
        /href="\/permiso-paternidad"/.test(psgHtml) &&
        /href="\/permiso-prenatal"/.test(psgHtml) &&
        /href="\/fuero-maternal"/.test(psgHtml) &&
        /href="\/postnatal-parental"/.test(psgHtml) &&
        /href="\/hora-lactancia"/.test(psgHtml) &&
        /href="\/finiquito"/.test(psgHtml) &&
        /href="\/costo-empresa"/.test(psgHtml) &&
        /href="\/empresa"/.test(psgHtml) &&
        /estimaci[oó]n educativa/.test(psgHtml) &&
        /no constituye asesor[ií]a legal/i.test(psgHtml) &&
        !existsSync(join(root, "permiso-sin-sueldo.html")) &&
        !existsSync(join(root, "licencia-sin-goce.html")) &&
        !existsSync(join(root, "dias-sin-goce.html")),
    );
    assert(
      "home y nav enlazan /permiso-sin-goce",
      /href="\/permiso-sin-goce"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/permiso-sin-goce" data-nav>Permiso sin goce<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/permiso-sin-goce" data-nav>Permiso sin goce<\/a>/.test(psgHtml) &&
        /href="\/permiso-sin-goce" data-nav>Permiso sin goce<\/a>/.test(
          readFileSync(join(root, "js/ui.js"), "utf8"),
        ),
    );
    assert(
      "sitemap incluye /permiso-sin-goce",
      locs.includes("https://www.haberes.cl/permiso-sin-goce") &&
        lastmodForPath("/permiso-sin-goce") === "2026-09-18",
    );
    assert(
      "seo-map documenta /permiso-sin-goce y no-canibalizar hermanas",
      /\/permiso-sin-goce/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/descuento-atrasos`, `\/sueldo-proporcional`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/permiso-sin-sueldo`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /permiso-sin-goce en el cluster de liquidación",
      /href="\/permiso-sin-goce"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Liquidaci[oó]n de sueldo<\/h2>[\s\S]*href="\/permiso-sin-goce"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/permiso-sin-goce"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /permiso-sin-goce",
      /href="\/permiso-sin-goce"/.test(daHtmlPsg) &&
        /href="\/permiso-sin-goce"/.test(spHtmlPsg) &&
        /href="\/permiso-sin-goce"/.test(sueldoHtmlPsg) &&
        /href="\/permiso-sin-goce"/.test(lmHtmlPsg) &&
        /href="\/permiso-sin-goce"/.test(pmHtmlPsg) &&
        /href="\/permiso-sin-goce"/.test(pfHtmlPsg) &&
        /href="\/permiso-sin-goce"/.test(readFileSync(join(root, "permiso-paternidad.html"), "utf8")) &&
        /href="\/permiso-sin-goce"/.test(readFileSync(join(root, "finiquito.html"), "utf8")) &&
        /href="\/permiso-sin-goce"/.test(readFileSync(join(root, "empresa.html"), "utf8")),
    );
  }

  {
    const zeHtml = readFileSync(join(root, "zona-extrema.html"), "utf8");
    const zeTitle = (zeHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const zeH1 = (zeHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const zeDesc = (zeHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const iuHtmlZe = readFileSync(join(root, "impuesto-unico.html"), "utf8");
    const sueldoHtmlZe = readFileSync(join(root, "sueldo.html"), "utf8");
    const goldZe = calcularZonaExtrema(ZONA_EXTREMA_GOLD.iquique2000);
    assert(
      "SEO zona extrema title único y corto",
      /calcular zona extrema/i.test(zeTitle) &&
        zeTitle.length <= 65 &&
        !/impuesto único/i.test(zeTitle) &&
        !/sueldo l[ií]quido/i.test(zeTitle) &&
        !/^Haberes\b/.test(zeTitle),
      zeTitle,
    );
    assert(
      "SEO zona extrema H1 único art. 13 D.L. 889",
      zeH1 === "Calcular zona extrema Chile 2026" &&
        /889/.test(zeHtml) &&
        /19\.354/.test(zeHtml) &&
        /grado 1-A/.test(zeHtml),
      zeH1,
    );
    assert(
      "SEO zona extrema description propia",
      zeDesc.length >= 110 &&
        zeDesc.length <= 160 &&
        /889/.test(zeDesc) &&
        /zona extrema/i.test(zeDesc) &&
        /impuesto único/.test(zeDesc),
      `${zeDesc.length}:${zeDesc}`,
    );
    assert(
      "SEO zona extrema cita D.L. 889, D.L. 249, Ley 19.354 y SII",
      /suseso\.gob\.cl\/612\/w3-propertyvalue-187853/.test(zeHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=5904/.test(zeHtml) &&
        /sii\.cl\/preguntas_frecuentes\/declaracion_renta\/001_140_1533/.test(zeHtml) &&
        /19\.354/.test(zeHtml) &&
        /Circular SII N° 10/.test(zeHtml),
    );
    assert(
      "SEO zona extrema gold 2026 Iquique $2.000.000 / 56 % / $745.136",
      goldZe.ok === true &&
        goldZe.rebajaSinTope === 717_949 &&
        goldZe.tope === 417_276 &&
        goldZe.rebajaEfectiva === 417_276 &&
        goldZe.rentaAfectaNueva === 1_582_724 &&
        /2\.000\.000/.test(zeHtml) &&
        /717\.949/.test(zeHtml) &&
        /417\.276/.test(zeHtml) &&
        /1\.582\.724/.test(zeHtml) &&
        /745\.136/.test(zeHtml) &&
        /Iquique/.test(zeHtml) &&
        />56</.test(zeHtml),
    );
    assert("SEO zona extrema FAQPage", /"@type": "FAQPage"/.test(zeHtml));
    assert(
      "SEO zona extrema no canibaliza hermanas vetadas",
      /href="\/impuesto-unico"/.test(zeHtml) &&
        /href="\/sueldo"/.test(zeHtml) &&
        /href="\/cotizaciones-previsionales"/.test(zeHtml) &&
        /href="\/costo-empresa"/.test(zeHtml) &&
        /href="\/apv"/.test(zeHtml) &&
        /href="\/boleta-honorarios"/.test(zeHtml) &&
        /href="\/interes-mora"/.test(zeHtml) &&
        /href="\/asignacion-familiar"/.test(zeHtml) &&
        /href="\/colacion-movilizacion"/.test(zeHtml) &&
        /href="\/empresa"/.test(zeHtml) &&
        !existsSync(join(root, "rebaja-zona-extrema.html")) &&
        !existsSync(join(root, "dl-889.html")) &&
        !existsSync(join(root, "franquicia-889.html")) &&
        !existsSync(join(root, "credito-zona-extrema.html")) &&
        !existsSync(join(root, "asignacion-zona.html")) &&
        !existsSync(join(root, "gratificacion-zona.html")) &&
        !existsSync(join(root, "reajuste-ipc.html")),
    );
    assert(
      "home y nav enlazan /zona-extrema",
      /href="\/zona-extrema"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/zona-extrema" data-nav>Zona extrema<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/zona-extrema" data-nav>Zona extrema<\/a>/.test(zeHtml) &&
        /href="\/zona-extrema" data-nav>Zona extrema<\/a>/.test(iuHtmlZe) &&
        /href="\/zona-extrema" data-nav>Zona extrema<\/a>/.test(sueldoHtmlZe),
    );
    assert(
      "sitemap incluye /zona-extrema",
      locs.includes("https://www.haberes.cl/zona-extrema") &&
        lastmodForPath("/zona-extrema") === "2026-09-21",
    );
    assert(
      "seo-map documenta /zona-extrema y no-canibalizar hermanas",
      /\/zona-extrema/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/impuesto-unico`, `\/sueldo`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/rebaja-zona-extrema`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /zona-extrema en el cluster de liquidación",
      /href="\/zona-extrema"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Liquidaci[oó]n de sueldo<\/h2>[\s\S]*href="\/zona-extrema"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/zona-extrema"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /zona-extrema",
      /href="\/zona-extrema"/.test(iuHtmlZe) &&
        /href="\/zona-extrema"/.test(sueldoHtmlZe) &&
        /href="\/zona-extrema"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/zona-extrema"/.test(readFileSync(join(root, "guias.html"), "utf8")),
    );
  }

  {
    const prHtml = readFileSync(join(root, "promedio-remuneraciones.html"), "utf8");
    const prTitle = (prHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const prH1 = (prHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const prDesc = (prHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const finiHtmlPr = readFileSync(join(root, "finiquito.html"), "utf8");
    const iasHtmlPr = readFileSync(join(root, "indemnizacion-anos-servicio.html"), "utf8");
    const avisoHtmlPr = readFileSync(join(root, "indemnizacion-aviso-previo.html"), "utf8");
    const goldPr = calcularPromedioRemuneraciones(PROMEDIO_REMUNERACIONES_GOLD.tresMeses);
    assert(
      "SEO promedio remuneraciones title único y corto",
      /calcular promedio de remuneraciones/i.test(prTitle) &&
        prTitle.length <= 65 &&
        !/sueldo l[ií]quido/i.test(prTitle) &&
        !/calculadora de finiquito/i.test(prTitle) &&
        !/^Haberes\b/.test(prTitle),
      prTitle,
    );
    assert(
      "SEO promedio remuneraciones H1 único art. 172",
      prH1 === "Calcular promedio de remuneraciones Chile 2026" &&
        /172/.test(prHtml) &&
        /promedio/.test(prHtml) &&
        /variables/.test(prHtml),
      prH1,
    );
    assert(
      "SEO promedio remuneraciones description propia",
      prDesc.length >= 110 &&
        prDesc.length <= 160 &&
        /172/.test(prDesc) &&
        /promedio/.test(prDesc) &&
        /finiquito/.test(prDesc),
      `${prDesc.length}:${prDesc}`,
    );
    assert(
      "SEO promedio remuneraciones cita art. 172 y BCN",
      /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(prHtml) &&
        /172/.test(prHtml) &&
        /163/.test(prHtml) &&
        /162/.test(prHtml),
    );
    assert(
      "SEO promedio remuneraciones gold 2026 $1.033.333 en copy",
      goldPr.ok === true &&
        goldPr.promedio === 1_033_333 &&
        /800\.000/.test(prHtml) &&
        /1\.000\.000/.test(prHtml) &&
        /1\.200\.000/.test(prHtml) &&
        /900\.000/.test(prHtml) &&
        /1\.033\.333/.test(prHtml) &&
        /1\.100\.000/.test(prHtml),
    );
    assert("SEO promedio remuneraciones FAQPage", /"@type": "FAQPage"/.test(prHtml));
    assert(
      "SEO promedio remuneraciones no canibaliza hermanas vetadas",
      /href="\/finiquito"/.test(prHtml) &&
        /href="\/indemnizacion-anos-servicio"/.test(prHtml) &&
        /href="\/indemnizacion-aviso-previo"/.test(prHtml) &&
        /href="\/sueldo"/.test(prHtml) &&
        /href="\/sueldo-proporcional"/.test(prHtml) &&
        /href="\/gratificacion"/.test(prHtml) &&
        /href="\/semana-corrida"/.test(prHtml) &&
        /href="\/aguinaldo"/.test(prHtml) &&
        /href="\/horas-extras"/.test(prHtml) &&
        /href="\/descuento-atrasos"/.test(prHtml) &&
        /href="\/costo-empresa"/.test(prHtml) &&
        /href="\/empresa"/.test(prHtml) &&
        /href="\/cotizaciones-previsionales"/.test(prHtml) &&
        /href="\/impuesto-unico"/.test(prHtml) &&
        /href="\/zona-extrema"/.test(prHtml) &&
        /href="\/obra-faena"/.test(prHtml) &&
        /href="\/termino-anticipado-plazo-fijo"/.test(prHtml) &&
        /href="\/contrato-plazo-fijo"/.test(prHtml) &&
        /href="\/despido-injustificado"/.test(prHtml) &&
        /href="\/autodespido"/.test(prHtml) &&
        /href="\/nulidad-despido"/.test(prHtml) &&
        /href="\/tutela-laboral"/.test(prHtml) &&
        /href="\/interes-mora"/.test(prHtml) &&
        /estimaci[oó]n educativa/.test(prHtml) &&
        /no constituye asesor[ií]a legal/i.test(prHtml) &&
        !existsSync(join(root, "comisiones.html")) &&
        !existsSync(join(root, "comision-variable.html")) &&
        !existsSync(join(root, "promedio-comisiones.html")) &&
        !existsSync(join(root, "remuneraciones-variables.html")) &&
        !existsSync(join(root, "ultima-remuneracion.html")) &&
        !existsSync(join(root, "art-172.html")) &&
        !existsSync(join(root, "base-indemnizacion.html")) &&
        !existsSync(join(root, "promedio-3-meses.html")),
    );
    assert(
      "home y nav enlazan /promedio-remuneraciones",
      /href="\/promedio-remuneraciones"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/promedio-remuneraciones" data-nav>Promedio remuneraciones<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/promedio-remuneraciones" data-nav>Promedio remuneraciones<\/a>/.test(prHtml) &&
        /href="\/promedio-remuneraciones" data-nav>Promedio remuneraciones<\/a>/.test(
          readFileSync(join(root, "js/ui.js"), "utf8"),
        ),
    );
    assert(
      "sitemap incluye /promedio-remuneraciones",
      locs.includes("https://www.haberes.cl/promedio-remuneraciones") &&
        lastmodForPath("/promedio-remuneraciones") === "2026-09-21",
    );
    assert(
      "seo-map documenta /promedio-remuneraciones y no-canibalizar hermanas",
      /\/promedio-remuneraciones/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/finiquito`, `\/indemnizacion-anos-servicio`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/comisiones`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /promedio-remuneraciones en el cluster de finiquito",
      /href="\/promedio-remuneraciones"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Finiquito<\/h2>[\s\S]*href="\/promedio-remuneraciones"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /promedio-remuneraciones",
      /href="\/promedio-remuneraciones"/.test(finiHtmlPr) &&
        /href="\/promedio-remuneraciones"/.test(iasHtmlPr) &&
        /href="\/promedio-remuneraciones"/.test(avisoHtmlPr) &&
        /href="\/promedio-remuneraciones"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/promedio-remuneraciones"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /href="\/promedio-remuneraciones"/.test(readFileSync(join(root, "empresa.html"), "utf8")),
    );
  }

  {
    const alHtml = readFileSync(join(root, "antiguedad-laboral.html"), "utf8");
    const alTitle = (alHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const alH1 = (alHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const alDesc = (alHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const finiHtmlAl = readFileSync(join(root, "finiquito.html"), "utf8");
    const iasHtmlAl = readFileSync(join(root, "indemnizacion-anos-servicio.html"), "utf8");
    const vacHtmlAl = readFileSync(join(root, "vacaciones-proporcionales.html"), "utf8");
    const feriadoHtmlAl = readFileSync(join(root, "feriado-anual.html"), "utf8");
    const goldAl = calcularAntiguedadLaboral(ANTIGUEDAD_LABORAL_GOLD.seisAniosSeisMeses);
    assert(
      "SEO antigüedad laboral title único y corto",
      /calcular antigüedad laboral/i.test(alTitle) &&
        alTitle.length <= 65 &&
        !/indemnizaci[oó]n/i.test(alTitle) &&
        !/finiquito/i.test(alTitle) &&
        !/^Haberes\b/.test(alTitle),
      alTitle,
    );
    assert(
      "SEO antigüedad laboral H1 único fecha a fecha",
      alH1 === "Calcular antigüedad laboral Chile 2026" &&
        /163/.test(alHtml) &&
        /años, meses y días/.test(alHtml) &&
        /fecha a fecha/.test(alHtml),
      alH1,
    );
    assert(
      "SEO antigüedad laboral description propia",
      alDesc.length >= 110 &&
        alDesc.length <= 160 &&
        /antigüedad/.test(alDesc) &&
        /163/.test(alDesc) &&
        /feriado/.test(alDesc),
      `${alDesc.length}:${alDesc}`,
    );
    assert(
      "SEO antigüedad laboral cita art. 163, 67/68 y BCN",
      /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(alHtml) &&
        /163/.test(alHtml) &&
        /67/.test(alHtml) &&
        /68/.test(alHtml),
    );
    assert(
      "SEO antigüedad laboral gold 2026 en copy y defaults UI",
      goldAl.ok === true &&
        goldAl.anosIAS === 6 &&
        goldAl.mesesFeriado === 78 &&
        /id="fechaInicio" type="date" value="2020-01-15"/.test(alHtml) &&
        /id="fechaTermino" type="date" value="2026-07-15"/.test(alHtml) &&
        /6 años, 6 meses, 0 días/.test(alHtml) &&
        /5 años, 11 meses, 30 días/.test(alHtml) &&
        /0 años, 0 meses, 0 días/.test(alHtml) &&
        /<strong>78<\/strong>/.test(alHtml) &&
        /<strong>71<\/strong>/.test(alHtml) &&
        /seis meses exactos no suman/i.test(alHtml),
    );
    assert("SEO antigüedad laboral FAQPage", /"@type": "FAQPage"/.test(alHtml));
    assert(
      "SEO antigüedad laboral no canibaliza hermanas vetadas",
      /href="\/indemnizacion-anos-servicio"/.test(alHtml) &&
        /href="\/indemnizacion-aviso-previo"/.test(alHtml) &&
        /href="\/finiquito"/.test(alHtml) &&
        /href="\/vacaciones-proporcionales"/.test(alHtml) &&
        /href="\/feriado-anual"/.test(alHtml) &&
        /href="\/feriado-progresivo"/.test(alHtml) &&
        /href="\/obra-faena"/.test(alHtml) &&
        /href="\/contrato-plazo-fijo"/.test(alHtml) &&
        /href="\/termino-anticipado-plazo-fijo"/.test(alHtml) &&
        /href="\/despido-injustificado"/.test(alHtml) &&
        /href="\/autodespido"/.test(alHtml) &&
        /href="\/nulidad-despido"/.test(alHtml) &&
        /href="\/tutela-laboral"/.test(alHtml) &&
        /href="\/prescripcion-laboral"/.test(alHtml) &&
        /href="\/interes-mora"/.test(alHtml) &&
        /href="\/promedio-remuneraciones"/.test(alHtml) &&
        /href="\/sueldo"/.test(alHtml) &&
        /href="\/empresa"/.test(alHtml) &&
        /estimaci[oó]n educativa/i.test(alHtml) &&
        /no constituye asesor[ií]a legal/i.test(alHtml) &&
        !existsSync(join(root, "antiguedad.html")) &&
        !existsSync(join(root, "anos-servicio.html")) &&
        !existsSync(join(root, "anos-de-servicio.html")) &&
        !existsSync(join(root, "calcular-antiguedad.html")) &&
        !existsSync(join(root, "tiempo-servicios.html")) &&
        !existsSync(join(root, "aniversario-laboral.html")) &&
        !existsSync(join(root, "antiguedad-ias.html")) &&
        !existsSync(join(root, "anos-ias.html")),
    );
    assert(
      "home y nav enlazan /antiguedad-laboral",
      /href="\/antiguedad-laboral"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/antiguedad-laboral" data-nav>Antigüedad laboral<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/antiguedad-laboral" data-nav>Antigüedad laboral<\/a>/.test(alHtml) &&
        /href="\/antiguedad-laboral" data-nav>Antigüedad laboral<\/a>/.test(
          readFileSync(join(root, "js/ui.js"), "utf8"),
        ),
    );
    assert(
      "sitemap incluye /antiguedad-laboral",
      locs.includes("https://www.haberes.cl/antiguedad-laboral") &&
        lastmodForPath("/antiguedad-laboral") === "2026-09-22",
    );
    assert(
      "seo-map documenta /antiguedad-laboral y no-canibalizar hermanas",
      /\/antiguedad-laboral/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/indemnizacion-anos-servicio`, `\/indemnizacion-aviso-previo`, `\/finiquito`, `\/vacaciones-proporcionales`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/antiguedad`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /antiguedad-laboral en el cluster de finiquito",
      /href="\/antiguedad-laboral"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Finiquito<\/h2>[\s\S]*href="\/antiguedad-laboral"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /antiguedad-laboral (IAS, finiquito, vacaciones, feriado anual)",
      /href="\/antiguedad-laboral"/.test(finiHtmlAl) &&
        /href="\/antiguedad-laboral"/.test(iasHtmlAl) &&
        /href="\/antiguedad-laboral"/.test(vacHtmlAl) &&
        /href="\/antiguedad-laboral"/.test(feriadoHtmlAl) &&
        /href="\/antiguedad-laboral"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/antiguedad-laboral"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /href="\/antiguedad-laboral"/.test(readFileSync(join(root, "empresa.html"), "utf8")),
    );
  }

  {
    const tiHtml = readFileSync(join(root, "tope-imponible.html"), "utf8");
    const tiTitle = (tiHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const tiH1 = (tiHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const tiDesc = (tiHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const cpHtmlTi = readFileSync(join(root, "cotizaciones-previsionales.html"), "utf8");
    const sueldoHtmlTi = readFileSync(join(root, "sueldo.html"), "utf8");
    const costoHtmlTi = readFileSync(join(root, "costo-empresa.html"), "utf8");
    const afcHtmlTi = readFileSync(join(root, "seguro-cesantia.html"), "utf8");
    const iuscHtmlTi = readFileSync(join(root, "impuesto-unico.html"), "utf8");
    const goldTi = calcularTopeImponible({ rentaImponible: TOPE_IMPONIBLE_GOLD.sobreTopeAfp.rentaImponible, uf: TOPE_IMPONIBLE_GOLD.uf });
    assert(
      "SEO tope imponible title único y corto",
      /calcular tope imponible/i.test(tiTitle) &&
        tiTitle.length <= 65 &&
        !/cotizaciones previsionales/i.test(tiTitle) &&
        !/sueldo l[ií]quido/i.test(tiTitle) &&
        !/^Haberes\b/.test(tiTitle),
      tiTitle,
    );
    assert(
      "SEO tope imponible H1 único con UF y pesos del mes",
      tiH1 === "Calcular tope imponible Chile 2026" &&
        /90 UF/.test(tiHtml) &&
        /135,2 UF/.test(tiHtml) &&
        /pesos del mes/.test(tiHtml) &&
        /sobre el tope/.test(tiHtml),
      tiH1,
    );
    assert(
      "SEO tope imponible description propia",
      tiDesc.length >= 110 &&
        tiDesc.length <= 160 &&
        /tope imponible/i.test(tiDesc) &&
        /90 UF/.test(tiDesc) &&
        /135,2 UF/.test(tiDesc),
      `${tiDesc.length}:${tiDesc}`,
    );
    assert(
      "SEO tope imponible cita D.L. 3.500 art. 16, Ley 19.728 art. 6 y Superintendencia de Pensiones",
      /bcn\.cl\/leychile\/navegar\?idNorma=7147/.test(tiHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=189967/.test(tiHtml) &&
        /spensiones\.cl/.test(tiHtml) &&
        /art(?:\.|ículo) 16/.test(tiHtml) &&
        /art(?:\.|ículo) 6/.test(tiHtml) &&
        /mindicador\.cl/.test(tiHtml),
    );
    assert(
      "SEO tope imponible gold UF 39.000 en copy y defaults UI",
      goldTi.ok === true &&
        goldTi.afpSalud.topePesos === 3_510_000 &&
        goldTi.afpSalud.exceso === 490_000 &&
        goldTi.cesantia.topePesos === 5_272_800 &&
        /id="rentaImponible" type="number" min="0" step="1" value="3500000"/.test(tiHtml) &&
        /id="ufMes" type="number" min="20000" max="80000" step="0\.01" placeholder="UF del día"/.test(tiHtml) &&
        /id="btnUfDia"/.test(tiHtml) &&
        /\$3\.510\.000/.test(tiHtml) &&
        /\$5\.272\.800/.test(tiHtml) &&
        /\$490\.000/.test(tiHtml) &&
        /\$2\.490\.000/.test(tiHtml) &&
        /\$727\.200/.test(tiHtml) &&
        /\$10\.000/.test(tiHtml) &&
        /UF \$39\.000/.test(tiHtml) &&
        /id="tablaTopes"/.test(tiHtml) &&
        !/\b(87,8|131,9)\b/.test(tiHtml),
    );
    assert("SEO tope imponible FAQPage", /"@type": "FAQPage"/.test(tiHtml));
    assert(
      "SEO tope imponible no canibaliza hermanas vetadas ni crea alias",
      /href="\/cotizaciones-previsionales"/.test(tiHtml) &&
        /href="\/sueldo"/.test(tiHtml) &&
        /href="\/impuesto-unico"/.test(tiHtml) &&
        /href="\/costo-empresa"/.test(tiHtml) &&
        /href="\/seguro-cesantia"/.test(tiHtml) &&
        /href="\/apv"/.test(tiHtml) &&
        /href="\/trabajo-pesado"/.test(tiHtml) &&
        /href="\/empresa"/.test(tiHtml) &&
        /no constituye asesor[ií]a legal/i.test(tiHtml) &&
        /ni la cifra oficial de la Superintendencia de Pensiones/i.test(tiHtml) &&
        /SUSESO/.test(tiHtml) &&
        /SII/.test(tiHtml) &&
        !/\balert\s*\(/.test(tiHtml) &&
        !/\bconfirm\s*\(/.test(tiHtml) &&
        !/\bprompt\s*\(/.test(tiHtml) &&
        !existsSync(join(root, "tope.html")) &&
        !existsSync(join(root, "topes.html")) &&
        !existsSync(join(root, "tope-afp.html")) &&
        !existsSync(join(root, "tope-salud.html")) &&
        !existsSync(join(root, "tope-uf.html")) &&
        !existsSync(join(root, "tope-previsional.html")) &&
        !existsSync(join(root, "renta-imponible.html")) &&
        !existsSync(join(root, "base-imponible.html")) &&
        !existsSync(join(root, "uf-tope.html")) &&
        !existsSync(join(root, "calcular-tope.html")) &&
        !existsSync(join(root, "cotizaciones.html")) &&
        !existsSync(join(root, "sueldo-imponible.html")),
    );
    assert(
      "home y nav enlazan /tope-imponible",
      /href="\/tope-imponible"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/tope-imponible" data-nav>Tope imponible<\/a>/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/tope-imponible" data-nav>Tope imponible<\/a>/.test(tiHtml) &&
        /href="\/tope-imponible" data-nav>Tope imponible<\/a>/.test(readFileSync(join(root, "js/ui.js"), "utf8")) &&
        /\["\/tope-imponible", "Tope imponible"\]/.test(readFileSync(join(root, "scripts/patch-nav.mjs"), "utf8")),
    );
    assert(
      "sitemap incluye /tope-imponible",
      locs.includes("https://www.haberes.cl/tope-imponible") && lastmodForPath("/tope-imponible") === "2026-09-22",
    );
    assert(
      "seo-map documenta /tope-imponible, no-canibalizar cotizaciones y ya no lo veta",
      /`\/tope-imponible`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/cotizaciones-previsionales`, `\/sueldo`, `\/impuesto-unico`, `\/costo-empresa`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/tope`, `\/topes`, `\/tope-afp`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        !/No crear `\/tope-imponible`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        !/hermanas de cotizaciones: `\/tope-imponible`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /tope-imponible en el cluster de liquidación (HTML y generador)",
      /<h2>Liquidación de sueldo<\/h2>[\s\S]*href="\/tope-imponible">calcular tope imponible<\/a>[\s\S]*<h2>Finiquito<\/h2>/.test(
        readFileSync(join(root, "guias.html"), "utf8"),
      ) &&
        /href="\/tope-imponible">calcular tope imponible<\/a>/.test(readFileSync(join(root, "scripts/gen-content-seo.mjs"), "utf8")),
    );
    assert(
      "hermanas enlazan /tope-imponible (cotizaciones, sueldo, costo empresa, seguro cesantía, impuesto único)",
      /href="\/tope-imponible"/.test(cpHtmlTi) &&
        /href="\/tope-imponible"/.test(sueldoHtmlTi) &&
        /href="\/tope-imponible"/.test(costoHtmlTi) &&
        /href="\/tope-imponible"/.test(afcHtmlTi) &&
        /href="\/tope-imponible"/.test(iuscHtmlTi) &&
        /href="\/tope-imponible"/.test(readFileSync(join(root, "empresa.html"), "utf8")),
    );
    assert(
      "/cotizaciones-previsionales conserva su cuerpo (solo enlace cruzado mínimo a /tope-imponible)",
      (cpHtmlTi.match(/href="\/tope-imponible"/g) || []).length === 2 &&
        /<h1>Calcular cotizaciones previsionales Chile 2026<\/h1>/.test(cpHtmlTi) &&
        /id="tablaAfp"/.test(cpHtmlTi),
      String((cpHtmlTi.match(/href="\/tope-imponible"/g) || []).length),
    );
  }


  {
    const bhHtml = readFileSync(join(root, "bandas-horarias.html"), "utf8");
    const bhTitle = (bhHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const bhH1 = (bhHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const bhDesc = (bhHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const j40HtmlBh = readFileSync(join(root, "jornada-40-horas.html"), "utf8");
    const jpHtmlBh = readFileSync(join(root, "jornada-parcial.html"), "utf8");
    const ttHtmlBh = readFileSync(join(root, "teletrabajo.html"), "utf8");
    const heHtmlBh = readFileSync(join(root, "horas-extras.html"), "utf8");
    const dcHtmlBh = readFileSync(join(root, "descanso-compensatorio.html"), "utf8");
    const goldBh1 = calcularBandasHorarias(BANDAS_HORARIAS_GOLD.anticipar60);
    const goldBh2 = calcularBandasHorarias(BANDAS_HORARIAS_GOLD.retrasar60);
    const goldBh3 = calcularBandasHorarias(BANDAS_HORARIAS_GOLD.anticipar30);
    const goldBh0 = calcularBandasHorarias(BANDAS_HORARIAS_GOLD.cero);
    const goldBhX = calcularBandasHorarias(BANDAS_HORARIAS_GOLD.excede);
    assert(
      "SEO bandas horarias title único y corto",
      /calcular bandas horarias/i.test(bhTitle) &&
        bhTitle.length <= 65 &&
        !/jornada 40 horas/i.test(bhTitle) &&
        !/sueldo l[ií]quido/i.test(bhTitle) &&
        !/teletrabajo/i.test(bhTitle),
      bhTitle,
    );
    assert(
      "SEO bandas horarias H1 único cuidado familiar",
      bhH1 === "Calcular bandas horarias Chile 2026" &&
        /Ley 21\.561/.test(bhHtml) &&
        /12 a[nñ]os/.test(bhHtml) &&
        /bandas horarias/.test(bhHtml),
      bhH1,
    );
    assert(
      "SEO bandas horarias description propia",
      bhDesc.length >= 110 &&
        bhDesc.length <= 160 &&
        /Ley 21\.561/.test(bhDesc) &&
        /bandas horarias/.test(bhDesc) &&
        /12/.test(bhDesc),
      `${bhDesc.length}:${bhDesc}`,
    );
    assert(
      "SEO bandas horarias cita DT, Ley 21.561, CT y Mintrab",
      /dt\.gob\.cl\/portal\/1626\/w3-article-125814/.test(bhHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=1191554/.test(bhHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(bhHtml) &&
        /mintrab\.gob\.cl\/40horas/.test(bhHtml),
    );
    assert(
      "SEO bandas horarias gold 2026 08:00–17:00, 10:00–19:00 y 0 min en copy",
      goldBh1.horaInicioNueva === "08:00" &&
        goldBh1.horaFinNueva === "17:00" &&
        goldBh2.horaInicioNueva === "10:00" &&
        goldBh2.horaFinNueva === "19:00" &&
        goldBh3.horaInicioNueva === "08:00" &&
        goldBh3.horaFinNueva === "17:00" &&
        goldBh0.horaInicioNueva === "09:00" &&
        goldBh0.horaFinNueva === "18:00" &&
        goldBhX.ok === false &&
        goldBhX.motivo === "tope" &&
        /09:00/.test(bhHtml) &&
        /18:00/.test(bhHtml) &&
        /08:00/.test(bhHtml) &&
        /17:00/.test(bhHtml) &&
        /10:00/.test(bhHtml) &&
        /19:00/.test(bhHtml) &&
        /08:30/.test(bhHtml) &&
        /17:30/.test(bhHtml) &&
        /90/.test(bhHtml),
    );
    assert("SEO bandas horarias FAQPage", /"@type": "FAQPage"/.test(bhHtml));
    assert(
      "SEO bandas horarias no canibaliza hermanas vetadas",
      /href="\/jornada-40-horas"/.test(bhHtml) &&
        /href="\/jornada-parcial"/.test(bhHtml) &&
        /href="\/teletrabajo"/.test(bhHtml) &&
        /href="\/horas-extras"/.test(bhHtml) &&
        /href="\/descanso-compensatorio"/.test(bhHtml) &&
        /href="\/recargo-domingo-comercio"/.test(bhHtml) &&
        /href="\/descuento-atrasos"/.test(bhHtml) &&
        /href="\/sueldo"/.test(bhHtml) &&
        /href="\/costo-empresa"/.test(bhHtml) &&
        /href="\/empresa"/.test(bhHtml) &&
        /href="\/permiso-sin-goce"/.test(bhHtml) &&
        /href="\/fuero-maternal"/.test(bhHtml) &&
        /href="\/postnatal-parental"/.test(bhHtml) &&
        /href="\/hora-lactancia"/.test(bhHtml) &&
        /href="\/sala-cuna"/.test(bhHtml) &&
        /art[ií]culo 22 bis/.test(bhHtml) &&
        /4×3/.test(bhHtml) &&
        /estimaci[oó]n educativa/.test(bhHtml) &&
        /no constituye asesor[ií]a legal/i.test(bhHtml) &&
        !existsSync(join(root, "banda-horaria.html")) &&
        !existsSync(join(root, "horario-flexible.html")) &&
        !existsSync(join(root, "ley-21561-bandas.html")) &&
        !existsSync(join(root, "art-27-bandas.html")) &&
        !existsSync(join(root, "flexibilidad-horario.html")),
    );
    assert(
      "home y nav enlazan /bandas-horarias",
      /href="\/bandas-horarias"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/bandas-horarias" data-nav>Bandas horarias<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/bandas-horarias" data-nav>Bandas horarias<\/a>/.test(bhHtml) &&
        /href="\/bandas-horarias" data-nav>Bandas horarias<\/a>/.test(
          readFileSync(join(root, "js/ui.js"), "utf8"),
        ),
    );
    assert(
      "sitemap incluye /bandas-horarias",
      locs.includes("https://www.haberes.cl/bandas-horarias") &&
        lastmodForPath("/bandas-horarias") === "2026-09-18",
    );
    assert(
      "seo-map documenta /bandas-horarias y no-canibalizar hermanas",
      /\/bandas-horarias/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/jornada-40-horas`, `\/jornada-parcial`, `\/teletrabajo`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/banda-horaria`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /bandas-horarias en el cluster de liquidación",
      /href="\/bandas-horarias"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Liquidaci[oó]n de sueldo<\/h2>[\s\S]*href="\/bandas-horarias"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/bandas-horarias"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /bandas-horarias",
      /href="\/bandas-horarias"/.test(j40HtmlBh) &&
        /href="\/bandas-horarias"/.test(jpHtmlBh) &&
        /href="\/bandas-horarias"/.test(ttHtmlBh) &&
        /href="\/bandas-horarias"/.test(heHtmlBh) &&
        /href="\/bandas-horarias"/.test(dcHtmlBh) &&
        /href="\/bandas-horarias"/.test(readFileSync(join(root, "empresa.html"), "utf8")),
    );
  }
  {
    const p43Html = readFileSync(join(root, "pacto-4x3.html"), "utf8");
    const p43Title = (p43Html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const p43H1 = (p43Html.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const p43Desc = (p43Html.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const j40HtmlP43 = readFileSync(join(root, "jornada-40-horas.html"), "utf8");
    const jpHtmlP43 = readFileSync(join(root, "jornada-parcial.html"), "utf8");
    const ttHtmlP43 = readFileSync(join(root, "teletrabajo.html"), "utf8");
    const heHtmlP43 = readFileSync(join(root, "horas-extras.html"), "utf8");
    const dcHtmlP43 = readFileSync(join(root, "descanso-compensatorio.html"), "utf8");
    const bhHtmlP43 = readFileSync(join(root, "bandas-horarias.html"), "utf8");
    const goldP1 = calcularPacto4x3(PACTO_4X3_GOLD.clasico40);
    const goldP2 = calcularPacto4x3(PACTO_4X3_GOLD.treintaSeis);
    const goldP3 = calcularPacto4x3(PACTO_4X3_GOLD.cuarentaDosSinReduccion);
    const goldP4 = calcularPacto4x3(PACTO_4X3_GOLD.topeDiario);
    assert(
      "SEO pacto 4×3 title único y corto",
      /calcular pacto 4×3/i.test(p43Title) &&
        p43Title.length <= 65 &&
        !/sueldo l[ií]quido/i.test(p43Title) &&
        !/teletrabajo/i.test(p43Title) &&
        !/bandas horarias/i.test(p43Title),
      p43Title,
    );
    assert(
      "SEO pacto 4×3 H1 único distribución 4 días",
      p43H1 === "Calcular pacto 4×3 Chile 2026" &&
        /Ley 21\.561/.test(p43Html) &&
        /art[ií]culo 8/.test(p43Html) &&
        /4 d[ií]as de trabajo/.test(p43Html),
      p43H1,
    );
    assert(
      "SEO pacto 4×3 description propia",
      p43Desc.length >= 110 &&
        p43Desc.length <= 160 &&
        /Ley 21\.561/.test(p43Desc) &&
        /pacto 4×3/.test(p43Desc) &&
        /10 h/.test(p43Desc),
      `${p43Desc.length}:${p43Desc}`,
    );
    assert(
      "SEO pacto 4×3 cita DT ORD 81/2 82/3 101, Ley 21.561, CT y Mintrab",
      /dt\.gob\.cl\/legislacion\/1624\/w3-article-125559/.test(p43Html) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-125561/.test(p43Html) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-128951/.test(p43Html) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=1191554/.test(p43Html) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(p43Html) &&
        /mintrab\.gob\.cl\/40horas/.test(p43Html),
    );
    assert(
      "SEO pacto 4×3 gold 2026 10,00 h, 9,00 h, 42 h y tope 10 en copy",
      goldP1.horasDiarias === 10 &&
        goldP1.diasDescanso === 3 &&
        goldP1.elegibilidad === "ahora" &&
        goldP2.horasDiarias === 9 &&
        goldP3.ok === false &&
        goldP3.horasDiarias === 0 &&
        goldP4.ok === false &&
        goldP4.motivo === "tope" &&
        /10,00/.test(p43Html) &&
        /9,00/.test(p43Html) &&
        /13,33/.test(p43Html) &&
        /8,40/.test(p43Html) &&
        /4,5/.test(p43Html) &&
        /42 h/.test(p43Html) &&
        /26-abr-2028|26 de abril de 2028/.test(p43Html),
    );
    assert("SEO pacto 4×3 FAQPage", /"@type": "FAQPage"/.test(p43Html));
    assert(
      "SEO pacto 4×3 no canibaliza hermanas vetadas",
      /href="\/jornada-40-horas"/.test(p43Html) &&
        /href="\/bandas-horarias"/.test(p43Html) &&
        /href="\/jornada-parcial"/.test(p43Html) &&
        /href="\/teletrabajo"/.test(p43Html) &&
        /href="\/horas-extras"/.test(p43Html) &&
        /href="\/descanso-compensatorio"/.test(p43Html) &&
        /href="\/recargo-domingo-comercio"/.test(p43Html) &&
        /href="\/descuento-atrasos"/.test(p43Html) &&
        /href="\/sueldo"/.test(p43Html) &&
        /href="\/costo-empresa"/.test(p43Html) &&
        /href="\/empresa"/.test(p43Html) &&
        /href="\/permiso-sin-goce"/.test(p43Html) &&
        /art[ií]culo 22 bis/.test(p43Html) &&
        /voluntario y escrito/.test(p43Html) &&
        /estimaci[oó]n educativa/.test(p43Html) &&
        /no constituye asesor[ií]a legal/i.test(p43Html) &&
        !existsSync(join(root, "jornada-4x3.html")) &&
        !existsSync(join(root, "4x3.html")) &&
        !existsSync(join(root, "art-28-4x3.html")) &&
        !existsSync(join(root, "distribucion-4-dias.html")) &&
        !existsSync(join(root, "semana-4x3.html")),
    );
    assert(
      "home y nav enlazan /pacto-4x3",
      /href="\/pacto-4x3"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/pacto-4x3" data-nav>Pacto 4×3<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/pacto-4x3" data-nav>Pacto 4×3<\/a>/.test(p43Html) &&
        /href="\/pacto-4x3" data-nav>Pacto 4×3<\/a>/.test(
          readFileSync(join(root, "js/ui.js"), "utf8"),
        ),
    );
    assert(
      "sitemap incluye /pacto-4x3",
      locs.includes("https://www.haberes.cl/pacto-4x3") &&
        lastmodForPath("/pacto-4x3") === "2026-09-19",
    );
    assert(
      "seo-map documenta /pacto-4x3 y no-canibalizar hermanas",
      /\/pacto-4x3/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/jornada-40-horas`, `\/bandas-horarias`, `\/jornada-parcial`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/jornada-4x3`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /pacto-4x3 en el cluster de liquidación",
      /href="\/pacto-4x3"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Liquidaci[oó]n de sueldo<\/h2>[\s\S]*href="\/pacto-4x3"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/pacto-4x3"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /pacto-4x3",
      /href="\/pacto-4x3"/.test(j40HtmlP43) &&
        /href="\/pacto-4x3"/.test(jpHtmlP43) &&
        /href="\/pacto-4x3"/.test(ttHtmlP43) &&
        /href="\/pacto-4x3"/.test(heHtmlP43) &&
        /href="\/pacto-4x3"/.test(dcHtmlP43) &&
        /href="\/pacto-4x3"/.test(bhHtmlP43) &&
        /href="\/pacto-4x3"/.test(readFileSync(join(root, "empresa.html"), "utf8")),
    );
  }
  {
    const jeHtml = readFileSync(join(root, "jornada-excepcional.html"), "utf8");
    const jeTitle = (jeHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const jeH1 = (jeHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const jeDesc = (jeHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const j40HtmlJe = readFileSync(join(root, "jornada-40-horas.html"), "utf8");
    const p43HtmlJe = readFileSync(join(root, "pacto-4x3.html"), "utf8");
    const ttHtmlJe = readFileSync(join(root, "teletrabajo.html"), "utf8");
    const dcHtmlJe = readFileSync(join(root, "descanso-compensatorio.html"), "utf8");
    const goldJ1 = calcularJornadaExcepcional(JORNADA_EXCEPCIONAL_GOLD.sietePorSiete2026);
    const goldJ2 = calcularJornadaExcepcional(JORNADA_EXCEPCIONAL_GOLD.sietePorSiete2028);
    const goldJ3 = calcularJornadaExcepcional(JORNADA_EXCEPCIONAL_GOLD.phsc41_2028);
    const goldJ4 = calcularJornadaExcepcional(JORNADA_EXCEPCIONAL_GOLD.cuatroPorDoce);
    assert(
      "SEO jornada excepcional title único y corto",
      /calcular jornada excepcional/i.test(jeTitle) &&
        jeTitle.length <= 65 &&
        !/sueldo l[ií]quido/i.test(jeTitle) &&
        !/pacto 4×3/i.test(jeTitle) &&
        !/teletrabajo/i.test(jeTitle),
      jeTitle,
    );
    assert(
      "SEO jornada excepcional H1 único PHSC art. 38",
      jeH1 === "Calcular jornada excepcional Chile 2026" &&
        /art[ií]culo 38|art\. 38/.test(jeHtml) &&
        /DS N°48|DS Nº48/.test(jeHtml) &&
        /PHSC/.test(jeHtml),
      jeH1,
    );
    assert(
      "SEO jornada excepcional description propia",
      jeDesc.length >= 110 &&
        jeDesc.length <= 160 &&
        /PHSC/.test(jeDesc) &&
        /art\. 38/.test(jeDesc) &&
        /pacto 4×3/.test(jeDesc),
      `${jeDesc.length}:${jeDesc}`,
    );
    assert(
      "SEO jornada excepcional cita CT, Ley 21.561, DS 48 y DT",
      /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(jeHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=1191554/.test(jeHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=1202792/.test(jeHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-128281/.test(jeHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-propertyvalue-193335/.test(jeHtml),
    );
    assert(
      "SEO jornada excepcional gold 2026 42,00, 41,00, 48,00 y 4,5/9 en copy",
      goldJ1.phsc === 42 &&
        goldJ1.diasAdicionales === 0 &&
        goldJ2.diasAdicionales === 9 &&
        goldJ3.phsc === 41 &&
        goldJ3.diasAdicionales === 4.5 &&
        goldJ4.phsc === 48 &&
        goldJ4.ok === false &&
        /42,00/.test(jeHtml) &&
        /41,00/.test(jeHtml) &&
        /48,00/.test(jeHtml) &&
        /4,5/.test(jeHtml) &&
        /84/.test(jeHtml) &&
        /no aprueba ni simula/.test(jeHtml),
    );
    assert("SEO jornada excepcional FAQPage", /"@type": "FAQPage"/.test(jeHtml));
    assert(
      "SEO jornada excepcional no canibaliza hermanas vetadas",
      /href="\/jornada-40-horas"/.test(jeHtml) &&
        /href="\/pacto-4x3"/.test(jeHtml) &&
        /href="\/bandas-horarias"/.test(jeHtml) &&
        /href="\/jornada-parcial"/.test(jeHtml) &&
        /href="\/teletrabajo"/.test(jeHtml) &&
        /href="\/horas-extras"/.test(jeHtml) &&
        /href="\/descanso-compensatorio"/.test(jeHtml) &&
        /href="\/recargo-domingo-comercio"/.test(jeHtml) &&
        /href="\/feriado-irrenunciable"/.test(jeHtml) &&
        /href="\/descuento-atrasos"/.test(jeHtml) &&
        /href="\/semana-corrida"/.test(jeHtml) &&
        /href="\/sueldo"/.test(jeHtml) &&
        /href="\/costo-empresa"/.test(jeHtml) &&
        /href="\/empresa"/.test(jeHtml) &&
        /href="\/permiso-sin-goce"/.test(jeHtml) &&
        /art[ií]culo 22 bis/.test(jeHtml) &&
        /estimaci[oó]n educativa/.test(jeHtml) &&
        /no constituye asesor[ií]a legal/i.test(jeHtml) &&
        !existsSync(join(root, "sistema-excepcional.html")) &&
        !existsSync(join(root, "art-38.html")) &&
        !existsSync(join(root, "jornada-dt.html")) &&
        !existsSync(join(root, "autorizacion-dt-jornada.html")) &&
        !existsSync(join(root, "4x4.html")) &&
        !existsSync(join(root, "7x7.html")) &&
        !existsSync(join(root, "ciclo-excepcional.html")),
    );
    assert(
      "home y nav enlazan /jornada-excepcional",
      /href="\/jornada-excepcional"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/jornada-excepcional" data-nav>Jornada excepcional<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/jornada-excepcional" data-nav>Jornada excepcional<\/a>/.test(jeHtml) &&
        /href="\/jornada-excepcional" data-nav>Jornada excepcional<\/a>/.test(
          readFileSync(join(root, "js/ui.js"), "utf8"),
        ),
    );
    assert(
      "sitemap incluye /jornada-excepcional",
      locs.includes("https://www.haberes.cl/jornada-excepcional") &&
        lastmodForPath("/jornada-excepcional") === "2026-09-19",
    );
    assert(
      "seo-map documenta /jornada-excepcional y no-canibalizar hermanas",
      /\/jornada-excepcional/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/jornada-40-horas`, `\/pacto-4x3`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/sistema-excepcional`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /jornada-excepcional en el cluster de liquidación",
      /href="\/jornada-excepcional"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Liquidaci[oó]n de sueldo<\/h2>[\s\S]*href="\/jornada-excepcional"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/jornada-excepcional"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /jornada-excepcional",
      /href="\/jornada-excepcional"/.test(j40HtmlJe) &&
        /href="\/jornada-excepcional"/.test(p43HtmlJe) &&
        /href="\/jornada-excepcional"/.test(ttHtmlJe) &&
        /href="\/jornada-excepcional"/.test(dcHtmlJe) &&
        /href="\/jornada-excepcional"/.test(readFileSync(join(root, "empresa.html"), "utf8")),
    );
  }
  {
    const jbHtml = readFileSync(join(root, "jornada-bisemanal.html"), "utf8");
    const jbTitle = (jbHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const jbH1 = (jbHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const jbDesc = (jbHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const jeHtmlJb = readFileSync(join(root, "jornada-excepcional.html"), "utf8");
    const p43HtmlJb = readFileSync(join(root, "pacto-4x3.html"), "utf8");
    const j40HtmlJb = readFileSync(join(root, "jornada-40-horas.html"), "utf8");
    const bhHtmlJb = readFileSync(join(root, "bandas-horarias.html"), "utf8");
    const goldB1 = calcularJornadaBisemanal(JORNADA_BISEMANAL_GOLD.diezPorCuatro2028);
    const goldB2 = calcularJornadaBisemanal(JORNADA_BISEMANAL_GOLD.docePorTres2028);
    const goldB3 = calcularJornadaBisemanal(JORNADA_BISEMANAL_GOLD.descansoDos);
    const goldB4 = calcularJornadaBisemanal(JORNADA_BISEMANAL_GOLD.treceDias);
    assert(
      "SEO jornada bisemanal title único y corto",
      /calcular jornada bisemanal/i.test(jbTitle) &&
        jbTitle.length <= 65 &&
        !/excepcional/i.test(jbTitle) &&
        !/pacto 4×3/i.test(jbTitle) &&
        !/40 horas/i.test(jbTitle),
      jbTitle,
    );
    assert(
      "SEO jornada bisemanal H1 único art. 39",
      jbH1 === "Calcular jornada bisemanal Chile 2026" &&
        /art[ií]culo 39|art\. 39/.test(jbHtml) &&
        /12 d[ií]as continuos/.test(jbHtml) &&
        /3 d[ií]as de descanso consecutivos/.test(jbHtml) &&
        /promedio semanal/i.test(jbHtml),
      jbH1,
    );
    assert(
      "SEO jornada bisemanal description propia",
      jbDesc.length >= 110 &&
        jbDesc.length <= 160 &&
        /bisemanal/.test(jbDesc) &&
        /art\. 39/.test(jbDesc) &&
        /12 d[ií]as/.test(jbDesc) &&
        /3 de descanso/.test(jbDesc),
      `${jbDesc.length}:${jbDesc}`,
    );
    assert(
      "SEO jornada bisemanal cita CT y Ley 21.561",
      /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(jbHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=1191554/.test(jbHtml),
    );
    assert(
      "SEO jornada bisemanal gold 40,00 / 39,20 / 42,00 / 46,67 / 35,00 en copy",
      goldB1.promedioSemanal === 40 &&
        goldB2.promedioSemanal === 39.2 &&
        goldB3.promedioSemanalRedondeado === 46.67 &&
        goldB4.promedioSemanal === 35 &&
        /40,00/.test(jbHtml) &&
        /39,20/.test(jbHtml) &&
        /42,00/.test(jbHtml) &&
        /46,67/.test(jbHtml) &&
        /35,00/.test(jbHtml) &&
        /(80 × 7\) \/ 14|80 × 7\) ?\/ ?14)/.test(jbHtml),
    );
    assert("SEO jornada bisemanal FAQPage", /"@type": "FAQPage"/.test(jbHtml));
    assert(
      "SEO jornada bisemanal distingue art. 39 vs art. 38 y no canibaliza hermanas vetadas",
      /art\. 38/.test(jbHtml) &&
        /DS N°48/.test(jbHtml) &&
        /no es el sistema excepcional|no es el\s+<a href="\/jornada-excepcional">sistema excepcional/i.test(jbHtml) &&
        /href="\/jornada-excepcional"/.test(jbHtml) &&
        /href="\/pacto-4x3"/.test(jbHtml) &&
        /href="\/bandas-horarias"/.test(jbHtml) &&
        /href="\/jornada-40-horas"/.test(jbHtml) &&
        /href="\/jornada-parcial"/.test(jbHtml) &&
        /href="\/horas-extras"/.test(jbHtml) &&
        /href="\/compensacion-horas-extras"/.test(jbHtml) &&
        /href="\/descanso-compensatorio"/.test(jbHtml) &&
        /href="\/recargo-domingo-comercio"/.test(jbHtml) &&
        /href="\/feriado-irrenunciable"/.test(jbHtml) &&
        /href="\/obra-faena"/.test(jbHtml) &&
        /href="\/trabajo-pesado"/.test(jbHtml) &&
        /href="\/teletrabajo"/.test(jbHtml) &&
        /href="\/sueldo"/.test(jbHtml) &&
        /href="\/costo-empresa"/.test(jbHtml) &&
        /href="\/empresa"/.test(jbHtml) &&
        /estimaci[oó]n educativa/i.test(jbHtml) &&
        /no constituye asesor[ií]a legal/i.test(jbHtml) &&
        !existsSync(join(root, "bisemanal.html")) &&
        !existsSync(join(root, "jornada-bi-semanal.html")) &&
        !existsSync(join(root, "art-39.html")) &&
        !existsSync(join(root, "ciclo-bisemanal.html")) &&
        !existsSync(join(root, "turno-bisemanal.html")) &&
        !existsSync(join(root, "12x3.html")) &&
        !existsSync(join(root, "10x4-bisemanal.html")),
    );
    assert(
      "home y nav enlazan /jornada-bisemanal",
      /href="\/jornada-bisemanal"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/jornada-bisemanal" data-nav>Jornada bisemanal<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/jornada-bisemanal" data-nav>Jornada bisemanal<\/a>/.test(jbHtml) &&
        /href="\/jornada-bisemanal" data-nav>Jornada bisemanal<\/a>/.test(
          readFileSync(join(root, "js/ui.js"), "utf8"),
        ) &&
        /\["\/jornada-bisemanal", "Jornada bisemanal"\]/.test(readFileSync(join(root, "scripts/patch-nav.mjs"), "utf8")),
    );
    assert(
      "sitemap incluye /jornada-bisemanal",
      locs.includes("https://www.haberes.cl/jornada-bisemanal") &&
        lastmodForPath("/jornada-bisemanal") === "2026-09-23",
    );
    assert(
      "seo-map documenta /jornada-bisemanal y no-canibalizar hermanas",
      /`\/jornada-bisemanal`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/jornada-excepcional`, `\/pacto-4x3`, `\/bandas-horarias`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/bisemanal`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /jornada-bisemanal en el cluster de liquidación (HTML y generador)",
      /<h2>Liquidaci[oó]n de sueldo<\/h2>[\s\S]*href="\/jornada-bisemanal">calcular jornada bisemanal<\/a>[\s\S]*<h2>Finiquito<\/h2>/.test(
        readFileSync(join(root, "guias.html"), "utf8"),
      ) &&
        /href="\/jornada-bisemanal">calcular jornada bisemanal<\/a>/.test(
          readFileSync(join(root, "scripts/gen-content-seo.mjs"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /jornada-bisemanal (excepcional, 4×3, 40 h, bandas, empresa)",
      /href="\/jornada-bisemanal"/.test(jeHtmlJb) &&
        /href="\/jornada-bisemanal"/.test(p43HtmlJb) &&
        /href="\/jornada-bisemanal"/.test(j40HtmlJb) &&
        /href="\/jornada-bisemanal"/.test(bhHtmlJb) &&
        /href="\/jornada-bisemanal"/.test(readFileSync(join(root, "empresa.html"), "utf8")),
    );
    assert(
      "hermanas conservan su cuerpo (solo enlace cruzado mínimo a /jornada-bisemanal)",
      (jeHtmlJb.match(/href="\/jornada-bisemanal"/g) || []).length <= 3 &&
        (p43HtmlJb.match(/href="\/jornada-bisemanal"/g) || []).length <= 2 &&
        (j40HtmlJb.match(/href="\/jornada-bisemanal"/g) || []).length <= 2 &&
        (bhHtmlJb.match(/href="\/jornada-bisemanal"/g) || []).length <= 2,
    );
  }
  {
    const cheHtml = readFileSync(join(root, "compensacion-horas-extras.html"), "utf8");
    const cheTitle = (cheHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const cheH1 = (cheHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const cheDesc = (cheHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const heHtmlChe = readFileSync(join(root, "horas-extras.html"), "utf8");
    const faHtmlChe = readFileSync(join(root, "feriado-anual.html"), "utf8");
    const vpHtmlChe = readFileSync(join(root, "vacaciones-proporcionales.html"), "utf8");
    const fpHtmlChe = readFileSync(join(root, "feriado-progresivo.html"), "utf8");
    const dcHtmlChe = readFileSync(join(root, "descanso-compensatorio.html"), "utf8");
    const goldC1 = calcularCompensacionHorasExtras(COMPENSACION_HE_GOLD.clasico16);
    const goldC2 = calcularCompensacionHorasExtras(COMPENSACION_HE_GOLD.topeAnual);
    const goldC3 = calcularCompensacionHorasExtras(COMPENSACION_HE_GOLD.fraccion);
    assert(
      "SEO compensación horas extras title único y corto",
      /calcular compensaci[oó]n horas extras/i.test(cheTitle) &&
        cheTitle.length <= 65 &&
        !/sueldo l[ií]quido/i.test(cheTitle) &&
        !/pacto 4×3/i.test(cheTitle) &&
        cheTitle !== ((heHtmlChe.match(/<title>([^<]*)<\/title>/) || [])[1] || ""),
      cheTitle,
    );
    assert(
      "SEO compensación horas extras H1 único art. 32",
      cheH1 === "Calcular compensación horas extras Chile 2026" &&
        /art\. 32/.test(cheHtml) &&
        /Ley 21\.561/.test(cheHtml) &&
        /1,5/.test(cheHtml),
      cheH1,
    );
    assert(
      "SEO compensación horas extras description propia",
      cheDesc.length >= 110 &&
        cheDesc.length <= 160 &&
        /art\. 32/.test(cheDesc) &&
        /Ley 21\.561/.test(cheDesc) &&
        /1,5/.test(cheDesc) &&
        /5 d[ií]as/.test(cheDesc) &&
        /pago en dinero/.test(cheDesc),
      `${cheDesc.length}:${cheDesc}`,
    );
    assert(
      "SEO compensación horas extras cita CT, Ley 21.561 y DT",
      /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(cheHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=1191554/.test(cheHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-125559/.test(cheHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-125738/.test(cheHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-127480/.test(cheHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-127877/.test(cheHtml),
    );
    assert(
      "SEO compensación horas extras gold 16 HE → 3,00, 6,00 y 1,50 en copy",
      goldC1.diasEquivalentes === 3 &&
        goldC1.horasFeriado === 24 &&
        goldC2.diasFueraTope === 1 &&
        goldC3.diasEquivalentes === 1.5 &&
        /3,00/.test(cheHtml) &&
        /6,00/.test(cheHtml) &&
        /1,50/.test(cheHtml) &&
        /24 h/.test(cheHtml) &&
        /pacto escrito/.test(cheHtml),
    );
    assert("SEO compensación horas extras FAQPage", /"@type": "FAQPage"/.test(cheHtml));
    assert(
      "SEO compensación horas extras no canibaliza hermanas vetadas",
      /href="\/horas-extras"/.test(cheHtml) &&
        /href="\/feriado-anual"/.test(cheHtml) &&
        /href="\/feriado-progresivo"/.test(cheHtml) &&
        /href="\/vacaciones-proporcionales"/.test(cheHtml) &&
        /href="\/jornada-40-horas"/.test(cheHtml) &&
        /href="\/pacto-4x3"/.test(cheHtml) &&
        /href="\/bandas-horarias"/.test(cheHtml) &&
        /href="\/jornada-excepcional"/.test(cheHtml) &&
        /href="\/jornada-parcial"/.test(cheHtml) &&
        /href="\/descanso-compensatorio"/.test(cheHtml) &&
        /href="\/recargo-domingo-comercio"/.test(cheHtml) &&
        /href="\/feriado-irrenunciable"/.test(cheHtml) &&
        /href="\/sueldo"/.test(cheHtml) &&
        /href="\/costo-empresa"/.test(cheHtml) &&
        /href="\/empresa"/.test(cheHtml) &&
        /href="\/permiso-sin-goce"/.test(cheHtml) &&
        /estimaci[oó]n educativa/.test(cheHtml) &&
        /no constituye asesor[ií]a legal/i.test(cheHtml) &&
        !existsSync(join(root, "compensacion-he.html")) &&
        !existsSync(join(root, "he-feriado.html")) &&
        !existsSync(join(root, "compensacion-feriado.html")) &&
        !existsSync(join(root, "art-32-feriado.html")) &&
        !existsSync(join(root, "dias-adicionales-he.html")) &&
        !existsSync(join(root, "compensacion-horas-extraordinarias.html")),
    );
    assert(
      "home y nav enlazan /compensacion-horas-extras",
      /href="\/compensacion-horas-extras"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/compensacion-horas-extras" data-nav>Compensaci[oó]n horas extras<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/compensacion-horas-extras" data-nav>Compensaci[oó]n horas extras<\/a>/.test(cheHtml) &&
        /href="\/compensacion-horas-extras" data-nav>Compensaci[oó]n horas extras<\/a>/.test(
          readFileSync(join(root, "js/ui.js"), "utf8"),
        ),
    );
    assert(
      "sitemap incluye /compensacion-horas-extras",
      locs.includes("https://www.haberes.cl/compensacion-horas-extras") &&
        lastmodForPath("/compensacion-horas-extras") === "2026-09-20",
    );
    assert(
      "seo-map documenta /compensacion-horas-extras y no-canibalizar hermanas",
      /\/compensacion-horas-extras/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/horas-extras`, `\/feriado-anual`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/compensacion-he`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /compensacion-horas-extras en el cluster de liquidación",
      /href="\/compensacion-horas-extras"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Liquidaci[oó]n de sueldo<\/h2>[\s\S]*href="\/compensacion-horas-extras"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/compensacion-horas-extras"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /compensacion-horas-extras",
      /href="\/compensacion-horas-extras"/.test(heHtmlChe) &&
        /href="\/compensacion-horas-extras"/.test(faHtmlChe) &&
        /href="\/compensacion-horas-extras"/.test(vpHtmlChe) &&
        /href="\/compensacion-horas-extras"/.test(fpHtmlChe) &&
        /href="\/compensacion-horas-extras"/.test(dcHtmlChe) &&
        /href="\/compensacion-horas-extras"/.test(readFileSync(join(root, "empresa.html"), "utf8")),
    );
  }
  {
    const pheHtml = readFileSync(join(root, "pacto-horas-extras.html"), "utf8");
    const pheTitle = (pheHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const pheH1 = (pheHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const pheDesc = (pheHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const heHtmlPhe = readFileSync(join(root, "horas-extras.html"), "utf8");
    const cheHtmlPhe = readFileSync(join(root, "compensacion-horas-extras.html"), "utf8");
    const goldCon = calcularPactoHorasExtras({
      remuneracion: PACTO_HE_GOLD.conPacto.remuneracion,
      jornadaSemanal: PACTO_HE_GOLD.conPacto.jornadaSemanal,
      horasExtras: PACTO_HE_GOLD.conPacto.horasExtras,
      hayPacto: true,
    });
    const goldSin = calcularPactoHorasExtras({
      remuneracion: PACTO_HE_GOLD.sinPacto.remuneracion,
      jornadaSemanal: PACTO_HE_GOLD.sinPacto.jornadaSemanal,
      horasExtras: PACTO_HE_GOLD.sinPacto.horasExtras,
      hayPacto: false,
    });
    const goldTope = calcularPactoHorasExtras({
      remuneracion: PACTO_HE_GOLD.topeDiario.remuneracion,
      jornadaSemanal: PACTO_HE_GOLD.topeDiario.jornadaSemanal,
      horasExtras: PACTO_HE_GOLD.topeDiario.horasExtras,
      hayPacto: true,
      horasDiaMasLargo: 3,
    });
    assert(
      "SEO pacto horas extras title único y corto",
      /calcular pacto de horas extras/i.test(pheTitle) &&
        pheTitle.length <= 65 &&
        !/sueldo l[ií]quido/i.test(pheTitle) &&
        pheTitle !== ((heHtmlPhe.match(/<title>([^<]*)<\/title>/) || [])[1] || "") &&
        pheTitle !== ((cheHtmlPhe.match(/<title>([^<]*)<\/title>/) || [])[1] || ""),
      pheTitle,
    );
    assert(
      "SEO pacto horas extras H1 único arts. 31 y 32",
      pheH1 === "Calcular pacto de horas extras Chile 2026" &&
        /art\. 31/.test(pheHtml) &&
        /art\. 32/.test(pheHtml) &&
        /pacto escrito/i.test(pheHtml),
      pheH1,
    );
    assert(
      "SEO pacto horas extras description propia",
      pheDesc.length >= 110 &&
        pheDesc.length <= 160 &&
        /pacto de horas extras/i.test(pheDesc) &&
        /arts\. 31 y 32/.test(pheDesc) &&
        /50 %/.test(pheDesc) &&
        /2 h/.test(pheDesc),
      `${pheDesc.length}:${pheDesc}`,
    );
    assert(
      "SEO pacto horas extras cita CT y DT",
      /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(pheHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-95182/.test(pheHtml) &&
        /"@type": "FAQPage"/.test(pheHtml) &&
        /"@type": "WebApplication"/.test(pheHtml) &&
        /"@type": "Organization"/.test(pheHtml),
    );
    assert(
      "SEO pacto horas extras gold 4667 / 7000 / 70000 y alertas en copy",
      Math.round(goldCon.valorHoraOrdinaria) === 4_667 &&
        Math.round(goldCon.valorHoraExtra) === 7_000 &&
        Math.round(goldCon.total) === 70_000 &&
        goldCon.faltaPactoEscrito === false &&
        goldSin.faltaPactoEscrito === true &&
        Math.round(goldSin.total) === 70_000 &&
        goldTope.excedeTopeDiario === true &&
        /\$4\.667/.test(pheHtml) &&
        /\$7\.000/.test(pheHtml) &&
        /\$70\.000/.test(pheHtml) &&
        /sin pacto/i.test(pheHtml) &&
        /2 h\/día/.test(pheHtml) &&
        /id="outAlertaPacto"/.test(pheHtml) &&
        /id="outAlertaTope"/.test(pheHtml),
    );
    assert(
      "SEO pacto horas extras no canibaliza hermanas vetadas",
      /href="\/horas-extras"/.test(pheHtml) &&
        /href="\/compensacion-horas-extras"/.test(pheHtml) &&
        /href="\/recargo-domingo-comercio"/.test(pheHtml) &&
        /href="\/descanso-compensatorio"/.test(pheHtml) &&
        /href="\/jornada-40-horas"/.test(pheHtml) &&
        /href="\/jornada-parcial"/.test(pheHtml) &&
        /href="\/jornada-excepcional"/.test(pheHtml) &&
        /href="\/jornada-bisemanal"/.test(pheHtml) &&
        /href="\/pacto-4x3"/.test(pheHtml) &&
        /href="\/bandas-horarias"/.test(pheHtml) &&
        /href="\/teletrabajo"/.test(pheHtml) &&
        /href="\/sueldo"/.test(pheHtml) &&
        /href="\/costo-empresa"/.test(pheHtml) &&
        /href="\/empresa"/.test(pheHtml) &&
        /href="\/descuento-atrasos"/.test(pheHtml) &&
        /href="\/permiso-sin-goce"/.test(pheHtml) &&
        /estimaci[oó]n educativa/.test(pheHtml) &&
        /no constituye asesor[ií]a legal/i.test(pheHtml) &&
        !existsSync(join(root, "pacto-he.html")) &&
        !existsSync(join(root, "acuerdo-horas-extras.html")) &&
        !existsSync(join(root, "horas-extraordinarias-pacto.html")) &&
        !existsSync(join(root, "art-31.html")) &&
        !existsSync(join(root, "limite-horas-extras.html")) &&
        !existsSync(join(root, "maximo-horas-extras.html")),
    );
    assert(
      "home y nav enlazan /pacto-horas-extras",
      /href="\/pacto-horas-extras"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/pacto-horas-extras" data-nav>Pacto horas extras<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/pacto-horas-extras" data-nav>Pacto horas extras<\/a>/.test(pheHtml) &&
        /href="\/pacto-horas-extras" data-nav>Pacto horas extras<\/a>/.test(
          readFileSync(join(root, "js/ui.js"), "utf8"),
        ),
    );
    assert(
      "sitemap incluye /pacto-horas-extras",
      locs.includes("https://www.haberes.cl/pacto-horas-extras") &&
        lastmodForPath("/pacto-horas-extras") === "2026-09-23",
    );
    assert(
      "seo-map documenta /pacto-horas-extras y no-canibalizar hermanas",
      /\/pacto-horas-extras/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/horas-extras`, `\/compensacion-horas-extras`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/pacto-he`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /pacto-horas-extras en el cluster de liquidación",
      /href="\/pacto-horas-extras"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Liquidaci[oó]n de sueldo<\/h2>[\s\S]*href="\/pacto-horas-extras"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/pacto-horas-extras"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /pacto-horas-extras",
      /href="\/pacto-horas-extras"/.test(heHtmlPhe) &&
        /href="\/pacto-horas-extras"/.test(cheHtmlPhe) &&
        /href="\/pacto-horas-extras"/.test(readFileSync(join(root, "empresa.html"), "utf8")),
    );
  }
  {
    const spHtml = readFileSync(join(root, "sueldo-proporcional.html"), "utf8");
    const spTitle = (spHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const spH1 = (spHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const spDesc = (spHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
    const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const vpHtml = readFileSync(join(root, "vacaciones-proporcionales.html"), "utf8");
    const vpTitle = (vpHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const vpH1 = (vpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const finiHtml = readFileSync(join(root, "finiquito.html"), "utf8");
    const finiTitle = (finiHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const finiH1 = (finiHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const demo15 = calcularSueldoProporcional({ remuneracion: 600_000, dias: 15 });
    const demoEne = calcularSueldoProporcional({ remuneracion: 600_000, ingreso: "2026-01-25" });
    const demoFeb = calcularSueldoProporcional({ remuneracion: 600_000, ingreso: "2026-02-16" });
    assert(
      "SEO title sueldo proporcional apunta a calcular sueldo proporcional",
      /calcular sueldo proporcional/i.test(spTitle) &&
        !/sueldo l[ií]quido/i.test(spTitle) &&
        !/vacaciones proporcionales/i.test(spTitle) &&
        !/calculadora de finiquito/i.test(spTitle) &&
        spTitle !== sueldoTitle &&
        spTitle !== vpTitle &&
        spTitle !== finiTitle &&
        spTitle.length <= 65,
      spTitle,
    );
    assert(
      "SEO H1 sueldo proporcional distinto de /sueldo, /vacaciones-proporcionales y /finiquito",
      spH1 === "Calcular sueldo proporcional Chile 2026" &&
        spH1 !== sueldoH1 &&
        spH1 !== vpH1 &&
        spH1 !== finiH1 &&
        !/sueldo l[ií]quido/i.test(spH1) &&
        !/vacaciones proporcionales/i.test(spH1),
      spH1,
    );
    assert(
      "SEO sueldo proporcional meta distinta de /sueldo y /vacaciones-proporcionales",
      spDesc &&
        spDesc !== ((sueldoHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        spDesc !== ((vpHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO sueldo proporcional cita DT /30 y ORD. 5715 / 3754",
      /ORD\.\s*N°5715/.test(spHtml) &&
        /ORD\.\s*N°3754/.test(spHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-108020/.test(spHtml) &&
        /remuneraci[oó]n(?: mensual)? \/ 30/.test(spHtml),
    );
    assert(
      "SEO sueldo proporcional gold 15×600000, 31 no extra, blogs 28/31",
      demo15.bruto === 300_000 &&
        demoEne.dias === 7 &&
        demoEne.bruto === 140_000 &&
        demoFeb.dias === 13 &&
        demoFeb.bruto === 260_000 &&
        /\$300\.000/.test(spHtml) &&
        /\$600\.000/.test(spHtml) &&
        /\$140\.000/.test(spHtml) &&
        /\$260\.000/.test(spHtml) &&
        /15\s*×\s*600\.000\s*\/\s*30/.test(spHtml) &&
        /no 31\/30/.test(spHtml) &&
        /blogs dividen/.test(spHtml),
    );
    assert("SEO sueldo proporcional FAQPage", /"@type": "FAQPage"/.test(spHtml));
    assert(
      "SEO sueldo proporcional no es líquido, feriado ni finiquito",
      /href="\/sueldo"/.test(spHtml) &&
        /href="\/vacaciones-proporcionales"/.test(spHtml) &&
        /href="\/finiquito"/.test(spHtml) &&
        /no es el/.test(spHtml.toLowerCase()) &&
        !existsSync(join(root, "dias-trabajados.html")) &&
        !existsSync(join(root, "sueldo-proporcional-dias.html")) &&
        !existsSync(join(root, "guias/sueldo-proporcional.html")),
    );
    assert(
      "SEO sueldo proporcional métrica principal es el bruto del mes incompleto",
      /Sueldo proporcional \(bruto\)/.test(spHtml) &&
        !/<p class="metric-label">Feriado proporcional<\/p>/.test(spHtml) &&
        !/<p class="metric-label">L[ií]quido/.test(spHtml),
    );
    assert(
      "home y nav enlazan /sueldo-proporcional",
      /href="\/sueldo-proporcional"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/sueldo-proporcional" data-nav>Sueldo proporcional<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/sueldo-proporcional" data-nav>Sueldo proporcional<\/a>/.test(spHtml),
    );
    assert(
      "sitemap incluye /sueldo-proporcional",
      locs.includes("https://www.haberes.cl/sueldo-proporcional") &&
        lastmodForPath("/sueldo-proporcional") === "2026-08-29",
    );
    assert(
      "seo-map documenta /sueldo-proporcional y no-canibalizar /sueldo",
      /\/sueldo-proporcional/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/sueldo`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no crear `\/dias-trabajados`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /sueldo-proporcional en el cluster de liquidación",
      /href="\/sueldo-proporcional"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/sueldo-proporcional"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
  }
  {
    const daHtml = readFileSync(join(root, "descuento-atrasos.html"), "utf8");
    const daTitle = (daHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const daH1 = (daHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const daDesc = (daHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
    const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const spHtml = readFileSync(join(root, "sueldo-proporcional.html"), "utf8");
    const spTitle = (spHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const spH1 = (spHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const heHtml = readFileSync(join(root, "horas-extras.html"), "utf8");
    const heTitle = (heHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const heH1 = (heHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const g1 = calcularDescuentoAtrasosInasistencias({
      remuneracion: 800_000,
      jornada: 42,
      diasInasistencia: 1,
      horasAtraso: 1,
    });
    const g2 = calcularDescuentoAtrasosInasistencias({ remuneracion: 600_000, jornada: 42, minutosAtraso: 30 });
    const g3 = calcularDescuentoAtrasosInasistencias({
      remuneracion: 900_000,
      jornada: 40,
      horasAtraso: 2,
      minutosAtraso: 15,
    });
    assert(
      "SEO title descuento atrasos apunta a calcular descuento",
      /calcular descuento/i.test(daTitle) &&
        !/sueldo l[ií]quido/i.test(daTitle) &&
        !/sueldo proporcional/i.test(daTitle) &&
        !/horas extras/i.test(daTitle) &&
        daTitle !== sueldoTitle &&
        daTitle !== spTitle &&
        daTitle !== heTitle &&
        daTitle.length <= 65,
      daTitle,
    );
    assert(
      "SEO H1 descuento atrasos distinto de /sueldo, /sueldo-proporcional y /horas-extras",
      daH1 === "Calcular descuento por atrasos e inasistencias Chile 2026" &&
        daH1 !== sueldoH1 &&
        daH1 !== spH1 &&
        daH1 !== heH1 &&
        !/sueldo l[ií]quido/i.test(daH1) &&
        !/horas extras/i.test(daH1),
      daH1,
    );
    assert(
      "SEO descuento atrasos meta distinta de /sueldo y /sueldo-proporcional",
      daDesc &&
        daDesc !== ((sueldoHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        daDesc !== ((spHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO descuento atrasos cita ORD. 5816, Dictamen 5308/230, ausencias DT y ORD. 1445",
      /ORD\.\s*N°5816/.test(daHtml) &&
        /Dictamen N°5308\/230/.test(daHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60221/.test(daHtml) &&
        /ORD\.\s*N°1445/.test(daHtml) &&
        /remuneraci[oó]n(?: mensual)? \/ 30/.test(daHtml),
    );
    assert(
      "SEO descuento atrasos gold 800k/600k/900k",
      g1.descuentoTotal === 31_111 &&
        g1.brutoRestante === 768_889 &&
        g2.descuentoTotal === 1_667 &&
        g2.brutoRestante === 598_333 &&
        g3.descuentoTotal === 11_813 &&
        g3.brutoRestante === 888_187 &&
        /\$31\.111/.test(daHtml) &&
        /\$768\.889/.test(daHtml) &&
        /\$1\.667/.test(daHtml) &&
        /\$11\.813/.test(daHtml),
    );
    assert("SEO descuento atrasos FAQPage", /"@type": "FAQPage"/.test(daHtml));
    assert(
      "SEO descuento atrasos no es líquido, proporcional ni horas extras",
      /href="\/sueldo"/.test(daHtml) &&
        /href="\/sueldo-proporcional"/.test(daHtml) &&
        /href="\/horas-extras"/.test(daHtml) &&
        /href="\/cotizaciones-previsionales"/.test(daHtml) &&
        /no es el/.test(daHtml.toLowerCase()) &&
        !existsSync(join(root, "descuento-inasistencias.html")) &&
        !existsSync(join(root, "atrasos.html")) &&
        !existsSync(join(root, "ausencias.html")),
    );
    assert(
      "SEO descuento atrasos no califica licencia; SIL vive en /licencia-medica",
      /licencia m[eé]dica/i.test(daHtml) &&
        /no califica el caso/i.test(daHtml) &&
        /href="\/licencia-medica"/.test(daHtml),
    );
    assert(
      "SEO descuento atrasos métrica principal es total descuento bruto",
      /Total descuento bruto/.test(daHtml) &&
        !/<p class="metric-label">Sueldo proporcional/.test(daHtml) &&
        !/<p class="metric-label">L[ií]quido/.test(daHtml),
    );
    assert(
      "home y nav enlazan /descuento-atrasos",
      /href="\/descuento-atrasos"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/descuento-atrasos" data-nav>Descuento atrasos<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/descuento-atrasos" data-nav>Descuento atrasos<\/a>/.test(daHtml),
    );
    assert(
      "sitemap incluye /descuento-atrasos",
      locs.includes("https://www.haberes.cl/descuento-atrasos") &&
        lastmodForPath("/descuento-atrasos") === "2026-09-03",
    );
    assert(
      "seo-map documenta /descuento-atrasos y no-canibalizar /sueldo-proporcional",
      /\/descuento-atrasos/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar.*`\/sueldo-proporcional`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no crear `\/descuento-inasistencias`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /descuento-atrasos en el cluster de liquidación",
      /href="\/descuento-atrasos"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/descuento-atrasos"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
  }
  {
    const lmHtml = readFileSync(join(root, "licencia-medica.html"), "utf8");
    const lmTitle = (lmHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const lmH1 = (lmHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const lmDesc = (lmHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
    const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const spHtml = readFileSync(join(root, "sueldo-proporcional.html"), "utf8");
    const spTitle = (spHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const spH1 = (spHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const daHtml = readFileSync(join(root, "descuento-atrasos.html"), "utf8");
    const daTitle = (daHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const daH1 = (daHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const g1 = calcularLicenciaMedica({ remuneracion: 900_000, diasLicencia: 10 });
    const g2 = calcularLicenciaMedica({
      remuneracion: 600_000,
      diasLicencia: 0,
      neta1: 650_000,
      neta2: 650_000,
      neta3: 650_000,
    });
    const g3 = calcularLicenciaMedica({
      remuneracion: 800_000,
      diasLicencia: 30,
      neta1: 700_000,
      neta2: 700_000,
      neta3: 700_000,
    });
    assert(
      "SEO title licencia médica apunta a calcular sueldo con licencia médica",
      /calcular sueldo con licencia m[eé]dica/i.test(lmTitle) &&
        !/sueldo l[ií]quido/i.test(lmTitle) &&
        !/sueldo proporcional/i.test(lmTitle) &&
        !/descuento atrasos/i.test(lmTitle) &&
        lmTitle !== sueldoTitle &&
        lmTitle !== spTitle &&
        lmTitle !== daTitle &&
        lmTitle.length <= 65,
      lmTitle,
    );
    assert(
      "SEO H1 licencia médica distinto de /sueldo, /sueldo-proporcional y /descuento-atrasos",
      lmH1 === "Calcular sueldo con licencia médica Chile 2026" &&
        lmH1 !== sueldoH1 &&
        lmH1 !== spH1 &&
        lmH1 !== daH1 &&
        !/sueldo l[ií]quido/i.test(lmH1) &&
        !/sueldo proporcional/i.test(lmH1),
      lmH1,
    );
    assert(
      "SEO licencia médica meta distinta de /sueldo y /sueldo-proporcional",
      lmDesc &&
        lmDesc !== ((sueldoHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        lmDesc !== ((spHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO licencia médica cita D.F.L. 44 arts. 8 y 10, ORD. 1445 y ORD. 4260",
      /D\.F\.L\.\s*N°44 art\. 8/.test(lmHtml) &&
        /D\.F\.L\.\s*N°44 art\. 10/.test(lmHtml) &&
        /ORD\.\s*N°1445/.test(lmHtml) &&
        /ORD\.\s*N°4260/.test(lmHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=4252/.test(lmHtml) &&
        /suseso\.gob\.cl\/612\/w3-propertyvalue-222048/.test(lmHtml) &&
        /suseso\.gob\.cl\/612\/w3-propertyvalue-222050/.test(lmHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-125257/.test(lmHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-107078/.test(lmHtml) &&
        /remuneraci[oó]n(?: mensual)? \/ 30/.test(lmHtml),
    );
    assert(
      "SEO licencia médica gold 900k/10, 600k/0 y 800k/30 con SIL 700k",
      g1.valorDiario === 30_000 &&
        g1.diasTrabajados === 20 &&
        g1.brutoEmpleador === 600_000 &&
        g2.brutoEmpleador === 600_000 &&
        g2.silTramo === 0 &&
        g3.brutoEmpleador === 0 &&
        g3.baseSil === 700_000 &&
        close(g3.diarioSil, 700_000 / 30) &&
        g3.silTramo === 700_000 &&
        /\$600\.000/.test(lmHtml) &&
        /\$30\.000/.test(lmHtml) &&
        /\$23\.333,33/.test(lmHtml) &&
        /\$700\.000/.test(lmHtml),
    );
    assert("SEO licencia médica FAQPage", /"@type": "FAQPage"/.test(lmHtml));
    assert(
      "SEO licencia médica no es líquido, proporcional ni atrasos",
      /href="\/sueldo"/.test(lmHtml) &&
        /href="\/sueldo-proporcional"/.test(lmHtml) &&
        /href="\/descuento-atrasos"/.test(lmHtml) &&
        /href="\/cotizaciones-previsionales"/.test(lmHtml) &&
        /no es el/.test(lmHtml.toLowerCase()) &&
        !existsSync(join(root, "sil.html")) &&
        !existsSync(join(root, "subsidio-incapacidad.html")) &&
        !existsSync(join(root, "licencia.html")),
    );
    assert(
      "SEO licencia médica métrica principal es bruto a cargo del empleador",
      /Bruto a cargo del empleador/.test(lmHtml) &&
        !/<p class="metric-label">Sueldo proporcional/.test(lmHtml) &&
        !/<p class="metric-label">L[ií]quido/.test(lmHtml) &&
        !/<p class="metric-label">Total descuento bruto/.test(lmHtml),
    );
    assert(
      "home y nav enlazan /licencia-medica",
      /href="\/licencia-medica"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/licencia-medica" data-nav>Licencia m[eé]dica<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/licencia-medica" data-nav>Licencia m[eé]dica<\/a>/.test(lmHtml),
    );
    assert(
      "sitemap incluye /licencia-medica",
      locs.includes("https://www.haberes.cl/licencia-medica") &&
        lastmodForPath("/licencia-medica") === "2026-09-04",
    );
    assert(
      "seo-map documenta /licencia-medica y no-canibalizar /sueldo-proporcional",
      /\/licencia-medica/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/sueldo`, `\/sueldo-proporcional` ni `\/descuento-atrasos`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/sil`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /licencia-medica en el cluster de liquidación",
      /href="\/licencia-medica"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/licencia-medica"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
  }
  {
    const bhHtml = readFileSync(join(root, "boleta-honorarios.html"), "utf8");
    const bhTitle = (bhHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const bhH1 = (bhHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const bhDesc = (bhHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
    const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const iuHtml = readFileSync(join(root, "impuesto-unico.html"), "utf8");
    const iuTitle = (iuHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const iuH1 = (iuHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const cpHtml = readFileSync(join(root, "cotizaciones-previsionales.html"), "utf8");
    const cpTitle = (cpHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const cpH1 = (cpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const gold = calcularBoletaHonorarios({ modo: "bruto", monto: 1_000_000, anio: 2026 });
    const fromLiq = calcularBoletaHonorarios({ modo: "liquido", monto: 847_500, anio: 2026 });
    const siiEj = calcularBoletaHonorarios({ modo: "bruto", monto: 100_000, anio: 2026 });
    assert(
      "SEO title boleta honorarios apunta a calcular boleta de honorarios",
      /calcular boleta de honorarios/i.test(bhTitle) &&
        !/sueldo l[ií]quido/i.test(bhTitle) &&
        !/impuesto [uú]nico/i.test(bhTitle) &&
        bhTitle !== sueldoTitle &&
        bhTitle !== iuTitle &&
        bhTitle !== cpTitle &&
        bhTitle.length <= 65,
      bhTitle,
    );
    assert(
      "SEO H1 boleta honorarios distinto de /sueldo y /impuesto-unico",
      bhH1 === "Calcular retención boleta de honorarios Chile 2026" &&
        bhH1 !== sueldoH1 &&
        bhH1 !== iuH1 &&
        bhH1 !== cpH1 &&
        !/sueldo l[ií]quido/i.test(bhH1) &&
        !/impuesto [uú]nico/i.test(bhH1),
      bhH1,
    );
    assert(
      "SEO boleta honorarios meta distinta de /sueldo y /impuesto-unico",
      bhDesc &&
        bhDesc !== ((sueldoHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        bhDesc !== ((iuHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO boleta honorarios cita Ley 21.133, SII y tasas 2025–2028",
      /Ley 21\.133/.test(bhHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=1128420/.test(bhHtml) &&
        /sii\.cl\/preguntas_frecuentes\/declaracion_renta\/001_140_7297/.test(bhHtml) &&
        /sii\.cl\/noticias\/2025\/261225noti01smn/.test(bhHtml) &&
        /14,5\s*%/.test(bhHtml) &&
        /15,25\s*%/.test(bhHtml) &&
        /16\s*%/.test(bhHtml) &&
        /17\s*%/.test(bhHtml),
    );
    assert(
      "SEO boleta honorarios gold 2026 1.000.000 → 152.500 / 847.500",
      gold.retencion === 152_500 &&
        gold.liquido === 847_500 &&
        fromLiq.bruto === 1_000_000 &&
        siiEj.retencion === 15_250 &&
        /\$1\.000\.000/.test(bhHtml) &&
        /\$152\.500/.test(bhHtml) &&
        /\$847\.500/.test(bhHtml),
    );
    assert("SEO boleta honorarios FAQPage", /"@type": "FAQPage"/.test(bhHtml));
    assert(
      "SEO boleta honorarios no es sueldo, IUSC ni cotizaciones de dependiente",
      /href="\/sueldo"/.test(bhHtml) &&
        /href="\/impuesto-unico"/.test(bhHtml) &&
        /href="\/cotizaciones-previsionales"/.test(bhHtml) &&
        /href="\/costo-empresa"/.test(bhHtml) &&
        /independiente/.test(bhHtml.toLowerCase()) &&
        /no reparte/.test(bhHtml.toLowerCase()) &&
        !/Operación Renta advice/i.test(bhHtml) &&
        !existsSync(join(root, "retencion-honorarios.html")) &&
        !existsSync(join(root, "boleta.html")) &&
        !existsSync(join(root, "honorarios.html")),
    );
    assert(
      "SEO boleta honorarios métrica principal es líquido de la boleta",
      /L[ií]quido de la boleta/.test(bhHtml) &&
        !/<p class="metric-label">Sueldo l[ií]quido/.test(bhHtml) &&
        !/<p class="metric-label">Impuesto del mes/.test(bhHtml),
    );
    assert(
      "home y nav enlazan /boleta-honorarios",
      /href="\/boleta-honorarios"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/boleta-honorarios" data-nav>Boleta honorarios<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/boleta-honorarios" data-nav>Boleta honorarios<\/a>/.test(bhHtml),
    );
    assert(
      "sitemap incluye /boleta-honorarios",
      locs.includes("https://www.haberes.cl/boleta-honorarios") &&
        lastmodForPath("/boleta-honorarios") === "2026-09-05",
    );
    assert(
      "seo-map documenta /boleta-honorarios y no-canibalizar /sueldo e /impuesto-unico",
      /\/boleta-honorarios/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/sueldo`, `\/impuesto-unico`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/retencion-honorarios`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /boleta-honorarios en el cluster de liquidación",
      /href="\/boleta-honorarios"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/boleta-honorarios"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
  }
  {
    const rjHtml = readFileSync(join(root, "retencion-judicial.html"), "utf8");
    const rjTitle = (rjHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const rjH1 = (rjHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const rjDesc = (rjHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
    const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const daHtml = readFileSync(join(root, "descuento-atrasos.html"), "utf8");
    const daTitle = (daHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const daH1 = (daHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const g1 = calcularRetencionJudicial({
      base: 900_000,
      modo: "fijo",
      montoFijo: 250_000,
    });
    const g2 = calcularRetencionJudicial({
      base: 1_000_000,
      modo: "porcentaje",
      porcentaje: 30,
    });
    assert(
      "SEO title retención judicial apunta a calcular retención judicial",
      /calcular retenci[oó]n judicial/i.test(rjTitle) &&
        !/sueldo l[ií]quido/i.test(rjTitle) &&
        !/descuento atrasos/i.test(rjTitle) &&
        rjTitle !== sueldoTitle &&
        rjTitle !== daTitle &&
        rjTitle.length <= 65,
      rjTitle,
    );
    assert(
      "SEO H1 retención judicial distinto de /sueldo y /descuento-atrasos",
      rjH1 === "Calcular retención judicial de pensión de alimentos Chile 2026" &&
        rjH1 !== sueldoH1 &&
        rjH1 !== daH1 &&
        !/sueldo l[ií]quido/i.test(rjH1) &&
        !/descuento por atrasos/i.test(rjH1),
      rjH1,
    );
    assert(
      "SEO retención judicial meta distinta de /sueldo y /descuento-atrasos",
      rjDesc &&
        rjDesc !== ((sueldoHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        rjDesc !== ((daHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO retención judicial cita Ley 14.908 art. 8, Ley 21.389 y art. 58 CT",
      /Ley 14\.908 art\. 8/.test(rjHtml) &&
        /Ley 21\.389/.test(rjHtml) &&
        /art[ií]culo 58 del C[oó]digo del Trabajo/.test(rjHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=28483/.test(rjHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=1168463/.test(rjHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(rjHtml),
    );
    assert(
      "SEO retención judicial gold 900k/250k y 1M/30%",
      g1.retencionAlimentos === 250_000 &&
        g1.remanente === 650_000 &&
        g2.retencionAlimentos === 300_000 &&
        g2.remanente === 700_000 &&
        /\$250\.000/.test(rjHtml) &&
        /\$650\.000/.test(rjHtml) &&
        /\$300\.000/.test(rjHtml) &&
        /\$700\.000/.test(rjHtml) &&
        /\$900\.000/.test(rjHtml),
    );
    assert("SEO retención judicial FAQPage", /"@type": "FAQPage"/.test(rjHtml));
    assert(
      "SEO retención judicial no canibaliza /sueldo ni /descuento-atrasos",
      /href="\/sueldo"/.test(rjHtml) &&
        /href="\/descuento-atrasos"/.test(rjHtml) &&
        /no es el sueldo l[ií]quido/i.test(rjHtml) &&
        /descuento por atrasos e inasistencias/.test(rjHtml) &&
        !existsSync(join(root, "pension-alimenticia.html")) &&
        !existsSync(join(root, "alimentos.html")) &&
        !existsSync(join(root, "descuento-judicial.html")) &&
        !existsSync(join(root, "retencion-alimentos.html")),
    );
    assert(
      "SEO retención judicial métrica principal es monto a retener alimentos",
      /Monto a retener \(alimentos\)/.test(rjHtml) &&
        !/<p class="metric-label">L[ií]quido/.test(rjHtml) &&
        !/<p class="metric-label">Total descuento bruto/.test(rjHtml),
    );
    assert(
      "SEO retención judicial no es portal judicial ni AFP/bancos",
      /Poder Judicial/.test(rjHtml) &&
        /Ley 21\.484/.test(rjHtml) &&
        /no es el portal/i.test(rjHtml),
    );
    assert(
      "home y nav enlazan /retencion-judicial",
      /href="\/retencion-judicial"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/retencion-judicial" data-nav>Retenci[oó]n judicial<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/retencion-judicial" data-nav>Retenci[oó]n judicial<\/a>/.test(rjHtml),
    );
    assert(
      "sitemap incluye /retencion-judicial",
      locs.includes("https://www.haberes.cl/retencion-judicial") &&
        lastmodForPath("/retencion-judicial") === "2026-09-05",
    );
    assert(
      "seo-map documenta /retencion-judicial y no-canibalizar /sueldo y /descuento-atrasos",
      /\/retencion-judicial/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/sueldo` ni `\/descuento-atrasos`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/pension-alimenticia`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /retencion-judicial en el cluster de liquidación",
      /href="\/retencion-judicial"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/retencion-judicial"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "/sueldo y /descuento-atrasos enlazan /retencion-judicial",
      /href="\/retencion-judicial"/.test(sueldoHtml) && /href="\/retencion-judicial"/.test(daHtml),
    );
  }
  {
    const apvHtml = readFileSync(join(root, "apv.html"), "utf8");
    const apvTitle = (apvHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const apvH1 = (apvHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const apvDesc = (apvHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
    const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const iuHtml = readFileSync(join(root, "impuesto-unico.html"), "utf8");
    const iuTitle = (iuHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const iuH1 = (iuHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const cpHtml = readFileSync(join(root, "cotizaciones-previsionales.html"), "utf8");
    const cpTitle = (cpHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const cpH1 = (cpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const gold = calcularApv(
      {
        sueldoBase: 2_000_000,
        apvRegimenB: 100_000,
        afp: "modelo",
        salud: "fonasa",
        contrato: "indefinido",
      },
      { uf: FALLBACK_UF },
    );
    assert(
      "SEO title APV apunta a calcular APV Régimen B",
      /calcular APV R[eé]gimen B/i.test(apvTitle) &&
        !/sueldo l[ií]quido/i.test(apvTitle) &&
        !/impuesto [uú]nico/i.test(apvTitle) &&
        !/cotizaciones previsionales/i.test(apvTitle) &&
        apvTitle !== sueldoTitle &&
        apvTitle !== iuTitle &&
        apvTitle !== cpTitle &&
        apvTitle.length <= 65,
      apvTitle,
    );
    assert(
      "SEO H1 APV distinto de /sueldo, /impuesto-unico y /cotizaciones-previsionales",
      apvH1 === "Calcular APV Régimen B en la liquidación Chile 2026" &&
        apvH1 !== sueldoH1 &&
        apvH1 !== iuH1 &&
        apvH1 !== cpH1 &&
        !/sueldo l[ií]quido/i.test(apvH1) &&
        !/cotizaciones previsionales/i.test(apvH1),
      apvH1,
    );
    assert(
      "SEO APV meta distinta de hermanas",
      apvDesc &&
        apvDesc !== ((sueldoHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        apvDesc !== ((iuHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        apvDesc !== ((cpHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO APV cita art. 42 bis LIR, D.L. 3.500 y Régimen A 15 % / 6 UTM",
      /art\. 42 bis LIR/.test(apvHtml) &&
        /D\.L\. N° 3\.500/.test(apvHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=6368/.test(apvHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=7147/.test(apvHtml) &&
        /15 %/.test(apvHtml) &&
        /6 UTM/.test(apvHtml) &&
        /Operación Renta/.test(apvHtml),
    );
    assert(
      "SEO APV gold 2.000.000 / 100.000 y caso IMM sin IUSC",
      gold.ahorroIusc === 4_000 &&
        gold.iuscSinApv === 26_766 &&
        gold.iuscConApv === 22_766 &&
        gold.liquidoConApv === 1_513_634 &&
        /\$2\.000\.000/.test(apvHtml) &&
        /\$100\.000/.test(apvHtml) &&
        /\$4\.000/.test(apvHtml) &&
        /\$1\.513\.634/.test(apvHtml) &&
        /\$26\.766/.test(apvHtml) &&
        /\$22\.766/.test(apvHtml) &&
        /\$553\.553/.test(apvHtml) &&
        /\$50\.000/.test(apvHtml),
    );
    assert("SEO APV FAQPage", /"@type": "FAQPage"/.test(apvHtml));
    assert(
      "SEO APV no canibaliza /sueldo, /impuesto-unico ni /cotizaciones-previsionales",
      /href="\/sueldo"/.test(apvHtml) &&
        /href="\/impuesto-unico"/.test(apvHtml) &&
        /href="\/cotizaciones-previsionales"/.test(apvHtml) &&
        /href="\/costo-empresa"/.test(apvHtml) &&
        /no es portal de AFP/i.test(apvHtml) &&
        !existsSync(join(root, "ahorro-previsional.html")) &&
        !existsSync(join(root, "regimen-b.html")),
    );
    assert(
      "SEO APV métrica principal es ahorro de IUSC del mes",
      /Ahorro de IUSC del mes/.test(apvHtml) &&
        !/<p class="metric-label">L[ií]quido<\/p>/.test(apvHtml) &&
        !/<p class="metric-label">Descuentos previsionales/.test(apvHtml),
    );
    assert(
      "home y nav enlazan /apv",
      /href="\/apv"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/apv" data-nav>APV R[eé]gimen B<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/apv" data-nav>APV R[eé]gimen B<\/a>/.test(apvHtml),
    );
    assert(
      "sitemap incluye /apv",
      locs.includes("https://www.haberes.cl/apv") && lastmodForPath("/apv") === "2026-09-06",
    );
    assert(
      "seo-map documenta /apv y no-canibalizar hermanas",
      /\/apv/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/sueldo`, `\/impuesto-unico` ni `\/cotizaciones-previsionales`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/ahorro-previsional`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /apv en el cluster de liquidación",
      /href="\/apv"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/apv"/.test(readFileSync(join(root, "guias.html"), "utf8")),
    );
    assert(
      "hermanas enlazan /apv",
      /href="\/apv"/.test(sueldoHtml) &&
        /href="\/apv"/.test(iuHtml) &&
        /href="\/apv"/.test(cpHtml) &&
        /href="\/apv"/.test(readFileSync(join(root, "costo-empresa.html"), "utf8")),
    );
  }
  {
    const scHtml = readFileSync(join(root, "sala-cuna.html"), "utf8");
    const scTitle = (scHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const scH1 = (scHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const scDesc = (scHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const afHtml = readFileSync(join(root, "asignacion-familiar.html"), "utf8");
    const ceHtmlSala = readFileSync(join(root, "costo-empresa.html"), "utf8");
    const cmHtmlSala = readFileSync(join(root, "colacion-movilizacion.html"), "utf8");
    const agHtmlSala = readFileSync(join(root, "aguinaldo.html"), "utf8");
    const gold = calcularSalaCuna({
      trabajadoras: 22,
      ninos: 2,
      costoUnitario: 350_000,
    });
    const bajo = calcularSalaCuna({
      trabajadoras: 19,
      ninos: 2,
      costoUnitario: 350_000,
    });
    assert(
      "SEO sala cuna title único y corto",
      /calcular sala cuna/i.test(scTitle) &&
        !/asignaci[oó]n familiar/i.test(scTitle) &&
        !/costo empresa/i.test(scTitle) &&
        !/colaci[oó]n/i.test(scTitle) &&
        !/aguinaldo/i.test(scTitle) &&
        scTitle !== ((afHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "") &&
        scTitle !== ((ceHtmlSala.match(/<title>([^<]*)<\/title>/) || [])[1] || "") &&
        scTitle.length <= 65,
      scTitle,
    );
    assert(
      "SEO sala cuna H1 único art. 203",
      scH1 === "Calcular sala cuna art. 203 Chile 2026" &&
        scH1 !== ((afHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "") &&
        !/asignaci[oó]n familiar/i.test(scH1),
      scH1,
    );
    assert(
      "SEO sala cuna description propia",
      scDesc &&
        scDesc !== ((afHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        scDesc !== ((ceHtmlSala.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
      scDesc,
    );
    assert(
      "SEO sala cuna cita art. 203 y DT",
      /art[ií]culo 203/.test(scHtml) &&
        /20 o m[aá]s trabajadoras/.test(scHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(scHtml) &&
        /dt\.gob\.cl\/portal\/1626\/w3-article-59956/.test(scHtml) &&
        /bono compensatorio/.test(scHtml) &&
        /no<\/strong> es la regla general/.test(scHtml),
    );
    assert(
      "SEO sala cuna gold 22/2/350000 y 19 no obliga",
      gold.obligada === true &&
        gold.costoMensual === 700_000 &&
        bajo.obligada === false &&
        bajo.costoMensual === 700_000 &&
        /22 trabajadoras/.test(scHtml) &&
        /\$350\.000/.test(scHtml) &&
        /\$700\.000/.test(scHtml) &&
        /19 trabajadoras/.test(scHtml),
    );
    assert("SEO sala cuna FAQPage", /"@type": "FAQPage"/.test(scHtml));
    assert(
      "SEO sala cuna no canibaliza hermanas vetadas",
      /href="\/asignacion-familiar"/.test(scHtml) &&
        /href="\/costo-empresa"/.test(scHtml) &&
        /href="\/colacion-movilizacion"/.test(scHtml) &&
        /href="\/aguinaldo"/.test(scHtml) &&
        /no constituye asesor[ií]a legal/i.test(scHtml) &&
        !existsSync(join(root, "bono-sala-cuna.html")) &&
        !existsSync(join(root, "jardín-infantil.html")) &&
        !existsSync(join(root, "jardin-infantil.html")),
    );
    assert(
      "SEO sala cuna métrica principal es obligación art. 203",
      /¿Obligada a sala cuna\?/.test(scHtml) &&
        /Costo mensual estimado/.test(scHtml) &&
        !/<p class="metric-label">L[ií]quido<\/p>/.test(scHtml),
    );
    assert(
      "home y nav enlazan /sala-cuna",
      /href="\/sala-cuna"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/sala-cuna" data-nav>Sala cuna<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/sala-cuna" data-nav>Sala cuna<\/a>/.test(scHtml),
    );
    assert(
      "sitemap incluye /sala-cuna",
      locs.includes("https://www.haberes.cl/sala-cuna") &&
        lastmodForPath("/sala-cuna") === "2026-09-06",
    );
    assert(
      "seo-map documenta /sala-cuna y no-canibalizar hermanas",
      /\/sala-cuna/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/asignacion-familiar`, `\/costo-empresa`, `\/colacion-movilizacion` ni `\/aguinaldo`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/bono-sala-cuna`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /sala-cuna en el cluster de liquidación",
      /href="\/sala-cuna"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/sala-cuna"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /sala-cuna",
      /href="\/sala-cuna"/.test(afHtml) &&
        /href="\/sala-cuna"/.test(ceHtmlSala) &&
        /href="\/sala-cuna"/.test(cmHtmlSala) &&
        /href="\/sala-cuna"/.test(agHtmlSala),
    );
  }
  {
    const pppHtml = readFileSync(join(root, "postnatal-parental.html"), "utf8");
    const pppTitle = (pppHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const pppH1 = (pppHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const pppDesc = (pppHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const lmHtmlPpp = readFileSync(join(root, "licencia-medica.html"), "utf8");
    const scHtmlPpp = readFileSync(join(root, "sala-cuna.html"), "utf8");
    const spHtmlPpp = readFileSync(join(root, "sueldo-proporcional.html"), "utf8");
    const afHtmlPpp = readFileSync(join(root, "asignacion-familiar.html"), "utf8");
    const goldPpp = calcularPostnatalParental({
      baseSil: 900_000,
      estipendiosFijos: 900_000,
    });
    const sinFijosPpp = calcularPostnatalParental({
      baseSil: 900_000,
      estipendiosFijos: 0,
    });
    assert(
      "SEO postnatal parental title único y corto",
      /calcular postnatal parental/i.test(pppTitle) &&
        !/licencia m[eé]dica/i.test(pppTitle) &&
        !/sala cuna/i.test(pppTitle) &&
        !/sueldo l[ií]quido/i.test(pppTitle) &&
        pppTitle !== ((lmHtmlPpp.match(/<title>([^<]*)<\/title>/) || [])[1] || "") &&
        pppTitle !== ((scHtmlPpp.match(/<title>([^<]*)<\/title>/) || [])[1] || "") &&
        pppTitle.length <= 65,
      pppTitle,
    );
    assert(
      "SEO postnatal parental H1 único art. 197 bis",
      pppH1 === "Calcular postnatal parental art. 197 bis Chile 2026" &&
        pppH1 !== ((lmHtmlPpp.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "") &&
        !/licencia m[eé]dica/i.test(pppH1),
      pppH1,
    );
    assert(
      "SEO postnatal parental description propia",
      pppDesc &&
        pppDesc !== ((lmHtmlPpp.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        pppDesc !== ((scHtmlPpp.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
      pppDesc,
    );
    assert(
      "SEO postnatal parental cita art. 197 bis, Ley 20.545 y DFL 44 art. 8",
      /art[ií]culo 197 bis/.test(pppHtml) &&
        /Ley 20\.545/.test(pppHtml) &&
        /D\.F\.L\.\s*N°44 art\. 8/.test(pppHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(pppHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=1030936/.test(pppHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=4252/.test(pppHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-99747/.test(pppHtml) &&
        /suseso\.gob\.cl\/612\/w3-propertyvalue-222048/.test(pppHtml) &&
        /d[ií]as del permiso × \(estipendios fijos \/ 2\) \/ 30/.test(pppHtml),
    );
    assert(
      "SEO postnatal parental gold 900000 completa 2520000 y parcial 1890000+1890000",
      goldPpp.subsidioCompleta === 2_520_000 &&
        goldPpp.empleadorCompleta === 0 &&
        goldPpp.subsidioParcial === 1_890_000 &&
        goldPpp.empleadorParcial === 1_890_000 &&
        goldPpp.ingresoParcial === 3_780_000 &&
        sinFijosPpp.ingresoParcial === 1_890_000 &&
        /\$900\.000/.test(pppHtml) &&
        /\$30\.000/.test(pppHtml) &&
        /\$2\.520\.000/.test(pppHtml) &&
        /\$1\.890\.000/.test(pppHtml) &&
        /\$3\.780\.000/.test(pppHtml),
    );
    assert("SEO postnatal parental FAQPage", /"@type": "FAQPage"/.test(pppHtml));
    assert(
      "SEO postnatal parental no canibaliza hermanas vetadas",
      /href="\/licencia-medica"/.test(pppHtml) &&
        /href="\/sala-cuna"/.test(pppHtml) &&
        /href="\/sueldo"/.test(pppHtml) &&
        /href="\/sueldo-proporcional"/.test(pppHtml) &&
        /href="\/asignacion-familiar"/.test(pppHtml) &&
        /no constituye asesor[ií]a legal/i.test(pppHtml) &&
        /entidad pagadora/i.test(pppHtml) &&
        !existsSync(join(root, "postnatal.html")) &&
        !existsSync(join(root, "permiso-parental.html")) &&
        !existsSync(join(root, "subsidio-maternal.html")),
    );
    assert(
      "SEO postnatal parental métrica principal es comparación A vs B",
      /Diferencia \(parcial − completa\)/.test(pppHtml) &&
        /Ingreso madre completa/.test(pppHtml) &&
        /Ingreso madre parcial/.test(pppHtml) &&
        !/<p class="metric-label">L[ií]quido<\/p>/.test(pppHtml) &&
        !/<p class="metric-label">Bruto a cargo del empleador<\/p>/.test(pppHtml),
    );
    assert(
      "home y nav enlazan /postnatal-parental",
      /href="\/postnatal-parental"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/postnatal-parental" data-nav>Postnatal parental<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/postnatal-parental" data-nav>Postnatal parental<\/a>/.test(pppHtml),
    );
    assert(
      "sitemap incluye /postnatal-parental",
      locs.includes("https://www.haberes.cl/postnatal-parental") &&
        lastmodForPath("/postnatal-parental") === "2026-09-07",
    );
    assert(
      "seo-map documenta /postnatal-parental y no-canibalizar hermanas",
      /\/postnatal-parental/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/licencia-medica`, `\/sala-cuna`, `\/sueldo`, `\/sueldo-proporcional` ni `\/asignacion-familiar`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/postnatal`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /postnatal-parental en el cluster de liquidación",
      /href="\/postnatal-parental"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/postnatal-parental"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /postnatal-parental",
      /href="\/postnatal-parental"/.test(lmHtmlPpp) &&
        /href="\/postnatal-parental"/.test(scHtmlPpp) &&
        /href="\/postnatal-parental"/.test(spHtmlPpp) &&
        /href="\/postnatal-parental"/.test(afHtmlPpp),
    );
  }
  {
    const ppnHtml = readFileSync(join(root, "permiso-prenatal.html"), "utf8");
    const ppnTitle = (ppnHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const ppnH1 = (ppnHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const ppnDesc = (ppnHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const pppHtmlPpn = readFileSync(join(root, "postnatal-parental.html"), "utf8");
    const lmHtmlPpn = readFileSync(join(root, "licencia-medica.html"), "utf8");
    const ppHtmlPpn = readFileSync(join(root, "permiso-paternidad.html"), "utf8");
    const hlHtmlPpn = readFileSync(join(root, "hora-lactancia.html"), "utf8");
    const scHtmlPpn = readFileSync(join(root, "sala-cuna.html"), "utf8");
    const goldPpn = calcularPermisoPrenatal({
      fechaParto: "2026-03-01",
      baseSil: 900_000,
    });
    assert(
      "SEO permiso prenatal title único y corto",
      /calcular permiso prenatal/i.test(ppnTitle) &&
        !/postnatal parental/i.test(ppnTitle) &&
        !/licencia m[eé]dica/i.test(ppnTitle) &&
        !/sueldo l[ií]quido/i.test(ppnTitle) &&
        ppnTitle !== ((pppHtmlPpn.match(/<title>([^<]*)<\/title>/) || [])[1] || "") &&
        ppnTitle !== ((lmHtmlPpn.match(/<title>([^<]*)<\/title>/) || [])[1] || "") &&
        ppnTitle.length <= 65,
      ppnTitle,
    );
    assert(
      "SEO permiso prenatal H1 único art. 195",
      ppnH1 === "Calcular permiso prenatal art. 195 Chile 2026" &&
        ppnH1 !== ((pppHtmlPpn.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "") &&
        !/197 bis/i.test(ppnH1),
      ppnH1,
    );
    assert(
      "SEO permiso prenatal description propia",
      ppnDesc &&
        ppnDesc !== ((pppHtmlPpn.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        ppnDesc !== ((lmHtmlPpn.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
      ppnDesc,
    );
    assert(
      "SEO permiso prenatal cita art. 195, DT, SUSESO y DFL 44 art. 8",
      /art[ií]culo 195/.test(ppnHtml) &&
        /42 d[ií]as corridos/.test(ppnHtml) &&
        /D\.F\.L\.\s*N°44 art\. 8/.test(ppnHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(ppnHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=4252/.test(ppnHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60107/.test(ppnHtml) &&
        /suseso\.gob\.cl\/605\/w3-article-782408/.test(ppnHtml) &&
        /suseso\.gob\.cl\/612\/w3-propertyvalue-222048/.test(ppnHtml),
    );
    assert(
      "SEO permiso prenatal gold 900000 → 1260000 y no parental/fuero",
      goldPpn.subsidioPrenatal === 1_260_000 &&
        goldPpn.fechaInicioPrenatal === "2026-01-18" &&
        goldPpn.fechaFinPostnatal === "2026-05-23" &&
        /\$1\.260\.000/.test(ppnHtml) &&
        /18 de enero de 2026/.test(ppnHtml) &&
        /23 de mayo de 2026/.test(ppnHtml) &&
        /href="\/postnatal-parental"/.test(ppnHtml) &&
        /href="\/licencia-medica"/.test(ppnHtml) &&
        /href="\/permiso-paternidad"/.test(ppnHtml) &&
        /href="\/hora-lactancia"/.test(ppnHtml) &&
        /href="\/sala-cuna"/.test(ppnHtml) &&
        /art[ií]culo 201/.test(ppnHtml) &&
        /href="\/fuero-maternal"/.test(ppnHtml) &&
        !/<code>\/postnatal-parental<\/code>/.test(ppnHtml.split("No abre URLs hermanas")[1] || ""),
    );
    assert(
      "SEO permiso prenatal no canibaliza hermanas en copy",
      /no es el/i.test(ppnHtml) &&
        /postnatal parental/.test(ppnHtml) &&
        /fuero/.test(ppnHtml) &&
        /licencia com[uú]n/.test(ppnHtml),
    );
    assert(
      "home y nav enlazan /permiso-prenatal",
      /href="\/permiso-prenatal"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/permiso-prenatal" data-nav>Permiso prenatal<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/permiso-prenatal" data-nav>Permiso prenatal<\/a>/.test(ppnHtml),
    );
    assert(
      "sitemap incluye /permiso-prenatal",
      locs.includes("https://www.haberes.cl/permiso-prenatal") &&
        lastmodForPath("/permiso-prenatal") === "2026-09-11",
    );
    assert(
      "seo-map documenta /permiso-prenatal y no-canibalizar hermanas",
      /\/permiso-prenatal/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/postnatal-parental`, `\/fuero-maternal`, `\/licencia-medica`, `\/sala-cuna`, `\/hora-lactancia`, `\/permiso-paternidad`, `\/sueldo` ni `\/sueldo-proporcional`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/prenatal`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /permiso-prenatal en el cluster de liquidación",
      /href="\/permiso-prenatal"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/permiso-prenatal"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /permiso-prenatal",
      /href="\/permiso-prenatal"/.test(pppHtmlPpn) &&
        /href="\/permiso-prenatal"/.test(lmHtmlPpn) &&
        /href="\/permiso-prenatal"/.test(ppHtmlPpn) &&
        /href="\/permiso-prenatal"/.test(hlHtmlPpn) &&
        /href="\/permiso-prenatal"/.test(scHtmlPpn) &&
        /href="\/permiso-prenatal"/.test(readFileSync(join(root, "fuero-maternal.html"), "utf8")),
    );
    assert("SEO permiso prenatal FAQPage", /"@type": "FAQPage"/.test(ppnHtml));
    assert(
      "SEO permiso prenatal no crea URLs hermanas",
      !existsSync(join(root, "prenatal.html")) &&
        !existsSync(join(root, "pre-natal.html")) &&
        !existsSync(join(root, "art-195-prenatal.html")) &&
        !existsSync(join(root, "descanso-prenatal.html")),
    );
    const vercelPpn = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
    assert(
      "alias /descanso-prenatal redirige a /permiso-prenatal",
      Array.isArray(vercelPpn.redirects) &&
        vercelPpn.redirects.some(
          (r) => r.source === "/descanso-prenatal" && r.destination === "/permiso-prenatal" && r.permanent === true,
        ),
    );
  }
  {
    const ndHtml = readFileSync(join(root, "nulidad-despido.html"), "utf8");
    const ndTitle = (ndHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const ndH1 = (ndHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const ndDesc = (ndHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const finiHtmlNd = readFileSync(join(root, "finiquito.html"), "utf8");
    const cpHtmlNd = readFileSync(join(root, "cotizaciones-previsionales.html"), "utf8");
    const iasHtmlNd = readFileSync(join(root, "indemnizacion-anos-servicio.html"), "utf8");
    const avisoHtmlNd = readFileSync(join(root, "indemnizacion-aviso-previo.html"), "utf8");
    const goldNd = calcularNulidadDespido({
      remuneracion: 900_000,
      fechaDespido: "2026-01-01",
      fechaConvalidacion: "2026-03-31",
    });
    assert(
      "SEO nulidad despido title único y corto",
      /calcular nulidad del despido/i.test(ndTitle) &&
        !/finiquito/i.test(ndTitle) &&
        !/aviso previo/i.test(ndTitle) &&
        !/sueldo l[ií]quido/i.test(ndTitle) &&
        ndTitle !== ((avisoHtmlNd.match(/<title>([^<]*)<\/title>/) || [])[1] || "") &&
        ndTitle !== ((finiHtmlNd.match(/<title>([^<]*)<\/title>/) || [])[1] || "") &&
        ndTitle.length <= 65,
      ndTitle,
    );
    assert(
      "SEO nulidad despido H1 único art. 162",
      ndH1 === "Calcular nulidad del despido art. 162 Chile 2026" &&
        ndH1 !== ((avisoHtmlNd.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "") &&
        !/aviso previo/i.test(ndH1),
      ndH1,
    );
    assert(
      "SEO nulidad despido description propia",
      ndDesc &&
        ndDesc !== ((avisoHtmlNd.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        ndDesc !== ((finiHtmlNd.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        /nulidad/i.test(ndDesc) &&
        /cotizaciones/i.test(ndDesc),
      ndDesc,
    );
    assert(
      "SEO nulidad despido cita art. 162, BCN, SUSESO y DT",
      /art[ií]culo 162/.test(ndHtml) &&
        /Ley 19\.631/.test(ndHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(ndHtml) &&
        /suseso\.gob\.cl\/620\/w3-propertyvalue-69841/.test(ndHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-62185/.test(ndHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-62352/.test(ndHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-94858/.test(ndHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-85030/.test(ndHtml),
    );
    assert(
      "SEO nulidad despido gold 900000 → 2700000 y no finiquito/IAS/aviso",
      goldNd.total === 2_700_000 &&
        goldNd.dias === 90 &&
        /\$2\.700\.000/.test(ndHtml) &&
        /1 de enero de 2026/.test(ndHtml) &&
        /31 de marzo de 2026/.test(ndHtml) &&
        /90 d[ií]as/.test(ndHtml) &&
        /href="\/finiquito"/.test(ndHtml) &&
        /href="\/cotizaciones-previsionales"/.test(ndHtml) &&
        /href="\/indemnizacion-anos-servicio"/.test(ndHtml) &&
        /href="\/indemnizacion-aviso-previo"/.test(ndHtml) &&
        /href="\/sueldo"/.test(ndHtml) &&
        /estimaci[oó]n educativa/.test(ndHtml),
    );
    assert(
      "SEO nulidad despido no canibaliza hermanas en copy",
      /no es el/i.test(ndHtml) &&
        /finiquito/.test(ndHtml) &&
        /aviso/.test(ndHtml) &&
        /Previred/.test(ndHtml) &&
        /art\. 63/.test(ndHtml),
    );
    assert(
      "home y nav enlazan /nulidad-despido",
      /href="\/nulidad-despido"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/nulidad-despido" data-nav>Nulidad del despido<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/nulidad-despido" data-nav>Nulidad del despido<\/a>/.test(ndHtml),
    );
    assert(
      "sitemap incluye /nulidad-despido",
      locs.includes("https://www.haberes.cl/nulidad-despido") &&
        lastmodForPath("/nulidad-despido") === "2026-09-12",
    );
    assert(
      "seo-map documenta /nulidad-despido y no-canibalizar hermanas",
      /\/nulidad-despido/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/finiquito`, `\/cotizaciones-previsionales`, `\/indemnizacion-anos-servicio`, `\/indemnizacion-aviso-previo`, `\/sueldo` ni `\/descuento-atrasos`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/art-162`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    const hubNd = readFileSync(join(root, "guias.html"), "utf8");
    const liqNd = hubNd.slice(
      hubNd.indexOf("<h2>Liquidación de sueldo</h2>"),
      hubNd.indexOf("<h2>Finiquito</h2>"),
    );
    const finNd = hubNd.slice(hubNd.indexOf("<h2>Finiquito</h2>"));
    assert(
      "hub /guias enlaza /nulidad-despido en el cluster de finiquito",
      /href="\/nulidad-despido"/.test(hubNd) &&
        /href="\/nulidad-despido"/.test(finNd) &&
        !/href="\/nulidad-despido"/.test(liqNd),
    );
    assert(
      "hermanas enlazan /nulidad-despido",
      /href="\/nulidad-despido"/.test(finiHtmlNd) &&
        /href="\/nulidad-despido"/.test(cpHtmlNd) &&
        /href="\/nulidad-despido"/.test(iasHtmlNd) &&
        /href="\/nulidad-despido"/.test(avisoHtmlNd) &&
        /href="\/nulidad-despido"/.test(readFileSync(join(root, "sueldo.html"), "utf8")),
    );
    assert("SEO nulidad despido FAQPage", /"@type": "FAQPage"/.test(ndHtml));
    assert(
      "SEO nulidad despido no crea URLs hermanas",
      !existsSync(join(root, "despido-nulo.html")) &&
        !existsSync(join(root, "art-162.html")) &&
        !existsSync(join(root, "convalidacion-despido.html")),
    );
    const vercelNd = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
    assert(
      "alias /despido-nulo y /convalidacion-despido redirigen a /nulidad-despido",
      Array.isArray(vercelNd.redirects) &&
        vercelNd.redirects.some(
          (r) => r.source === "/despido-nulo" && r.destination === "/nulidad-despido" && r.permanent === true,
        ) &&
        vercelNd.redirects.some(
          (r) =>
            r.source === "/convalidacion-despido" &&
            r.destination === "/nulidad-despido" &&
            r.permanent === true,
        ) &&
        !vercelNd.redirects.some((r) => r.source === "/art-162"),
    );
  }
  {
    const ppHtml = readFileSync(join(root, "permiso-paternidad.html"), "utf8");
    const ppTitle = (ppHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const ppH1 = (ppHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const ppDesc = (ppHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const pppHtmlPp = readFileSync(join(root, "postnatal-parental.html"), "utf8");
    const lmHtmlPp = readFileSync(join(root, "licencia-medica.html"), "utf8");
    const scHtmlPp = readFileSync(join(root, "sala-cuna.html"), "utf8");
    const sueldoHtmlPp = readFileSync(join(root, "sueldo.html"), "utf8");
    const faHtmlPp = readFileSync(join(root, "feriado-anual.html"), "utf8");
    const goldPp = calcularPermisoPaternidad({
      fechaParto: "2026-01-05",
      goce: "continuo",
      remuneracion: 900_000,
    });
    const goldFeriadoPp = calcularPermisoPaternidad({
      fechaParto: "2026-04-30",
      goce: "continuo",
      remuneracion: 900_000,
    });
    assert(
      "SEO permiso paternidad title único y corto",
      /calculadora permiso paternidad/i.test(ppTitle) &&
        !/postnatal parental/i.test(ppTitle) &&
        !/licencia m[eé]dica/i.test(ppTitle) &&
        !/sueldo l[ií]quido/i.test(ppTitle) &&
        ppTitle !== ((pppHtmlPp.match(/<title>([^<]*)<\/title>/) || [])[1] || "") &&
        ppTitle.length <= 65,
      ppTitle,
    );
    assert(
      "SEO permiso paternidad H1 único art. 195",
      ppH1 === "Calculadora permiso paternidad Chile 2026" &&
        ppH1 !== ((pppHtmlPp.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "") &&
        !/postnatal parental/i.test(ppH1),
      ppH1,
    );
    assert(
      "SEO permiso paternidad description propia",
      ppDesc &&
        ppDesc !== ((pppHtmlPp.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        ppDesc !== ((lmHtmlPp.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
      ppDesc,
    );
    assert(
      "SEO permiso paternidad cita art. 195, ORD 864/10 y 3827/103",
      /art[ií]culo 195/.test(ppHtml) &&
        /ORD\.\s*N°864\/10/.test(ppHtml) &&
        /ORD\.\s*N°3827\/103/.test(ppHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(ppHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-98859/.test(ppHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-87127/.test(ppHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-87307/.test(ppHtml),
    );
    assert(
      "SEO permiso paternidad gold 5 ene y 1 may en copy",
      goldPp.fechaTermino === "2026-01-09" &&
        goldPp.fechaReintegro === "2026-01-12" &&
        goldPp.goceRemuneracion === 150_000 &&
        goldFeriadoPp.fechaTermino === "2026-05-07" &&
        /\$900\.000/.test(ppHtml) &&
        /\$30\.000/.test(ppHtml) &&
        /\$150\.000/.test(ppHtml) &&
        /lunes 5 de enero de 2026/.test(ppHtml) &&
        /jueves 30 de abril de 2026/.test(ppHtml),
    );
    assert("SEO permiso paternidad FAQPage", /"@type": "FAQPage"/.test(ppHtml));
    assert(
      "SEO permiso paternidad no canibaliza hermanas vetadas",
      /href="\/postnatal-parental"/.test(ppHtml) &&
        /href="\/licencia-medica"/.test(ppHtml) &&
        /href="\/sala-cuna"/.test(ppHtml) &&
        /href="\/sueldo"/.test(ppHtml) &&
        /href="\/feriado-anual"/.test(ppHtml) &&
        /href="\/hora-lactancia"/.test(ppHtml) &&
        /no constituye asesor[ií]a legal/i.test(ppHtml) &&
        /goce de remuneraci[oó]n/.test(ppHtml) &&
        !existsSync(join(root, "paternidad.html")) &&
        !existsSync(join(root, "permiso-padre.html")) &&
        !existsSync(join(root, "nacimiento-hijo.html")) &&
        !existsSync(join(root, "art-195.html")),
    );
    assert(
      "home y nav enlazan /permiso-paternidad",
      /href="\/permiso-paternidad"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/permiso-paternidad" data-nav>Permiso paternidad<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/permiso-paternidad" data-nav>Permiso paternidad<\/a>/.test(ppHtml),
    );
    assert(
      "sitemap incluye /permiso-paternidad",
      locs.includes("https://www.haberes.cl/permiso-paternidad") &&
        lastmodForPath("/permiso-paternidad") === "2026-09-08",
    );
    assert(
      "seo-map documenta /permiso-paternidad y no-canibalizar hermanas",
      /\/permiso-paternidad/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/postnatal-parental`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/paternidad`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /permiso-paternidad en el cluster de liquidación",
      /href="\/permiso-paternidad"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/permiso-paternidad"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /permiso-paternidad",
      /href="\/permiso-paternidad"/.test(pppHtmlPp) &&
        /href="\/permiso-paternidad"/.test(lmHtmlPp) &&
        /href="\/permiso-paternidad"/.test(scHtmlPp) &&
        /href="\/permiso-paternidad"/.test(sueldoHtmlPp) &&
        /href="\/permiso-paternidad"/.test(faHtmlPp),
    );
  }
  {
    const pmHtml = readFileSync(join(root, "permiso-matrimonio.html"), "utf8");
    const pmTitle = (pmHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const pmH1 = (pmHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const pmDesc = (pmHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const ppHtmlPm = readFileSync(join(root, "permiso-paternidad.html"), "utf8");
    const faHtmlPm = readFileSync(join(root, "feriado-anual.html"), "utf8");
    const vpHtmlPm = readFileSync(join(root, "vacaciones-proporcionales.html"), "utf8");
    const sueldoHtmlPm = readFileSync(join(root, "sueldo.html"), "utf8");
    const hlHtmlPm = readFileSync(join(root, "hora-lactancia.html"), "utf8");
    const goldPm = calcularPermisoMatrimonio({
      fechaEvento: "2026-01-05",
      ubicacion: "dia",
      remuneracion: 900_000,
    });
    const goldFeriadoPm = calcularPermisoMatrimonio({
      fechaEvento: "2026-04-30",
      ubicacion: "dia",
      remuneracion: 900_000,
    });
    assert(
      "SEO permiso matrimonio title único y corto",
      /calculadora permiso matrimonio/i.test(pmTitle) &&
        pmTitle.length <= 65 &&
        !/permiso paternidad/i.test(pmTitle) &&
        !/feriado anual/i.test(pmTitle) &&
        !/hora de lactancia/i.test(pmTitle),
      pmTitle,
    );
    assert(
      "SEO permiso matrimonio H1 único art. 207 bis",
      pmH1 === "Calculadora permiso matrimonio Chile 2026" &&
        /207 bis/.test(pmHtml) &&
        /AUC/.test(pmHtml) &&
        !/art\. 195/.test(pmH1) &&
        !/art\. 67/.test(pmH1),
      pmH1,
    );
    assert(
      "SEO permiso matrimonio description propia",
      pmDesc.length >= 110 &&
        pmDesc.length <= 160 &&
        /207 bis/.test(pmDesc) &&
        /AUC/.test(pmDesc) &&
        !/permiso paternidad/i.test(pmDesc),
      `${pmDesc.length}:${pmDesc}`,
    );
    assert(
      "SEO permiso matrimonio cita art. 207 bis, ORD 5845/132 y 343",
      /207 bis/.test(pmHtml) &&
        /5845\/132/.test(pmHtml) &&
        /ORD\. N°343/.test(pmHtml) &&
        /art[íi]culo 69/.test(pmHtml) &&
        !/art\. 66 por fallecimiento/.test(pmH1),
    );
    assert(
      "SEO permiso matrimonio gold 5 ene y 30 abr en copy",
      goldPm.fechaTermino === "2026-01-09" &&
        goldPm.fechaReintegro === "2026-01-12" &&
        goldPm.goceRemuneracion === 150_000 &&
        goldPm.diasCalendario === 5 &&
        goldFeriadoPm.fechaTermino === "2026-05-07" &&
        goldFeriadoPm.fechaReintegro === "2026-05-08" &&
        /5 de enero de 2026/.test(pmHtml) &&
        /30 de abril de 2026/.test(pmHtml) &&
        /\$150\.000/.test(pmHtml),
    );
    assert("SEO permiso matrimonio FAQPage", /"@type": "FAQPage"/.test(pmHtml));
    assert(
      "SEO permiso matrimonio no canibaliza hermanas vetadas",
      /href="\/feriado-anual"/.test(pmHtml) &&
        /href="\/vacaciones-proporcionales"/.test(pmHtml) &&
        /href="\/permiso-paternidad"/.test(pmHtml) &&
        /href="\/sueldo"/.test(pmHtml) &&
        /no constituye asesor[ií]a legal/i.test(pmHtml) &&
        /estimaci[oó]n educativa/.test(pmHtml) &&
        !existsSync(join(root, "matrimonio.html")) &&
        !existsSync(join(root, "auc.html")) &&
        !existsSync(join(root, "art-207-bis.html")) &&
        !existsSync(join(root, "permiso-auc.html")),
    );
    assert(
      "home y nav enlazan /permiso-matrimonio",
      /href="\/permiso-matrimonio"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/permiso-matrimonio" data-nav>Permiso matrimonio<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/permiso-matrimonio" data-nav>Permiso matrimonio<\/a>/.test(pmHtml),
    );
    assert(
      "sitemap incluye /permiso-matrimonio",
      locs.includes("https://www.haberes.cl/permiso-matrimonio") &&
        lastmodForPath("/permiso-matrimonio") === "2026-09-09",
    );
    assert(
      "seo-map documenta /permiso-matrimonio y no-canibalizar hermanas",
      /\/permiso-matrimonio/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/permiso-paternidad`, `\/feriado-anual`, `\/hora-lactancia`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/matrimonio`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /permiso-matrimonio en el cluster de liquidación",
      /href="\/permiso-matrimonio"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/permiso-matrimonio"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /permiso-matrimonio",
      /href="\/permiso-matrimonio"/.test(ppHtmlPm) &&
        /href="\/permiso-matrimonio"/.test(faHtmlPm) &&
        /href="\/permiso-matrimonio"/.test(vpHtmlPm) &&
        /href="\/permiso-matrimonio"/.test(sueldoHtmlPm) &&
        /href="\/permiso-matrimonio"/.test(hlHtmlPm),
    );
    const vercelPm = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
    assert(
      "alias /permiso-auc redirige a /permiso-matrimonio",
      Array.isArray(vercelPm.redirects) &&
        vercelPm.redirects.some(
          (r) => r.source === "/permiso-auc" && r.destination === "/permiso-matrimonio" && r.permanent === true,
        ),
    );
  }
  {
    const pfHtml = readFileSync(join(root, "permiso-fallecimiento.html"), "utf8");
    const pfTitle = (pfHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const pfH1 = (pfHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const pfDesc = (pfHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const pmHtmlPf = readFileSync(join(root, "permiso-matrimonio.html"), "utf8");
    const ppHtmlPf = readFileSync(join(root, "permiso-paternidad.html"), "utf8");
    const faHtmlPf = readFileSync(join(root, "feriado-anual.html"), "utf8");
    const lmHtmlPf = readFileSync(join(root, "licencia-medica.html"), "utf8");
    const goldHijo = calcularPermisoFallecimiento({ vinculo: "hijo", remuneracion: 900_000 });
    const goldConyuge = calcularPermisoFallecimiento({ vinculo: "conyuge", remuneracion: 900_000 });
    const goldPadre = calcularPermisoFallecimiento({ vinculo: "padre_madre", remuneracion: 900_000 });
    const goldGest = calcularPermisoFallecimiento({ vinculo: "hijo_gestacion", remuneracion: 900_000 });
    assert(
      "SEO permiso fallecimiento title único y corto",
      /calculadora permiso fallecimiento/i.test(pfTitle) &&
        pfTitle.length <= 65 &&
        !/permiso matrimonio/i.test(pfTitle) &&
        !/permiso paternidad/i.test(pfTitle) &&
        !/feriado anual/i.test(pfTitle) &&
        !/licencia m[eé]dica/i.test(pfTitle),
      pfTitle,
    );
    assert(
      "SEO permiso fallecimiento H1 único art. 66",
      pfH1 === "Calculadora permiso fallecimiento Chile 2026" &&
        /art[íi]culo 66/.test(pfHtml) &&
        /Ley 21\.371/.test(pfHtml) &&
        /Ley 21\.441/.test(pfHtml) &&
        !/207 bis/.test(pfH1) &&
        !/art\. 195/.test(pfH1),
      pfH1,
    );
    assert(
      "SEO permiso fallecimiento description propia",
      pfDesc.length >= 110 &&
        pfDesc.length <= 160 &&
        /art\. 66/.test(pfDesc) &&
        /fallecimiento/.test(pfDesc) &&
        !/permiso matrimonio/i.test(pfDesc) &&
        !/permiso paternidad/i.test(pfDesc),
      `${pfDesc.length}:${pfDesc}`,
    );
    assert(
      "SEO permiso fallecimiento cita art. 66, ORD 853/16 y 1076/19",
      /art[íi]culo 66/.test(pfHtml) &&
        /853\/16/.test(pfHtml) &&
        /1076\/19/.test(pfHtml) &&
        /art[íi]culo 69/.test(pfHtml),
    );
    assert(
      "SEO permiso fallecimiento golds en copy",
      goldHijo.goceRemuneracion === 300_000 &&
        goldConyuge.goceRemuneracion === 210_000 &&
        goldPadre.goceRemuneracion === 120_000 &&
        goldGest.goceRemuneracion === 210_000 &&
        /10 d[íi]as corridos/.test(pfHtml) &&
        /7 d[íi]as corridos/.test(pfHtml) &&
        /7 d[íi]as h[áa]biles/.test(pfHtml) &&
        /4 d[íi]as h[áa]biles/.test(pfHtml) &&
        /\$300\.000/.test(pfHtml) &&
        /\$210\.000/.test(pfHtml) &&
        /\$120\.000/.test(pfHtml) &&
        /5 de enero de 2026/.test(pfHtml) &&
        /30 de abril de 2026/.test(pfHtml),
    );
    assert("SEO permiso fallecimiento FAQPage", /"@type": "FAQPage"/.test(pfHtml));
    assert(
      "SEO permiso fallecimiento no canibaliza hermanas vetadas",
      /href="\/permiso-matrimonio"/.test(pfHtml) &&
        /href="\/permiso-paternidad"/.test(pfHtml) &&
        /href="\/feriado-anual"/.test(pfHtml) &&
        /href="\/licencia-medica"/.test(pfHtml) &&
        /href="\/hora-lactancia"/.test(pfHtml) &&
        /href="\/postnatal-parental"/.test(pfHtml) &&
        /no constituye asesor[ií]a legal/i.test(pfHtml) &&
        /estimaci[oó]n educativa/.test(pfHtml) &&
        !existsSync(join(root, "fallecimiento.html")) &&
        !existsSync(join(root, "permiso-duelo.html")) &&
        !existsSync(join(root, "art-66.html")),
    );
    assert(
      "home y nav enlazan /permiso-fallecimiento",
      /href="\/permiso-fallecimiento"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/permiso-fallecimiento" data-nav>Permiso fallecimiento<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/permiso-fallecimiento" data-nav>Permiso fallecimiento<\/a>/.test(pfHtml),
    );
    assert(
      "sitemap incluye /permiso-fallecimiento",
      locs.includes("https://www.haberes.cl/permiso-fallecimiento") &&
        lastmodForPath("/permiso-fallecimiento") === "2026-09-10",
    );
    assert(
      "seo-map documenta /permiso-fallecimiento y no-canibalizar hermanas",
      /\/permiso-fallecimiento/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/permiso-matrimonio`, `\/permiso-paternidad`, `\/hora-lactancia`, `\/feriado-anual`, `\/licencia-medica`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/fallecimiento`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /permiso-fallecimiento en el cluster de liquidación",
      /href="\/permiso-fallecimiento"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/permiso-fallecimiento"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /permiso-fallecimiento",
      /href="\/permiso-fallecimiento"/.test(pmHtmlPf) &&
        /href="\/permiso-fallecimiento"/.test(ppHtmlPf) &&
        /href="\/permiso-fallecimiento"/.test(faHtmlPf) &&
        /href="\/permiso-fallecimiento"/.test(lmHtmlPf),
    );
  }
  {
    const imHtml = readFileSync(join(root, "interes-mora.html"), "utf8");
    const imTitle = (imHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const imH1 = (imHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const imDesc = (imHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const finiHtmlIm = readFileSync(join(root, "finiquito.html"), "utf8");
    const sueldoHtmlIm = readFileSync(join(root, "sueldo.html"), "utf8");
    const daHtmlIm = readFileSync(join(root, "descuento-atrasos.html"), "utf8");
    const plazoHtmlIm = readFileSync(join(root, "guias/plazo-de-pago-del-finiquito.html"), "utf8");
    const goldIm = calcularInteresMora(INTERES_MORA_GOLD);
    assert(
      "SEO interés mora title único y corto",
      /calculadora inter[eé]s por mora/i.test(imTitle) &&
        imTitle.length <= 65 &&
        !/finiquito/i.test(imTitle) &&
        !/sueldo l[ií]quido/i.test(imTitle) &&
        !/descuento atrasos/i.test(imTitle),
      imTitle,
    );
    assert(
      "SEO interés mora H1 único art. 63",
      imH1 === "Calculadora interés por mora de remuneraciones Chile 2026" &&
        /art[íi]culo 63/.test(imHtml) &&
        /operaciones reajustables/.test(imHtml) &&
        !/art\. 177/.test(imH1),
      imH1,
    );
    assert(
      "SEO interés mora description propia",
      imDesc.length >= 110 &&
        imDesc.length <= 160 &&
        /art\. 63/.test(imDesc) &&
        /mora/.test(imDesc) &&
        !/sueldo l[ií]quido/i.test(imDesc),
      `${imDesc.length}:${imDesc}`,
    );
    assert(
      "SEO interés mora cita art. 63, DT, CMF 08/2026 y 360 días",
      /art[íi]culo 63/.test(imHtml) &&
        /60253/.test(imHtml) &&
        /60612/.test(imHtml) &&
        /08\/2026/.test(imHtml) &&
        /6,72/.test(imHtml) &&
        /360/.test(imHtml),
    );
    assert(
      "SEO interés mora gold en copy",
      goldIm.total === 1_027_180 &&
        goldIm.reajuste === 12_000 &&
        goldIm.intereses === 15_180 &&
        goldIm.diasMora === 90 &&
        /\$1\.000\.000/.test(imHtml) &&
        /31 de marzo de 2026/.test(imHtml) &&
        /30 de junio de 2026/.test(imHtml) &&
        /\$12\.000/.test(imHtml) &&
        /\$15\.180/.test(imHtml) &&
        /\$1\.027\.180/.test(imHtml),
    );
    assert("SEO interés mora FAQPage", /"@type": "FAQPage"/.test(imHtml));
    assert(
      "SEO interés mora no canibaliza hermanas vetadas",
      /href="\/finiquito"/.test(imHtml) &&
        /href="\/sueldo"/.test(imHtml) &&
        /href="\/descuento-atrasos"/.test(imHtml) &&
        /href="\/sueldo-proporcional"/.test(imHtml) &&
        /href="\/indemnizacion-anos-servicio"/.test(imHtml) &&
        /href="\/indemnizacion-aviso-previo"/.test(imHtml) &&
        /href="\/guias\/plazo-de-pago-del-finiquito"/.test(imHtml) &&
        /no constituye asesor[ií]a legal/i.test(imHtml) &&
        /liquidaci[oó]n judicial/.test(imHtml) &&
        !existsSync(join(root, "reajuste-ipc.html")) &&
        !existsSync(join(root, "mora-sueldo.html")) &&
        !existsSync(join(root, "art-63.html")),
    );
    assert(
      "home y nav enlazan /interes-mora",
      /href="\/interes-mora"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/interes-mora" data-nav>Interés por mora<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/interes-mora" data-nav>Interés por mora<\/a>/.test(imHtml),
    );
    assert(
      "sitemap incluye /interes-mora",
      locs.includes("https://www.haberes.cl/interes-mora") &&
        lastmodForPath("/interes-mora") === "2026-09-11",
    );
    assert(
      "seo-map documenta /interes-mora y no-canibalizar hermanas",
      /\/interes-mora/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/finiquito`, `\/sueldo`, `\/descuento-atrasos`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/reajuste-ipc`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /interes-mora en el cluster de liquidación",
      /href="\/interes-mora"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/interes-mora"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /interes-mora",
      /href="\/interes-mora"/.test(finiHtmlIm) &&
        /href="\/interes-mora"/.test(sueldoHtmlIm) &&
        /href="\/interes-mora"/.test(daHtmlIm) &&
        /href="\/interes-mora"/.test(plazoHtmlIm),
    );
  }
  {
    const fmHtml = readFileSync(join(root, "fuero-maternal.html"), "utf8");
    const fmTitle = (fmHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const fmH1 = (fmHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const fmDesc = (fmHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const pppHtmlFm = readFileSync(join(root, "postnatal-parental.html"), "utf8");
    const scHtmlFm = readFileSync(join(root, "sala-cuna.html"), "utf8");
    const hlHtmlFm = readFileSync(join(root, "hora-lactancia.html"), "utf8");
    const ppHtmlFm = readFileSync(join(root, "permiso-paternidad.html"), "utf8");
    const lmHtmlFm = readFileSync(join(root, "licencia-medica.html"), "utf8");
    const goldFm = calcularFueroMaternal({ fechaParto: "2026-01-05", modalidad: "postnatal" });
    const goldCompleta = calcularFueroMaternal({ fechaParto: "2026-01-05", modalidad: "completa" });
    const goldParcial = calcularFueroMaternal({ fechaParto: "2026-01-05", modalidad: "parcial" });
    assert(
      "SEO fuero maternal title único y corto",
      /calculadora fuero maternal/i.test(fmTitle) &&
        fmTitle.length <= 65 &&
        !/postnatal parental/i.test(fmTitle) &&
        !/sala cuna/i.test(fmTitle) &&
        !/hora de lactancia/i.test(fmTitle) &&
        !/permiso paternidad/i.test(fmTitle) &&
        !/licencia m[eé]dica/i.test(fmTitle),
      fmTitle,
    );
    assert(
      "SEO fuero maternal H1 único art. 201",
      fmH1 === "Calculadora fuero maternal Chile 2026" &&
        /art[íi]culo 201/.test(fmHtml) &&
        /197 bis/.test(fmHtml) &&
        !/197 bis/.test(fmH1) &&
        !/art\. 203/.test(fmH1),
      fmH1,
    );
    assert(
      "SEO fuero maternal description propia",
      fmDesc.length >= 110 &&
        fmDesc.length <= 160 &&
        /art\. 201/.test(fmDesc) &&
        /fuero maternal/.test(fmDesc) &&
        !/sala cuna/i.test(fmDesc) &&
        !/permiso paternidad/i.test(fmDesc),
      `${fmDesc.length}:${fmDesc}`,
    );
    assert(
      "SEO fuero maternal cita art. 201, DT y ORD 3366",
      /art[íi]culo 201/.test(fmHtml) &&
        /3366/.test(fmHtml) &&
        /60062/.test(fmHtml) &&
        /art[íi]culo 174/.test(fmHtml) &&
        /excluido/.test(fmHtml),
    );
    assert(
      "SEO fuero maternal golds en copy",
      goldFm.fechaTerminoPostnatal === "2026-03-30" &&
        goldFm.fechaTerminoFuero === "2027-03-30" &&
        goldCompleta.fechaTerminoParental === "2026-06-22" &&
        goldParcial.fechaTerminoParental === "2026-08-03" &&
        /30 de marzo de 2026/.test(fmHtml) &&
        /30 de marzo de 2027/.test(fmHtml) &&
        /22 de junio de 2026/.test(fmHtml) &&
        /3 de agosto de 2026/.test(fmHtml) &&
        /5 de enero de 2026/.test(fmHtml),
    );
    assert("SEO fuero maternal FAQPage", /"@type": "FAQPage"/.test(fmHtml));
    assert(
      "SEO fuero maternal no canibaliza hermanas vetadas",
      /href="\/permiso-prenatal"/.test(fmHtml) &&
        /href="\/postnatal-parental"/.test(fmHtml) &&
        /href="\/sala-cuna"/.test(fmHtml) &&
        /href="\/hora-lactancia"/.test(fmHtml) &&
        /href="\/permiso-paternidad"/.test(fmHtml) &&
        /href="\/licencia-medica"/.test(fmHtml) &&
        /no constituye asesor[ií]a legal/i.test(fmHtml) &&
        /no es un permiso pagado/i.test(fmHtml) &&
        /no estima indemnizaci[oó]n/i.test(fmHtml) &&
        !existsSync(join(root, "fuero.html")) &&
        !existsSync(join(root, "fuero-laboral.html")) &&
        !existsSync(join(root, "proteccion-maternal.html")) &&
        !existsSync(join(root, "art-201.html")) &&
        !existsSync(join(root, "despido-embarazo.html")),
    );
    assert(
      "home y nav enlazan /fuero-maternal",
      /href="\/fuero-maternal"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/fuero-maternal" data-nav>Fuero maternal<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/fuero-maternal" data-nav>Fuero maternal<\/a>/.test(fmHtml),
    );
    assert(
      "sitemap incluye /fuero-maternal",
      locs.includes("https://www.haberes.cl/fuero-maternal") &&
        lastmodForPath("/fuero-maternal") === "2026-09-10",
    );
    assert(
      "seo-map documenta /fuero-maternal y no-canibalizar hermanas",
      /\/fuero-maternal/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/permiso-prenatal`, `\/postnatal-parental`, `\/sala-cuna`, `\/hora-lactancia`, `\/permiso-paternidad`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/fuero`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /fuero-maternal en el cluster de liquidación",
      /href="\/fuero-maternal"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/fuero-maternal"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /fuero-maternal",
      /href="\/fuero-maternal"/.test(pppHtmlFm) &&
        /href="\/fuero-maternal"/.test(scHtmlFm) &&
        /href="\/fuero-maternal"/.test(hlHtmlFm) &&
        /href="\/fuero-maternal"/.test(ppHtmlFm) &&
        /href="\/fuero-maternal"/.test(lmHtmlFm) &&
        /href="\/fuero-maternal"/.test(readFileSync(join(root, "permiso-prenatal.html"), "utf8")),
    );
  }
  {
    const hlHtml = readFileSync(join(root, "hora-lactancia.html"), "utf8");
    const hlTitle = (hlHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const hlH1 = (hlHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const hlDesc = (hlHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const scHtmlHl = readFileSync(join(root, "sala-cuna.html"), "utf8");
    const pppHtmlHl = readFileSync(join(root, "postnatal-parental.html"), "utf8");
    const lmHtmlHl = readFileSync(join(root, "licencia-medica.html"), "utf8");
    const sueldoHtmlHl = readFileSync(join(root, "sueldo.html"), "utf8");
    const goldHl = calcularHoraLactancia({
      remuneracion: 900_000,
      jornada: 42,
      diasLaborales: 20,
      minutosDiarios: 60,
    });
    const mitadHl = calcularHoraLactancia({
      remuneracion: 900_000,
      jornada: 42,
      diasLaborales: 20,
      minutosDiarios: 30,
    });
    const fueraHl = calcularHoraLactancia({
      remuneracion: 900_000,
      jornada: 42,
      diasLaborales: 20,
      minutosDiarios: 60,
      edadMeses: 24,
    });
    assert(
      "SEO hora de lactancia title único y corto",
      /calcular hora de lactancia/i.test(hlTitle) &&
        !/sala cuna/i.test(hlTitle) &&
        !/postnatal parental/i.test(hlTitle) &&
        !/sueldo l[ií]quido/i.test(hlTitle) &&
        !/licencia m[eé]dica/i.test(hlTitle) &&
        hlTitle !== ((scHtmlHl.match(/<title>([^<]*)<\/title>/) || [])[1] || "") &&
        hlTitle !== ((pppHtmlHl.match(/<title>([^<]*)<\/title>/) || [])[1] || "") &&
        hlTitle.length <= 65,
      hlTitle,
    );
    assert(
      "SEO hora de lactancia H1 único art. 206",
      hlH1 === "Calcular hora de lactancia art. 206 Chile 2026" &&
        hlH1 !== ((scHtmlHl.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "") &&
        hlH1 !== ((pppHtmlHl.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "") &&
        !/sala cuna/i.test(hlH1) &&
        !/postnatal parental/i.test(hlH1),
      hlH1,
    );
    assert(
      "SEO hora de lactancia description propia",
      hlDesc &&
        hlDesc !== ((scHtmlHl.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        hlDesc !== ((pppHtmlHl.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        /art\. 206/.test(hlDesc) &&
        !/\bIA\b/.test(hlDesc),
      hlDesc,
    );
    assert(
      "SEO hora de lactancia cita art. 206, BCN y DT",
      /art[ií]culo 206/.test(hlHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(hlHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60103/.test(hlHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60094/.test(hlHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-94769/.test(hlHtml) &&
        /remuneraci[oó]n \/ 30 × 28 \/ \(jornada semanal × 4\)/.test(hlHtml) &&
        /con goce de sueldo/.test(hlHtml) &&
        /herramienta digital/.test(hlHtml),
    );
    assert(
      "SEO hora de lactancia gold 900000/42/20/60 y 30 min mitad",
      goldHl.valorDiario === 5_000 &&
        goldHl.valorMensual === 100_000 &&
        close(goldHl.valorHora, valorHoraOrdinaria(900_000, 42), 0.0001) &&
        mitadHl.valorDiario === 2_500 &&
        mitadHl.valorMensual === 50_000 &&
        fueraHl.vigente === false &&
        fueraHl.valorMensual === goldHl.valorMensual &&
        /\$900\.000/.test(hlHtml) &&
        /\$5\.000/.test(hlHtml) &&
        /\$100\.000/.test(hlHtml) &&
        /\$2\.500/.test(hlHtml) &&
        /\$50\.000/.test(hlHtml) &&
        /24 meses/.test(hlHtml),
    );
    assert("SEO hora de lactancia FAQPage", /"@type": "FAQPage"/.test(hlHtml));
    assert(
      "SEO hora de lactancia no canibaliza hermanas vetadas",
      /href="\/sala-cuna"/.test(hlHtml) &&
        /href="\/postnatal-parental"/.test(hlHtml) &&
        /href="\/sueldo"/.test(hlHtml) &&
        /href="\/licencia-medica"/.test(hlHtml) &&
        /href="\/permiso-paternidad"/.test(hlHtml) &&
        /no constituye asesor[ií]a/i.test(hlHtml) &&
        !existsSync(join(root, "lactancia.html")) &&
        !existsSync(join(root, "hora-de-alimentacion.html")) &&
        !existsSync(join(root, "permiso-lactancia.html")),
    );
    assert(
      "SEO hora de lactancia métrica principal es valor mensual",
      /Valor mensual estimado/.test(hlHtml) &&
        /Valor diario del permiso/.test(hlHtml) &&
        !/<p class="metric-label">L[ií]quido<\/p>/.test(hlHtml) &&
        !/<p class="metric-label">Diferencia \(parcial − completa\)/.test(hlHtml),
    );
    assert(
      "home y nav enlazan /hora-lactancia",
      /href="\/hora-lactancia"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/hora-lactancia" data-nav>Hora de lactancia<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/hora-lactancia" data-nav>Hora de lactancia<\/a>/.test(hlHtml),
    );
    assert(
      "sitemap incluye /hora-lactancia",
      locs.includes("https://www.haberes.cl/hora-lactancia") &&
        lastmodForPath("/hora-lactancia") === "2026-09-09",
    );
    assert(
      "seo-map documenta /hora-lactancia y no-canibalizar hermanas",
      /\/hora-lactancia/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/sala-cuna`, `\/postnatal-parental`, `\/sueldo` ni `\/licencia-medica`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/lactancia`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /hora-lactancia en el cluster de liquidación",
      /href="\/hora-lactancia"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/hora-lactancia"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /hora-lactancia",
      /href="\/hora-lactancia"/.test(scHtmlHl) &&
        /href="\/hora-lactancia"/.test(pppHtmlHl) &&
        /href="\/hora-lactancia"/.test(lmHtmlHl) &&
        /href="\/hora-lactancia"/.test(sueldoHtmlHl),
    );
  }
  {
    const j40Html = readFileSync(join(root, "jornada-40-horas.html"), "utf8");
    const j40Title = (j40Html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const j40H1 = (j40Html.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const j40Desc = (j40Html.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const heHtmlJ40 = readFileSync(join(root, "horas-extras.html"), "utf8");
    const sueldoHtmlJ40 = readFileSync(join(root, "sueldo.html"), "utf8");
    const ceHtmlJ40 = readFileSync(join(root, "costo-empresa.html"), "utf8");
    const guideHeJ40 = readFileSync(join(root, "guias/horas-extras.html"), "utf8");
    const goldJ40 = calcularJornada40Horas({
      fecha: "2026-09-08",
      jornadaPactada: 44,
      dias: 5,
      remuneracion: 840_000,
    });
    const hist45 = calcularJornada40Horas({
      fecha: "2026-09-08",
      jornadaPactada: 45,
      dias: 5,
      remuneracion: 840_000,
    });
    assert(
      "SEO jornada 40 horas title único y corto",
      /calculadora jornada 40 horas/i.test(j40Title) &&
        !/horas extras/i.test(j40Title) &&
        !/sueldo l[ií]quido/i.test(j40Title) &&
        j40Title !== ((heHtmlJ40.match(/<title>([^<]*)<\/title>/) || [])[1] || "") &&
        j40Title.length <= 65,
      j40Title,
    );
    assert(
      "SEO jornada 40 horas H1 único Ley 21.561",
      j40H1 === "Calculadora jornada 40 horas Chile 2026" &&
        j40H1 !== ((heHtmlJ40.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "") &&
        !/horas extras/i.test(j40H1),
      j40H1,
    );
    assert(
      "SEO jornada 40 horas description propia",
      j40Desc &&
        j40Desc !== ((heHtmlJ40.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        j40Desc !== ((sueldoHtmlJ40.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
      j40Desc,
    );
    assert(
      "SEO jornada 40 horas cita Ley 21.561, 21.755 y ORD. 253/21",
      /Ley 21\.561/.test(j40Html) &&
        /42 h/.test(j40Html) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=1191554/.test(j40Html) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=1214890/.test(j40Html) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-129189/.test(j40Html) &&
        /ORD\. N°253\/21/.test(j40Html),
    );
    assert(
      "SEO jornada 40 horas gold 42 h, 44/5 días y $840.000",
      goldJ40.tope === 42 &&
        goldJ40.horasARebajar === 2 &&
        goldJ40.bloques[0] === 60 &&
        goldJ40.bloques[1] === 60 &&
        goldJ40.valorHoraAjustadaPesos === 4667 &&
        hist45.valorHoraPactadaPesos === 4356 &&
        /id="ledeTopeHoy"/.test(j40Html) &&
        /tope es <strong id="ledeTopeHoy">42 h<\/strong>/.test(j40Html) &&
        /1 h en dos d[ií]as distintos al t[eé]rmino/.test(j40Html) &&
        /\$4\.667/.test(j40Html) &&
        /\$4\.356/.test(j40Html),
    );
    assert("SEO jornada 40 horas FAQPage", /"@type": "FAQPage"/.test(j40Html));
    assert(
      "SEO jornada 40 horas pide sueldo convenido y no fija «tope vigente hoy»",
      /Sueldo convenido para la jornada ordinaria/.test(j40Html) &&
        /sueldo convenido \/ 30/.test(j40Html) &&
        !/tope vigente hoy/.test(j40Html) &&
        /id="ledeTopeHoy"/.test(j40Html) &&
        /id="hintFecha"/.test(j40Html),
    );
    assert(
      "SEO jornada 40 horas no canibaliza hermanas vetadas",
      /href="\/horas-extras"/.test(j40Html) &&
        /href="\/sueldo"/.test(j40Html) &&
        /href="\/costo-empresa"/.test(j40Html) &&
        /href="\/guias\/horas-extras"/.test(j40Html) &&
        /no constituye asesor[ií]a legal/i.test(j40Html) &&
        !existsSync(join(root, "40-horas.html")) &&
        !existsSync(join(root, "ley-21561.html")) &&
        !existsSync(join(root, "reduccion-jornada.html")),
    );
    assert(
      "SEO jornada 40 horas métrica principal es el tope legal",
      /Tope legal ordinario/.test(j40Html) &&
        !/<p class="metric-label">L[ií]quido<\/p>/.test(j40Html) &&
        !/<p class="metric-label">Total a pagar<\/p>/.test(j40Html),
    );
    assert(
      "home y nav enlazan /jornada-40-horas",
      /href="\/jornada-40-horas"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/jornada-40-horas" data-nav>Jornada 40 horas<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/jornada-40-horas" data-nav>Jornada 40 horas<\/a>/.test(j40Html),
    );
    assert(
      "sitemap incluye /jornada-40-horas",
      locs.includes("https://www.haberes.cl/jornada-40-horas") &&
        lastmodForPath("/jornada-40-horas") === "2026-09-08",
    );
    assert(
      "seo-map documenta /jornada-40-horas y no-canibalizar hermanas",
      /\/jornada-40-horas/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/horas-extras`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no crear `\/40-horas`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /jornada-40-horas en el cluster de liquidación",
      /href="\/jornada-40-horas"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/jornada-40-horas"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas enlazan /jornada-40-horas",
      /href="\/jornada-40-horas"/.test(heHtmlJ40) &&
        /href="\/jornada-40-horas"/.test(sueldoHtmlJ40) &&
        /href="\/jornada-40-horas"/.test(ceHtmlJ40) &&
        /href="\/jornada-40-horas"/.test(guideHeJ40),
    );
  }
  {
    const faHtml = readFileSync(join(root, "feriado-anual.html"), "utf8");
    const faTitle = (faHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const faH1 = (faHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const faDesc = (faHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const vpHtml = readFileSync(join(root, "vacaciones-proporcionales.html"), "utf8");
    const vpTitle = (vpHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const vpH1 = (vpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const fpHtml = readFileSync(join(root, "feriado-progresivo.html"), "utf8");
    const fpTitle = (fpHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const fpH1 = (fpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const fiHtml = readFileSync(join(root, "feriado-irrenunciable.html"), "utf8");
    const g1 = calcularFeriadoAnual({ fechaInicio: "2026-01-05", diasHabiles: 15 });
    const g2 = calcularFeriadoAnual({ fechaInicio: "2026-04-20", diasHabiles: 15 });
    assert(
      "SEO title feriado anual apunta a calcular feriado anual",
      /calcular feriado anual/i.test(faTitle) &&
        !/vacaciones proporcionales/i.test(faTitle) &&
        !/feriado progresivo/i.test(faTitle) &&
        !/irrenunciable/i.test(faTitle) &&
        faTitle !== vpTitle &&
        faTitle !== fpTitle &&
        faTitle.length <= 65,
      faTitle,
    );
    assert(
      "SEO H1 feriado anual es vacaciones legales Chile 2026 distinto de proporcional y progresivo",
      faH1 === "Calcular feriado anual y vacaciones legales Chile 2026" &&
        faH1 !== vpH1 &&
        faH1 !== fpH1 &&
        /art[ií]culo 67/i.test(faHtml) &&
        !/calcular vacaciones proporcionales/i.test(faH1) &&
        !/calcular feriado progresivo/i.test(faH1),
      faH1,
    );
    assert(
      "SEO feriado anual meta distinta de /vacaciones-proporcionales y /feriado-progresivo",
      faDesc &&
        faDesc !== ((vpHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        faDesc !== ((fpHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO feriado anual cita art. 67, 69, 70 y DT 60177",
      /art[ií]culo 67/i.test(faHtml) &&
        /art[ií]culo 69/i.test(faHtml) &&
        /art[ií]culo 70/i.test(faHtml) &&
        /C[oó]digo del Trabajo/.test(faHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(faHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60177/.test(faHtml) &&
        /15 d[ií]as h[aá]biles/i.test(faHtml) &&
        /20 d[ií]as h[aá]biles/i.test(faHtml) &&
        /Magallanes/.test(faHtml) &&
        /Palena/.test(faHtml),
    );
    assert(
      "SEO feriado anual gold 5 ene 15 hábiles = 21 corridos y 1 may no consume",
      g1.diasCorridos === 21 &&
        g1.fechaTermino === "2026-01-23" &&
        g1.fechaReintegro === "2026-01-26" &&
        g2.feriados.some((f) => f.fecha === "2026-05-01") &&
        g2.fechaTermino === "2026-05-11" &&
        /21 d[ií]as corridos/.test(faHtml) &&
        /23 de enero/.test(faHtml) &&
        /1 de mayo/.test(faHtml) &&
        /11 de mayo/.test(faHtml),
    );
    assert("SEO feriado anual FAQPage", /"@type": "FAQPage"/.test(faHtml));
    assert(
      "SEO feriado anual no es proporcional, progresivo ni irrenunciable",
      /href="\/vacaciones-proporcionales"/.test(faHtml) &&
        /href="\/feriado-progresivo"/.test(faHtml) &&
        /href="\/finiquito"/.test(faHtml) &&
        /href="\/guias\/vacaciones-proporcionales"/.test(faHtml) &&
        /href="\/feriado-irrenunciable"/.test(faHtml) &&
        !existsSync(join(root, "vacaciones.html")) &&
        !existsSync(join(root, "calendario-vacaciones.html")),
    );
    assert(
      "SEO feriado anual métrica principal es fecha de reintegro",
      /Fecha de reintegro/.test(faHtml) && !/<p class="metric-label">Feriado proporcional<\/p>/.test(faHtml),
    );
    assert(
      "home y nav enlazan /feriado-anual",
      /href="\/feriado-anual"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/feriado-anual" data-nav>Feriado anual<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/feriado-anual" data-nav>Feriado anual<\/a>/.test(faHtml),
    );
    assert(
      "sitemap incluye /feriado-anual",
      locs.includes("https://www.haberes.cl/feriado-anual") &&
        lastmodForPath("/feriado-anual") === "2026-09-04",
    );
    assert(
      "seo-map documenta /feriado-anual y no-canibalizar /vacaciones-proporcionales",
      /\/feriado-anual/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/vacaciones-proporcionales` ni `\/feriado-progresivo`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/vacaciones` ni `\/calendario-vacaciones`/i.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ),
    );
    assert(
      "hub /guias enlaza /feriado-anual en el cluster de finiquito",
      /href="\/feriado-anual"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Finiquito<\/h2>[\s\S]*href="\/feriado-anual"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "hermanas de vacaciones enlazan /feriado-anual",
      /href="\/feriado-anual"/.test(vpHtml) &&
        /href="\/feriado-anual"/.test(fpHtml) &&
        /href="\/feriado-anual"/.test(fiHtml) &&
        /href="\/feriado-anual"/.test(
          readFileSync(join(root, "guias/vacaciones-proporcionales.html"), "utf8"),
        ),
    );
  }
  {
    const avisoHtml = readFileSync(join(root, "indemnizacion-aviso-previo.html"), "utf8");
    const avisoTitle = (avisoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const avisoH1 = (avisoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const avisoDesc = (avisoHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const finiHtml = readFileSync(join(root, "finiquito.html"), "utf8");
    const finiTitle = (finiHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const finiH1 = (finiHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const iasHtml = readFileSync(join(root, "indemnizacion-anos-servicio.html"), "utf8");
    const iasTitle = (iasHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const iasH1 = (iasHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const cartaHtml = readFileSync(join(root, "guias/carta-aviso-termino-contrato.html"), "utf8");
    const millon = calcularAvisoPrevio(
      { causal: "161-necesidades", remuneracion: 1_000_000, avisoPrevio: false },
      { uf: FALLBACK_UF },
    );
    const seiscientos = calcularAvisoPrevio(
      { causal: "161-desahucio", remuneracion: 600_000, avisoPrevio: false },
      { uf: FALLBACK_UF },
    );
    const sinDerecho = calcularAvisoPrevio(
      { causal: "160-7", remuneracion: 1_000_000, avisoPrevio: false },
      { uf: FALLBACK_UF },
    );
    const conHabituales = calcularAvisoPrevio(
      {
        causal: "161-necesidades",
        remuneracion: 500_000,
        colacion: 80_000,
        movilizacion: 70_000,
        avisoPrevio: false,
      },
      { uf: FALLBACK_UF },
    );
    assert(
      "SEO title aviso previo apunta a calcular indemnización por aviso previo",
      /calcular indemnizaci[oó]n por aviso previo/i.test(avisoTitle) &&
        !/calculadora de finiquito/i.test(avisoTitle) &&
        !/a[nñ]os de servicio/i.test(avisoTitle) &&
        avisoTitle !== finiTitle &&
        avisoTitle !== iasTitle &&
        avisoTitle.length <= 65,
      avisoTitle,
    );
    assert(
      "SEO H1 aviso previo distinto de /finiquito y de /indemnizacion-anos-servicio",
      avisoH1 === "Calcular indemnización por aviso previo Chile 2026" &&
        avisoH1 !== finiH1 &&
        avisoH1 !== iasH1 &&
        !/calculadora de finiquito/i.test(avisoH1) &&
        !/a[nñ]os de servicio/i.test(avisoH1),
      avisoH1,
    );
    assert(
      "SEO aviso previo meta distinta de /finiquito y de IAS",
      avisoDesc &&
        avisoDesc !== ((finiHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        avisoDesc !== ((iasHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO aviso previo cita arts. 161, 162, 172, DT y Código",
      /art[ií]culos 161 y 162/i.test(avisoHtml) &&
        /art[ií]culo 172/i.test(avisoHtml) &&
        /C[oó]digo del Trabajo/.test(avisoHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60543/.test(avisoHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60604/.test(avisoHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(avisoHtml),
    );
    assert(
      "SEO aviso previo golden $1.000.000, $600.000, $0 y colación+movilización",
      millon.aviso === 1_000_000 &&
        seiscientos.aviso === 600_000 &&
        sinDerecho.aviso === 0 &&
        conHabituales.aviso === 650_000 &&
        /\$1\.000\.000/.test(avisoHtml) &&
        /\$600\.000/.test(avisoHtml) &&
        /\$650\.000/.test(avisoHtml) &&
        /\$0/.test(avisoHtml) &&
        /colaci[oó]n \$80\.000/.test(avisoHtml) &&
        /movilizaci[oó]n \$70\.000/.test(avisoHtml),
    );
    assert("SEO aviso previo FAQPage", /"@type": "FAQPage"/.test(avisoHtml));
    assert(
      "SEO aviso previo no es finiquito completo ni IAS",
      /no es la/.test(avisoHtml.toLowerCase()) &&
        /href="\/finiquito"/.test(avisoHtml) &&
        /href="\/indemnizacion-anos-servicio"/.test(avisoHtml) &&
        /Estimaci[oó]n orientativa/.test(avisoHtml) &&
        /Inspecci[oó]n del Trabajo/.test(avisoHtml) &&
        !existsSync(join(root, "dias-aviso.html")) &&
        !existsSync(join(root, "aviso-previo.html")),
    );
    assert(
      "SEO aviso previo métrica principal es la sustitutiva",
      /Indemnizaci[oó]n sustitutiva del aviso/.test(avisoHtml) &&
        !/<p class="metric-label">Indemnizaci[oó]n por a[nñ]os de servicio<\/p>/.test(avisoHtml),
    );
    assert(
      "home y nav enlazan /indemnizacion-aviso-previo",
      /href="\/indemnizacion-aviso-previo"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/indemnizacion-aviso-previo" data-nav>Indemnizaci[oó]n aviso previo<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/indemnizacion-aviso-previo" data-nav>Indemnizaci[oó]n aviso previo<\/a>/.test(avisoHtml),
    );
    assert(
      "sitemap incluye /indemnizacion-aviso-previo",
      locs.includes("https://www.haberes.cl/indemnizacion-aviso-previo") &&
        lastmodForPath("/indemnizacion-aviso-previo") === "2026-08-29",
    );
    assert(
      "seo-map documenta /indemnizacion-aviso-previo y no-canibalizar /finiquito",
      /\/indemnizacion-aviso-previo/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/finiquito`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no crear `\/dias-aviso`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no crear `\/aviso-previo`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "carta de aviso, IAS y /finiquito enlazan /indemnizacion-aviso-previo",
      /href="\/indemnizacion-aviso-previo"/.test(cartaHtml) &&
        /href="\/indemnizacion-aviso-previo"/.test(iasHtml) &&
        /href="\/indemnizacion-aviso-previo"/.test(finiHtml),
    );
    assert(
      "hub /guias enlaza /indemnizacion-aviso-previo en cluster finiquito",
      /href="\/indemnizacion-aviso-previo"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Finiquito<\/h2>/.test(readFileSync(join(root, "guias.html"), "utf8")),
    );
  }
  {
    const tutelaHtml = readFileSync(join(root, "tutela-laboral.html"), "utf8");
    const tutelaTitle = (tutelaHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const tutelaH1 = (tutelaHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const tutelaDesc = (tutelaHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const finiHtmlT = readFileSync(join(root, "finiquito.html"), "utf8");
    const finiTitleT = (finiHtmlT.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const finiH1T = (finiHtmlT.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const iasHtmlT = readFileSync(join(root, "indemnizacion-anos-servicio.html"), "utf8");
    const iasTitleT = (iasHtmlT.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const iasH1T = (iasHtmlT.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const avisoHtmlT = readFileSync(join(root, "indemnizacion-aviso-previo.html"), "utf8");
    const avisoTitleT = (avisoHtmlT.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const avisoH1T = (avisoHtmlT.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const gold6 = calcularTutelaLaboral({ remuneracion: 1_000_000, meses: 6 });
    const gold11 = calcularTutelaLaboral({ remuneracion: 1_000_000, meses: 11 });
    const gold8 = calcularTutelaLaboral({ remuneracion: 900_000, meses: 8 });
    const vercelTutela = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
    assert(
      "SEO title tutela laboral apunta a calcular tutela laboral",
      /calcular tutela laboral/i.test(tutelaTitle) &&
        !/calculadora de finiquito/i.test(tutelaTitle) &&
        !/a[nñ]os de servicio/i.test(tutelaTitle) &&
        !/aviso previo/i.test(tutelaTitle) &&
        tutelaTitle !== finiTitleT &&
        tutelaTitle !== iasTitleT &&
        tutelaTitle !== avisoTitleT &&
        tutelaTitle.length <= 65,
      tutelaTitle,
    );
    assert(
      "SEO H1 tutela laboral distinto de /finiquito, IAS y aviso",
      tutelaH1 === "Calcular tutela laboral Chile 2026" &&
        tutelaH1 !== finiH1T &&
        tutelaH1 !== iasH1T &&
        tutelaH1 !== avisoH1T,
      tutelaH1,
    );
    assert(
      "SEO tutela meta distinta de /finiquito, IAS y aviso",
      tutelaDesc &&
        tutelaDesc !== ((finiHtmlT.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        tutelaDesc !== ((iasHtmlT.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        tutelaDesc !== ((avisoHtmlT.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO tutela cita arts. 485-489, BCN y DT",
      /art[ií]culos 485 a 489/i.test(tutelaHtml) &&
        /art[ií]culo 489/i.test(tutelaHtml) &&
        /C[oó]digo del Trabajo/.test(tutelaHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(tutelaHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-propertyvalue-157363/.test(tutelaHtml),
    );
    assert(
      "SEO tutela golden $6.000.000, $11.000.000 y $7.200.000",
      gold6.total === 6_000_000 &&
        gold11.total === 11_000_000 &&
        gold8.total === 7_200_000 &&
        /\$6\.000\.000/.test(tutelaHtml) &&
        /\$11\.000\.000/.test(tutelaHtml) &&
        /\$7\.200\.000/.test(tutelaHtml),
    );
    assert("SEO tutela FAQPage", /"@type": "FAQPage"/.test(tutelaHtml));
    assert(
      "SEO tutela no es finiquito, IAS ni aviso; el juez fija 6 a 11",
      /juez fija el monto/i.test(tutelaHtml) &&
        /6 a 11/.test(tutelaHtml) &&
        /Estimaci[oó]n educativa/.test(tutelaHtml) &&
        /href="\/finiquito"/.test(tutelaHtml) &&
        /href="\/indemnizacion-anos-servicio"/.test(tutelaHtml) &&
        /href="\/indemnizacion-aviso-previo"/.test(tutelaHtml) &&
        /Inspecci[oó]n del Trabajo|Direcci[oó]n del Trabajo/.test(tutelaHtml) &&
        !existsSync(join(root, "tutela.html")) &&
        !existsSync(join(root, "derechos-fundamentales.html")) &&
        !existsSync(join(root, "art-489.html")) &&
        !existsSync(join(root, "indemnizacion-tutela.html")),
    );
    assert(
      "SEO tutela métrica principal es la indemnización especial",
      /Indemnizaci[oó]n especial \(art\. 489\)/.test(tutelaHtml) &&
        !/<p class="metric-label">Indemnizaci[oó]n por a[nñ]os de servicio<\/p>/.test(tutelaHtml),
    );
    assert(
      "home y nav enlazan /tutela-laboral",
      /href="\/tutela-laboral"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/tutela-laboral" data-nav>Tutela laboral<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/tutela-laboral" data-nav>Tutela laboral<\/a>/.test(tutelaHtml),
    );
    assert(
      "sitemap incluye /tutela-laboral",
      locs.includes("https://www.haberes.cl/tutela-laboral") &&
        lastmodForPath("/tutela-laboral") === "2026-09-13",
    );
    assert(
      "seo-map documenta /tutela-laboral y no-canibalizar hermanas",
      /\/tutela-laboral/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/finiquito`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no crear `\/tutela`, `\/derechos-fundamentales` ni `\/art-489`/i.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ),
    );
    const despidoHtml = readFileSync(join(root, "despido-injustificado.html"), "utf8");
    const despidoTitle = (despidoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const despidoH1 = (despidoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const despidoDesc = (despidoHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const finiHtmlD = readFileSync(join(root, "finiquito.html"), "utf8");
    const finiTitleD = (finiHtmlD.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const finiH1D = (finiHtmlD.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const iasHtmlD = readFileSync(join(root, "indemnizacion-anos-servicio.html"), "utf8");
    const iasTitleD = (iasHtmlD.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const iasH1D = (iasHtmlD.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const avisoHtmlD = readFileSync(join(root, "indemnizacion-aviso-previo.html"), "utf8");
    const avisoTitleD = (avisoHtmlD.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const avisoH1D = (avisoHtmlD.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const gold30 = calcularDespidoInjustificado({ baseIas: 3_000_000, porcentaje: 30 });
    const gold50 = calcularDespidoInjustificado({ baseIas: 3_000_000, porcentaje: 50 });
    const gold80 = calcularDespidoInjustificado({ baseIas: 3_000_000, porcentaje: 80 });
    const gold100 = calcularDespidoInjustificado({ baseIas: 3_000_000, porcentaje: 100 });
    const gold1m = calcularDespidoInjustificado({ baseIas: 1_000_000, porcentaje: 30 });
    const vercelDespido = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
    assert(
      "SEO title despido injustificado apunta a calcular despido injustificado",
      /calcular despido injustificado/i.test(despidoTitle) &&
        !/calculadora de finiquito/i.test(despidoTitle) &&
        !/a[nñ]os de servicio/i.test(despidoTitle) &&
        !/aviso previo/i.test(despidoTitle) &&
        despidoTitle !== finiTitleD &&
        despidoTitle !== iasTitleD &&
        despidoTitle !== avisoTitleD &&
        despidoTitle.length <= 65,
      despidoTitle,
    );
    assert(
      "SEO H1 despido injustificado distinto de /finiquito, IAS y aviso",
      despidoH1 === "Calcular despido injustificado Chile 2026" &&
        despidoH1 !== finiH1D &&
        despidoH1 !== iasH1D &&
        despidoH1 !== avisoH1D,
      despidoH1,
    );
    assert(
      "SEO despido meta distinta de /finiquito, IAS y aviso",
      despidoDesc &&
        despidoDesc !== ((finiHtmlD.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        despidoDesc !== ((iasHtmlD.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        despidoDesc !== ((avisoHtmlD.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO despido cita art. 168, BCN y DT",
      /art[ií]culo 168/i.test(despidoHtml) &&
        /C[oó]digo del Trabajo/.test(despidoHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(despidoHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-114437/.test(despidoHtml) &&
        /30\s*%/.test(despidoHtml) &&
        /50\s*%/.test(despidoHtml) &&
        /80\s*%/.test(despidoHtml) &&
        /100\s*%/.test(despidoHtml),
    );
    assert(
      "SEO despido golden $900.000, $1.500.000, $2.400.000, $3.000.000 y $300.000",
      gold30.recargo === 900_000 &&
        gold30.totalIasConRecargo === 3_900_000 &&
        gold50.recargo === 1_500_000 &&
        gold80.recargo === 2_400_000 &&
        gold100.recargo === 3_000_000 &&
        gold1m.recargo === 300_000 &&
        /\$900\.000/.test(despidoHtml) &&
        /\$1\.500\.000/.test(despidoHtml) &&
        /\$2\.400\.000/.test(despidoHtml) &&
        /\$3\.000\.000/.test(despidoHtml) &&
        /\$300\.000/.test(despidoHtml) &&
        /\$3\.900\.000/.test(despidoHtml) &&
        /\$4\.500\.000/.test(despidoHtml) &&
        /\$5\.400\.000/.test(despidoHtml) &&
        /\$6\.000\.000/.test(despidoHtml) &&
        /\$1\.300\.000/.test(despidoHtml),
    );
    assert("SEO despido FAQPage", /"@type": "FAQPage"/.test(despidoHtml));
    assert(
      "SEO despido no es finiquito, IAS ni aviso; el juez declara",
      /juez declara y fija/i.test(despidoHtml) &&
        /Estimaci[oó]n educativa/.test(despidoHtml) &&
        /no litiga ni asesora/i.test(despidoHtml) &&
        /href="\/finiquito"/.test(despidoHtml) &&
        /href="\/indemnizacion-anos-servicio"/.test(despidoHtml) &&
        /href="\/indemnizacion-aviso-previo"/.test(despidoHtml) &&
        /tutela laboral \(art\. 489\)/i.test(despidoHtml) &&
        /nulidad del despido/.test(despidoHtml) &&
        /mora del art[ií]culo 63/.test(despidoHtml) &&
        ["tutela-laboral", "nulidad-despido", "interes-mora"].every(
          (slug) =>
            existsSync(join(root, `${slug}.html`)) ||
            !new RegExp(`href="/${slug}"`).test(despidoHtml),
        ) &&
        /Inspecci[oó]n del Trabajo|Direcci[oó]n del Trabajo/.test(despidoHtml) &&
        /acoso sexual/i.test(despidoHtml) &&
        !/<input[^>]*id="acoso/.test(despidoHtml) &&
        !existsSync(join(root, "art-168.html")) &&
        !existsSync(join(root, "recargo-168.html")) &&
        !existsSync(join(root, "recargo-despido-injustificado.html")),
    );
    assert(
      "SEO despido métrica principal es el recargo art. 168",
      /Recargo del art[ií]culo 168/.test(despidoHtml) &&
        !/<p class="metric-label">Indemnizaci[oó]n por a[nñ]os de servicio<\/p>/.test(despidoHtml),
    );
    assert(
      "home y nav enlazan /despido-injustificado",
      /href="\/despido-injustificado"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/despido-injustificado" data-nav>Despido injustificado<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/despido-injustificado" data-nav>Despido injustificado<\/a>/.test(despidoHtml),
    );
    assert(
      "sitemap incluye /despido-injustificado",
      locs.includes("https://www.haberes.cl/despido-injustificado") &&
        lastmodForPath("/despido-injustificado") === "2026-09-13",
    );
    assert(
      "seo-map documenta /despido-injustificado y no-canibalizar hermanas",
      /\/despido-injustificado/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/finiquito`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no crear `\/art-168` ni `\/recargo-168`/i.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ),
    );
    assert(
      "finiquito, IAS y aviso enlazan /tutela-laboral",
      /href="\/tutela-laboral"/.test(finiHtmlT) &&
        /href="\/tutela-laboral"/.test(iasHtmlT) &&
        /href="\/tutela-laboral"/.test(avisoHtmlT),
    );
    assert(
      "hub /guias enlaza /tutela-laboral en el cluster de finiquito",
      /href="\/tutela-laboral"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Finiquito<\/h2>[\s\S]*href="\/tutela-laboral"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "alias /indemnizacion-tutela y /indemnizacion-derechos-fundamentales redirigen a /tutela-laboral",
      Array.isArray(vercelTutela.redirects) &&
        vercelTutela.redirects.some(
          (r) => r.source === "/indemnizacion-tutela" && r.destination === "/tutela-laboral" && r.permanent === true,
        ) &&
        vercelTutela.redirects.some(
          (r) =>
            r.source === "/indemnizacion-derechos-fundamentales" &&
            r.destination === "/tutela-laboral" &&
            r.permanent === true,
        ),
    );
    assert(
      "finiquito, IAS y aviso enlazan /despido-injustificado",
      /href="\/despido-injustificado"/.test(finiHtmlD) &&
        /href="\/despido-injustificado"/.test(iasHtmlD) &&
        /href="\/despido-injustificado"/.test(avisoHtmlD),
    );
    assert(
      "hub /guias enlaza /despido-injustificado en el cluster de finiquito",
      /href="\/despido-injustificado"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Finiquito<\/h2>[\s\S]*href="\/despido-injustificado"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
    assert(
      "alias /recargo-despido-injustificado e /indemnizacion-despido-injustificado redirigen a /despido-injustificado",
      Array.isArray(vercelDespido.redirects) &&
        vercelDespido.redirects.some(
          (r) =>
            r.source === "/recargo-despido-injustificado" &&
            r.destination === "/despido-injustificado" &&
            r.permanent === true,
        ) &&
        vercelDespido.redirects.some(
          (r) =>
            r.source === "/indemnizacion-despido-injustificado" &&
            r.destination === "/despido-injustificado" &&
            r.permanent === true,
        ),
    );
  }
  {
    const grHtml = readFileSync(join(root, "gratificacion.html"), "utf8");
    const grTitle = (grHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const grH1 = (grHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const sueldoTitle = (readFileSync(join(root, "sueldo.html"), "utf8").match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (readFileSync(join(root, "sueldo.html"), "utf8").match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const guideHtml = readFileSync(join(root, "guias/gratificacion-legal.html"), "utf8");
    const guideTitle = (guideHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const guideH1 = (guideHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const guideDesc = (guideHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const grDesc = (grHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    assert(
      "SEO title gratificación apunta a calcular gratificación",
      /calcular gratificaci[oó]n/i.test(grTitle) &&
        !/sueldo l[ií]quido/i.test(grTitle) &&
        !/gratificaci[oó]n legal en Chile/i.test(grTitle) &&
        grTitle !== sueldoTitle &&
        grTitle !== guideTitle &&
        grTitle.length <= 65,
      grTitle,
    );
    assert(
      "SEO H1 gratificación distinto de /sueldo y de la guía",
      /calcular gratificaci[oó]n/i.test(grH1) &&
        grH1 !== sueldoH1 &&
        grH1 !== guideH1 &&
        !/sueldo l[ií]quido/i.test(grH1) &&
        !/qu[eé] es la gratificaci[oó]n legal/i.test(grH1),
      grH1,
    );
    assert("SEO gratificación meta distinta de la guía", grDesc && guideDesc && grDesc !== guideDesc, grDesc);
    assert("SEO gratificación cita art. 50", /art[ií]culo 50/i.test(grHtml) && /C[oó]digo del Trabajo/.test(grHtml));
    assert("SEO gratificación 25 % y tope", /25\s*%/.test(grHtml) && /219\.?115/.test(grHtml));
    assert(
      "SEO gratificación ejemplos 800000 y 900000",
      gratificacionArt50(800_000) === 200_000 &&
        gratificacionArt50(900_000) === GRATIFICACION_TOPE &&
        /\$800\.000/.test(grHtml) &&
        /\$200\.000/.test(grHtml) &&
        /\$900\.000/.test(grHtml) &&
        /\$219\.115/.test(grHtml),
    );
    assert(
      "SEO gratificación enlaza guía y sueldo",
      /href="\/guias\/gratificacion-legal"/.test(grHtml) && /href="\/sueldo"/.test(grHtml),
    );
    assert("SEO guía gratificación enlaza la calculadora", /href="\/gratificacion"/.test(guideHtml));
    assert(
      "home y nav enlazan /gratificacion",
      /href="\/gratificacion"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/gratificacion" data-nav>Gratificaci[oó]n<\/a>/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/gratificacion" data-nav>Gratificaci[oó]n<\/a>/.test(grHtml),
    );
    assert(
      "sitemap incluye /gratificacion",
      locs.includes("https://www.haberes.cl/gratificacion") && lastmodForPath("/gratificacion") === "2026-08-22",
    );
    assert(
      "GUIDES gratificacion-legal apunta a /gratificacion",
      GUIDES.find((g) => g.slug === "gratificacion-legal")?.calc === "/gratificacion",
    );
  }
  {
    const iuHtml = readFileSync(join(root, "impuesto-unico.html"), "utf8");
    const iuTitle = (iuHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const iuH1 = (iuHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const sueldoTitle = (readFileSync(join(root, "sueldo.html"), "utf8").match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (readFileSync(join(root, "sueldo.html"), "utf8").match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const guideHtml = readFileSync(join(root, "guias/impuesto-unico.html"), "utf8");
    const guideTitle = (guideHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const guideH1 = (guideHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const guideDesc = (guideHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const iuDesc = (iuHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    assert(
      "SEO title impuesto único apunta a calcular impuesto único",
      /calcular impuesto [uú]nico/i.test(iuTitle) &&
        !/sueldo l[ií]quido/i.test(iuTitle) &&
        !/c[oó]mo se calcula el impuesto [uú]nico/i.test(iuTitle) &&
        iuTitle !== sueldoTitle &&
        iuTitle !== guideTitle &&
        iuTitle.length <= 65,
      iuTitle,
    );
    assert(
      "SEO H1 impuesto único distinto de /sueldo y de la guía",
      /calcular impuesto [uú]nico/i.test(iuH1) &&
        iuH1 !== sueldoH1 &&
        iuH1 !== guideH1 &&
        !/sueldo l[ií]quido/i.test(iuH1) &&
        !/c[oó]mo se calcula el impuesto [uú]nico en el sueldo/i.test(iuH1),
      iuH1,
    );
    assert("SEO impuesto único meta distinta de la guía", iuDesc && guideDesc && iuDesc !== guideDesc, iuDesc);
    assert(
      "SEO impuesto único cita tabla SII y 13,5 UTM",
      /13,5 UTM/.test(iuHtml) &&
        /967\.261,50/.test(iuHtml) &&
        /sii\.cl\/valores_y_fechas\/impuesto_2da_categoria\/impuesto2026\.htm/.test(iuHtml),
    );
    assert(
      "SEO impuesto único ejemplos 800000 y 1500000",
      calcularIusc(800_000) === 0 &&
        calcularIusc(1_500_000) === 21310 &&
        /\$800\.000/.test(iuHtml) &&
        /\$1\.500\.000/.test(iuHtml) &&
        /\$21\.310/.test(iuHtml),
    );
    assert("SEO impuesto único FAQPage", /"@type": "FAQPage"/.test(iuHtml));
    assert(
      "SEO impuesto único enlaza guía y sueldo",
      /href="\/guias\/impuesto-unico"/.test(iuHtml) && /href="\/sueldo"/.test(iuHtml),
    );
    assert("SEO guía impuesto único enlaza la calculadora", /href="\/impuesto-unico"/.test(guideHtml));
    assert(
      "home y nav enlazan /impuesto-unico",
      /href="\/impuesto-unico"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/impuesto-unico" data-nav>Impuesto [uú]nico<\/a>/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/impuesto-unico" data-nav>Impuesto [uú]nico<\/a>/.test(iuHtml),
    );
    assert(
      "sitemap incluye /impuesto-unico",
      locs.includes("https://www.haberes.cl/impuesto-unico") && lastmodForPath("/impuesto-unico") === "2026-08-23",
    );
    assert(
      "GUIDES impuesto-unico apunta a /impuesto-unico",
      GUIDES.find((g) => g.slug === "impuesto-unico")?.calc === "/impuesto-unico",
    );
    assert(
      "seo-calc IUSC CTA apunta a /impuesto-unico",
      /href="\/impuesto-unico"/.test(readFileSync(join(root, "js/seo-calc.js"), "utf8")),
    );
    assert(
      "seo-calc aguinaldo CTA apunta a /aguinaldo",
      /href="\/aguinaldo"/.test(readFileSync(join(root, "js/seo-calc.js"), "utf8")) &&
        /aguinaldo:\s*mountAguinaldo/.test(readFileSync(join(root, "js/seo-calc.js"), "utf8")),
    );
  }
  {
    const cpHtml = readFileSync(join(root, "cotizaciones-previsionales.html"), "utf8");
    const cpTitle = (cpHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const cpH1 = (cpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
    const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const iuHtml = readFileSync(join(root, "impuesto-unico.html"), "utf8");
    const iuTitle = (iuHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const iuH1 = (iuHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const liqHtml = readFileSync(join(root, "guias/liquidacion-de-sueldo.html"), "utf8");
    const liqTitle = (liqHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const liqH1 = (liqHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const prevHtml = readFileSync(join(root, "guias/liquidacion-de-sueldo-y-previred.html"), "utf8");
    const prevTitle = (prevHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const prevH1 = (prevHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const leerHtml = readFileSync(join(root, "guias/como-leer-una-liquidacion-de-sueldo.html"), "utf8");
    const leerTitle = (leerHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const leerH1 = (leerHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const cpDesc = (cpHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const demo = calcularSueldo(
      { sueldoBase: 800_000, afp: "modelo", salud: "fonasa", contrato: "indefinido" },
      { uf: FALLBACK_UF },
    );
    const demoTotal = demo.afp.monto + demo.salud.monto + demo.cesantia.monto;
    const topeDemo = calcularSueldo(
      { sueldoBase: 10_000_000, afp: "modelo", salud: "fonasa", contrato: "indefinido" },
      { uf: FALLBACK_UF },
    );
    assert(
      "SEO title cotizaciones previsionales apunta a calcular cotizaciones",
      /calcular cotizaciones previsionales/i.test(cpTitle) &&
        !/sueldo l[ií]quido/i.test(cpTitle) &&
        !/impuesto [uú]nico/i.test(cpTitle) &&
        cpTitle !== sueldoTitle &&
        cpTitle !== iuTitle &&
        cpTitle !== liqTitle &&
        cpTitle !== prevTitle &&
        cpTitle !== leerTitle &&
        cpTitle.length <= 65,
      cpTitle,
    );
    assert(
      "SEO H1 cotizaciones previsionales distinto de /sueldo y guías de liquidación",
      /calcular cotizaciones previsionales/i.test(cpH1) &&
        cpH1 !== sueldoH1 &&
        cpH1 !== iuH1 &&
        cpH1 !== liqH1 &&
        cpH1 !== prevH1 &&
        cpH1 !== leerH1 &&
        !/sueldo l[ií]quido/i.test(cpH1),
      cpH1,
    );
    assert("SEO cotizaciones meta distinta de /sueldo", cpDesc && cpDesc !== ((sueldoHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""));
    assert(
      "SEO cotizaciones cita topes UF de constants",
      new RegExp(`${TOPE_AFP_SALUD_UF}\\s*UF`).test(cpHtml) &&
        /135,2 UF/.test(cpHtml),
    );
    assert(
      "SEO cotizaciones ejemplo 800000 Modelo no deriva",
      demo.afp.monto === 84640 &&
        demo.salud.monto === 56000 &&
        demo.cesantia.monto === 4800 &&
        demoTotal === 145440 &&
        cpHtml.includes(clp(demo.afp.monto)) &&
        cpHtml.includes(clp(demo.salud.monto)) &&
        cpHtml.includes(clp(demo.cesantia.monto)) &&
        cpHtml.includes(clp(demoTotal)) &&
        /\$800\.000/.test(cpHtml),
    );
    assert(
      "SEO cotizaciones tope AFP/salud 90 UF en el motor",
      close(topeDemo.baseAfpSalud, TOPE_AFP_SALUD_UF * FALLBACK_UF, 0.1) &&
        close(topeDemo.baseCesantia, TOPE_CESANTIA_UF * FALLBACK_UF, 0.1),
    );
    assert("SEO cotizaciones FAQPage", /"@type": "FAQPage"/.test(cpHtml));
    assert(
      "SEO cotizaciones no inventa tasas de empleador",
      /href="\/costo-empresa"/.test(cpHtml) &&
        !/todav[ií]a no modela/.test(cpHtml) &&
        !/SIS\s+\d/.test(cpHtml) &&
        !/mutual\s+\d/i.test(cpHtml),
    );
    assert(
      "SEO cotizaciones enlaza sueldo y guías de liquidación",
      /href="\/sueldo"/.test(cpHtml) &&
        /href="\/guias\/liquidacion-de-sueldo"/.test(cpHtml) &&
        /href="\/guias\/liquidacion-de-sueldo-y-previred"/.test(cpHtml) &&
        /href="\/guias\/como-leer-una-liquidacion-de-sueldo"/.test(cpHtml) &&
        /href="\/empresa"/.test(cpHtml),
    );
    assert(
      "SEO guías de liquidación enlazan /cotizaciones-previsionales",
      /href="\/cotizaciones-previsionales"/.test(liqHtml) &&
        /href="\/cotizaciones-previsionales"/.test(prevHtml) &&
        /href="\/cotizaciones-previsionales"/.test(leerHtml),
    );
    assert(
      "home y nav enlazan /cotizaciones-previsionales",
      /href="\/cotizaciones-previsionales"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/cotizaciones-previsionales" data-nav>Cotizaciones previsionales<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/cotizaciones-previsionales" data-nav>Cotizaciones previsionales<\/a>/.test(cpHtml),
    );
    assert(
      "sitemap incluye /cotizaciones-previsionales",
      locs.includes("https://www.haberes.cl/cotizaciones-previsionales") &&
        lastmodForPath("/cotizaciones-previsionales") === "2026-08-26",
    );
    assert(
      "no se crean URLs hermanas de cotizaciones",
      !existsSync(join(root, "cotizacion-afp.html")) &&
        !existsSync(join(root, "descuentos-legales.html")) &&
        !existsSync(join(root, "calculadora-sueldo.html")),
    );
    assert(
      "seo-map documenta /cotizaciones-previsionales y no-canibalizar /sueldo",
      /\/cotizaciones-previsionales/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/sueldo`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
  }
  {
    const rdHtml = readFileSync(join(root, "recargo-domingo-comercio.html"), "utf8");
    const rdTitle = (rdHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const rdH1 = (rdHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const rdDesc = (rdHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const heHtml = readFileSync(join(root, "horas-extras.html"), "utf8");
    const heTitle = (heHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const heH1 = (heHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
    const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const guideHtml = readFileSync(join(root, "guias/horas-extras.html"), "utf8");
    const guideTitle = (guideHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const guideH1 = (guideHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const demo = calcularRecargoDomingoComercio({ sueldoBase: 800000, jornada: 42, horasOrdinarias: 8 });
    assert(
      "SEO title recargo domingo comercio apunta a calcular recargo domingo",
      /calcular recargo domingo comercio/i.test(rdTitle) &&
        !/horas extras/i.test(rdTitle) &&
        !/sueldo l[ií]quido/i.test(rdTitle) &&
        rdTitle !== heTitle &&
        rdTitle !== sueldoTitle &&
        rdTitle !== guideTitle &&
        rdTitle.length <= 65,
      rdTitle,
    );
    assert(
      "SEO H1 recargo domingo comercio distinto de /horas-extras y /sueldo",
      /calcular recargo domingo comercio/i.test(rdH1) &&
        rdH1 !== heH1 &&
        rdH1 !== sueldoH1 &&
        rdH1 !== guideH1 &&
        !/horas extras/i.test(rdH1) &&
        !/sueldo l[ií]quido/i.test(rdH1),
      rdH1,
    );
    assert("SEO recargo domingo meta distinta de /horas-extras", rdDesc && rdDesc !== ((heHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""));
    assert(
      "SEO recargo domingo cita art. 38 N°7 y Código",
      /art[ií]culo 38/i.test(rdHtml) &&
        /N[°º]\s*7/.test(rdHtml) &&
        /C[oó]digo del Trabajo/.test(rdHtml),
    );
    assert("SEO recargo domingo recargo mínimo 30 %", /30\s*%/.test(rdHtml) && /m[ií]nimo/i.test(rdHtml));
    assert(
      "SEO recargo domingo no inventa recargo de festivo",
      /no para el festivo por (s[ií] solo|el solo hecho)/i.test(rdHtml) &&
        !/recargo de, a lo menos, un 30 %[^.]*festivo/i.test(rdHtml),
    );
    assert(
      "SEO recargo domingo ejemplo 800000/42/8h = 10667",
      Math.round(demo.recargoTotal) === 10667 &&
        /\$800\.000/.test(rdHtml) &&
        /\$10\.667/.test(rdHtml) &&
        /42 horas/.test(rdHtml),
    );
    assert("SEO recargo domingo FAQPage", /"@type": "FAQPage"/.test(rdHtml));
    assert(
      "SEO recargo domingo enlaza horas extras, sueldo y empresa",
      /href="\/horas-extras"/.test(rdHtml) && /href="\/sueldo"/.test(rdHtml) && /href="\/empresa"/.test(rdHtml),
    );
    assert(
      "SEO horas extras enlaza /recargo-domingo-comercio",
      /href="\/recargo-domingo-comercio"/.test(heHtml) && /href="\/recargo-domingo-comercio"/.test(guideHtml),
    );
    assert(
      "home y nav enlazan /recargo-domingo-comercio",
      /href="\/recargo-domingo-comercio"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/recargo-domingo-comercio" data-nav>Recargo domingo comercio<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/recargo-domingo-comercio" data-nav>Recargo domingo comercio<\/a>/.test(rdHtml),
    );
    assert(
      "sitemap incluye /recargo-domingo-comercio",
      locs.includes("https://www.haberes.cl/recargo-domingo-comercio") &&
        lastmodForPath("/recargo-domingo-comercio") === "2026-08-26",
    );
    assert(
      "no se crean URLs hermanas de recargo domingo",
      !existsSync(join(root, "horas-extras-domingo.html")) &&
        !existsSync(join(root, "recargo-festivo.html")) &&
        !existsSync(join(root, "trabajo-en-domingo.html")),
    );
    assert(
      "seo-map documenta /recargo-domingo-comercio y no-canibalizar /horas-extras",
      /\/recargo-domingo-comercio/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/horas-extras`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
  }
  {
    const fiHtml = readFileSync(join(root, "feriado-irrenunciable.html"), "utf8");
    const fiTitle = (fiHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const fiH1 = (fiHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const fiDesc = (fiHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const heHtml = readFileSync(join(root, "horas-extras.html"), "utf8");
    const heTitle = (heHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const heH1 = (heHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const rdHtml = readFileSync(join(root, "recargo-domingo-comercio.html"), "utf8");
    const rdTitle = (rdHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const rdH1 = (rdHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const agHtml = readFileSync(join(root, "aguinaldo.html"), "utf8");
    const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
    const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const fpHtml = readFileSync(join(root, "feriado-progresivo.html"), "utf8");
    const fpH1 = (fpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const demo = calcularFeriadoIrrenunciable({ sueldoBase: 800000, jornada: 42, horasTrabajadas: 8 });
    assert(
      "SEO title feriado irrenunciable apunta a calcular pago feriado irrenunciable",
      /calcular pago feriado irrenunciable/i.test(fiTitle) &&
        !/horas extras/i.test(fiTitle) &&
        !/sueldo l[ií]quido/i.test(fiTitle) &&
        !/recargo domingo/i.test(fiTitle) &&
        fiTitle !== heTitle &&
        fiTitle !== rdTitle &&
        fiTitle !== sueldoTitle &&
        fiTitle.length <= 65,
      fiTitle,
    );
    assert(
      "SEO H1 feriado irrenunciable distinto de hermanas",
      /calcular pago feriado irrenunciable/i.test(fiH1) &&
        fiH1 !== heH1 &&
        fiH1 !== rdH1 &&
        fiH1 !== sueldoH1 &&
        fiH1 !== fpH1 &&
        !/horas extras/i.test(fiH1) &&
        !/sueldo l[ií]quido/i.test(fiH1),
      fiH1,
    );
    assert(
      "SEO feriado irrenunciable meta distinta de /horas-extras y /recargo-domingo-comercio",
      fiDesc &&
        fiDesc !== ((heHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        fiDesc !== ((rdHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO feriado irrenunciable cita art. 32, Ley 19.973 y DT",
      /art[ií]culo 32/i.test(fiHtml) &&
        /19\.973/.test(fiHtml) &&
        /C[oó]digo del Trabajo/.test(fiHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(fiHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=220220/.test(fiHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-95017/.test(fiHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-110218/.test(fiHtml),
    );
    assert(
      "SEO feriado irrenunciable lista 2026 y Fiestas Patrias viernes/sábado",
      /1 de enero/.test(fiHtml) &&
        /1 de mayo/.test(fiHtml) &&
        /18/.test(fiHtml) &&
        /19 de septiembre/.test(fiHtml) &&
        /25 de diciembre/.test(fiHtml) &&
        /viernes/.test(fiHtml) &&
        /s[aá]bado/.test(fiHtml),
    );
    assert(
      "SEO feriado irrenunciable jornada 42 y Ley 21.561",
      /42 horas/.test(fiHtml) && /Ley 21\.561/.test(fiHtml),
    );
    assert(
      "SEO feriado irrenunciable no dice que todo el comercio puede abrir",
      /no dice que todo el comercio pueda abrir/i.test(fiHtml) &&
        /no puede trabajar ese d[ií]a/i.test(fiHtml),
    );
    assert(
      "SEO feriado irrenunciable ejemplo 800000/42/8h = 53333",
      Math.round(demo.total) === 53333 &&
        /\$800\.000/.test(fiHtml) &&
        /\$53\.333/.test(fiHtml) &&
        /42 horas/.test(fiHtml),
    );
    assert("SEO feriado irrenunciable FAQPage", /"@type": "FAQPage"/.test(fiHtml));
    assert(
      "SEO feriado irrenunciable no es liquidación completa",
      /no es una liquidaci[oó]n completa/i.test(fiHtml) &&
        /no descuenta AFP/i.test(fiHtml),
    );
    assert(
      "SEO feriado irrenunciable no inventa URLs hermanas",
      /no abre URLs hermanas/i.test(fiHtml) &&
        !existsSync(join(root, "pago-feriado.html")) &&
        !existsSync(join(root, "trabajo-feriado.html")) &&
        !existsSync(join(root, "feriados.html")) &&
        !existsSync(join(root, "irrenunciable.html")),
    );
    assert(
      "SEO feriado irrenunciable enlaza horas extras, recargo domingo, sueldo, aguinaldo y empresa",
      /href="\/horas-extras"/.test(fiHtml) &&
        /href="\/recargo-domingo-comercio"/.test(fiHtml) &&
        /href="\/sueldo"/.test(fiHtml) &&
        /href="\/aguinaldo"/.test(fiHtml) &&
        /href="\/empresa"/.test(fiHtml),
    );
    assert(
      "SEO hermanas enlazan /feriado-irrenunciable",
      /href="\/feriado-irrenunciable"/.test(heHtml) &&
        /href="\/feriado-irrenunciable"/.test(rdHtml) &&
        /href="\/feriado-irrenunciable"/.test(sueldoHtml) &&
        /href="\/feriado-irrenunciable"/.test(agHtml),
    );
    assert(
      "home y nav enlazan /feriado-irrenunciable",
      /href="\/feriado-irrenunciable"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/feriado-irrenunciable" data-nav>Feriado irrenunciable<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/feriado-irrenunciable" data-nav>Feriado irrenunciable<\/a>/.test(fiHtml),
    );
    assert(
      "sitemap incluye /feriado-irrenunciable",
      locs.includes("https://www.haberes.cl/feriado-irrenunciable") &&
        lastmodForPath("/feriado-irrenunciable") === "2026-09-02",
    );
    assert(
      "seo-map documenta /feriado-irrenunciable y no-canibalizar /horas-extras",
      /\/feriado-irrenunciable/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/horas-extras`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no crear `\/pago-feriado`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /feriado-irrenunciable",
      /href="\/feriado-irrenunciable"/.test(readFileSync(join(root, "guias.html"), "utf8")),
    );
  }
  {
    const afHtml = readFileSync(join(root, "asignacion-familiar.html"), "utf8");
    const afTitle = (afHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const afH1 = (afHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const afDesc = (afHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
    const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const cpHtml = readFileSync(join(root, "cotizaciones-previsionales.html"), "utf8");
    const cpTitle = (cpHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const cpH1 = (cpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const liqHtml = readFileSync(join(root, "guias/liquidacion-de-sueldo.html"), "utf8");
    const liqTitle = (liqHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const liqH1 = (liqHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const demo = calcularAsignacionFamiliar({ ingresoMensual: 600_000, cargas: 2 });
    const mixto = calcularAsignacionFamiliar({ ingresoMensual: 600_000, cargas: 1, cargasInvalidez: 1 });
    assert(
      "SEO title asignación familiar apunta a calcular asignación familiar",
      /calcular asignaci[oó]n familiar/i.test(afTitle) &&
        !/sueldo l[ií]quido/i.test(afTitle) &&
        !/cotizaciones previsionales/i.test(afTitle) &&
        afTitle !== sueldoTitle &&
        afTitle !== cpTitle &&
        afTitle !== liqTitle &&
        afTitle.length <= 65,
      afTitle,
    );
    assert(
      "SEO H1 asignación familiar distinto de /sueldo y liquidación",
      /calcular asignaci[oó]n familiar/i.test(afH1) &&
        afH1 !== sueldoH1 &&
        afH1 !== cpH1 &&
        afH1 !== liqH1 &&
        !/sueldo l[ií]quido/i.test(afH1),
      afH1,
    );
    assert(
      "SEO asignación familiar meta distinta de /sueldo",
      afDesc && afDesc !== ((sueldoHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO asignación familiar cita Ley 21.830 y tramos",
      /21\.830/.test(afHtml) &&
        /22\.601/.test(afHtml) &&
        /649\.039/.test(afHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-85651/.test(afHtml) &&
        /suseso\.gob\.cl\/612\/w3-article-686804/.test(afHtml),
    );
    assert(
      "SEO asignación familiar ejemplo 600000 / 2 cargas = 45202",
      demo.total === 45202 &&
        mixto.total === 67803 &&
        /\$600\.000/.test(afHtml) &&
        /\$22\.601/.test(afHtml) &&
        /\$45\.202/.test(afHtml) &&
        /\$67\.803/.test(afHtml),
    );
    assert("SEO asignación familiar FAQPage", /"@type": "FAQPage"/.test(afHtml));
    assert(
      "SEO asignación familiar no es segunda liquidación",
      /no arma una segunda liquidaci[oó]n/i.test(afHtml) &&
        /no constituyen remuneraci[oó]n/i.test(afHtml) &&
        !/renta l[ií]quida imponible/i.test(afHtml),
    );
    assert(
      "SEO asignación familiar distingue SUF y no inventa /suf",
      /SUF/.test(afHtml) &&
        /18\.020/.test(afHtml) &&
        /no abre una p[aá]gina \/suf/i.test(afHtml) &&
        !existsSync(join(root, "suf.html")) &&
        !existsSync(join(root, "asignacion-maternal.html")) &&
        !existsSync(join(root, "cargas-familiares.html")),
    );
    assert(
      "SEO asignación familiar enlaza sueldo, empresa y guías de liquidación",
      /href="\/sueldo"/.test(afHtml) &&
        /href="\/empresa"/.test(afHtml) &&
        /href="\/guias\/liquidacion-de-sueldo"/.test(afHtml) &&
        /href="\/guias\/como-leer-una-liquidacion-de-sueldo"/.test(afHtml) &&
        /href="\/guias\/formato-de-liquidacion-de-sueldo-chile"/.test(afHtml) &&
        /href="\/guias\/liquidacion-de-sueldo-y-previred"/.test(afHtml),
    );
    assert(
      "SEO guías de liquidación enlazan /asignacion-familiar",
      /href="\/asignacion-familiar"/.test(liqHtml) &&
        /href="\/asignacion-familiar"/.test(
          readFileSync(join(root, "guias/como-leer-una-liquidacion-de-sueldo.html"), "utf8"),
        ) &&
        /href="\/asignacion-familiar"/.test(
          readFileSync(join(root, "guias/formato-de-liquidacion-de-sueldo-chile.html"), "utf8"),
        ) &&
        /href="\/asignacion-familiar"/.test(
          readFileSync(join(root, "guias/liquidacion-de-sueldo-y-previred.html"), "utf8"),
        ),
    );
    assert(
      "home y nav enlazan /asignacion-familiar",
      /href="\/asignacion-familiar"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/asignacion-familiar" data-nav>Asignaci[oó]n familiar<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/asignacion-familiar" data-nav>Asignaci[oó]n familiar<\/a>/.test(afHtml),
    );
    assert(
      "sitemap incluye /asignacion-familiar",
      locs.includes("https://www.haberes.cl/asignacion-familiar") &&
        lastmodForPath("/asignacion-familiar") === "2026-08-27",
    );
    assert(
      "seo-map documenta /asignacion-familiar y no-canibalizar /sueldo",
      /\/asignacion-familiar/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/sueldo`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no crear `\/suf`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
  }
  {
    const cmHtml = readFileSync(join(root, "colacion-movilizacion.html"), "utf8");
    const cmTitle = (cmHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const cmH1 = (cmHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const cmDesc = (cmHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
    const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const cpHtml = readFileSync(join(root, "cotizaciones-previsionales.html"), "utf8");
    const cpTitle = (cpHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const cpH1 = (cpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const ceHtml = readFileSync(join(root, "costo-empresa.html"), "utf8");
    const ceTitle = (ceHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const ceH1 = (ceHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const liqHtml = readFileSync(join(root, "guias/liquidacion-de-sueldo.html"), "utf8");
    const liqTitle = (liqHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const liqH1 = (liqHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const demo = calcularColacionMovilizacion({
      colacion: 50_000,
      movilizacion: 40_000,
      sueldoBase: 800_000,
    });
    const comoImp = calcularColacionMovilizacion({
      colacion: 50_000,
      movilizacion: 40_000,
      sueldoBase: 800_000,
      colacionNoImponible: false,
      movilizacionNoImponible: false,
    });
    assert(
      "SEO title colación y movilización apunta a calcular colación y movilización",
      /calcular colaci[oó]n y movilizaci[oó]n/i.test(cmTitle) &&
        !/sueldo l[ií]quido/i.test(cmTitle) &&
        !/cotizaciones previsionales/i.test(cmTitle) &&
        !/costo empresa/i.test(cmTitle) &&
        cmTitle !== sueldoTitle &&
        cmTitle !== cpTitle &&
        cmTitle !== ceTitle &&
        cmTitle !== liqTitle &&
        cmTitle.length <= 65,
      cmTitle,
    );
    assert(
      "SEO H1 colación y movilización distinto de /sueldo, cotizaciones y costo empresa",
      /calcular colaci[oó]n y movilizaci[oó]n/i.test(cmH1) &&
        cmH1 !== sueldoH1 &&
        cmH1 !== cpH1 &&
        cmH1 !== ceH1 &&
        cmH1 !== liqH1 &&
        !/sueldo l[ií]quido/i.test(cmH1),
      cmH1,
    );
    assert(
      "SEO colación y movilización meta distinta de /sueldo",
      cmDesc && cmDesc !== ((sueldoHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO colación y movilización cita CT art. 41",
      /art[ií]culo 41/i.test(cmHtml) &&
        /C[oó]digo del Trabajo/.test(cmHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(cmHtml),
    );
    assert(
      "SEO colación y movilización ejemplo 50000 + 40000 = 90000",
      demo.totalAsignaciones === 90_000 &&
        demo.extraImponible === 0 &&
        demo.extraLiquido === 90_000 &&
        comoImp.extraLiquido === 73_638 &&
        /\$50\.000/.test(cmHtml) &&
        /\$40\.000/.test(cmHtml) &&
        /\$90\.000/.test(cmHtml) &&
        /\$73\.638/.test(cmHtml) &&
        /\$16\.362/.test(cmHtml),
    );
    assert("SEO colación y movilización FAQPage", /"@type": "FAQPage"/.test(cmHtml));
    assert(
      "SEO colación y movilización no es segunda liquidación",
      /no arma una segunda liquidaci[oó]n/i.test(cmHtml) &&
        /no constituyen remuneraci[oó]n/i.test(cmHtml),
    );
    assert(
      "SEO colación y movilización no inventa /colacion",
      /no abre URLs hermanas/i.test(cmHtml) &&
        !existsSync(join(root, "colacion.html")) &&
        !existsSync(join(root, "movilizacion.html")) &&
        !existsSync(join(root, "asignacion-colacion.html")),
    );
    assert(
      "SEO colación y movilización enlaza sueldo, empresa y guías de liquidación",
      /href="\/sueldo"/.test(cmHtml) &&
        /href="\/empresa"/.test(cmHtml) &&
        /href="\/guias\/liquidacion-de-sueldo"/.test(cmHtml) &&
        /href="\/guias\/como-leer-una-liquidacion-de-sueldo"/.test(cmHtml) &&
        /href="\/guias\/formato-de-liquidacion-de-sueldo-chile"/.test(cmHtml) &&
        /href="\/guias\/liquidacion-de-sueldo-y-previred"/.test(cmHtml),
    );
    assert(
      "SEO guías de liquidación enlazan /colacion-movilizacion",
      /href="\/colacion-movilizacion"/.test(liqHtml) &&
        /href="\/colacion-movilizacion"/.test(
          readFileSync(join(root, "guias/como-leer-una-liquidacion-de-sueldo.html"), "utf8"),
        ) &&
        /href="\/colacion-movilizacion"/.test(
          readFileSync(join(root, "guias/formato-de-liquidacion-de-sueldo-chile.html"), "utf8"),
        ) &&
        /href="\/colacion-movilizacion"/.test(
          readFileSync(join(root, "guias/liquidacion-de-sueldo-y-previred.html"), "utf8"),
        ),
    );
    assert(
      "home y nav enlazan /colacion-movilizacion",
      /href="\/colacion-movilizacion"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/colacion-movilizacion" data-nav>Colaci[oó]n y movilizaci[oó]n<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/colacion-movilizacion" data-nav>Colaci[oó]n y movilizaci[oó]n<\/a>/.test(cmHtml),
    );
    assert(
      "sitemap incluye /colacion-movilizacion",
      locs.includes("https://www.haberes.cl/colacion-movilizacion") &&
        lastmodForPath("/colacion-movilizacion") === "2026-09-01",
    );
    assert(
      "seo-map documenta /colacion-movilizacion y no-canibalizar /sueldo",
      /\/colacion-movilizacion/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/sueldo`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no crear `\/colacion`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /colacion-movilizacion",
      /href="\/colacion-movilizacion"/.test(readFileSync(join(root, "guias.html"), "utf8")),
    );
    assert(
      "sueldo enlaza /colacion-movilizacion",
      /href="\/colacion-movilizacion"/.test(sueldoHtml),
    );
  }
  {
    const viaHtml = readFileSync(join(root, "viatico.html"), "utf8");
    const viaTitle = (viaHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const viaH1 = (viaHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const viaDesc = (viaHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const cmHtmlVia = readFileSync(join(root, "colacion-movilizacion.html"), "utf8");
    const sueldoHtmlVia = readFileSync(join(root, "sueldo.html"), "utf8");
    const noImp = calcularViatico({ montoDiario: 45_000, dias: 5, sueldoBase: 800_000 });
    const imp = calcularViatico({
      montoDiario: 45_000,
      dias: 5,
      sueldoBase: 800_000,
      imponible: true,
    });
    assert(
      "SEO title viático apunta a calcular viático",
      /calcular vi[aá]tico/i.test(viaTitle) &&
        !/colaci[oó]n y movilizaci[oó]n/i.test(viaTitle) &&
        !/sueldo l[ií]quido/i.test(viaTitle) &&
        viaTitle !== ((cmHtmlVia.match(/<title>([^<]*)<\/title>/) || [])[1] || "") &&
        viaTitle !== ((sueldoHtmlVia.match(/<title>([^<]*)<\/title>/) || [])[1] || "") &&
        viaTitle.length <= 65,
      viaTitle,
    );
    assert(
      "SEO H1 viático Chile 2026",
      viaH1 === "Calcular viático Chile 2026" && !/sueldo l[ií]quido/i.test(viaH1),
      viaH1,
    );
    assert(
      "SEO viático meta distinta de /colacion-movilizacion",
      viaDesc &&
        viaDesc !== ((cmHtmlVia.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO viático cita CT art. 41, DT y SII",
      /art[ií]culo 41/i.test(viaHtml) &&
        /C[oó]digo del Trabajo/.test(viaHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(viaHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60238/.test(viaHtml) &&
        /dt\.gob\.cl\/legislacion\/1624\/w3-article-112157/.test(viaHtml) &&
        /art[ií]culo 17/.test(viaHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=6368/.test(viaHtml) &&
        /"@type": "FAQPage"/.test(viaHtml),
    );
    assert(
      "SEO viático ejemplo 45000 × 5 = 225000 y extra líquido 184095",
      noImp.total === 225_000 &&
        noImp.noImponible === 225_000 &&
        noImp.extraImponible === 0 &&
        noImp.extraLiquido === 225_000 &&
        imp.extraImponible === 225_000 &&
        imp.extraLiquido === 184_095 &&
        imp.extraLiquido < 225_000 &&
        /\$45\.000/.test(viaHtml) &&
        /\$225\.000/.test(viaHtml) &&
        /\$184\.095/.test(viaHtml) &&
        /\$40\.905/.test(viaHtml) &&
        /Ingrese monto diario y d[ií]as de comisi[oó]n para estimar\./.test(
          readFileSync(join(root, "js/app-viatico.js"), "utf8"),
        ),
    );
    assert(
      "SEO viático no es tabla pública ni colación",
      /no hay tabla legal de vi[aá]ticos para el sector privado/i.test(viaHtml) &&
        /otro r[eé]gimen/i.test(viaHtml) &&
        /lugar habitual/i.test(viaHtml) &&
        /no inventa un tope/i.test(viaHtml) &&
        /estimaci[oó]n educativa/.test(viaHtml) &&
        /no constituye asesor[ií]a legal/i.test(viaHtml),
    );
    assert(
      "SEO viático no inventa hermanas",
      /no abre URLs hermanas/i.test(viaHtml) &&
        !existsSync(join(root, "viaticos.html")) &&
        !existsSync(join(root, "viatico-chile.html")) &&
        !existsSync(join(root, "asignacion-viatico.html")) &&
        !existsSync(join(root, "gastos-de-viaje.html")) &&
        !existsSync(join(root, "tabla-viaticos.html")) &&
        !existsSync(join(root, "viatico-sii.html")) &&
        !existsSync(join(root, "viatico-funcionario.html")) &&
        !existsSync(join(root, "viatico-municipal.html")) &&
        !existsSync(join(root, "per-diem.html")),
    );
    assert(
      "viático enlaza colación y sueldo; colación enlaza viático",
      /href="\/colacion-movilizacion"/.test(viaHtml) &&
        /href="\/sueldo"/.test(viaHtml) &&
        /href="\/viatico"/.test(cmHtmlVia),
    );
    assert(
      "home y nav enlazan /viatico",
      /href="\/viatico"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/viatico" data-nav>Vi[aá]tico<\/a>/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/viatico" data-nav>Vi[aá]tico<\/a>/.test(viaHtml) &&
        /href="\/viatico" data-nav>Vi[aá]tico<\/a>/.test(readFileSync(join(root, "js/ui.js"), "utf8")) &&
        /\["\/viatico", "Vi[aá]tico"\]/.test(readFileSync(join(root, "scripts/patch-nav.mjs"), "utf8")),
    );
    assert(
      "sitemap incluye /viatico",
      locs.includes("https://www.haberes.cl/viatico") && lastmodForPath("/viatico") === "2026-09-24",
    );
    assert(
      "seo-map documenta /viatico y no-canibalizar /colacion-movilizacion",
      /\/viatico/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/colacion-movilizacion`, `\/sueldo`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/viaticos`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /viatico en el cluster de liquidación",
      /href="\/viatico"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        /<h2>Liquidaci[oó]n de sueldo<\/h2>[\s\S]*href="\/viatico"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/viatico"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
  }
  {
    const smHtml = readFileSync(join(root, "sueldo-minimo.html"), "utf8");
    const smTitle = (smHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const smH1 = (smHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const smDesc = (smHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
    const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const grHtml = readFileSync(join(root, "gratificacion.html"), "utf8");
    const grTitle = (grHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const grH1 = (grHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const ceHtml = readFileSync(join(root, "costo-empresa.html"), "utf8");
    const ceTitle = (ceHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const ceH1 = (ceHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const cmHtml = readFileSync(join(root, "colacion-movilizacion.html"), "utf8");
    const demo = calcularSueldoMinimo({
      tramo: "general",
      horasSemana: 42,
      sueldoBase: 539_000,
      mesesReliquidacion: 2,
    });
    const mitad = calcularSueldoMinimo({ tramo: "general", horasSemana: 21 });
    assert(
      "SEO title sueldo mínimo apunta a calcular sueldo mínimo",
      /calcular sueldo m[ií]nimo/i.test(smTitle) &&
        !/sueldo l[ií]quido/i.test(smTitle) &&
        !/gratificaci[oó]n/i.test(smTitle) &&
        smTitle !== sueldoTitle &&
        smTitle !== grTitle &&
        smTitle !== ceTitle &&
        smTitle.length <= 65,
      smTitle,
    );
    assert(
      "SEO H1 sueldo mínimo distinto de /sueldo y /gratificacion",
      /calcular sueldo m[ií]nimo/i.test(smH1) &&
        smH1 !== sueldoH1 &&
        smH1 !== grH1 &&
        smH1 !== ceH1 &&
        !/sueldo l[ií]quido/i.test(smH1),
      smH1,
    );
    assert(
      "SEO sueldo mínimo meta distinta de /sueldo",
      smDesc && smDesc !== ((sueldoHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO sueldo mínimo cita Ley 21.830, art. 44 y CT",
      /21\.830/.test(smHtml) &&
        /art[ií]culo 44/i.test(smHtml) &&
        /C[oó]digo del Trabajo/.test(smHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=1225354/.test(smHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60141/.test(smHtml),
    );
    assert(
      "SEO sueldo mínimo montos IMM 2026",
      /553\.553/.test(smHtml) && /412\.938/.test(smHtml) && /356\.815/.test(smHtml) && /219\.115/.test(smHtml),
    );
    assert(
      "SEO sueldo mínimo jornada 42 no 45 como ordinaria",
      /42 horas/.test(smHtml) &&
        /Ley 21\.561/.test(smHtml) &&
        /no se usa 45/i.test(smHtml),
    );
    assert(
      "SEO sueldo mínimo ejemplo 539000 → gap 14553 y 21h = 276777",
      demo.gap === 14553 &&
        demo.gratificacionSobreDelta === 3638 &&
        demo.reliquidacionTotal === 36382 &&
        mitad.immProporcional === 276777 &&
        /\$539\.000/.test(smHtml) &&
        /\$14\.553/.test(smHtml) &&
        /\$3\.638/.test(smHtml) &&
        /\$276\.777/.test(smHtml) &&
        /\$36\.382/.test(smHtml),
    );
    assert("SEO sueldo mínimo FAQPage", /"@type": "FAQPage"/.test(smHtml));
    assert(
      "SEO sueldo mínimo no es segunda liquidación",
      /no arma una liquidaci[oó]n/i.test(smHtml) &&
        /no descuenta AFP/i.test(smHtml),
    );
    assert(
      "SEO sueldo mínimo no inventa /imm",
      /no abre URLs hermanas/i.test(smHtml) &&
        !existsSync(join(root, "imm.html")) &&
        !existsSync(join(root, "ingreso-minimo.html")) &&
        !existsSync(join(root, "sueldo-minimo-2026.html")),
    );
    assert(
      "SEO sueldo mínimo enlaza sueldo, gratificación, colación, costo empresa y empresa",
      /href="\/sueldo"/.test(smHtml) &&
        /href="\/gratificacion"/.test(smHtml) &&
        /href="\/colacion-movilizacion"/.test(smHtml) &&
        /href="\/costo-empresa"/.test(smHtml) &&
        /href="\/empresa"/.test(smHtml),
    );
    assert(
      "home y nav enlazan /sueldo-minimo",
      /href="\/sueldo-minimo"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/sueldo-minimo" data-nav>Sueldo m[ií]nimo<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/sueldo-minimo" data-nav>Sueldo m[ií]nimo<\/a>/.test(smHtml),
    );
    assert(
      "sitemap incluye /sueldo-minimo",
      locs.includes("https://www.haberes.cl/sueldo-minimo") &&
        lastmodForPath("/sueldo-minimo") === "2026-09-02",
    );
    assert(
      "seo-map documenta /sueldo-minimo y no-canibalizar /sueldo",
      /\/sueldo-minimo/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/sueldo`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no crear `\/imm`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "hub /guias enlaza /sueldo-minimo",
      /href="\/sueldo-minimo"/.test(readFileSync(join(root, "guias.html"), "utf8")),
    );
    assert(
      "sueldo, gratificación, colación y costo empresa enlazan /sueldo-minimo",
      /href="\/sueldo-minimo"/.test(sueldoHtml) &&
        /href="\/sueldo-minimo"/.test(grHtml) &&
        /href="\/sueldo-minimo"/.test(cmHtml) &&
        /href="\/sueldo-minimo"/.test(ceHtml),
    );
  }
  {
    const scHtml = readFileSync(join(root, "semana-corrida.html"), "utf8");
    const scTitle = (scHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const scH1 = (scHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const scDesc = (scHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const rdHtml = readFileSync(join(root, "recargo-domingo-comercio.html"), "utf8");
    const rdTitle = (rdHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const rdH1 = (rdHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const heHtml = readFileSync(join(root, "horas-extras.html"), "utf8");
    const heTitle = (heHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const heH1 = (heHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
    const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const guideHtml = readFileSync(join(root, "guias/semana-corrida.html"), "utf8");
    const guideTitle = (guideHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const guideH1 = (guideHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const demo = calcularSemanaCorrida({
      remuneracionesVariables: 600_000,
      diasQueDebioLaborar: 24,
      domingosFestivos: 5,
    });
    const semanal = calcularSemanaCorrida({
      remuneracionesVariables: 180_000,
      diasQueDebioLaborar: 6,
      domingosFestivos: 1,
    });
    assert(
      "SEO title semana corrida apunta a calcular semana corrida",
      /calcular semana corrida/i.test(scTitle) &&
        !/recargo domingo/i.test(scTitle) &&
        !/horas extras/i.test(scTitle) &&
        !/sueldo l[ií]quido/i.test(scTitle) &&
        scTitle !== rdTitle &&
        scTitle !== heTitle &&
        scTitle !== sueldoTitle &&
        scTitle !== guideTitle &&
        scTitle.length <= 65,
      scTitle,
    );
    assert(
      "SEO H1 semana corrida distinto de recargo, extras, sueldo y guía",
      /calcular semana corrida/i.test(scH1) &&
        scH1 !== rdH1 &&
        scH1 !== heH1 &&
        scH1 !== sueldoH1 &&
        scH1 !== guideH1 &&
        !/recargo domingo/i.test(scH1) &&
        !/horas extras/i.test(scH1) &&
        !/sueldo l[ií]quido/i.test(scH1),
      scH1,
    );
    assert(
      "SEO semana corrida meta distinta de /recargo-domingo-comercio y /sueldo",
      scDesc &&
        scDesc !== ((rdHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        scDesc !== ((sueldoHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO semana corrida cita art. 45 y Código",
      /art[ií]culo 45/i.test(scHtml) && /C[oó]digo del Trabajo/.test(scHtml),
    );
    assert(
      "SEO semana corrida métrica principal no es Total a pagar",
      /Semana corrida a pagar/.test(scHtml) && !/<p class="metric-label">Total a pagar<\/p>/.test(scHtml),
    );
    assert(
      "SEO semana corrida ejemplo 600000 / 24 × 5 = 125000",
      demo.total === 125000 &&
        semanal.total === 30000 &&
        /\$600\.000/.test(scHtml) &&
        /\$25\.000/.test(scHtml) &&
        /\$125\.000/.test(scHtml) &&
        /\$180\.000/.test(scHtml) &&
        /\$30\.000/.test(scHtml),
    );
    assert("SEO semana corrida FAQPage", /"@type": "FAQPage"/.test(scHtml));
    assert(
      "SEO semana corrida distingue recargo, extras y sueldo",
      /no es el <a href="\/recargo-domingo-comercio">recargo domingo comercio<\/a>/i.test(scHtml) &&
        /href="\/horas-extras"/.test(scHtml) &&
        /href="\/sueldo"/.test(scHtml) &&
        /href="\/guias\/semana-corrida"/.test(scHtml) &&
        /href="\/empresa"/.test(scHtml),
    );
    assert(
      "SEO semana corrida doctrina DT sin unificar CS",
      /devengue d[ií]a a d[ií]a/.test(scHtml) &&
        /no unifica/.test(scHtml) &&
        /Corte Suprema/.test(scHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-60203/.test(scHtml),
    );
    assert(
      "SEO recargo y horas extras enlazan /semana-corrida",
      /href="\/semana-corrida"/.test(rdHtml) && /href="\/semana-corrida"/.test(heHtml),
    );
    assert(
      "home y nav enlazan /semana-corrida",
      /href="\/semana-corrida"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/semana-corrida" data-nav>Semana corrida<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/semana-corrida" data-nav>Semana corrida<\/a>/.test(scHtml),
    );
    assert(
      "sitemap incluye /semana-corrida",
      locs.includes("https://www.haberes.cl/semana-corrida") &&
        lastmodForPath("/semana-corrida") === "2026-08-27",
    );
    assert(
      "no se crean URLs hermanas de semana corrida",
      !existsSync(join(root, "septimo-dia.html")) &&
        !existsSync(join(root, "pago-domingo-festivo.html")) &&
        !existsSync(join(root, "semana-corrida-mensual.html")),
    );
    assert(
      "seo-map documenta /semana-corrida y no-canibalizar guía ni recargo",
      /\/semana-corrida/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/guias\/semana-corrida`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no crear `\/septimo-dia`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
  }
  {
    const homeTitle = (readFileSync(join(root, "index.html"), "utf8").match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    assert(
      "SEO título home pymes, no calculadora",
      /pymes en Chile/.test(homeTitle) && !/calculadora/i.test(homeTitle) && homeTitle.length <= 65,
      homeTitle,
    );
  }
  {
    const liqTitle = (readFileSync(join(root, "guias/liquidacion-de-sueldo.html"), "utf8").match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    assert(
      "SEO guía liquidación informativa, sin calculadora en title",
      /liquidaci[oó]n de sueldo/i.test(liqTitle) && !/calculadora/i.test(liqTitle),
      liqTitle,
    );
  }
  {
    const finiGuideTitle = (readFileSync(join(root, "guias/finiquito.html"), "utf8").match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    assert(
      "SEO guía finiquito informativa, sin calculadora en title",
      /finiquito/i.test(finiGuideTitle) && !/calculadora/i.test(finiGuideTitle),
      finiGuideTitle,
    );
  }
  {
    const plazoHtml = readFileSync(join(root, "guias/plazo-de-pago-del-finiquito.html"), "utf8");
    const finiGuideHtml = readFileSync(join(root, "guias/finiquito.html"), "utf8");
    assert(
      "SEO plazo finiquito 10 días hábiles art. 177",
      /10 d[ií]as h[aá]biles/i.test(plazoHtml) &&
        /177/.test(plazoHtml) &&
        /dt\.gob\.cl/.test(plazoHtml) &&
        !/al momento del t[eé]rmino de la relaci[oó]n laboral/i.test(plazoHtml),
    );
    assert(
      "SEO guía finiquito 10 días hábiles art. 177",
      /10 d[ií]as h[aá]biles/i.test(finiGuideHtml) &&
        /177/.test(finiGuideHtml) &&
        /dt\.gob\.cl/.test(finiGuideHtml) &&
        !/al momento del t[eé]rmino de la relaci[oó]n laboral/i.test(finiGuideHtml),
    );
  }
  {
    const thick = [
      ["guias/liquidacion-de-sueldo.html", "/sueldo", /54/, /dt\.gob\.cl/],
      ["guias/finiquito.html", "/finiquito", /177/, /dt\.gob\.cl/],
      ["guias/impuesto-unico.html", "/impuesto-unico", /13,5 UTM/, /sii\.cl/],
      ["guias/carta-aviso-termino-contrato.html", "/finiquito", /162/, /dt\.gob\.cl/],
      ["guias/gratificacion-legal.html", "/gratificacion", /artículo 47/, /dt\.gob\.cl/],
      ["guias/indemnizacion-por-anos-de-servicio.html", "/finiquito", /artículo 163/, /dt\.gob\.cl/],
      ["guias/semana-corrida.html", "/sueldo", /artículo 45/, /dt\.gob\.cl/],
      ["guias/aguinaldo-fiestas-patrias.html", "/aguinaldo", /artículo 41/, /dt\.gob\.cl/],
      ["guias/horas-extras.html", "/horas-extras", /artículo 32/, /dt\.gob\.cl/],
      ["guias/me-reservo-el-derecho-en-el-finiquito.html", "/finiquito", /artículo 177/, /dt\.gob\.cl/],
      ["guias/vacaciones-proporcionales.html", "/vacaciones-proporcionales", /artículo 73/, /dt\.gob\.cl/],
      ["guias/liquidacion-de-sueldo-y-previred.html", "/sueldo", /54/, /dt\.gob\.cl/],
    ];
    function visibleWords(html) {
      const main = html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] || html;
      const text = main
        .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      return text.split(" ").filter(Boolean).length;
    }
    for (const [file, calc, law, source] of thick) {
      const html = readFileSync(join(root, file), "utf8");
      const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const words = visibleWords(html);
      const minWords =
        file.includes("gratificacion-legal") ||
        file.includes("indemnizacion-por-anos-de-servicio") ||
        file.includes("semana-corrida") ||
        file.includes("aguinaldo-fiestas-patrias") ||
        file.includes("horas-extras") ||
        file.includes("me-reservo-el-derecho-en-el-finiquito") ||
        file.includes("vacaciones-proporcionales") ||
        file.includes("liquidacion-de-sueldo-y-previred")
          ? 900
          : 800;
      const dateRe =
        file.includes("liquidacion-de-sueldo-y-previred")
          ? /<time datetime="2026-09-21">/
          : file.includes("vacaciones-proporcionales")
          ? /<time datetime="2026-09-14">/
          : file.includes("me-reservo-el-derecho-en-el-finiquito")
          ? /<time datetime="2026-09-07">/
          : file.includes("horas-extras")
          ? /<time datetime="2026-08-31">/
          : file.includes("aguinaldo-fiestas-patrias")
          ? /<time datetime="2026-08-30">/
          : file.includes("semana-corrida")
          ? /<time datetime="2026-08-27">/
          : file.includes("indemnizacion-por-anos-de-servicio")
          ? /<time datetime="2026-08-19">/
          : /<time datetime="2026-08-18">/;
      assert(`SEO ${file} ${minWords}–1400 palabras`, words >= minWords && words <= 1400, `${file}: ${words}`);
      assert(`SEO ${file} sin calculadora en title`, /./.test(title) && !/calculadora/i.test(title), title);
      assert(`SEO ${file} sin branding de IA`, !/\bIA\b/.test(html) && !/inteligencia artificial/i.test(html));
      assert(`SEO ${file} enlaza ${calc}`, html.includes(`href="${calc}"`));
      assert(`SEO ${file} cita norma`, law.test(html));
      assert(`SEO ${file} cita fuente oficial`, source.test(html));
      assert(`SEO ${file} tiene FAQ visible`, /<h2>Preguntas frecuentes<\/h2>/.test(html));
      assert(`SEO ${file} tiene fecha`, dateRe.test(html));
    }
    {
      const iasHtml = readFileSync(join(root, "guias/indemnizacion-por-anos-de-servicio.html"), "utf8");
      const finiHtml = readFileSync(join(root, "finiquito.html"), "utf8");
      const iasTitle = (iasHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const finiTitle = (finiHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const iasH1 = (iasHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const finiH1 = (finiHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      assert(
        "SEO IAS title/H1 distintos de /finiquito y sin calculadora de finiquito",
        iasTitle &&
          finiTitle &&
          iasTitle !== finiTitle &&
          iasH1 !== finiH1 &&
          !/calculadora de finiquito/i.test(iasTitle) &&
          !/calculadora de finiquito/i.test(iasH1) &&
          /163/.test(iasTitle) &&
          /90 UF/i.test(iasTitle),
        `${iasTitle} | ${finiTitle}`,
      );
    }
    {
      const scHtml = readFileSync(join(root, "guias/semana-corrida.html"), "utf8");
      const liqHtml = readFileSync(join(root, "guias/liquidacion-de-sueldo.html"), "utf8");
      const scTitle = (scHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const liqTitle = (liqHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const scH1 = (scHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      assert(
        "SEO semana corrida title/H1 distintos de liquidación y con art. 45",
        scTitle &&
          liqTitle &&
          scTitle !== liqTitle &&
          scH1 &&
          /45/.test(scTitle) &&
          /semana corrida/i.test(scTitle) &&
          /45/.test(scH1) &&
          !/calculadora/i.test(scTitle) &&
          !/calculadora/i.test(scH1) &&
          /href="\/sueldo"/.test(scHtml) &&
          /href="\/semana-corrida"/.test(scHtml) &&
          /href="\/guias"/.test(scHtml),
        `${scTitle} | ${liqTitle}`,
      );
    }
    {
      const agHtml = readFileSync(join(root, "guias/aguinaldo-fiestas-patrias.html"), "utf8");
      const grHtml = readFileSync(join(root, "guias/gratificacion-legal.html"), "utf8");
      const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
      const gratHtml = readFileSync(join(root, "gratificacion.html"), "utf8");
      const agTitle = (agHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const agH1 = (agHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const grTitle = (grHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const grH1 = (grHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const gratTitle = (gratHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const gratH1 = (gratHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      assert(
        "SEO aguinaldo title/H1 únicos y sin obligación general del Código",
        agTitle &&
          agH1 &&
          agTitle !== grTitle &&
          agH1 !== grH1 &&
          agTitle !== sueldoTitle &&
          agH1 !== sueldoH1 &&
          agTitle !== gratTitle &&
          agH1 !== gratH1 &&
          /aguinaldo/i.test(agTitle) &&
          /Fiestas Patrias/i.test(agTitle) &&
          /obligatorio/i.test(agTitle) &&
          /aguinaldo/i.test(agH1) &&
          /Fiestas Patrias/i.test(agH1) &&
          !/calculadora/i.test(agTitle) &&
          !/calculadora/i.test(agH1) &&
          !/gratificaci[oó]n legal/i.test(agH1) &&
          /no crea un deber legal general/i.test(agHtml) &&
          /href="\/sueldo"/.test(agHtml) &&
          /href="\/aguinaldo"/.test(agHtml) &&
          /href="\/guias\/gratificacion-legal"/.test(agHtml) &&
          /href="\/guias\/liquidacion-de-sueldo"/.test(agHtml) &&
          /Otros imponibles/.test(agHtml) &&
          /21\.724/.test(agHtml) &&
          /7143\/340/.test(agHtml),
        `${agTitle} | ${agH1}`,
      );
    }
    {
      const heHtml = readFileSync(join(root, "guias/horas-extras.html"), "utf8");
      const heLanding = readFileSync(join(root, "horas-extras.html"), "utf8");
      const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
      const finiHtml = readFileSync(join(root, "finiquito.html"), "utf8");
      const heTitle = (heHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const heH1 = (heHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const landingTitle = (heLanding.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const landingH1 = (heLanding.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const finiTitle = (finiHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const finiH1 = (finiHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      assert(
        "SEO guía horas extras title/H1 únicos, informativos y alineados a valorHoraExtra",
        heTitle &&
          heH1 &&
          heTitle !== landingTitle &&
          heH1 !== landingH1 &&
          heTitle !== sueldoTitle &&
          heH1 !== sueldoH1 &&
          heTitle !== finiTitle &&
          heH1 !== finiH1 &&
          /horas extras/i.test(heTitle) &&
          /50\s*%/.test(heTitle) &&
          /fórmula DT/i.test(heTitle) &&
          /horas extras/i.test(heH1) &&
          /50\s*%/.test(heH1) &&
          !/^Calcular /i.test(heH1) &&
          !/calculadora/i.test(heTitle) &&
          !/calculadora/i.test(heH1) &&
          !/sueldo l[ií]quido/i.test(heH1) &&
          !/js\/sueldo\.js/.test(heHtml) &&
          !/valorHoraExtra/.test(heHtml) &&
          /sueldo \/ 30/.test(heHtml) &&
          /jornada/.test(heHtml) &&
          /0,0083333/.test(heHtml) &&
          /\$800\.000/.test(heHtml) &&
          /\$6\.666,6/.test(heHtml) &&
          /42/.test(heHtml) &&
          /26 de abril de 2028/.test(heHtml) &&
          /artículo 31/.test(heHtml) &&
          /dos horas/.test(heHtml) &&
          /no es «hora extra al 100 %»/.test(heHtml) &&
          /href="\/horas-extras"/.test(heHtml) &&
          /href="\/sueldo"/.test(heHtml) &&
          /href="\/recargo-domingo-comercio"/.test(heHtml) &&
          /href="\/guias\/semana-corrida"/.test(heHtml) &&
          /href="\/guias"/.test(heHtml) &&
          /w3-article-95182/.test(heHtml) &&
          /1191554/.test(heHtml) &&
          landingH1 === "Calcular horas extras Chile 2026",
        `${heTitle} | ${heH1} | ${landingH1}`,
      );
    }
    {
      const html = readFileSync(join(root, "guias/me-reservo-el-derecho-en-el-finiquito.html"), "utf8");
      const finiLanding = readFileSync(join(root, "finiquito.html"), "utf8");
      const finiGuide = readFileSync(join(root, "guias/finiquito.html"), "utf8");
      const plazo = readFileSync(join(root, "guias/plazo-de-pago-del-finiquito.html"), "utf8");
      const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
      const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const h1 = (html.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const landingTitle = (finiLanding.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const landingH1 = (finiLanding.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const guideTitle = (finiGuide.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const guideH1 = (finiGuide.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const plazoH1 = (plazo.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      assert(
        "SEO guía reserva de derechos title/H1 únicos y no canibalizan /finiquito",
        title &&
          h1 &&
          title !== landingTitle &&
          h1 !== landingH1 &&
          title !== guideTitle &&
          h1 !== guideH1 &&
          h1 !== plazoH1 &&
          h1 !== sueldoH1 &&
          /reserva de derechos/i.test(title) &&
          /finiquito/i.test(title) &&
          /177/.test(h1) &&
          /reserva/i.test(h1) &&
          !/calculadora/i.test(title) &&
          !/calculadora/i.test(h1) &&
          !/^Calcular /i.test(h1) &&
          /sumas no disputadas/.test(html) &&
          /poder liberatorio/.test(html) &&
          /no impedirá en ningún caso/.test(html) &&
          /href="\/finiquito"/.test(html) &&
          /href="\/guias\/finiquito"/.test(html) &&
          /href="\/guias\/plazo-de-pago-del-finiquito"/.test(html) &&
          /href="\/guias\/carta-aviso-termino-contrato"/.test(html) &&
          /href="\/guias\/indemnizacion-por-anos-de-servicio"/.test(html) &&
          /href="\/guias"/.test(html) &&
          /w3-article-118107/.test(html) &&
          /207436/.test(html) &&
          !existsSync(join(root, "guias/reserva-de-derechos.html")) &&
          landingH1 === "Calculadora de finiquito Chile 2026",
        `${title} | ${h1} | ${landingH1} | ${guideH1}`,
      );
      assert(
        "seo-map documenta reserva de derechos sin slug paralelo",
        /\/guias\/me-reservo-el-derecho-en-el-finiquito/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
          /No crear `\/guias\/reserva-de-derechos`/.test(
            readFileSync(join(root, "docs/seo-map.md"), "utf8"),
          ),
      );
    }
    {
      const html = readFileSync(join(root, "guias/vacaciones-proporcionales.html"), "utf8");
      const landing = readFileSync(join(root, "vacaciones-proporcionales.html"), "utf8");
      const faHtml = readFileSync(join(root, "feriado-anual.html"), "utf8");
      const fpHtml = readFileSync(join(root, "feriado-progresivo.html"), "utf8");
      const finiLanding = readFileSync(join(root, "finiquito.html"), "utf8");
      const finiGuide = readFileSync(join(root, "guias/finiquito.html"), "utf8");
      const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
      const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const h1 = (html.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const landingTitle = (landing.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const landingH1 = (landing.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const faH1 = (faHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const fpH1 = (fpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const finiH1 = (finiLanding.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const guideH1 = (finiGuide.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      assert(
        "SEO guía vacaciones proporcionales title/H1 únicos y no canibalizan /sueldo ni /finiquito",
        title &&
          h1 &&
          title !== landingTitle &&
          h1 !== landingH1 &&
          h1 !== faH1 &&
          h1 !== fpH1 &&
          h1 !== finiH1 &&
          h1 !== guideH1 &&
          h1 !== sueldoH1 &&
          /vacaciones proporcionales/i.test(title) &&
          /73/.test(title) &&
          /vacaciones proporcionales/i.test(h1) &&
          /feriado pendiente/i.test(h1) &&
          /73/.test(h1) &&
          /remuneraci[oó]n \/ 30/.test(h1) &&
          !/calculadora/i.test(title) &&
          !/calculadora/i.test(h1) &&
          !/^Calcular /i.test(h1) &&
          !/sueldo l[ií]quido/i.test(h1) &&
          !/calculadora de finiquito/i.test(h1) &&
          /data-seo-calc="feriado"/.test(html) &&
          /d[ií]as × \(remuneraci[oó]n mensual \/ 30\)/.test(html) &&
          /\$900\.000/.test(html) &&
          /\$300\.000/.test(html) &&
          /10 × \$900\.000 \/ 30/.test(html) &&
          feriadoProporcional(10, 900000) === 300000 &&
          /href="\/vacaciones-proporcionales"/.test(html) &&
          /href="\/feriado-anual"/.test(html) &&
          /href="\/feriado-progresivo"/.test(html) &&
          /href="\/finiquito"/.test(html) &&
          /href="\/guias\/finiquito"/.test(html) &&
          /href="\/guias\/con-que-sueldo-se-calcula-el-finiquito"/.test(html) &&
          /href="\/guias"/.test(html) &&
          /w3-article-60200/.test(html) &&
          /207436/.test(html) &&
          /"url": "https:\/\/www\.haberes\.cl\/vacaciones-proporcionales"/.test(html) &&
          !/"name": "Calculadora de sueldo l[ií]quido Haberes"/.test(html) &&
          !existsSync(join(root, "guias/feriado-proporcional.html")) &&
          landingH1 === "Calcular vacaciones proporcionales Chile 2026",
        `${title} | ${h1} | ${landingH1}`,
      );
      assert(
        "seo-map documenta guía vacaciones proporcionales sin slug paralelo",
        /\/guias\/vacaciones-proporcionales/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
          /No crear `\/guias\/feriado-proporcional`/.test(
            readFileSync(join(root, "docs/seo-map.md"), "utf8"),
          ),
      );
    }
    {
      const html = readFileSync(join(root, "guias/liquidacion-de-sueldo-y-previred.html"), "utf8");
      const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
      const finiHtml = readFileSync(join(root, "finiquito.html"), "utf8");
      const liqHtml = readFileSync(join(root, "guias/liquidacion-de-sueldo.html"), "utf8");
      const leerHtml = readFileSync(join(root, "guias/como-leer-una-liquidacion-de-sueldo.html"), "utf8");
      const formatoHtml = readFileSync(join(root, "guias/formato-de-liquidacion-de-sueldo-chile.html"), "utf8");
      const cpHtml = readFileSync(join(root, "cotizaciones-previsionales.html"), "utf8");
      const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const h1 = (html.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const finiTitle = (finiHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const finiH1 = (finiHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const liqH1 = (liqHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const leerH1 = (leerHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const formatoH1 = (formatoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const cpH1 = (cpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      const demo = calcularSueldo(
        { sueldoBase: 900_000, afp: "modelo", salud: "fonasa", contrato: "indefinido" },
        { uf: FALLBACK_UF },
      );
      const afcEmpleador = Math.round(900_000 * CESANTIA_EMPLEADOR_INDEFINIDO);
      assert(
        "SEO guía liquidación y Previred title/H1 únicos y no canibalizan /sueldo ni /finiquito",
        title &&
          h1 &&
          title !== sueldoTitle &&
          h1 !== sueldoH1 &&
          title !== finiTitle &&
          h1 !== finiH1 &&
          h1 !== liqH1 &&
          h1 !== leerH1 &&
          h1 !== formatoH1 &&
          h1 !== cpH1 &&
          /liquidaci[oó]n de sueldo/i.test(title) &&
          /Previred/i.test(title) &&
          /qué es cada una/i.test(title) &&
          /liquidaci[oó]n de sueldo/i.test(h1) &&
          /Previred/i.test(h1) &&
          /contrastarlas/i.test(h1) &&
          !/calculadora/i.test(title) &&
          !/calculadora/i.test(h1) &&
          !/^Calcular /i.test(h1) &&
          !/sueldo l[ií]quido/i.test(h1) &&
          !/calculadora de finiquito/i.test(h1) &&
          /data-seo-calc="sueldo"/.test(html) &&
          /\$900\.000/.test(html) &&
          /\$95\.220/.test(html) &&
          /\$63\.000/.test(html) &&
          /\$5\.400/.test(html) &&
          /\$163\.620/.test(html) &&
          /\$736\.380/.test(html) &&
          /\$21\.600/.test(html) &&
          demo.afp.monto === 95_220 &&
          demo.salud.monto === 63_000 &&
          demo.cesantia.monto === 5_400 &&
          demo.liquido === 736_380 &&
          demo.totalDescuentos === 163_620 &&
          afcEmpleador === 21_600 &&
          /href="\/sueldo"/.test(html) &&
          /href="\/cotizaciones-previsionales"/.test(html) &&
          /href="\/seguro-cesantia"/.test(html) &&
          /href="\/guias\/liquidacion-de-sueldo"/.test(html) &&
          /href="\/guias\/impuesto-unico"/.test(html) &&
          /href="\/guias\/como-leer-una-liquidacion-de-sueldo"/.test(html) &&
          /href="\/guias"/.test(html) &&
          /w3-article-60226/.test(html) &&
          /207436/.test(html) &&
          /previred\.com/.test(html) &&
          /"url": "https:\/\/www\.haberes\.cl\/sueldo"/.test(html) &&
          /"name": "Calculadora de sueldo l[ií]quido Haberes"/.test(html) &&
          !existsSync(join(root, "guias/previred.html")) &&
          !existsSync(join(root, "blog.html")) &&
          sueldoH1 === "Calculadora de sueldo líquido Chile 2026" &&
          finiH1 === "Calculadora de finiquito Chile 2026",
        `${title} | ${h1} | ${sueldoH1} | ${liqH1}`,
      );
      assert(
        "seo-map documenta guía liquidación y Previred sin slug paralelo",
        /\/guias\/liquidacion-de-sueldo-y-previred/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
          /No crear `\/guias\/previred`/.test(
            readFileSync(join(root, "docs/seo-map.md"), "utf8"),
          ),
      );
    }
  }
  {
    const agHtml = readFileSync(join(root, "aguinaldo.html"), "utf8");
    const agTitle = (agHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const agH1 = (agHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const agDesc = (agHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
    const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const gratHtml = readFileSync(join(root, "gratificacion.html"), "utf8");
    const gratTitle = (gratHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const gratH1 = (gratHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const guideHtml = readFileSync(join(root, "guias/aguinaldo-fiestas-patrias.html"), "utf8");
    const guideTitle = (guideHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const guideH1 = (guideHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const fijo = calcularAguinaldo({
      modo: "fijo",
      montoFijo: 50_000,
      sueldoBase: 800_000,
      trabajadores: 10,
      imponible: true,
    });
    const pct = calcularAguinaldo({
      modo: "porcentaje",
      porcentaje: 10,
      sueldoBase: 800_000,
      trabajadores: 5,
      imponible: true,
    });
    assert(
      "SEO title aguinaldo apunta a calcular aguinaldo Fiestas Patrias",
      /calcular aguinaldo/i.test(agTitle) &&
        /Fiestas Patrias/i.test(agTitle) &&
        !/sueldo l[ií]quido/i.test(agTitle) &&
        !/gratificaci[oó]n legal/i.test(agTitle) &&
        !/obligatorio/i.test(agTitle) &&
        agTitle !== sueldoTitle &&
        agTitle !== gratTitle &&
        agTitle !== guideTitle &&
        agTitle.length <= 65,
      agTitle,
    );
    assert(
      "SEO H1 aguinaldo distinto de /sueldo, /gratificacion y de la guía",
      agH1 === "Calcular aguinaldo Fiestas Patrias Chile 2026" &&
        agH1 !== sueldoH1 &&
        agH1 !== gratH1 &&
        agH1 !== guideH1 &&
        !/sueldo l[ií]quido/i.test(agH1) &&
        !/obligatorio/i.test(agH1),
      agH1,
    );
    assert(
      "SEO aguinaldo meta distinta de la guía y de /gratificacion",
      agDesc &&
        agDesc !== ((guideHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        agDesc !== ((gratHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO aguinaldo no afirma obligación legal general",
      /no crea un deber legal general/i.test(agHtml) &&
        /no es una obligaci[oó]n legal/i.test(agHtml) &&
        !/la ley obliga/i.test(agHtml) &&
        /dt\.gob\.cl\/portal\/1627\/w3-article-96895/.test(agHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(agHtml) &&
        /7143\/340/.test(agHtml) &&
        /art[ií]culo 41/i.test(agHtml),
    );
    assert(
      "SEO aguinaldo no es gratificación ni sueldo líquido",
      /href="\/gratificacion"/.test(agHtml) &&
        /href="\/sueldo"/.test(agHtml) &&
        /href="\/guias\/aguinaldo-fiestas-patrias"/.test(agHtml) &&
        /no es la gratificaci[oó]n/i.test(agHtml),
    );
    assert(
      "SEO aguinaldo golden fijo, %, N e imponible",
      fijo.porTrabajador === 50_000 &&
        fijo.totalPlanilla === 500_000 &&
        fijo.extraLiquido === 40_910 &&
        pct.porTrabajador === 80_000 &&
        pct.totalPlanilla === 400_000 &&
        /\$50\.000/.test(agHtml) &&
        /\$40\.910/.test(agHtml) &&
        /\$500\.000/.test(agHtml) &&
        /\$80\.000/.test(agHtml) &&
        /\$400\.000/.test(agHtml) &&
        /\$800\.000/.test(agHtml),
    );
    assert("SEO aguinaldo FAQPage", /"@type": "FAQPage"/.test(agHtml));
    assert(
      "SEO aguinaldo métrica es total planilla, default imponible",
      /Total planilla/.test(agHtml) &&
        /Marcar como no imponible/.test(agHtml) &&
        /Por defecto es haber imponible/.test(agHtml),
    );
    assert(
      "home y nav enlazan /aguinaldo",
      /href="\/aguinaldo"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/aguinaldo" data-nav>Aguinaldo<\/a>/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/aguinaldo" data-nav>Aguinaldo<\/a>/.test(agHtml),
    );
    assert(
      "sitemap incluye /aguinaldo",
      locs.includes("https://www.haberes.cl/aguinaldo") && lastmodForPath("/aguinaldo") === "2026-08-30",
    );
    assert(
      "GUIDES aguinaldo-fiestas-patrias apunta a /aguinaldo",
      GUIDES.find((g) => g.slug === "aguinaldo-fiestas-patrias")?.calc === "/aguinaldo",
    );
    assert(
      "seo-map documenta /aguinaldo y no-canibalizar /gratificacion",
      /\/aguinaldo/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/gratificacion`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no crear `\/bono-fiestas-patrias`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "no se crean URLs hermanas de aguinaldo",
      !existsSync(join(root, "bono-fiestas-patrias.html")) &&
        !existsSync(join(root, "aguinaldo-navidad.html")) &&
        !existsSync(join(root, "aguinaldo-18.html")),
    );
    assert(
      "guía aguinaldo y /gratificacion enlazan /aguinaldo",
      /href="\/aguinaldo"/.test(guideHtml) && /href="\/aguinaldo"/.test(gratHtml),
    );
  }
  {
    const cpHtml = readFileSync(join(root, "finiquito-casa-particular.html"), "utf8");
    const cpTitle = (cpHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const cpH1 = (cpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const cpDesc = (cpHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const finiHtml = readFileSync(join(root, "finiquito.html"), "utf8");
    const finiTitle = (finiHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const finiH1 = (finiHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const iasHtml = readFileSync(join(root, "indemnizacion-anos-servicio.html"), "utf8");
    const iasTitle = (iasHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const iasH1 = (iasHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const guideHtml = readFileSync(join(root, "guias/finiquito-trabajadora-de-casa-particular.html"), "utf8");
    const guideTitle = (guideHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const guideH1 = (guideHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const demo = calcularFiniquitoCasaParticular(
      {
        ingreso: "2023-03-01",
        termino: "2026-03-01",
        remuneracion: 500_000,
        causal: "desahucio",
        avisoPrevio: false,
        diasMes: 1,
        diasFeriadoPendiente: 5,
        diasFeriadoProporcional: 0,
      },
      { uf: FALLBACK_UF },
    );
    assert(
      "SEO title casa particular apunta a calcular finiquito casa particular",
      /calcular finiquito casa particular/i.test(cpTitle) &&
        !/calculadora de finiquito/i.test(cpTitle) &&
        cpTitle !== finiTitle &&
        cpTitle !== iasTitle &&
        cpTitle !== guideTitle &&
        cpTitle.length <= 65,
      cpTitle,
    );
    assert(
      "SEO H1 casa particular distinto de /finiquito, IAS y de la guía",
      cpH1 === "Calcular finiquito casa particular Chile 2026" &&
        cpH1 !== finiH1 &&
        cpH1 !== iasH1 &&
        cpH1 !== guideH1 &&
        !/calculadora de finiquito/i.test(cpH1),
      cpH1,
    );
    assert(
      "SEO casa particular meta distinta de /finiquito y de la guía",
      cpDesc &&
        cpDesc !== ((finiHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        cpDesc !== ((guideHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO casa particular cita art. 161, 163, Ley 21.269, DT y Código",
      /art[ií]culo 163/i.test(cpHtml) &&
        /art[ií]culo 161/i.test(cpHtml) &&
        /Ley 21\.269/.test(cpHtml) &&
        /C[oó]digo del Trabajo/.test(cpHtml) &&
        /dt\.gob\.cl\/portal\/1626\/w3-article-98984/.test(cpHtml) &&
        /dt\.gob\.cl\/portal\/1628\/w3-article-119845/.test(cpHtml) &&
        /bcn\.cl\/leychile\/navegar\?idNorma=207436/.test(cpHtml) &&
        /bcn\.cl\/leychile\/navegar\?idLey=21269/.test(cpHtml),
    );
    assert(
      "SEO casa particular golden $600.000 empleador y $199.800 AFP",
      demo.totalEmpleador === 600_000 &&
        demo.ias === 0 &&
        demo.aviso === 500_000 &&
        demo.iteEstimado === 199_800 &&
        /\$600\.000/.test(cpHtml) &&
        /\$199\.800/.test(cpHtml) &&
        /\$16\.667/.test(cpHtml) &&
        /\$83\.333/.test(cpHtml) &&
        /1,11/.test(cpHtml) &&
        /no aplica/i.test(cpHtml),
    );
    assert("SEO casa particular FAQPage", /"@type": "FAQPage"/.test(cpHtml));
    assert(
      "SEO casa particular no es finiquito genérico ni IAS de 30 días",
      /no es la IAS de 30 d[ií]as/i.test(cpHtml) &&
        /href="\/finiquito"/.test(cpHtml) &&
        /href="\/guias\/finiquito-trabajadora-de-casa-particular"/.test(cpHtml) &&
        /href="\/vacaciones-proporcionales"/.test(cpHtml) &&
        !existsSync(join(root, "finiquito-nana.html")) &&
        !existsSync(join(root, "asesora-hogar.html")),
    );
    assert(
      "home y nav enlazan /finiquito-casa-particular",
      /href="\/finiquito-casa-particular"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/finiquito-casa-particular" data-nav>Finiquito casa particular<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/finiquito-casa-particular" data-nav>Finiquito casa particular<\/a>/.test(cpHtml),
    );
    assert(
      "sitemap incluye /finiquito-casa-particular",
      locs.includes("https://www.haberes.cl/finiquito-casa-particular") &&
        lastmodForPath("/finiquito-casa-particular") === "2026-08-31",
    );
    assert(
      "GUIDES casa particular apunta a /finiquito-casa-particular",
      GUIDES.find((g) => g.slug === "finiquito-trabajadora-de-casa-particular")?.calc ===
        "/finiquito-casa-particular",
    );
    assert(
      "seo-map documenta /finiquito-casa-particular y no-canibalizar /finiquito",
      /\/finiquito-casa-particular/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/finiquito`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no crear `\/finiquito-nana`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "guía casa particular y /finiquito enlazan /finiquito-casa-particular",
      /href="\/finiquito-casa-particular"/.test(guideHtml) &&
        /href="\/finiquito-casa-particular"/.test(finiHtml),
    );
    assert(
      "seo-calc casa particular CTA apunta a /finiquito-casa-particular",
      /href="\/finiquito-casa-particular"/.test(readFileSync(join(root, "js/seo-calc.js"), "utf8")) &&
        /"casa-particular":\s*mountCasaParticular/.test(readFileSync(join(root, "js/seo-calc.js"), "utf8")),
    );
  }
  {
    const ceHtml = readFileSync(join(root, "costo-empresa.html"), "utf8");
    const ceTitle = (ceHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const ceH1 = (ceHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const ceDesc = (ceHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
    const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const cpHtml = readFileSync(join(root, "cotizaciones-previsionales.html"), "utf8");
    const cpTitle = (cpHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const cpH1 = (cpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const gratHtml = readFileSync(join(root, "gratificacion.html"), "utf8");
    const demo = calcularCostoEmpresa(
      { modo: "bruto", monto: 800_000, contrato: "indefinido" },
      { uf: FALLBACK_UF },
    );
    assert(
      "SEO title costo empresa apunta a calcular costo empresa",
      /calcular costo empresa/i.test(ceTitle) &&
        !/sueldo l[ií]quido/i.test(ceTitle) &&
        !/cotizaciones previsionales/i.test(ceTitle) &&
        ceTitle !== sueldoTitle &&
        ceTitle !== cpTitle &&
        ceTitle.length <= 65,
      ceTitle,
    );
    assert(
      "SEO H1 costo empresa exacto y distinto de /sueldo y /cotizaciones",
      ceH1 === "Calcular costo empresa de un sueldo Chile 2026" &&
        ceH1 !== sueldoH1 &&
        ceH1 !== cpH1 &&
        !/sueldo l[ií]quido/i.test(ceH1),
      ceH1,
    );
    assert(
      "SEO costo empresa meta distinta de /sueldo y /cotizaciones",
      ceDesc &&
        ceDesc !== ((sueldoHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        ceDesc !== ((cpHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO costo empresa no canibaliza líquido ni cotizaciones del trabajador",
      /no es el/i.test(ceHtml) &&
        /sueldo l[ií]quido/.test(ceHtml) &&
        /href="\/sueldo"/.test(ceHtml) &&
        /href="\/cotizaciones-previsionales"/.test(ceHtml) &&
        /href="\/gratificacion"/.test(ceHtml) &&
        /Costo empresa/.test(ceHtml),
    );
    assert(
      "SEO costo empresa cita Ley 21.735 y no suma SIS aparte",
      /21\.735/.test(ceHtml) &&
        /3,5\s*%/.test(ceHtml) &&
        /no suma un SIS extra/i.test(ceHtml) &&
        /spensiones\.cl/.test(ceHtml),
    );
    assert(
      "SEO costo empresa ejemplo 800000 = 854640",
      demo.costoEmpresa === 854_640 &&
        demo.totalAportes === 54_640 &&
        /\$800\.000/.test(ceHtml) &&
        /\$854\.640/.test(ceHtml) &&
        /\$54\.640/.test(ceHtml) &&
        /\$28\.000/.test(ceHtml) &&
        /\$19\.200/.test(ceHtml) &&
        /\$7\.200/.test(ceHtml) &&
        /\$240/.test(ceHtml) &&
        /\$654\.560/.test(ceHtml),
    );
    assert("SEO costo empresa FAQPage", /"@type": "FAQPage"/.test(ceHtml));
    assert(
      "SEO costo empresa disclaimer Haberes / no DT / no Previred",
      /Documento generado por Haberes/.test(ceHtml) &&
        /Direcci[oó]n del Trabajo/.test(ceHtml) &&
        /Previred/.test(ceHtml) &&
        !/inteligencia artificial/i.test(ceHtml),
    );
    assert(
      "home y nav enlazan /costo-empresa",
      /href="\/costo-empresa"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/costo-empresa" data-nav>Costo empresa<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/costo-empresa" data-nav>Costo empresa<\/a>/.test(ceHtml),
    );
    assert(
      "sitemap incluye /costo-empresa",
      locs.includes("https://www.haberes.cl/costo-empresa") &&
        lastmodForPath("/costo-empresa") === "2026-08-30",
    );
    assert(
      "seo-map documenta /costo-empresa y no-canibalizar /sueldo",
      /\/costo-empresa/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/sueldo` ni `\/cotizaciones-previsionales`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/costo-trabajador`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "no se crean URLs hermanas de costo empresa",
      !existsSync(join(root, "costo-trabajador.html")) &&
        !existsSync(join(root, "aportes-patronales.html")),
    );
    assert(
      "sueldo, cotizaciones y gratificación enlazan /costo-empresa",
      /href="\/costo-empresa"/.test(sueldoHtml) &&
        /href="\/costo-empresa"/.test(cpHtml) &&
        /href="\/costo-empresa"/.test(gratHtml),
    );
  }
  {
    const scHtml = readFileSync(join(root, "seguro-cesantia.html"), "utf8");
    const scTitle = (scHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const scH1 = (scHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const scDesc = (scHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const sueldoHtml = readFileSync(join(root, "sueldo.html"), "utf8");
    const sueldoTitle = (sueldoHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1 = (sueldoHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const cpHtml = readFileSync(join(root, "cotizaciones-previsionales.html"), "utf8");
    const cpTitle = (cpHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const cpH1 = (cpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const ceHtml = readFileSync(join(root, "costo-empresa.html"), "utf8");
    const ceTitle = (ceHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const ceH1 = (ceHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const finiHtml = readFileSync(join(root, "finiquito.html"), "utf8");
    const finiH1 = (finiHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const demo = calcularSeguroCesantia(
      { sueldoBase: 800_000, contrato: "indefinido" },
      { uf: FALLBACK_UF },
    );
    const plazo = calcularSeguroCesantia(
      { sueldoBase: 800_000, contrato: "plazo_fijo" },
      { uf: FALLBACK_UF },
    );
    assert(
      "SEO title seguro cesantía apunta a calcular seguro de cesantía",
      /calcular seguro de cesant[ií]a/i.test(scTitle) &&
        !/sueldo l[ií]quido/i.test(scTitle) &&
        !/cotizaciones previsionales/i.test(scTitle) &&
        !/costo empresa/i.test(scTitle) &&
        scTitle !== sueldoTitle &&
        scTitle !== cpTitle &&
        scTitle !== ceTitle &&
        scTitle.length <= 65,
      scTitle,
    );
    assert(
      "SEO H1 seguro cesantía exacto y distinto de hermanas",
      scH1 === "Calcular seguro de cesantía Chile 2026" &&
        scH1 !== sueldoH1 &&
        scH1 !== cpH1 &&
        scH1 !== ceH1 &&
        scH1 !== finiH1,
      scH1,
    );
    assert(
      "SEO seguro cesantía meta distinta de /sueldo /cotizaciones /costo-empresa",
      scDesc &&
        scDesc !== ((sueldoHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        scDesc !== ((cpHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        scDesc !== ((ceHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO seguro cesantía no canibaliza líquido, cotizaciones ni costo empresa",
      /href="\/sueldo"/.test(scHtml) &&
        /href="\/cotizaciones-previsionales"/.test(scHtml) &&
        /href="\/costo-empresa"/.test(scHtml) &&
        /no es/i.test(scHtml),
    );
    assert(
      "SEO seguro cesantía cita Ley 19.728 y topes",
      /19\.728/.test(scHtml) &&
        /135,2 UF/.test(scHtml) &&
        /90 UF/.test(scHtml) &&
        /bcn\.cl\/leychile/.test(scHtml) &&
        /suseso\.gob\.cl/.test(scHtml) &&
        /spensiones\.gob\.cl/.test(scHtml),
    );
    assert(
      "SEO seguro cesantía ejemplo 800000 indefinido y plazo",
      demo.total === 24_000 &&
        demo.trabajador.monto === 4_800 &&
        demo.empleador.monto === 19_200 &&
        plazo.trabajador.monto === 0 &&
        plazo.empleador.monto === 24_000 &&
        /\$800\.000/.test(scHtml) &&
        /\$4\.800/.test(scHtml) &&
        /\$19\.200/.test(scHtml) &&
        /\$12\.800/.test(scHtml) &&
        /\$6\.400/.test(scHtml) &&
        /\$24\.000/.test(scHtml) &&
        /\$22\.400/.test(scHtml) &&
        /\$1\.600/.test(scHtml),
    );
    assert("SEO seguro cesantía FAQPage", /"@type": "FAQPage"/.test(scHtml));
    assert(
      "SEO seguro cesantía disclaimer Haberes / no DT / no Previred",
      /Documento generado por Haberes/.test(scHtml) &&
        /Direcci[oó]n del Trabajo/.test(scHtml) &&
        /Previred/.test(scHtml) &&
        !/inteligencia artificial/i.test(scHtml),
    );
    assert(
      "home y nav enlazan /seguro-cesantia",
      /href="\/seguro-cesantia"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/seguro-cesantia" data-nav>Seguro de cesantía<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/seguro-cesantia" data-nav>Seguro de cesantía<\/a>/.test(scHtml),
    );
    assert(
      "sitemap incluye /seguro-cesantia",
      locs.includes("https://www.haberes.cl/seguro-cesantia") &&
        lastmodForPath("/seguro-cesantia") === "2026-09-01",
    );
    assert(
      "seo-map documenta /seguro-cesantia y no-canibalizar hermanas",
      /\/seguro-cesantia/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/cotizaciones-previsionales`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/afc`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "no se crean URLs hermanas de seguro cesantía",
      !existsSync(join(root, "afc.html")) && !existsSync(join(root, "cesantia.html")),
    );
    assert(
      "sueldo, cotizaciones y costo empresa enlazan /seguro-cesantia",
      /href="\/seguro-cesantia"/.test(sueldoHtml) &&
        /href="\/seguro-cesantia"/.test(cpHtml) &&
        /href="\/seguro-cesantia"/.test(ceHtml),
    );
    assert(
      "hub /guias enlaza /seguro-cesantia",
      /href="\/seguro-cesantia"/.test(readFileSync(join(root, "guias.html"), "utf8")),
    );
  }

  {
    const tpHtml = readFileSync(join(root, "trabajo-pesado.html"), "utf8");
    const tpTitle = (tpHtml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const tpH1 = (tpHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const tpDesc = (tpHtml.match(/meta name="description" content="([^"]*)"/) || [])[1] || "";
    const sueldoHtmlTp = readFileSync(join(root, "sueldo.html"), "utf8");
    const sueldoTitleTp = (sueldoHtmlTp.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const sueldoH1Tp = (sueldoHtmlTp.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const cpHtmlTp = readFileSync(join(root, "cotizaciones-previsionales.html"), "utf8");
    const cpTitleTp = (cpHtmlTp.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const cpH1Tp = (cpHtmlTp.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const ceHtmlTp = readFileSync(join(root, "costo-empresa.html"), "utf8");
    const ceTitleTp = (ceHtmlTp.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const ceH1Tp = (ceHtmlTp.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const scHtmlTp = readFileSync(join(root, "seguro-cesantia.html"), "utf8");
    const scTitleTp = (scHtmlTp.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const scH1Tp = (scHtmlTp.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
    const apvHtmlTp = readFileSync(join(root, "apv.html"), "utf8");
    const lmHtmlTp = readFileSync(join(root, "licencia-medica.html"), "utf8");
    const goldTp = calcularTrabajoPesado(
      { remuneracionImponible: 1_000_000, calificacion: "pesado" },
      { uf: FALLBACK_UF },
    );
    const goldMenos = calcularTrabajoPesado(
      { remuneracionImponible: 1_000_000, calificacion: "menos_pesado" },
      { uf: FALLBACK_UF },
    );
    assert(
      "SEO title trabajo pesado apunta a calculadora trabajo pesado",
      /calculadora trabajo pesado/i.test(tpTitle) &&
        !/sueldo l[ií]quido/i.test(tpTitle) &&
        !/cotizaciones previsionales/i.test(tpTitle) &&
        !/costo empresa/i.test(tpTitle) &&
        !/seguro de cesant[ií]a/i.test(tpTitle) &&
        tpTitle !== sueldoTitleTp &&
        tpTitle !== cpTitleTp &&
        tpTitle !== ceTitleTp &&
        tpTitle !== scTitleTp &&
        tpTitle.length <= 65,
      tpTitle,
    );
    assert(
      "SEO H1 trabajo pesado exacto y distinto de hermanas",
      tpH1 === "Calculadora trabajo pesado Chile 2026" &&
        tpH1 !== sueldoH1Tp &&
        tpH1 !== cpH1Tp &&
        tpH1 !== ceH1Tp &&
        tpH1 !== scH1Tp,
      tpH1,
    );
    assert(
      "SEO trabajo pesado meta distinta de hermanas",
      tpDesc &&
        tpDesc !== ((sueldoHtmlTp.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        tpDesc !== ((cpHtmlTp.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        tpDesc !== ((ceHtmlTp.match(/meta name="description" content="([^"]*)"/) || [])[1] || "") &&
        tpDesc !== ((scHtmlTp.match(/meta name="description" content="([^"]*)"/) || [])[1] || ""),
    );
    assert(
      "SEO trabajo pesado no canibaliza líquido, cotizaciones, costo, AFC, APV ni licencia",
      /href="\/sueldo"/.test(tpHtml) &&
        /href="\/cotizaciones-previsionales"/.test(tpHtml) &&
        /href="\/costo-empresa"/.test(tpHtml) &&
        /href="\/seguro-cesantia"/.test(tpHtml) &&
        /href="\/apv"/.test(tpHtml) &&
        /href="\/licencia-medica"/.test(tpHtml) &&
        /no es/i.test(tpHtml),
    );
    assert(
      "SEO trabajo pesado cita Ley 19.404, art. 17 bis, CEN y tope AFP",
      /19\.404/.test(tpHtml) &&
        /17 bis/.test(tpHtml) &&
        /68 bis/.test(tpHtml) &&
        /Comisi[oó]n Ergon[oó]mica Nacional/.test(tpHtml) &&
        /90 UF/.test(tpHtml) &&
        /bcn\.cl\/leychile/.test(tpHtml) &&
        /suseso\.gob\.cl/.test(tpHtml) &&
        /spensiones\.cl/.test(tpHtml),
    );
    assert(
      "SEO trabajo pesado ejemplo 1000000 pesado y menos pesado",
      goldTp.totalMes === 40_000 &&
        goldTp.cotTrabajador === 20_000 &&
        goldTp.cotEmpleador === 20_000 &&
        goldMenos.cotTrabajador === 10_000 &&
        goldMenos.cotEmpleador === 10_000 &&
        /\$1\.000\.000/.test(tpHtml) &&
        /\$20\.000/.test(tpHtml) &&
        /\$40\.000/.test(tpHtml) &&
        /\$10\.000/.test(tpHtml),
    );
    assert("SEO trabajo pesado FAQPage", /"@type": "FAQPage"/.test(tpHtml));
    assert(
      "SEO trabajo pesado disclaimer Haberes / no DT / no Previred / CEN",
      /Documento generado por Haberes/.test(tpHtml) &&
        /Direcci[oó]n del Trabajo/.test(tpHtml) &&
        /Previred/.test(tpHtml) &&
        /Comisi[oó]n Ergon[oó]mica Nacional/.test(tpHtml) &&
        /no constituye asesor[ií]a legal/i.test(tpHtml) &&
        !/inteligencia artificial/i.test(tpHtml),
    );
    assert(
      "home y nav enlazan /trabajo-pesado",
      /href="\/trabajo-pesado"/.test(readFileSync(join(root, "index.html"), "utf8")) &&
        /href="\/trabajo-pesado" data-nav>Trabajo pesado<\/a>/.test(
          readFileSync(join(root, "index.html"), "utf8"),
        ) &&
        /href="\/trabajo-pesado" data-nav>Trabajo pesado<\/a>/.test(tpHtml),
    );
    assert(
      "sitemap incluye /trabajo-pesado",
      locs.includes("https://www.haberes.cl/trabajo-pesado") &&
        lastmodForPath("/trabajo-pesado") === "2026-09-12",
    );
    assert(
      "seo-map documenta /trabajo-pesado y no-canibalizar hermanas",
      /\/trabajo-pesado/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /no canibalizar `\/cotizaciones-previsionales`/.test(
          readFileSync(join(root, "docs/seo-map.md"), "utf8"),
        ) &&
        /no crear `\/trabajo-pesado-cotizacion`/i.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /`\/cen`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")) &&
        /`\/ley-19404`/.test(readFileSync(join(root, "docs/seo-map.md"), "utf8")),
    );
    assert(
      "no se crean URLs hermanas de trabajo pesado",
      !existsSync(join(root, "trabajo-pesado-cotizacion.html")) &&
        !existsSync(join(root, "cen.html")) &&
        !existsSync(join(root, "ley-19404.html")) &&
        !existsSync(join(root, "jubilacion-anticipada-pesado.html")),
    );
    assert(
      "sueldo, cotizaciones, costo empresa, AFC, APV y licencia enlazan /trabajo-pesado",
      /href="\/trabajo-pesado"/.test(sueldoHtmlTp) &&
        /href="\/trabajo-pesado"/.test(cpHtmlTp) &&
        /href="\/trabajo-pesado"/.test(ceHtmlTp) &&
        /href="\/trabajo-pesado"/.test(scHtmlTp) &&
        /href="\/trabajo-pesado"/.test(apvHtmlTp) &&
        /href="\/trabajo-pesado"/.test(lmHtmlTp),
    );
    assert(
      "hub /guias enlaza /trabajo-pesado en el cluster de liquidación",
      /href="\/trabajo-pesado"/.test(readFileSync(join(root, "guias.html"), "utf8")) &&
        !/<h2>Finiquito<\/h2>[\s\S]*href="\/trabajo-pesado"/.test(
          readFileSync(join(root, "guias.html"), "utf8"),
        ),
    );
  }
  {
    const files = [
      "index.html",
      "sueldo.html",
      "horas-extras.html",
      "vacaciones-proporcionales.html",
      "gratificacion.html",
      "impuesto-unico.html",
      "cotizaciones-previsionales.html",
      "costo-empresa.html",
      "seguro-cesantia.html",
      "trabajo-pesado.html",
      "recargo-domingo-comercio.html",
      "feriado-irrenunciable.html",
      "semana-corrida.html",
      "asignacion-familiar.html",
      "colacion-movilizacion.html",
      "sueldo-minimo.html",
      "descuento-atrasos.html",
      "licencia-medica.html",
      "boleta-honorarios.html",
      "retencion-judicial.html",
      "apv.html",
      "sala-cuna.html",
      "postnatal-parental.html",
      "permiso-prenatal.html",
      "fuero-maternal.html",
      "permiso-paternidad.html",
      "permiso-matrimonio.html",
      "permiso-fallecimiento.html",
      "interes-mora.html",
      "hora-lactancia.html",
      "jornada-40-horas.html",
      "feriado-anual.html",
      "feriado-progresivo.html",
      "indemnizacion-anos-servicio.html",
      "aguinaldo.html",
      "finiquito-casa-particular.html",
      "sueldo-proporcional.html",
      "indemnizacion-aviso-previo.html",
      "nulidad-despido.html",
      "tutela-laboral.html",
      "despido-injustificado.html",
      "autodespido.html",
      "obra-faena.html",
      "prescripcion-laboral.html",
      "descanso-compensatorio.html",
      "inclusion-laboral.html",
      "jornada-parcial.html",
      "teletrabajo.html",
      "bandas-horarias.html",
      "pacto-4x3.html",
      "jornada-excepcional.html",
      "jornada-bisemanal.html",
      "compensacion-horas-extras.html",
      "pacto-horas-extras.html",
      "contrato-plazo-fijo.html",
      "termino-anticipado-plazo-fijo.html",
      "permiso-sin-goce.html",
      "zona-extrema.html",
      "promedio-remuneraciones.html",
      "finiquito.html",
      "empresa.html",
      "precios.html",
      "como.html",
      "guias.html",
      ...GUIDE_SLUGS.map((s) => `guias/${s}.html`),
      ...CAUSAL_PAGES.map((p) => `finiquito/${p.slug}.html`),
    ];
    const seenTitle = new Map();
    const seenH1 = new Map();
    for (const file of files) {
      const html = readFileSync(join(root, file), "utf8");
      const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      const h1 = (html.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
      assert(`SEO title no vacío ${file}`, title.length > 8);
      assert(`SEO H1 no vacío ${file}`, h1.length > 3);
      assert(`SEO title único ${file}`, !seenTitle.has(title), `duplicado con ${seenTitle.get(title)}: ${title}`);
      assert(`SEO H1 único ${file}`, !seenH1.has(h1), `duplicado con ${seenH1.get(h1)}: ${h1}`);
      seenTitle.set(title, file);
      seenH1.set(h1, file);
    }
  }
  {
    const hub = readFileSync(join(root, "guias.html"), "utf8");
    assert("SEO hub /guias existe", existsSync(join(root, "guias.html")));
    assert(
      "SEO hub lista 17 guías agrupadas",
      GUIDE_SLUGS.length === 17 &&
        GUIDE_SLUGS.every((s) => hub.includes(`/guias/${s}`)) &&
        /Liquidaci[oó]n de sueldo/.test(hub) &&
        /<h2>Finiquito<\/h2>/.test(hub) &&
        /href="\/sueldo"/.test(hub) &&
        /href="\/sueldo-proporcional"/.test(hub) &&
        /href="\/finiquito"/.test(hub),
    );
    assert(
      "SEO hub tiene últimas con fecha",
      /<h2>Últimas actualizaciones<\/h2>/.test(hub) &&
        /<ol class="guide-latest">/.test(hub) &&
        /datetime="2026-09-21"/.test(hub) &&
        /datetime="2026-09-14"/.test(hub) &&
        /datetime="2026-09-07"/.test(hub) &&
        /datetime="2026-08-31"/.test(hub) &&
        /href="\/guias\/liquidacion-de-sueldo-y-previred"/.test(hub) &&
        /href="\/guias\/vacaciones-proporcionales"/.test(hub) &&
        /href="\/guias\/me-reservo-el-derecho-en-el-finiquito"/.test(hub) &&
        /href="\/guias\/horas-extras"/.test(hub) &&
        !/href="\/blog"/.test(hub),
    );
    assert("SEO hub en sitemap", locs.includes("https://www.haberes.cl/guias"));
    assert(
      "SEO hub enlaza favicon.ico y svg",
      /href="favicon\.ico" sizes="32x32"/.test(hub) && /href="favicon\.svg" type="image\/svg\+xml"/.test(hub),
    );
  }
  assert(
    "SEO gratificación e IUSC sin constants.js en copy",
    !/js\/constants\.js/.test(readFileSync(join(root, "guias/gratificacion-legal.html"), "utf8")) &&
      !/js\/constants\.js/.test(readFileSync(join(root, "guias/impuesto-unico.html"), "utf8")),
  );
  assert(
    "SEO sueldo y finiquito tienen FAQPage",
    /"@type": "FAQPage"/.test(readFileSync(join(root, "sueldo.html"), "utf8")) &&
      /"@type": "FAQPage"/.test(readFileSync(join(root, "finiquito.html"), "utf8")),
  );
  assert("SEO fuentes autoalojadas", existsSync(join(root, "fonts/ibm-plex-sans-latin-400-normal.woff2")) && existsSync(join(root, "fonts/LICENSE")));
  {
  const og = readFileSync(join(root, "img/og-default.png"));
  assert(
    "SEO og-default.png 1200×630",
    og[0] === 0x89 &&
      og[1] === 0x50 &&
      og.readUInt32BE(16) === 1200 &&
      og.readUInt32BE(20) === 630 &&
      og.length > 8_000,
  );
}
  assert(
    "SEO guías del registro tienen HTML",
    GUIDE_SLUGS.every((s) => existsSync(join(root, "guias", `${s}.html`))),
  );
  assert(
    "SEO 21 causales tienen HTML",
    CAUSAL_PAGES.length === 21 &&
      CAUSAL_PAGES.every((p) => existsSync(join(root, "finiquito", `${p.slug}.html`))),
  );
  assert(
    "SEO guía finiquito tiene FAQPage + WebApplication",
    /"@type": "FAQPage"/.test(readFileSync(join(root, "guias/finiquito.html"), "utf8")) &&
      /"@type": "WebApplication"/.test(readFileSync(join(root, "guias/finiquito.html"), "utf8")),
  );
  for (const file of ["admin.html", "reset.html", "privacidad.html", "terminos.html"]) {
    assert(`SEO sin Google Fonts ${file}`, !/fonts\.googleapis\.com/.test(readFileSync(join(root, file), "utf8")));
  }
}

/* ---------- Tema y contraste (ampliado) ---------- */
{
  function hexLum(hex) {
    const h = String(hex || "").replace("#", "").trim();
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
    const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(n(0)) + 0.7152 * lin(n(2)) + 0.0722 * lin(n(4));
  }
  function contrast(a, b) {
    const L1 = hexLum(a);
    const L2 = hexLum(b);
    if (L1 == null || L2 == null) return 0;
    const hi = Math.max(L1, L2);
    const lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function parseTokens(block) {
    const out = {};
    for (const m of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
      const v = m[2].trim();
      if (v.startsWith("#")) out[m[1]] = v.slice(0, 7);
    }
    return out;
  }
  const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  const nightBlock = css.match(/html\[data-theme="night"\]\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  const day = parseTokens(rootBlock);
  const night = parseTokens(nightBlock);
  const pairs = [
    ["text", "surface"],
    ["text", "paper"],
    ["text", "surface-2"],
    ["text", "surface-3"],
    ["muted", "surface"],
    ["on-danger", "danger"],
    ["on-success", "success"],
    ["on-warn", "warn"],
    ["on-info", "info"],
    ["on-accent", "accent"],
    ["on-ink", "ink"],
  ];
  for (const [fg, bg] of pairs) {
    assert(
      `contraste noche ${fg}/${bg} ≥ 4.5`,
      contrast(night[fg], night[bg]) >= 4.5,
      String(contrast(night[fg], night[bg])),
    );
  }
  assert(
    "día luminancia surface > surface-2 > surface-3",
    hexLum(day.surface) > hexLum(day["surface-2"]) && hexLum(day["surface-2"]) > hexLum(day["surface-3"]),
    JSON.stringify({
      s: hexLum(day.surface),
      s2: hexLum(day["surface-2"]),
      s3: hexLum(day["surface-3"]),
    }),
  );
  assert("field-line declarado en ambos temas", day["field-line"] && night["field-line"]);
  assert(
    "contraste día ink/paper (marca) ≥ 4.5",
    contrast(day.ink, day.paper) >= 4.5,
    String(contrast(day.ink, day.paper)),
  );
  assert(
    "contraste noche ink/paper (marca) ≥ 4.5",
    contrast(night.ink, night.paper) >= 4.5,
    String(contrast(night.ink, night.paper)),
  );
}

{
  console.log("\nTema e inicio");
  function listHtml(dir, acc = []) {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === ".git") continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) listHtml(p, acc);
      else if (name.endsWith(".html")) acc.push(p);
    }
    return acc;
  }
  const pages = listHtml(root);
  assert("109 páginas HTML", pages.length === 109, String(pages.length));
  for (const file of pages) {
    const html = readFileSync(file, "utf8");
    const rel = file.slice(root.length + 1);
    assert(`${rel} sin prefers-color-scheme`, !/prefers-color-scheme/.test(html));
    assert(`${rel} ic-sun e ic-moon`, /class="ic-sun"/.test(html) && /class="ic-moon"/.test(html));
    const mark = html.match(/<span class="brand-mark"[^>]*>[\s\S]*?<\/span>/);
    assert(
      `${rel} brand-mark isotype SVG`,
      Boolean(mark) &&
        /<svg[\s\S]*viewBox="0 0 32 32"[\s\S]*fill="currentColor"/.test(mark[0]) &&
        (mark[0].match(/<rect /g) || []).length === 11 &&
        !/<text[\s>]/.test(mark[0]) &&
        !/<span class="brand-mark">H<\/span>/.test(html),
    );
  }
  const themeSrc = readFileSync(join(root, "js/theme.js"), "utf8");
  assert("js/theme.js sin prefers-color-scheme", !/prefers-color-scheme/.test(themeSrc));
  assert("js/theme.js preferred día", /function preferred\(\) \{\s*return "day";/.test(themeSrc));

  assert(
    "css brand-mark hereda --ink, sin tile",
    /\.brand-mark\s*\{[\s\S]*?color:\s*var\(--ink\)/.test(css) &&
      /\.brand-mark svg\s*\{/.test(css) &&
      !/\.brand-mark\s*\{[^}]*background:\s*var\(--ink\)/.test(css),
  );

  const home = readFileSync(join(root, "index.html"), "utf8");
  const demoCalc = calcularSueldo(
    {
      sueldoBase: 1_200_553,
      afp: "modelo",
      salud: "fonasa",
      contrato: "indefinido",
      gratificacionArt50: true,
    },
    { uf: FALLBACK_UF },
  );
  assert(
    "index demo montos estáticos",
    home.includes(clp(demoCalc.liquido)) &&
      home.includes(clp(demoCalc.gratificacion)) &&
      home.includes(clp(demoCalc.imponible)) &&
      home.includes(clp(demoCalc.afp.monto)) &&
      home.includes(clp(demoCalc.salud.monto)) &&
      home.includes(clp(demoCalc.cesantia.monto)) &&
      home.includes(clp(demoCalc.baseTributable)) &&
      home.includes(clp(demoCalc.iusc)) &&
      !/<output[^>]*>\s*[—\-]\s*</.test(home) &&
      !/<strong data-demo="[^"]+">\s*<\/strong>/.test(home),
  );
  assert("index un solo h1", (home.match(/<h1[\s>]/g) || []).length === 1);
  assert(
    "index slider IMM 553553 paso 1000 inicial 1200553",
    /id="homeBruto"[\s\S]*?min="553553"/.test(home) &&
      /id="homeBruto"[\s\S]*?step="1000"/.test(home) &&
      /id="homeBruto"[\s\S]*?value="1200553"/.test(home),
  );
  const faqLd = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => {
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    })
    .find((o) => o && o["@type"] === "FAQPage");
  const summaries = [...home.matchAll(/<summary>([\s\S]*?)<\/summary>/g)].map((m) =>
    m[1].replace(/<[^>]+>/g, "").trim(),
  );
  const names = (faqLd?.mainEntity || []).map((q) => q.name);
  assert(
    "index FAQPage mainEntity = details",
    names.length === 5 &&
      summaries.length === 5 &&
      names.every((n) => summaries.includes(n)) &&
      summaries.every((n) => names.includes(n)),
    JSON.stringify({ names, summaries }),
  );
  assert(
    "app-home.js importa calcularSueldo",
    /import\s*\{[^}]*calcularSueldo[^}]*\}\s*from\s*["']\.\/sueldo\.js["']/.test(
      readFileSync(join(root, "js/app-home.js"), "utf8"),
    ),
  );
  for (const f of [
    "ibm-plex-serif-latin-600-normal.woff2",
    "ibm-plex-serif-latin-700-normal.woff2",
    "ibm-plex-mono-latin-400-normal.woff2",
    "ibm-plex-mono-latin-500-normal.woff2",
  ]) {
    assert(`fuente ${f}`, existsSync(join(root, "fonts", f)));
  }
  const reveal = css.match(/(?:^|\n)\s*(?:\.reveal|\[data-reveal\])[^{]*\{[\s\S]*?\}/);
  if (reveal) {
    const hides = /opacity:\s*0|visibility:\s*hidden|display:\s*none/.test(reveal[0]);
    const jsScoped = /html\.js|\.js\s/.test(reveal[0]);
    assert("reveal no oculta secciones fuera de .js", !hides || jsScoped);
  } else {
    assert("reveal no oculta secciones fuera de .js", true);
  }
}

console.log(`\n${passed} ok, ${failed} fail`);
if (failed) process.exit(1);
console.log("PASS");
