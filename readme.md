# 0xKey Portfolio + CTF Challenges

Personal portfolio of 0xKey (cybersecurity student, CTF player) with an integrated,
server-validated CTF challenge platform and a token-authenticated admin panel.

Stack: vanilla HTML/CSS/JS (no framework) · Netlify Functions (Node.js) ·
Netlify Blobs for challenge storage · Netlify Forms for the contact form.

## Project structure

```
├── public/                        # Static site (netlify.toml publish dir)
│   ├── index.html                 # Portfolio (home)
│   ├── articles.html              # Articles & writeups
│   ├── ctf.html                   # Public CTF challenge page
│   ├── assets/
│   │   ├── css/  (style.css, ctf.css)
│   │   ├── js/   (main.js, articles.js, ctf.js)
│   │   ├── img/  (profile, favicon, OG images)
│   │   └── cert/ (certificate gallery)
│   ├── data/
│   │   └── portfolio-data.json    # All portfolio content (single source of truth)
│   └── oxkeyisbelouadahsaadedinnekoussai2007/
│       └── index.html             # Admin panel (obscure URL, noindex)
│       ├── css/admin.css
│       └── js/admin.js
├── netlify/
│   └── functions/                 # Serverless API (endpoint name = file name)
│       ├── login.js               # Admin login → issues HMAC bearer token
│       ├── ctf-check.js           # POST { challengeId, answer } → { correct }
│       ├── ctf-challenges.js      # GET published challenges (no secrets)
│       ├── ctf-writeup.js         # POST gated writeup (correct flag required)
│       ├── ctf-attachment.js      # GET published challenge files
│       ├── ctf-admin-challenges.js# Admin CRUD (collection)
│       ├── ctf-admin-challenge.js # Admin CRUD (item, ?id=)
│       ├── lib/                   # Shared modules (NOT endpoints)
│       │   ├── store.js           # Blobs storage (+ local file fallback)
│       │   ├── auth.js            # Token issue/verify (timing-safe)
│       │   ├── validate.js        # Server-side input validation
│       │   ├── http.js            # Response helpers, audit log, admin view
│       │   └── seed.js            # Initial challenge migration data
│       ├── package.json           # Function dependencies (@netlify/blobs)
│       └── package-lock.json
├── netlify.toml                   # Build, headers, /api/* rewrites
├── robots.txt                     # Blocks the admin path from crawlers
└── README.md
```

### Why this layout

- **`public/`** — everything served to browsers lives here and only here.
  Sensitive data (flag salts/hashes, attachments) lives in Netlify Blobs or
  the local-dev tmp fallback, never in `public/`.
- **`public/data/`** — content separated from code; the admin panel edits the
  same shape and exports it back to `portfolio-data.json`.
- **Admin under an obscure, noindexed path** — defense in depth; real
  protection is the HMAC bearer token required by every admin endpoint.
- **`netlify/functions/lib/`** — shared code lives in a subdirectory because
  Netlify only creates endpoints from top-level files (a file in a subfolder
  must be named `index` or match the folder to become an endpoint), so `lib/`
  modules can never accidentally become public routes. Handler files stay flat
  so endpoint names (`ctf-check`, `login`, …) are unchanged.
- **kebab-case files, `?v=N` cache-busting** — the conventions already used
  across the codebase.

## API routes (via `netlify.toml` rewrites)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/ctf/challenges` | — | Published challenges (no salt/hash) |
| POST | `/api/ctf/check` | — | `{ challengeId, answer }` → `{ correct }` |
| POST | `/api/ctf/writeup` | — | Writeup, only with correct flag |
| GET | `/api/ctf/attachment?id=&file=` | — | Published challenge files |
| GET/POST | `/api/admin/ctf/challenges` | Bearer | Admin list / create |
| GET/PUT/DELETE | `/api/admin/ctf/challenges/:id` | Bearer | Admin read / edit / soft-delete |

## Security model (CTF)

- Flags stored server-side only as `SHA256(salt + flag)` with a unique
  32-byte salt per challenge; compared with `crypto.timingSafeEqual`.
- Rate limit: 10 attempts per challenge per IP per minute (`429`).
- Generic failure responses (unknown ID ≡ wrong flag); input capped at 200 chars.
- Admin plaintext flags are hashed on save and never stored, logged, or returned.
- `Strict-Transport-Security` + `X-Frame-Options: DENY` + `nosniff` on all responses.

## Environment variables (Netlify dashboard, never in repo)

| Var | Purpose |
|-----|---------|
| `ADMIN_USER` / `ADMIN_PASS` | Admin panel credentials |
| `ADMIN_TOKEN_SECRET` | HMAC key for admin API tokens (falls back to `ADMIN_PASS`) |

## Local development

```bash
# Frontend only: serve public/
npx serve public
# Full stack (functions + rewrites): uses netlify.toml as-is
netlify dev
```

Without `netlify dev`, functions fall back to file storage under
`$CTF_STORE_PATH` (or the OS tmp dir) so the API still runs for tests.
