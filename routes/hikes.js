import { Router } from 'express';
import { readJSON } from '../helpers/data.js';

const router = Router();

router.get('/', async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const { type } = req.query;
  const filtered = type ? hikes.filter(h => h.type === type) : hikes;
  res.render('pages/hikes', { title: 'Hikes', hikes: filtered, activeType: type || 'all' });
});

router.get('/:id', async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const reviews = await readJSON('reviews.json');
  const hike = hikes.find(h => h.id === req.params.id);
  if (!hike) return res.status(404).render('pages/404', { title: 'Not Found' });
  const hikeReviews = reviews.filter(r => r.hikeId === hike.id);
  res.render('pages/hike-detail', { title: hike.name, hike, hikeReviews });
});

export default router;
