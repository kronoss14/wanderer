import { Router } from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { readJSON, writeJSON } from '../helpers/data.js';
import { checkPassword, setAuthCookie, clearAuthCookie, requireAdmin } from '../helpers/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// Helper: render with admin layout (bypasses express-ejs-layouts)
function renderAdmin(res, view, locals = {}) {
  const viewsDir = join(__dirname, '..', 'views');
  res.app.render(view, { ...res.app.locals, ...res.locals, ...locals, layout: false }, (err, body) => {
    if (err) { console.error(err); return res.status(500).send('Render error'); }
    res.render(join(viewsDir, 'admin', 'layout.ejs'), {
      ...res.app.locals, ...res.locals, ...locals, body, layout: false
    });
  });
}

// Helper: split textarea lines into array, filtering blanks
function textToArray(text) {
  if (!text) return [];
  return text.split('\n').map(s => s.trim()).filter(Boolean);
}

// ─── Login (public) ───
router.get('/login', (req, res) => {
  res.render(join(__dirname, '..', 'views', 'admin', 'login.ejs'), { layout: false, error: null });
});

router.post('/login', (req, res) => {
  if (checkPassword(req.body.password)) {
    setAuthCookie(res);
    return res.redirect('/admin');
  }
  res.render(join(__dirname, '..', 'views', 'admin', 'login.ejs'), { layout: false, error: 'Invalid password' });
});

// ─── All routes below require auth ───
router.use(requireAdmin);

// ─── Image Upload ───
const UPLOAD_DIR = join(__dirname, '..', 'public', 'images', 'uploads');
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']);

router.post('/upload', (req, res) => {
  try {
    const { filename, data } = req.body;
    if (!filename || !data) {
      return res.status(400).json({ error: 'Missing filename or data' });
    }

    // Validate data URL format
    const match = data.match(/^data:image\/\w+;base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid data URL format' });
    }

    // Validate extension
    const ext = filename.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return res.status(400).json({ error: 'File type not allowed' });
    }

    // Decode and check size
    const buffer = Buffer.from(match[1], 'base64');
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large (max 10 MB)' });
    }

    // Sanitise filename: keep only alphanumeric, dash, underscore, dot
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const unique = Date.now() + '-' + randomBytes(4).toString('hex') + '-' + safe;

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    writeFileSync(join(UPLOAD_DIR, unique), buffer);
    res.json({ url: '/images/uploads/' + unique });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ─── Logout ───
router.get('/logout', (req, res) => {
  clearAuthCookie(res);
  res.redirect('/admin/login');
});

// ─── Dashboard ───
router.get('/', async (req, res) => {
  const [hikes, guides, pricing, gallery] = await Promise.all([
    readJSON('hikes.json'),
    readJSON('guides.json'),
    readJSON('pricing.json'),
    readJSON('gallery.json')
  ]);
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'dashboard.ejs'), {
    title: 'Dashboard',
    counts: { hikes: hikes.length, guides: guides.length, pricing: pricing.length, gallery: gallery.length }
  });
});

// ═══════════════════════════════════════════
//  HIKES CRUD
// ═══════════════════════════════════════════

router.get('/hikes', async (req, res) => {
  const hikes = await readJSON('hikes.json');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'hikes-list.ejs'), { title: 'Hikes', hikes });
});

router.get('/hikes/new', (req, res) => {
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'hikes-form.ejs'), {
    title: 'New Hike', editing: false, hike: {}
  });
});

router.post('/hikes', async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const b = req.body;
  const hike = {
    id: b.id,
    name: b.name,
    type: b.type,
    duration: b.duration,
    distance: b.distance,
    difficulty: b.difficulty,
    elevation: b.elevation,
    groupSize: b.groupSize,
    price: b.price ? Number(b.price) : 0,
    featured: b.featured === 'true',
    summary: b.summary,
    description: b.description,
    highlights: textToArray(b.highlights),
    included: textToArray(b.included),
    notIncluded: textToArray(b.notIncluded),
    images: textToArray(b.images),
    heroImage: b.heroImage,
    cardImage: b.cardImage,
    region: b.region,
    dates: textToArray(b.dates),
    messengerLink: b.messengerLink || '',
    whatsappLink: b.whatsappLink || ''
  };
  hikes.push(hike);
  await writeJSON('hikes.json', hikes);
  res.redirect('/admin/hikes');
});

router.get('/hikes/edit/:id', async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const hike = hikes.find(h => h.id === req.params.id);
  if (!hike) return res.redirect('/admin/hikes');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'hikes-form.ejs'), {
    title: 'Edit Hike', editing: true, hike
  });
});

router.post('/hikes/edit/:id', async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const idx = hikes.findIndex(h => h.id === req.params.id);
  if (idx === -1) return res.redirect('/admin/hikes');
  const b = req.body;
  hikes[idx] = {
    id: req.params.id,
    name: b.name,
    type: b.type,
    duration: b.duration,
    distance: b.distance,
    difficulty: b.difficulty,
    elevation: b.elevation,
    groupSize: b.groupSize,
    price: b.price ? Number(b.price) : 0,
    featured: b.featured === 'true',
    summary: b.summary,
    description: b.description,
    highlights: textToArray(b.highlights),
    included: textToArray(b.included),
    notIncluded: textToArray(b.notIncluded),
    images: textToArray(b.images),
    heroImage: b.heroImage,
    cardImage: b.cardImage,
    region: b.region,
    dates: textToArray(b.dates),
    messengerLink: b.messengerLink || '',
    whatsappLink: b.whatsappLink || ''
  };
  await writeJSON('hikes.json', hikes);
  res.redirect('/admin/hikes');
});

router.post('/hikes/delete/:id', async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const filtered = hikes.filter(h => h.id !== req.params.id);
  await writeJSON('hikes.json', filtered);
  res.redirect('/admin/hikes');
});

// ═══════════════════════════════════════════
//  GUIDES CRUD
// ═══════════════════════════════════════════

router.get('/guides', async (req, res) => {
  const guides = await readJSON('guides.json');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'guides-list.ejs'), { title: 'Guides', guides });
});

router.get('/guides/new', (req, res) => {
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'guides-form.ejs'), {
    title: 'New Guide', editing: false, guide: {}
  });
});

router.post('/guides', async (req, res) => {
  const guides = await readJSON('guides.json');
  const b = req.body;
  const nextId = guides.length ? Math.max(...guides.map(g => g.id)) + 1 : 1;
  guides.push({
    id: nextId,
    name: b.name,
    role: b.role,
    bio: b.bio,
    specialties: textToArray(b.specialties),
    image: b.image
  });
  await writeJSON('guides.json', guides);
  res.redirect('/admin/guides');
});

router.get('/guides/edit/:id', async (req, res) => {
  const guides = await readJSON('guides.json');
  const guide = guides.find(g => g.id === Number(req.params.id));
  if (!guide) return res.redirect('/admin/guides');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'guides-form.ejs'), {
    title: 'Edit Guide', editing: true, guide
  });
});

router.post('/guides/edit/:id', async (req, res) => {
  const guides = await readJSON('guides.json');
  const idx = guides.findIndex(g => g.id === Number(req.params.id));
  if (idx === -1) return res.redirect('/admin/guides');
  const b = req.body;
  guides[idx] = {
    id: Number(req.params.id),
    name: b.name,
    role: b.role,
    bio: b.bio,
    specialties: textToArray(b.specialties),
    image: b.image
  };
  await writeJSON('guides.json', guides);
  res.redirect('/admin/guides');
});

router.post('/guides/delete/:id', async (req, res) => {
  const guides = await readJSON('guides.json');
  const filtered = guides.filter(g => g.id !== Number(req.params.id));
  await writeJSON('guides.json', filtered);
  res.redirect('/admin/guides');
});

// ═══════════════════════════════════════════
//  PRICING CRUD
// ═══════════════════════════════════════════

router.get('/pricing', async (req, res) => {
  const pricing = await readJSON('pricing.json');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'pricing-list.ejs'), { title: 'Pricing', pricing });
});

router.get('/pricing/new', (req, res) => {
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'pricing-form.ejs'), {
    title: 'New Pricing Tier', editing: false, tier: {}
  });
});

router.post('/pricing', async (req, res) => {
  const pricing = await readJSON('pricing.json');
  const b = req.body;
  const nextId = pricing.length ? Math.max(...pricing.map(p => p.id)) + 1 : 1;
  pricing.push({
    id: nextId,
    tier: b.tier,
    price: b.price !== '' ? Number(b.price) : null,
    priceLabel: b.priceLabel,
    unit: b.unit,
    description: b.description,
    features: textToArray(b.features),
    highlighted: b.highlighted === 'true',
    cta: b.cta
  });
  await writeJSON('pricing.json', pricing);
  res.redirect('/admin/pricing');
});

router.get('/pricing/edit/:id', async (req, res) => {
  const pricing = await readJSON('pricing.json');
  const tier = pricing.find(p => p.id === Number(req.params.id));
  if (!tier) return res.redirect('/admin/pricing');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'pricing-form.ejs'), {
    title: 'Edit Pricing Tier', editing: true, tier
  });
});

router.post('/pricing/edit/:id', async (req, res) => {
  const pricing = await readJSON('pricing.json');
  const idx = pricing.findIndex(p => p.id === Number(req.params.id));
  if (idx === -1) return res.redirect('/admin/pricing');
  const b = req.body;
  pricing[idx] = {
    id: Number(req.params.id),
    tier: b.tier,
    price: b.price !== '' ? Number(b.price) : null,
    priceLabel: b.priceLabel,
    unit: b.unit,
    description: b.description,
    features: textToArray(b.features),
    highlighted: b.highlighted === 'true',
    cta: b.cta
  };
  await writeJSON('pricing.json', pricing);
  res.redirect('/admin/pricing');
});

router.post('/pricing/delete/:id', async (req, res) => {
  const pricing = await readJSON('pricing.json');
  const filtered = pricing.filter(p => p.id !== Number(req.params.id));
  await writeJSON('pricing.json', filtered);
  res.redirect('/admin/pricing');
});

// ═══════════════════════════════════════════
//  GALLERY CRUD
// ═══════════════════════════════════════════

router.get('/gallery', async (req, res) => {
  const gallery = await readJSON('gallery.json');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'gallery-list.ejs'), { title: 'Adventures', gallery });
});

router.get('/gallery/new', async (req, res) => {
  const hikes = await readJSON('hikes.json');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'gallery-form.ejs'), {
    title: 'New Adventure', editing: false, item: {}, hikes
  });
});

router.post('/gallery', async (req, res) => {
  const gallery = await readJSON('gallery.json');
  const b = req.body;
  const nextId = gallery.length ? Math.max(...gallery.map(g => g.id)) + 1 : 1;
  gallery.push({
    id: nextId,
    title: b.title,
    date: b.date,
    description: b.description,
    mainImage: b.mainImage,
    images: textToArray(b.images),
    hikeId: b.hikeId || ''
  });
  await writeJSON('gallery.json', gallery);
  res.redirect('/admin/gallery');
});

router.get('/gallery/edit/:id', async (req, res) => {
  const [gallery, hikes] = await Promise.all([
    readJSON('gallery.json'),
    readJSON('hikes.json')
  ]);
  const item = gallery.find(g => g.id === Number(req.params.id));
  if (!item) return res.redirect('/admin/gallery');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'gallery-form.ejs'), {
    title: 'Edit Adventure', editing: true, item, hikes
  });
});

router.post('/gallery/edit/:id', async (req, res) => {
  const gallery = await readJSON('gallery.json');
  const idx = gallery.findIndex(g => g.id === Number(req.params.id));
  if (idx === -1) return res.redirect('/admin/gallery');
  const b = req.body;
  gallery[idx] = {
    id: Number(req.params.id),
    title: b.title,
    date: b.date,
    description: b.description,
    mainImage: b.mainImage,
    images: textToArray(b.images),
    hikeId: b.hikeId || ''
  };
  await writeJSON('gallery.json', gallery);
  res.redirect('/admin/gallery');
});

router.post('/gallery/delete/:id', async (req, res) => {
  const gallery = await readJSON('gallery.json');
  const filtered = gallery.filter(g => g.id !== Number(req.params.id));
  await writeJSON('gallery.json', filtered);
  res.redirect('/admin/gallery');
});

export default router;
