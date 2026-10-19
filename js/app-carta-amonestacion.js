import { redactarCartaAmonestacion } from "./carta-amonestacion.js";
import { createDateFields, el, mountIndicadores, wireNav } from "./ui.js";

let fechaCartaPick = null;
let fechaHechosPick = null;

function tipoElegido() {
  const marcado = document.querySelector('input[name="tipo"]:checked');
  return marcado?.value === "inspeccion" ? "inspeccion" : "simple";
}

function leer() {
  return {
    nombre: el("nombre")?.value || "",
    rut: el("rut")?.value || "",
    empleador: el("empleador")?.value || "",
    rutEmpleador: el("rutEmpleador")?.value || "",
    firmante: el("firmante")?.value || "",
    cargo: el("cargo")?.value || "",
    ciudad: el("ciudad")?.value || "",
    fechaCarta: fechaCartaPick?.getValue() || "",
    fechaHechos: fechaHechosPick?.getValue() || "",
    hora: el("hora")?.value || "",
    motivo: el("motivo")?.value || "atrasos",
    motivoLibre: el("motivoLibre")?.value || "",
    detalle: el("detalle")?.value || "",
    clausula: el("clausula")?.value || "",
    tipo: tipoElegido(),
  };
}

function notaCarta(carta) {
  if (carta.tocaAcoso) {
    return "El texto menciona acoso o violencia en el trabajo. Esa materia sigue el protocolo de la Ley Karin, no esta amonestación simple. Revise la guía antes de usar la carta.";
  }
  if (carta.copiaInspeccion) {
    return "La carta dice que se remite copia a la Inspección. El artículo 157 permite reclamar la multa, no obliga a enviar cada amonestación escrita. La copia del artículo 162 es la del despido.";
  }
  return "Amonestación escrita simple, sin copia a la Inspección. No es despido y no aplica la multa del artículo 154 N° 10.";
}

function marcarRut(id, ok) {
  const node = el(id);
  if (!node) return;
  const raw = node.value.trim();
  if (!raw || ok) node.removeAttribute("aria-invalid");
  else node.setAttribute("aria-invalid", "true");
}

function render() {
  const otro = el("motivo")?.value === "otro";
  const bloqueOtro = el("bloqueOtro");
  if (bloqueOtro) bloqueOtro.hidden = !otro;
  const carta = redactarCartaAmonestacion(leer());
  const preview = el("cartaTexto");
  if (preview) preview.textContent = carta.texto;
  const nota = el("avisoNota");
  if (nota) {
    nota.textContent = notaCarta(carta);
    nota.className = carta.tocaAcoso ? "error" : "hint";
  }
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
  a.download = "carta-amonestacion.txt";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  const estado = el("cartaEstado");
  if (estado) estado.textContent = "Descarga de carta-amonestacion.txt lista.";
}

wireNav();
fechaCartaPick = createDateFields(el("pickFechaCarta"), {
  value: "2026-03-02",
  title: "Fecha de la carta",
  onChange: render,
});
fechaHechosPick = createDateFields(el("pickFechaHechos"), {
  value: "2026-03-01",
  title: "Fecha de los hechos",
  onChange: render,
});
document.getElementById("formCartaAmonestacion")?.addEventListener("input", render);
document.getElementById("formCartaAmonestacion")?.addEventListener("change", render);
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
