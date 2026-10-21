import { CAUSALES_CARTA, redactarCartaDespido } from "./carta-despido.js";
import { createDateFields, el, mountIndicadores, wireNav } from "./ui.js";

let fechaCartaPick = null;
let fechaTerminoPick = null;

function valorRadio(name, fallback) {
  const marcado = document.querySelector(`input[name="${name}"]:checked`);
  return marcado?.value || fallback;
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
    domicilio: el("domicilio")?.value || "",
    fechaCarta: fechaCartaPick?.getValue() || "",
    fechaTermino: fechaTerminoPick?.getValue() || "",
    causal: el("causal")?.value || "161-necesidades",
    hechos: el("hechos")?.value || "",
    medio: valorRadio("medio", "personal"),
    cotizaciones: valorRadio("cotizaciones", "aldia"),
    avisoModo: valorRadio("avisoModo", "treinta"),
    monto: el("monto")?.value || "",
  };
}

function notaCarta(carta) {
  if (!carta.aplica) {
    if (carta.causal === "159-b") {
      return "El artículo 159 N° 2 es renuncia del trabajador, no un despido. Use la carta de renuncia. Esta hoja no arma un aviso del artículo 162.";
    }
    return "Los números 1, 2 y 3 del artículo 159 no usan la carta de despido del artículo 162 ni la acreditación de cotizaciones de ese artículo.";
  }
  if (carta.tocaAcoso) {
    return "La causal o los hechos mencionan acoso o violencia en el trabajo. La Ley Karin es otro procedimiento. Revise la guía antes de usar esta carta como si fuera la investigación.";
  }
  if (carta.cotizacionesImpagas) {
    return "Con cotizaciones impagas el artículo 162 dice que el despido no pone término al contrato. Revise nulidad del despido antes de entregar la carta.";
  }
  if (carta.avisoInsuficiente) {
    return "Hay menos de treinta días entre la carta y la fecha de término. En el artículo 161 corresponde la indemnización sustitutiva del aviso previo. Esta plantilla no la calcula.";
  }
  if (carta.hechosVacios) {
    return "Faltan los hechos. El artículo 162 exige expresarlos. Omitirlos expone el término a un despido injustificado.";
  }
  if (carta.montoPendiente) {
    return "Falta el monto que el artículo 162 pide indicar. Esta plantilla no lo calcula: consígnelo antes de entregar la carta o quítelo si la norma no lo exige en su caso.";
  }
  if (carta.plazo === "30") {
    return "Aviso del artículo 161 con copia a la Inspección. No use el plazo de tres días hábiles de los artículos 159 y 160.";
  }
  if (carta.plazo === "6") {
    return "Caso fortuito o fuerza mayor: seis días hábiles desde la separación, con copia a la Inspección en el mismo plazo. Esta plantilla no cuenta domingos ni festivos.";
  }
  return "Plazo de tres días hábiles desde la separación, con copia a la Inspección en el mismo plazo. Esta plantilla no cuenta domingos ni festivos.";
}

function marcarRut(id, ok) {
  const node = el(id);
  if (!node) return;
  const raw = node.value.trim();
  if (!raw || ok) node.removeAttribute("aria-invalid");
  else node.setAttribute("aria-invalid", "true");
}

function render() {
  const carta = redactarCartaDespido(leer());
  const meta = CAUSALES_CARTA[carta.causal];
  const bloqueAviso = el("bloqueAviso");
  if (bloqueAviso) bloqueAviso.hidden = meta?.plazo !== "30";
  const bloqueMonto = el("bloqueMonto");
  if (bloqueMonto) bloqueMonto.hidden = !(meta?.monto163 || meta?.montoObra);
  const bloqueDomicilio = el("bloqueDomicilio");
  if (bloqueDomicilio) bloqueDomicilio.hidden = carta.medio !== "certificada";
  const preview = el("cartaTexto");
  if (preview) preview.textContent = carta.texto;
  const nota = el("avisoNota");
  if (nota) {
    nota.textContent = notaCarta(carta);
    const grave = !carta.aplica || carta.tocaAcoso || carta.cotizacionesImpagas || carta.avisoInsuficiente || carta.hechosVacios;
    nota.className = grave ? "error" : "hint";
  }
  const enlace = el("enlaceCausal");
  if (enlace && carta.slug) {
    enlace.href = `/finiquito/${carta.slug}`;
    enlace.textContent = carta.cita;
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
  a.download = "carta-despido.txt";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  const estado = el("cartaEstado");
  if (estado) estado.textContent = "Descarga de carta-despido.txt lista.";
}

wireNav();
fechaCartaPick = createDateFields(el("pickFechaCarta"), {
  value: "2026-03-02",
  title: "Fecha de la carta",
  onChange: render,
});
fechaTerminoPick = createDateFields(el("pickFechaTermino"), {
  value: "2026-04-01",
  title: "Fecha de término",
  onChange: render,
});
document.getElementById("formCartaDespido")?.addEventListener("input", render);
document.getElementById("formCartaDespido")?.addEventListener("change", render);
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
