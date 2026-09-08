// =================================================
// 0xKey Portfolio — admin.js
// Admin panel: auth (SHA-256), CRUD for all
// portfolio sections, localStorage persistence.
// Default creds: admin / 0xKey@2026
// =================================================

const STORAGE_KEY   = 'oxkey_portfolio_data';

/* ─── DEFAULT DATA ────────────────────────────── */
async function fetchDefaultData() {
  try {
    const res = await fetch('/data/portfolio-data.json');
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

    btnText.textContent = 'Checking...';
    errEl.textContent = '';

    try {
      const res = await fetch('/.netlify/functions/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: passVal })
      });
      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem('oxkey_auth', '1');
        if (data.token) sessionStorage.setItem('oxkey_token', data.token);
        else sessionStorage.removeItem('oxkey_token');
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'grid';
        await initDashboard();
      } else {
        errEl.textContent = '✗ Invalid username or password';
        btnText.textContent = 'Access Panel';
      }
    } catch (err) {
      errEl.textContent = '✗ Error connecting to auth server';
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
      profileImage: defaultData?.hero?.profileImage || './assets/img/0xkey.png',
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
  const TITLES = { hero:'Hero', about:'About', skills:'Skills', projects:'Projects', achievements:'Achievements', certificates:'Certificates', articles:'Articles', ctf:'CTF Challenges', links:'Links', contact:'Contact', settings:'Settings' };
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
    sessionStorage.removeItem('oxkey_token');
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
    toast('⚠ Credentials must now be changed via Netlify Environment Variables.', 'warn');
  });

  // CTF challenges (server-side, token-authed API)
  initCtfAdmin();
}

/* ─── CTF CHALLENGES (server-side admin API) ──── */
const CTF_API = '/api/admin/ctf/challenges';
let ctfInitDone = false;
let ctfList = [];
let ctfEditingId = null;
let ctfRemoveFiles = [];

function ctfGetToken() {
  return sessionStorage.getItem('oxkey_token') || '';
}

function ctfForceRelogin() {
  sessionStorage.removeItem('oxkey_auth');
  sessionStorage.removeItem('oxkey_token');
  const dash = document.getElementById('dashboard');
  const login = document.getElementById('login-screen');
  if (dash) dash.style.display = 'none';
  if (login) login.style.display = 'flex';
  toast('✗ Session expired — please log in again.', 'error');
}

async function ctfApi(path, opts) {
  const res = await fetch(path, Object.assign({}, opts || {}, {
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      (opts && opts.headers) || {},
      { 'Authorization': 'Bearer ' + ctfGetToken() }
    )
  }));
  if (res.status === 401) {
    ctfForceRelogin();
    throw new Error('unauthorized');
  }
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    const msg = (data && (data.errors ? data.errors.join('; ') : data.error)) || ('HTTP ' + res.status);
    throw new Error(msg);
  }
  return data;
}

function ctfStatusPill(c) {
  if (c.deleted) return '<span class="ctf-pill ctf-pill-deleted">Deleted</span>';
  return c.status === 'published'
    ? '<span class="ctf-pill ctf-pill-published">Published</span>'
    : '<span class="ctf-pill ctf-pill-draft">Draft</span>';
}

function ctfDiffPill(d) {
  const safe = (d === 'medium' || d === 'hard') ? d : 'easy';
  return `<span class="ctf-pill ctf-pill-${safe}">${esc(safe)}</span>`;
}

function initCtfAdmin() {
  if (ctfInitDone) return;
  if (!document.getElementById('tab-ctf')) return;
  ctfInitDone = true;

  document.getElementById('ctf-new-btn').addEventListener('click', () => openCtfEditor(null));
  document.getElementById('ctf-refresh-btn').addEventListener('click', loadCtfList);
  document.getElementById('ctf-filter-status').addEventListener('change', renderCtfTable);
  document.getElementById('ctf-filter-category').addEventListener('change', renderCtfTable);
  document.getElementById('ctf-form').addEventListener('submit', saveCtfChallenge);
  document.getElementById('ctf-preview-btn').addEventListener('click', previewCtfChallenge);
  document.getElementById('ctf-delete-btn').addEventListener('click', deleteCtfChallenge);
  document.querySelectorAll('[data-ctf-close]').forEach(el =>
    el.addEventListener('click', closeCtfModals));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCtfModals();
  });

  loadCtfList();
}

async function loadCtfList() {
  const wrap = document.getElementById('ctf-admin-list');
  try {
    ctfList = await ctfApi(CTF_API, { method: 'GET' });
    if (!Array.isArray(ctfList)) ctfList = [];
    renderCtfFilters();
    renderCtfTable();
  } catch (err) {
    if (String(err.message) === 'unauthorized') return;
    if (wrap) wrap.innerHTML = `<div class="ctf-table-wrap"><div class="ctf-empty-row">✗ Could not load challenges: ${esc(err.message)}</div></div>`;
  }
}

function renderCtfFilters() {
  const sel = document.getElementById('ctf-filter-category');
  const cur = sel.value || 'all';
  const cats = [...new Set(ctfList.map(c => c.category).filter(Boolean))].sort();
  sel.innerHTML = '<option value="all">All categories</option>' +
    cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  sel.value = [...sel.options].some(o => o.value === cur) ? cur : 'all';
  const dl = document.getElementById('ctf-category-list');
  if (dl) dl.innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');
}

function renderCtfTable() {
  const wrap = document.getElementById('ctf-admin-list');
  if (!wrap) return;
  const fStatus = document.getElementById('ctf-filter-status').value;
  const fCat = document.getElementById('ctf-filter-category').value;
  const rows = ctfList
    .filter(c => {
      if (fStatus === 'deleted') return c.deleted;
      if (c.deleted) return false;
      if (fStatus !== 'all' && c.status !== fStatus) return false;
      if (fCat !== 'all' && c.category !== fCat) return false;
      return true;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (rows.length === 0) {
    wrap.innerHTML = '<div class="ctf-table-wrap"><div class="ctf-empty-row">No challenges match this filter.</div></div>';
    return;
  }

  wrap.innerHTML = `<div class="ctf-table-wrap"><table class="ctf-table">
    <thead><tr>
      <th>#</th><th>Title</th><th>Category</th><th>Difficulty</th>
      <th>Status</th><th>Flag</th><th>Updated</th><th>Actions</th>
    </tr></thead>
    <tbody>${rows.map(c => `
      <tr class="${c.deleted ? 'is-deleted' : ''}">
        <td>${esc(String(c.order ?? 0))}</td>
        <td><strong>${esc(c.title)}</strong><br><span style="opacity:.6;font-size:.75rem">${esc(c.id)}</span></td>
        <td><span class="ctf-pill ctf-pill-cat">${esc(c.category || '')}</span></td>
        <td>${ctfDiffPill(c.difficulty)}</td>
        <td>${ctfStatusPill(c)}</td>
        <td>${c.hasFlag ? '✓ set' : '✗ missing'}</td>
        <td style="white-space:nowrap">${esc((c.updatedAt || '').slice(0, 10))}</td>
        <td><div class="ctf-row-actions">
          <button class="ctf-mini-btn" data-act="edit" data-id="${esc(c.id)}">Edit</button>
          <button class="ctf-mini-btn" data-act="up" data-id="${esc(c.id)}" title="Move up">↑</button>
          <button class="ctf-mini-btn" data-act="down" data-id="${esc(c.id)}" title="Move down">↓</button>
          <button class="ctf-mini-btn" data-act="preview" data-id="${esc(c.id)}">Preview</button>
          ${c.deleted
            ? `<button class="ctf-mini-btn" data-act="restore" data-id="${esc(c.id)}">Restore</button>`
            : `<button class="ctf-mini-btn danger" data-act="del" data-id="${esc(c.id)}">Delete</button>`}
        </div></td>
      </tr>`).join('')}
    </tbody></table></div>`;

  wrap.querySelectorAll('.ctf-mini-btn').forEach(btn => {
    btn.addEventListener('click', () => ctfRowAction(btn.dataset.act, btn.dataset.id));
  });
}

async function ctfRowAction(act, id) {
  const item = ctfList.find(c => c.id === id);
  if (!item && act !== 'edit') return;
  try {
    if (act === 'edit') openCtfEditor(id);
    else if (act === 'preview') openCtfPreview(id);
    else if (act === 'del') {
      const target = ctfList.find(c => c.id === id);
      if (!target) return;
      if (!confirm(`Soft-delete "${target.title}"? It will disappear from the public page but stay restorable.`)) return;
      await ctfApi(`${CTF_API}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      toast('✓ Challenge moved to Deleted.', 'ok');
      await loadCtfList();
    } else if (act === 'restore') {
      await ctfPutFull(item, { deleted: false });
      toast('✓ Challenge restored.', 'ok');
      await loadCtfList();
    } else if (act === 'up' || act === 'down') {
      await ctfMove(item, act === 'up' ? -1 : 1);
    }
  } catch (err) {
    if (String(err.message) === 'unauthorized') return;
    toast('✗ ' + err.message, 'error');
  }
}

function ctfPutBody(item, overrides) {
  return Object.assign({
    title: item.title,
    description: item.description,
    category: item.category,
    difficulty: item.difficulty,
    status: item.status,
    order: item.order || 0,
    writeup: item.writeup || '',
    deleted: Boolean(item.deleted)
  }, overrides || {});
}

async function ctfPutFull(item, overrides) {
  return ctfApi(`${CTF_API}/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(ctfPutBody(item, overrides))
  });
}

async function ctfMove(item, dir) {
  const visible = ctfList.filter(c => !c.deleted).sort((a, b) => (a.order || 0) - (b.order || 0));
  const ix = visible.findIndex(c => c.id === item.id);
  const jx = ix + dir;
  if (ix === -1 || jx < 0 || jx >= visible.length) return;
  const other = visible[jx];
  const aOrder = item.order || 0;
  const bOrder = other.order || 0;
  // Swap display positions (fall back to index swap on ties).
  const newA = bOrder === aOrder ? jx : bOrder;
  const newB = bOrder === aOrder ? ix : aOrder;
  await ctfPutFull(item, { order: newA });
  const freshOther = (await ctfApi(CTF_API, { method: 'GET' })).find(c => c.id === other.id) || other;
  await ctfApi(`${CTF_API}/${encodeURIComponent(other.id)}`, {
    method: 'PUT',
    body: JSON.stringify(ctfPutBody(freshOther, { order: newB }))
  });
  toast('✓ Order updated.', 'ok');
  await loadCtfList();
}

/* ─── CTF editor modal ─── */
function ctfSet(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val == null ? '' : val;
}

function openCtfEditor(id) {
  ctfEditingId = id || null;
  ctfRemoveFiles = [];
  const item = id ? ctfList.find(c => c.id === id) : null;
  document.getElementById('ctf-modal-title').textContent = item ? `Edit: ${item.title}` : 'New Challenge';
  ctfSet('ctf-f-title', item ? item.title : '');
  ctfSet('ctf-f-category', item ? item.category : '');
  ctfSet('ctf-f-difficulty', item ? item.difficulty : 'easy');
  ctfSet('ctf-f-status', item ? item.status : 'draft');
  ctfSet('ctf-f-order', item ? (item.order || 0) : (ctfList.reduce((m, c) => Math.max(m, c.order || 0), 0) + 1));
  ctfSet('ctf-f-desc', item ? item.description : '');
  ctfSet('ctf-f-flag', '');
  ctfSet('ctf-f-writeup', item ? (item.writeup || '') : '');
  document.getElementById('ctf-f-files').value = '';
  const hint = document.getElementById('ctf-flag-hint');
  hint.textContent = item
    ? (item.hasFlag ? 'Flag is set. Leave blank to keep it, or type a new one to replace it.' : 'No flag set yet — one is required.')
    : 'Hashed server-side on save. Never stored or shown again.';
  const delBtn = document.getElementById('ctf-delete-btn');
  delBtn.hidden = !item || item.deleted;
  renderCtfExistingFiles(item ? (item.attachments || []) : []);
  document.getElementById('ctf-preview-modal').hidden = true;
  document.getElementById('ctf-modal').hidden = false;
}

function renderCtfExistingFiles(files) {
  const wrap = document.getElementById('ctf-existing-files');
  const visible = files.filter(f => !ctfRemoveFiles.includes(f.name));
  wrap.innerHTML = visible.length === 0
    ? '<div class="field-hint">No attachments.</div>'
    : visible.map(f => `
      <div class="ctf-file-row">
        <span>📎 ${esc(f.name)}</span>
        <span class="ctf-file-size">${esc(ctfFmtSize(f.size))}</span>
        <button type="button" class="ctf-file-remove" data-file="${esc(f.name)}" title="Remove">✕</button>
      </div>`).join('');
  wrap.querySelectorAll('.ctf-file-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      ctfRemoveFiles.push(btn.dataset.file);
      const item = ctfEditingId ? ctfList.find(c => c.id === ctfEditingId) : null;
      renderCtfExistingFiles(item ? (item.attachments || []) : []);
    });
  });
}

function ctfFmtSize(n) {
  n = Number(n) || 0;
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(2) + ' MB';
}

function closeCtfModals() {
  document.getElementById('ctf-modal').hidden = true;
  document.getElementById('ctf-preview-modal').hidden = true;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parts = String(reader.result).split(',');
      if (parts.length !== 2) return reject(new Error('unreadable file: ' + file.name));
      resolve({ name: file.name, data: parts[1] });
    };
    reader.onerror = () => reject(new Error('unreadable file: ' + file.name));
    reader.readAsDataURL(file);
  });
}

async function saveCtfChallenge(e) {
  e.preventDefault();
  const saveBtn = document.getElementById('ctf-save-btn');
  saveBtn.disabled = true;
  try {
    const title = document.getElementById('ctf-f-title').value.trim();
    const category = document.getElementById('ctf-f-category').value.trim();
    const description = document.getElementById('ctf-f-desc').value.trim();
    const flag = document.getElementById('ctf-f-flag').value;
    if (!title || !category || !description) {
      toast('✗ Title, category, and description are required.', 'error');
      return;
    }
    if (!ctfEditingId && !flag.trim()) {
      toast('✗ A correct flag is required for new challenges.', 'error');
      return;
    }
    const picked = Array.from(document.getElementById('ctf-f-files').files || []);
    for (const f of picked) {
      if (f.size > 5 * 1024 * 1024) {
        toast(`✗ File too large (max 5MB): ${f.name}`, 'error');
        return;
      }
    }
    const addFiles = [];
    for (const f of picked) addFiles.push(await readFileAsBase64(f));

    const body = {
      title,
      category,
      difficulty: document.getElementById('ctf-f-difficulty').value,
      status: document.getElementById('ctf-f-status').value,
      order: parseInt(document.getElementById('ctf-f-order').value, 10) || 0,
      description,
      writeup: document.getElementById('ctf-f-writeup').value,
      removeFiles: ctfRemoveFiles,
      addFiles
    };
    if (flag.trim()) body.flag = flag;

    if (ctfEditingId) {
      await ctfApi(`${CTF_API}/${encodeURIComponent(ctfEditingId)}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('✓ Challenge updated.', 'ok');
    } else {
      await ctfApi(CTF_API, { method: 'POST', body: JSON.stringify(body) });
      toast('✓ Challenge created.', 'ok');
    }
    // The plaintext flag never stays in the DOM longer than needed.
    document.getElementById('ctf-f-flag').value = '';
    closeCtfModals();
    await loadCtfList();
  } catch (err) {
    if (String(err.message) === 'unauthorized') return;
    toast('✗ ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false;
  }
}

async function deleteCtfChallenge() {
  if (!ctfEditingId) return;
  const item = ctfList.find(c => c.id === ctfEditingId);
  if (!item) return;
  if (!confirm(`Soft-delete "${item.title}"? It will disappear from the public page but stay restorable.`)) return;
  try {
    await ctfApi(`${CTF_API}/${encodeURIComponent(ctfEditingId)}`, { method: 'DELETE' });
    toast('✓ Challenge moved to Deleted.', 'ok');
    closeCtfModals();
    await loadCtfList();
  } catch (err) {
    if (String(err.message) === 'unauthorized') return;
    toast('✗ ' + err.message, 'error');
  }
}

function openCtfPreview(id) {
  const item = ctfList.find(c => c.id === id);
  if (!item) return;
  const body = document.getElementById('ctf-preview-body');
  const files = (item.attachments || []).map(f =>
    `<div class="ctf-file-row"><span>📎 ${esc(f.name)}</span><span class="ctf-file-size">${esc(ctfFmtSize(f.size))}</span></div>`
  ).join('');
  body.innerHTML = `
    <div class="ctf-preview-card">
      <h4>${esc(item.title)}</h4>
      <div style="margin-bottom:.75rem">${ctfDiffPill(item.difficulty)} <span class="ctf-pill ctf-pill-cat">${esc(item.category || '')}</span> ${ctfStatusPill(item)}</div>
      <p>${esc(item.description)}</p>
      ${files || '<div class="field-hint">No attachments.</div>'}
      <div class="field-group" style="margin-top:1rem">
        <label>Flag input (visitor view)</label>
        <input type="text" placeholder="flag{...}" disabled>
      </div>
    </div>
    <p class="ctf-preview-note">Visitors ${item.status === 'published' && !item.deleted ? 'CAN' : 'CANNOT'} see this challenge (status: ${esc(item.status)}${item.deleted ? ', deleted' : ''}). Flag and salt are never exposed.</p>`;
  document.getElementById('ctf-preview-modal').hidden = false;
}

function previewCtfChallenge() {
  // Preview from the live form values without saving.
  const existing = ctfEditingId ? ctfList.find(c => c.id === ctfEditingId) : null;
  const tmp = {
    title: document.getElementById('ctf-f-title').value || '(untitled)',
    category: document.getElementById('ctf-f-category').value || 'misc',
    difficulty: document.getElementById('ctf-f-difficulty').value,
    description: document.getElementById('ctf-f-desc').value || '(no description yet)',
    attachments: (existing && existing.attachments) || []
  };
  const body = document.getElementById('ctf-preview-body');
  body.innerHTML = `
    <div class="ctf-preview-card">
      <h4>${esc(tmp.title)}</h4>
      <div style="margin-bottom:.75rem">${ctfDiffPill(tmp.difficulty)} <span class="ctf-pill ctf-pill-cat">${esc(tmp.category)}</span></div>
      <p>${esc(tmp.description)}</p>
      <div class="field-hint">Attachments: ${tmp.attachments.length} existing${document.getElementById('ctf-f-files').files.length ? ` + ${document.getElementById('ctf-f-files').files.length} new` : ''}.</div>
    </div>
    <p class="ctf-preview-note">Unsaved preview — nothing is published until you press Save.</p>`;
  document.getElementById('ctf-preview-modal').hidden = false;
}

/* ─── BOOT ────────────────────────────────────── */
async function boot() {
  // If already authenticated in session, skip login
  if (sessionStorage.getItem('oxkey_auth') === '1') {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'grid';
    await initDashboard();
  } else {
    initLogin();
  }
}

document.addEventListener('DOMContentLoaded', boot);
