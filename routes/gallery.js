import { Router } from 'express';
import { readJSON } from '../helpers/data.js';
import { asyncHandler } from '../helpers/async-handler.js';
import { buildSeo } from '../helpers/seo.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const gallery = await readJSON('gallery.json');
  gallery.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  const lang = res.locals.lang;
  res.locals.seo = buildSeo({
    title: lang === 'en' ? 'Photo Gallery' : 'თავგადასავლები',
    description: lang === 'en'
      ? 'Photos from hiking adventures across Georgia\'s mountains, valleys, and trails with Wanderer.'
      : 'ფოტოები ლაშქრობებიდან საქართველოს მთებში, ხეობებსა და ბილიკებზე მოხეტიალესთან ერთად.',
    path: '/gallery',
    lang,
    ogImage: '/images/adventures-hero.jpeg'
  });
  res.render('pages/gallery', { title: 'თავგადასავლები', gallery });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const gallery = await readJSON('gallery.json');
  const item = gallery.find(g => g.id === req.params.id);
  if (!item) return res.redirect('/gallery');

  let reviews = [];
  if (item.hikeId) {
    const allReviews = await readJSON('reviews.json');
    reviews = allReviews.filter(r => r.hikeId === item.hikeId);
  }

  res.render('pages/gallery-detail', { title: item.title, item, reviews });
}));

export default router;