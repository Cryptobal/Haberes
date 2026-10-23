import { redactarCertificadoAntiguedad } from "./certificado-antiguedad.js";
import { createDateFields, el, mountIndicadores, wireNav } from "./ui.js";

let fechaIngresoPick = null;
let fechaTerminoPick = null;
let fechaCertificadoPick = null;

function valorRadio(name, fallback) {
  const marcado = document.querySelector(`input[name="${name}"]:checked`);
  return marcado?.value || fallback;
}

function leer() {
  return {
    empleador: el("empleador")?.value || "",
    rutEmpleador: el("rutEmpleador")?.value || "",
    representante: el("representante")?.value || "",
    nombre: el("nombre")?.value || "",
    rut: el("rut")?.value || "",
    cargo: el("cargo")?.value || "",
    fechaIngreso: fechaIngresoPick?.getValue() || "",
    tipoContrato: el("tipoContrato")?.value || "indefinido",
    jornada: el("jornada")?.value || "",
    remuneracion: el("remuneracion")?.value || "",
    estado: valorRadio("estado", "vigente"),
    fechaTermino: fechaTerminoPick?.getValue() || "",
    fines: el("fines")?.value || "",
    ciudad: el("ciudad")?.value || "",
    fechaCertificado: fechaCertificadoPick?.getValue() || "",
  };
}

function notaCertificado(cert) {
  if (!cert.antiguedad?.ok && cert.antiguedad?.motivo === "orden") {
    return "La fecha de término es anterior al ingreso. La antigüedad no se calcula hasta corregir las fechas.";
  }
  if (!cert.antiguedad?.ok) {
    return "Falta una fecha válida. El certificado muestra un marcador hasta que el ingreso y la fecha de corte sean días reales.";
  }
  if (cert.incluyeRemuneracion) {
    return "La remuneración se copia tal como la escribió el empleador. Esta página no la calcula ni la convierte en base de finiquito.";
  }
  if (cert.vigente) {
    return "Contrato vigente: la antigüedad llega a la fecha del certificado, con el mismo conteo de la calculadora de antigüedad laboral.";
  }
  return "Contrato terminado: la antigüedad llega a la fecha de término. Este texto no es el finiquito.";
}

function marcarRut(id, ok) {
  const node = el(id);
  if (!node) return;
  const raw = node.value.trim();
  if (!raw || ok) node.removeAttribute("aria-invalid");
  else node.setAttribute("aria-invalid", "true");
}

function render() {
  const cert = redactarCertificadoAntiguedad(leer());
  const bloqueTermino = el("bloqueTermino");
  if (bloqueTermino) bloqueTermino.hidden = cert.vigente;
  const preview = el("cartaTexto");
  if (preview) preview.textContent = cert.texto;
  const nota = el("avisoNota");
  if (nota) {
    nota.textContent = notaCertificado(cert);
    nota.className = cert.antiguedad?.ok ? "hint" : "error";
  }
  marcarRut("rut", cert.rutTrabajadorOk);
  const rutHint = el("rutHint");
  if (rutHint) {
    const raw = el("rut")?.value.trim() || "";
    rutHint.hidden = !raw || cert.rutTrabajadorOk;
  }
  marcarRut("rutEmpleador", cert.rutEmpleadorOk !== false);
  const empHint = el("rutEmpleadorHint");
  if (empHint) {
    const raw = el("rutEmpleador")?.value.trim() || "";
    empHint.hidden = !raw || cert.rutEmpleadorOk !== false;
  }
  const estado = el("cartaEstado");
  if (estado) estado.textContent = "";
  return cert;
}

async function copiar() {
  const texto = el("cartaTexto")?.textContent || "";
  const estado = el("cartaEstado");
  try {
    await navigator.clipboard.writeText(texto);
    if (estado) estado.textContent = "Certificado copiado.";
  } catch {
    if (estado) estado.textContent = "No se pudo copiar. Seleccione el texto del certificado.";
  }
}

function descargar() {
  const texto = el("cartaTexto")?.textContent || "";
  const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "certificado-antiguedad.txt";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  const estado = el("cartaEstado");
  if (estado) estado.textContent = "Descarga de certificado-antiguedad.txt lista.";
}

wireNav();
fechaIngresoPick = createDateFields(el("pickFechaIngreso"), {
  value: "2020-01-15",
  title: "Fecha de ingreso",
  onChange: render,
});
fechaTerminoPick = createDateFields(el("pickFechaTermino"), {
  value: "2026-07-15",
  title: "Fecha de término",
  onChange: render,
});
fechaCertificadoPick = createDateFields(el("pickFechaCertificado"), {
  value: "2026-10-23",
  title: "Fecha del certificado",
  onChange: render,
});
document.getElementById("formCertificado")?.addEventListener("input", render);
document.getElementById("formCertificado")?.addEventListener("change", render);
document.getElementById("btnCopiarCarta")?.addEventListener("click", () => {
  copiar();
});
document.getElementById("btnDescargarCarta")?.addEventListener("click", () => {
  descargar();
});
document.getElementById("btnImprimirCarta")?.addEventListener("click", () => {
  window.print();
});
render();
mountIndicadores();
