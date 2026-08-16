import {
  hasDatabaseUrl,
  json,
  newResetToken,
  noBackend,
  parseRut,
  readJson,
  sendResetEmail,
  withDb,
} from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader?.("Allow", "POST");
    return json(res, 405, { ok: false, reason: "method_not_allowed" });
  }
  if (!hasDatabaseUrl()) return noBackend(res);

  const body = readJson(req);
  const rut = parseRut(body.rut);
  if (!rut) return json(res, 400, { ok: false, reason: "invalid_payload" });

  try {
    const result = await withDb(async (client) => {
      const found = await client.query(
        "SELECT rut, email FROM haberes_credentials WHERE rut = $1 LIMIT 1",
        [rut],
      );
      const account = found.rows[0];
      if (!account) return { ok: true, emailed: false };

      const { token, tokenHash, expiresAt } = newResetToken();
      await client.query(
        `INSERT INTO haberes_password_resets (token_hash, rut, expires_at)
         VALUES ($1, $2, $3)`,
        [tokenHash, rut, expiresAt.toISOString()],
      );

      let emailed = false;
      if (String(process.env.RESEND_API_KEY || "").trim() && account.email) {
        try {
          emailed = await sendResetEmail({ to: account.email, token });
        } catch {
          emailed = false;
        }
      }
      return { ok: true, emailed };
    });

    if (!result) return noBackend(res);
    return json(res, 200, result);
  } catch {
    return json(res, 503, { ok: false, reason: "db_unavailable" });
  }
}
