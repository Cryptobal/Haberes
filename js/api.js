export async function apiSend(path, { method = "GET", body } = {}) {
  try {
    const res = await fetch(path, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      credentials: "same-origin",
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    return { status: res.status, data };
  } catch {
    return { status: 0, data: { ok: false, reason: "network" } };
  }
}

export function apiPost(path, body) {
  return apiSend(path, { method: "POST", body });
}

export function apiGet(path) {
  return apiSend(path, { method: "GET" });
}

export async function apiPutBytes(path, body, contentType) {
  try {
    const res = await fetch(path, {
      method: "PUT",
      credentials: "same-origin",
      headers: { Accept: "application/json", "Content-Type": contentType },
      body,
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    return { status: res.status, data };
  } catch {
    return { status: 0, data: { ok: false, reason: "network" } };
  }
}

export async function apiDownloadPdf(path, body) {
  try {
    const res = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/pdf",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const type = String(res.headers.get("content-type") || "");
    if (!res.ok || type.includes("application/json")) {
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = { ok: false };
      }
      return { status: res.status, data, blob: null };
    }
    return { status: res.status, data: { ok: true }, blob: await res.blob() };
  } catch {
    return { status: 0, data: { ok: false, reason: "network" }, blob: null };
  }
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function isNoBackend(status, data) {
  return status === 501 || status === 0 || data?.reason === "no_backend";
}

export function authErrorMessage(data, status) {
  const reason = data?.reason;
  if (reason === "rate_limited" || status === 429) {
    return "Demasiados intentos. Espere 15 minutos e inténtelo de nuevo.";
  }
  if (reason === "no_storage" || status === 501 && data?.reason === "no_storage") {
    return "El almacenamiento de archivos no está configurado. No se sube el logo ni se genera el PDF.";
  }
  if (reason === "unauthorized" || status === 401) return "Entre con su cuenta de empresa.";
  if (reason === "too_large" || status === 413) return "El archivo supera el límite de 1,5 MB.";
  if (reason === "invalid_type") return "El logo debe ser PNG, JPG o WebP.";
  if (reason === "no_logo" || status === 404) return "Esta cuenta aún no tiene logo.";
  if (reason === "conflict") return "Ya existe una cuenta con ese RUT o correo.";
  if (reason === "invalid_payload") {
    return "Revise RUT, correo y clave (mínimo 10 caracteres).";
  }
  if (reason === "invalid_credentials") return "RUT o clave incorrectos.";
  if (reason === "invalid_token") return "El enlace no es válido, expiró o ya se usó.";
  if (reason === "db_unavailable" || status === 503) {
    return "No se pudo conectar con la cuenta en este momento.";
  }
  return "No se pudo completar la solicitud.";
}
