import { Router } from 'express';
import { readJSON } from '../helpers/data.js';
import { asyncHandler } from '../helpers/async-handler.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const hikes = await readJSON('hikes.json');
  res.render('pages/map', { title: res.locals.t('map.title'), hikes });
}));

export default router;
