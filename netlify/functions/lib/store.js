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
  putAttachment,
  getAttachment,
  deleteAttachment
};
