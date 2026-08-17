import { glosaSueldo, descargarNomina } from "./pago.js";
import { CAMPOS_DISPONIBLES, perfilPorId } from "./nomina.js";
import { MSG_PAGO_PRO, puedePagoMasivo } from "./plan.js";
import { empresaActual, guardarEmpresa } from "./storage.js";
import { calcularSueldo } from "./sueldo.js";
import { el, periodoLabel, showError, val } from "./ui.js";
import { triggerDownload } from "./api.js";

function hostHidden(node, hidden) {
  if (node) node.hidden = hidden;
}

export function bindEmpresaNomina(ctx) {
  function syncNominaAviso() {
    const note = el("nominaAviso");
    if (!note) return;
    const id = ctx.pickers.nominaPerfil?.getValue() || "generico_xlsx";
    const spec = id === "personalizado" ? { verificado: false, banco: null, nombre: "personalizado" } : perfilPorId(id);
    const custom = el("nominaCustom");
    if (custom) custom.hidden = id !== "personalizado";
    if (!spec || spec.verificado) {
      note.hidden = true;
      note.textContent = "";
      return;
    }
    note.hidden = false;
    note.textContent =
      `Plantilla Haberes. No verificada contra el instructivo del banco. Compare con el archivo de ejemplo que entrega su portal antes de subirla.`;
  }

  function avisoConsorcioRipley() {
    const box = el("avisoBancos");
    if (!box) return;
    const list = ctx.emp?.trabajadores || [];
    const hit = list.some((t) => {
      const b = String(t.banco || "");
      return b === "053" || b === "055" || /consorcio|ripley/i.test(b);
    });
    if (!hit) {
      hostHidden(box, true);
      return;
    }
    box.hidden = false;
    box.textContent =
      "Corrección de códigos: Banco Ripley es 053 y Banco Consorcio es 055. Si tenía Consorcio guardado con el código anterior, revise las nóminas ya enviadas al banco.";
  }

  el("btnPagoXlsx")?.addEventListener("click", () => {
    showError(el("errPago"), "");
    ctx.emp = empresaActual();
    const gate = puedePagoMasivo(ctx.emp);
    if (!gate.ok) return showError(el("errPago"), gate.message || MSG_PAGO_PRO);
    const rows = ctx.workersForEmit();
    if (!rows.length) return showError(el("errPago"), "Seleccione uno o más trabajadores");
    const excluidos = rows.filter((t) => (calcularSueldo(t, ctx.indicadores).liquido || 0) <= 0);
    const periodoVal = ctx.pickers.periodo?.getValue() || "";
    const periodo = periodoLabel(periodoVal) || periodoVal;
    const perfilId = ctx.pickers.nominaPerfil?.getValue() || "generico_xlsx";
    try {
      if (perfilId === "personalizado") {
        const orden = Array.from(el("nominaCampos")?.querySelectorAll("input[type=checkbox]:checked") || []).map(
          (i) => i.value,
        );
        ctx.emp.nomina = {
          perfilId: "personalizado",
          campos: orden.length ? orden : CAMPOS_DISPONIBLES.map((c) => c.id),
          separador: el("nominaSep")?.value || ";",
          codificacion: el("nominaEnc")?.value || "latin1",
          incluirCabecera: el("nominaHeader")?.checked !== false,
          sinTildes: el("nominaTildes")?.checked !== false,
        };
        try {
          guardarEmpresa(ctx.emp);
        } catch {
          // Cuota de localStorage: degradar al genérico en memoria.
        }
      } else if (ctx.emp) {
        ctx.emp.nomina = { ...(ctx.emp.nomina || {}), perfilId };
        try {
          guardarEmpresa(ctx.emp);
        } catch {
          /* ignore */
        }
      }
      const out = descargarNomina(perfilId, {
        trabajadores: rows,
        indicadores: ctx.indicadores,
        glosa: glosaSueldo(periodo),
        nominaConfig: ctx.emp?.nomina,
        filename: "nomina-pago",
      });
      if (excluidos.length) {
        showError(
          el("errPago"),
          `Se excluyeron ${excluidos.length} con líquido ≤ 0: ${excluidos.map((t) => t.nombre).join(", ")}.`,
        );
      }
      const aviso = el("nominaAviso");
      if (aviso && out.aviso) {
        aviso.hidden = false;
        aviso.textContent = out.aviso;
      }
      triggerDownload(new Blob([out.bytes], { type: out.mime }), out.filename);
    } catch (err) {
      showError(el("errPago"), err.message);
    }
  });

  return {
    syncNominaAviso,
    avisoConsorcioRipley,
  };
}
