import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { appendJSON } from '../helpers/data.js';
import { sendContactEmail } from '../helpers/mailer.js';
import { asyncHandler } from '../helpers/async-handler.js';
import { log } from '../helpers/logger.js';

const router = Router();

router.get('/', (req, res) => {
  res.render('pages/contact', { title: 'Contact Us', success: false, errors: [] });
});

const contactValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 200 }),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 5000 })
];

router.post('/', contactValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('pages/contact', {
      title: 'Contact Us', success: false, errors: errors.array()
    });
  }

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
    log('error', 'Failed to send contact email', { error: err.message });
  }

  res.render('pages/contact', { title: 'Contact Us', success: true, errors: [] });
}));

export default router;
