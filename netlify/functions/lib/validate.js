// =================================================
// Server-side validation for admin CTF challenge fields.
// Never trust frontend validation alone.
// =================================================

const TITLE_MIN = 3;
const TITLE_MAX = 120;
const DESC_MAX = 5000;
const CATEGORY_MIN = 1;
const CATEGORY_MAX = 40;
const WRITEUP_MAX = 10000;
const FLAG_MIN = 1;
const FLAG_MAX = 200;
const ORDER_MIN = -1000000;
const ORDER_MAX = 1000000;

const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const STATUSES = new Set(["draft", "published"]);

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

function checkCategory(v, errors) {
  if (typeof v !== "string" || v.trim().length < CATEGORY_MIN || v.trim().length > CATEGORY_MAX) {
    errors.push(`category must be ${CATEGORY_MIN}-${CATEGORY_MAX} characters`);
    return null;
  }
  return v.trim();
}

function checkDifficulty(v, errors) {
  const d = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (!DIFFICULTIES.has(d)) {
    errors.push("difficulty must be one of: easy, medium, hard");
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

function checkFlag(v, errors, { required }) {
  if (v === undefined || v === null || v === "") {
    if (required) errors.push("flag is required");
    return required ? null : undefined; // undefined = "leave unchanged" on edit
  }
  if (typeof v !== "string") {
    errors.push("flag must be a string");
    return null;
  }
  const t = v.trim();
  if (t.length < FLAG_MIN || t.length > FLAG_MAX) {
    errors.push(`flag must be ${FLAG_MIN}-${FLAG_MAX} characters`);
    return null;
  }
  return t;
}

function validateChallengeInput(body, { isCreate }) {
  const errors = [];
  const b = body && typeof body === "object" ? body : {};
  const clean = {};
  clean.title = checkTitle(b.title, errors);
  clean.description = checkDescription(b.description, errors);
  clean.category = checkCategory(b.category, errors);
  clean.difficulty = checkDifficulty(b.difficulty, errors);
  clean.status = checkStatus(b.status, errors);
  clean.order = b.order === undefined && !isCreate ? undefined : checkOrder(b.order === undefined ? 0 : b.order, errors);
  clean.writeup = checkWriteup(b.writeup, errors);
  const flag = checkFlag(b.flag, errors, { required: isCreate });
  if (flag !== undefined) clean.flag = flag;
  if (b.deleted !== undefined) {
    if (typeof b.deleted !== "boolean") errors.push("deleted must be a boolean");
    else clean.deleted = b.deleted;
  }
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
  checkFileName,
  guessContentType,
  MAX_FILES_PER_CHALLENGE,
  MAX_FILE_BYTES
};
