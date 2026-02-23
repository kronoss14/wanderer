import { Router } from 'express';
import { readJSON } from '../helpers/data.js';

const router = Router();

router.get('/', async (req, res) => {
  const reviews = await readJSON('reviews.json');
  const hikes = await readJSON('hikes.json');
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  res.render('pages/reviews', { title: 'Reviews', reviews, hikes, avgRating: avg });
});

export default router;
