import { Router } from 'express';
import { readJSON } from '../helpers/data.js';
import { asyncHandler } from '../helpers/async-handler.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const guides = await readJSON('guides.json');
  res.render('pages/about', { title: 'About Us', guides });
}));

export default router;
