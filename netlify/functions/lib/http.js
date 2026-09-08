// Shared response headers + helpers for CTF functions.

function jsonHeaders(extra) {
  return Object.assign(
    {
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
    },
    extra || {}
  );
}

function json(statusCode, obj, extraHeaders) {
  return { statusCode, headers: jsonHeaders(extraHeaders), body: JSON.stringify(obj) };
}

// Audit log for admin actions. Never pass plaintext flags here.
function auditLog(entry) {
  try {
    console.log(JSON.stringify(Object.assign({ ts: new Date().toISOString() }, entry)));
  } catch (_) {}
}

// Admin-facing view of a challenge: everything except secrets.
// salt / flagHash / plaintext flag are NEVER included.
function toAdminChallenge(c) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    difficulty: c.difficulty,
    status: c.status,
    deleted: Boolean(c.deleted),
    deletedAt: c.deletedAt || null,
    order: typeof c.order === "number" ? c.order : 0,
    attachments: (c.attachments || []).map((a) => ({
      name: a.name,
      contentType: a.contentType,
      size: a.size
    })),
    hasFlag: Boolean(c.flagHash),
    hasWriteup: Boolean(c.writeup),
    // Writeup text is admin-editable content (unlike the flag, which is
    // write-only). The edit form needs it to avoid wiping it on save.
    writeup: c.writeup || "",
    createdAt: c.createdAt || null,
    updatedAt: c.updatedAt || null
  };
}

module.exports = { jsonHeaders, json, auditLog, toAdminChallenge };
