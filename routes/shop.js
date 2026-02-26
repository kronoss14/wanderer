import { Router } from 'express';
import { readJSON } from '../helpers/data.js';
import { asyncHandler } from '../helpers/async-handler.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const products = await readJSON('products.json');
  const { category } = req.query;
  const inStock = products.filter(p => p.inStock !== false);
  const filtered = category ? inStock.filter(p => p.category === category) : inStock;
  const categories = [...new Set(products.map(p => p.category))];
  res.render('pages/shop', {
    title: res.locals.t('shop.title'),
    products: filtered,
    categories,
    activeCategory: category || 'all'
  });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const products = await readJSON('products.json');
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).render('pages/404', { title: 'Not Found' });
  res.render('pages/product-detail', { title: product.name, product });
}));

export default router;
