// =================================================
// CTF challenge store.
// Primary backend: Netlify Blobs (zero-config on Netlify).
// Fallback: local JSON file (CTF_STORE_PATH dir, else os tmp)
// used for local dev / tests when Blobs are unavailable.
// =================================================

const fs = require("fs");
const path = require("path");
const os = require("os");
const { SEED_CHALLENGES } = require("./seed");

const STORE_NAME = "ctf";
const DOC_KEY = "challenges.json";
const SETTINGS_KEY = "ctf-settings.json";

const DEFAULT_DIFFICULTIES = [
  { id: "easy", label: "Easy", color: "#10b981", order: 0 },
  { id: "medium", label: "Medium", color: "#f59e0b", order: 1 },
  { id: "hard", label: "Hard", color: "#e11d48", order: 2 }
];

const DEFAULT_INTRO =
  "A hands-on space where I practice and share CTF-style security challenges — " +
  "the same skills behind my work in reverse engineering, digital forensics, " +
  "and web exploitation. Pick a challenge, find the flag, submit it below.";

function defaultSettings() {
  return {
    pageTitle: "CTF Challenges",
    introText: DEFAULT_INTRO,
    aboutText: "",
    pageEnabled: true,
    categories: [],
    difficulties: JSON.parse(JSON.stringify(DEFAULT_DIFFICULTIES)),
    rateLimit: { maxAttempts: 10, windowSeconds: 60 },
    maxInputLength: 200,
    writeupsEnabled: true,
    attachmentsRequirePublished: true,
    updatedAt: null
  };
}

function slugify(name) {
  const s = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "misc";
}

function filePaths() {
  const dir = process.env.CTF_STORE_PATH || path.join(os.tmpdir(), "ctf-store");
  return { dir, doc: path.join(dir, DOC_KEY), files: path.join(dir, "files") };
}

function getBlobStore() {
  try {
    const { getStore } = require("@netlify/blobs");
    return getStore(STORE_NAME);
  } catch (_) {
    return null;
  }
}

async function blobAvailable(store) {
  if (!store) return false;
  try {
    await store.get(DOC_KEY, { type: "text" });
    return true;
  } catch (_) {
    return false;
  }
}

function cloneSeed() {
  return JSON.parse(JSON.stringify(SEED_CHALLENGES));
}

// ---------- file fallback ----------

function ensureFileDir() {
  const { dir, files } = filePaths();
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(files, { recursive: true });
}

function fileLoad() {
  ensureFileDir();
  const { doc } = filePaths();
  if (!fs.existsSync(doc)) {
    const seed = cloneSeed();
    fs.writeFileSync(doc, JSON.stringify(seed, null, 2));
    return seed;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(doc, "utf8"));
    if (!Array.isArray(parsed)) throw new Error("bad shape");
    return parsed;
  } catch (_) {
    const seed = cloneSeed();
    fs.writeFileSync(doc, JSON.stringify(seed, null, 2));
    return seed;
  }
}

function fileSave(list) {
  ensureFileDir();
  fs.writeFileSync(filePaths().doc, JSON.stringify(list, null, 2));
}

function fileSettingsPath() {
  return path.join(filePaths().dir, SETTINGS_KEY);
}

function fileLoadSettings() {
  ensureFileDir();
  const p = fileSettingsPath();
  if (!fs.existsSync(p)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function fileSaveSettings(settings) {
  ensureFileDir();
  fs.writeFileSync(fileSettingsPath(), JSON.stringify(settings, null, 2));
}

function safeFileName(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function filePut(challengeId, name, buffer) {
  ensureFileDir();
  const dest = path.join(filePaths().files, `${challengeId}__${safeFileName(name)}`);
  fs.writeFileSync(dest, buffer);
}

function fileGet(challengeId, name) {
  const dest = path.join(filePaths().files, `${challengeId}__${safeFileName(name)}`);
  if (!fs.existsSync(dest)) return null;
  return fs.readFileSync(dest);
}

function fileDelete(challengeId, name) {
  const dest = path.join(filePaths().files, `${challengeId}__${safeFileName(name)}`);
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
}

// ---------- public API ----------

function blobFileKey(challengeId, name) {
  return `files/${challengeId}/${safeFileName(name)}`;
}

async function loadChallenges() {
  const store = getBlobStore();
  if (await blobAvailable(store)) {
    const existing = await store.get(DOC_KEY, { type: "json" });
    if (Array.isArray(existing)) return existing;
    const seed = cloneSeed();
    await store.setJSON(DOC_KEY, seed);
    return seed;
  }
  return fileLoad();
}

async function saveChallenges(list) {
  const store = getBlobStore();
  if (await blobAvailable(store)) {
    await store.setJSON(DOC_KEY, list);
    return;
  }
  fileSave(list);
}

async function loadSettingsRaw() {
  const store = getBlobStore();
  if (await blobAvailable(store)) {
    const existing = await store.get(SETTINGS_KEY, { type: "json" });
    if (existing && typeof existing === "object" && !Array.isArray(existing)) return existing;
    return null;
  }
  return fileLoadSettings();
}

async function saveSettings(settings) {
  const store = getBlobStore();
  if (await blobAvailable(store)) {
    await store.setJSON(SETTINGS_KEY, settings);
    return;
  }
  fileSaveSettings(settings);
}

// One-time (and repair) migration: challenge.category values that are
// display names become stable category ids. Rename-safe by construction:
// renaming a category later only touches the settings doc.
function migrateCategories(challenges, settings) {
  if (!Array.isArray(settings.categories)) settings.categories = [];
  const byId = new Map(settings.categories.map((c) => [c.id, c]));
  const byName = new Map(
    settings.categories.map((c) => [String(c.name).toLowerCase(), c])
  );
  const usedIds = new Set(settings.categories.map((c) => c.id));
  const uniqueId = (base) => {
    let id = base;
    let n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    return id;
  };
  let changed = false;
  for (const ch of challenges) {
    const raw = typeof ch.category === "string" ? ch.category.trim() : "";
    if (raw && byId.has(raw)) {
      continue; // already an id
    }
    const hit = raw ? byName.get(raw.toLowerCase()) : null;
    if (hit) {
      ch.category = hit.id;
      changed = true;
      continue;
    }
    const entry = { id: uniqueId(slugify(raw || "misc")), name: raw || "Misc" };
    settings.categories.push(entry);
    byId.set(entry.id, entry);
    byName.set(entry.name.toLowerCase(), entry);
    ch.category = entry.id;
    changed = true;
  }
  if (!settings.categories.some((c) => c.id === "misc")) {
    settings.categories.push({ id: "misc", name: "Misc" });
  }
  settings.categories.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return changed;
}

// Loads settings, creating + persisting defaults (derived from existing
// challenges) when absent. Also repairs category references.
async function ensureSettings() {
  const challenges = await loadChallenges();
  let settings = await loadSettingsRaw();
  let settingsDirty = false;
  if (!settings) {
    settings = defaultSettings();
    settingsDirty = true;
  }
  if (!Array.isArray(settings.difficulties) || settings.difficulties.length === 0) {
    settings.difficulties = JSON.parse(JSON.stringify(DEFAULT_DIFFICULTIES));
    settingsDirty = true;
  }
  const challengesDirty = migrateCategories(challenges, settings);
  if (challengesDirty) await saveChallenges(challenges);
  if (settingsDirty || challengesDirty) {
    if (!settings.updatedAt) settings.updatedAt = new Date().toISOString();
    await saveSettings(settings);
  }
  return { settings, challenges };
}

async function loadSettings() {
  return (await ensureSettings()).settings;
}

async function putAttachment(challengeId, name, buffer, contentType) {
  const store = getBlobStore();
  if (await blobAvailable(store)) {
    await store.set(blobFileKey(challengeId, name), buffer, {
      metadata: { contentType: contentType || "application/octet-stream" }
    });
    return;
  }
  filePut(challengeId, name, buffer);
}

async function getAttachment(challengeId, name) {
  const store = getBlobStore();
  if (await blobAvailable(store)) {
    const blob = await store.get(blobFileKey(challengeId, name), { type: "blob" });
    if (!blob) return null;
    const { metadata } = await store.getWithMetadata(blobFileKey(challengeId, name), {
      type: "blob"
    });
    const buffer = Buffer.from(await blob.arrayBuffer());
    return { buffer, contentType: (metadata && metadata.contentType) || "application/octet-stream" };
  }
  return fileGet(challengeId, name);
}

async function deleteAttachment(challengeId, name) {
  const store = getBlobStore();
  if (await blobAvailable(store)) {
    await store.delete(blobFileKey(challengeId, name));
    return;
  }
  fileDelete(challengeId, name);
}

module.exports = {
  loadChallenges,
  saveChallenges,
  loadSettings,
  ensureSettings,
  saveSettings,
  defaultSettings,
  slugify,
  putAttachment,
  getAttachment,
  deleteAttachment
};
