import { Router } from 'express';
import { marked } from 'marked';
import { readJSON } from '../helpers/data.js';
import { asyncHandler } from '../helpers/async-handler.js';

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

  res.render('pages/blog-detail', {
    title: res.locals.l(post, 'title'),
    post,
    renderedContent,
    relatedHikes,
    author
  });
}));

export default router;
