import { Router } from 'express';
import { readJSON } from '../helpers/data.js';
import { asyncHandler } from '../helpers/async-handler.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const reviews = await readJSON('reviews.json');
  const featured = hikes.filter(h => h.featured);
  const topReviews = reviews.filter(r => r.rating === 5).slice(0, 3);
  res.render('pages/home', { title: 'Home', featured, topReviews, hikes });
}));

export default router;
