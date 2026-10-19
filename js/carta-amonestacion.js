/**
 * Carta de amonestación escrita.
 * Código del Trabajo, texto vigente en la BCN (idNorma 207436):
 * - art. 153: reglamento interno si se ocupan normalmente diez o más trabajadores permanentes;
 * - art. 154 N° 10: las sanciones del reglamento sólo pueden ser amonestación verbal o escrita
 *   y multa de hasta el veinticinco por ciento de la remuneración diaria;
 * - art. 154 N° 11: el reglamento debe contener el procedimiento para aplicarlas;
 * - art. 157: si la sanción es multa, no puede exceder la cuarta parte de la remuneración
 *   diaria y de su aplicación puede reclamarse ante la Inspección del Trabajo.
 * No calcula montos ni pone término al contrato.
 */
import { fechaCartaEs } from "./carta-renuncia.js";
import { formatRut, validarRut } from "./format.js";

export const MOTIVOS_AMONESTACION = {
  atrasos: "un atraso en el ingreso a su jornada",
  inasistencia: "una inasistencia a su jornada",
  incumplimiento: "un incumplimiento de las instrucciones impartidas en relación con sus labores",
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

export function tocaAcosoLaboral(...textos) {
  return textos.some((raw) => /acoso|hostigamiento|violencia en el trabajo/i.test(String(raw || "")));
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
 *   fechaCarta?: string,
 *   fechaHechos?: string,
 *   hora?: string,
 *   motivo?: string,
 *   motivoLibre?: string,
 *   detalle?: string,
 *   clausula?: string,
 *   tipo?: "simple" | "inspeccion",
 * }} input
 */
export function redactarCartaAmonestacion(input = {}) {
  const nombre = linea(input.nombre, "[nombre del trabajador]", 120);
  const rut = rutTexto(input.rut, "[RUT del trabajador]");
  const empleador = linea(input.empleador, "[razón social del empleador]", 160);
  const rutEmp = rutTexto(input.rutEmpleador, "");
  const firmante = linea(input.firmante, "[nombre de quien firma]", 120);
  const cargo = linea(input.cargo, "[cargo]", 120);
  const ciudad = linea(input.ciudad, "[ciudad]", 80);
  const fecha = fechaCartaEs(input.fechaCarta) || "[fecha de la carta]";
  const fechaHechos = fechaCartaEs(input.fechaHechos) || "[fecha de los hechos]";
  const hora = linea(input.hora, "[hora]", 20);
  const clausula = linea(input.clausula, "[cláusula del reglamento interno]", 200);
  const detalle = limpio(input.detalle, 400);
  const motivoLibre = limpio(input.motivoLibre, 240);
  const motivo = Object.hasOwn(MOTIVOS_AMONESTACION, input.motivo) || input.motivo === "otro"
    ? input.motivo
    : "atrasos";
  const copiaInspeccion = input.tipo === "inspeccion";
  const hecho = motivo === "otro" ? motivoLibre || "[hecho]" : MOTIVOS_AMONESTACION[motivo];
  const tocaAcoso = tocaAcosoLaboral(detalle, motivo === "otro" ? motivoLibre : "");

  const empleadorRut = rutEmp.vacio ? empleador : `${empleador}, RUT ${rutEmp.texto}`;
  const detalleTxt = detalle ? ` Detalle: ${detalle}` : "";

  const bloques = [
    [`${ciudad}, ${fecha}`, "", "Señor(a)", nombre, `Cédula de identidad N° ${rut.texto}`, "Presente"].join("\n"),
    "De nuestra consideración:",
    `${empleadorRut} le comunica una amonestación escrita, en su calidad de ${cargo}.`,
    `El ${fechaHechos}, a las ${hora}, se constató ${hecho}.${detalleTxt}`,
    `Esa conducta infringe ${clausula}. La amonestación escrita es una sanción que el artículo 154 N° 10 del Código del Trabajo permite establecer en el reglamento interno de orden, higiene y seguridad, junto con la amonestación verbal y la multa de hasta el veinticinco por ciento de la remuneración diaria. La sanción que se aplica en esta carta es únicamente la amonestación escrita. No se aplica multa.`,
    "Esta comunicación no pone término a su contrato de trabajo. No es un despido ni la carta de aviso de término del artículo 162.",
    "El procedimiento para aplicar la sanción es el que establece el reglamento interno (artículo 154 N° 11). Si en otro caso se impusiera multa, el artículo 157 dispone que no puede exceder de la cuarta parte de la remuneración diaria y que de su aplicación puede reclamarse ante la Inspección del Trabajo.",
  ];
  if (copiaInspeccion) {
    bloques.push(
      "Se remite copia de esta carta a la Inspección del Trabajo. Esa remisión la decide el empleador en este caso. No es la copia obligatoria del aviso de término del artículo 162, porque esta carta no despide.",
    );
  }
  if (tocaAcoso) {
    bloques.push(
      "Si los hechos correspondieran a acoso sexual, acoso laboral o violencia en el trabajo, esta carta no reemplaza el protocolo ni el procedimiento de investigación de la Ley N° 21.643.",
    );
  }
  bloques.push(
    "Se deja constancia para su recepción y firma.",
    `Sin otro particular,\n\n\n______________________________\n${firmante}\npor ${empleador}${rutEmp.vacio ? "" : `\nRUT ${rutEmp.texto}`}`,
    `Recepción del trabajador\nRecibí copia de la presente amonestación escrita.\nFecha: ____________________\nFirma: ____________________\n${nombre}\nRUT ${rut.texto}`,
  );

  return {
    texto: bloques.join("\n\n"),
    rutTrabajadorOk: rut.ok,
    rutEmpleadorOk: rutEmp.vacio ? null : rutEmp.ok,
    motivo,
    copiaInspeccion,
    tocaAcoso,
  };
}
