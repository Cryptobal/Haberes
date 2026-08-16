import { createHash, createHmac } from "node:crypto";

const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

export function hasR2() {
  return Boolean(
    String(process.env.R2_ACCOUNT_ID || "").trim() &&
      String(process.env.R2_ACCESS_KEY_ID || "").trim() &&
      String(process.env.R2_SECRET_ACCESS_KEY || "").trim() &&
      String(process.env.R2_BUCKET || "").trim(),
  );
}

function r2Config() {
  if (!hasR2()) return null;
  return {
    accountId: String(process.env.R2_ACCOUNT_ID).trim(),
    accessKeyId: String(process.env.R2_ACCESS_KEY_ID).trim(),
    secretAccessKey: String(process.env.R2_SECRET_ACCESS_KEY).trim(),
    bucket: String(process.env.R2_BUCKET).trim(),
  };
}

function hmac(key, data) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data) {
  return createHash("sha256").update(data).digest("hex");
}

function encodePath(key) {
  return String(key)
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function amzNow(d = new Date()) {
  const iso = d.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amz: iso, date: iso.slice(0, 8) };
}

async function s3({ method, key, body, contentType }) {
  const cfg = r2Config();
  if (!cfg) return { ok: false, status: 501, reason: "no_storage" };

  const region = "auto";
  const service = "s3";
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const path = `/${cfg.bucket}/${encodePath(key)}`;
  const url = `https://${host}${path}`;
  const { amz, date } = amzNow();
  const payload = body == null ? Buffer.alloc(0) : Buffer.isBuffer(body) ? body : Buffer.from(body);
  const payloadHash = payload.length ? sha256Hex(payload) : EMPTY_SHA256;

  const headerMap = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amz,
  };
  if (contentType) headerMap["content-type"] = contentType;
  if (payload.length) headerMap["content-length"] = String(payload.length);

  const signedNames = Object.keys(headerMap)
    .map((n) => n.toLowerCase())
    .sort();
  const canonicalHeaders = signedNames
    .map((n) => {
      const orig = Object.keys(headerMap).find((k) => k.toLowerCase() === n);
      return `${n}:${String(headerMap[orig]).trim()}\n`;
    })
    .join("");
  const signedHeaders = signedNames.join(";");
  const canonicalRequest = [
    method,
    path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amz, scope, sha256Hex(canonicalRequest)].join("\n");
  const kDate = hmac(`AWS4${cfg.secretAccessKey}`, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");

  const headers = {
    ...headerMap,
    Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };

  const res = await fetch(url, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" || method === "DELETE" ? undefined : payload,
  });
  const buf = Buffer.from(await res.arrayBuffer());
  if (!res.ok) {
    return { ok: false, status: res.status, reason: "storage_error" };
  }
  return {
    ok: true,
    status: res.status,
    body: buf,
    contentType: res.headers.get("content-type") || contentType || "application/octet-stream",
  };
}

export async function r2Put(key, body, contentType) {
  return s3({ method: "PUT", key, body, contentType });
}

export async function r2Get(key) {
  return s3({ method: "GET", key });
}

export async function r2Delete(key) {
  if (!key) return { ok: true, status: 204 };
  return s3({ method: "DELETE", key });
}
