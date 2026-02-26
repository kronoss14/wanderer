import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { body, validationResult } from 'express-validator';
import { readJSON, appendJSON } from '../helpers/data.js';
import { sendRegistrationEmail } from '../helpers/mailer.js';
import { getBankDetails } from '../helpers/qr.js';
import { asyncHandler } from '../helpers/async-handler.js';
import { log } from '../helpers/logger.js';
import { buildSeo } from '../helpers/seo.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const { type } = req.query;
  const filtered = type ? hikes.filter(h => h.type === type) : hikes;
  const lang = res.locals.lang;
  res.locals.seo = buildSeo({
    title: lang === 'en' ? 'Hiking Tours' : 'ლაშქრობები',
    description: lang === 'en'
      ? 'Browse all guided hiking tours in Georgia — day hikes, multi-day treks, and mountain adventures in the Caucasus.'
      : 'დაათვალიერეთ ყველა გიდიანი ლაშქრობა საქართველოში — ერთდღიანი, მრავალდღიანი ტრეკინგი და თავგადასავლები კავკასიონში.',
    path: '/hikes',
    lang,
    ogImage: '/images/hikes-hero.jpeg'
  });
  res.render('pages/hikes', { title: 'Hikes', hikes: filtered, activeType: type || 'all' });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const reviews = await readJSON('reviews.json');
  const hike = hikes.find(h => h.id === req.params.id);
  if (!hike) return res.status(404).render('pages/404', { title: 'Not Found' });
  const hikeReviews = reviews.filter(r => r.hikeId === hike.id);
  const lang = res.locals.lang;
  const l = res.locals.l;
  res.locals.seo = buildSeo({
    title: l(hike, 'name'),
    description: l(hike, 'summary') || l(hike, 'description').slice(0, 160),
    path: `/hikes/${hike.id}`,
    lang,
    ogImage: hike.heroImage || hike.cardImage,
    ogType: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'TouristTrip',
      name: l(hike, 'name'),
      description: l(hike, 'description'),
      image: hike.heroImage ? `https://wanderer.ge${hike.heroImage}` : undefined,
      touristType: 'Hiking',
      offers: {
        '@type': 'Offer',
        price: hike.price,
        priceCurrency: 'GEL',
        availability: 'https://schema.org/InStock'
      }
    }
  });
  res.render('pages/hike-detail', { title: hike.name, hike, hikeReviews });
}));

const registrationValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone is required').isLength({ max: 30 })
];

router.post('/:id/register', registrationValidation, asyncHandler(async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const reviews = await readJSON('reviews.json');
  const hike = hikes.find(h => h.id === req.params.id);
  if (!hike) return res.status(404).render('pages/404', { title: 'Not Found' });

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const hikeReviews = reviews.filter(r => r.hikeId === hike.id);
    return res.status(400).render('pages/hike-detail', {
      title: hike.name, hike, hikeReviews, success: false, errors: errors.array()
    });
  }

  const { name, email, phone } = req.body;

  // Generate unique payment reference
  const reference = `REG-${Date.now()}-${randomBytes(3).toString('hex')}`;

  await appendJSON('registrations.json', {
    id: Date.now(),
    hikeId: hike.id,
    name, email, phone,
    reference,
    date: new Date().toISOString()
  });

  const bankDetails = getBankDetails();

  // Send email in background — don't block the response
  sendRegistrationEmail({ name, email, phone, hikeName: hike.name, price: hike.price, reference })
    .catch(err => log('error', 'Registration email failed', { error: err.message, hikeId: hike.id }));

  const hikeReviews = reviews.filter(r => r.hikeId === hike.id);
  res.render('pages/hike-detail', {
    title: hike.name, hike, hikeReviews, success: true, errors: [],
    bankDetails, paymentReference: reference
  });
}));

export default router;
