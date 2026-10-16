import { redactarContratoTrabajo } from "./contrato-trabajo.js";
import { createDateFields, el, mountIndicadores, wireNav } from "./ui.js";

let nacimientoPick = null;
let ingresoPick = null;
let contratoPick = null;
let terminoPick = null;

function leer() {
  return {
    ciudad: el("ciudad")?.value || "",
    fechaContrato: contratoPick?.getValue() || "",
    empleador: el("empleador")?.value || "",
    rutEmpleador: el("rutEmpleador")?.value || "",
    nacionalidadEmpleador: el("nacionalidadEmpleador")?.value || "",
    domicilioEmpleador: el("domicilioEmpleador")?.value || "",
    emailEmpleador: el("emailEmpleador")?.value || "",
    representante: el("representante")?.value || "",
    rutRepresentante: el("rutRepresentante")?.value || "",
    trabajador: el("nombre")?.value || "",
    rutTrabajador: el("rut")?.value || "",
    nacionalidadTrabajador: el("nacionalidadTrabajador")?.value || "",
    fechaNacimiento: nacimientoPick?.getValue() || "",
    fechaIngreso: ingresoPick?.getValue() || "",
    domicilioTrabajador: el("domicilioTrabajador")?.value || "",
    emailTrabajador: el("emailTrabajador")?.value || "",
    cargo: el("cargo")?.value || "",
    servicios: el("servicios")?.value || "",
    ciudadServicios: el("ciudadServicios")?.value || "",
    sueldoBase: Number(el("sueldoBase")?.value || 0),
    formaPago: el("formaPago")?.value || "",
    periodoPago: el("periodoPago")?.value || "",
    horasSemanales: Number(String(el("horasSemanales")?.value || "").replace(",", ".")),
    distribucion: el("distribucion")?.value || "",
    tipo: el("tipo")?.value || "indefinido",
    fechaTermino: terminoPick?.getValue() || "",
    esTituloOGerente: Boolean(el("esTituloOGerente")?.checked),
    obra: el("obra")?.value || "",
    otrosPactos: el("otrosPactos")?.value || "",
  };
}

function marcarRut(id, ok) {
  const node = el(id);
  if (!node) return;
  const raw = node.value.trim();
  if (!raw || ok) node.removeAttribute("aria-invalid");
  else node.setAttribute("aria-invalid", "true");
}

function syncTipo() {
  const tipo = el("tipo")?.value || "indefinido";
  const plazo = el("bloquePlazo");
  const obra = el("bloqueObra");
  if (plazo) plazo.hidden = tipo !== "plazo_fijo";
  if (obra) obra.hidden = tipo !== "obra";
}

function render() {
  syncTipo();
  const contrato = redactarContratoTrabajo(leer());
  const preview = el("contratoTexto");
  if (preview) preview.textContent = contrato.texto;
  const avisos = el("contratoAvisos");
  if (avisos) {
    if (contrato.avisos.length) {
      avisos.hidden = false;
      avisos.className = "error";
      avisos.textContent = contrato.avisos.map((a) => a.texto).join(" ");
    } else {
      avisos.hidden = false;
      avisos.className = "hint";
      avisos.textContent =
        "Sin alertas de sueldo mínimo, jornada ni plazo con estos datos. El artículo 9 igual exige escriturar y firmar en dos ejemplares dentro del plazo.";
    }
  }
  marcarRut("rut", contrato.rutTrabajadorOk);
  const rutHint = el("rutHint");
  if (rutHint) {
    const raw = el("rut")?.value.trim() || "";
    rutHint.hidden = !raw || contrato.rutTrabajadorOk;
  }
  marcarRut("rutEmpleador", contrato.rutEmpleadorOk);
  const empHint = el("rutEmpleadorHint");
  if (empHint) {
    const raw = el("rutEmpleador")?.value.trim() || "";
    empHint.hidden = !raw || contrato.rutEmpleadorOk;
  }
  marcarRut("rutRepresentante", contrato.rutRepresentanteOk !== false);
  const repHint = el("rutRepresentanteHint");
  if (repHint) {
    const raw = el("rutRepresentante")?.value.trim() || "";
    repHint.hidden = !raw || contrato.rutRepresentanteOk !== false;
  }
  const estado = el("contratoEstado");
  if (estado) estado.textContent = "";
  return contrato;
}

async function copiar() {
  const texto = el("contratoTexto")?.textContent || "";
  const estado = el("contratoEstado");
  try {
    await navigator.clipboard.writeText(texto);
    if (estado) estado.textContent = "Contrato copiado.";
  } catch {
    if (estado) estado.textContent = "No se pudo copiar. Seleccione el texto del contrato.";
  }
}

function descargar() {
  const texto = el("contratoTexto")?.textContent || "";
  const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "contrato-trabajo.txt";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  const estado = el("contratoEstado");
  if (estado) estado.textContent = "Descarga de contrato-trabajo.txt lista.";
}

wireNav();
nacimientoPick = createDateFields(el("pickNacimiento"), {
  value: "1992-04-15",
  title: "Fecha de nacimiento",
  onChange: render,
});
ingresoPick = createDateFields(el("pickIngreso"), {
  value: "2026-10-01",
  title: "Fecha de ingreso",
  onChange: render,
});
contratoPick = createDateFields(el("pickContrato"), {
  value: "2026-10-01",
  title: "Fecha del contrato",
  onChange: render,
});
terminoPick = createDateFields(el("pickTermino"), {
  value: "2027-10-01",
  title: "Fecha de término",
  onChange: render,
});
document.getElementById("formContratoTrabajo")?.addEventListener("input", render);
document.getElementById("formContratoTrabajo")?.addEventListener("change", render);
document.getElementById("btnCopiarContrato")?.addEventListener("click", () => {
  copiar();
});
document.getElementById("btnDescargarContrato")?.addEventListener("click", () => {
  descargar();
});
document.getElementById("btnImprimirContrato")?.addEventListener("click", () => {
  window.print();
});
render();
mountIndicadores();
