// Public, unauthenticated file serving for challenge attachments.
// Only files belonging to published, non-deleted challenges are served.
const { loadChallenges, getAttachment } = require("./lib/store");
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

  const list = await loadChallenges();
  const challenge = list.find((x) => x.id === id);
  if (!challenge || challenge.deleted || challenge.status !== "published") {
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
      "Cache-Control": "public, max-age=3600"
    }),
    body: buffer.toString("base64"),
    isBase64Encoded: true
  };
};
