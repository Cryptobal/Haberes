import { redactarCartaRenuncia } from "./carta-renuncia.js";
import { createDateFields, el, mountIndicadores, wireNav } from "./ui.js";

let fechaCartaPick = null;
let ultimoPick = null;

function leer() {
  return {
    nombre: el("nombre")?.value || "",
    rut: el("rut")?.value || "",
    empleador: el("empleador")?.value || "",
    rutEmpleador: el("rutEmpleador")?.value || "",
    cargo: el("cargo")?.value || "",
    ciudad: el("ciudad")?.value || "",
    fechaCarta: fechaCartaPick?.getValue() || "",
    ultimoDia: ultimoPick?.getValue() || "",
    aviso: Boolean(el("aviso")?.checked),
    feriado: Boolean(el("feriado")?.checked),
    motivo: el("motivo")?.value || "",
  };
}

function notaAviso(carta) {
  if (carta.diasAviso == null) {
    return "Indique la fecha de la carta y el último día de trabajo. El artículo 159 N° 2 contempla aviso de a lo menos treinta días. Esa anticipación no es un pago a favor del trabajador.";
  }
  if (carta.diasAviso < 0) {
    return "El último día es anterior a la fecha de la carta. Revise ambas fechas. El aviso del artículo 159 N° 2 no es la indemnización sustitutiva de los artículos 161 y 162.";
  }
  if (carta.diasAviso < 30) {
    return `Hay ${carta.diasAviso} días corridos entre la carta y el último día. El artículo 159 N° 2 contempla aviso de a lo menos treinta días. Esa anticipación no es un pago a favor del trabajador ni la indemnización sustitutiva de los artículos 161 y 162.`;
  }
  return `Hay ${carta.diasAviso} días corridos entre la carta y el último día. El artículo 159 N° 2 contempla a lo menos treinta. Ese aviso no es la indemnización sustitutiva de los artículos 161 y 162.`;
}

function marcarRut(id, ok) {
  const node = el(id);
  if (!node) return;
  const raw = node.value.trim();
  if (!raw || ok) node.removeAttribute("aria-invalid");
  else node.setAttribute("aria-invalid", "true");
}

function render() {
  const carta = redactarCartaRenuncia(leer());
  const preview = el("cartaTexto");
  if (preview) preview.textContent = carta.texto;
  const nota = el("avisoNota");
  if (nota) nota.textContent = notaAviso(carta);
  marcarRut("rut", carta.rutTrabajadorOk);
  const rutHint = el("rutHint");
  if (rutHint) {
    const raw = el("rut")?.value.trim() || "";
    rutHint.hidden = !raw || carta.rutTrabajadorOk;
  }
  marcarRut("rutEmpleador", carta.rutEmpleadorOk !== false);
  const empHint = el("rutEmpleadorHint");
  if (empHint) {
    const raw = el("rutEmpleador")?.value.trim() || "";
    empHint.hidden = !raw || carta.rutEmpleadorOk !== false;
  }
  const estado = el("cartaEstado");
  if (estado) estado.textContent = "";
  return carta;
}

function nombreArchivo() {
  return "carta-renuncia.txt";
}

async function copiar() {
  const texto = el("cartaTexto")?.textContent || "";
  const estado = el("cartaEstado");
  try {
    await navigator.clipboard.writeText(texto);
    if (estado) estado.textContent = "Carta copiada.";
  } catch {
    if (estado) estado.textContent = "No se pudo copiar. Seleccione el texto de la carta.";
  }
}

function descargar() {
  const texto = el("cartaTexto")?.textContent || "";
  const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo();
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  const estado = el("cartaEstado");
  if (estado) estado.textContent = "Descarga de carta-renuncia.txt lista.";
}

wireNav();
fechaCartaPick = createDateFields(el("pickFechaCarta"), {
  value: "2026-03-02",
  title: "Fecha de la carta",
  onChange: render,
});
ultimoPick = createDateFields(el("pickUltimoDia"), {
  value: "2026-04-01",
  title: "Último día de trabajo",
  onChange: render,
});
document.getElementById("formCartaRenuncia")?.addEventListener("input", render);
document.getElementById("formCartaRenuncia")?.addEventListener("change", render);
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
