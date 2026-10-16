/**
 * Modelo de contrato individual de trabajo.
 *
 * Arts. 9, 9 bis, 10, 10 bis y 11 del Código del Trabajo, texto refundido
 * BCN idNorma 207436, versión 2026-07-23.
 *
 * Art. 9: consensual; por escrito y firmado en dos ejemplares. Plazo para
 * escriturarlo: quince días de incorporado el trabajador, o cinco días si es
 * por obra, trabajo o servicio determinado o de duración inferior a treinta
 * días. Art. 9 bis: registro en el sitio electrónico de la DT dentro de los
 * quince días siguientes a la celebración.
 *
 * Art. 10 (cláusulas mínimas): lugar y fecha; individualización (nacionalidad,
 * domicilio y correo de ambas partes, si lo tuvieren, y fechas de nacimiento
 * e ingreso del trabajador); naturaleza de los servicios y lugar o ciudad;
 * monto, forma y período de pago; duración y distribución de la jornada
 * (salvo turnos, que se rigen por el reglamento interno); plazo; demás pactos.
 *
 * Los topes de jornada, de plazo fijo y de sueldo mínimo no se reescriben:
 * salen de topeJornadaOrdinaria, calcularContratoPlazoFijo y
 * calcularSueldoMinimo.
 *
 * No calcula finiquito, IAS ni la indemnización de obra o faena.
 *
 * @see https://www.bcn.cl/leychile/navegar?idNorma=207436
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1191554 Ley 21.561
 * @see https://www.bcn.cl/leychile/navegar?idNorma=1225354 Ley 21.830
 */
import { fechaCartaEs, diasEntreFechas } from "./carta-renuncia.js";
import { clp, formatRut, validarRut } from "./format.js";
import { calcularContratoPlazoFijo } from "./contrato-plazo-fijo.js";
import { calcularSueldoMinimo, topeJornadaOrdinaria } from "./sueldo.js";

/** Art. 9 inciso 2: plazo general para escriturar, desde la incorporación. */
export const PLAZO_ESCRITURA_DIAS = 15;
/** Art. 9 inciso 2: obra, trabajo o servicio determinado, o duración menor a 30 días. */
export const PLAZO_ESCRITURA_CORTO_DIAS = 5;
/** Art. 9 inciso 2: «duración inferior a treinta días». */
export const DURACION_CORTA_DIAS = 30;
/** Art. 9 bis: registro electrónico, contado desde la celebración. */
export const PLAZO_REGISTRO_DT_DIAS = 15;

const FORMAS = Object.freeze({
  transferencia: "transferencia electrónica",
  efectivo: "efectivo",
  cheque: "cheque",
  vale_vista: "vale vista",
});

const PERIODOS = Object.freeze({
  mensual: "mensual",
  quincenal: "quincenal",
  semanal: "semanal",
});

const TIPOS = Object.freeze(["indefinido", "plazo_fijo", "obra"]);

function limpio(raw, max = 160) {
  return String(raw || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function linea(raw, vacio, max) {
  return limpio(raw, max) || vacio;
}

function rutTexto(raw, vacio) {
  const typed = limpio(raw, 20);
  if (!typed) return { texto: vacio, ok: false, vacio: true };
  const ok = validarRut(typed);
  return { texto: ok ? formatRut(typed) : typed, ok, vacio: false };
}

function isoOk(iso) {
  return Boolean(fechaCartaEs(iso));
}

function partesIso(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!m || !isoOk(iso)) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

/** Años cumplidos de `nacimiento` al día `al`. Null si alguna fecha no vale. */
export function edadCumplida(nacimiento, al) {
  const n = partesIso(nacimiento);
  const a = partesIso(al);
  if (!n || !a) return null;
  let age = a.y - n.y;
  if (a.mo < n.mo || (a.mo === n.mo && a.d < n.d)) age -= 1;
  return age;
}

function horasTexto(n) {
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n * 100) / 100;
  return String(rounded).replace(".", ",");
}

function correoFrase(raw) {
  const email = limpio(raw, 120);
  return email ? `, correo electrónico ${email}` : "";
}

/**
 * Plazo del art. 9 inciso 2 para hacer constar el contrato por escrito.
 * Cinco días si es obra o faena, o si el plazo fijo dura menos de 30 días.
 * @param {{ tipo?: string, duracionDias?: number|null }} input
 */
export function plazoEscrituraDias({ tipo = "indefinido", duracionDias = null } = {}) {
  if (tipo === "obra") return PLAZO_ESCRITURA_CORTO_DIAS;
  if (tipo === "plazo_fijo" && duracionDias != null && duracionDias < DURACION_CORTA_DIAS) {
    return PLAZO_ESCRITURA_CORTO_DIAS;
  }
  return PLAZO_ESCRITURA_DIAS;
}

function clausulaPlazo(tipo, input, plazoCalc) {
  if (tipo === "obra") {
    const obra = linea(input.obra, "[obra o faena determinada]", 240);
    return `El contrato es por obra o faena determinada: ${obra}. Su vigencia se limita a la duración de esa obra, en los términos del artículo 10 bis del Código del Trabajo. Las etapas de una misma obra no se pactan aquí como contratos sucesivos de este tipo.`;
  }
  if (tipo === "plazo_fijo") {
    const hasta = plazoCalc.ok ? fechaCartaEs(plazoCalc.fechaTermino) : fechaCartaEs(input.fechaTermino);
    const fecha = hasta || "[fecha de término]";
    const tope = plazoCalc.topeLegalMeses;
    const titulo = Boolean(input.esTituloOGerente);
    const calidad = titulo
      ? " El trabajador declara desempeñarse como gerente o contar con título profesional o técnico de una institución de educación superior del Estado o reconocida por éste, para el tope de dos años del artículo 159 N° 4."
      : "";
    return `El contrato es a plazo fijo y vence el ${fecha}. El artículo 159 N° 4 limita esta duración a ${tope} meses.${calidad}`;
  }
  return "El contrato es de duración indefinida.";
}

function pisoRemuneracion({ horas, sueldo, tramo, tope }) {
  const piso = calcularSueldoMinimo({
    tramo,
    horasSemana: horas,
    sueldoBase: sueldo,
  });
  const jornadaCompletaEnTope = horas > 0 && horas + 0.001 >= tope && tope !== piso.jornadaOrdinaria;
  const referencia = jornadaCompletaEnTope ? piso.imm : piso.immProporcional;
  const bajo = piso.sueldoBase > 0 && piso.sueldoBase < referencia;
  return { piso, referencia, bajo, jornadaCompletaEnTope };
}

/**
 * @param {{
 *   ciudad?: string,
 *   fechaContrato?: string,
 *   empleador?: string,
 *   rutEmpleador?: string,
 *   nacionalidadEmpleador?: string,
 *   domicilioEmpleador?: string,
 *   emailEmpleador?: string,
 *   representante?: string,
 *   rutRepresentante?: string,
 *   trabajador?: string,
 *   rutTrabajador?: string,
 *   nacionalidadTrabajador?: string,
 *   fechaNacimiento?: string,
 *   fechaIngreso?: string,
 *   domicilioTrabajador?: string,
 *   emailTrabajador?: string,
 *   cargo?: string,
 *   servicios?: string,
 *   ciudadServicios?: string,
 *   sueldoBase?: number,
 *   formaPago?: string,
 *   periodoPago?: string,
 *   horasSemanales?: number,
 *   distribucion?: string,
 *   tipo?: string,
 *   fechaTermino?: string,
 *   esTituloOGerente?: boolean,
 *   obra?: string,
 *   otrosPactos?: string,
 * }} input
 */
export function redactarContratoTrabajo(input = {}) {
  const tipo = TIPOS.includes(input.tipo) ? input.tipo : "indefinido";
  const ciudad = linea(input.ciudad, "[ciudad]", 80);
  const fechaContratoTxt = fechaCartaEs(input.fechaContrato) || "[fecha del contrato]";
  const empleador = linea(input.empleador, "[empleador]", 160);
  const rutEmp = rutTexto(input.rutEmpleador, "[RUT del empleador]");
  const nacEmp = linea(input.nacionalidadEmpleador, "[nacionalidad del empleador]", 60);
  const domEmp = linea(input.domicilioEmpleador, "[domicilio del empleador]", 160);
  const representante = limpio(input.representante, 120);
  const rutRep = rutTexto(input.rutRepresentante, "");
  const trabajador = linea(input.trabajador, "[nombre del trabajador]", 120);
  const rutTrab = rutTexto(input.rutTrabajador, "[RUT del trabajador]");
  const nacTrab = linea(input.nacionalidadTrabajador, "[nacionalidad del trabajador]", 60);
  const nacimientoTxt = fechaCartaEs(input.fechaNacimiento) || "[fecha de nacimiento]";
  const ingresoTxt = fechaCartaEs(input.fechaIngreso) || "[fecha de ingreso]";
  const domTrab = linea(input.domicilioTrabajador, "[domicilio del trabajador]", 160);
  const cargo = linea(input.cargo, "[cargo o función]", 120);
  const servicios = linea(input.servicios, cargo, 400).replace(/\.+$/, "");
  const ciudadServicios = linea(input.ciudadServicios, "[ciudad en que se prestan los servicios]", 80);
  const sueldo = Math.max(0, Math.round(Number(input.sueldoBase) || 0));
  const forma = FORMAS[input.formaPago] || "[forma de pago]";
  const periodo = PERIODOS[input.periodoPago] || "[período de pago]";
  const horas = Math.max(0, Number(input.horasSemanales) || 0);
  const distribucion = linea(input.distribucion, "[distribución de la jornada]", 240);
  const otros = limpio(input.otrosPactos, 500);

  const fechaRef = isoOk(input.fechaIngreso)
    ? String(input.fechaIngreso).trim()
    : isoOk(input.fechaContrato)
      ? String(input.fechaContrato).trim()
      : "";
  const tope = topeJornadaOrdinaria(fechaRef || undefined);
  const edad = edadCumplida(input.fechaNacimiento, fechaRef);
  const tramo = edad != null && (edad < 18 || edad > 65) ? "menorMayor" : "general";

  const plazoCalc =
    tipo === "plazo_fijo"
      ? calcularContratoPlazoFijo({
          fechaInicio: isoOk(input.fechaIngreso) ? String(input.fechaIngreso).trim() : "",
          fechaTermino: isoOk(input.fechaTermino) ? String(input.fechaTermino).trim() : "",
          esTituloProfesionalOTecnico: Boolean(input.esTituloOGerente),
          esGerente: Boolean(input.esTituloOGerente),
        })
      : null;
  const duracionDias = plazoCalc && plazoCalc.ok ? plazoCalc.duracionDias : null;
  const plazoEscritura = plazoEscrituraDias({ tipo, duracionDias });
  const diasDesdeIngreso = diasEntreFechas(input.fechaIngreso, input.fechaContrato);
  const piso = pisoRemuneracion({ horas, sueldo, tramo, tope });

  const avisos = [];
  if (horas <= 0) {
    avisos.push({
      codigo: "sin_jornada",
      texto: "Indique las horas semanales. El artículo 10 N° 5 pide la duración y la distribución de la jornada.",
    });
  } else if (horas > tope) {
    avisos.push({
      codigo: "supera_jornada",
      texto: `La jornada de ${horasTexto(horas)} h supera el tope legal de ${tope} h semanales a la fecha de ingreso (Ley 21.561).`,
    });
  }
  if (piso.bajo) {
    const detalle = piso.jornadaCompletaEnTope
      ? `el ingreso mínimo de ${clp(piso.referencia)} para la jornada ordinaria de ${tope} h`
      : piso.piso.factor >= 1
        ? `el ingreso mínimo mensual de ${clp(piso.referencia)} para jornada completa`
        : `el mínimo proporcional de ${clp(piso.referencia)} (${horasTexto(horas)} h sobre ${piso.piso.jornadaOrdinaria} h ordinarias)`;
    avisos.push({
      codigo: "bajo_minimo",
      texto: `El sueldo base de ${clp(sueldo)} está bajo ${detalle} (art. 44, Ley 21.830).`,
    });
  }
  if (tipo === "plazo_fijo" && plazoCalc && !plazoCalc.ok) {
    avisos.push({
      codigo: "plazo_fijo_incompleto",
      texto: "Indique la fecha de ingreso y una fecha de término posterior. El tope del artículo 159 N° 4 se revisa con ambas.",
    });
  } else if (tipo === "plazo_fijo" && plazoCalc && !plazoCalc.cumpleTope) {
    avisos.push({
      codigo: "excede_plazo_fijo",
      texto: `Este plazo fijo supera el tope de ${plazoCalc.topeLegalMeses} meses del artículo 159 N° 4.`,
    });
  }
  if (diasDesdeIngreso != null && diasDesdeIngreso > plazoEscritura) {
    avisos.push({
      codigo: "escritura_tarde",
      texto: `Hay ${diasDesdeIngreso} días entre el ingreso y la fecha del contrato. El artículo 9 exige escriturarlo dentro de ${plazoEscritura} días desde la incorporación.`,
    });
  }

  const repFrase = representante
    ? `, por intermedio de ${representante}${rutRep.vacio ? "" : `, RUT ${rutRep.texto}`}`
    : "";
  const bloques = [
    "CONTRATO INDIVIDUAL DE TRABAJO",
    "Modelo educativo de Haberes. No constituye asesoría legal ni un formulario de la Dirección del Trabajo o de Previred.",
    `En ${ciudad}, a ${fechaContratoTxt}, entre ${empleador}, RUT ${rutEmp.texto}, de nacionalidad ${nacEmp}, con domicilio en ${domEmp}${correoFrase(input.emailEmpleador)}${repFrase}, en adelante el empleador; y ${trabajador}, RUT ${rutTrab.texto}, de nacionalidad ${nacTrab}, nacido el ${nacimientoTxt}, con domicilio en ${domTrab}${correoFrase(input.emailTrabajador)}, en adelante el trabajador, se conviene el siguiente contrato individual de trabajo.`,
    `PRIMERO. Lugar, fecha e ingreso. Este contrato se celebra en ${ciudad} el ${fechaContratoTxt}. La fecha de ingreso del trabajador es el ${ingresoTxt}.`,
    `SEGUNDO. Servicios. El trabajador prestará servicios como ${cargo} en ${ciudadServicios}. La naturaleza de los servicios es: ${servicios}.`,
    `TERCERO. Remuneración. El empleador pagará un sueldo base de ${sueldo > 0 ? clp(sueldo) : "[sueldo base]"}, con período de pago ${periodo}, mediante ${forma}. El período de pago no excede de un mes.`,
    `CUARTO. Jornada. La jornada será de ${horas > 0 ? `${horasTexto(horas)} horas semanales` : "[horas semanales]"}, distribuida ${distribucion}.`,
    `QUINTO. Plazo. ${clausulaPlazo(tipo, input, plazoCalc || { ok: false, topeLegalMeses: 12 })}`,
    `SEXTO. Otros pactos. ${otros || "Las partes no agregan otros pactos en este modelo. Los beneficios en especie, si existieren, deben consignarse."}`,
    `SÉPTIMO. Ejemplares. Las partes firman este contrato en dos ejemplares de igual tenor, quedando uno en poder de cada una. El empleador debe hacerlo constar por escrito dentro de ${plazoEscritura === PLAZO_ESCRITURA_CORTO_DIAS ? "cinco" : "quince"} días de incorporado el trabajador (artículo 9 del Código del Trabajo) y registrarlo en el sitio electrónico de la Dirección del Trabajo dentro de los quince días siguientes a su celebración (artículo 9 bis).`,
    "Las modificaciones de este contrato se escrituran y firman al dorso de los ejemplares o en un documento anexo (artículo 11). Este texto es un modelo: no reemplaza la revisión de las partes.",
    `En comprobante, firman.\n\n\n______________________________\n${representante || empleador}\n${representante ? `pp. ${empleador}\n` : ""}RUT ${representante && !rutRep.vacio ? rutRep.texto : rutEmp.texto}\n\n\n______________________________\n${trabajador}\nRUT ${rutTrab.texto}`,
  ];

  return {
    texto: bloques.join("\n\n"),
    tipo,
    rutTrabajadorOk: rutTrab.ok,
    rutEmpleadorOk: rutEmp.ok,
    rutRepresentanteOk: rutRep.vacio ? null : rutRep.ok,
    plazoEscrituraDias: plazoEscritura,
    diasDesdeIngreso,
    topeJornada: tope,
    horasSemanales: horas,
    sueldoBase: sueldo,
    tramo,
    edad,
    immReferencia: piso.referencia,
    bajoMinimo: piso.bajo,
    superaJornada: horas > tope && horas > 0,
    excedePlazoFijo: Boolean(plazoCalc && plazoCalc.ok && !plazoCalc.cumpleTope),
    escrituraTarde: diasDesdeIngreso != null && diasDesdeIngreso > plazoEscritura,
    duracionDias,
    avisos,
  };
}
