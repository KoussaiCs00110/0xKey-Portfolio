// =================================================
// 0xKey Portfolio — main.js
// Loads portfolio-data.json (or localStorage),
// renders all sections, particles, animations.
// =================================================

/* ─── DATA LAYER ─────────────────────────────── */

const STORAGE_KEY = 'oxkey_portfolio_data';

async function loadData() {
  // 1. Try localStorage (admin edits)
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch (_) {}
  }
  // 2. Fetch the JSON file
  try {
    const res = await fetch('./portfolio-data.json');
    if (res.ok) return await res.json();
  } catch (_) {}
  return null;
}

/* ─── ICON SVGs ──────────────────────────────── */
const ICONS = {
  github: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  telegram: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
  external: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
};

/* ─── RENDERERS ──────────────────────────────── */

function renderHero(d) {
  const hero = d.hero;
  // Handle
  document.querySelectorAll('[id="hero-handle"], [id="nav-handle"]').forEach(el => el.textContent = hero.handle);
  document.getElementById('hero-handle').setAttribute('data-text', hero.handle);
  document.getElementById('hero-tagline').innerHTML = hero.tagline;
  // Profile image
  if (hero.profileImage) document.getElementById('hero-img').src = hero.profileImage;
  // GitHub btn
  const ghBtn = document.getElementById('hero-github-btn');
  if (ghBtn && hero.githubUrl) ghBtn.href = hero.githubUrl;
  // Badges
  const badgesEl = document.getElementById('hero-badges');
  if (badgesEl && hero.badges) {
    badgesEl.innerHTML = hero.badges.map(b =>
      `<li class="hero-badge"><span>${b.icon}</span><span>${b.text}</span></li>`
    ).join('');
  }
}

function renderAbout(d) {
  const ab = d.about;
  const bioEl = document.getElementById('about-bio');
  if (bioEl && ab.bio) {
    bioEl.innerHTML = ab.bio.map(p => `<p>${p}</p>`).join('');
  }
  const statsEl = document.getElementById('about-stats');
  if (statsEl && ab.stats) {
    statsEl.innerHTML = ab.stats.map(s =>
      `<div class="stat-card">
        <span class="stat-value">${s.value}</span>
        <span class="stat-label">${s.label}</span>
      </div>`
    ).join('');
  }
}

function renderSkills(d) {
  const sk = d.skills;
  const barsEl = document.getElementById('skills-bars');
  if (barsEl && sk.bars) {
    barsEl.innerHTML = sk.bars.map(s =>
      `<div class="skill-row">
        <div class="skill-header">
          <span class="skill-name">${s.name}</span>
          <span class="skill-pct">${s.percent}%</span>
        </div>
        <div class="skill-track">
          <div class="skill-fill" data-pct="${s.percent}"></div>
        </div>
      </div>`
    ).join('');
  }
  const toolsEl = document.getElementById('tools-grid');
  if (toolsEl && sk.tools) {
    toolsEl.innerHTML = sk.tools.map(t => `<span class="tool-badge">${t}</span>`).join('');
  }
}

function renderProjects(d) {
  const el = document.getElementById('projects-grid');
  if (!el || !d.projects) return;
  el.innerHTML = d.projects.map(p => {
    const githubLink = p.github
      ? `<a href="${p.github}" target="_blank" rel="noopener" class="project-link">${ICONS.github} GitHub</a>` : '';
    const liveLink = p.live
      ? `<a href="${p.live}" target="_blank" rel="noopener" class="project-link">${ICONS.external} Live</a>` : '';
    return `<div class="project-card">
      ${p.imageUrl ? `<div class="project-img-wrap"><img src="${p.imageUrl}" alt="${p.title}" loading="lazy"></div>` : `<div class="project-icon">${p.icon}</div>`}
      <div class="project-title">${p.title}</div>
      <div class="project-desc">${p.description}</div>
      <div class="project-tags">${(p.tags||[]).map(t=>`<span class="project-tag">${t}</span>`).join('')}</div>
      ${githubLink || liveLink ? `<div class="project-links">${githubLink}${liveLink}</div>` : ''}
    </div>`;
  }).join('');
}

function renderAchievements(d) {
  const el = document.getElementById('achievements-timeline');
  if (!el || !d.achievements) return;
  el.innerHTML = d.achievements.map(a => `
    <div class="timeline-item reveal">
      <div class="timeline-node"></div>
      <div class="timeline-content">
        <div class="timeline-date">${a.date}</div>
        <div class="timeline-title">${a.title}</div>
        <div class="timeline-desc">${a.description}</div>
        ${a.url ? `<a href="${a.url}" target="_blank" rel="noopener" class="btn btn-secondary" style="font-size:0.7rem;padding:0.4rem 0.8rem">View Platform</a>` : ''}
      </div>
    </div>
  `).join('');
}

function renderCertificates(d) {
  const el = document.getElementById('certs-gallery');
  if (!el || !d.certificates) return;
  el.innerHTML = d.certificates.map(c => `
    <div class="cert-card">
      <div class="cert-img-wrap">
        ${c.imageUrl ? `<img src="${c.imageUrl}" alt="${c.title}" loading="lazy">` : `<div class="cert-icon">🎓</div>`}
      </div>
      <div style="flex:1">
        <div class="cert-title">${c.title}</div>
        <div class="cert-issuer">${c.issuer}</div>
        <div class="cert-date">${c.date}</div>
      </div>
      ${c.verifyUrl ? `<a href="${c.verifyUrl}" target="_blank" rel="noopener" class="btn btn-primary btn-full" style="font-size:0.75rem">Verify Credential</a>` : ''}
    </div>
  `).join('');
}

function renderLinks(d) {
  const el = document.getElementById('links-grid');
  if (!el || !d.links) return;
  el.innerHTML = d.links.map(lk => `
    <a href="${lk.url}" target="_blank" rel="noopener" class="link-card">
      <span class="link-card-arrow">↗</span>
      <div class="link-icon link-icon-${lk.iconType}">${ICONS[lk.iconType] || ''}</div>
      <div class="link-platform">${lk.platform}</div>
      <div class="link-desc">${lk.description}</div>
    </a>`
  ).join('');
}

function renderContact(d) {
  const ct = d.contact;
  if (!ct) return;
  const descEl = document.getElementById('contact-description');
  if (descEl) descEl.textContent = ct.description;
  const emailText = document.getElementById('contact-email-text');
  if (emailText) emailText.textContent = ct.email;
  const emailBtn = document.getElementById('contact-email-btn');
  if (emailBtn) emailBtn.href = `mailto:${ct.email}`;
  const tgBtn = document.getElementById('contact-telegram-btn');
  if (tgBtn) tgBtn.href = ct.telegramUrl;
}

function renderFooter(d) {
  const el = document.getElementById('footer-text');
  if (el && d.footer) el.textContent = d.footer.text;
}

function renderMeta(d) {
  if (!d.meta) return;
  document.title = d.meta.title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.content = d.meta.description;
}

/* ─── SKILL BAR ANIMATION ────────────────────── */
function animateSkillBars() {
  const fills = document.querySelectorAll('.skill-fill');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.width = e.target.dataset.pct + '%';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  fills.forEach(f => obs.observe(f));
}

/* ─── REVEAL ON SCROLL ───────────────────────── */
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i * 80);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(el => obs.observe(el));
}

/* ─── NAVBAR ─────────────────────────────────── */
function initNavbar() {
  const nav   = document.getElementById('navbar');
  const links = document.getElementById('nav-links');
  const ham   = document.getElementById('hamburger');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
    // Active link
    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 120) current = s.id;
    });
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.getAttribute('href') === '#' + current);
    });
  }, { passive: true });

  ham.addEventListener('click', () => {
    links.classList.toggle('open');
    ham.classList.toggle('open');
  });

  document.querySelectorAll('.nav-link').forEach(l => {
    l.addEventListener('click', () => {
      links.classList.remove('open');
      ham.classList.remove('open');
    });
  });
}

/* ─── THEME TOGGLE ───────────────────────────── */
function initTheme() {
  const btn = document.getElementById('theme-toggle');
  const stored = localStorage.getItem('oxkey_theme');
  const heroImg = document.getElementById('hero-img');

  if (stored === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (heroImg && heroImg.src.includes('0xkey.png')) {
      heroImg.src = './img/0xkey1.png';
    }
  }

  btn.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const newTheme = isLight ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('oxkey_theme', newTheme);
    
    if (heroImg) {
      if (heroImg.src.includes('0xkey.png') || heroImg.src.includes('0xkey1.png')) {
        heroImg.src = newTheme === 'light' ? './img/0xkey1.png' : './img/0xkey.png';
      }
    }
  });
}

/* ─── SPOTLIGHT ──────────────────────────────── */
function initSpotlight() {
  const el = document.getElementById('spotlight');
  window.addEventListener('mousemove', e => {
    el.style.setProperty('--mx', e.clientX + 'px');
    el.style.setProperty('--my', e.clientY + 'px');
  }, { passive: true });
}

/* ─── PARTICLE CANVAS ────────────────────────── */
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, particles = [];

  const resize = () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resize, { passive: true });
  resize();

  const COUNT = Math.min(Math.floor(W / 12), 90);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x  = Math.random() * W;
      this.y  = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.35;
      this.vy = (Math.random() - 0.5) * 0.35;
      this.r  = Math.random() * 1.8 + 0.6;
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > W) this.vx *= -1;
      if (this.y < 0 || this.y > H) this.vy *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,255,136,0.55)';
      ctx.fill();
    }
  }

  for (let i = 0; i < COUNT; i++) particles.push(new Particle());

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    // Draw connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,255,136,${0.12 * (1 - dist/130)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  }
  loop();
}

/* ─── TERMINAL WIDGET ────────────────────────── */
function initTerminal() {
  const widget   = document.getElementById('terminal-widget');
  const closeBtn = document.getElementById('terminal-close');
  const output   = document.getElementById('terminal-output');
  const input    = document.getElementById('terminal-input');

  const COMMANDS = {
    'help': 'Available commands: whoami, skills, projects, clear, echo [text], date',
    'whoami': '0xKey - Cybersecurity Student & CTF Player',
    'skills': 'Digital Forensics, Reverse Engineering, Web Exploitation, Network Security',
    'projects': 'Check out the Projects section for my latest work!',
    'date': new Date().toString()
  };

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const val = this.value.trim();
      this.value = '';
      
      if (!val) return;

      // Echo input
      const inputLine = document.createElement('div');
      inputLine.className = 'terminal-line-out';
      inputLine.style.color = 'var(--text)';
      inputLine.textContent = '$ ' + val;
      output.appendChild(inputLine);

      if (val.toLowerCase() === 'clear') {
        output.innerHTML = '';
        return;
      }

      const args = val.split(' ');
      const cmd = args[0].toLowerCase();
      
      const outLine = document.createElement('div');
      outLine.className = 'terminal-line-out';

      if (cmd === 'echo') {
        outLine.textContent = args.slice(1).join(' ');
      } else if (COMMANDS[cmd]) {
        outLine.textContent = COMMANDS[cmd];
      } else {
        outLine.textContent = `bash: ${cmd}: command not found`;
      }
      
      output.appendChild(outLine);
      
      // Auto scroll
      output.scrollTop = output.scrollHeight;
      
      // Limit history
      while (output.children.length > 20) {
        output.removeChild(output.firstChild);
      }
    }
  });

  closeBtn.addEventListener('click', () => {
    widget.classList.add('hidden');
  });
}

/* ─── CONTACT FORM (NETLIFY AJAX) ────────────── */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const formData = new FormData(form);
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString()
    })
    .then(() => {
      showToast('Message sent successfully!', false);
      form.reset();
    })
    .catch((error) => {
      showToast('Failed to send message. Please try again.', true);
    });
  });
}

/* ─── TOAST ──────────────────────────────────── */
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => t.classList.remove('show'), 3500);
}

/* ─── INIT ───────────────────────────────────── */
async function init() {
  const data = await loadData();

  if (data) {
    renderMeta(data);
    renderHero(data);
    renderAbout(data);
    renderSkills(data);
    renderProjects(data);
    renderAchievements(data);
    renderCertificates(data);
    renderLinks(data);
    renderContact(data);
    renderFooter(data);
  }

  initParticles();
  initSpotlight();
  initNavbar();
  initTheme();
  initReveal();
  animateSkillBars();
  initTerminal();
  initContactForm();
}

document.addEventListener('DOMContentLoaded', init);
