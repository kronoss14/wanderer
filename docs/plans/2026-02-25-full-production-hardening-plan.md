# Full Production Hardening — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the Wanderer hiking tourism website for production by fixing all critical security vulnerabilities, adding error handling, input validation, proper session management, upload improvements, and code quality fixes — with zero negative UX/UI impact.

**Architecture:** Express.js + EJS server-rendered site. JSON file-based data storage in `data/`. Admin panel at `/admin` with cookie-based auth. Image uploads stored in `public/images/uploads/`. All changes are additive or replacement — no new pages, no layout changes, no visual regressions.

**Tech Stack:** Node.js (ESM), Express 5, EJS, bcrypt, helmet, express-rate-limit, express-validator, cookie-parser, express-session, multer, sharp

---

## Task 1: Install All Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install production dependencies**

Run:
```bash
cd /home/vaskak/projects/wanderer && npm install helmet express-rate-limit express-validator cookie-parser express-session multer sharp bcrypt
```

Expected: 8 packages added, `package.json` updated, `package-lock.json` updated.

**Step 2: Verify installation**

Run:
```bash
cd /home/vaskak/projects/wanderer && node -e "import('helmet').then(() => console.log('helmet OK')); import('express-rate-limit').then(() => console.log('rate-limit OK')); import('express-validator').then(() => console.log('validator OK')); import('cookie-parser').then(() => console.log('cookie-parser OK')); import('express-session').then(() => console.log('session OK')); import('multer').then(() => console.log('multer OK')); import('sharp').then(() => console.log('sharp OK')); import('bcrypt').then(() => console.log('bcrypt OK'));"
```

Expected: All 8 print "OK".

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install security and hardening dependencies"
```

---

## Task 2: Environment Variable Validation & Startup Guard

**Files:**
- Modify: `server.js` (lines 1-16)
- Modify: `.env` (add new required vars)

**Step 1: Add env validation to server.js**

Add this block at the very top of `server.js`, before any imports that use env vars:

```javascript
// ─── Env validation (must be first) ───
const REQUIRED_ENV = ['EMAIL_USER', 'EMAIL_PASS', 'ADMIN_PASSWORD_HASH', 'SESSION_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in all values.');
  process.exit(1);
}
```

**Step 2: Generate a bcrypt hash for the admin password**

Run:
```bash
cd /home/vaskak/projects/wanderer && node -e "import('bcrypt').then(b => b.default.hash('wanderer-admin-2025', 12).then(h => console.log(h)))"
```

Copy the hash output.

**Step 3: Update .env with new variables**

Add to `.env`:
```
ADMIN_PASSWORD_HASH=<paste bcrypt hash from step 2>
SESSION_SECRET=<generate a random 64-char hex string>
```

Generate the session secret:
```bash
node -e "import('node:crypto').then(c => console.log(c.randomBytes(32).toString('hex')))"
```

**Step 4: Create .env.example (without secrets)**

Create `.env.example`:
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ADMIN_PASSWORD_HASH=<run: node -e "import('bcrypt').then(b => b.default.hash('your-password', 12).then(console.log))">
SESSION_SECRET=<run: node -e "import('node:crypto').then(c => console.log(c.randomBytes(32).toString('hex')))">
```

**Step 5: Verify server starts with env vars**

Run:
```bash
cd /home/vaskak/projects/wanderer && node --env-file=.env server.js
```

Expected: `Wanderer server running at http://localhost:3000`

Kill the server (Ctrl+C).

**Step 6: Verify server refuses to start without env vars**

Run:
```bash
cd /home/vaskak/projects/wanderer && node server.js
```

Expected: Error message about missing env vars, exit code 1.

**Step 7: Commit**

```bash
git add server.js .env.example
git commit -m "feat: add startup env validation and .env.example"
```

---

## Task 3: Rewrite helpers/auth.js — bcrypt + session-based auth

**Files:**
- Modify: `helpers/auth.js` (full rewrite)

**Step 1: Rewrite auth.js**

Replace the entire contents of `helpers/auth.js` with:

```javascript
import bcrypt from 'bcrypt';

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

export async function checkPassword(password) {
  if (!password || !ADMIN_PASSWORD_HASH) return false;
  return bcrypt.compare(password, ADMIN_PASSWORD_HASH);
}

export function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect('/admin/login');
}
```

Key changes:
- `checkPassword` is now async (returns Promise)
- Uses bcrypt.compare instead of plain text
- `requireAdmin` checks `req.session.isAdmin` instead of HMAC cookie
- Removed: `sign()`, `verify()`, `parseCookies()`, `setAuthCookie()`, `clearAuthCookie()`
- No more hardcoded fallback password or secret

**Step 2: Verify file saved correctly**

Run:
```bash
cd /home/vaskak/projects/wanderer && node --env-file=.env -e "import('./helpers/auth.js').then(m => console.log(Object.keys(m)))"
```

Expected: `[ 'checkPassword', 'requireAdmin' ]`

**Step 3: Commit**

```bash
git add helpers/auth.js
git commit -m "feat: replace plaintext auth with bcrypt + session-based auth"
```

---

## Task 4: Add Middleware Stack to server.js — helmet, cookie-parser, session, CSRF, rate-limit

**Files:**
- Modify: `server.js` (add middleware between body parsing and routes)

**Step 1: Add imports at top of server.js** (after the env validation block)

```javascript
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
```

**Step 2: Add helmet middleware** (after `app.use(express.json({ limit: '15mb' }));`)

```javascript
// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));
```

**Step 3: Add cookie-parser and session middleware** (after helmet)

```javascript
// Cookies & sessions
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'wanderer.sid',
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

**Step 4: Add CSRF token middleware** (after session, before routes)

```javascript
// CSRF token — generate for every request, validate on POST
import { randomBytes } from 'node:crypto';

app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (!req.session.csrfToken) {
      req.session.csrfToken = randomBytes(32).toString('hex');
    }
    res.locals.csrfToken = req.session.csrfToken;
    return next();
  }
  // POST/PUT/DELETE: validate token
  const token = req.body._csrf || req.headers['x-csrf-token'];
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).send('Invalid or missing CSRF token');
  }
  next();
});
```

**Step 5: Reduce JSON body limit** (now that we'll use multer for uploads)

Change:
```javascript
app.use(express.json({ limit: '15mb' }));
```
To:
```javascript
app.use(express.json());
```

**Step 6: Verify server starts**

Run:
```bash
cd /home/vaskak/projects/wanderer && node --env-file=.env server.js
```

Expected: Starts without errors. Kill it.

**Step 7: Commit**

```bash
git add server.js
git commit -m "feat: add helmet, session, cookie-parser, and CSRF middleware"
```

---

## Task 5: Add CSRF Tokens to All Forms

**Files:**
- Modify: `views/admin/login.ejs` (line 19)
- Modify: `views/admin/hikes-form.ejs` (line 5)
- Modify: `views/admin/guides-form.ejs` (line 5)
- Modify: `views/admin/pricing-form.ejs` (line 5)
- Modify: `views/admin/gallery-form.ejs` (line 5)
- Modify: `views/admin/hikes-list.ejs` (line 30 — delete form)
- Modify: `views/admin/guides-list.ejs` (line 26 — delete form)
- Modify: `views/admin/pricing-list.ejs` (line 28 — delete form)
- Modify: `views/admin/gallery-list.ejs` (line 26 — delete form)
- Modify: `views/pages/contact.ejs` (line 23)
- Modify: `views/pages/hike-detail.ejs` (line 122)

**Step 1: Add hidden CSRF input to every `<form>` tag**

In each form, immediately after the opening `<form ...>` tag, add:
```html
<input type="hidden" name="_csrf" value="<%= csrfToken %>">
```

For `login.ejs` specifically, since it doesn't use the main layout, ensure `csrfToken` is passed from the route.

**Step 2: Update admin login route to pass csrfToken**

In `routes/admin.js`, update the login GET handler (line 31):
```javascript
router.get('/login', (req, res) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = (await import('node:crypto')).randomBytes(32).toString('hex');
  }
  res.render(join(__dirname, '..', 'views', 'admin', 'login.ejs'), {
    layout: false, error: null, csrfToken: req.session.csrfToken
  });
});
```

Note: The login route is outside `requireAdmin` so it needs to be async and generate the token.

**Step 3: Update admin-upload.js to send CSRF token**

In `public/js/admin-upload.js`, the fetch call (line 142) needs to include the CSRF token. Add to the upload function:

```javascript
// Get CSRF token from the page's form
var csrfToken = document.querySelector('input[name="_csrf"]')?.value || '';

fetch('/admin/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify({ filename: file.name, data: dataUrl })
})
```

**Step 4: Test by loading the site**

Run:
```bash
cd /home/vaskak/projects/wanderer && node --env-file=.env server.js
```

- Visit `http://localhost:3000/contact` — form should load, submit should work
- Visit `http://localhost:3000/admin/login` — form should load, login should work
- Submit any admin form — should work with CSRF token

**Step 5: Commit**

```bash
git add views/ public/js/admin-upload.js routes/admin.js
git commit -m "feat: add CSRF tokens to all forms"
```

---

## Task 6: Add Login Rate Limiting

**Files:**
- Modify: `routes/admin.js` (login POST route, lines 34-39)

**Step 1: Add rate limiter import and config**

At the top of `routes/admin.js`, add:

```javascript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false
});
```

**Step 2: Apply limiter to login POST route**

Change:
```javascript
router.post('/login', (req, res) => {
```
To:
```javascript
router.post('/login', loginLimiter, async (req, res) => {
```

**Step 3: Update the login handler for async checkPassword**

```javascript
router.post('/login', loginLimiter, async (req, res) => {
  if (await checkPassword(req.body.password)) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  res.render(join(__dirname, '..', 'views', 'admin', 'login.ejs'), {
    layout: false, error: 'Invalid password', csrfToken: req.session.csrfToken
  });
});
```

**Step 4: Update logout route to destroy session**

Change the logout handler:
```javascript
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});
```

**Step 5: Remove old auth imports that no longer exist**

In `routes/admin.js` line 7, change:
```javascript
import { checkPassword, setAuthCookie, clearAuthCookie, requireAdmin } from '../helpers/auth.js';
```
To:
```javascript
import { checkPassword, requireAdmin } from '../helpers/auth.js';
```

**Step 6: Commit**

```bash
git add routes/admin.js
git commit -m "feat: add login rate limiting and session-based auth flow"
```

---

## Task 7: Create helpers/logger.js — Structured Logging + Audit Trail

**Files:**
- Create: `helpers/logger.js`

**Step 1: Create the logger helper**

```javascript
import { appendFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIT_PATH = join(__dirname, '..', 'data', 'audit-log.json');
const isProd = process.env.NODE_ENV === 'production';

export function log(level, message, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta
  };
  if (isProd && level === 'error') {
    delete entry.stack;
  }
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(entry));
}

export async function audit(action, details = {}) {
  const entry = {
    ts: new Date().toISOString(),
    action,
    ...details
  };
  try {
    await appendFile(AUDIT_PATH, JSON.stringify(entry) + '\n', 'utf-8');
  } catch {
    log('error', 'Failed to write audit log', { action });
  }
}
```

**Step 2: Verify it loads**

Run:
```bash
cd /home/vaskak/projects/wanderer && node -e "import('./helpers/logger.js').then(m => { m.log('info', 'test'); console.log('OK'); })"
```

Expected: JSON log entry printed, then "OK".

**Step 3: Commit**

```bash
git add helpers/logger.js
git commit -m "feat: add structured logger and audit trail helper"
```

---

## Task 8: Harden helpers/data.js — Error Handling, File Locking, Graceful Fallbacks

**Files:**
- Modify: `helpers/data.js` (full rewrite)

**Step 1: Rewrite data.js**

```javascript
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

// Simple in-memory mutex per file
const locks = new Map();

async function withLock(filename, fn) {
  while (locks.get(filename)) {
    await locks.get(filename);
  }
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  locks.set(filename, promise);
  try {
    return await fn();
  } finally {
    locks.delete(filename);
    resolve();
  }
}

export async function readJSON(filename) {
  const filepath = join(dataDir, filename);
  try {
    const raw = await readFile(filepath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    log('error', `Failed to read ${filename}`, { error: err.message });
    return [];
  }
}

export async function writeJSON(filename, data) {
  const filepath = join(dataDir, filename);
  await withLock(filename, async () => {
    await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
  });
}

export async function appendJSON(filename, entry) {
  return withLock(filename, async () => {
    const filepath = join(dataDir, filename);
    let data;
    try {
      const raw = await readFile(filepath, 'utf-8');
      data = JSON.parse(raw);
    } catch {
      data = [];
    }
    data.push(entry);
    await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
    return data;
  });
}
```

Key changes:
- `readJSON` returns `[]` on error instead of crashing
- `writeJSON` uses file locking
- `appendJSON` uses file locking (prevents race condition)
- Errors are logged via structured logger

**Step 2: Verify it works**

Run:
```bash
cd /home/vaskak/projects/wanderer && node --env-file=.env -e "import('./helpers/data.js').then(async m => { const d = await m.readJSON('hikes.json'); console.log(d.length, 'hikes loaded'); })"
```

Expected: Number of hikes printed.

**Step 3: Commit**

```bash
git add helpers/data.js
git commit -m "feat: add file locking, error handling, and graceful fallbacks to data layer"
```

---

## Task 9: Add asyncHandler Wrapper + Error Page to All Routes

**Files:**
- Create: `helpers/async-handler.js`
- Modify: `routes/index.js`
- Modify: `routes/about.js`
- Modify: `routes/contact.js`
- Modify: `routes/hikes.js`
- Modify: `routes/gallery.js`
- Modify: `routes/reviews.js`
- Create: `views/pages/error.ejs`
- Modify: `server.js` (add error handler)

**Step 1: Create async-handler.js**

```javascript
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

**Step 2: Create error.ejs**

```html
<section class="page-hero" style="min-height: 60vh; display: flex; align-items: center; justify-content: center;">
  <div class="container" style="text-align: center;">
    <h1 style="font-size: 2rem; margin-bottom: 1rem;">Something went wrong</h1>
    <p style="color: var(--text-muted); margin-bottom: 2rem;">We're sorry, something unexpected happened. Please try again later.</p>
    <a href="/" class="btn btn-primary">Go Home</a>
  </div>
</section>
```

**Step 3: Add global error handler in server.js** (after the 404 handler)

```javascript
// Error handler
app.use((err, req, res, next) => {
  const { log } = await import('./helpers/logger.js');
  log('error', 'Unhandled route error', { path: req.path, error: err.message });
  res.status(500).render('pages/error', { title: 'Error' });
});
```

Note: Since this is ESM, use a sync approach or import logger at the top of server.js:
```javascript
import { log } from './helpers/logger.js';
```

Then the error handler:
```javascript
app.use((err, req, res, next) => {
  log('error', 'Unhandled route error', { path: req.path, error: err.message });
  res.status(500).render('pages/error', { title: 'Error' });
});
```

**Step 4: Wrap every async route handler in all route files**

In each route file, add the import:
```javascript
import { asyncHandler } from '../helpers/async-handler.js';
```

Then wrap every `async (req, res) => { ... }` with `asyncHandler(...)`. Examples:

`routes/index.js`:
```javascript
router.get('/', asyncHandler(async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const reviews = await readJSON('reviews.json');
  const featured = hikes.filter(h => h.featured);
  const topReviews = reviews.filter(r => r.rating === 5).slice(0, 3);
  res.render('pages/home', { title: 'Home', featured, topReviews, hikes });
}));
```

Apply the same pattern to ALL async route handlers in:
- `routes/about.js` (1 handler)
- `routes/contact.js` (1 handler — POST)
- `routes/hikes.js` (3 handlers)
- `routes/gallery.js` (2 handlers)
- `routes/reviews.js` (1 handler)
- `routes/admin.js` (all async handlers — dashboard, all CRUD operations)

**Step 5: Verify server starts and pages load**

Run:
```bash
cd /home/vaskak/projects/wanderer && node --env-file=.env server.js
```

Visit `http://localhost:3000/` — should load normally.

**Step 6: Commit**

```bash
git add helpers/async-handler.js views/pages/error.ejs server.js routes/
git commit -m "feat: add async error handling to all routes with graceful error page"
```

---

## Task 10: Input Validation — Contact Form & Registration Form

**Files:**
- Modify: `routes/contact.js`
- Modify: `routes/hikes.js`

**Step 1: Add validation to contact form**

Rewrite `routes/contact.js`:

```javascript
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { appendJSON } from '../helpers/data.js';
import { sendContactEmail } from '../helpers/mailer.js';
import { asyncHandler } from '../helpers/async-handler.js';
import { log } from '../helpers/logger.js';

const router = Router();

router.get('/', (req, res) => {
  res.render('pages/contact', { title: 'Contact Us', success: false, errors: [] });
});

const contactValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 200 }),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 5000 })
];

router.post('/', contactValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('pages/contact', {
      title: 'Contact Us', success: false, errors: errors.array()
    });
  }

  const { name, email, subject, message } = req.body;
  await appendJSON('contact-submissions.json', {
    id: Date.now(),
    name,
    email,
    subject,
    message,
    date: new Date().toISOString()
  });

  try {
    await sendContactEmail({ name, email, subject, message });
  } catch (err) {
    log('error', 'Failed to send contact email', { error: err.message });
  }

  res.render('pages/contact', { title: 'Contact Us', success: true, errors: [] });
}));

export default router;
```

**Step 2: Add validation to hike registration**

In `routes/hikes.js`, add validation to the POST `/:id/register` handler:

```javascript
import { body, validationResult } from 'express-validator';

const registrationValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone is required').isLength({ max: 30 })
];
```

Apply to the register route:
```javascript
router.post('/:id/register', registrationValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  const hikes = await readJSON('hikes.json');
  const reviews = await readJSON('reviews.json');
  const hike = hikes.find(h => h.id === req.params.id);
  if (!hike) return res.status(404).render('pages/404', { title: 'Not Found' });

  if (!errors.isEmpty()) {
    const hikeReviews = reviews.filter(r => r.hikeId === hike.id);
    return res.status(400).render('pages/hike-detail', {
      title: hike.name, hike, hikeReviews, success: false, errors: errors.array()
    });
  }

  const { name, email, phone } = req.body;
  await appendJSON('registrations.json', {
    id: Date.now(),
    hikeId: hike.id,
    name, email, phone,
    date: new Date().toISOString()
  });

  try {
    await sendRegistrationEmail({ name, email, phone, hikeName: hike.name });
  } catch (err) {
    log('error', 'Registration email failed', { error: err.message, hikeId: hike.id });
  }

  const hikeReviews = reviews.filter(r => r.hikeId === hike.id);
  res.render('pages/hike-detail', { title: hike.name, hike, hikeReviews, success: true, errors: [] });
}));
```

**Step 3: Commit**

```bash
git add routes/contact.js routes/hikes.js
git commit -m "feat: add server-side input validation to contact and registration forms"
```

---

## Task 11: Input Validation — Admin Forms + URL Validation + Audit Logging

**Files:**
- Modify: `routes/admin.js`

This is the largest task. Key changes to `routes/admin.js`:

**Step 1: Add imports**

At the top of `routes/admin.js`, add:
```javascript
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../helpers/async-handler.js';
import { audit, log } from '../helpers/logger.js';
```

**Step 2: Create URL validation helper**

Add near the top of the file:
```javascript
function isValidImageUrl(url) {
  if (!url) return true; // empty is OK for optional fields
  if (url.startsWith('/images/')) return true;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

**Step 3: Create shared form parsers (DRY extraction)**

```javascript
function parseHikeBody(b, id) {
  return {
    id,
    name: b.name,
    type: b.type,
    duration: b.duration,
    distance: b.distance,
    difficulty: b.difficulty,
    elevation: b.elevation,
    groupSize: b.groupSize,
    price: b.price ? Math.max(0, Number(b.price)) : 0,
    featured: b.featured === 'true',
    summary: b.summary,
    description: b.description,
    highlights: textToArray(b.highlights),
    included: textToArray(b.included),
    notIncluded: textToArray(b.notIncluded),
    images: textToArray(b.images).filter(isValidImageUrl),
    heroImage: b.heroImage,
    cardImage: b.cardImage,
    region: b.region,
    dates: textToArray(b.dates),
    messengerLink: b.messengerLink || '',
    whatsappLink: b.whatsappLink || ''
  };
}

function parseGuideBody(b, id) {
  return {
    id,
    name: b.name,
    role: b.role,
    bio: b.bio,
    specialties: textToArray(b.specialties),
    image: b.image
  };
}

function parsePricingBody(b, id) {
  return {
    id,
    tier: b.tier,
    price: b.price !== '' ? Math.max(0, Number(b.price)) : null,
    priceLabel: b.priceLabel,
    unit: b.unit,
    description: b.description,
    features: textToArray(b.features),
    highlighted: b.highlighted === 'true',
    cta: b.cta
  };
}

function parseGalleryBody(b, id) {
  return {
    id,
    title: b.title,
    date: b.date,
    description: b.description,
    mainImage: b.mainImage,
    images: textToArray(b.images).filter(isValidImageUrl),
    hikeId: b.hikeId || ''
  };
}
```

**Step 4: Add validation rules for hikes**

```javascript
const hikeValidation = [
  body('id').trim().notEmpty().withMessage('ID is required'),
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 200 }),
  body('type').isIn(['day', 'multi-day', 'cultural']).withMessage('Invalid type'),
  body('price').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Price must be positive'),
  body('heroImage').custom(v => !v || isValidImageUrl(v)).withMessage('Invalid hero image URL'),
  body('cardImage').custom(v => !v || isValidImageUrl(v)).withMessage('Invalid card image URL')
];
```

**Step 5: Apply validation + audit to all CRUD handlers**

For each POST handler, add the validation middleware and wrap in asyncHandler. Add `audit()` calls after successful create/edit/delete operations.

Example for hike create:
```javascript
router.post('/hikes', hikeValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'hikes-form.ejs'), {
      title: 'New Hike', editing: false, hike: req.body, errors: errors.array()
    });
  }
  const hikes = await readJSON('hikes.json');
  const hike = parseHikeBody(req.body, req.body.id);
  hikes.push(hike);
  await writeJSON('hikes.json', hikes);
  await audit('hike.create', { id: hike.id, name: hike.name });
  res.redirect('/admin/hikes');
}));
```

Example for hike delete:
```javascript
router.post('/hikes/delete/:id', asyncHandler(async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const filtered = hikes.filter(h => h.id !== req.params.id);
  await writeJSON('hikes.json', filtered);
  await audit('hike.delete', { id: req.params.id });
  res.redirect('/admin/hikes');
}));
```

Apply the same pattern to guides, pricing, and gallery CRUD. Each create/edit/delete gets an audit call.

**Step 6: Wrap all remaining async handlers in asyncHandler**

Dashboard, all list routes, all edit-form GET routes.

**Step 7: Commit**

```bash
git add routes/admin.js
git commit -m "feat: add input validation, URL sanitization, DRY form parsers, and audit logging to admin"
```

---

## Task 12: Fix XSS in Templates

**Files:**
- Modify: `views/pages/hike-detail.ejs` (line 3, line 106, line 112, line 156)
- Modify: `views/pages/gallery-detail.ejs` (line 3, line 31, line 32)
- Modify: `views/pages/gallery.ejs` (line 19)
- Create: `helpers/escape-url.js`

**Step 1: Create URL escape helper**

```javascript
export function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
```

**Step 2: Register helper as a global local in server.js**

In `server.js`, add import:
```javascript
import { escapeAttr } from './helpers/escape-url.js';
```

In the locals middleware:
```javascript
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.siteName = 'Wanderer';
  res.locals.siteNameGeo = 'მოხეტიალე';
  res.locals.escapeAttr = escapeAttr;
  // ...
});
```

**Step 3: Fix hike-detail.ejs**

Line 3 — change:
```ejs
<div class="detail-hero-bg" style="background-image: url('<%= hike.heroImage %>')"></div>
```
To:
```ejs
<div class="detail-hero-bg" style="background-image: url('<%- escapeAttr(hike.heroImage) %>')"></div>
```

Line 106 — change `href="<%= hike.messengerLink %>"` to `href="<%- escapeAttr(hike.messengerLink) %>">`

Line 112 — change `href="<%= hike.whatsappLink %>"` to `href="<%- escapeAttr(hike.whatsappLink) %>">`

Line 156 — change `src="<%= img %>"` to `src="<%- escapeAttr(img) %>"`

**Step 4: Fix gallery-detail.ejs**

Line 3 — change:
```ejs
<div class="detail-hero-bg" style="background-image: url('<%= item.mainImage %>')"></div>
```
To:
```ejs
<div class="detail-hero-bg" style="background-image: url('<%- escapeAttr(item.mainImage) %>')"></div>
```

Line 31 — change:
```ejs
data-full="<%= img %>" data-title="<%= item.title %>"
```
To:
```ejs
data-full="<%- escapeAttr(img) %>" data-title="<%- escapeAttr(item.title) %>"
```

Line 32 — change `src="<%= img %>"` to `src="<%- escapeAttr(img) %>"`

**Step 5: Commit**

```bash
git add helpers/escape-url.js server.js views/
git commit -m "fix: escape URLs in template attributes to prevent XSS"
```

---

## Task 13: Switch Uploads from Base64 to Multipart (multer + sharp)

**Files:**
- Modify: `routes/admin.js` (upload handler, lines 46-89)
- Modify: `public/js/admin-upload.js` (full rewrite of uploadFile function)

**Step 1: Rewrite the server-side upload handler**

In `routes/admin.js`, replace the entire upload section with:

```javascript
import multer from 'multer';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';

const UPLOAD_DIR = join(__dirname, '..', 'public', 'images', 'uploads');
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);

// Ensure upload dir exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const id = randomUUID();
  const ext = 'jpeg'; // normalize to jpeg after sharp processing

  // Skip sharp processing for SVG
  if (req.file.mimetype === 'image/svg+xml') {
    const svgName = `${id}.svg`;
    writeFileSync(join(UPLOAD_DIR, svgName), req.file.buffer);
    return res.json({ url: `/images/uploads/${svgName}` });
  }

  // Process with sharp: resize to max 1920px wide, compress to 80% JPEG
  const filename = `${id}.${ext}`;
  await sharp(req.file.buffer)
    .resize(1920, null, { withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(join(UPLOAD_DIR, filename));

  // Generate thumbnail (400px)
  const thumbName = `${id}-thumb.${ext}`;
  await sharp(req.file.buffer)
    .resize(400, null, { withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toFile(join(UPLOAD_DIR, thumbName));

  await audit('upload', { filename });
  res.json({ url: `/images/uploads/${filename}` });
}));
```

**Step 2: Rewrite the client-side uploadFile function in admin-upload.js**

Replace the `uploadFile` function (lines 119-165):

```javascript
function uploadFile(file, onSuccess, statusEl) {
  // Validate extension (client-side check — server also validates MIME)
  var ext = file.name.split('.').pop().toLowerCase();
  if (ALLOWED_EXT.indexOf(ext) === -1) {
    statusEl.textContent = 'Invalid file type: .' + ext;
    statusEl.className = 'upload-status upload-error';
    return;
  }

  if (file.size > MAX_SIZE) {
    statusEl.textContent = 'File too large (max 10 MB)';
    statusEl.className = 'upload-status upload-error';
    return;
  }

  statusEl.textContent = 'Uploading...';
  statusEl.className = 'upload-status';

  var csrfToken = document.querySelector('input[name="_csrf"]')?.value || '';

  var formData = new FormData();
  formData.append('file', file);

  fetch('/admin/upload', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
    body: formData
  })
    .then(function (res) { return res.json(); })
    .then(function (json) {
      if (json.url) {
        statusEl.textContent = 'Uploaded';
        statusEl.className = 'upload-status upload-success';
        onSuccess(json.url);
      } else {
        statusEl.textContent = json.error || 'Upload failed';
        statusEl.className = 'upload-status upload-error';
      }
    })
    .catch(function () {
      statusEl.textContent = 'Upload failed';
      statusEl.className = 'upload-status upload-error';
    });
}
```

**Step 3: Handle multer errors**

Add a multer error handler after the upload route in `routes/admin.js`:

```javascript
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'File type not allowed') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});
```

**Step 4: Test upload**

Run server, go to admin, try uploading an image. Verify:
- File appears in `/images/uploads/` with UUID name
- File is JPEG, max 1920px wide
- Thumbnail exists with `-thumb` suffix
- Original filename is not preserved

**Step 5: Commit**

```bash
git add routes/admin.js public/js/admin-upload.js
git commit -m "feat: switch to multipart uploads with sharp compression and UUID filenames"
```

---

## Task 14: Consistent String-Based Gallery IDs + Data Migration

**Files:**
- Modify: `routes/gallery.js`
- Modify: `routes/admin.js` (gallery CRUD section)
- Modify: `data/gallery.json` (migrate existing IDs)

**Step 1: Create a slug helper function**

Add to `routes/admin.js` (or a shared helper):

```javascript
function toSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // remove non-word chars (keeps Georgian chars with \w in Unicode)
    .replace(/[\s_]+/g, '-')  // spaces/underscores to dashes
    .replace(/-+/g, '-')      // collapse dashes
    .replace(/^-|-$/g, '')    // trim dashes
    || `item-${Date.now()}`;  // fallback
}
```

**Step 2: Migrate existing gallery.json data**

Run a one-time migration script:
```bash
cd /home/vaskak/projects/wanderer && node -e "
import { readFile, writeFile } from 'node:fs/promises';
const raw = await readFile('data/gallery.json', 'utf-8');
const gallery = JSON.parse(raw);
const slugMap = { 1: 'juta-chaukhi', 2: 'batetis-tba', 3: 'svaneti' };
gallery.forEach(g => { g.id = slugMap[g.id] || 'item-' + g.id; });
await writeFile('data/gallery.json', JSON.stringify(gallery, null, 2));
console.log('Migrated', gallery.length, 'items');
"
```

**Step 3: Update routes/gallery.js**

Change line 13:
```javascript
const item = gallery.find(g => g.id === Number(req.params.id));
```
To:
```javascript
const item = gallery.find(g => g.id === req.params.id);
```

**Step 4: Update routes/admin.js gallery section**

All `Number(req.params.id)` in gallery routes become `req.params.id`.

Gallery create:
```javascript
const nextId = toSlug(b.title);
// Ensure uniqueness
const baseId = nextId;
let id = baseId;
let counter = 1;
while (gallery.some(g => g.id === id)) {
  id = `${baseId}-${counter++}`;
}
```

Gallery edit/delete: use `req.params.id` directly (string comparison).

**Step 5: Commit**

```bash
git add routes/gallery.js routes/admin.js data/gallery.json
git commit -m "feat: migrate gallery to string-based slug IDs"
```

---

## Task 15: Sanitize Email HTML to Prevent XSS in Mailer

**Files:**
- Modify: `helpers/mailer.js` (line 44)

**Step 1: Fix the HTML injection in mailer.js**

Line 44 has:
```javascript
html: `<p>${message.replace(/\n/g, '<br>')}</p>`
```

This allows HTML injection. Change to escape HTML first:

Add a simple escape function at the top of `mailer.js`:
```javascript
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

Then change the email HTML to escape all user inputs:
```javascript
html: `
  <h2>New Contact Form Submission</h2>
  <p><strong>Name:</strong> ${escapeHtml(name)}</p>
  <p><strong>Email:</strong> ${escapeHtml(email)}</p>
  <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
  <hr>
  <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
`
```

Also escape in `sendRegistrationEmail`:
```javascript
html: `
  <h2>New Hike Registration</h2>
  <p><strong>Hike:</strong> ${escapeHtml(hikeName)}</p>
  <hr>
  <p><strong>Name:</strong> ${escapeHtml(name)}</p>
  <p><strong>Email:</strong> ${escapeHtml(email)}</p>
  <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
`
```

**Step 2: Commit**

```bash
git add helpers/mailer.js
git commit -m "fix: escape HTML in email templates to prevent injection"
```

---

## Task 16: Final Integration Test

**Files:** None (testing only)

**Step 1: Start the server**

```bash
cd /home/vaskak/projects/wanderer && node --env-file=.env server.js
```

**Step 2: Test public pages**

- Visit `http://localhost:3000/` — homepage loads
- Visit `http://localhost:3000/hikes` — hikes list loads
- Visit `http://localhost:3000/gallery` — gallery loads (verify slug URLs work)
- Visit `http://localhost:3000/contact` — contact form loads
- Visit `http://localhost:3000/about` — about page loads
- Visit `http://localhost:3000/reviews` — reviews page loads
- Visit `http://localhost:3000/nonexistent` — 404 page shows

**Step 3: Test contact form**

Submit the contact form with valid data. Verify:
- Success message appears
- `data/contact-submissions.json` has new entry

Submit with empty fields. Verify:
- Validation errors shown (not a crash)

**Step 4: Test admin**

- Visit `http://localhost:3000/admin/login` — login form shows
- Try wrong password 6 times — rate limited after 5
- Login with correct password — redirected to dashboard
- Create a new hike — verify validation works, audit log gets entry
- Upload an image — verify compressed, UUID filename, thumbnail created
- Edit a hike — verify data saved correctly
- Delete a hike — verify removed, audit logged
- Test gallery with slug URLs — verify `/gallery/svaneti` works
- Logout — verify session destroyed

**Step 5: Check security headers**

```bash
curl -I http://localhost:3000/
```

Verify headers include: `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, etc.

**Step 6: Verify no CSRF bypass**

```bash
curl -X POST http://localhost:3000/contact -d "name=test&email=test@test.com&subject=test&message=test"
```

Expected: 403 "Invalid or missing CSRF token"

**Step 7: Final commit**

If any fixes were needed during testing, commit them:
```bash
git add -A
git commit -m "fix: integration test fixes"
```

---

## Summary of All Tasks

| # | Task | Files | Commit |
|---|------|-------|--------|
| 1 | Install dependencies | package.json | `chore: install security and hardening dependencies` |
| 2 | Env validation + startup guard | server.js, .env, .env.example | `feat: add startup env validation` |
| 3 | Rewrite auth.js (bcrypt + sessions) | helpers/auth.js | `feat: replace plaintext auth with bcrypt` |
| 4 | Middleware stack (helmet, session, CSRF) | server.js | `feat: add helmet, session, CSRF middleware` |
| 5 | CSRF tokens in all forms | 11 view files, admin-upload.js | `feat: add CSRF tokens to all forms` |
| 6 | Login rate limiting + session auth flow | routes/admin.js | `feat: add login rate limiting` |
| 7 | Structured logger + audit trail | helpers/logger.js | `feat: add structured logger` |
| 8 | Harden data.js (locking, fallbacks) | helpers/data.js | `feat: add file locking and error handling` |
| 9 | asyncHandler + error page | All route files, error.ejs | `feat: add async error handling` |
| 10 | Input validation (public forms) | routes/contact.js, routes/hikes.js | `feat: add server-side validation` |
| 11 | Input validation (admin) + audit | routes/admin.js | `feat: add admin validation and audit` |
| 12 | Fix XSS in templates | 3 view files, escape-url.js | `fix: escape URLs to prevent XSS` |
| 13 | Multipart uploads + sharp compression | routes/admin.js, admin-upload.js | `feat: switch to multipart uploads with sharp` |
| 14 | Gallery slug IDs + migration | routes/gallery.js, admin.js, gallery.json | `feat: migrate gallery to slug IDs` |
| 15 | Sanitize email HTML | helpers/mailer.js | `fix: escape HTML in email templates` |
| 16 | Final integration test | None (testing only) | `fix: integration test fixes` (if needed) |

**Total: 16 tasks, ~25 files modified, 16 commits**
