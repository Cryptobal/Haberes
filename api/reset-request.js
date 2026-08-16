import {
  allowRate,
  hasDatabaseUrl,
  json,
  mailConfigured,
  newId,
  newResetToken,
  noBackend,
  parseEmail,
  parseRut,
  rateLimited,
  readJson,
  sendResetEmail,
  withDb,
} from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader?.("Allow", "POST");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }
  if (!allowRate(req, "reset")) return rateLimited(res);
  if (!hasDatabaseUrl()) return noBackend(res);

  const body = readJson(req);
  const rut = parseRut(body.rut);
  const email = parseEmail(body.email);
  if (!rut || !email) {
    return json(res, 400, { ok: false, reason: "invalid_payload" });
  }

  const generic = { ok: true, emailed: mailConfigured() };

  try {
    const result = await withDb(async (client) => {
      const found = await client.query(
        `SELECT id, email FROM companies WHERE rut = $1 AND email = $2 LIMIT 1`,
        [rut, email],
      );
      const account = found.rows[0];
      if (!account) {
        newResetToken();
        return generic;
      }

      const { token, tokenHash, expiresAt } = newResetToken();
      await client.query(
        `UPDATE password_reset_tokens
         SET used_at = NOW()
         WHERE company_id = $1 AND used_at IS NULL`,
        [account.id],
      );
      await client.query(
        `INSERT INTO password_reset_tokens (id, company_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [newId(), account.id, tokenHash, expiresAt.toISOString()],
      );

      if (mailConfigured()) {
        try {
          await sendResetEmail({ to: account.email, token });
        } catch {
          // Same generic body whether send worked.
        }
      }
      return generic;
    });

    if (!result) return noBackend(res);
    return json(res, 200, result);
  } catch {
    return json(res, 503, { ok: false, reason: "db_unavailable" });
  }
}
