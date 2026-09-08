// Public, unauthenticated file serving for challenge attachments.
// By default only files of published, non-deleted challenges are served;
// the attachmentsRequirePublished setting can relax the published check.
const { ensureSettings, getAttachment } = require("./lib/store");
const { jsonHeaders } = require("./lib/http");

const ID_PATTERN = /^[a-zA-Z0-9-]{1,100}$/;

function isInline(contentType) {
  return /^(image|text)\//.test(contentType || "");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: jsonHeaders(),
      body: JSON.stringify({ error: "method not allowed" })
    };
  }

  const params = event.queryStringParameters || {};
  const id = params.id || "";
  const file = params.file || "";

  if (!ID_PATTERN.test(id) || !file || file.length > 120 || /[\\/]/.test(file) || file.includes("..")) {
    return { statusCode: 404, headers: jsonHeaders(), body: JSON.stringify({ error: "not found" }) };
  }

  const { settings, challenges } = await ensureSettings();
  if (settings.pageEnabled === false) {
    return { statusCode: 404, headers: jsonHeaders(), body: JSON.stringify({ error: "not found" }) };
  }
  const challenge = challenges.find((x) => x.id === id);
  const requirePublished = settings.attachmentsRequirePublished !== false;
  if (!challenge || challenge.deleted || (requirePublished && challenge.status !== "published")) {
    return { statusCode: 404, headers: jsonHeaders(), body: JSON.stringify({ error: "not found" }) };
  }

  const manifest = (challenge.attachments || []).find((a) => a.name === file);
  if (!manifest) {
    return { statusCode: 404, headers: jsonHeaders(), body: JSON.stringify({ error: "not found" }) };
  }

  const stored = await getAttachment(id, file);
  if (!stored) {
    return { statusCode: 404, headers: jsonHeaders(), body: JSON.stringify({ error: "not found" }) };
  }

  const buffer = Buffer.isBuffer(stored) ? stored : stored.buffer;
  const contentType = (stored && stored.contentType) || manifest.contentType || "application/octet-stream";

  return {
    statusCode: 200,
    headers: Object.assign(jsonHeaders(), {
      "Content-Type": contentType,
      "Content-Disposition": `${isInline(contentType) ? "inline" : "attachment"}; filename="${file.replace(/"/g, "")}"`,
      // no-store: unpublishing/deleting must cut access immediately.
      "Cache-Control": "no-store"
    }),
    body: buffer.toString("base64"),
    isBase64Encoded: true
  };
};
