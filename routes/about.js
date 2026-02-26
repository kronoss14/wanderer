import { Router } from 'express';
import { readJSON } from '../helpers/data.js';
import { asyncHandler } from '../helpers/async-handler.js';
import { buildSeo } from '../helpers/seo.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const guides = await readJSON('guides.json');
  const lang = res.locals.lang;
  res.locals.seo = buildSeo({
    title: lang === 'en' ? 'About Us' : 'ჩვენს შესახებ',
    description: lang === 'en'
      ? 'Meet the Wanderer team — experienced mountain guides leading hiking tours across Georgia\'s Caucasus trails.'
      : 'გაიცანით მოხეტიალეს გუნდი — გამოცდილი მთის გიდები, რომლებიც ლაშქრობებს ატარებენ კავკასიონის ბილიკებზე.',
    path: '/about',
    lang
  });
  res.render('pages/about', { title: 'About Us', guides });
}));

export default router;
