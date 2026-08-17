import { apiGet, apiPost, authErrorMessage } from "./api.js";
import { confirmDialog, toastError, toastOk } from "./overlay.js";
import { puedeEnviar, MSG_LIMITE, workerKey } from "./plan.js";
import { empresaActual } from "./storage.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BATCH = 25;

function el(id) {
  return document.getElementById(id);
}

function validEmail(v) {
  const s = String(v || "").trim();
  return s.length <= 160 && EMAIL_RE.test(s);
}

function sinCorreo(rows) {
  return rows.filter((t) => !validEmail(t.email));
}

function periodoLabel(value) {
  const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const m = String(value || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return String(value || "");
  const month = Number(m[2]) - 1;
  if (month < 0 || month > 11) return String(value);
  return `${MESES[month]} ${m[1]}`;
}

function showResultado(host, { enviados, fallidos, tipo }) {
  if (!host) return;
  const okN = enviados?.length || 0;
  const failN = fallidos?.length || 0;
  if (!okN && !failN) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }
  const tipoLabel = tipo === "finiquito" ? "carta de finiquito" : "liquidación";
  let html = `<div class="envio-resultado">`;
  if (okN && !failN) {
    html += `<p class="ok">Se envió la ${tipoLabel} a ${okN} ${okN === 1 ? "trabajador" : "trabajadores"}.</p>`;
  } else if (okN && failN) {
    html += `<p class="error" style="display:block">Envío parcial: ${okN} enviados, ${failN} fallidos. No está listo del todo.</p>`;
  } else {
    html += `<p class="error" style="display:block">No se pudo enviar ningún correo.</p>`;
  }
  if (okN) {
    html += `<ul class="envio-lista envio-ok">${enviados
      .map((e) => `<li>${escape(e.nombre)} · ${escape(e.email)}</li>`)
      .join("")}</ul>`;
  }
  if (failN) {
    html += `<ul class="envio-lista envio-fail">${fallidos
      .map((e) => `<li>${escape(e.nombre)} · ${escape(e.email || "sin correo")}</li>`)
      .join("")}</ul>`;
  }
  html += `</div>`;
  host.innerHTML = html;
  host.hidden = false;
}

function escape(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function failClosedMessage(reason) {
  if (reason === "no_backend") return "No hay servidor de cuentas. No se envió ningún correo.";
  if (reason === "no_storage") return "No se pudo generar el PDF. No se envió ningún correo.";
  if (reason === "no_mail") {
    return "El envío de correo no está configurado. Descargue el PDF y adjúntelo usted.";
  }
  if (reason === "uno_a_uno") {
    return "En Gratis se envía de a uno. Para varios a la vez necesita Pro.";
  }
  if (reason === "limite_gratis" || reason === "limite") return MSG_LIMITE;
  return null;
}

/**
 * Engancha botones de envío. deps provee helpers del módulo empresa.
 */
export function initEnvioDocumentos(deps) {
  const workersForEmit = () => deps.workersForEmit();
  const payloadTrabajador = (t) => deps.payloadTrabajador(t);
  const showError = (...a) => deps.showError(...a);
  const withBusy = (...a) => deps.withBusy(...a);
  const consumirMovimientos = (...a) => deps.consumirMovimientos(...a);
  const numVal = (id) => deps.numVal(id);
  const val = (id) => deps.val(id);
  const pickers = deps.pickers;

  async function mailStatus() {
    try {
      const { data } = await apiGet("/api/enviar");
      return Boolean(data?.ok && data?.mail);
    } catch {
      return false;
    }
  }

  async function enviar(tipo, errId, resultId, extra, btn) {
    showError(el(errId), "");
    const resultHost = el(resultId);
    if (resultHost) {
      resultHost.hidden = true;
      resultHost.innerHTML = "";
    }

    const rows = workersForEmit();
    if (!rows.length) return showError(el(errId), "Seleccione uno o más trabajadores");

    const missing = sinCorreo(rows);
    if (missing.length) {
      const names = missing.map((t) => t.nombre || t.rut).join(", ");
      return showError(
        el(errId),
        `Falta un correo válido en: ${names}. Agréguelo en la ficha del trabajador antes de enviar.`,
      );
    }

    let emp = empresaActual();
    const gate = puedeEnviar(emp, { tipo, keys: rows.map(workerKey) });
    if (!gate.ok) {
      const msg = gate.message || MSG_LIMITE;
      showError(el(errId), msg);
      toastError("Tope del plan Gratis", msg);
      return;
    }

    const mailOk = await mailStatus();
    if (!mailOk) {
      const msg = failClosedMessage("no_mail");
      showError(el(errId), msg);
      toastError("Correo no configurado", msg);
      return;
    }

    const periodo = pickers.periodo?.getValue() || "";
    const periodoTxt = tipo === "liquidacion" ? periodoLabel(periodo) : "";
    const emails = rows.map((t) => `${t.nombre} 〈${t.email}〉`).join("\n");
    const tipoLabel = tipo === "finiquito" ? "carta de finiquito" : "liquidación de remuneraciones";
    const ok = await confirmDialog({
      title: "Enviar por correo",
      text: `Se enviará la ${tipoLabel}${periodoTxt ? ` (${periodoTxt})` : ""} a ${rows.length} destinatario${rows.length === 1 ? "" : "s"}:\n\n${emails}\n\nCada persona recibe solo su propio PDF.`,
      confirmLabel: "Enviar",
      cancelLabel: "Cancelar",
    });
    if (!ok) return;

    return withBusy(btn, async () => {
      const enviados = [];
      const fallidos = [];
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        const { status, data } = await apiPost("/api/enviar", {
          tipo,
          uf: deps.indicadores.uf,
          periodo,
          trabajadores: chunk.map((t) => ({
            ...payloadTrabajador(t),
            ingreso: extra?.ingreso || t.fechaIngreso || "",
            termino: extra?.termino || "",
            email: String(t.email || "").trim(),
          })),
          ...extra,
        });

        if (!data?.ok && !data?.enviados?.length) {
          const closed = failClosedMessage(data?.reason);
          if (closed) {
            showError(el(errId), closed);
            toastError("No se envió", closed);
            showResultado(resultHost, { enviados, fallidos: chunk.map((t) => ({
              rut: t.rut,
              nombre: t.nombre,
              email: t.email,
              reason: data?.reason,
            })), tipo });
            return;
          }
          const msg = authErrorMessage(data, status);
          showError(el(errId), msg);
          toastError("No se pudo enviar", msg);
          fallidos.push(
            ...(data?.fallidos ||
              chunk.map((t) => ({ rut: t.rut, nombre: t.nombre, email: t.email, reason: "mail_error" }))),
          );
          break;
        }

        if (Array.isArray(data?.enviados)) enviados.push(...data.enviados);
        if (Array.isArray(data?.fallidos)) fallidos.push(...data.fallidos);
      }

      showResultado(resultHost, { enviados, fallidos, tipo });

      if (enviados.length) {
        const sentRows = rows.filter((t) => enviados.some((e) => e.rut === t.rut));
        await consumirMovimientos(tipo, sentRows, errId);
      }

      if (enviados.length && !fallidos.length) {
        toastOk(
          enviados.length === 1 ? "Correo enviado" : `${enviados.length} correos enviados`,
          "Cada trabajador recibió solo su documento.",
        );
      } else if (enviados.length && fallidos.length) {
        toastError(
          "Envío parcial",
          `${enviados.length} enviados, ${fallidos.length} fallidos.`,
        );
        showError(
          el(errId),
          `Envío parcial: no llegó a ${fallidos.map((f) => f.nombre).join(", ")}.`,
        );
      } else {
        toastError("No se envió", "Ningún correo pudo completarse.");
        showError(el(errId), "No se pudo enviar ningún correo.");
      }
    }, "Enviando…");
  }

  el("btnEnviarLiquidacion")?.addEventListener("click", (ev) =>
    enviar("liquidacion", "errPrint", "resultadoEnvioLiq", undefined, ev.currentTarget),
  );

  el("btnEnviarCarta")?.addEventListener("click", (ev) => {
    const ingreso = deps.dateIngreso?.getValue() || "";
    const termino = deps.dateTermino?.getValue() || "";
    if (!ingreso || !termino) {
      return showError(el("errCarta"), "Indique ingreso y término con día, mes y año");
    }
    return enviar(
      "finiquito",
      "errCarta",
      "resultadoEnvioFin",
      {
        causal: pickers.causal?.getValue(),
        ingreso,
        termino,
        diasMes: numVal("finDiasMes"),
        diasFeriadoPendiente: numVal("finFeriadoPend"),
        diasFeriadoProporcional: numVal("finFeriadoProp"),
        avisoPrevio: Boolean(el("finAviso")?.checked),
        otros: numVal("finOtros"),
        ciudad: val("finCiudad") || "Santiago",
      },
      ev.currentTarget,
    );
  });
}

export function marcaSinCorreo(t) {
  return validEmail(t?.email) ? "" : " data-sin-correo=\"1\"";
}

export function tieneCorreoValido(t) {
  return validEmail(t?.email);
}
