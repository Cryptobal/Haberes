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

export function isNoBackend(status, data) {
  return status === 501 || status === 0 || data?.reason === "no_backend";
}

export function authErrorMessage(data, status) {
  const reason = data?.reason;
  if (reason === "rate_limited" || status === 429) {
    return "Demasiados intentos. Espere 15 minutos e inténtelo de nuevo.";
  }
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
