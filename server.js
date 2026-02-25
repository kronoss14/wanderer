import express from 'express';
import expressLayouts from 'express-ejs-layouts';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import indexRouter from './routes/index.js';
import hikesRouter from './routes/hikes.js';
import aboutRouter from './routes/about.js';
import contactRouter from './routes/contact.js';
import galleryRouter from './routes/gallery.js';
import mapRouter from './routes/map.js';
import reviewsRouter from './routes/reviews.js';
import blogRouter from './routes/blog.js';
import adminRouter from './routes/admin.js';
import { i18nMiddleware } from './helpers/i18n.js';
import { closeDb } from './helpers/db.js';

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
app.use(express.json({ limit: '15mb' }));

// Static files
app.use(express.static(join(__dirname, 'public')));

// i18n — must be before routes
app.use(i18nMiddleware);

// Locals available to all templates
app.use((req, res, next) => {
  res.locals.currentPath = req.url.split('?')[0];
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
app.use('/map', mapRouter);
app.use('/reviews', reviewsRouter);
app.use('/blog', blogRouter);
app.use('/admin', adminRouter);

// English routes (same handlers, /en prefix stripped by middleware)
app.use('/en', indexRouter);
app.use('/en/hikes', hikesRouter);
app.use('/en/about', aboutRouter);
app.use('/en/contact', contactRouter);
app.use('/en/gallery', galleryRouter);
app.use('/en/map', mapRouter);
app.use('/en/reviews', reviewsRouter);
app.use('/en/blog', blogRouter);

// 404
app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'Page Not Found' });
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
