import { Router } from 'express';
import { readJSON } from '../helpers/data.js';

const router = Router();
const DOMAIN = 'https://wanderer.ge';

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function urlEntry(path, changefreq, priority) {
  const kaUrl = `${DOMAIN}${path}`;
  const enUrl = `${DOMAIN}/en${path}`;
  return `  <url>
    <loc>${kaUrl}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="ka" href="${kaUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${kaUrl}"/>
  </url>`;
}

router.get('/sitemap.xml', async (req, res) => {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL) {
    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    return res.send(cache);
  }

  const [hikes, posts, products] = await Promise.all([
    readJSON('hikes.json'),
    readJSON('blog.json'),
    readJSON('products.json')
  ]);

  const urls = [];

  // Static pages
  urls.push(urlEntry('', 'weekly', '1.0'));
  urls.push(urlEntry('/hikes', 'weekly', '0.9'));
  urls.push(urlEntry('/about', 'monthly', '0.7'));
  urls.push(urlEntry('/contact', 'monthly', '0.6'));
  urls.push(urlEntry('/gallery', 'weekly', '0.7'));
  urls.push(urlEntry('/reviews', 'weekly', '0.7'));
  urls.push(urlEntry('/map', 'monthly', '0.6'));
  urls.push(urlEntry('/blog', 'weekly', '0.8'));
  urls.push(urlEntry('/shop', 'weekly', '0.7'));

  // Hike detail pages
  for (const hike of hikes) {
    urls.push(urlEntry(`/hikes/${hike.id}`, 'weekly', '0.8'));
  }

  // Blog detail pages (published only)
  for (const post of posts) {
    if (post.published && post.slug) {
      urls.push(urlEntry(`/blog/${post.slug}`, 'monthly', '0.7'));
    }
  }

  // Product detail pages (in-stock only)
  for (const product of products) {
    if (product.inStock !== false) {
      urls.push(urlEntry(`/shop/${product.id}`, 'weekly', '0.6'));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

  cache = xml;
  cacheTime = now;

  res.set('Content-Type', 'application/xml');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(xml);
});

export default router;
