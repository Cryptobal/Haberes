/**
 * Certificado de antigüedad laboral (también llamado certificado de trabajo
 * o constancia de trabajo) que redacta el empleador.
 *
 * El Código del Trabajo (BCN, idNorma 207436) no fija un modelo:
 * - art. 162: comunicación escrita del término, copia a la Inspección y estado
 *   de las cotizaciones. El inciso final se refiere a errores en esas
 *   comunicaciones, no a este certificado.
 * - art. 177: forma escrita del finiquito, la renuncia y el mutuo acuerdo.
 * Este texto no es el finiquito, no es la carta del art. 162 y no es el
 * certificado de antecedentes laborales y previsionales de la Dirección del
 * Trabajo. No calcula indemnizaciones ni montos.
 *
 * La antigüedad reutiliza el conteo civil de antiguedad-laboral.js
 * (años → meses → días, con recorte de fin de mes y 29 de febrero).
 */
import { calcularAntiguedadLaboral, textoAntiguedad } from "./antiguedad-laboral.js";
import { fechaCartaEs } from "./carta-renuncia.js";
import { formatRut, validarRut } from "./format.js";

export const TIPOS_CONTRATO_CERTIFICADO = Object.freeze({
  indefinido: "contrato de trabajo indefinido",
  plazo: "contrato a plazo fijo",
  obra: "contrato por obra o faena",
});

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

/**
 * @param {{
 *   empleador?: string,
 *   rutEmpleador?: string,
 *   representante?: string,
 *   nombre?: string,
 *   rut?: string,
 *   cargo?: string,
 *   fechaIngreso?: string,
 *   tipoContrato?: "indefinido" | "plazo" | "obra",
 *   jornada?: string,
 *   remuneracion?: string,
 *   estado?: "vigente" | "terminado",
 *   fechaTermino?: string,
 *   fines?: string,
 *   ciudad?: string,
 *   fechaCertificado?: string,
 * }} input
 */
export function redactarCertificadoAntiguedad(input = {}) {
  const nombre = linea(input.nombre, "[nombre del trabajador]", 120);
  const rut = rutTexto(input.rut, "[RUT del trabajador]");
  const empleador = linea(input.empleador, "[razón social del empleador]", 160);
  const rutEmp = rutTexto(input.rutEmpleador, "");
  const representante = linea(input.representante, "[nombre del representante]", 120);
  const cargo = linea(input.cargo, "[cargo]", 120);
  const ciudad = linea(input.ciudad, "[ciudad]", 80);
  const fines = linea(input.fines, "los fines que el interesado estime conveniente", 240);
  const jornada = limpio(input.jornada, 160);
  const remuneracion = limpio(input.remuneracion, 80);
  const tipo = Object.hasOwn(TIPOS_CONTRATO_CERTIFICADO, input.tipoContrato) ? input.tipoContrato : "indefinido";
  const tipoTxt = TIPOS_CONTRATO_CERTIFICADO[tipo];
  const vigente = input.estado !== "terminado";

  const fechaCertIso = String(input.fechaCertificado || "").trim();
  const fechaCert = fechaCartaEs(fechaCertIso) || "[fecha del certificado]";
  const fechaIngIso = String(input.fechaIngreso || "").trim();
  const fechaIng = fechaCartaEs(fechaIngIso) || "[fecha de ingreso]";
  const fechaTermIso = vigente ? "" : String(input.fechaTermino || "").trim();
  const fechaTerm = vigente ? "" : fechaCartaEs(fechaTermIso) || "[fecha de término]";

  const antiguedad = vigente
    ? calcularAntiguedadLaboral({
        fechaInicio: fechaIngIso,
        fechaHoy: fechaCartaEs(fechaCertIso) ? fechaCertIso : undefined,
      })
    : fechaCartaEs(fechaTermIso)
      ? calcularAntiguedadLaboral({ fechaInicio: fechaIngIso, fechaTermino: fechaTermIso })
      : calcularAntiguedadLaboral({ fechaInicio: fechaIngIso, fechaTermino: "fecha-invalida" });

  const empleadorRut = rutEmp.vacio ? empleador : `${empleador}, RUT ${rutEmp.texto}`;
  const relacion = vigente
    ? `se desempeña como ${cargo}, con ${tipoTxt}, desde el ${fechaIng}, y mantiene vigente su contrato a la fecha de este certificado`
    : `se desempeñó como ${cargo}, con ${tipoTxt}, desde el ${fechaIng} hasta el ${fechaTerm}`;

  let cuenta;
  if (antiguedad.ok) {
    const corte = vigente ? "a la fecha de este certificado" : "al término del contrato";
    cuenta = `La antigüedad ${corte} es de ${textoAntiguedad(antiguedad)}, contada de fecha a fecha (años cumplidos, meses completos y días restantes).`;
  } else if (antiguedad.motivo === "orden") {
    cuenta =
      "La fecha de término es anterior a la de ingreso. Corrija las fechas: esta plantilla no calcula una antigüedad en ese caso.";
  } else {
    cuenta =
      "Falta una fecha válida de ingreso o de corte. La antigüedad se calcula cuando ambas fechas son días reales.";
  }

  const extras = [];
  if (jornada) extras.push(`Jornada que el empleador declara: ${jornada}.`);
  if (remuneracion) {
    extras.push(
      `Remuneración que el empleador declara: ${remuneracion}. Esta plantilla no calcula ni verifica ese monto.`,
    );
  }

  const bloques = [
    "CERTIFICADO DE ANTIGÜEDAD LABORAL",
    `${ciudad}, ${fechaCert}`,
    `${empleadorRut}, por intermedio de ${representante}, certifica que ${nombre}, cédula de identidad N° ${rut.texto}, ${relacion}.`,
    cuenta,
  ];
  if (extras.length) bloques.push(extras.join(" "));
  bloques.push(
    `Se extiende el presente certificado a petición del interesado, para ${fines}.`,
    "Este certificado no es el finiquito del artículo 177 del Código del Trabajo ni la comunicación de término del artículo 162. No consigna indemnizaciones ni el estado de las cotizaciones. No es el certificado de antecedentes laborales y previsionales que emite la Dirección del Trabajo.",
    `Sin otro particular,\n\n\n______________________________\n${representante}\npor ${empleador}${rutEmp.vacio ? "" : `\nRUT ${rutEmp.texto}`}`,
  );

  return {
    texto: bloques.join("\n\n"),
    rutTrabajadorOk: rut.ok,
    rutEmpleadorOk: rutEmp.vacio ? null : rutEmp.ok,
    vigente,
    tipo,
    antiguedad,
    incluyeJornada: Boolean(jornada),
    incluyeRemuneracion: Boolean(remuneracion),
  };
}
