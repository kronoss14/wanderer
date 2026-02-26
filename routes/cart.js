import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { readJSON, appendJSON } from '../helpers/data.js';
import { asyncHandler } from '../helpers/async-handler.js';
import { log } from '../helpers/logger.js';
import { getBankDetails } from '../helpers/qr.js';
import { sendOrderEmails } from '../helpers/mailer.js';

import { buildSeo } from '../helpers/seo.js';

const router = Router();

router.get('/', (req, res) => {
  const lang = res.locals.lang;
  res.locals.seo = buildSeo({
    title: lang === 'en' ? 'Cart' : res.locals.t('cart.title'),
    description: '',
    path: '/cart',
    lang,
    noindex: true
  });
  res.render('pages/cart', { title: res.locals.t('cart.title') });
});

router.get('/checkout', (req, res) => {
  res.render('pages/checkout', { title: res.locals.t('checkout.title') });
});

const checkoutValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone is required').isLength({ max: 30 }),
  body('paymentMethod').isIn(['bank_transfer', 'on_delivery', 'on_pickup']).withMessage('Invalid payment method'),
  body('items').notEmpty().withMessage('Cart is empty')
];

router.post('/checkout', checkoutValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('pages/checkout', {
      title: res.locals.t('checkout.title'),
      errors: errors.array(),
      formData: req.body
    });
  }

  const { name, email, phone, address, paymentMethod, items: itemsJson } = req.body;

  let items;
  try {
    items = JSON.parse(itemsJson);
  } catch {
    return res.status(400).render('pages/checkout', {
      title: res.locals.t('checkout.title'),
      errors: [{ msg: 'Invalid cart data' }],
      formData: req.body
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).render('pages/checkout', {
      title: res.locals.t('checkout.title'),
      errors: [{ msg: 'Cart is empty' }],
      formData: req.body
    });
  }

  // Validate items against actual product data
  const products = await readJSON('products.json');
  const validatedItems = [];
  let total = 0;

  for (const item of items) {
    const product = products.find(p => p.id === item.id);
    if (!product) continue;
    const qty = Math.max(1, Math.min(99, parseInt(item.quantity) || 1));
    validatedItems.push({
      id: product.id,
      name: product.name,
      name_en: product.name_en,
      price: product.price,
      quantity: qty,
      image: product.image
    });
    total += product.price * qty;
  }

  if (validatedItems.length === 0) {
    return res.status(400).render('pages/checkout', {
      title: res.locals.t('checkout.title'),
      errors: [{ msg: 'No valid products in cart' }],
      formData: req.body
    });
  }

  // Generate order ID: WND-YYYYMMDD-XXXX
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const orderId = `WND-${datePart}-${randPart}`;

  const order = {
    id: orderId,
    customer: { name, email, phone, address: address || '' },
    items: validatedItems,
    total: Math.round(total * 100) / 100,
    paymentMethod,
    status: 'pending',
    createdAt: now.toISOString()
  };

  await appendJSON('orders.json', order);

  const bankDetails = getBankDetails();

  // Send emails in background
  sendOrderEmails({ order })
    .catch(err => log('error', 'Order email failed', { orderId, error: err.message }));

  res.render('pages/order-confirmation', {
    title: res.locals.t('order.confirmation_title'),
    order,
    bankDetails
  });
}));

export default router;
