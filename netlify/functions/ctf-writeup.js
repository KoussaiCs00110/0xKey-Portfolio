const crypto = require("crypto");
const { ensureSettings } = require("./lib/store");
const { json } = require("./lib/http");
const { maxFlagLength } = require("./lib/validate");

exports.handler = async (event) => {
  // Generic error used for every failure so valid/invalid challenge IDs
  // and right/wrong answers are indistinguishable.
  const denied = () => json(403, { error: "forbidden" });

  if (event.httpMethod !== "POST") {
    return json(405, { error: "method not allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (_) {
    return denied();
  }

  const { challengeId, answer } = body;

  if (
    !challengeId ||
    typeof challengeId !== "string" ||
    challengeId.length > 100 ||
    !answer ||
    typeof answer !== "string"
  ) {
    return denied();
  }

  const { settings, challenges } = await ensureSettings();

  if (settings.pageEnabled === false) {
    return denied();
  }

  const normalized = answer.trim();
  if (normalized.length === 0 || normalized.length > maxFlagLength(settings)) {
    return denied();
  }

  const challenge = challenges.find((x) => x.id === challengeId);
  // Drafts and soft-deleted challenges never reveal writeups.
  if (!challenge || challenge.deleted || challenge.status !== "published") {
    return denied();
  }

  // Global kill-switch for writeups.
  if (settings.writeupsEnabled === false) {
    return denied();
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
    return denied();
  }

  return json(200, { writeup: challenge.writeup || "No writeup available." });
};
