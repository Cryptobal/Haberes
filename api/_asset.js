import { randomUUID } from "node:crypto";
import { json, noStorage, requireCompany, sendBytes, withDb } from "./_lib.js";
import { hasR2, r2Delete, r2Get, r2Put } from "./_r2.js";

export const config = { api: { bodyParser: false } };

const MAX_BYTES = 1.5 * 1024 * 1024;

function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { type: "image/png", ext: "png" };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { type: "image/jpeg", ext: "jpg" };
  }
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return { type: "image/webp", ext: "webp" };
  }
  return null;
}

function readBodyBuffer(req) {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  if (req.body instanceof Uint8Array) return Promise.resolve(Buffer.from(req.body));
  if (typeof req.body === "string") return Promise.resolve(Buffer.from(req.body, "binary"));
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BYTES) {
        const err = new Error("too_large");
        err.reason = "too_large";
        reject(err);
        req.destroy?.();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export function imageAssetHandler({ prefix, keyCol, typeCol, flag, emptyReason }) {
  return async function handler(req, res) {
    if (req.method !== "GET" && req.method !== "PUT" && req.method !== "DELETE") {
      res.setHeader?.("Allow", "GET, PUT, DELETE");
      return json(res, 405, { ok: false, reason: "method_not_allowed" });
    }
    const company = await requireCompany(req, res);
    if (!company) return;

    if (req.method === "GET") {
      if (!company[keyCol]) return json(res, 404, { ok: false, reason: emptyReason });
      if (!hasR2()) return noStorage(res);
      try {
        const got = await r2Get(company[keyCol]);
        if (!got.ok) return json(res, got.status === 404 ? 404 : 502, { ok: false, reason: "storage_error" });
        return sendBytes(res, 200, got.body, company[typeCol] || got.contentType || "image/png");
      } catch {
        return json(res, 502, { ok: false, reason: "storage_error" });
      }
    }

    if (!hasR2()) return noStorage(res);

    if (req.method === "DELETE") {
      try {
        if (company[keyCol]) await r2Delete(company[keyCol]);
        await withDb(async (client) => {
          await client.query(
            `UPDATE companies SET ${keyCol} = NULL, ${typeCol} = NULL, updated_at = NOW() WHERE id = $1`,
            [company.id],
          );
        });
        return json(res, 200, { ok: true, company: { [flag]: false } });
      } catch {
        return json(res, 502, { ok: false, reason: "storage_error" });
      }
    }

    let buf;
    try {
      buf = await readBodyBuffer(req);
    } catch (err) {
      if (err?.reason === "too_large") return json(res, 413, { ok: false, reason: "too_large" });
      return json(res, 400, { ok: false, reason: "invalid_payload" });
    }
    if (!buf.length) return json(res, 400, { ok: false, reason: "invalid_payload" });
    if (buf.length > MAX_BYTES) return json(res, 413, { ok: false, reason: "too_large" });
    const kind = sniffImage(buf);
    if (!kind) return json(res, 400, { ok: false, reason: "invalid_type" });

    const key = `${prefix}/${company.id}/${randomUUID()}.${kind.ext}`;
    try {
      const put = await r2Put(key, buf, kind.type);
      if (!put.ok) return json(res, 502, { ok: false, reason: "storage_error" });
      const prev = company[keyCol];
      await withDb(async (client) => {
        await client.query(
          `UPDATE companies SET ${keyCol} = $1, ${typeCol} = $2, updated_at = NOW() WHERE id = $3`,
          [key, kind.type, company.id],
        );
      });
      if (prev && prev !== key) await r2Delete(prev).catch(() => {});
      return json(res, 200, { ok: true, company: { [flag]: true } });
    } catch {
      return json(res, 502, { ok: false, reason: "storage_error" });
    }
  };
}
