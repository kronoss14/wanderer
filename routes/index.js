import { Router } from 'express';
import { readJSON } from '../helpers/data.js';
import { asyncHandler } from '../helpers/async-handler.js';
import { buildSeo } from '../helpers/seo.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const reviews = await readJSON('reviews.json');
  const featured = hikes.filter(h => h.featured);
  const topReviews = reviews.filter(r => r.rating === 5).slice(0, 3);
  const lang = res.locals.lang;
  res.locals.seo = buildSeo({
    title: lang === 'en' ? 'Guided Hiking Tours in Georgia' : 'საქართველოში ლაშქრობა გიდით',
    description: lang === 'en'
      ? 'Explore the Caucasus mountains with guided hiking tours in Georgia. Multi-day treks, day hikes, and outdoor adventures with Wanderer.'
      : 'აღმოაჩინეთ კავკასიონის მთები გიდიანი ლაშქრობებით საქართველოში. მრავალდღიანი ტრეკინგი, ერთდღიანი ლაშქრობები და თავგადასავლები.',
    path: '/',
    lang
  });
  res.render('pages/home', { title: 'Home', featured, topReviews, hikes });
}));

export default router;
