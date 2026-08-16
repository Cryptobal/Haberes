import {
  hasDatabaseUrl,
  hashToken,
  json,
  noBackend,
  readJson,
  saltPassword,
  withDb,
} from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader?.("Allow", "POST");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }
  if (!hasDatabaseUrl()) return noBackend(res);

  const body = readJson(req);
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const clave = typeof body.clave === "string" ? body.clave : typeof body.password === "string" ? body.password : "";
  if (!token || clave.length < 4) {
    return json(res, 400, { ok: false, reason: "invalid_payload" });
  }

  const tokenHash = hashToken(token);

  try {
    const result = await withDb(async (client) => {
      await client.query("BEGIN");
      try {
        const found = await client.query(
          `SELECT token_hash, rut, expires_at, used_at
           FROM haberes_password_resets
           WHERE token_hash = $1
           LIMIT 1
           FOR UPDATE`,
          [tokenHash],
        );
        const row = found.rows[0];
        const expired = !row || row.used_at || new Date(row.expires_at).getTime() <= Date.now();
        if (expired) {
          await client.query("ROLLBACK");
          return { status: 400, payload: { ok: false, reason: "invalid_token" } };
        }

        const { salt, hash } = saltPassword(clave);
        await client.query(
          `INSERT INTO haberes_credentials (rut, password_salt, password_hash, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (rut) DO UPDATE
           SET password_salt = EXCLUDED.password_salt,
               password_hash = EXCLUDED.password_hash,
               updated_at = NOW()`,
          [row.rut, salt, hash],
        );
        await client.query(
          "UPDATE haberes_password_resets SET used_at = NOW() WHERE token_hash = $1",
          [tokenHash],
        );
        await client.query("COMMIT");
        return { status: 200, payload: { ok: true } };
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      }
    });

    if (!result) return noBackend(res);
    return json(res, result.status, result.payload);
  } catch {
    return json(res, 503, { ok: false, reason: "db_unavailable" });
  }
}
