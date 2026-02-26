import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { readJSON, appendJSON } from '../helpers/data.js';
import { asyncHandler } from '../helpers/async-handler.js';
import { log } from '../helpers/logger.js';
import { buildSeo } from '../helpers/seo.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const reviews = await readJSON('reviews.json');
  const hikes = await readJSON('hikes.json');
  const avg = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
  const lang = res.locals.lang;
  res.locals.seo = buildSeo({
    title: lang === 'en' ? 'Hiker Reviews' : 'შეფასებები',
    description: lang === 'en'
      ? 'Read reviews from hikers who explored Georgia\'s trails with Wanderer. Real experiences and ratings.'
      : 'წაიკითხეთ მოლაშქრეების შეფასებები, რომლებმაც მოხეტიალესთან ერთად იმოგზაურეს საქართველოს ბილიკებზე.',
    path: '/reviews',
    lang
  });
  res.render('pages/reviews', { title: 'შეფასებები', reviews, hikes, avgRating: avg, success: false, errors: [] });
}));

const reviewValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('rating').toInt().isInt({ min: 1, max: 5 }).withMessage('Rating is required'),
  body('hikeId').optional({ values: 'falsy' }).trim(),
  body('text').trim().notEmpty().withMessage('Review text is required').isLength({ max: 2000 })
];

router.post('/', reviewValidation, asyncHandler(async (req, res) => {
  const reviews = await readJSON('reviews.json');
  const hikes = await readJSON('hikes.json');

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const avg = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    return res.status(400).render('pages/reviews', {
      title: 'შეფასებები', reviews, hikes, avgRating: avg, success: false, errors: errors.array()
    });
  }

  const { name, email, rating, hikeId, text } = req.body;

  const newReview = {
    id: Date.now(),
    author: name,
    email,
    rating: parseInt(rating, 10),
    hikeId: hikeId || '',
    text,
    country: '',
    date: new Date().toISOString()
  };

  await appendJSON('reviews.json', newReview);
  log('info', 'New review submitted', { author: name, rating });

  // Re-read reviews to include the new one
  const updatedReviews = await readJSON('reviews.json');
  const avg = updatedReviews.length ? updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length : 0;

  res.render('pages/reviews', {
    title: 'შეფასებები', reviews: updatedReviews, hikes, avgRating: avg, success: true, errors: []
  });
}));

export default router;
