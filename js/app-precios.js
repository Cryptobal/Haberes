import { apiGet } from "./api.js";
import { startProCheckout } from "./checkout.js";
import { el, mountIndicadores, toastError, wireNav, withBusy } from "./ui.js";

wireNav();
mountIndicadores();

function setCta(loggedPro) {
  const btn = el("btnPasarPro");
  const state = el("proState");
  if (!btn) return;
  if (loggedPro) {
    btn.hidden = true;
    if (state) {
      state.hidden = false;
      state.textContent = "Ya es Pro";
    }
    return;
  }
  btn.hidden = false;
  btn.disabled = false;
  if (state) state.hidden = true;
}

async function paintCta() {
  const { data } = await apiGet("/api/me");
  setCta(Boolean(data?.ok && data.company?.plan === "pro"));
}

paintCta();

el("btnPasarPro")?.addEventListener("click", async (ev) => {
  await withBusy(
    ev.currentTarget,
    () =>
      startProCheckout({
        onError(msg) {
          toastError("No se pudo iniciar el pago", msg);
        },
      }),
    "Abriendo Mercado Pago…",
  );
});
