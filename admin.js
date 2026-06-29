// =================================================
// 0xKey Portfolio — admin.js
// Admin panel: auth (SHA-256), CRUD for all
// portfolio sections, localStorage persistence.
// Default creds: admin / 0xKey@2026
// =================================================

const STORAGE_KEY   = 'oxkey_portfolio_data';
const CREDS_KEY     = 'oxkey_admin_creds_v2';
const DEFAULT_USER  = typeof window.ADMIN_USER !== 'undefined' ? window.ADMIN_USER : '0xKeyAdmin';
const DEFAULT_HASH  = typeof window.ADMIN_HASH !== 'undefined' ? window.ADMIN_HASH : 'e66d6ee9eec41bb7a3345da0cd326e53c9a89a23091bfc36d2a77aba06c13824';

/* ─── CRYPTO ──────────────────────────────────── */
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ─── STORED CREDS ────────────────────────────── */
async function getStoredCreds() {
  const raw = localStorage.getItem(CREDS_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (_) {}
  }
  // First run — initialize defaults
  const creds = { username: DEFAULT_USER, passwordHash: DEFAULT_HASH };
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
  return creds;
}

/* ─── DEFAULT DATA ────────────────────────────── */
async function fetchDefaultData() {
  try {
    const res = await fetch('/portfolio-data.json');
    if (res.ok) return await res.json();
  } catch (_) {}
  return null;
}

function getCurrentData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { try { return JSON.parse(raw); } catch (_) {} }
  return null;
}

/* ─── LOGIN PARTICLES ─────────────────────────── */
function initLoginCanvas() {
  const c = document.getElementById('login-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, pts = [];
  const resize = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight; };
  window.addEventListener('resize', resize);
  resize();
  for (let i = 0; i < 55; i++) {
    pts.push({ x: Math.random()*W, y: Math.random()*H, vx: (Math.random()-.5)*.3, vy: (Math.random()-.5)*.3 });
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0||p.x > W) p.vx *= -1;
      if (p.y < 0||p.y > H) p.vy *= -1;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,255,136,0.4)'; ctx.fill();
    });
    for (let i = 0; i < pts.length; i++) for (let j = i+1; j < pts.length; j++) {
      const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.sqrt(dx*dx+dy*dy);
      if (d < 120) {
        ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
        ctx.strokeStyle=`rgba(0,255,136,${0.1*(1-d/120)})`; ctx.lineWidth=0.5; ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ─── TOAST ───────────────────────────────────── */
function toast(msg, type = 'ok') {
  const el = document.getElementById('admin-toast');
  el.textContent = msg;
  el.className = `admin-toast show ${type === 'error' ? 'error' : type === 'warn' ? 'warn' : ''}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3500);
}

/* ─── LOGIN FLOW ──────────────────────────────── */
async function initLogin() {
  initLoginCanvas();

  // Eye toggle
  const eye  = document.getElementById('eye-toggle');
  const pass = document.getElementById('l-pass');
  eye.addEventListener('click', () => {
    pass.type = pass.type === 'password' ? 'text' : 'password';
  });

  const form    = document.getElementById('login-form');
  const errEl   = document.getElementById('login-error');
  const btnText = document.getElementById('login-btn-text');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const user    = document.getElementById('l-user').value.trim();
    const passVal = document.getElementById('l-pass').value;
    const creds   = await getStoredCreds();

    btnText.textContent = 'Checking...';
    errEl.textContent = '';

    const inputHash = await sha256(passVal);
    const isLocalMatch = (user === creds.username && inputHash === creds.passwordHash);
    const isConfigMatch = (user === DEFAULT_USER && inputHash === DEFAULT_HASH);

    if (isLocalMatch || isConfigMatch) {
      if (isConfigMatch && !isLocalMatch) {
        localStorage.setItem(CREDS_KEY, JSON.stringify({ username: DEFAULT_USER, passwordHash: DEFAULT_HASH }));
      }
      sessionStorage.setItem('oxkey_auth', '1');
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('dashboard').style.display = 'grid';
      await initDashboard();
    } else {
      errEl.textContent = '✗ Invalid username or password';
      btnText.textContent = 'Access Panel';
    }
  });
}

/* ─── POPULATE FORMS ──────────────────────────── */
function populateForms(data) {
  // HERO
  set('h-handle',  data.hero?.handle || '');
  set('h-tagline', data.hero?.tagline || '');
  set('h-github',  data.hero?.githubUrl || '');
  set('h-badges',  (data.hero?.badges || []).map(b => `${b.icon} ${b.text}`).join('\n'));

  // ABOUT
  const bio = data.about?.bio || [];
  set('ab-bio1', bio[0] || '');
  set('ab-bio2', bio[1] || '');
  set('ab-bio3', bio[2] || '');
  const stats = data.about?.stats || [];
  set('st-val1', stats[0]?.value || ''); set('st-lbl1', stats[0]?.label || '');
  set('st-val2', stats[1]?.value || ''); set('st-lbl2', stats[1]?.label || '');
  set('st-val3', stats[2]?.value || ''); set('st-lbl3', stats[2]?.label || '');

  // SKILLS
  set('sk-bars', (data.skills?.bars || []).map(s => `${s.name},${s.percent}`).join('\n'));
  set('sk-tools', (data.skills?.tools || []).join(', '));

  // LINKS
  const links = data.links || [];
  const li = (icon) => links.find(l => l.iconType === icon) || {};
  set('lk-linkedin-url',  li('linkedin').url || '');
  set('lk-linkedin-desc', li('linkedin').description || '');
  set('lk-github-url',    li('github').url || '');
  set('lk-github-desc',   li('github').description || '');
  set('lk-telegram-url',  li('telegram').url || '');
  set('lk-telegram-desc', li('telegram').description || '');

  // CONTACT
  set('ct-email',    data.contact?.email || '');
  set('ct-telegram', data.contact?.telegramUrl || '');
  set('ct-desc',     data.contact?.description || '');
  set('ft-text',     data.footer?.text || '');

  // PROJECTS, ACHIEVEMENTS, CERTIFICATES, ARTICLES
  renderProjectsEditor(data.projects || []);
  renderAchievementsEditor(data.achievements || []);
  renderCertificatesEditor(data.certificates || []);
  renderArticlesEditor(data.articles || []);
}

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}
function get(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/* ─── IMAGE UPLOAD LOGIC ─────────────────────── */
function handleImageUpload(fileInput, urlInput) {
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('File too large (max 5MB)', 'err'); return; }
    
    const reader = new FileReader();
    reader.onload = function(event) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX = 800; // max width/height
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Convert to high-compression JPEG to save localStorage space
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        urlInput.value = dataUrl;
        toast('✓ Image compressed & uploaded to memory', 'ok');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ─── PROJECT EDITOR ──────────────────────────── */
let projectsData = [];

function renderProjectsEditor(projects) {
  projectsData = JSON.parse(JSON.stringify(projects));
  const el = document.getElementById('projects-editor');
  el.innerHTML = '';
  projectsData.forEach((p, i) => {
    el.appendChild(buildProjectCard(p, i));
  });
}

function buildProjectCard(p, i) {
  const div = document.createElement('div');
  div.className = 'project-editor-card';
  div.dataset.index = i;
  div.innerHTML = `
    <div class="project-editor-header">
      <span class="project-editor-num">Project #${i + 1}</span>
      <button class="btn btn-danger remove-proj-btn" data-index="${i}">✕ Remove</button>
    </div>
    <div class="panel-grid">
      <div class="field-group">
        <label>Icon (emoji)</label>
        <input type="text" class="p-icon" value="${esc(p.icon || '')}" placeholder="🏆">
      </div>
      <div class="field-group">
        <label>Title</label>
        <input type="text" class="p-title" value="${esc(p.title || '')}" placeholder="Project Title">
      </div>
      <div class="field-group field-full">
        <label>Description</label>
        <textarea class="p-desc" rows="2" placeholder="Short description...">${esc(p.description || '')}</textarea>
      </div>
      <div class="field-group">
        <label>Tags (comma-separated)</label>
        <input type="text" class="p-tags" value="${esc((p.tags || []).join(', '))}" placeholder="Python, Forensics">
      </div>
      <div class="field-group">
        <label>GitHub URL</label>
        <input type="url" class="p-github" value="${esc(p.github || '')}" placeholder="https://github.com/...">
      </div>
      <div class="field-group">
        <label>Image URL (or upload)</label>
        <div style="display:flex;gap:0.5rem">
          <input type="url" class="p-image" value="${esc(p.imageUrl || '')}" placeholder="https://..." style="flex:1">
          <input type="file" class="p-upload" accept="image/*" style="width:115px;padding:0.4rem;font-size:0.7rem">
        </div>
      </div>
      <div class="field-group">
        <label>Live URL (optional)</label>
        <input type="url" class="p-live" value="${esc(p.live || '')}" placeholder="https://...">
      </div>
    </div>`;
  div.querySelector('.remove-proj-btn').addEventListener('click', () => {
    projectsData.splice(i, 1);
    renderProjectsEditor(projectsData);
  });
  handleImageUpload(div.querySelector('.p-upload'), div.querySelector('.p-image'));
  return div;
}

function esc(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

function collectProjects() {
  const cards = document.querySelectorAll('#projects-editor .project-editor-card');
  return Array.from(cards).map(card => ({
    icon:        card.querySelector('.p-icon').value.trim(),
    title:       card.querySelector('.p-title').value.trim(),
    description: card.querySelector('.p-desc').value.trim(),
    tags:        card.querySelector('.p-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    github:      card.querySelector('.p-github').value.trim(),
    live:        card.querySelector('.p-live').value.trim(),
    imageUrl:    (card.querySelector('.p-image') ? card.querySelector('.p-image').value.trim() : '')
  }));
}

/* ─── ACHIEVEMENTS EDITOR ──────────────────────── */
let achievementsData = [];
function renderAchievementsEditor(achievements) {
  achievementsData = JSON.parse(JSON.stringify(achievements));
  const el = document.getElementById('achievements-editor');
  el.innerHTML = '';
  achievementsData.forEach((a, i) => el.appendChild(buildAchievementCard(a, i)));
}
function buildAchievementCard(a, i) {
  const div = document.createElement('div');
  div.className = 'project-editor-card';
  div.innerHTML = `
    <div class="project-editor-header">
      <span class="project-editor-num">Achievement #${i + 1}</span>
      <button class="btn btn-danger remove-achieve-btn" data-index="${i}">✕ Remove</button>
    </div>
    <div class="panel-grid">
      <div class="field-group">
        <label>Title</label>
        <input type="text" class="a-title" value="${esc(a.title || '')}" placeholder="Top 1% on THM">
      </div>
      <div class="field-group">
        <label>Date</label>
        <input type="text" class="a-date" value="${esc(a.date || '')}" placeholder="May 2026">
      </div>
      <div class="field-group field-full">
        <label>Description</label>
        <textarea class="a-desc" rows="2" placeholder="Details...">${esc(a.description || '')}</textarea>
      </div>
      <div class="field-group field-full">
        <label>Verify / Platform URL</label>
        <input type="url" class="a-url" value="${esc(a.url || '')}" placeholder="https://...">
      </div>
    </div>`;
  div.querySelector('.remove-achieve-btn').addEventListener('click', () => {
    achievementsData.splice(i, 1);
    renderAchievementsEditor(achievementsData);
  });
  return div;
}
function collectAchievements() {
  const cards = document.querySelectorAll('#achievements-editor .project-editor-card');
  return Array.from(cards).map(card => ({
    title:       card.querySelector('.a-title').value.trim(),
    date:        card.querySelector('.a-date').value.trim(),
    description: card.querySelector('.a-desc').value.trim(),
    url:         card.querySelector('.a-url').value.trim()
  }));
}

/* ─── CERTIFICATES EDITOR ──────────────────────── */
let certificatesData = [];
function renderCertificatesEditor(certificates) {
  certificatesData = JSON.parse(JSON.stringify(certificates));
  const el = document.getElementById('certificates-editor');
  el.innerHTML = '';
  certificatesData.forEach((c, i) => el.appendChild(buildCertificateCard(c, i)));
}
function buildCertificateCard(c, i) {
  const div = document.createElement('div');
  div.className = 'project-editor-card';
  div.innerHTML = `
    <div class="project-editor-header">
      <span class="project-editor-num">Certificate #${i + 1}</span>
      <button class="btn btn-danger remove-cert-btn" data-index="${i}">✕ Remove</button>
    </div>
    <div class="panel-grid">
      <div class="field-group">
        <label>Certificate Title</label>
        <input type="text" class="c-title" value="${esc(c.title || '')}" placeholder="eJPT">
      </div>
      <div class="field-group">
        <label>Issuer</label>
        <input type="text" class="c-issuer" value="${esc(c.issuer || '')}" placeholder="eLearnSecurity">
      </div>
      <div class="field-group">
        <label>Date Earned</label>
        <input type="text" class="c-date" value="${esc(c.date || '')}" placeholder="Jan 2026">
      </div>
      <div class="field-group">
        <label>Image URL (or upload)</label>
        <div style="display:flex;gap:0.5rem">
          <input type="url" class="c-image" value="${esc(c.imageUrl || '')}" placeholder="https://..." style="flex:1">
          <input type="file" class="c-upload" accept="image/*" style="width:115px;padding:0.4rem;font-size:0.7rem">
        </div>
      </div>
      <div class="field-group field-full">
        <label>Verify Credential URL</label>
        <input type="url" class="c-verify" value="${esc(c.verifyUrl || '')}" placeholder="https://...">
      </div>
    </div>`;
  div.querySelector('.remove-cert-btn').addEventListener('click', () => {
    certificatesData.splice(i, 1);
    renderCertificatesEditor(certificatesData);
  });
  handleImageUpload(div.querySelector('.c-upload'), div.querySelector('.c-image'));
  return div;
}
function collectCertificates() {
  const cards = document.querySelectorAll('#certificates-editor .project-editor-card');
  return Array.from(cards).map(card => ({
    title:     card.querySelector('.c-title').value.trim(),
    issuer:    card.querySelector('.c-issuer').value.trim(),
    date:      card.querySelector('.c-date').value.trim(),
    imageUrl:  card.querySelector('.c-image').value.trim(),
    verifyUrl: card.querySelector('.c-verify').value.trim()
  }));
}

/* ─── ARTICLES EDITOR ─────────────────────────── */
let articlesData = [];
function renderArticlesEditor(articles) {
  articlesData = JSON.parse(JSON.stringify(articles));
  const el = document.getElementById('articles-editor');
  if (!el) return;
  el.innerHTML = '';
  articlesData.forEach((a, i) => el.appendChild(buildArticleCard(a, i)));
}
function buildArticleCard(a, i) {
  const div = document.createElement('div');
  div.className = 'project-editor-card';
  div.innerHTML = `
    <div class="project-editor-header">
      <span class="project-editor-num">Article #${i + 1}</span>
      <button class="btn btn-danger remove-article-btn" data-index="${i}">✕ Remove</button>
    </div>
    <div class="panel-grid">
      <div class="field-group">
        <label>Title</label>
        <input type="text" class="art-title" value="${esc(a.title || '')}" placeholder="My CTF Writeup">
      </div>
      <div class="field-group">
        <label>Category</label>
        <input type="text" class="art-category" value="${esc(a.category || '')}" placeholder="Writeup, Article, Tutorial...">
      </div>
      <div class="field-group">
        <label>Date</label>
        <input type="text" class="art-date" value="${esc(a.date || '')}" placeholder="June 2026">
      </div>
      <div class="field-group">
        <label>Tags (comma-separated)</label>
        <input type="text" class="art-tags" value="${esc((a.tags || []).join(', '))}" placeholder="Forensics, CTF, Writeup">
      </div>
      <div class="field-group field-full">
        <label>Cover Image URL (or upload)</label>
        <div style="display:flex;gap:0.5rem">
          <input type="url" class="art-cover" value="${esc(a.coverImage || '')}" placeholder="https://... or upload" style="flex:1">
          <input type="file" class="art-cover-upload" accept="image/*" style="width:115px;padding:0.4rem;font-size:0.7rem">
        </div>
      </div>
      <div class="field-group field-full">
        <label>Excerpt (short summary shown on card)</label>
        <textarea class="art-excerpt" rows="2" placeholder="A brief summary...">${esc(a.excerpt || '')}</textarea>
      </div>
      <div class="field-group field-full">
        <label>Full Content (supports markdown — see help above)</label>
        <textarea class="art-content" rows="10" placeholder="## Introduction\n\nWrite your article here...\n\nUse ![alt](url) to embed images.">${esc(a.content || '')}</textarea>
      </div>
    </div>`;
  div.querySelector('.remove-article-btn').addEventListener('click', () => {
    articlesData.splice(i, 1);
    renderArticlesEditor(articlesData);
  });
  handleImageUpload(div.querySelector('.art-cover-upload'), div.querySelector('.art-cover'));
  return div;
}
function collectArticles() {
  const cards = document.querySelectorAll('#articles-editor .project-editor-card');
  return Array.from(cards).map(card => ({
    title:      card.querySelector('.art-title').value.trim(),
    category:   card.querySelector('.art-category').value.trim(),
    date:       card.querySelector('.art-date').value.trim(),
    tags:       card.querySelector('.art-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    coverImage: card.querySelector('.art-cover').value.trim(),
    excerpt:    card.querySelector('.art-excerpt').value.trim(),
    content:    card.querySelector('.art-content').value.trim()
  }));
}

/* ─── COLLECT ALL DATA ────────────────────────── */
function collectData(defaultData) {
  // Parse badges
  const badgeLines = get('h-badges').split('\n').filter(l => l.trim());
  const badges = badgeLines.map(line => {
    const parts = line.trim().split(/\s+/);
    const icon = parts[0] || '';
    const text = parts.slice(1).join(' ');
    return { icon, text };
  }).filter(b => b.text);

  // Parse skill bars
  const barLines = get('sk-bars').split('\n').filter(l => l.trim());
  const bars = barLines.map(line => {
    const last  = line.lastIndexOf(',');
    const name  = line.slice(0, last).trim();
    const pct   = parseInt(line.slice(last + 1).trim(), 10);
    return { name, percent: isNaN(pct) ? 50 : Math.min(100, Math.max(0, pct)) };
  }).filter(b => b.name);

  // Parse tools
  const tools = get('sk-tools').split(',').map(t=>t.trim()).filter(Boolean);

  // Links (preserve iconType + platform)
  const links = [
    { platform:'LinkedIn', iconType:'linkedin', url: get('lk-linkedin-url'), description: get('lk-linkedin-desc') },
    { platform:'GitHub',   iconType:'github',   url: get('lk-github-url'),   description: get('lk-github-desc')   },
    { platform:'Telegram', iconType:'telegram', url: get('lk-telegram-url'), description: get('lk-telegram-desc') },
  ].filter(l => l.url);

  return {
    meta: defaultData?.meta || {},
    hero: {
      handle:       get('h-handle'),
      tagline:      get('h-tagline'),
      profileImage: defaultData?.hero?.profileImage || './img/0xkey.png',
      githubUrl:    get('h-github'),
      badges,
    },
    about: {
      bio: [get('ab-bio1'), get('ab-bio2'), get('ab-bio3')].filter(Boolean),
      stats: [
        { value: get('st-val1'), label: get('st-lbl1') },
        { value: get('st-val2'), label: get('st-lbl2') },
        { value: get('st-val3'), label: get('st-lbl3') },
      ].filter(s => s.value),
    },
    skills: { bars, tools },
    projects: collectProjects(),
    achievements: collectAchievements(),
    certificates: collectCertificates(),
    articles: collectArticles(),
    links,
    contact: {
      email:       get('ct-email'),
      telegramUrl: get('ct-telegram'),
      description: get('ct-desc'),
    },
    footer: { text: get('ft-text') },
  };
}

/* ─── TABS ────────────────────────────────────── */
function initTabs() {
  const TITLES = { hero:'Hero', about:'About', skills:'Skills', projects:'Projects', achievements:'Achievements', certificates:'Certificates', articles:'Articles', links:'Links', contact:'Contact', settings:'Settings' };
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      document.getElementById('dash-title').textContent = TITLES[btn.dataset.tab] || btn.dataset.tab;
    });
  });
}

/* ─── DASHBOARD INIT ──────────────────────────── */
async function initDashboard() {
  // Load data
  const saved   = getCurrentData();
  const defData = await fetchDefaultData();
  const data    = saved || defData;

  populateForms(data || {});
  initTabs();

  // Add btn
  document.getElementById('add-project-btn').addEventListener('click', () => {
    projectsData.push({ icon:'🔧', title:'New Project', description:'', tags:[], github:'', live:'' });
    renderProjectsEditor(projectsData);
  });
  document.getElementById('add-achievement-btn').addEventListener('click', () => {
    achievementsData.push({ title:'New Achievement', date:'', description:'', url:'' });
    renderAchievementsEditor(achievementsData);
  });
  document.getElementById('add-certificate-btn').addEventListener('click', () => {
    certificatesData.push({ title:'New Certificate', issuer:'', date:'', imageUrl:'', verifyUrl:'' });
    renderCertificatesEditor(certificatesData);
  });
  document.getElementById('add-article-btn').addEventListener('click', () => {
    articlesData.push({ title:'New Article', category:'Writeup', date:'', tags:[], coverImage:'', excerpt:'', content:'' });
    renderArticlesEditor(articlesData);
  });

  // Save btn
  document.getElementById('save-btn').addEventListener('click', () => {
    const d = collectData(defData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d, null, 2));
    toast('✓ Changes saved! Refresh the portfolio to see them.', 'ok');
  });

  // Reset btn
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (!confirm('Reset this tab\'s fields to the last saved state?')) return;
    const cur = getCurrentData() || defData;
    if (cur) populateForms(cur);
    toast('↺ Fields reset to saved state.', 'warn');
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('oxkey_auth');
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
  });

  // Export JSON
  document.getElementById('export-btn').addEventListener('click', () => {
    const d    = collectData(defData);
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'portfolio-data.json'; a.click();
    URL.revokeObjectURL(url);
    toast('⬇ portfolio-data.json downloaded!', 'ok');
  });

  // Factory reset
  document.getElementById('factory-reset-btn').addEventListener('click', async () => {
    if (!confirm('⚠ This will delete ALL your admin edits and restore defaults. Continue?')) return;
    localStorage.removeItem(STORAGE_KEY);
    const fresh = await fetchDefaultData();
    if (fresh) populateForms(fresh);
    toast('⚠ All data reset to defaults.', 'warn');
  });

  // Change credentials
  document.getElementById('save-creds-btn').addEventListener('click', async () => {
    const msgEl      = document.getElementById('settings-msg');
    const newUser    = document.getElementById('s-user').value.trim();
    const newPass    = document.getElementById('s-pass-new').value;
    const confirm_   = document.getElementById('s-pass-confirm').value;
    const currentPas = document.getElementById('s-pass-current').value;

    msgEl.className = 'settings-msg';
    msgEl.textContent = '';

    if (!currentPas) { msgEl.textContent = '✗ Enter current password.'; msgEl.className='settings-msg err'; return; }
    const creds       = await getStoredCreds();
    const currentHash = await sha256(currentPas);
    if (currentHash !== creds.passwordHash) { msgEl.textContent = '✗ Current password is incorrect.'; msgEl.className='settings-msg err'; return; }
    if (!newUser)  { msgEl.textContent = '✗ Username cannot be empty.'; msgEl.className='settings-msg err'; return; }
    if (newPass.length < 6) { msgEl.textContent = '✗ Password must be at least 6 characters.'; msgEl.className='settings-msg err'; return; }
    if (newPass !== confirm_) { msgEl.textContent = '✗ Passwords do not match.'; msgEl.className='settings-msg err'; return; }

    const newHash = await sha256(newPass);
    localStorage.setItem(CREDS_KEY, JSON.stringify({ username: newUser, passwordHash: newHash }));
    // Clear fields
    ['s-user','s-pass-new','s-pass-confirm','s-pass-current'].forEach(id => { const e=document.getElementById(id); if(e)e.value=''; });
    msgEl.textContent = '✓ Credentials updated! Use them on next login.';
    msgEl.className = 'settings-msg ok';
    toast('✓ Credentials updated successfully.', 'ok');
  });
}

/* ─── BOOT ────────────────────────────────────── */
async function boot() {
  // If already authenticated in session, skip login
  if (sessionStorage.getItem('oxkey_auth') === '1') {
    // Ensure creds exist
    await getStoredCreds();
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'grid';
    await initDashboard();
  } else {
    await getStoredCreds(); // Initialize default creds on first visit
    initLogin();
  }
}

document.addEventListener('DOMContentLoaded', boot);
