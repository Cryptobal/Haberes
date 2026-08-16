import {
  companyPublic,
  hasDatabaseUrl,
  hashPassword,
  insertSession,
  json,
  MIN_PASSWORD_LENGTH,
  newId,
  noBackend,
  parseEmail,
  parseNewPassword,
  parseRazonSocial,
  parseRut,
  readJson,
  setSessionCookie,
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
  const email = parseEmail(body.email);
  const razonSocial = parseRazonSocial(body.razonSocial ?? body.razon_social);
  const password = parseNewPassword(body);
  if (!rut || !email || !razonSocial || !password) {
    return json(res, 400, {
      ok: false,
      reason: "invalid_payload",
      minPasswordLength: MIN_PASSWORD_LENGTH,
    });
  }

  try {
    const result = await withDb(async (client) => {
      await client.query("BEGIN");
      try {
        const passwordHash = await hashPassword(password);
        const id = newId();
        try {
          await client.query(
            `INSERT INTO companies (id, rut, email, password_hash, razon_social)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, rut, email, passwordHash, razonSocial],
          );
        } catch (err) {
          await client.query("ROLLBACK");
          if (err?.code === "23505") {
            return { status: 409, payload: { ok: false, reason: "conflict" } };
          }
          throw err;
        }
        const session = await insertSession(client, id);
        await client.query("COMMIT");
        return {
          status: 201,
          token: session.token,
          payload: {
            ok: true,
            company: companyPublic({
              id,
              rut,
              email,
              razon_social: razonSocial,
            }),
          },
        };
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      }
    });

    if (!result) return noBackend(res);
    if (result.token) setSessionCookie(res, result.token);
    return json(res, result.status, result.payload);
  } catch {
    return json(res, 503, { ok: false, reason: "db_unavailable" });
  }
}
