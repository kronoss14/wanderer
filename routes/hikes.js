import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { body, validationResult } from 'express-validator';
import { readJSON, appendJSON } from '../helpers/data.js';
import { sendRegistrationEmail } from '../helpers/mailer.js';
import { getBankDetails } from '../helpers/qr.js';
import { asyncHandler } from '../helpers/async-handler.js';
import { log } from '../helpers/logger.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const { type } = req.query;
  const filtered = type ? hikes.filter(h => h.type === type) : hikes;
  res.render('pages/hikes', { title: 'Hikes', hikes: filtered, activeType: type || 'all' });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const reviews = await readJSON('reviews.json');
  const hike = hikes.find(h => h.id === req.params.id);
  if (!hike) return res.status(404).render('pages/404', { title: 'Not Found' });
  const hikeReviews = reviews.filter(r => r.hikeId === hike.id);
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
