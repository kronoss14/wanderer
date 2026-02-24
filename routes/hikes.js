import { Router } from 'express';
import { readJSON, appendJSON } from '../helpers/data.js';
import { sendRegistrationEmail } from '../helpers/mailer.js';

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

router.post('/:id/register', async (req, res) => {
  const hikes = await readJSON('hikes.json');
  const reviews = await readJSON('reviews.json');
  const hike = hikes.find(h => h.id === req.params.id);
  if (!hike) return res.status(404).render('pages/404', { title: 'Not Found' });

  const { name, email, phone } = req.body;

  await appendJSON('registrations.json', {
    id: Date.now(),
    hikeId: hike.id,
    name,
    email,
    phone,
    date: new Date().toISOString()
  });

  try {
    await sendRegistrationEmail({ name, email, phone, hikeName: hike.name });
  } catch (err) {
    console.error('Registration email failed:', err);
  }

  const hikeReviews = reviews.filter(r => r.hikeId === hike.id);
  res.render('pages/hike-detail', { title: hike.name, hike, hikeReviews, success: true });
});

export default router;
