import { Router } from 'express';
import { readJSON } from '../helpers/data.js';
import { asyncHandler } from '../helpers/async-handler.js';
import { buildSeo } from '../helpers/seo.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const products = await readJSON('products.json');
  const { category } = req.query;
  const inStock = products.filter(p => p.inStock !== false);
  const filtered = category ? inStock.filter(p => p.category === category) : inStock;
  const categories = [...new Set(products.map(p => p.category))];
  const lang = res.locals.lang;
  res.locals.seo = buildSeo({
    title: lang === 'en' ? 'Shop' : res.locals.t('shop.title'),
    description: lang === 'en'
      ? 'Hiking gear and outdoor equipment for your next adventure in Georgia\'s mountains.'
      : 'სალაშქრო აღჭურვილობა თქვენი მომდევნო თავგადასავლისთვის საქართველოს მთებში.',
    path: '/shop',
    lang
  });
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
  const lang = res.locals.lang;
  const l = res.locals.l;
  res.locals.seo = buildSeo({
    title: l(product, 'name'),
    description: l(product, 'description'),
    path: `/shop/${product.id}`,
    lang,
    ogImage: product.image,
    ogType: 'product',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: l(product, 'name'),
      description: l(product, 'description'),
      image: product.image,
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: 'GEL',
        availability: product.inStock !== false
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock'
      }
    }
  });
  res.render('pages/product-detail', { title: product.name, product });
}));

export default router;
