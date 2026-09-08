const { ensureSettings } = require("./lib/store");
const { json, categoryName, difficultyInfo } = require("./lib/http");

function toPublic(c, settings) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    category: categoryName(settings, c.category),
    difficulty: difficultyInfo(settings, c.difficulty),
    order: typeof c.order === "number" ? c.order : 0,
    hasWriteup: Boolean(c.writeup) && settings.writeupsEnabled !== false,
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

  const { settings, challenges } = await ensureSettings();

  if (settings.pageEnabled === false) {
    return json(503, { error: "disabled" }, { "Cache-Control": "no-store" });
  }

  // Published, non-deleted only. Salts, hashes, writeups never leave the server.
  // no-store: admin edits must be visible immediately, no stale caches.
  const list = challenges
    .filter((c) => !c.deleted && c.status === "published")
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((c) => toPublic(c, settings));

  return json(
    200,
    {
      page: {
        title: settings.pageTitle,
        intro: settings.introText,
        about: settings.aboutText,
        maxInputLength: settings.maxInputLength
      },
      challenges: list
    },
    { "Cache-Control": "no-store" }
  );
};
