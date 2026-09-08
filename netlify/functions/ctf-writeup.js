const crypto = require("crypto");
const { loadChallenges } = require("./lib/store");
const { json } = require("./lib/http");

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

  const normalized = answer.trim();
  if (normalized.length === 0 || normalized.length > 200) {
    return denied();
  }

  const list = await loadChallenges();
  const challenge = list.find((x) => x.id === challengeId);
  // Drafts and soft-deleted challenges never reveal writeups.
  if (!challenge || challenge.deleted || challenge.status !== "published") {
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
