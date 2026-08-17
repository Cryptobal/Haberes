import { triggerDownload } from "./api.js";
import { codificarAnsi, datosFaltantesLre, generarLre, nombreArchivoLre } from "./lre.js";
import { isPro } from "./plan.js";
import { empresaActual, guardarEmpresa } from "./storage.js";
import { el, showError, toastOk, val } from "./ui.js";

export function bindEmpresaLre(ctx) {
  function lreConfigGuardada() {
    return ctx.emp?.lre || {};
  }

  function refrescarLre() {
    const cfg = lreConfigGuardada();
    if (cfg.region) ctx.pickers.lreRegion?.setValue(String(cfg.region));
    if (cfg.comuna) el("lreComuna").value = cfg.comuna;
    if (cfg.mutual !== undefined) ctx.pickers.lreMutual?.setValue(String(cfg.mutual));
    const lista = ctx.emp?.trabajadores || [];
    const faltan = lista
      .map((t) => ({ t, campos: datosFaltantesLre(t) }))
      .filter((x) => x.campos.length);
    const nota = el("lreFaltantes");
    if (!nota) return;
    if (!faltan.length) {
      nota.hidden = true;
      nota.textContent = "";
    } else {
      nota.hidden = false;
      nota.textContent =
        `Datos pendientes para el LRE — ` +
        faltan
          .map((x) => `${x.t.nombre || x.t.rut || "trabajador"}: ${x.campos.join(", ")}`)
          .join(" · ") +
        ". Edite cada ficha para completarlos; el CSV deja esas celdas vacías.";
    }
  }

  el("btnLreCsv")?.addEventListener("click", () => {
    showError(el("errLre"), "");
    ctx.emp = empresaActual();
    if (!isPro(ctx.emp)) {
      return showError(el("errLre"), "El LRE es parte del plan Pro. Escríbanos para activarlo.");
    }
    const lista = ctx.emp?.trabajadores || [];
    if (!lista.length) return showError(el("errLre"), "No hay trabajadores en la nómina");
    const region = Number(ctx.pickers.lreRegion?.getValue()) || 0;
    const comuna = Number(val("lreComuna")) || 0;
    const mutual = Number(ctx.pickers.lreMutual?.getValue()) || 0;
    if (!region || !comuna) {
      return showError(el("errLre"), "Indique la región y el código de comuna (Tabla N°3 del manual)");
    }
    ctx.emp.lre = { region, comuna, mutual };
    guardarEmpresa(ctx.emp);
    const periodo = ctx.pickers.periodo?.getValue() || "";
    try {
      const csv = generarLre({
        trabajadores: lista,
        contexto: { region, comuna, mutual },
        indicadores: ctx.indicadores,
      });
      triggerDownload(
        new Blob([codificarAnsi(csv)], { type: "text/csv" }),
        nombreArchivoLre(ctx.emp.rut, periodo),
      );
      toastOk("LRE descargado", `${lista.length} trabajador${lista.length === 1 ? "" : "es"} · revíselo antes de subirlo a Mi DT`);
      refrescarLre();
    } catch (err) {
      showError(el("errLre"), err.message);
    }
  });

  return {
    lreConfigGuardada,
    refrescarLre,
  };
}
