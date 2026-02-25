import { Router } from 'express';
import { readJSON } from '../helpers/data.js';
import { asyncHandler } from '../helpers/async-handler.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const gallery = await readJSON('gallery.json');
  res.render('pages/gallery', { title: 'თავგადასავლები', gallery });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const gallery = await readJSON('gallery.json');
  const item = gallery.find(g => g.id === Number(req.params.id));
  if (!item) return res.redirect('/gallery');

  let reviews = [];
  if (item.hikeId) {
    const allReviews = await readJSON('reviews.json');
    reviews = allReviews.filter(r => r.hikeId === item.hikeId);
  }

  res.render('pages/gallery-detail', { title: item.title, item, reviews });
}));

export default router;