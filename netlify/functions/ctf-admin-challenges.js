// Admin CTF API — collection routes (same admin auth, no separate system).
//   GET  /api/admin/ctf/challenges  → list all (incl. drafts + soft-deleted)
//   POST /api/admin/ctf/challenges  → create (plaintext flag hashed, then discarded)
const crypto = require("crypto");
const { requireAdmin } = require("./lib/auth");
const { loadChallenges, saveChallenges, putAttachment, deleteAttachment } = require("./lib/store");
const { json, auditLog, toAdminChallenge } = require("./lib/http");
const {
  validateChallengeInput,
  checkFileName,
  guessContentType,
  MAX_FILES_PER_CHALLENGE,
  MAX_FILE_BYTES
} = require("./lib/validate");

const MAX_BODY_BYTES = 8 * 1024 * 1024;

function newId(existing) {
  for (let i = 0; i < 10; i++) {
    const id = "c-" + crypto.randomBytes(8).toString("hex");
    if (!existing.some((c) => c.id === id)) return id;
  }
  return "c-" + Date.now().toString(36) + crypto.randomBytes(4).toString("hex");
}

function hashFlag(salt, flag) {
  return crypto.createHash("sha256").update(salt + flag).digest("hex");
}

function processFiles(body, errors) {
  const addFiles = body.addFiles === undefined ? [] : body.addFiles;
  if (!Array.isArray(addFiles)) {
    errors.push("addFiles must be an array");
    return null;
  }
  const out = [];
  for (const f of addFiles) {
    if (!f || typeof f !== "object") {
      errors.push("invalid file entry");
      return null;
    }
    const name = checkFileName(f.name, errors);
    if (!name) return null;
    if (typeof f.data !== "string" || f.data.length === 0) {
      errors.push(`missing file data: ${name}`);
      return null;
    }
    let buffer;
    try {
      buffer = Buffer.from(f.data, "base64");
    } catch (_) {
      errors.push(`invalid base64 data: ${name}`);
      return null;
    }
    if (buffer.length === 0 || buffer.length > MAX_FILE_BYTES) {
      errors.push(`file too large (max 5MB): ${name}`);
      return null;
    }
    out.push({ name, buffer, contentType: guessContentType(name), size: buffer.length });
  }
  return out;
}

exports.handler = async (event) => {
  const admin = requireAdmin(event);
  if (!admin) return json(401, { error: "unauthorized" });

  if (event.httpMethod === "GET") {
    const list = await loadChallenges();
    const sorted = [...list].sort((a, b) => (a.order || 0) - (b.order || 0));
    return json(200, sorted.map(toAdminChallenge));
  }

  if (event.httpMethod === "POST") {
    if ((event.body || "").length > MAX_BODY_BYTES) {
      return json(413, { error: "payload too large" });
    }
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (_) {
      return json(400, { error: "invalid JSON" });
    }

    const { ok, errors, clean } = validateChallengeInput(body, { isCreate: true });
    const files = processFiles(body, errors);
    if (!ok || !files) return json(400, { errors });

    const list = await loadChallenges();
    if (files.length > MAX_FILES_PER_CHALLENGE) {
      return json(400, { errors: [`at most ${MAX_FILES_PER_CHALLENGE} attachments`] });
    }

    const now = new Date().toISOString();
    const maxOrder = list.reduce((m, c) => Math.max(m, typeof c.order === "number" ? c.order : 0), 0);
    const salt = crypto.randomBytes(32).toString("hex");
    const challenge = {
      id: newId(list),
      title: clean.title,
      description: clean.description,
      category: clean.category,
      difficulty: clean.difficulty,
      salt,
      flagHash: hashFlag(salt, clean.flag),
      writeup: clean.writeup,
      attachments: [],
      status: clean.status,
      deleted: false,
      deletedAt: null,
      order: clean.order === undefined ? maxOrder + 1 : clean.order,
      createdAt: now,
      updatedAt: now
    };
    // Plaintext flag is hashed above and never stored, logged, or returned.
    delete clean.flag;

    for (const f of files) {
      await putAttachment(challenge.id, f.name, f.buffer, f.contentType);
      challenge.attachments.push({ name: f.name, contentType: f.contentType, size: f.size });
    }

    list.push(challenge);
    await saveChallenges(list);
    auditLog({ actor: admin, action: "ctf.create", challengeId: challenge.id, title: challenge.title });
    return json(201, toAdminChallenge(challenge));
  }

  return json(405, { error: "method not allowed" });
};
