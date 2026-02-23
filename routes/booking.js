import { Router } from 'express';
import { readJSON, appendJSON } from '../helpers/data.js';

const router = Router();

router.get('/', async (req, res) => {
  const pricing = await readJSON('pricing.json');
  const hikes = await readJSON('hikes.json');
  res.render('pages/booking', { title: 'Pricing & Booking', pricing, hikes, success: false });
});

router.post('/', async (req, res) => {
  const { name, email, phone, hikeId, groupSize, preferredDate, message } = req.body;
  await appendJSON('booking-inquiries.json', {
    id: Date.now(),
    name,
    email,
    phone,
    hikeId,
    groupSize,
    preferredDate,
    message,
    date: new Date().toISOString()
  });
  const pricing = await readJSON('pricing.json');
  const hikes = await readJSON('hikes.json');
  res.render('pages/booking', { title: 'Pricing & Booking', pricing, hikes, success: true });
});

export default router;
