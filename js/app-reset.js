import { apiPost, authErrorMessage, isNoBackend } from "./api.js";
import { MIN_CLAVE } from "./storage.js";
import { el, mountIndicadores, showError, val, wireNav } from "./ui.js";

wireNav();
mountIndicadores();

const token = new URLSearchParams(location.search).get("token") || "";

el("formReset")?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  showError(el("errReset"), "");
  const ok = el("okReset");
  if (ok) {
    ok.hidden = true;
    ok.textContent = "";
  }

  const newPassword = val("newPassword") || "";
  if (!token) {
    showError(el("errReset"), "Falta el enlace de recuperación. Pídalo de nuevo en empresa.");
    return;
  }
  if (newPassword.length < MIN_CLAVE) {
    showError(el("errReset"), "La clave debe tener al menos 10 caracteres");
    return;
  }

  const { status, data } = await apiPost("/api/reset-confirm", { token, newPassword });
  if (isNoBackend(status, data)) {
    showError(
      el("errReset"),
      "No hay servidor de cuentas. Si la cuenta es solo de este navegador, vuelva a empresa y use «Olvidé mi clave» para borrar la cuenta local.",
    );
    return;
  }
  if (!data.ok) {
    showError(el("errReset"), authErrorMessage(data, status));
    return;
  }
  if (ok) {
    ok.hidden = false;
    ok.textContent = "Clave actualizada. Ya puede entrar en Para mi empresa.";
  }
  el("newPassword").value = "";
});
