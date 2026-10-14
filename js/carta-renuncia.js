/**
 * Carta de renuncia voluntaria (art. 159 N° 2 del Código del Trabajo).
 * Texto vigente en la BCN (idNorma 207436): «Renuncia del trabajador, dando
 * aviso a su empleador con treinta días de anticipación, a lo menos.»
 * No calcula montos ni indemnizaciones.
 */
import { formatRut, validarRut } from "./format.js";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

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

/** Fecha de carta «2 de marzo de 2026», o "" si el ISO no es válido. */
export function fechaCartaEs(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!m) return "";
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${day} de ${MESES[month - 1]} de ${m[1]}`;
}

/** Días corridos de `desde` a `hasta` (el último día menos la fecha de la carta). */
export function diasEntreFechas(desde, hasta) {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(desde || "").trim());
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(hasta || "").trim());
  if (!a || !b || !fechaCartaEs(desde) || !fechaCartaEs(hasta)) return null;
  const ua = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  const ub = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
  return Math.round((ub - ua) / 86400000);
}

function rutTexto(raw, vacio) {
  const typed = limpio(raw, 20);
  if (!typed) return { texto: vacio, ok: false, vacio: true };
  const ok = validarRut(typed);
  return { texto: ok ? formatRut(typed) : typed, ok, vacio: false };
}

/**
 * @param {{
 *   nombre?: string,
 *   rut?: string,
 *   empleador?: string,
 *   rutEmpleador?: string,
 *   cargo?: string,
 *   ciudad?: string,
 *   fechaCarta?: string,
 *   ultimoDia?: string,
 *   aviso?: boolean,
 *   feriado?: boolean,
 *   motivo?: string,
 * }} input
 */
export function redactarCartaRenuncia(input = {}) {
  const nombre = linea(input.nombre, "[nombre del trabajador]", 120);
  const rut = rutTexto(input.rut, "[RUT del trabajador]");
  const empleador = linea(input.empleador, "[razón social del empleador]", 160);
  const rutEmp = rutTexto(input.rutEmpleador, "");
  const cargo = linea(input.cargo, "[cargo]", 120);
  const ciudad = linea(input.ciudad, "[ciudad]", 80);
  const fecha = fechaCartaEs(input.fechaCarta) || "[fecha de la carta]";
  const ultimo = fechaCartaEs(input.ultimoDia) || "[último día de trabajo]";
  const aviso = Boolean(input.aviso);
  const feriado = Boolean(input.feriado);
  const motivo = limpio(input.motivo, 240) || "razones personales";
  const diasAviso = diasEntreFechas(input.fechaCarta, input.ultimoDia);

  const cabeza = [`${ciudad}, ${fecha}`, "", "Señor", "Representante legal", empleador];
  if (!rutEmp.vacio) cabeza.push(`RUT ${rutEmp.texto}`);
  cabeza.push("Presente");

  const bloques = [
    cabeza.join("\n"),
    "De mi consideración:",
    `Yo, ${nombre}, cédula de identidad N° ${rut.texto}, quien se desempeña como ${cargo}, comunico por la presente mi renuncia voluntaria al contrato de trabajo que me vincula con ${empleador}, conforme al artículo 159 N° 2 del Código del Trabajo.`,
    `El motivo que indico es: ${motivo}. El último día en que prestaré servicios será el ${ultimo}.`,
    aviso
      ? "Doy este aviso en los términos del artículo 159 N° 2, que contempla una anticipación de a lo menos treinta días. Ese aviso forma parte de la renuncia del trabajador. No es la indemnización sustitutiva del aviso previo de los artículos 161 y 162 —esa corresponde al empleador cuando pone término al contrato sin dar ese aviso— ni genera a mi favor un mes de aviso ni indemnización por años de servicio del artículo 163."
      : "Esta renuncia voluntaria no genera a mi favor indemnización por años de servicio del artículo 163 ni la indemnización sustitutiva del aviso previo de los artículos 161 y 162. Esa indemnización de aviso es del empleador, no un pago que nazca de la renuncia del trabajador.",
  ];
  if (feriado) {
    bloques.push(
      "Solicito que, al suscribir el finiquito, se liquiden el feriado proporcional o pendiente y las remuneraciones que se encuentren adeudadas, si correspondieren. Esta carta no fija montos.",
    );
  }
  bloques.push(
    "Quedo a disposición para coordinar la entrega de funciones. La renuncia es un acto unilateral del trabajador y esta carta no es el finiquito.",
    `Sin otro particular, saluda atentamente,\n\n\n______________________________\n${nombre}\nRUT ${rut.texto}`,
  );

  return {
    texto: bloques.join("\n\n"),
    rutTrabajadorOk: rut.ok,
    rutEmpleadorOk: rutEmp.vacio ? null : rutEmp.ok,
    diasAviso,
    aviso,
    feriado,
    motivo,
  };
}
