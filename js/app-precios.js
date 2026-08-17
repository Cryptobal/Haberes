import {
  checkoutBusyLabel,
  loadCheckoutProviders,
  startProCheckout,
} from "./checkout.js";
import { el, mountIndicadores, toastError, wireNav, withBusy } from "./ui.js";

wireNav();
mountIndicadores();

function setCta(loggedPro, providers) {
  const mpBtn = el("btnPasarPro");
  const flowBtn = el("btnPasarProFlow");
  const state = el("proState");
  const hasMp = providers.includes("mp");
  const hasFlow = providers.includes("flow");
  if (loggedPro) {
    if (mpBtn) mpBtn.hidden = true;
    if (flowBtn) flowBtn.hidden = true;
    if (state) {
      state.hidden = false;
      state.textContent = "Ya es Pro";
    }
    return;
  }
  if (state) state.hidden = true;
  if (mpBtn) {
    mpBtn.hidden = !hasMp;
    mpBtn.disabled = false;
  }
  if (flowBtn) {
    flowBtn.hidden = !hasFlow;
    flowBtn.disabled = false;
  }
}

async function paintCta() {
  const { providers, loggedPro } = await loadCheckoutProviders();
  setCta(loggedPro, providers);
}

paintCta();

function bindPay(id, provider) {
  el(id)?.addEventListener("click", async (ev) => {
    await withBusy(
      ev.currentTarget,
      () =>
        startProCheckout({
          provider,
          onError(msg) {
            toastError("No se pudo iniciar el pago", msg);
          },
        }),
      checkoutBusyLabel(provider),
    );
  });
}

bindPay("btnPasarPro", "mp");
bindPay("btnPasarProFlow", "flow");
