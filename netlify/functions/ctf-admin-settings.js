// Admin CTF API — site settings (page content, categories, difficulties,
// behavior toggles). Same admin auth, no separate system.
//   GET /api/admin/ctf/settings → full settings doc
//   PUT /api/admin/ctf/settings → replace (validated; refuses to remove a
//     category/difficulty that a live challenge still references).
const { requireAdmin } = require("./lib/auth");
const { ensureSettings, saveSettings } = require("./lib/store");
const { json, auditLog } = require("./lib/http");
const { validateSettingsInput } = require("./lib/validate");

exports.handler = async (event) => {
  const admin = requireAdmin(event);
  if (!admin) return json(401, { error: "unauthorized" });

  if (event.httpMethod === "GET") {
    const { settings } = await ensureSettings();
    return json(200, settings);
  }

  if (event.httpMethod === "PUT") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (_) {
      return json(400, { error: "invalid JSON" });
    }

    const { ok, errors, clean } = validateSettingsInput(body);
    if (!ok) return json(400, { errors });

    const { challenges } = await ensureSettings();
    const live = challenges.filter((c) => !c.deleted);
    const usedCats = new Set(live.map((c) => c.category));
    const usedDiffs = new Set(live.map((c) => c.difficulty));
    const newCatIds = new Set(clean.categories.map((c) => c.id));
    const newDiffIds = new Set(clean.difficulties.map((d) => d.id));
    for (const id of usedCats) {
      if (!newCatIds.has(id)) {
        const n = live.filter((c) => c.category === id).length;
        return json(400, {
          errors: [`category "${id}" is used by ${n} challenge(s) — reassign them first`]
        });
      }
    }
    for (const id of usedDiffs) {
      if (!newDiffIds.has(id)) {
        const n = live.filter((c) => c.difficulty === id).length;
        return json(400, {
          errors: [`difficulty "${id}" is used by ${n} challenge(s) — reassign them first`]
        });
      }
    }

    const settings = Object.assign({}, clean, { updatedAt: new Date().toISOString() });
    await saveSettings(settings);
    auditLog({ actor: admin, action: "ctf.settings.update" });
    return json(200, settings);
  }

  return json(405, { error: "method not allowed" });
};
