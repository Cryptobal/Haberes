/**
 * Carta de aviso de término que el empleador comunica al trabajador (art. 162).
 * Texto vigente citado por la Dirección del Trabajo (consultas 60543, 60572,
 * 60576 y trámite de carta electrónica) y por el art. 162 en la BCN (idNorma 207436):
 * - 159 N° 4 y N° 5, y art. 160: comunicación dentro de los tres días hábiles
 *   siguientes a la separación; copia a la Inspección en el mismo plazo.
 * - 159 N° 6: seis días hábiles, con copia en el mismo plazo.
 * - 161 inciso primero: aviso con treinta días de anticipación y copia a la
 *   Inspección, salvo indemnización sustitutiva equivalente a la última
 *   remuneración mensual. La comunicación indica el monto del art. 163.
 * - 161 desahucio: treinta días y copia a la Inspección, o suma equivalente
 *   a la última remuneración mensual (el propio art. 161).
 * - Cotizaciones: estado de pago hasta el último día del mes anterior, con
 *   comprobantes. Si no están íntegramente pagadas, el despido no pone término.
 * - 159 N° 1, 2 y 3 no usan esta carta.
 * No calcula montos ni días hábiles (domingos y festivos los excluye la DT;
 * esta plantilla no arma ese calendario).
 */
import { diasEntreFechas, fechaCartaEs } from "./carta-renuncia.js";
import { formatRut, validarRut } from "./format.js";

/** @typedef {"3" | "6" | "30"} PlazoCarta */

/**
 * Numeración del Código (N°), no las letras con que Haberes rotula las fichas.
 * @type {Record<string, {
 *   slug: string,
 *   cita: string,
 *   nombre: string,
 *   carta: boolean,
 *   plazo?: PlazoCarta,
 *   monto163?: boolean,
 *   montoObra?: boolean,
 *   desahucio?: boolean,
 *   acoso?: boolean,
 * }>}
 */
export const CAUSALES_CARTA = {
  "159-a": {
    slug: "art-159-mutuo-acuerdo",
    cita: "artículo 159 N° 1",
    nombre: "mutuo acuerdo de las partes",
    carta: false,
  },
  "159-b": {
    slug: "art-159-renuncia-voluntaria",
    cita: "artículo 159 N° 2",
    nombre: "renuncia del trabajador",
    carta: false,
  },
  "159-c": {
    slug: "art-159-muerte-del-trabajador",
    cita: "artículo 159 N° 3",
    nombre: "muerte del trabajador",
    carta: false,
  },
  "159-d": {
    slug: "art-159-vencimiento-del-plazo",
    cita: "artículo 159 N° 4",
    nombre: "vencimiento del plazo convenido en el contrato",
    carta: true,
    plazo: "3",
  },
  "159-e": {
    slug: "art-159-conclusion-del-trabajo",
    cita: "artículo 159 N° 5",
    nombre: "conclusión del trabajo o servicio que dio origen al contrato",
    carta: true,
    plazo: "3",
    montoObra: true,
  },
  "159-f": {
    slug: "art-159-caso-fortuito",
    cita: "artículo 159 N° 6",
    nombre: "caso fortuito o fuerza mayor",
    carta: true,
    plazo: "6",
  },
  "160-1-a": {
    slug: "art-160-falta-de-probidad",
    cita: "artículo 160 N° 1 letra a)",
    nombre: "falta de probidad del trabajador en el desempeño de sus funciones",
    carta: true,
    plazo: "3",
  },
  "160-1-b": {
    slug: "art-160-acoso-sexual",
    cita: "artículo 160 N° 1 letra b)",
    nombre: "conductas de acoso sexual",
    carta: true,
    plazo: "3",
    acoso: true,
  },
  "160-1-c": {
    slug: "art-160-vias-de-hecho",
    cita: "artículo 160 N° 1 letra c)",
    nombre: "vías de hecho",
    carta: true,
    plazo: "3",
  },
  "160-1-d": {
    slug: "art-160-injurias",
    cita: "artículo 160 N° 1 letra d)",
    nombre: "injurias proferidas por el trabajador al empleador",
    carta: true,
    plazo: "3",
  },
  "160-1-e": {
    slug: "art-160-conducta-inmoral",
    cita: "artículo 160 N° 1 letra e)",
    nombre: "conducta inmoral del trabajador que afecte a la empresa",
    carta: true,
    plazo: "3",
  },
  "160-1-f": {
    slug: "art-160-acoso-laboral",
    cita: "artículo 160 N° 1 letra f)",
    nombre: "conductas de acoso laboral",
    carta: true,
    plazo: "3",
    acoso: true,
  },
  "160-2": {
    slug: "art-160-negociaciones-prohibidas",
    cita: "artículo 160 N° 2",
    nombre: "negociaciones prohibidas por escrito en el contrato",
    carta: true,
    plazo: "3",
  },
  "160-3": {
    slug: "art-160-no-concurrencia",
    cita: "artículo 160 N° 3",
    nombre: "no concurrencia del trabajador a sus labores sin causa justificada",
    carta: true,
    plazo: "3",
  },
  "160-4-a": {
    slug: "art-160-abandono-salida-intempestiva",
    cita: "artículo 160 N° 4 letra a)",
    nombre: "abandono del trabajo por salida intempestiva e injustificada",
    carta: true,
    plazo: "3",
  },
  "160-4-b": {
    slug: "art-160-abandono-negativa",
    cita: "artículo 160 N° 4 letra b)",
    nombre: "abandono del trabajo por negativa a trabajar sin causa justificada",
    carta: true,
    plazo: "3",
  },
  "160-5": {
    slug: "art-160-imprudencia-temeraria",
    cita: "artículo 160 N° 5",
    nombre: "actos, omisiones o imprudencias temerarias",
    carta: true,
    plazo: "3",
  },
  "160-6": {
    slug: "art-160-perjuicio-material",
    cita: "artículo 160 N° 6",
    nombre: "perjuicio material causado intencionalmente",
    carta: true,
    plazo: "3",
  },
  "160-7": {
    slug: "art-160-incumplimiento-grave",
    cita: "artículo 160 N° 7",
    nombre: "incumplimiento grave de las obligaciones que impone el contrato",
    carta: true,
    plazo: "3",
  },
  "161-necesidades": {
    slug: "art-161-necesidades-de-la-empresa",
    cita: "artículo 161 inciso primero",
    nombre: "necesidades de la empresa, establecimiento o servicio",
    carta: true,
    plazo: "30",
    monto163: true,
  },
  "161-desahucio": {
    slug: "art-161-desahucio",
    cita: "artículo 161",
    nombre: "desahucio escrito del empleador",
    carta: true,
    plazo: "30",
    desahucio: true,
  },
};

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

export function tocaAcosoDespido(causalId, ...textos) {
  if (CAUSALES_CARTA[causalId]?.acoso) return true;
  return textos.some((raw) => /acoso|hostigamiento|violencia en el trabajo/i.test(String(raw || "")));
}

function plazoHabil(plazo) {
  if (plazo === "6") {
    return "dentro de los seis días hábiles siguientes al de la separación del trabajador";
  }
  return "dentro de los tres días hábiles siguientes al de la separación del trabajador";
}

/**
 * @param {{
 *   nombre?: string,
 *   rut?: string,
 *   empleador?: string,
 *   rutEmpleador?: string,
 *   firmante?: string,
 *   cargo?: string,
 *   ciudad?: string,
 *   domicilio?: string,
 *   fechaCarta?: string,
 *   fechaTermino?: string,
 *   causal?: string,
 *   hechos?: string,
 *   medio?: string,
 *   cotizaciones?: string,
 *   avisoModo?: string,
 *   monto?: string,
 * }} input
 */
export function redactarCartaDespido(input = {}) {
  const causal = CAUSALES_CARTA[input.causal] ? input.causal : "161-necesidades";
  const meta = CAUSALES_CARTA[causal];
  const nombre = linea(input.nombre, "[nombre del trabajador]", 120);
  const rut = rutTexto(input.rut, "[RUT del trabajador]");
  const empleador = linea(input.empleador, "[razón social del empleador]", 160);
  const rutEmp = rutTexto(input.rutEmpleador, "");
  const firmante = linea(input.firmante, "[nombre de quien firma]", 120);
  const cargo = linea(input.cargo, "[cargo]", 120);
  const ciudad = linea(input.ciudad, "[ciudad]", 80);
  const domicilio = linea(input.domicilio, "[domicilio señalado en el contrato]", 160);
  const fecha = fechaCartaEs(input.fechaCarta) || "[fecha de la carta]";
  const termino = fechaCartaEs(input.fechaTermino) || "[fecha de término]";
  const hechosTxt = limpio(input.hechos, 800);
  const hechosVacios = hechosTxt.length === 0;
  const hechosBase = hechosTxt || "[hechos en que se funda la causal]";
  const hechos = /[.!?…]$/.test(hechosBase) ? hechosBase : `${hechosBase}.`;
  const medio = input.medio === "certificada" ? "certificada" : "personal";
  const cotizacionesImpagas = input.cotizaciones === "impagas";
  const avisoModo = input.avisoModo === "sustitutiva" ? "sustitutiva" : "treinta";
  const montoTxt = limpio(input.monto, 80);
  const montoPendiente = Boolean(meta.monto163 || meta.montoObra) && montoTxt.length === 0;
  const diasAnticipacion = diasEntreFechas(input.fechaCarta, input.fechaTermino);
  const avisoInsuficiente =
    meta.plazo === "30" && avisoModo === "treinta" && (diasAnticipacion === null || diasAnticipacion < 30);
  const tocaAcoso = tocaAcosoDespido(causal, hechosTxt);
  const empleadorRut = rutEmp.vacio ? empleador : `${empleador}, RUT ${rutEmp.texto},`;

  if (!meta.carta) {
    const destino =
      causal === "159-b"
        ? "La renuncia la escribe el trabajador. En Haberes esa plantilla es /carta-renuncia."
        : `La ficha de esta causal es /finiquito/${meta.slug}.`;
    return {
      texto: [
        `${ciudad}, ${fecha}`,
        "",
        `${meta.cita} (${meta.nombre}) no se comunica con la carta de despido del artículo 162.`,
        "Esa comunicación la exige el artículo 162 cuando el contrato termina por los números 4, 5 o 6 del artículo 159, o el empleador pone término por el artículo 160 o por el artículo 161.",
        "En los números 1, 2 y 3 del artículo 159 la Dirección del Trabajo indica que no corresponde acreditar cotizaciones previsionales para la validez del término, ni usar esta carta de despido.",
        destino,
        "Esta hoja no es un despido, no es el finiquito y no fija montos.",
      ].join("\n\n"),
      aplica: false,
      causal,
      slug: meta.slug,
      cita: meta.cita,
      plazo: null,
      diasAnticipacion,
      avisoInsuficiente: false,
      cotizacionesImpagas: false,
      hechosVacios: false,
      montoPendiente: false,
      tocaAcoso: false,
      medio,
      rutTrabajadorOk: rut.ok,
      rutEmpleadorOk: rutEmp.vacio ? null : rutEmp.ok,
    };
  }

  const cabeza = [`${ciudad}, ${fecha}`, "", "Señor(a)", nombre, `Cédula de identidad N° ${rut.texto}`, `Cargo: ${cargo}`, "Presente"];
  const bloques = [
    cabeza.join("\n"),
    "De nuestra consideración:",
    `${empleadorRut} comunica a usted el término de su contrato de trabajo, en la forma que exige el artículo 162 del Código del Trabajo.`,
    `Causal invocada: ${meta.cita} del Código del Trabajo (${meta.nombre}).`,
    `Hechos en que se funda: ${hechos}`,
    `La fecha de término es el ${termino}.`,
  ];

  if (medio === "certificada") {
    bloques.push(
      `Esta comunicación se envía por carta certificada al domicilio señalado en el contrato: ${domicilio}.`,
    );
  } else {
    bloques.push("Esta comunicación se entrega personalmente al trabajador.");
  }

  if (meta.plazo === "30" && meta.desahucio) {
    if (avisoModo === "sustitutiva") {
      bloques.push(
        "No se da el desahucio con treinta días de anticipación. El artículo 161 no exige esa anticipación cuando el empleador paga una indemnización en dinero efectivo equivalente a la última remuneración mensual devengada. Esta carta no calcula ese monto.",
      );
    } else if (avisoInsuficiente) {
      const diasTxt = diasAnticipacion === null ? "un lapso que no se pudo contar" : `${diasAnticipacion} días`;
      bloques.push(
        `Se quiso dar el desahucio con treinta días de anticipación y copia a la Inspección del Trabajo (artículo 161). Entre la fecha de esta comunicación y la fecha de término hay ${diasTxt}, menos de treinta. En ese caso el mismo artículo exige la indemnización en dinero efectivo equivalente a la última remuneración mensual devengada. Esta carta no calcula ese monto.`,
      );
    } else {
      bloques.push(
        `El desahucio se da con treinta días de anticipación, a lo menos, con copia a la Inspección del Trabajo respectiva, conforme al artículo 161. Entre la fecha de esta comunicación y la fecha de término hay ${diasAnticipacion} días.`,
      );
    }
  } else if (meta.plazo === "30") {
    const montoLinea = montoTxt || "[monto pendiente: el artículo 162 exige indicarlo con precisión; esta plantilla no lo calcula]";
    if (avisoModo === "sustitutiva") {
      bloques.push(
        "No se requiere el aviso con treinta días de anticipación, porque se pagará la indemnización en dinero efectivo sustitutiva del aviso previo, equivalente a la última remuneración mensual devengada (artículo 162). Esta carta no calcula ese monto.",
      );
    } else if (avisoInsuficiente) {
      const diasTxt = diasAnticipacion === null ? "un lapso que no se pudo contar" : `${diasAnticipacion} días`;
      bloques.push(
        `Se invocó la causal del inciso primero del artículo 161. El artículo 162 exige aviso al trabajador, con copia a la Inspección del Trabajo, a lo menos con treinta días de anticipación. Entre la fecha de esta comunicación y la fecha de término hay ${diasTxt}, menos de treinta. Corresponde entonces la indemnización sustitutiva del aviso previo, equivalente a la última remuneración mensual devengada. Esta carta no calcula ese monto.`,
      );
    } else {
      bloques.push(
        `Se invoca la causal del inciso primero del artículo 161. El aviso se da al trabajador, con copia a la Inspección del Trabajo, a lo menos con treinta días de anticipación (artículo 162). Entre la fecha de esta comunicación y la fecha de término hay ${diasAnticipacion} días.`,
      );
    }
    bloques.push(
      `Monto total a pagar de conformidad con el artículo 163, que esta comunicación debe indicar: ${montoLinea}.`,
    );
  } else {
    bloques.push(
      `Esta comunicación se entrega o se envía ${plazoHabil(meta.plazo)}. Copia del aviso se envía a la Inspección del Trabajo dentro del mismo plazo (artículo 162).`,
    );
  }

  if (meta.montoObra) {
    const montoLinea = montoTxt || "[monto pendiente: si corresponde la indemnización por el tiempo servido, el artículo 162 exige indicarla; esta plantilla no la calcula]";
    bloques.push(
      `Indemnización por el tiempo servido en la obra o faena, cuando corresponde según el artículo 163: ${montoLinea}.`,
    );
  }

  if (meta.plazo === "30") {
    bloques.push(
      "Copia de esta comunicación se envía a la Inspección del Trabajo. En el artículo 161 ese envío acompaña el aviso; no es el plazo de tres o seis días hábiles del artículo 159 o del artículo 160.",
    );
  }

  if (cotizacionesImpagas) {
    bloques.push(
      "Estado de pago de las cotizaciones previsionales devengadas hasta el último día del mes anterior al del despido: no se encuentran íntegramente pagadas. El artículo 162 dispone que, en ese caso, el despido no produce el efecto de poner término al contrato de trabajo. La convalidación exige pagar las imposiciones morosas y comunicarlo al trabajador mediante carta certificada, acompañada de la documentación de las instituciones previsionales en que conste la recepción del pago. Mientras tanto, el empleador debe las remuneraciones y demás prestaciones del período que esa norma señala. Esta carta no calcula ese período ni adjunta comprobantes.",
    );
  } else {
    bloques.push(
      "Estado de pago de las cotizaciones previsionales devengadas hasta el último día del mes anterior al del despido: se informan íntegramente pagadas. Se adjuntan a esta comunicación los comprobantes que lo justifican. Declararlas sin pagarlas no cumple el artículo 162.",
    );
  }

  if (tocaAcoso) {
    bloques.push(
      "Si los hechos son acoso sexual, acoso laboral o violencia en el trabajo, la investigación de la Ley N° 21.643 es un procedimiento distinto de esta comunicación de término.",
    );
  }

  bloques.push(
    "El finiquito podrá otorgarse de forma presencial ante un ministro de fe. Si se ofrece la vía electrónica, aceptarla es voluntario para el trabajador, quien puede reservar derechos. Esta carta no es el finiquito del artículo 177 ni la carta electrónica de la Dirección del Trabajo.",
    `Sin otro particular, saluda atentamente,\n\n\n______________________________\n${firmante}\n${empleador}${rutEmp.vacio ? "" : `\nRUT ${rutEmp.texto}`}`,
  );

  if (medio === "personal") {
    bloques.push(
      `Recepción del trabajador\n\nFecha: ______________\n\n______________________________\n${nombre}\nRUT ${rut.texto}`,
    );
  }

  return {
    texto: bloques.join("\n\n"),
    aplica: true,
    causal,
    slug: meta.slug,
    cita: meta.cita,
    plazo: meta.plazo,
    diasAnticipacion,
    avisoInsuficiente,
    cotizacionesImpagas,
    hechosVacios,
    montoPendiente,
    tocaAcoso,
    medio,
    rutTrabajadorOk: rut.ok,
    rutEmpleadorOk: rutEmp.vacio ? null : rutEmp.ok,
  };
}
