/**
 * Capas superpuestas de Haberes: bloqueo de scroll, trampa de foco,
 * avisos flotantes y diálogos. Nunca se usa alert, confirm ni prompt del
 * navegador: todo es marcado propio, estilizado y accesible.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let lockCount = 0;
let savedScroll = 0;
let dialogCount = 0;

function markDialog(open) {
  dialogCount = Math.max(0, dialogCount + (open ? 1 : -1));
  if (dialogCount > 0) document.body.dataset.dialogOpen = "1";
  else delete document.body.dataset.dialogOpen;
}

export function lockScroll() {
  lockCount += 1;
  if (lockCount > 1) return;
  savedScroll = window.scrollY || 0;
  document.body.classList.add("is-locked");
  document.body.style.top = `-${savedScroll}px`;
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
}

export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;
  document.body.classList.remove("is-locked");
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  window.scrollTo(0, savedScroll);
}

/** Mantiene el tabulador dentro del contenedor mientras esté abierto. */
export function trapFocus(container) {
  function onKey(ev) {
    if (ev.key !== "Tab") return;
    const nodes = [...container.querySelectorAll(FOCUSABLE)].filter(
      (n) => n.offsetParent !== null || n === document.activeElement,
    );
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault();
      first.focus();
    }
  }
  container.addEventListener("keydown", onKey);
  return () => container.removeEventListener("keydown", onKey);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------- Avisos flotantes ---------- */

let toaster = null;

function ensureToaster() {
  if (toaster && document.body.contains(toaster)) return toaster;
  toaster = document.createElement("div");
  toaster.className = "toaster";
  toaster.setAttribute("role", "status");
  toaster.setAttribute("aria-live", "polite");
  document.body.appendChild(toaster);
  return toaster;
}

/**
 * Muestra un aviso flotante.
 * @param {string} title Texto principal.
 * @param {{ tone?: "ok"|"error"|"info", message?: string, timeout?: number }} [opts]
 */
export function toast(title, opts = {}) {
  const tone = opts.tone || "info";
  const timeout = Number.isFinite(opts.timeout) ? opts.timeout : tone === "error" ? 7000 : 4200;
  const host = ensureToaster();
  const node = document.createElement("div");
  node.className = `toast toast-${tone}`;
  node.innerHTML = `
    <div class="toast-body">
      <p class="toast-title">${escapeHtml(title)}</p>
      ${opts.message ? `<p class="toast-msg">${escapeHtml(opts.message)}</p>` : ""}
    </div>
    <button type="button" class="toast-close" aria-label="Cerrar aviso">×</button>`;

  let timer = null;
  function dismiss() {
    if (timer) clearTimeout(timer);
    node.classList.add("is-closing");
    node.addEventListener("animationend", () => node.remove(), { once: true });
    setTimeout(() => node.remove(), 400);
  }
  node.querySelector(".toast-close").addEventListener("click", dismiss);
  host.appendChild(node);
  if (timeout > 0) timer = setTimeout(dismiss, timeout);
  return dismiss;
}

export const toastOk = (title, message) => toast(title, { tone: "ok", message });
export const toastError = (title, message) => toast(title, { tone: "error", message });
export const toastInfo = (title, message) => toast(title, { tone: "info", message });

/* ---------- Diálogos ---------- */

/**
 * Diálogo modal propio. Devuelve una promesa con el valor de la acción elegida.
 * Sin window.confirm: hoja inferior en móvil, tarjeta centrada en escritorio.
 */
export function openDialog({
  title = "",
  text = "",
  html = "",
  actions = [{ label: "Aceptar", value: true, variant: "btn" }],
  dismissValue = false,
  dismissible = true,
} = {}) {
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "modal";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    const titleId = `dlg-${Math.random().toString(36).slice(2, 8)}`;
    if (title) overlay.setAttribute("aria-labelledby", titleId);

    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-grab" aria-hidden="true"></div>
        ${title ? `<h2 class="modal-title" id="${titleId}">${escapeHtml(title)}</h2>` : ""}
        ${html || (text ? `<p class="modal-text">${escapeHtml(text)}</p>` : "")}
        <div class="modal-actions">
          ${actions
            .map(
              (a, i) =>
                `<button type="button" class="btn ${a.variant || "btn-ghost"}" data-idx="${i}">${escapeHtml(
                  a.label,
                )}</button>`,
            )
            .join("")}
        </div>
      </div>`;

    const card = overlay.querySelector(".modal-card");
    let releaseTrap = null;
    let closed = false;

    function close(value) {
      if (closed) return;
      closed = true;
      overlay.classList.add("is-closing");
      document.removeEventListener("keydown", onKey, true);
      releaseTrap?.();
      markDialog(false);
      unlockScroll();
      const remove = () => {
        overlay.remove();
        if (previous instanceof HTMLElement) previous.focus?.();
        resolve(value);
      };
      overlay.addEventListener("animationend", remove, { once: true });
      setTimeout(remove, 400);
    }

    function onKey(ev) {
      if (ev.key === "Escape" && dismissible) {
        ev.preventDefault();
        ev.stopPropagation();
        close(dismissValue);
      }
    }

    overlay.querySelectorAll("[data-idx]").forEach((btn) => {
      btn.addEventListener("click", () => close(actions[Number(btn.dataset.idx)]?.value));
    });
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay && dismissible) close(dismissValue);
    });

    document.body.appendChild(overlay);
    lockScroll();
    markDialog(true);
    releaseTrap = trapFocus(card);
    document.addEventListener("keydown", onKey, true);
    const focusTarget =
      card.querySelector("input, textarea") || card.querySelector("[data-idx]");
    focusTarget?.focus();
  });
}

/**
 * Confirmación de dos vías. Reemplaza a window.confirm.
 */
export function confirmDialog({
  title = "¿Confirma?",
  text = "",
  okLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = true,
} = {}) {
  return openDialog({
    title: text ? title : "¿Confirma?",
    text: text || title,
    actions: [
      { label: cancelLabel, value: false, variant: "btn-ghost" },
      { label: okLabel, value: true, variant: danger ? "btn-danger" : "btn" },
    ],
    dismissValue: false,
  });
}

/** Aviso de una sola vía. Reemplaza a window.alert. */
export function alertDialog({ title = "Aviso", text = "", okLabel = "Entendido" } = {}) {
  return openDialog({
    title,
    text,
    actions: [{ label: okLabel, value: true, variant: "btn" }],
    dismissValue: true,
  });
}
