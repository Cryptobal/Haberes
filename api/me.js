import {
  companyPublic,
  hasDatabaseUrl,
  json,
  loadSessionCompany,
  noBackend,
  readSessionToken,
  withDb,
} from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader?.("Allow", "GET");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }
  if (!hasDatabaseUrl()) return noBackend(res);

  const token = readSessionToken(req);
  if (!token) return json(res, 401, { ok: false, reason: "unauthorized" });

  try {
    let connected = false;
    const row = await withDb(async (client) => {
      connected = true;
      return loadSessionCompany(client, token);
    });
    if (!connected) return noBackend(res);
    if (!row) return json(res, 401, { ok: false, reason: "unauthorized" });
    return json(res, 200, { ok: true, company: companyPublic(row) });
  } catch {
    return json(res, 503, { ok: false, reason: "db_unavailable" });
  }
}
