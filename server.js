import express from 'express';
import expressLayouts from 'express-ejs-layouts';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import indexRouter from './routes/index.js';
import hikesRouter from './routes/hikes.js';
import aboutRouter from './routes/about.js';
import contactRouter from './routes/contact.js';
import bookingRouter from './routes/booking.js';
import galleryRouter from './routes/gallery.js';
import reviewsRouter from './routes/reviews.js';
import adminRouter from './routes/admin.js';

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

// Locals available to all templates
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
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
app.use('/booking', bookingRouter);
app.use('/gallery', galleryRouter);
app.use('/reviews', reviewsRouter);
app.use('/admin', adminRouter);

// 404
app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'Page Not Found' });
});

app.listen(PORT, () => {
  console.log(`Wanderer server running at http://localhost:${PORT}`);
});
