// =================================================
// 0xKey Portfolio — articles.js
// Renders articles/writeups from portfolio-data.json
// =================================================

const STORAGE_KEY = 'oxkey_portfolio_data';

/* ─── LOAD DATA ──────────────────────────────── */
async function loadData() {
  // Check localStorage first (admin edits)
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { try { return JSON.parse(raw); } catch (_) {} }
  // Fallback to JSON file
  try {
    const res = await fetch('./portfolio-data.json');
    if (res.ok) return await res.json();
  } catch (_) {}
  return null;
}

/* ─── SIMPLE MARKDOWN ────────────────────────── */
function renderContent(text) {
  if (!text) return '';
  // Escape HTML
  let html = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // Headers: ## and ###
  html = html.replace(/^### (.+)$/gm, '<h4 class="art-h4">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="art-h3">$1</h3>');
  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code class="art-code">$1</code>');
  // Code blocks: ```lang\n...\n```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="art-pre"><code>${code.trim()}</code></pre>`;
  });
  // Images: ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="art-img" loading="lazy">');
  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="art-link">$1</a>');
  // Line breaks: double newline = paragraph
  html = html.split(/\n\n+/).map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<h3') || p.startsWith('<h4') || p.startsWith('<pre') || p.startsWith('<img')) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
  return html;
}

/* ─── RENDER FILTERS ─────────────────────────── */
function renderFilters(articles) {
  const filtersEl = document.getElementById('articles-filters');
  const categories = [...new Set(articles.map(a => a.category || 'Uncategorized'))];
  if (categories.length <= 1) { filtersEl.style.display = 'none'; return; }

  let html = '<button class="filter-btn active" data-cat="all">All</button>';
  categories.forEach(cat => {
    html += `<button class="filter-btn" data-cat="${cat}">${cat}</button>`;
  });
  filtersEl.innerHTML = html;

  filtersEl.addEventListener('click', e => {
    if (!e.target.classList.contains('filter-btn')) return;
    filtersEl.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    const cat = e.target.dataset.cat;
    renderArticleCards(articles, cat === 'all' ? null : cat);
  });
}

/* ─── RENDER CARDS ───────────────────────────── */
function renderArticleCards(articles, filterCat) {
  const listEl = document.getElementById('articles-list');
  const emptyEl = document.getElementById('articles-empty');
  const filtered = filterCat ? articles.filter(a => (a.category || 'Uncategorized') === filterCat) : articles;

  if (filtered.length === 0) {
    listEl.innerHTML = '';
    listEl.appendChild(emptyEl);
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  // Sort by date descending
  const sorted = [...filtered].sort((a, b) => {
    const da = new Date(a.date || 0);
    const db = new Date(b.date || 0);
    return db - da;
  });

  listEl.innerHTML = sorted.map((article, i) => {
    const coverImg = article.coverImage
      ? `<div class="article-card-cover"><img src="${esc(article.coverImage)}" alt="${esc(article.title)}" loading="lazy"></div>`
      : '';
    const tags = (article.tags || []).map(t => `<span class="article-tag">${esc(t)}</span>`).join('');
    const cat = article.category || 'Uncategorized';
    const readTime = estimateReadTime(article.content || '');

    return `
    <article class="article-card reveal visible" data-index="${i}">
      ${coverImg}
      <div class="article-card-body">
        <div class="article-card-meta">
          <span class="article-cat">${esc(cat)}</span>
          <span class="article-date">${esc(article.date || '')}</span>
          <span class="article-read-time">${readTime} min read</span>
        </div>
        <h2 class="article-card-title">${esc(article.title || 'Untitled')}</h2>
        <p class="article-card-excerpt">${esc(article.excerpt || '')}</p>
        <div class="article-card-tags">${tags}</div>
        <button class="btn btn-secondary article-read-btn" data-idx="${i}">
          Read More <span class="btn-arrow">→</span>
        </button>
      </div>
    </article>`;
  }).join('');

  // Attach click handlers
  listEl.querySelectorAll('.article-read-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(sorted[parseInt(btn.dataset.idx)]));
  });
  // Also allow clicking the card title
  listEl.querySelectorAll('.article-card-title').forEach((el, idx) => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => openModal(sorted[idx]));
  });
}

function estimateReadTime(text) {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/* ─── MODAL ──────────────────────────────────── */
function openModal(article) {
  const modal = document.getElementById('article-modal');
  const body = document.getElementById('modal-body');

  const coverHtml = article.coverImage
    ? `<img src="${esc(article.coverImage)}" alt="${esc(article.title)}" class="article-modal-cover">`
    : '';
  const tags = (article.tags || []).map(t => `<span class="article-tag">${esc(t)}</span>`).join('');

  body.innerHTML = `
    ${coverHtml}
    <div class="article-modal-header">
      <span class="article-cat">${esc(article.category || 'Uncategorized')}</span>
      <span class="article-date">${esc(article.date || '')}</span>
    </div>
    <h1 class="article-modal-title">${esc(article.title || 'Untitled')}</h1>
    <div class="article-modal-tags">${tags}</div>
    <div class="article-modal-text">${renderContent(article.content || article.excerpt || '')}</div>
  `;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('article-modal').classList.remove('open');
  document.body.style.overflow = '';
}

/* ─── UTILS ──────────────────────────────────── */
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ─── PARTICLES (simple version) ─────────────── */
function initParticles() {
  const c = document.getElementById('particles-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, pts = [];
  const resize = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight; };
  window.addEventListener('resize', resize); resize();
  for (let i = 0; i < 40; i++) pts.push({ x: Math.random()*W, y: Math.random()*H, vx: (Math.random()-.5)*.4, vy: (Math.random()-.5)*.4 });
  (function loop() {
    ctx.clearRect(0,0,W,H);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.2, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(16,185,129,0.35)'; ctx.fill();
    });
    for (let i = 0; i < pts.length; i++) for (let j = i+1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx*dx+dy*dy);
      if (d < 140) { ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
        ctx.strokeStyle = `rgba(16,185,129,${0.08*(1-d/140)})`; ctx.lineWidth = 0.5; ctx.stroke(); }
    }
    requestAnimationFrame(loop);
  })();
}

/* ─── NAVBAR / THEME ─────────────────────────── */
function initNavbar() {
  const ham = document.getElementById('hamburger');
  const links = document.getElementById('nav-links');
  ham.addEventListener('click', () => { ham.classList.toggle('open'); links.classList.toggle('open'); });
  links.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => { ham.classList.remove('open'); links.classList.remove('open'); }));
}
function initTheme() {
  const saved = localStorage.getItem('oxkey_theme');
  if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
  const btn = document.getElementById('theme-toggle');
  btn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'light' ? '' : 'light';
    if (next) document.documentElement.setAttribute('data-theme', next);
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('oxkey_theme', next || 'dark');
  });
}

/* ─── INIT ───────────────────────────────────── */
async function init() {
  const data = await loadData();
  const articles = data?.articles || [];

  renderFilters(articles);
  renderArticleCards(articles, null);

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-backdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  initParticles();
  initNavbar();
  initTheme();
}

document.addEventListener('DOMContentLoaded', init);
