import { Router } from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import multer from 'multer';
import sharp from 'sharp';
import { readJSON, writeJSON } from '../helpers/data.js';
import { checkPassword, requireAdmin } from '../helpers/auth.js';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../helpers/async-handler.js';
import { body, validationResult } from 'express-validator';
import { audit, log } from '../helpers/logger.js';
import { parseRouteFile } from '../helpers/geo.js';
import { uploadImage, isCloudinaryConfigured } from '../helpers/cloudinary.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false
});

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

// Helper: validate image URL (local path, http/https, or cloudinary)
function isValidImageUrl(url) {
  if (!url) return true;
  if (url.startsWith('/images/')) return true;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Helper: generate URL-friendly slug from text (supports Georgian/Unicode)
function toSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || `item-${Date.now()}`;
}

// ─── Shared form parsers (DRY extraction) ───

function parseHikeBody(b, id) {
  return {
    id,
    name: b.name,
    name_en: b.name_en || '',
    type: b.type,
    duration: b.duration,
    duration_en: b.duration_en || '',
    distance: b.distance,
    difficulty: b.difficulty,
    elevation: b.elevation,
    groupSize: b.groupSize,
    price: b.price ? Math.max(0, Number(b.price)) : 0,
    featured: b.featured === 'true',
    summary: b.summary,
    summary_en: b.summary_en || '',
    description: b.description,
    description_en: b.description_en || '',
    highlights: textToArray(b.highlights),
    highlights_en: textToArray(b.highlights_en),
    included: textToArray(b.included),
    included_en: textToArray(b.included_en),
    notIncluded: textToArray(b.notIncluded),
    notIncluded_en: textToArray(b.notIncluded_en),
    images: textToArray(b.images).filter(isValidImageUrl),
    heroImage: b.heroImage,
    cardImage: b.cardImage,
    region: b.region,
    region_en: b.region_en || '',
    dates: textToArray(b.dates),
    messengerLink: b.messengerLink || '',
    whatsappLink: b.whatsappLink || '',
    route: b.routeData ? JSON.parse(b.routeData) : {}
  };
}

function parseGuideBody(b, id) {
  return {
    id,
    name: b.name,
    name_en: b.name_en || '',
    role: b.role,
    role_en: b.role_en || '',
    bio: b.bio,
    bio_en: b.bio_en || '',
    specialties: textToArray(b.specialties),
    specialties_en: textToArray(b.specialties_en),
    image: b.image
  };
}

function parsePricingBody(b, id) {
  return {
    id,
    tier: b.tier,
    tier_en: b.tier_en || '',
    price: b.price !== '' ? Math.max(0, Number(b.price)) : null,
    priceLabel: b.priceLabel,
    priceLabel_en: b.priceLabel_en || '',
    unit: b.unit,
    unit_en: b.unit_en || '',
    description: b.description,
    description_en: b.description_en || '',
    features: textToArray(b.features),
    features_en: textToArray(b.features_en),
    highlighted: b.highlighted === 'true',
    cta: b.cta,
    cta_en: b.cta_en || ''
  };
}

function parseGalleryBody(b, id) {
  return {
    id,
    title: b.title,
    title_en: b.title_en || '',
    date: b.date,
    description: b.description,
    description_en: b.description_en || '',
    mainImage: b.mainImage,
    images: textToArray(b.images).filter(isValidImageUrl),
    hikeId: b.hikeId || ''
  };
}

function parseBlogBody(b, id, slug) {
  return {
    id,
    slug: b.slug || slug || b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    title: b.title,
    title_en: b.title_en || '',
    content: b.content,
    content_en: b.content_en || '',
    coverImage: b.coverImage || '',
    tags: textToArray(b.tags),
    author: b.author || '',
    relatedHikeIds: textToArray(b.relatedHikeIds),
    publishedAt: b.publishedAt || new Date().toISOString().split('T')[0],
    published: b.published === 'true'
  };
}

// ─── Login (public) ───
router.get('/login', (req, res) => {
  res.render(join(__dirname, '..', 'views', 'admin', 'login.ejs'), {
    layout: false, error: null, csrfToken: res.locals.csrfToken
  });
});

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  if (await checkPassword(req.body.password)) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  res.render(join(__dirname, '..', 'views', 'admin', 'login.ejs'), {
    layout: false, error: 'Invalid password', csrfToken: res.locals.csrfToken
  });
}));

// ─── All routes below require auth ───
router.use(requireAdmin);

// ─── Image Upload ───
const UPLOAD_DIR = join(__dirname, '..', 'public', 'images', 'uploads');
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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

  // ─── Cloudinary upload (persistent cloud storage) ───
  // Let Cloudinary handle resize/compression — no sharp needed, saves memory
  if (isCloudinaryConfigured()) {
    try {
      const uploadOpts = {
        public_id: id,
        transformation: req.file.mimetype !== 'image/svg+xml'
          ? { width: 1920, crop: 'limit', quality: 'auto', fetch_format: 'auto', angle: 'auto' }
          : undefined
      };

      const url = await uploadImage(req.file.buffer, uploadOpts);
      await audit('upload', { filename: id, storage: 'cloudinary' });
      return res.json({ url });
    } catch (err) {
      log('error', 'Cloudinary upload failed', { error: err.message });
      return res.status(500).json({ error: 'Image upload failed' });
    }
  }

  // ─── Local filesystem fallback (dev only) ───
  // Skip sharp processing for SVG
  if (req.file.mimetype === 'image/svg+xml') {
    const svgName = `${id}.svg`;
    writeFileSync(join(UPLOAD_DIR, svgName), req.file.buffer);
    await audit('upload', { filename: svgName });
    return res.json({ url: `/images/uploads/${svgName}` });
  }

  // Process with sharp: resize to max 1920px wide, compress to 80% JPEG
  const filename = `${id}.jpeg`;
  await sharp(req.file.buffer)
    .resize(1920, null, { withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(join(UPLOAD_DIR, filename));

  // Generate thumbnail (400px)
  const thumbName = `${id}-thumb.jpeg`;
  await sharp(req.file.buffer)
    .resize(400, null, { withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toFile(join(UPLOAD_DIR, thumbName));

  await audit('upload', { filename });
  res.json({ url: `/images/uploads/${filename}` });
}));

// Handle multer errors
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large (max 10 MB)' });
  }
  if (err.message === 'File type not allowed') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// ─── Route Upload (base64 JSON for KML/GPX text files) ───
router.post('/upload-route', asyncHandler(async (req, res) => {
  const { filename, data } = req.body;
  if (!filename || !data) return res.status(400).json({ error: 'Missing filename or data' });

  const ext = filename.split('.').pop().toLowerCase();
  if (!['kml', 'gpx', 'kmz'].includes(ext)) return res.status(400).json({ error: 'Only KML/GPX/KMZ supported' });

  const match = data.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'Invalid data format' });

  const content = Buffer.from(match[1], 'base64').toString('utf-8');
  const route = parseRouteFile(content, ext === 'kmz' ? 'kml' : ext);
  res.json({ route });
}));

// ─── Logout ───
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// ─── Dashboard ───
router.get('/', asyncHandler(async (req, res) => {
  const [hikes, guides, pricing, gallery, blog] = await Promise.all([
    readJSON('hikes.json'),
    readJSON('guides.json'),
    readJSON('pricing.json'),
    readJSON('gallery.json'),
    readJSON('blog.json')
  ]);
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'dashboard.ejs'), {
    title: 'Dashboard',
    counts: { hikes: hikes.length, guides: guides.length, pricing: pricing.length, gallery: gallery.length, blog: blog.length }
  });
}));

// ─── Validation rules ───
const hikeValidation = [
  body('id').trim().notEmpty().withMessage('ID is required'),
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 200 }),
  body('type').isIn(['day', 'multi-day', 'cultural']).withMessage('Invalid type'),
  body('price').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Price must be positive')
];

// ═══════════════════════════════════════════
//  HIKES CRUD
// ═══════════════════════════════════════════

router.get('/hikes', asyncHandler(async (req, res) => {
  const hikes = await readJSON('hikes.json');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'hikes-list.ejs'), { title: 'Hikes', hikes });
}));

router.get('/hikes/new', (req, res) => {
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'hikes-form.ejs'), {
    title: 'New Hike', editing: false, hike: {}
  });
});

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

router.get('/hikes/edit/:id', asyncHandler(async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const hike = hikes.find(h => h.id === req.params.id);
  if (!hike) return res.redirect('/admin/hikes');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'hikes-form.ejs'), {
    title: 'Edit Hike', editing: true, hike
  });
}));

router.post('/hikes/edit/:id', hikeValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'hikes-form.ejs'), {
      title: 'Edit Hike', editing: true, hike: { ...req.body, id: req.params.id }, errors: errors.array()
    });
  }
  const hikes = await readJSON('hikes.json');
  const idx = hikes.findIndex(h => h.id === req.params.id);
  if (idx === -1) return res.redirect('/admin/hikes');
  hikes[idx] = parseHikeBody(req.body, req.params.id);
  await writeJSON('hikes.json', hikes);
  await audit('hike.edit', { id: req.params.id });
  res.redirect('/admin/hikes');
}));

router.post('/hikes/delete/:id', asyncHandler(async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const filtered = hikes.filter(h => h.id !== req.params.id);
  await writeJSON('hikes.json', filtered);
  await audit('hike.delete', { id: req.params.id });
  res.redirect('/admin/hikes');
}));

// ═══════════════════════════════════════════
//  GUIDES CRUD
// ═══════════════════════════════════════════

router.get('/guides', asyncHandler(async (req, res) => {
  const guides = await readJSON('guides.json');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'guides-list.ejs'), { title: 'Guides', guides });
}));

router.get('/guides/new', (req, res) => {
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'guides-form.ejs'), {
    title: 'New Guide', editing: false, guide: {}
  });
});

router.post('/guides', asyncHandler(async (req, res) => {
  const guides = await readJSON('guides.json');
  const b = req.body;
  const nextId = guides.length ? Math.max(...guides.map(g => g.id)) + 1 : 1;
  guides.push(parseGuideBody(b, nextId));
  await writeJSON('guides.json', guides);
  await audit('guide.create', { id: nextId, name: b.name });
  res.redirect('/admin/guides');
}));

router.get('/guides/edit/:id', asyncHandler(async (req, res) => {
  const guides = await readJSON('guides.json');
  const guide = guides.find(g => g.id === Number(req.params.id));
  if (!guide) return res.redirect('/admin/guides');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'guides-form.ejs'), {
    title: 'Edit Guide', editing: true, guide
  });
}));

router.post('/guides/edit/:id', asyncHandler(async (req, res) => {
  const guides = await readJSON('guides.json');
  const idx = guides.findIndex(g => g.id === Number(req.params.id));
  if (idx === -1) return res.redirect('/admin/guides');
  guides[idx] = parseGuideBody(req.body, Number(req.params.id));
  await writeJSON('guides.json', guides);
  await audit('guide.edit', { id: Number(req.params.id) });
  res.redirect('/admin/guides');
}));

router.post('/guides/delete/:id', asyncHandler(async (req, res) => {
  const guides = await readJSON('guides.json');
  const filtered = guides.filter(g => g.id !== Number(req.params.id));
  await writeJSON('guides.json', filtered);
  await audit('guide.delete', { id: Number(req.params.id) });
  res.redirect('/admin/guides');
}));

// ═══════════════════════════════════════════
//  PRICING CRUD
// ═══════════════════════════════════════════

router.get('/pricing', asyncHandler(async (req, res) => {
  const pricing = await readJSON('pricing.json');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'pricing-list.ejs'), { title: 'Pricing', pricing });
}));

router.get('/pricing/new', (req, res) => {
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'pricing-form.ejs'), {
    title: 'New Pricing Tier', editing: false, tier: {}
  });
});

router.post('/pricing', asyncHandler(async (req, res) => {
  const pricing = await readJSON('pricing.json');
  const b = req.body;
  const nextId = pricing.length ? Math.max(...pricing.map(p => p.id)) + 1 : 1;
  pricing.push(parsePricingBody(b, nextId));
  await writeJSON('pricing.json', pricing);
  await audit('pricing.create', { id: nextId, tier: b.tier });
  res.redirect('/admin/pricing');
}));

router.get('/pricing/edit/:id', asyncHandler(async (req, res) => {
  const pricing = await readJSON('pricing.json');
  const tier = pricing.find(p => p.id === Number(req.params.id));
  if (!tier) return res.redirect('/admin/pricing');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'pricing-form.ejs'), {
    title: 'Edit Pricing Tier', editing: true, tier
  });
}));

router.post('/pricing/edit/:id', asyncHandler(async (req, res) => {
  const pricing = await readJSON('pricing.json');
  const idx = pricing.findIndex(p => p.id === Number(req.params.id));
  if (idx === -1) return res.redirect('/admin/pricing');
  pricing[idx] = parsePricingBody(req.body, Number(req.params.id));
  await writeJSON('pricing.json', pricing);
  await audit('pricing.edit', { id: Number(req.params.id) });
  res.redirect('/admin/pricing');
}));

router.post('/pricing/delete/:id', asyncHandler(async (req, res) => {
  const pricing = await readJSON('pricing.json');
  const filtered = pricing.filter(p => p.id !== Number(req.params.id));
  await writeJSON('pricing.json', filtered);
  await audit('pricing.delete', { id: Number(req.params.id) });
  res.redirect('/admin/pricing');
}));

// ═══════════════════════════════════════════
//  GALLERY CRUD
// ═══════════════════════════════════════════

router.get('/gallery', asyncHandler(async (req, res) => {
  const gallery = await readJSON('gallery.json');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'gallery-list.ejs'), { title: 'Adventures', gallery });
}));

router.get('/gallery/new', asyncHandler(async (req, res) => {
  const hikes = await readJSON('hikes.json');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'gallery-form.ejs'), {
    title: 'New Adventure', editing: false, item: {}, hikes
  });
}));

router.post('/gallery', asyncHandler(async (req, res) => {
  const gallery = await readJSON('gallery.json');
  const b = req.body;
  let nextId = toSlug(b.title);
  // Ensure uniqueness
  const baseId = nextId;
  let counter = 1;
  while (gallery.some(g => g.id === nextId)) {
    nextId = `${baseId}-${counter++}`;
  }
  gallery.push(parseGalleryBody(b, nextId));
  await writeJSON('gallery.json', gallery);
  await audit('gallery.create', { id: nextId, title: b.title });
  res.redirect('/admin/gallery');
}));

router.get('/gallery/edit/:id', asyncHandler(async (req, res) => {
  const [gallery, hikes] = await Promise.all([
    readJSON('gallery.json'),
    readJSON('hikes.json')
  ]);
  const item = gallery.find(g => g.id === req.params.id);
  if (!item) return res.redirect('/admin/gallery');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'gallery-form.ejs'), {
    title: 'Edit Adventure', editing: true, item, hikes
  });
}));

router.post('/gallery/edit/:id', asyncHandler(async (req, res) => {
  const gallery = await readJSON('gallery.json');
  const idx = gallery.findIndex(g => g.id === req.params.id);
  if (idx === -1) return res.redirect('/admin/gallery');
  gallery[idx] = parseGalleryBody(req.body, req.params.id);
  await writeJSON('gallery.json', gallery);
  await audit('gallery.edit', { id: req.params.id });
  res.redirect('/admin/gallery');
}));

router.post('/gallery/delete/:id', asyncHandler(async (req, res) => {
  const gallery = await readJSON('gallery.json');
  const filtered = gallery.filter(g => g.id !== req.params.id);
  await writeJSON('gallery.json', filtered);
  await audit('gallery.delete', { id: req.params.id });
  res.redirect('/admin/gallery');
}));

// ═══════════════════════════════════════════
//  BLOG CRUD
// ═══════════════════════════════════════════

router.get('/blog', asyncHandler(async (req, res) => {
  const blog = await readJSON('blog.json');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'blog-list.ejs'), { title: 'Blog', posts: blog });
}));

router.get('/blog/new', asyncHandler(async (req, res) => {
  const [guides, hikes] = await Promise.all([
    readJSON('guides.json'),
    readJSON('hikes.json')
  ]);
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'blog-form.ejs'), {
    title: 'New Blog Post', editing: false, post: {}, guides, hikes
  });
}));

router.post('/blog', asyncHandler(async (req, res) => {
  const blog = await readJSON('blog.json');
  const b = req.body;
  const nextId = blog.length ? Math.max(...blog.map(p => p.id)) + 1 : 1;
  const slug = toSlug(b.title);
  const post = parseBlogBody(b, nextId, slug);
  blog.push(post);
  await writeJSON('blog.json', blog);
  await audit('blog.create', { id: nextId, title: b.title });
  res.redirect('/admin/blog');
}));

router.get('/blog/edit/:id', asyncHandler(async (req, res) => {
  const [blog, guides, hikes] = await Promise.all([
    readJSON('blog.json'),
    readJSON('guides.json'),
    readJSON('hikes.json')
  ]);
  const post = blog.find(p => p.id === Number(req.params.id));
  if (!post) return res.redirect('/admin/blog');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'blog-form.ejs'), {
    title: 'Edit Blog Post', editing: true, post, guides, hikes
  });
}));

router.post('/blog/edit/:id', asyncHandler(async (req, res) => {
  const blog = await readJSON('blog.json');
  const idx = blog.findIndex(p => p.id === Number(req.params.id));
  if (idx === -1) return res.redirect('/admin/blog');
  blog[idx] = parseBlogBody(req.body, Number(req.params.id), blog[idx].slug);
  await writeJSON('blog.json', blog);
  await audit('blog.edit', { id: Number(req.params.id) });
  res.redirect('/admin/blog');
}));

router.post('/blog/delete/:id', asyncHandler(async (req, res) => {
  const blog = await readJSON('blog.json');
  const filtered = blog.filter(p => p.id !== Number(req.params.id));
  await writeJSON('blog.json', filtered);
  await audit('blog.delete', { id: Number(req.params.id) });
  res.redirect('/admin/blog');
}));

export default router;
