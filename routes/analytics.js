import { Router } from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordEvent, readEventsForRange, aggregateEvents } from '../helpers/analytics.js';
import { requireAdmin } from '../helpers/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// ─── Public: receive analytics events ───
const VALID_TYPES = new Set(['pageview', 'pageduration']);

router.post('/api/analytics', async (req, res) => {
  try {
    const event = req.body;
    if (!event || !VALID_TYPES.has(event.type) || !event.sessionId) {
      return res.status(400).json({ error: 'Invalid event' });
    }

    // Sanitize: only keep expected fields
    const clean = { type: event.type, sessionId: String(event.sessionId).slice(0, 16), timestamp: new Date().toISOString() };

    if (event.type === 'pageview') {
      clean.path = String(event.path || '/').slice(0, 500);
      clean.referrer = String(event.referrer || '').slice(0, 1000);
      clean.source = String(event.source || 'direct').slice(0, 100);
      clean.utm = {
        source: event.utm?.source ? String(event.utm.source).slice(0, 100) : null,
        medium: event.utm?.medium ? String(event.utm.medium).slice(0, 100) : null,
        campaign: event.utm?.campaign ? String(event.utm.campaign).slice(0, 200) : null
      };
      clean.device = {
        type: String(event.device?.type || 'unknown').slice(0, 20),
        browser: String(event.device?.browser || 'unknown').slice(0, 50),
        os: String(event.device?.os || 'unknown').slice(0, 50),
        screen: String(event.device?.screen || '').slice(0, 20),
        connection: String(event.device?.connection || '').slice(0, 10),
        model: String(event.device?.model || '').slice(0, 50)
      };
      clean.language = String(event.language || '').slice(0, 10);
    }

    if (event.type === 'pageduration') {
      clean.path = String(event.path || '/').slice(0, 500);
      clean.duration = Math.max(0, Math.min(Number(event.duration) || 0, 86400));
    }

    await recordEvent(clean);
    res.json({ ok: true });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Admin: analytics dashboard page ───
router.get('/admin/analytics', requireAdmin, (req, res) => {
  const viewsDir = join(__dirname, '..', 'views');
  const locals = { ...res.app.locals, ...res.locals, title: 'Analytics' };
  res.app.render(join(viewsDir, 'admin', 'analytics.ejs'), { ...locals, layout: false }, (err, body) => {
    if (err) { console.error(err); return res.status(500).send('Render error'); }
    res.render(join(viewsDir, 'admin', 'layout.ejs'), { ...locals, body, layout: false });
  });
});

// ─── Admin: analytics data API ───
router.get('/admin/analytics/data', requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const from = req.query.from || today;
    const to = req.query.to || today;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const events = await readEventsForRange(from, to);
    const stats = aggregateEvents(events);

    const yesterdayDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const yesterdayEvents = await readEventsForRange(yesterdayDate, yesterdayDate);
    const yesterdayStats = aggregateEvents(yesterdayEvents);

    res.json({ ...stats, yesterday: { totalPageviews: yesterdayStats.totalPageviews, uniqueVisitors: yesterdayStats.uniqueVisitors } });
  } catch (err) {
    console.error('Analytics data error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
