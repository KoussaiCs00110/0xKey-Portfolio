// =================================================
// Admin API auth — same credentials as the admin panel,
// no separate auth system. login.js issues a short-lived
// HMAC token; these helpers verify it (timing-safe).
// =================================================

const crypto = require("crypto");

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function tokenKey() {
  return process.env.ADMIN_TOKEN_SECRET || process.env.ADMIN_PASS || null;
}

function b64urlEncode(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s) {
  const b64 = String(s).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

function issueAdminToken(username) {
  const key = tokenKey();
  if (!key) return null;
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${username}.${exp}`;
  const sig = crypto.createHmac("sha256", key).update(payload).digest();
  return `${b64urlEncode(payload)}.${b64urlEncode(sig)}`;
}

function verifyAdminToken(token) {
  try {
    const key = tokenKey();
    if (!key || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const payload = b64urlDecode(parts[0]).toString("utf8");
    const sig = b64urlDecode(parts[1]);
    const expected = crypto.createHmac("sha256", key).update(payload).digest();
    if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) return null;
    const dot = payload.lastIndexOf(".");
    if (dot === -1) return null;
    const username = payload.slice(0, dot);
    const exp = Number(payload.slice(dot + 1));
    if (!username || !Number.isFinite(exp) || Date.now() > exp) return null;
    return username;
  } catch (_) {
    return null;
  }
}

function getBearerToken(event) {
  const headers = event.headers || {};
  const auth = headers.authorization || headers.Authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return m ? m[1].trim() : null;
}

function requireAdmin(event) {
  const username = verifyAdminToken(getBearerToken(event));
  return username || null;
}

module.exports = { issueAdminToken, verifyAdminToken, getBearerToken, requireAdmin, TOKEN_TTL_MS };
