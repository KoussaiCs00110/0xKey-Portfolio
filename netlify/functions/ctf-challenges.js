const { loadChallenges } = require("./lib/store");
const { json } = require("./lib/http");

function toPublic(c) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    difficulty: c.difficulty,
    order: typeof c.order === "number" ? c.order : 0,
    hasWriteup: Boolean(c.writeup),
    attachments: (c.attachments || []).map((a) => ({
      name: a.name,
      contentType: a.contentType,
      size: a.size,
      url: `/api/ctf/attachment?id=${encodeURIComponent(c.id)}&file=${encodeURIComponent(a.name)}`
    }))
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "method not allowed" });
  }

  // Published, non-deleted only. Salts, hashes, writeups never leave the server.
  const list = (await loadChallenges())
    .filter((c) => !c.deleted && c.status === "published")
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(toPublic);

  return json(200, list, { "Cache-Control": "public, max-age=300" });
};
