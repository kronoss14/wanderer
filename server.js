// ─── Env validation (must run before anything else) ───
const REQUIRED_ENV = ['EMAIL_USER', 'EMAIL_PASS', 'ADMIN_PASSWORD_HASH', 'SESSION_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`\nMissing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in all values.\n');
  process.exit(1);
}

import express from 'express';
import expressLayouts from 'express-ejs-layouts';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import indexRouter from './routes/index.js';
import hikesRouter from './routes/hikes.js';
import aboutRouter from './routes/about.js';
import contactRouter from './routes/contact.js';
import galleryRouter from './routes/gallery.js';
import reviewsRouter from './routes/reviews.js';
import adminRouter from './routes/admin.js';
import analyticsRouter from './routes/analytics.js';
import mapRouter from './routes/map.js';
import blogRouter from './routes/blog.js';
import shopRouter from './routes/shop.js';
import cartRouter from './routes/cart.js';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { randomBytes } from 'node:crypto';
import { log } from './helpers/logger.js';
import { escapeAttr } from './helpers/escape-url.js';
import { i18nMiddleware } from './helpers/i18n.js';
import { closeDb } from './helpers/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Trust Render's reverse proxy (needed for secure cookies behind HTTPS)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// View engine
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Gzip/Brotli compression — cuts transfer size ~70%
app.use(compression());

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.tile.openstreetmap.org"]
    }
  }
}));

// Cookies & sessions
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'wanderer.sid',
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CSRF — double-submit cookie pattern (survives server restarts)
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    let token = req.cookies._csrf;
    if (!token) {
      token = randomBytes(32).toString('hex');
      res.cookie('_csrf', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
      });
    }
    res.locals.csrfToken = token;
    return next();
  }
  // POST/PUT/DELETE: validate token (exempt public analytics endpoint)
  if (req.path === '/api/analytics') return next();
  const cookieToken = req.cookies._csrf;
  const formToken = req.body?._csrf || req.headers['x-csrf-token'];
  if (!cookieToken || !formToken || cookieToken !== formToken) {
    return res.status(403).send('Invalid or missing CSRF token');
  }
  res.locals.csrfToken = cookieToken;
  next();
});

// i18n middleware (after CSRF, before static files)
app.use(i18nMiddleware);

// Static files (cache 7 days in production)
app.use(express.static(join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0
}));

// Locals available to all templates
app.use((req, res, next) => {
  res.locals.currentPath = req.url.split('?')[0];
  res.locals.escapeAttr = escapeAttr;
  res.locals.siteName = 'Wanderer';
  res.locals.siteNameGeo = 'მოხეტიალე';
  res.locals.socialLinks = {
    facebook: 'https://www.facebook.com/profile.php?id=61575333926780',
    instagram: 'https://www.instagram.com/wanderer_mokhetiale/'
  };
  next();
});

// Routes
app.use('/', indexRouter);
app.use('/hikes', hikesRouter);
app.use('/about', aboutRouter);
app.use('/contact', contactRouter);
app.use('/gallery', galleryRouter);
app.use('/reviews', reviewsRouter);
app.use('/map', mapRouter);
app.use('/blog', blogRouter);
app.use('/shop', shopRouter);
app.use('/cart', cartRouter);
app.use('/admin', adminRouter);
app.use(analyticsRouter);

// English route mounts
app.use('/en', indexRouter);
app.use('/en/hikes', hikesRouter);
app.use('/en/about', aboutRouter);
app.use('/en/contact', contactRouter);
app.use('/en/gallery', galleryRouter);
app.use('/en/reviews', reviewsRouter);
app.use('/en/map', mapRouter);
app.use('/en/blog', blogRouter);
app.use('/en/shop', shopRouter);
app.use('/en/cart', cartRouter);

// 404
app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  log('error', 'Unhandled route error', { path: req.path, error: err.message });
  res.status(500).render('pages/error', { title: 'Error' });
});

if (!process.env.MONGODB_URI) {
  console.warn('WARNING: MONGODB_URI not set — using local JSON files (changes will not persist across deploys)');
}

const server = app.listen(PORT, () => {
  console.log(`Wanderer server running at http://localhost:${PORT}`);
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    console.log(`${sig} received — shutting down`);
    server.close();
    await closeDb();
    process.exit(0);
  });
}
