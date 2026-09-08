const crypto = require("crypto");
const { loadChallenges } = require("./lib/store");
const { json } = require("./lib/http");

const rateLimitStore = new Map();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60 * 1000;
// Bound memory in long-lived instances: drop oldest keys past this cap.
const MAX_KEYS = 2000;

function isRateLimited(key) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry) return false;
  const filtered = entry.filter((ts) => now - ts < WINDOW_MS);
  if (filtered.length === 0) {
    rateLimitStore.delete(key);
    return false;
  }
  rateLimitStore.set(key, filtered);
  return filtered.length >= MAX_ATTEMPTS;
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

  const normalized = answer.trim();
  if (normalized.length === 0 || normalized.length > 200) {
    return json(400, { correct: false });
  }

  // Rate limit is per challenge per IP, per spec.
  const limitKey = `${ip}:${challengeId}`;
  if (isRateLimited(limitKey)) {
    // Same generic shape as any failure: { correct: boolean } only.
    return json(429, { correct: false });
  }
  recordAttempt(limitKey);

  const challenge = lookup(await loadChallenges(), challengeId);
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
