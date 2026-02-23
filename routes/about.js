import { Router } from 'express';
import { readJSON } from '../helpers/data.js';

const router = Router();

router.get('/', async (req, res) => {
  const guides = await readJSON('guides.json');
  res.render('pages/about', { title: 'About Us', guides });
});

export default router;
