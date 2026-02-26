import { Router } from 'express';
import { marked } from 'marked';
import { readJSON } from '../helpers/data.js';
import { asyncHandler } from '../helpers/async-handler.js';
import { buildSeo } from '../helpers/seo.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const posts = await readJSON('blog.json');
  const { tag } = req.query;

  let published = posts.filter(p => p.published);
  published.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  if (tag) {
    published = published.filter(p => p.tags && p.tags.includes(tag));
  }

  const allTags = [...new Set(posts.flatMap(p => p.tags || []))];

  const lang = res.locals.lang;
  res.locals.seo = buildSeo({
    title: lang === 'en' ? 'Blog' : res.locals.t('blog.title'),
    description: lang === 'en'
      ? 'Hiking tips, trail guides, and outdoor stories from Georgia\'s Caucasus mountains.'
      : 'ლაშქრობის რჩევები, ბილიკების გზამკვლევი და თავგადასავლები საქართველოს კავკასიონის მთებიდან.',
    path: '/blog',
    lang
  });

  res.render('pages/blog', {
    title: res.locals.t('blog.title'),
    posts: published,
    allTags,
    activeTag: tag || ''
  });
}));

router.get('/:slug', asyncHandler(async (req, res) => {
  const posts = await readJSON('blog.json');
  const post = posts.find(p => p.slug === req.params.slug && p.published);
  if (!post) return res.status(404).render('pages/404', { title: 'Not Found' });

  const lang = res.locals.lang;
  const l = res.locals.l;
  const contentField = lang === 'en' && post.content_en ? post.content_en : post.content;
  const renderedContent = marked(contentField || '');

  let relatedHikes = [];
  if (post.relatedHikeIds && post.relatedHikeIds.length) {
    const hikes = await readJSON('hikes.json');
    relatedHikes = hikes.filter(h => post.relatedHikeIds.includes(h.id));
  }

  let author = null;
  if (post.author) {
    const guides = await readJSON('guides.json');
    author = guides.find(g => g.id === Number(post.author));
  }

  res.locals.seo = buildSeo({
    title: l(post, 'title'),
    description: l(post, 'excerpt') || l(post, 'title'),
    path: `/blog/${post.slug}`,
    lang,
    ogImage: post.coverImage,
    ogType: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: l(post, 'title'),
      description: l(post, 'excerpt') || l(post, 'title'),
      image: post.coverImage ? `https://wanderer.ge${post.coverImage}` : undefined,
      datePublished: post.publishedAt,
      author: author ? { '@type': 'Person', name: l(author, 'name') } : undefined
    }
  });

  res.render('pages/blog-detail', {
    title: res.locals.l(post, 'title'),
    post,
    renderedContent,
    relatedHikes,
    author
  });
}));

export default router;
