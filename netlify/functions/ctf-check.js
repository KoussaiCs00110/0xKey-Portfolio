const crypto = require("crypto");
const { ensureSettings } = require("./lib/store");
const { json } = require("./lib/http");
const { maxFlagLength } = require("./lib/validate");

const rateLimitStore = new Map();
// Bound memory in long-lived instances: drop oldest keys past this cap.
const MAX_KEYS = 2000;

function rateParams(settings) {
  const rl = (settings && settings.rateLimit) || {};
  const maxAttempts =
    Number.isFinite(+rl.maxAttempts) ? Math.trunc(+rl.maxAttempts) : 10;
  const windowSeconds =
    Number.isFinite(+rl.windowSeconds) ? Math.trunc(+rl.windowSeconds) : 60;
  return {
    maxAttempts: Math.min(1000, Math.max(1, maxAttempts)),
    windowMs: Math.min(3600000, Math.max(10000, windowSeconds * 1000))
  };
}

function isRateLimited(key, maxAttempts, windowMs) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry) return false;
  const filtered = entry.filter((ts) => now - ts < windowMs);
  if (filtered.length === 0) {
    rateLimitStore.delete(key);
    return false;
  }
  rateLimitStore.set(key, filtered);
  return filtered.length >= maxAttempts;
}

function recordAttempt(key) {
  const now = Date.now();
  const entry = rateLimitStore.get(key) || [];
  entry.push(now);
  rateLimitStore.set(key, entry);
  if (rateLimitStore.size > MAX_KEYS) {
    // Map preserves insertion order: evict oldest key.
    const oldest = rateLimitStore.keys().next().value;
    rateLimitStore.delete(oldest);
  }
}

function lookup(list, id) {
  const c = list.find((x) => x.id === id);
  // Drafts and soft-deleted challenges are invisible to the public API.
  if (!c || c.deleted || c.status !== "published") return null;
  return c;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "method not allowed" });
  }

  const ip =
    event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    event.headers["client-ip"] ||
    "unknown";

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (_) {
    return json(400, { correct: false });
  }

  const { challengeId, answer } = body;

  if (!challengeId || typeof challengeId !== "string" || challengeId.length > 100) {
    return json(400, { correct: false });
  }

  if (!answer || typeof answer !== "string") {
    return json(400, { correct: false });
  }

  const { settings, challenges } = await ensureSettings();

  if (settings.pageEnabled === false) {
    return json(503, { correct: false });
  }

  const maxLen = maxFlagLength(settings);
  const normalized = answer.trim();
  if (normalized.length === 0 || normalized.length > maxLen) {
    return json(400, { correct: false });
  }

  // Rate limit is per challenge per IP; thresholds come from site settings
  // (admin-configurable, no restart needed).
  const { maxAttempts, windowMs } = rateParams(settings);
  const limitKey = `${ip}:${challengeId}`;
  if (isRateLimited(limitKey, maxAttempts, windowMs)) {
    // Same generic shape as any failure: { correct: boolean } only.
    return json(429, { correct: false });
  }
  recordAttempt(limitKey);

  const challenge = lookup(challenges, challengeId);
  if (!challenge) {
    console.log(JSON.stringify({ ip, challengeId, timestamp: Date.now(), result: "not_found" }));
    return json(200, { correct: false });
  }

  const candidateHash = crypto
    .createHash("sha256")
    .update(challenge.salt + normalized)
    .digest();
  const storedHash = Buffer.from(challenge.flagHash, "hex");

  let isCorrect = false;
  if (candidateHash.length === storedHash.length) {
    isCorrect = crypto.timingSafeEqual(candidateHash, storedHash);
  }

  if (!isCorrect) {
    console.log(JSON.stringify({ ip, challengeId, timestamp: Date.now(), result: "wrong" }));
  }

  return json(200, { correct: isCorrect });
};
