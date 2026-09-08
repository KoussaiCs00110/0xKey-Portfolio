// =================================================
// 0xKey Portfolio — ctf.js
// Static frontend: no flag logic here. Every answer
// is verified server-side via POST /api/ctf/check
// Response is only { correct: boolean }.
// =================================================

const COOLDOWN_MS = 2000;
const ID_PATTERN = /^[a-z0-9-]{1,100}$/i;

/* ─── CHALLENGE LIST + PAGE CONFIG ─────────────── */
async function loadChallenges() {
  const grid = document.getElementById("ctf-grid");
  const empty = document.getElementById("ctf-empty");
  try {
    const res = await fetch("/api/ctf/challenges");
    if (res.status === 503) {
      showDisabled();
      return;
    }
    if (!res.ok) throw new Error("bad status: " + res.status);
    const data = await res.json();
    const page = (data && data.page) || {};
    const challenges = data && Array.isArray(data.challenges) ? data.challenges : [];
    applyPageConfig(page);
    if (challenges.length === 0) throw new Error("empty list");
    if (empty) empty.hidden = true;
    renderChallenges(challenges.filter(isValidChallenge), page);
  } catch (err) {
    if (grid) grid.innerHTML = "";
    if (empty) {
      empty.hidden = false;
      const p = empty.querySelector("p");
      if (p) p.textContent = "Could not load challenges. Check your connection and refresh the page.";
    }
  }
}

function showDisabled() {
  const grid = document.getElementById("ctf-grid");
  const empty = document.getElementById("ctf-empty");
  if (grid) grid.innerHTML = "";
  if (empty) {
    empty.hidden = false;
    empty.innerHTML = '<span class="ctf-empty-icon">🚧</span><p>Challenges are currently unavailable. Check back soon.</p>';
  }
  const about = document.getElementById("ctf-about-section");
  if (about) about.hidden = true;
}

function applyPageConfig(page) {
  if (typeof document.title === "string" && page.title) {
    document.title = `${page.title} | 0xKey`;
  }
  const titleEl = document.getElementById("ctf-page-title");
  if (titleEl && typeof page.title === "string" && page.title) {
    titleEl.textContent = "";
    const num = document.createElement("span");
    num.className = "title-num";
    num.textContent = "~/";
    titleEl.appendChild(num);
    titleEl.appendChild(document.createTextNode(page.title));
  }
  const introEl = document.getElementById("ctf-page-intro");
  if (introEl && typeof page.intro === "string" && page.intro) {
    introEl.textContent = page.intro;
  }
  const aboutSection = document.getElementById("ctf-about-section");
  const aboutText = document.getElementById("ctf-about-text");
  if (aboutSection && aboutText) {
    if (typeof page.about === "string" && page.about.trim()) {
      aboutText.textContent = "";
      const rendered = renderMarkdown(page.about);
      const tmp = document.createElement("div");
      tmp.innerHTML = rendered;
      while (tmp.firstChild) aboutText.appendChild(tmp.firstChild);
      aboutSection.hidden = false;
    } else {
      aboutSection.hidden = true;
    }
  }
  const maxLen = Number(page.maxInputLength);
  if (Number.isFinite(maxLen)) {
    window.__ctfMaxInput = Math.min(1000, Math.max(10, Math.trunc(maxLen)));
  }
}

function isValidChallenge(c) {
  return (
    c &&
    typeof c.id === "string" &&
    ID_PATTERN.test(c.id) &&
    typeof c.title === "string" &&
    typeof c.description === "string"
  );
}

function diffPill(d) {
  const info = d && typeof d === "object" ? d : { id: "misc", label: String(d || "misc"), color: "#94a3b8" };
  const color = /^#[0-9a-fA-F]{6}$/.test(info.color || "") ? info.color : "#94a3b8";
  return `<span class="ctf-badge ctf-badge-diff" style="color:${escAttr(color)};border-color:${escAttr(color)}55;background:${escAttr(color)}14">${esc(info.label || info.id)}</span>`;
}

function renderChallenges(challenges) {
  const grid = document.getElementById("ctf-grid");
  if (!grid) return;
  const maxInput = window.__ctfMaxInput || 200;

  grid.innerHTML = challenges.map((c) => {
    const solvedBadge = `<span class="ctf-badge ctf-badge-solved" id="solved-${escAttr(c.id)}" hidden>Solved</span>`;
    const files = Array.isArray(c.attachments) ? c.attachments.filter(isValidAttachment) : [];
    const filesHtml = files.length === 0 ? "" : `
      <div class="ctf-attachments">${files.map((a) => `
        <a class="ctf-file-link" href="${escAttr(a.url)}" target="_blank" rel="noopener">
          <span aria-hidden="true">📎</span> ${esc(a.name)}
          <span class="ctf-file-size">${esc(fmtSize(a.size))}</span>
        </a>`).join("")}
      </div>`;
    return `
    <div class="ctf-card reveal visible" data-id="${escAttr(c.id)}">
      <div class="ctf-card-header">
        <span class="ctf-card-title">${esc(c.title)}</span>
        <div class="ctf-card-meta">
          ${solvedBadge}
          <span class="ctf-badge ctf-badge-category">${esc(c.category || "misc")}</span>
          ${diffPill(c.difficulty)}
        </div>
      </div>
      <p class="ctf-card-desc">${renderMarkdown(c.description)}</p>
      ${filesHtml}
      <form class="ctf-form" data-challenge-id="${escAttr(c.id)}">
        <input type="text" class="ctf-input" name="flag" placeholder="flag{...}"
          autocomplete="off" spellcheck="false" maxlength="${maxInput}" aria-label="Flag for ${escAttr(c.title)}">
        <button type="submit" class="btn btn-primary">Submit</button>
      </form>
      <div class="ctf-result" id="result-${escAttr(c.id)}" aria-live="polite"></div>
      <div class="ctf-writeup" id="writeup-${escAttr(c.id)}"></div>
    </div>`;
  }).join("");

  grid.querySelectorAll(".ctf-form").forEach((form) => {
    form.addEventListener("submit", handleSubmit);
  });
}

/* ─── FLAG SUBMISSION ──────────────────────────── */
async function handleSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const challengeId = form.dataset.challengeId;
  if (!challengeId || !ID_PATTERN.test(challengeId)) return;

  const input = form.querySelector(".ctf-input");
  const btn = form.querySelector("button[type=submit]");
  const resultEl = document.getElementById("result-" + challengeId);
  if (!input || !btn || !resultEl) return;

  const answer = input.value;
  if (!answer.trim()) {
    input.focus();
    return;
  }

  input.disabled = true;
  btn.disabled = true;
  resultEl.textContent = "Checking…";
  resultEl.className = "ctf-result";

  try {
    const res = await fetch("/api/ctf/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, answer })
    });
    const data = await res.json();

    if (res.status === 429) {
      resultEl.textContent = "Too many attempts. Wait a bit and try again.";
      resultEl.className = "ctf-result ctf-result-rate";
    } else if (res.status === 503) {
      resultEl.textContent = "Challenges are currently unavailable. Check back soon.";
      resultEl.className = "ctf-result ctf-result-rate";
    } else if (data && data.correct === true) {
      resultEl.textContent = "Correct! Nicely done.";
      resultEl.className = "ctf-result ctf-result-correct";
      markSolved(challengeId);
      fetchWriteup(challengeId, answer);
    } else {
      resultEl.textContent = "Not quite, try again.";
      resultEl.className = "ctf-result ctf-result-wrong";
    }
  } catch (err) {
    resultEl.textContent = "Network error. Check your connection and try again.";
    resultEl.className = "ctf-result ctf-result-wrong";
  }

  // Client-side UX cooldown only — real protection is the server rate limit.
  window.setTimeout(() => {
    input.disabled = false;
    btn.disabled = false;
  }, COOLDOWN_MS);
}

function markSolved(challengeId) {
  const card = document.querySelector(`.ctf-card[data-id="${challengeId}"]`);
  if (card) card.classList.add("solved");
  const badge = document.getElementById("solved-" + challengeId);
  if (badge) badge.hidden = false;
}

/* ─── WRITEUP (fetched only after a correct flag) ─ */
async function fetchWriteup(challengeId, answer) {
  try {
    const res = await fetch("/api/ctf/writeup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, answer })
    });
    if (!res.ok) return;
    const data = await res.json();
    if (!data || typeof data.writeup !== "string" || !data.writeup) return;
    const writeupEl = document.getElementById("writeup-" + challengeId);
    if (!writeupEl) return;
    writeupEl.innerHTML = "";
    const label = document.createElement("strong");
    label.textContent = "How it works";
    const body = document.createElement("span");
    body.textContent = data.writeup;
    writeupEl.appendChild(label);
    writeupEl.appendChild(body);
    writeupEl.classList.add("visible");
  } catch (err) {
    // Writeup is a bonus — a failure here must not disturb the success state.
  }
}

/* ─── ESCAPING + MARKDOWN ──────────────────────── */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escAttr(s) {
  return esc(s);
}

// Descriptions support a small markdown subset. Input is HTML-escaped
// first, so rendered tags can only come from the rules below.
function renderMarkdown(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  let html = div.innerHTML;
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, '<code class="ctf-md-code">$1</code>');
  html = html.replace(
    /\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener" class="ctf-md-link">$1</a>'
  );
  html = html.replace(/\n/g, "<br>");
  return html;
}

function isValidAttachment(a) {
  return (
    a &&
    typeof a.name === "string" &&
    a.name.length > 0 &&
    typeof a.url === "string" &&
    a.url.indexOf("/api/ctf/attachment?") === 0
  );
}

function fmtSize(n) {
  n = Number(n) || 0;
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(2) + " MB";
}

/* ─── SHARED SITE CHROME (same behavior as index/articles) ── */
function initNavbar() {
  const ham = document.getElementById("hamburger");
  const links = document.getElementById("nav-links");
  const nav = document.getElementById("navbar");
  if (ham && links) {
    ham.addEventListener("click", () => {
      ham.classList.toggle("open");
      links.classList.toggle("open");
    });
    links.querySelectorAll(".nav-link").forEach((l) =>
      l.addEventListener("click", () => {
        ham.classList.remove("open");
        links.classList.remove("open");
      })
    );
  }
  if (nav) {
    window.addEventListener(
      "scroll",
      () => nav.classList.toggle("scrolled", window.scrollY > 40),
      { passive: true }
    );
  }
}

function initTheme() {
  const btn = document.getElementById("theme-toggle");
  try {
    if (localStorage.getItem("oxkey_theme") === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    }
  } catch (_) {}
  if (!btn) return;
  btn.addEventListener("click", () => {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    try {
      if (isLight) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("oxkey_theme", "dark");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("oxkey_theme", "light");
      }
    } catch (_) {}
  });
}

function initParticles() {
  const canvas = document.getElementById("particles-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H;
  const particles = [];
  const resize = () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  };
  window.addEventListener("resize", resize, { passive: true });
  resize();
  const COUNT = Math.min(Math.floor(W / 12), 90);
  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.6
    });
  }
  (function loop() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(16,185,129,0.5)";
      ctx.fill();
    }
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(16,185,129,${0.12 * (1 - dist / 130)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  })();
}

function initSpotlight() {
  const el = document.getElementById("spotlight");
  if (!el) return;
  window.addEventListener(
    "mousemove",
    (e) => {
      el.style.setProperty("--mx", e.clientX + "px");
      el.style.setProperty("--my", e.clientY + "px");
    },
    { passive: true }
  );
}

function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("visible"));
    return;
  }
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          window.setTimeout(() => entry.target.classList.add("visible"), i * 80);
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  els.forEach((el) => obs.observe(el));
}

/* ─── INIT ─────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  initParticles();
  initSpotlight();
  initNavbar();
  initTheme();
  initReveal();
  loadChallenges();
});
