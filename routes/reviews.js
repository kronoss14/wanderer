import { Router } from 'express';
import { readJSON } from '../helpers/data.js';
import { asyncHandler } from '../helpers/async-handler.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const reviews = await readJSON('reviews.json');
  const hikes = await readJSON('hikes.json');
  const avg = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
  res.render('pages/reviews', { title: 'შეფასებები', reviews, hikes, avgRating: avg });
}));

export default router;
