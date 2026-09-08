// Admin CTF API — item routes (?id=...).
//   GET    → single challenge (admin view, no secrets)
//   PUT    → edit (flag optional: new plaintext re-hashes with a fresh salt;
//            omit it to keep the existing hash). Supports restore via
//            { deleted: false } and file add/remove. Requires
//            expectedUpdatedAt for optimistic concurrency (409 on conflict).
//   DELETE → soft delete (deleted=true), links/writeups stay resolvable.
//   DELETE ?purge=true → permanent delete + attachment cleanup.
const crypto = require("crypto");
const { requireAdmin } = require("./lib/auth");
const { ensureSettings, saveChallenges, putAttachment, deleteAttachment } = require("./lib/store");
const { json, auditLog, toAdminChallenge } = require("./lib/http");
const {
  validateChallengeInput,
  checkFileName,
  guessContentType,
  MAX_FILES_PER_CHALLENGE,
  MAX_FILE_BYTES
} = require("./lib/validate");

const MAX_BODY_BYTES = 8 * 1024 * 1024;

function hashFlag(salt, flag) {
  return crypto.createHash("sha256").update(salt + flag).digest("hex");
}

function getId(event) {
  const params = event.queryStringParameters || {};
  const id = params.id || "";
  if (typeof id !== "string" || id.length === 0 || id.length > 100) return null;
  return id;
}

function isPurge(event) {
  const params = event.queryStringParameters || {};
  return params.purge === "true" || params.purge === "1";
}

function processFiles(body, errors) {
  const addFiles = body.addFiles === undefined ? [] : body.addFiles;
  const removeFiles = body.removeFiles === undefined ? [] : body.removeFiles;
  if (!Array.isArray(addFiles) || !Array.isArray(removeFiles)) {
    errors.push("addFiles/removeFiles must be arrays");
    return null;
  }
  const adds = [];
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
    adds.push({ name, buffer, contentType: guessContentType(name), size: buffer.length });
  }
  for (const n of removeFiles) {
    if (typeof n !== "string" || checkFileName(n, errors) === null) return null;
  }
  return { adds, removes: removeFiles };
}

exports.handler = async (event) => {
  const admin = requireAdmin(event);
  if (!admin) return json(401, { error: "unauthorized" });

  const id = getId(event);
  if (!id) return json(400, { error: "missing id" });

  const { settings, challenges: list } = await ensureSettings();
  const ix = list.findIndex((c) => c.id === id);
  if (ix === -1) return json(404, { error: "not found" });
  const challenge = list[ix];

  if (event.httpMethod === "GET") {
    return json(200, toAdminChallenge(challenge, settings));
  }

  if (event.httpMethod === "DELETE") {
    if (isPurge(event)) {
      for (const a of challenge.attachments || []) {
        await deleteAttachment(id, a.name);
      }
      list.splice(ix, 1);
      await saveChallenges(list);
      auditLog({ actor: admin, action: "ctf.purge", challengeId: id, title: challenge.title });
      return json(200, { ok: true, purged: true });
    }
    if (!challenge.deleted) {
      challenge.deleted = true;
      challenge.deletedAt = new Date().toISOString();
      challenge.updatedAt = challenge.deletedAt;
      await saveChallenges(list);
    }
    auditLog({ actor: admin, action: "ctf.delete", challengeId: id, title: challenge.title });
    return json(200, { ok: true });
  }

  if (event.httpMethod === "PUT") {
    if ((event.body || "").length > MAX_BODY_BYTES) {
      return json(413, { error: "payload too large" });
    }
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (_) {
      return json(400, { error: "invalid JSON" });
    }

    // Optimistic concurrency: refuse to overwrite a newer edit.
    if (body.expectedUpdatedAt !== challenge.updatedAt) {
      return json(409, {
        error: "conflict",
        message: "This challenge was modified by someone else. Reload and re-apply your changes.",
        current: toAdminChallenge(challenge, settings)
      });
    }

    const { ok, errors, clean } = validateChallengeInput(body, { isCreate: false, settings });
    const files = processFiles(body, errors);
    if (!ok || !files) return json(400, { errors });

    const remaining = (challenge.attachments || []).filter((a) => !files.removes.includes(a.name));
    const mergedNames = new Set(remaining.map((a) => a.name));
    for (const f of files.adds) mergedNames.add(f.name);
    if (mergedNames.size > MAX_FILES_PER_CHALLENGE) {
      return json(400, { errors: [`at most ${MAX_FILES_PER_CHALLENGE} attachments`] });
    }

    challenge.title = clean.title;
    challenge.description = clean.description;
    challenge.category = clean.category;
    challenge.difficulty = clean.difficulty;
    challenge.status = clean.status;
    if (clean.order !== undefined) challenge.order = clean.order;
    challenge.writeup = clean.writeup;
    if (clean.deleted !== undefined) {
      challenge.deleted = clean.deleted;
      challenge.deletedAt = clean.deleted ? new Date().toISOString() : null;
    }
    if (clean.flag !== undefined) {
      // New plaintext flag: fresh salt + hash, then discard the plaintext.
      const salt = crypto.randomBytes(32).toString("hex");
      challenge.salt = salt;
      challenge.flagHash = hashFlag(salt, clean.flag);
      delete clean.flag;
    }
    for (const name of files.removes) {
      await deleteAttachment(id, name);
    }
    challenge.attachments = remaining;
    for (const f of files.adds) {
      await putAttachment(id, f.name, f.buffer, f.contentType);
      const fix = challenge.attachments.findIndex((a) => a.name === f.name);
      const meta = { name: f.name, contentType: f.contentType, size: f.size };
      if (fix === -1) challenge.attachments.push(meta);
      else challenge.attachments[fix] = meta;
    }
    challenge.updatedAt = new Date().toISOString();

    await saveChallenges(list);
    auditLog({ actor: admin, action: "ctf.update", challengeId: id, title: challenge.title });
    return json(200, toAdminChallenge(challenge, settings));
  }

  return json(405, { error: "method not allowed" });
};
