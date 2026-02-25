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
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { randomBytes } from 'node:crypto';
import { log } from './helpers/logger.js';
import { escapeAttr } from './helpers/escape-url.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

// CSRF token — generate for all requests, validate on POST/PUT/DELETE
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (!req.session.csrfToken) {
      req.session.csrfToken = randomBytes(32).toString('hex');
    }
    res.locals.csrfToken = req.session.csrfToken;
    return next();
  }
  // POST/PUT/DELETE: validate token (exempt public analytics endpoint)
  if (req.path === '/api/analytics') return next();
  const token = req.body?._csrf || req.headers['x-csrf-token'];
  if (!token || token !== req.session?.csrfToken) {
    return res.status(403).send('Invalid or missing CSRF token');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
});

// Static files
app.use(express.static(join(__dirname, 'public')));

// Locals available to all templates
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
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
app.use('/admin', adminRouter);
app.use(analyticsRouter);

// 404
app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  log('error', 'Unhandled route error', { path: req.path, error: err.message });
  res.status(500).render('pages/error', { title: 'Error' });
});

app.listen(PORT, () => {
  console.log(`Wanderer server running at http://localhost:${PORT}`);
});
