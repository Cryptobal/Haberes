import { apiDownloadPdf, authErrorMessage, triggerDownload } from "./api.js";
import { causalPorId } from "./causales.js";
import { clp } from "./format.js";
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
    if (nota && c) {
      nota.textContent = c.aplicaIas
        ? "Esta causal puede incluir IAS (si el contrato lleva un año o más) e indemnización sustitutiva de aviso si no hubo aviso de 30 días. Tope 11 años y 90 UF."
        : "Esta causal no da derecho a IAS ni a indemnización sustitutiva de aviso. Sí se estiman remuneración del mes, gratificación, feriado y otros haberes.";
    }
    if (wrap) wrap.hidden = !c?.aplicaAviso;
    syncFinResumen();
  }

  const RESUMEN_KEYS = [
    ["remuneracionMes", "Remuneración del mes"],
    ["feriadoPendiente", "Feriado pendiente"],
    ["feriadoProporcional", "Feriado proporcional"],
    ["ias", "IAS"],
    ["aviso", "Aviso"],
    ["otros", "Otros haberes"],
  ];

  function finInputFromSelection() {
    const rows = typeof ctx.selectedWorkers === "function" ? ctx.selectedWorkers() : [];
    const t = rows[0];
    if (!t) return null;
    const extra = typeof ctx.readHaberesEditor === "function" ? ctx.readHaberesEditor(t) : t;
    return {
      ...t,
      ...extra,
      causal: ctx.pickers.causal?.getValue(),
      remuneracion: extra?.sueldoBase ?? t.sueldoBase,
      ingreso: ctx.dateIngreso?.getValue() || extra?.fechaIngreso || t.fechaIngreso || "",
      termino: ctx.dateTermino?.getValue() || extra?.fechaTermino || t.fechaTermino || "",
      diasMes: numVal("finDiasMes"),
      avisoPrevio: Boolean(el("finAviso")?.checked),
      diasFeriadoPendiente: numVal("finFeriadoPend"),
      diasFeriadoProporcional: numVal("finFeriadoProp"),
      otros: numVal("finOtros"),
    };
  }

  function syncFinResumen() {
    const host = el("finOutPartidas");
    const totalEl = el("finOutTotal");
    const nota = el("finResumenNota");
    if (!host || !totalEl) return;
    const input = finInputFromSelection();
    if (!input) {
      totalEl.textContent = clp(0);
      host.innerHTML = "";
      if (nota) {
        nota.textContent =
          "Seleccione un trabajador para ver feriado pendiente, proporcional, otros haberes e indemnizaciones.";
      }
      return;
    }
    try {
      const fin = calcularFiniquitoCompleto(input, ctx.indicadores);
      totalEl.textContent = clp(fin.total);
      const byKey = new Map((fin.partidas || []).map((p) => [p.key, p]));
      const rows = [];
      for (const [key, label] of RESUMEN_KEYS) {
        rows.push({ key, label, monto: byKey.get(key)?.monto || 0 });
      }
      for (const p of fin.partidas || []) {
        if (RESUMEN_KEYS.some(([k]) => k === p.key)) continue;
        if (!p.monto) continue;
        rows.push({ key: p.key, label: p.label, monto: p.monto });
      }
      host.innerHTML = rows
        .map(
          (p) =>
            `<div><span>${String(p.label)
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")}</span><strong>${clp(p.monto)}</strong></div>`,
        )
        .join("");
      if (nota) {
        nota.textContent = input.ingreso && input.termino
          ? "Feriado pendiente, proporcional y otros haberes entran al total. Colación, movilización y gratificación salen de la ficha del trabajador."
          : "Indique ingreso y término para calcular años de servicio.";
      }
    } catch (err) {
      totalEl.textContent = clp(0);
      host.innerHTML = "";
      if (nota) nota.textContent = err.message || "No se pudo estimar el finiquito.";
    }
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
    const periodo = ctx.pickers.periodo?.getValue() || "";
    const rest = rows.slice(1).map((t) => {
      if (!ctx.payloadTrabajador) return t;
      const p = ctx.payloadTrabajador(t);
      return { ...t, ...p, periodo };
    });
    return [first, ...rest];
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
    if (tipo === "liquidacion") {
      for (const t of rows) {
        const calc = calcularSueldo(t, ctx.indicadores);
        if (calc.liquidoNegativo) {
          return showError(
            el(errId),
            `No se puede emitir para ${t.nombre}: líquido negativo (${calc.liquido}).`,
          );
        }
      }
      if (ctx.actualizarAvisoArt58) ctx.actualizarAvisoArt58(rows[0]);
      const aviso = el("avisoArt58");
      if (aviso && !aviso.hidden && !ctx.art58Confirmado?.()) {
        return showError(
          el(errId),
          "Los descuentos convencionales superan el 15 % del bruto (art. 58). Confirme la casilla antes de emitir.",
        );
      }
    }
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
      if (calc.liquidoNegativo) {
        return showError(
          el("errPrint"),
          `No se puede emitir: el líquido queda negativo (${calc.liquido}). Revise los descuentos.`,
        );
      }
      if (ctx.actualizarAvisoArt58) ctx.actualizarAvisoArt58(rows[0]);
      const aviso = el("avisoArt58");
      if (aviso && !aviso.hidden && !ctx.art58Confirmado?.()) {
        return showError(
          el("errPrint"),
          "Los descuentos convencionales superan el 15 % del bruto (art. 58). Confirme la casilla antes de emitir.",
        );
      }
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

  const cartaPanel = el("finOtros")?.closest(".panel");
  cartaPanel?.addEventListener("input", syncFinResumen);
  cartaPanel?.addEventListener("change", syncFinResumen);

  return {
    syncCausalNota,
    syncFinResumen,
    empresaParaDoc,
    abrirPreview,
    workersForEmit,
    consumirMovimientos,
    bajarPdf,
    descargarPdf,
  };
}
