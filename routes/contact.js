import { Router } from 'express';
import { appendJSON } from '../helpers/data.js';
import { sendContactEmail } from '../helpers/mailer.js';

const router = Router();

router.get('/', (req, res) => {
  res.render('pages/contact', { title: 'Contact Us', success: false });
});

router.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body;
  await appendJSON('contact-submissions.json', {
    id: Date.now(),
    name,
    email,
    subject,
    message,
    date: new Date().toISOString()
  });

  try {
    await sendContactEmail({ name, email, subject, message });
  } catch (err) {
    console.error('Failed to send contact email:', err.message);
  }

  res.render('pages/contact', { title: 'Contact Us', success: true });
});

export default router;
