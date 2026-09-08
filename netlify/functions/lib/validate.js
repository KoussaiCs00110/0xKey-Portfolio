// =================================================
// Server-side validation for admin CTF challenge fields.
// Never trust frontend validation alone.
// =================================================

const TITLE_MIN = 3;
const TITLE_MAX = 120;
const DESC_MAX = 5000;
const WRITEUP_MAX = 10000;
const FLAG_MIN = 1;
const FLAG_HARD_MAX = 1000; // absolute ceiling; admin setting is clamped to this
const INPUT_MIN = 10;
const INPUT_MAX = 1000;
const ORDER_MIN = -1000000;
const ORDER_MAX = 1000000;

const STATUSES = new Set(["draft", "published"]);
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const SLUG_RE = /^[a-z0-9-]{1,40}$/;

const ALLOWED_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg",
  "txt", "md", "pdf",
  "zip", "pcap", "pcapng", "cap",
  "py", "c", "h", "js", "html", "sh", "java", "rs", "go"
]);
const MAX_FILES_PER_CHALLENGE = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

function isNonEmptyString(v) {
  return typeof v === "string" && v.length > 0;
}

function checkTitle(v, errors) {
  if (typeof v !== "string" || v.trim().length < TITLE_MIN || v.trim().length > TITLE_MAX) {
    errors.push(`title must be ${TITLE_MIN}-${TITLE_MAX} characters`);
    return null;
  }
  return v.trim();
}

function checkDescription(v, errors) {
  if (typeof v !== "string" || v.trim().length === 0 || v.length > DESC_MAX) {
    errors.push(`description is required (max ${DESC_MAX} chars)`);
    return null;
  }
  return v.trim();
}

function checkCategory(v, errors, settings) {
  const id = typeof v === "string" ? v.trim() : "";
  const known = settings && Array.isArray(settings.categories)
    ? settings.categories.map((c) => c.id)
    : null;
  if (!id) {
    errors.push("category is required");
    return null;
  }
  if (known && !known.includes(id)) {
    errors.push(`unknown category: ${id}`);
    return null;
  }
  return id;
}

function checkDifficulty(v, errors, settings) {
  const d = typeof v === "string" ? v.trim() : "";
  const known = settings && Array.isArray(settings.difficulties)
    ? settings.difficulties.map((x) => x.id)
    : ["easy", "medium", "hard"];
  if (!known.includes(d)) {
    errors.push(`difficulty must be one of: ${known.join(", ")}`);
    return null;
  }
  return d;
}

function checkStatus(v, errors) {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (!STATUSES.has(s)) {
    errors.push("status must be one of: draft, published");
    return null;
  }
  return s;
}

function checkOrder(v, errors) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < ORDER_MIN || n > ORDER_MAX) {
    errors.push("order must be a finite number");
    return null;
  }
  return Math.trunc(n);
}

function checkWriteup(v, errors) {
  if (v === undefined || v === null || v === "") return "";
  if (typeof v !== "string" || v.length > WRITEUP_MAX) {
    errors.push(`writeup must be at most ${WRITEUP_MAX} chars`);
    return null;
  }
  return v;
}

function maxFlagLength(settings) {
  const n = settings && Number(settings.maxInputLength);
  if (!Number.isFinite(n)) return 200;
  return Math.min(FLAG_HARD_MAX, Math.max(INPUT_MIN, Math.trunc(n)));
}

function checkFlag(v, errors, { required, maxLength }) {
  if (v === undefined || v === null || v === "") {
    if (required) errors.push("flag is required");
    return required ? null : undefined; // undefined = "leave unchanged" on edit
  }
  if (typeof v !== "string") {
    errors.push("flag must be a string");
    return null;
  }
  const max = maxLength || 200;
  const t = v.trim();
  if (t.length < FLAG_MIN || t.length > max) {
    errors.push(`flag must be ${FLAG_MIN}-${max} characters`);
    return null;
  }
  return t;
}

function validateChallengeInput(body, { isCreate, settings }) {
  const errors = [];
  const b = body && typeof body === "object" ? body : {};
  const clean = {};
  clean.title = checkTitle(b.title, errors);
  clean.description = checkDescription(b.description, errors);
  clean.category = checkCategory(b.category, errors, settings);
  clean.difficulty = checkDifficulty(b.difficulty, errors, settings);
  clean.status = checkStatus(b.status, errors);
  clean.order = b.order === undefined && !isCreate ? undefined : checkOrder(b.order === undefined ? 0 : b.order, errors);
  clean.writeup = checkWriteup(b.writeup, errors);
  const flag = checkFlag(b.flag, errors, { required: isCreate, maxLength: maxFlagLength(settings) });
  if (flag !== undefined) clean.flag = flag;
  if (b.deleted !== undefined) {
    if (typeof b.deleted !== "boolean") errors.push("deleted must be a boolean");
    else clean.deleted = b.deleted;
  }
  return { ok: errors.length === 0, errors, clean };
}

// ---------- site settings ----------

function checkSettingsText(v, errors, field, min, max) {
  if (typeof v !== "string" || v.length < min || v.length > max) {
    errors.push(`${field} must be ${min}-${max} characters`);
    return null;
  }
  return v;
}

function checkCategories(list, errors) {
  if (!Array.isArray(list) || list.length === 0 || list.length > 50) {
    errors.push("categories must be a non-empty array (max 50)");
    return null;
  }
  const ids = new Set();
  const names = new Set();
  const clean = [];
  for (const c of list) {
    if (!c || typeof c !== "object") {
      errors.push("invalid category entry");
      return null;
    }
    const id = typeof c.id === "string" ? c.id.trim().toLowerCase() : "";
    const name = typeof c.name === "string" ? c.name.trim() : "";
    if (!SLUG_RE.test(id)) {
      errors.push(`invalid category id: ${c.id}`);
      return null;
    }
    if (name.length < 1 || name.length > 40) {
      errors.push(`invalid category name: ${c.name}`);
      return null;
    }
    if (ids.has(id)) {
      errors.push(`duplicate category id: ${id}`);
      return null;
    }
    if (names.has(name.toLowerCase())) {
      errors.push(`duplicate category name: ${name}`);
      return null;
    }
    ids.add(id);
    names.add(name.toLowerCase());
    clean.push({ id, name });
  }
  return clean;
}

function checkDifficulties(list, errors) {
  if (!Array.isArray(list) || list.length === 0 || list.length > 10) {
    errors.push("difficulties must be a non-empty array (max 10)");
    return null;
  }
  const ids = new Set();
  const labels = new Set();
  const clean = [];
  for (const d of list) {
    if (!d || typeof d !== "object") {
      errors.push("invalid difficulty entry");
      return null;
    }
    const id = typeof d.id === "string" ? d.id.trim().toLowerCase() : "";
    const label = typeof d.label === "string" ? d.label.trim() : "";
    const color = typeof d.color === "string" ? d.color.trim() : "";
    const order = typeof d.order === "number" ? d.order : Number(d.order);
    if (!SLUG_RE.test(id)) {
      errors.push(`invalid difficulty id: ${d.id}`);
      return null;
    }
    if (label.length < 1 || label.length > 20) {
      errors.push(`invalid difficulty label: ${d.label}`);
      return null;
    }
    if (!COLOR_RE.test(color)) {
      errors.push(`invalid difficulty color (use #rrggbb): ${d.label}`);
      return null;
    }
    if (!Number.isFinite(order)) {
      errors.push(`invalid difficulty order: ${d.label}`);
      return null;
    }
    if (ids.has(id)) {
      errors.push(`duplicate difficulty id: ${id}`);
      return null;
    }
    if (labels.has(label.toLowerCase())) {
      errors.push(`duplicate difficulty label: ${label}`);
      return null;
    }
    ids.add(id);
    labels.add(label.toLowerCase());
    clean.push({ id, label, color: color.toLowerCase(), order: Math.trunc(order) });
  }
  clean.sort((a, b) => a.order - b.order);
  return clean;
}

function checkRateLimit(v, errors) {
  if (!v || typeof v !== "object") {
    errors.push("rateLimit must be an object");
    return null;
  }
  const maxAttempts = Math.trunc(Number(v.maxAttempts));
  const windowSeconds = Math.trunc(Number(v.windowSeconds));
  if (!Number.isFinite(maxAttempts) || maxAttempts < 1 || maxAttempts > 1000) {
    errors.push("rateLimit.maxAttempts must be 1-1000");
    return null;
  }
  if (!Number.isFinite(windowSeconds) || windowSeconds < 10 || windowSeconds > 3600) {
    errors.push("rateLimit.windowSeconds must be 10-3600");
    return null;
  }
  return { maxAttempts, windowSeconds };
}

function checkInputLength(v, errors) {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n) || n < INPUT_MIN || n > INPUT_MAX) {
    errors.push(`maxInputLength must be ${INPUT_MIN}-${INPUT_MAX}`);
    return null;
  }
  return n;
}

function checkBool(v, errors, field) {
  if (typeof v !== "boolean") {
    errors.push(`${field} must be a boolean`);
    return null;
  }
  return v;
}

function validateSettingsInput(body) {
  const errors = [];
  const b = body && typeof body === "object" ? body : {};
  const clean = {};
  clean.pageTitle = checkSettingsText(b.pageTitle, errors, "pageTitle", 1, 120);
  clean.introText = checkSettingsText(b.introText ?? "", errors, "introText", 0, 2000);
  clean.aboutText = checkSettingsText(b.aboutText ?? "", errors, "aboutText", 0, 5000);
  clean.pageEnabled = checkBool(b.pageEnabled, errors, "pageEnabled");
  clean.categories = checkCategories(b.categories, errors);
  clean.difficulties = checkDifficulties(b.difficulties, errors);
  clean.rateLimit = checkRateLimit(b.rateLimit, errors);
  clean.maxInputLength = checkInputLength(b.maxInputLength, errors);
  clean.writeupsEnabled = checkBool(b.writeupsEnabled, errors, "writeupsEnabled");
  clean.attachmentsRequirePublished = checkBool(
    b.attachmentsRequirePublished, errors, "attachmentsRequirePublished"
  );
  return { ok: errors.length === 0, errors, clean };
}

function checkFileName(name, errors) {
  if (typeof name !== "string" || name.length === 0 || name.length > 120) {
    errors.push("file name must be 1-120 characters");
    return null;
  }
  if (name.includes("/") || name.includes("\\") || name.includes("..")) {
    errors.push(`invalid file name: ${name}`);
    return null;
  }
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    errors.push(`file type not allowed: ${name}`);
    return null;
  }
  return name;
}

function guessContentType(name) {
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  const map = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    txt: "text/plain; charset=utf-8", md: "text/markdown; charset=utf-8",
    pdf: "application/pdf", zip: "application/zip",
    pcap: "application/octet-stream", pcapng: "application/octet-stream", cap: "application/octet-stream",
    py: "text/plain; charset=utf-8", c: "text/plain; charset=utf-8",
    h: "text/plain; charset=utf-8", js: "text/plain; charset=utf-8",
    html: "text/html; charset=utf-8", sh: "text/plain; charset=utf-8",
    java: "text/plain; charset=utf-8", rs: "text/plain; charset=utf-8", go: "text/plain; charset=utf-8"
  };
  return map[ext] || "application/octet-stream";
}

module.exports = {
  validateChallengeInput,
  validateSettingsInput,
  maxFlagLength,
  checkFileName,
  guessContentType,
  MAX_FILES_PER_CHALLENGE,
  MAX_FILE_BYTES
};
