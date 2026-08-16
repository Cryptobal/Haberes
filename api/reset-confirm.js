import {
  hasDatabaseUrl,
  hashPassword,
  hashToken,
  json,
  noBackend,
  parseNewPassword,
  readJson,
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
  const password = parseNewPassword(body);
  if (!token || !password) {
    return json(res, 400, { ok: false, reason: "invalid_payload" });
  }

  const tokenHash = hashToken(token);

  try {
    const result = await withDb(async (client) => {
      await client.query("BEGIN");
      try {
        const found = await client.query(
          `SELECT id, company_id, expires_at, used_at
           FROM password_reset_tokens
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

        const passwordHash = await hashPassword(password);
        await client.query(
          `UPDATE companies
           SET password_hash = $1, updated_at = NOW()
           WHERE id = $2`,
          [passwordHash, row.company_id],
        );
        await client.query(
          `UPDATE password_reset_tokens
           SET used_at = NOW()
           WHERE company_id = $1 AND used_at IS NULL`,
          [row.company_id],
        );
        await client.query("DELETE FROM sessions WHERE company_id = $1", [row.company_id]);
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
