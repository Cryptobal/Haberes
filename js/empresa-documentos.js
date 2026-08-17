import { apiDownloadPdf, authErrorMessage, triggerDownload } from "./api.js";
import { causalPorId } from "./causales.js";
import { calcularFiniquitoCompleto } from "./finiquito.js";
import {
  MSG_LIMITE,
  MSG_UNO_A_UNO,
  aplicarPlanServidor,
  puedeEmitir,
  registrarMovimientosLocal,
  registrarMovimientosRemoto,
  workerKey,
} from "./plan.js";
import { cartaFiniquitoHtml, imprimirIframe, liquidacionHtml, mostrarVistaPrevia } from "./print.js";
import { empresaActual } from "./storage.js";
import { calcularSueldo } from "./sueldo.js";
import { el, numVal, periodoLabel, showError, toastError, toastOk, val, withBusy } from "./ui.js";

export function bindEmpresaDocumentos(ctx) {
  function syncCausalNota() {
    const c = causalPorId(ctx.pickers.causal?.getValue());
    const nota = el("finCausalNota");
    const wrap = el("wrapAviso");
    if (!nota || !c) return;
    nota.textContent = c.aplicaIas
      ? "Esta causal puede incluir IAS (si el contrato lleva un año o más) e indemnización sustitutiva de aviso si no hubo aviso de 30 días. Tope 11 años y 90 UF."
      : "Esta causal no da derecho a IAS ni a indemnización sustitutiva de aviso. Sí se estiman remuneración del mes, gratificación, feriado y otros haberes.";
    if (wrap) wrap.hidden = !c.aplicaAviso;
  }

  function empresaParaDoc() {
    return {
      ...ctx.emp,
      giro: val("perfilGiro") || ctx.emp?.giro || "",
      direccion: val("perfilDireccion") || ctx.emp?.direccion || "",
      razonSocial: val("perfilRazon") || ctx.emp?.razonSocial || "",
    };
  }

  function abrirPreview(titulo, html, others) {
    el("panelPreview").hidden = false;
    el("docPreviewTitulo").textContent = titulo;
    const extra = el("previewOtros");
    if (others?.length) {
      extra.hidden = false;
      extra.textContent = `También se emitirá para: ${others.map((t) => t.nombre).join(", ")}.`;
    } else {
      extra.hidden = true;
      extra.textContent = "";
    }
    mostrarVistaPrevia(el("docPreviewFrame"), html);
    el("panelPreview").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function workersForEmit() {
    const rows = ctx.selectedWorkers();
    if (!rows.length) return [];
    const first = ctx.readHaberesEditor(rows[0]);
    return [first, ...rows.slice(1)];
  }

  async function consumirMovimientos(tipo, rows, errId) {
    ctx.emp = empresaActual();
    const keys = rows.map(workerKey);
    const gate = puedeEmitir(ctx.emp, { tipo, keys });
    if (!gate.ok) {
      const msg = gate.message || MSG_LIMITE;
      showError(el(errId), msg);
      toastError("Tope del plan Gratis", msg);
      return false;
    }
    if (ctx.remoteOk) {
      const remote = await registrarMovimientosRemoto({ tipo, keys });
      if (remote.remote && !remote.data?.ok) {
        if (remote.data?.reason === "limite_gratis") {
          showError(el(errId), MSG_LIMITE);
          return false;
        }
        if (remote.data?.reason === "uno_a_uno") {
          showError(el(errId), MSG_UNO_A_UNO);
          return false;
        }
      }
      if (remote.remote && remote.data?.ok) {
        aplicarPlanServidor(empresaActual(), remote.data);
      }
    }
    registrarMovimientosLocal(empresaActual(), { tipo, keys: gate.nuevos?.length ? gate.nuevos : keys });
    ctx.refresh();
    return true;
  }

  async function bajarPdf(tipo, errId, extra, btn) {
    showError(el(errId), "");
    const rows = workersForEmit();
    if (!rows.length) return showError(el(errId), "Seleccione uno o más trabajadores");
    ctx.emp = empresaActual();
    const gate = puedeEmitir(ctx.emp, { tipo, keys: rows.map(workerKey) });
    if (!gate.ok) {
      const msg = gate.message || MSG_LIMITE;
      showError(el(errId), msg);
      toastError("Tope del plan Gratis", msg);
      return;
    }
    return withBusy(btn, () => descargarPdf(tipo, errId, extra, rows), "Generando…");
  }

  async function descargarPdf(tipo, errId, extra, rows) {
    const { status, data, blob } = await apiDownloadPdf("/api/documento", {
      tipo,
      uf: ctx.indicadores.uf,
      trabajadores: rows.map((t) => ({
        ...ctx.payloadTrabajador(t),
        ingreso: extra?.ingreso || "",
        termino: extra?.termino || "",
      })),
      periodo: ctx.pickers.periodo?.getValue(),
      ...extra,
    });
    if (!blob) {
      if (data?.reason === "no_storage" || status === 501) {
        const msg =
          "No se pudo generar el PDF: el almacenamiento no está configurado. La vista previa sí está en esta página; puede imprimirla (el navegador permite guardar como PDF).";
        showError(el(errId), msg);
        toastError("PDF no disponible", "Use la vista previa e imprima a PDF.");
        return;
      }
      const msg = authErrorMessage(data, status);
      showError(el(errId), msg);
      toastError("No se pudo generar el PDF", msg);
      return;
    }
    await consumirMovimientos(tipo, rows, errId);
    const many = rows.length > 1;
    triggerDownload(
      blob,
      tipo === "liquidacion"
        ? many
          ? "liquidaciones.pdf"
          : "liquidacion.pdf"
        : many
          ? "finiquitos.pdf"
          : "finiquito.pdf",
    );
    toastOk(
      many ? `${rows.length} documentos descargados` : "PDF descargado",
      many ? "Un solo archivo con todas las páginas." : undefined,
    );
  }

  el("btnLiquidacion")?.addEventListener("click", async () => {
    showError(el("errPrint"), "");
    const rows = workersForEmit();
    if (!rows.length) return showError(el("errPrint"), "Seleccione uno o más trabajadores");
    const periodoVal = ctx.pickers.periodo?.getValue() || "";
    const periodo = periodoLabel(periodoVal) || periodoVal;
    try {
      const calc = calcularSueldo(rows[0], ctx.indicadores);
      if (!(await consumirMovimientos("liquidacion", rows, "errPrint"))) return;
      abrirPreview(
        "Vista previa · liquidación",
        liquidacionHtml({
          empresa: empresaParaDoc(),
          trabajador: rows[0],
          periodo,
          calc,
          logoSrc: ctx.logoDataUrl,
          firmaSrc: ctx.firmaDataUrl,
        }),
        rows.slice(1),
      );
    } catch (err) {
      showError(el("errPrint"), err.message);
    }
  });

  el("btnCarta")?.addEventListener("click", async () => {
    showError(el("errCarta"), "");
    const rows = workersForEmit();
    if (!rows.length) return showError(el("errCarta"), "Seleccione uno o más trabajadores");
    const ingreso = ctx.dateIngreso?.getValue() || "";
    const termino = ctx.dateTermino?.getValue() || "";
    if (!ingreso || !termino) return showError(el("errCarta"), "Indique ingreso y término con día, mes y año");
    if (!(await consumirMovimientos("finiquito", rows, "errCarta"))) return;
    try {
      const t = rows[0];
      const fin = calcularFiniquitoCompleto(
        {
          ...t,
          causal: ctx.pickers.causal?.getValue(),
          remuneracion: t.sueldoBase,
          ingreso,
          termino,
          diasMes: numVal("finDiasMes"),
          avisoPrevio: el("finAviso")?.checked,
          diasFeriadoPendiente: numVal("finFeriadoPend"),
          diasFeriadoProporcional: numVal("finFeriadoProp"),
          otros: numVal("finOtros"),
        },
        ctx.indicadores,
      );
      abrirPreview(
        "Vista previa · carta de finiquito",
        cartaFiniquitoHtml({
          empresa: empresaParaDoc(),
          trabajador: { ...t, ingreso, termino },
          fin,
          ciudad: val("finCiudad") || "Santiago",
          logoSrc: ctx.logoDataUrl,
          firmaSrc: ctx.firmaDataUrl,
        }),
        rows.slice(1),
      );
    } catch (err) {
      showError(el("errCarta"), err.message);
    }
  });

  el("btnPdfLiquidacion")?.addEventListener("click", (ev) =>
    bajarPdf("liquidacion", "errPrint", undefined, ev.currentTarget),
  );

  el("btnPdfCarta")?.addEventListener("click", (ev) => {
    const ingreso = ctx.dateIngreso?.getValue() || "";
    const termino = ctx.dateTermino?.getValue() || "";
    if (!ingreso || !termino) return showError(el("errCarta"), "Indique ingreso y término con día, mes y año");
    return bajarPdf(
      "finiquito",
      "errCarta",
      {
        causal: ctx.pickers.causal?.getValue(),
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

  el("btnImprimirPreview")?.addEventListener("click", () => {
    try {
      imprimirIframe(el("docPreviewFrame"));
    } catch (err) {
      showError(el("errPrint"), err.message);
      showError(el("errCarta"), err.message);
    }
  });

  el("btnCerrarPreview")?.addEventListener("click", () => {
    el("panelPreview").hidden = true;
    document.querySelector(".ws-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  return {
    syncCausalNota,
    empresaParaDoc,
    abrirPreview,
    workersForEmit,
    consumirMovimientos,
    bajarPdf,
    descargarPdf,
  };
}
