import { Router } from 'express';
import { readJSON } from '../helpers/data.js';

const router = Router();

router.get('/', async (req, res) => {
  const gallery = await readJSON('gallery.json');
  res.render('pages/gallery', { title: 'Gallery', gallery });
});

export default router;
