# Analytics System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add self-hosted client-side analytics with a marketing-focused admin dashboard — tracking traffic sources, UTM campaigns, devices, page popularity, session flows, and visitor languages.

**Architecture:** A client-side JS script sends `pageview` and `pageduration` events to `POST /api/analytics`. The server appends events to daily JSON files (`data/analytics/YYYY-MM-DD.json`). The admin panel gets a new `/admin/analytics` page that reads these files, aggregates stats, and displays them with date-range filtering.

**Tech Stack:** Express.js routes, vanilla client-side JS, EJS templates, JSON file storage. No new dependencies.

**Note:** This project has no test framework. Verification steps use manual server testing (`npm run dev`, visit pages, check responses).

---

### Task 1: Analytics Data Helper

**Files:**
- Create: `helpers/analytics.js`
- Create: `data/analytics/` (directory)

**Step 1: Create the analytics data directory**

```bash
mkdir -p data/analytics
```

**Step 2: Create `helpers/analytics.js`**

This module handles recording events and aggregating analytics data from daily JSON files.

```javascript
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const analyticsDir = join(__dirname, '..', 'data', 'analytics');

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

async function ensureDir() {
  await mkdir(analyticsDir, { recursive: true });
}

export async function recordEvent(event) {
  await ensureDir();
  const file = join(analyticsDir, `${todayString()}.json`);
  let events = [];
  try {
    events = JSON.parse(await readFile(file, 'utf-8'));
  } catch { /* file doesn't exist yet */ }
  events.push(event);
  await writeFile(file, JSON.stringify(events, null, 2), 'utf-8');
}

export async function readEventsForRange(fromDate, toDate) {
  await ensureDir();
  const files = await readdir(analyticsDir);
  const events = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const date = f.replace('.json', '');
    if (date >= fromDate && date <= toDate) {
      try {
        const data = JSON.parse(await readFile(join(analyticsDir, f), 'utf-8'));
        events.push(...data);
      } catch { /* skip corrupt files */ }
    }
  }
  return events;
}

export function aggregateEvents(events) {
  const pageviews = events.filter(e => e.type === 'pageview');
  const durations = events.filter(e => e.type === 'pageduration');

  // Build duration lookup: sessionId:path -> duration
  const durationMap = {};
  for (const d of durations) {
    durationMap[`${d.sessionId}:${d.path}`] = d.duration;
  }

  // Unique sessions
  const sessionIds = new Set(pageviews.map(e => e.sessionId));

  // Bounce rate: sessions with only 1 pageview
  const sessionPageCounts = {};
  for (const pv of pageviews) {
    sessionPageCounts[pv.sessionId] = (sessionPageCounts[pv.sessionId] || 0) + 1;
  }
  const totalSessions = Object.keys(sessionPageCounts).length;
  const bouncedSessions = Object.values(sessionPageCounts).filter(c => c === 1).length;
  const bounceRate = totalSessions > 0 ? Math.round((bouncedSessions / totalSessions) * 100) : 0;

  // Avg duration
  const allDurations = Object.values(durationMap);
  const avgDuration = allDurations.length > 0
    ? Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length)
    : 0;

  // Traffic sources
  const sources = {};
  for (const pv of pageviews) {
    const src = pv.source || 'direct';
    sources[src] = (sources[src] || 0) + 1;
  }
  const sourceList = Object.entries(sources)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / pageviews.length) * 100) }))
    .sort((a, b) => b.count - a.count);

  // UTM campaigns
  const campaigns = {};
  for (const pv of pageviews) {
    if (pv.utm && pv.utm.campaign) {
      const key = pv.utm.campaign;
      if (!campaigns[key]) campaigns[key] = { campaign: key, source: pv.utm.source || '', medium: pv.utm.medium || '', count: 0 };
      campaigns[key].count++;
    }
  }
  const campaignList = Object.values(campaigns).sort((a, b) => b.count - a.count);

  // Top pages
  const pages = {};
  for (const pv of pageviews) {
    if (!pages[pv.path]) pages[pv.path] = { path: pv.path, views: 0, durations: [], entries: 0, exits: 0 };
    pages[pv.path].views++;
    const dur = durationMap[`${pv.sessionId}:${pv.path}`];
    if (dur !== undefined) pages[pv.path].durations.push(dur);
  }

  // Entry/exit pages: first and last pageview per session (by timestamp)
  const sessionEvents = {};
  for (const pv of pageviews) {
    if (!sessionEvents[pv.sessionId]) sessionEvents[pv.sessionId] = [];
    sessionEvents[pv.sessionId].push(pv);
  }
  for (const evts of Object.values(sessionEvents)) {
    evts.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const entry = evts[0].path;
    const exit = evts[evts.length - 1].path;
    if (pages[entry]) pages[entry].entries++;
    if (pages[exit]) pages[exit].exits++;
  }

  const pageList = Object.values(pages).map(p => ({
    path: p.path,
    views: p.views,
    avgDuration: p.durations.length > 0 ? Math.round(p.durations.reduce((a, b) => a + b, 0) / p.durations.length) : 0,
    entries: p.entries,
    exits: p.exits
  })).sort((a, b) => b.views - a.views);

  // Device types
  const deviceTypes = {};
  const browsers = {};
  const operatingSystems = {};
  const screens = {};
  const connections = {};

  for (const pv of pageviews) {
    if (pv.device) {
      const dt = pv.device.type || 'unknown';
      deviceTypes[dt] = (deviceTypes[dt] || 0) + 1;
      const br = pv.device.browser || 'unknown';
      browsers[br] = (browsers[br] || 0) + 1;
      const os = pv.device.os || 'unknown';
      operatingSystems[os] = (operatingSystems[os] || 0) + 1;
      if (pv.device.screen) screens[pv.device.screen] = (screens[pv.device.screen] || 0) + 1;
      if (pv.device.connection) connections[pv.device.connection] = (connections[pv.device.connection] || 0) + 1;
    }
  }

  const toSortedList = (obj) => Object.entries(obj)
    .map(([name, count]) => ({ name, count, pct: pageviews.length > 0 ? Math.round((count / pageviews.length) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  // Languages
  const languages = {};
  for (const pv of pageviews) {
    const lang = pv.language || 'unknown';
    languages[lang] = (languages[lang] || 0) + 1;
  }

  // User journeys: build path sequences per session
  const journeys = {};
  for (const evts of Object.values(sessionEvents)) {
    const path = evts.map(e => e.path).join(' → ');
    journeys[path] = (journeys[path] || 0) + 1;
  }
  const journeyList = Object.entries(journeys)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    totalPageviews: pageviews.length,
    uniqueVisitors: sessionIds.size,
    avgDuration,
    bounceRate,
    sources: sourceList,
    campaigns: campaignList,
    pages: pageList,
    devices: toSortedList(deviceTypes),
    browsers: toSortedList(browsers),
    operatingSystems: toSortedList(operatingSystems),
    screens: toSortedList(screens),
    connections: toSortedList(connections),
    languages: toSortedList(languages),
    journeys: journeyList
  };
}
```

**Step 3: Verify it loads without errors**

```bash
node -e "import('./helpers/analytics.js').then(() => console.log('OK'))"
```

Expected: `OK`

**Step 4: Commit**

```bash
git add helpers/analytics.js data/analytics/
git commit -m "feat: add analytics data helper for recording and aggregating events"
```

---

### Task 2: Analytics API Route

**Files:**
- Create: `routes/analytics.js`
- Modify: `server.js:1-59` — add import and mount the route

**Step 1: Create `routes/analytics.js`**

This file has two responsibilities: the public `POST /api/analytics` endpoint for receiving events from the tracking script, and the admin `GET /admin/analytics` dashboard page + `GET /admin/analytics/data` JSON API.

```javascript
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
  // Render using admin layout pattern
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

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const events = await readEventsForRange(from, to);
    const stats = aggregateEvents(events);

    // Also get yesterday's data for comparison
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
```

**Step 2: Mount routes in `server.js`**

Add import after line 12 (`import adminRouter from './routes/admin.js';`):

```javascript
import analyticsRouter from './routes/analytics.js';
```

Add route mounts after line 50 (`app.use('/admin', adminRouter);`):

```javascript
app.use(analyticsRouter);
```

Note: mount with no prefix because the router handles both `/api/analytics` and `/admin/analytics` paths internally.

**Step 3: Verify server starts**

```bash
node --env-file=.env server.js &
curl -s http://localhost:3000/api/analytics -X POST -H "Content-Type: application/json" -d '{"type":"pageview","sessionId":"test123","path":"/"}' | cat
kill %1
```

Expected: `{"ok":true}`

**Step 4: Commit**

```bash
git add routes/analytics.js server.js
git commit -m "feat: add analytics API endpoint and admin route"
```

---

### Task 3: Client-Side Tracking Script

**Files:**
- Create: `public/js/analytics.js`
- Modify: `views/layout.ejs:21-24` — add script tag

**Step 1: Create `public/js/analytics.js`**

```javascript
(function() {
  'use strict';

  // ─── Session cookie ───
  function getSessionId() {
    const match = document.cookie.match(/(?:^|;\s*)wanderer_sid=([^;]+)/);
    if (match) return match[1];
    const id = Math.random().toString(16).slice(2, 10);
    setSessionCookie(id);
    return id;
  }

  function setSessionCookie(id) {
    document.cookie = 'wanderer_sid=' + id + '; Path=/; SameSite=Lax; Max-Age=1800';
  }

  // ─── Device detection ───
  function getDeviceType() {
    var w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  function parseBrowser(ua) {
    if (/Edg\/(\d+)/.test(ua)) return 'Edge ' + RegExp.$1;
    if (/OPR\/(\d+)/.test(ua)) return 'Opera ' + RegExp.$1;
    if (/Chrome\/(\d+)/.test(ua)) return 'Chrome ' + RegExp.$1;
    if (/Safari\/.*Version\/(\d+)/.test(ua)) return 'Safari ' + RegExp.$1;
    if (/Firefox\/(\d+)/.test(ua)) return 'Firefox ' + RegExp.$1;
    return 'Other';
  }

  function parseOS(ua) {
    if (/Android (\d+[\d.]*)/.test(ua)) return 'Android ' + RegExp.$1;
    if (/iPhone|iPad/.test(ua)) {
      var m = ua.match(/OS (\d+[_\d]*)/);
      return 'iOS ' + (m ? m[1].replace(/_/g, '.') : '');
    }
    if (/Windows NT 10/.test(ua)) return 'Windows 10+';
    if (/Windows NT/.test(ua)) return 'Windows';
    if (/Mac OS X (\d+[_\d]*)/.test(ua)) return 'macOS ' + RegExp.$1.replace(/_/g, '.');
    if (/Linux/.test(ua)) return 'Linux';
    return 'Other';
  }

  function getDeviceModel() {
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      // async — we won't wait for it on first load
      return '';
    }
    var ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    var m = ua.match(/;\s*([^;)]+)\s*Build\//);
    return m ? m[1].trim() : '';
  }

  // ─── Traffic source ───
  function getSource(referrer) {
    if (!referrer) return 'direct';
    try {
      var host = new URL(referrer).hostname.toLowerCase();
      if (host.includes('google')) return 'google';
      if (host.includes('facebook') || host.includes('fb.com')) return 'facebook';
      if (host.includes('instagram')) return 'instagram';
      if (host.includes('tiktok')) return 'tiktok';
      if (host.includes('twitter') || host.includes('x.com')) return 'twitter';
      if (host.includes('youtube')) return 'youtube';
      if (host.includes('linkedin')) return 'linkedin';
      return host;
    } catch {
      return 'other';
    }
  }

  // ─── UTM params ───
  function getUTM() {
    var params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source') || null,
      medium: params.get('utm_medium') || null,
      campaign: params.get('utm_campaign') || null
    };
  }

  // ─── Send event ───
  function send(payload) {
    var data = JSON.stringify(payload);
    // Prefer sendBeacon for pageduration (works on page unload)
    if (payload.type === 'pageduration' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', new Blob([data], { type: 'application/json' }));
      return;
    }
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data
    }).catch(function() { /* silent fail */ });
  }

  // ─── Main ───
  var sessionId = getSessionId();
  setSessionCookie(sessionId); // renew expiry
  var ua = navigator.userAgent;
  var conn = navigator.connection || navigator.mozConnection || null;

  // Send pageview
  send({
    type: 'pageview',
    sessionId: sessionId,
    path: window.location.pathname,
    referrer: document.referrer,
    source: getSource(document.referrer),
    utm: getUTM(),
    device: {
      type: getDeviceType(),
      browser: parseBrowser(ua),
      os: parseOS(ua),
      screen: screen.width + 'x' + screen.height,
      connection: conn ? conn.effectiveType || '' : '',
      model: getDeviceModel()
    },
    language: (navigator.language || '').slice(0, 10)
  });

  // Track time on page
  var startTime = Date.now();
  var durationSent = false;

  function sendDuration() {
    if (durationSent) return;
    durationSent = true;
    var seconds = Math.round((Date.now() - startTime) / 1000);
    if (seconds < 1) return;
    send({
      type: 'pageduration',
      sessionId: sessionId,
      path: window.location.pathname,
      duration: seconds
    });
  }

  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') sendDuration();
  });
  window.addEventListener('pagehide', sendDuration);
})();
```

**Step 2: Add tracking script to `views/layout.ejs`**

After line 23 (`<script src="/js/forms.js"></script>`) add:

```html
  <script src="/js/analytics.js"></script>
```

**Step 3: Verify script loads**

```bash
cd /home/vaskak/projects/wanderer && node --env-file=.env server.js &
sleep 1
curl -s http://localhost:3000/ | grep -c 'analytics.js'
kill %1
```

Expected: `1`

**Step 4: Commit**

```bash
git add public/js/analytics.js views/layout.ejs
git commit -m "feat: add client-side analytics tracking script"
```

---

### Task 4: Admin Sidebar Navigation Update

**Files:**
- Modify: `views/admin/layout.ejs:20` — add Analytics nav link

**Step 1: Add Analytics link to admin sidebar**

In `views/admin/layout.ejs`, after line 20 (the Gallery nav link), add:

```html
      <a href="/admin/analytics" class="<%= currentPath.startsWith('/admin/analytics') ? 'active' : '' %>">Analytics</a>
```

**Step 2: Commit**

```bash
git add views/admin/layout.ejs
git commit -m "feat: add analytics link to admin sidebar navigation"
```

---

### Task 5: Analytics Dashboard CSS

**Files:**
- Modify: `public/css/admin.css:351` — append analytics-specific styles before the closing `}`

**Step 1: Add analytics dashboard styles**

Append the following at the end of `public/css/admin.css` (before the `@media` responsive block — so insert before line 346):

```css
/* Analytics Dashboard */
.analytics-filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.analytics-filters .btn.active {
  background: var(--admin-primary);
  color: #fff;
}

.analytics-filters input[type="date"] {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  font-size: 0.85rem;
  font-family: inherit;
}

.analytics-section {
  margin-bottom: 2rem;
}

.analytics-section h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.analytics-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.analytics-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.analytics-bar-label {
  min-width: 100px;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.analytics-bar-track {
  flex: 1;
  height: 20px;
  background: var(--admin-border);
  border-radius: 3px;
  overflow: hidden;
}

.analytics-bar-fill {
  height: 100%;
  background: var(--admin-primary);
  border-radius: 3px;
  transition: width 0.3s;
}

.analytics-bar-value {
  font-size: 0.8rem;
  color: var(--admin-text-muted);
  min-width: 60px;
  text-align: right;
}

.journey-item {
  padding: 0.5rem 0.75rem;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.journey-path {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--admin-text);
}

.journey-count {
  font-weight: 600;
  color: var(--admin-primary);
  white-space: nowrap;
  margin-left: 1rem;
}

.stat-trend {
  font-size: 0.75rem;
  margin-top: 0.15rem;
}

.stat-trend.up { color: #059669; }
.stat-trend.down { color: var(--admin-danger); }
.stat-trend.neutral { color: var(--admin-text-muted); }

.analytics-loading {
  text-align: center;
  padding: 3rem;
  color: var(--admin-text-muted);
}
```

**Step 2: Update the responsive media query**

The existing `@media (max-width: 768px)` block (line 346-351) should also handle the analytics grid. Add inside the media query:

```css
  .analytics-grid-2 { grid-template-columns: 1fr; }
```

**Step 3: Commit**

```bash
git add public/css/admin.css
git commit -m "feat: add analytics dashboard CSS styles"
```

---

### Task 6: Analytics Dashboard EJS Template

**Files:**
- Create: `views/admin/analytics.ejs`

**Step 1: Create the dashboard template**

```html
<div class="admin-header">
  <h1>Analytics</h1>
</div>

<!-- Date Filters -->
<div class="analytics-filters">
  <button class="btn btn-secondary btn-sm active" data-range="today">Today</button>
  <button class="btn btn-secondary btn-sm" data-range="7d">Last 7 Days</button>
  <button class="btn btn-secondary btn-sm" data-range="30d">Last 30 Days</button>
  <input type="date" id="analytics-from">
  <span style="line-height:2">—</span>
  <input type="date" id="analytics-to">
  <button class="btn btn-secondary btn-sm" id="analytics-custom">Apply</button>
</div>

<!-- Loading State -->
<div class="analytics-loading" id="analytics-loading">Loading analytics data...</div>

<!-- Dashboard Content (hidden until data loads) -->
<div id="analytics-content" style="display:none">

<!-- Stat Cards -->
<div class="stats-grid" id="stats-cards"></div>

<!-- Traffic Sources -->
<div class="analytics-section">
  <h2>Traffic Sources</h2>
  <div class="admin-table-wrap">
    <table class="admin-table">
      <thead><tr><th>Source</th><th>Visits</th><th>%</th></tr></thead>
      <tbody id="sources-table"></tbody>
    </table>
  </div>
</div>

<!-- UTM Campaigns -->
<div class="analytics-section" id="campaigns-section" style="display:none">
  <h2>UTM Campaigns</h2>
  <div class="admin-table-wrap">
    <table class="admin-table">
      <thead><tr><th>Campaign</th><th>Source</th><th>Medium</th><th>Visits</th></tr></thead>
      <tbody id="campaigns-table"></tbody>
    </table>
  </div>
</div>

<!-- Top Pages -->
<div class="analytics-section">
  <h2>Top Pages</h2>
  <div class="admin-table-wrap">
    <table class="admin-table">
      <thead><tr><th>Page</th><th>Views</th><th>Avg. Duration</th><th>Entries</th><th>Exits</th></tr></thead>
      <tbody id="pages-table"></tbody>
    </table>
  </div>
</div>

<!-- Devices & Tech -->
<div class="analytics-section">
  <h2>Devices & Tech</h2>
  <div class="analytics-grid-2">
    <div>
      <h3 style="font-size:0.95rem;margin-bottom:0.75rem">Device Types</h3>
      <div id="devices-bars"></div>
    </div>
    <div>
      <h3 style="font-size:0.95rem;margin-bottom:0.75rem">Browsers</h3>
      <div id="browsers-bars"></div>
    </div>
  </div>
  <div class="analytics-grid-2" style="margin-top:1rem">
    <div>
      <h3 style="font-size:0.95rem;margin-bottom:0.75rem">Operating Systems</h3>
      <div id="os-bars"></div>
    </div>
    <div>
      <h3 style="font-size:0.95rem;margin-bottom:0.75rem">Connections</h3>
      <div id="connections-bars"></div>
    </div>
  </div>
</div>

<!-- Languages -->
<div class="analytics-section">
  <h2>Visitor Languages</h2>
  <div id="languages-bars"></div>
</div>

<!-- User Journeys -->
<div class="analytics-section">
  <h2>User Journeys</h2>
  <div id="journeys-list"></div>
</div>

</div><!-- /analytics-content -->

<script>
(function() {
  var loading = document.getElementById('analytics-loading');
  var content = document.getElementById('analytics-content');

  function today() { return new Date().toISOString().slice(0, 10); }

  function daysAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  function formatDuration(s) {
    if (s < 60) return s + 's';
    var m = Math.floor(s / 60);
    return m + 'm ' + (s % 60) + 's';
  }

  function trendHTML(current, previous, label) {
    if (previous === 0 && current === 0) return '<div class="stat-trend neutral">—</div>';
    if (previous === 0) return '<div class="stat-trend up">↑ new</div>';
    var pct = Math.round(((current - previous) / previous) * 100);
    if (pct > 0) return '<div class="stat-trend up">↑ ' + pct + '% vs yesterday</div>';
    if (pct < 0) return '<div class="stat-trend down">↓ ' + Math.abs(pct) + '% vs yesterday</div>';
    return '<div class="stat-trend neutral">— same as yesterday</div>';
  }

  function renderBars(containerId, items) {
    var el = document.getElementById(containerId);
    if (!items || items.length === 0) { el.innerHTML = '<div style="color:var(--admin-text-muted);font-size:0.85rem">No data</div>'; return; }
    el.innerHTML = items.slice(0, 8).map(function(item) {
      return '<div class="analytics-bar">' +
        '<span class="analytics-bar-label" title="' + item.name + '">' + item.name + '</span>' +
        '<div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:' + item.pct + '%"></div></div>' +
        '<span class="analytics-bar-value">' + item.count + ' (' + item.pct + '%)</span>' +
      '</div>';
    }).join('');
  }

  function render(data) {
    loading.style.display = 'none';
    content.style.display = 'block';

    // Stat cards
    document.getElementById('stats-cards').innerHTML =
      '<div class="stat-card"><div class="stat-value">' + data.totalPageviews + '</div><div class="stat-label">Page Views</div>' + trendHTML(data.totalPageviews, data.yesterday.totalPageviews) + '</div>' +
      '<div class="stat-card"><div class="stat-value">' + data.uniqueVisitors + '</div><div class="stat-label">Unique Visitors</div>' + trendHTML(data.uniqueVisitors, data.yesterday.uniqueVisitors) + '</div>' +
      '<div class="stat-card"><div class="stat-value">' + formatDuration(data.avgDuration) + '</div><div class="stat-label">Avg. Time on Page</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + data.bounceRate + '%</div><div class="stat-label">Bounce Rate</div></div>';

    // Sources table
    document.getElementById('sources-table').innerHTML = data.sources.length === 0
      ? '<tr><td colspan="3" style="color:var(--admin-text-muted)">No data yet</td></tr>'
      : data.sources.map(function(s) { return '<tr><td>' + s.name + '</td><td>' + s.count + '</td><td>' + s.pct + '%</td></tr>'; }).join('');

    // Campaigns table
    var cs = document.getElementById('campaigns-section');
    if (data.campaigns.length > 0) {
      cs.style.display = 'block';
      document.getElementById('campaigns-table').innerHTML = data.campaigns.map(function(c) {
        return '<tr><td>' + c.campaign + '</td><td>' + (c.source || '—') + '</td><td>' + (c.medium || '—') + '</td><td>' + c.count + '</td></tr>';
      }).join('');
    } else {
      cs.style.display = 'none';
    }

    // Pages table
    document.getElementById('pages-table').innerHTML = data.pages.length === 0
      ? '<tr><td colspan="5" style="color:var(--admin-text-muted)">No data yet</td></tr>'
      : data.pages.map(function(p) { return '<tr><td>' + p.path + '</td><td>' + p.views + '</td><td>' + formatDuration(p.avgDuration) + '</td><td>' + p.entries + '</td><td>' + p.exits + '</td></tr>'; }).join('');

    // Bar charts
    renderBars('devices-bars', data.devices);
    renderBars('browsers-bars', data.browsers);
    renderBars('os-bars', data.operatingSystems);
    renderBars('connections-bars', data.connections);
    renderBars('languages-bars', data.languages);

    // Journeys
    var jl = document.getElementById('journeys-list');
    if (data.journeys.length === 0) {
      jl.innerHTML = '<div style="color:var(--admin-text-muted);font-size:0.85rem">No data yet</div>';
    } else {
      jl.innerHTML = data.journeys.map(function(j) {
        return '<div class="journey-item"><span class="journey-path">' + j.path + '</span><span class="journey-count">' + j.count + 'x</span></div>';
      }).join('');
    }
  }

  function loadData(from, to) {
    loading.style.display = 'block';
    content.style.display = 'none';
    fetch('/admin/analytics/data?from=' + from + '&to=' + to)
      .then(function(r) { return r.json(); })
      .then(render)
      .catch(function() { loading.textContent = 'Failed to load analytics data.'; });
  }

  // Date filter buttons
  var buttons = document.querySelectorAll('[data-range]');
  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      buttons.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var range = btn.getAttribute('data-range');
      if (range === 'today') loadData(today(), today());
      else if (range === '7d') loadData(daysAgo(6), today());
      else if (range === '30d') loadData(daysAgo(29), today());
    });
  });

  // Custom date range
  document.getElementById('analytics-custom').addEventListener('click', function() {
    var from = document.getElementById('analytics-from').value;
    var to = document.getElementById('analytics-to').value;
    if (from && to) {
      buttons.forEach(function(b) { b.classList.remove('active'); });
      loadData(from, to);
    }
  });

  // Initial load: today
  loadData(today(), today());
})();
</script>
```

**Step 2: Verify the template renders**

```bash
cd /home/vaskak/projects/wanderer && node --env-file=.env server.js &
sleep 1
curl -s -b "wanderer_admin=$(node -e "import('./helpers/auth.js').then(m => { const c = require('crypto'); const sign = (v) => { const s = c.createHmac('sha256', process.env.COOKIE_SECRET || 'wanderer-hmac-secret-key-2025').update(v).digest('base64url'); return v+'.'+s; }; console.log(sign('admin:'+Date.now())); })")" http://localhost:3000/admin/analytics | grep -c 'Analytics'
kill %1
```

Expected: at least `1` (page renders with "Analytics" title)

If curl auth is complex, alternatively just start the server and visit `http://localhost:3000/admin/analytics` in a browser after logging in.

**Step 3: Commit**

```bash
git add views/admin/analytics.ejs
git commit -m "feat: add analytics dashboard template with charts and filters"
```

---

### Task 7: Integration Verification

**Files:** None (manual testing)

**Step 1: Start the dev server**

```bash
cd /home/vaskak/projects/wanderer && npm run dev
```

**Step 2: Test the public tracking**

Open `http://localhost:3000/` in a browser. Navigate to a few pages (hikes, gallery, about, contact). Wait 5-10 seconds on each page. Check that `data/analytics/<today>.json` has been created and contains pageview + pageduration events.

```bash
cat data/analytics/$(date +%Y-%m-%d).json | head -50
```

Expected: JSON array with `pageview` and `pageduration` events.

**Step 3: Test the admin dashboard**

1. Visit `http://localhost:3000/admin/login`, enter password
2. Check sidebar has "Analytics" link
3. Click "Analytics" — dashboard loads with stat cards, tables, bar charts
4. Verify today's pageviews from Step 2 appear
5. Test "Last 7 Days" and "Last 30 Days" buttons
6. Test custom date range

**Step 4: Final commit**

If any fixes were needed during testing, commit them:

```bash
git add -A
git commit -m "fix: analytics integration adjustments from manual testing"
```

---

## Summary of All Files

| # | Action | File | Lines |
|---|---|---|---|
| 1 | Create | `helpers/analytics.js` | ~140 |
| 2 | Create | `routes/analytics.js` | ~80 |
| 3 | Create | `public/js/analytics.js` | ~120 |
| 4 | Create | `views/admin/analytics.ejs` | ~170 |
| 5 | Create | `data/analytics/` | directory |
| 6 | Modify | `server.js` | +2 lines (import + mount) |
| 7 | Modify | `views/layout.ejs` | +1 line (script tag) |
| 8 | Modify | `views/admin/layout.ejs` | +1 line (nav link) |
| 9 | Modify | `public/css/admin.css` | +90 lines (analytics styles) |
