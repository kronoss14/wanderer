# Wanderer: Maps, Blog & i18n Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add interactive trail maps (Leaflet.js), a markdown blog with admin panel, and full EN/KA bilingual support to the Wanderer hiking tourism site.

**Architecture:** i18n is implemented first since maps and blog both need bilingual fields. Language is determined by URL prefix (`/en/...` = English, no prefix = Georgian default). All JSON data gets `_en` suffix fields. Maps use Leaflet.js with KML/GPX files parsed server-side to GeoJSON. Blog stores markdown in JSON, rendered with `marked`.

**Tech Stack:** Leaflet.js (CDN), `@tmcw/togeojson` (npm), `marked` (npm), Express middleware for i18n

---

## Phase 1: Language Toggle (i18n)

### Task 1: Create translations data file

**Files:**
- Create: `data/translations.json`

**Step 1: Create the translations JSON file**

```json
{
  "nav.home": { "ka": "მთავარი", "en": "Home" },
  "nav.hikes": { "ka": "ლაშქრობები", "en": "Hikes" },
  "nav.about": { "ka": "ჩვენს შესახებ", "en": "About Us" },
  "nav.gallery": { "ka": "თავგადასავლები", "en": "Adventures" },
  "nav.reviews": { "ka": "შეფასებები", "en": "Reviews" },
  "nav.contact": { "ka": "კონტაქტი", "en": "Contact" },
  "nav.blog": { "ka": "ბლოგი", "en": "Blog" },
  "nav.map": { "ka": "რუკა", "en": "Map" },
  "hero.pre": { "ka": "საქართველოს მთები გელოდებათ", "en": "Georgia's Mountains Await" },
  "hero.title": { "ka": "აღმოაჩინე <span class=\"text-accent\">ველური</span> საქართველო", "en": "Discover <span class=\"text-accent\">Wild</span> Georgia" },
  "hero.sub": { "ka": "შეუერთდით ჩვენს გამოცდილ გიდებს საქართველოს ყველაზე ულამაზეს ბილიკებზე.", "en": "Join our experienced guides on Georgia's most beautiful trails." },
  "btn.all_hikes": { "ka": "ყველა ლაშქრობა", "en": "All Hikes" },
  "btn.about_us": { "ka": "ჩვენს შესახებ", "en": "About Us" },
  "btn.register": { "ka": "რეგისტრაცია", "en": "Register" },
  "btn.send": { "ka": "გაგზავნა", "en": "Send" },
  "btn.view_details": { "ka": "დეტალურად", "en": "View Details" },
  "btn.view_all": { "ka": "ყველას ნახვა", "en": "View All" },
  "section.featured": { "ka": "გამორჩეული ლაშქრობები", "en": "Featured Hikes" },
  "section.featured_sub": { "ka": "ჩვენი ყველაზე პოპულარული მარშრუტები", "en": "Our most popular routes" },
  "section.reviews": { "ka": "შეფასებები", "en": "Reviews" },
  "section.reviews_sub": { "ka": "რას ამბობენ ჩვენი მოხეტიალეები", "en": "What our wanderers say" },
  "hike.duration": { "ka": "ხანგრძლივობა", "en": "Duration" },
  "hike.distance": { "ka": "მანძილი", "en": "Distance" },
  "hike.difficulty": { "ka": "სირთულე", "en": "Difficulty" },
  "hike.elevation": { "ka": "სიმაღლე", "en": "Elevation" },
  "hike.group_size": { "ka": "ჯგუფის ზომა", "en": "Group Size" },
  "hike.price": { "ka": "ფასი", "en": "Price" },
  "hike.highlights": { "ka": "მთავარი აქცენტები", "en": "Highlights" },
  "hike.included": { "ka": "შეიცავს", "en": "Included" },
  "hike.not_included": { "ka": "არ შეიცავს", "en": "Not Included" },
  "hike.dates": { "ka": "თარიღები", "en": "Dates" },
  "hike.type.day": { "ka": "ერთდღიანი", "en": "Day Trip" },
  "hike.type.multi-day": { "ka": "მრავალდღიანი", "en": "Multi-Day" },
  "hike.type.cultural": { "ka": "კულტურული", "en": "Cultural" },
  "hike.difficulty.easy": { "ka": "მარტივი", "en": "Easy" },
  "hike.difficulty.medium": { "ka": "საშუალო", "en": "Medium" },
  "hike.difficulty.hard": { "ka": "რთული", "en": "Hard" },
  "contact.title": { "ka": "დაგვიკავშირდით", "en": "Contact Us" },
  "contact.name": { "ka": "სახელი", "en": "Name" },
  "contact.email": { "ka": "ელ-ფოსტა", "en": "Email" },
  "contact.subject": { "ka": "თემა", "en": "Subject" },
  "contact.message": { "ka": "შეტყობინება", "en": "Message" },
  "contact.success": { "ka": "თქვენი შეტყობინება გაიგზავნა!", "en": "Your message has been sent!" },
  "reg.name": { "ka": "სახელი", "en": "Name" },
  "reg.email": { "ka": "ელ-ფოსტა", "en": "Email" },
  "reg.phone": { "ka": "ტელეფონი", "en": "Phone" },
  "reg.success": { "ka": "თქვენი რეგისტრაცია მიღებულია!", "en": "Your registration has been received!" },
  "footer.discover": { "ka": "აღმოაჩინე", "en": "Discover" },
  "footer.all_hikes": { "ka": "ყველა ლაშქრობა", "en": "All Hikes" },
  "footer.day_hikes": { "ka": "ერთდღიანი ლაშქრობები", "en": "Day Hikes" },
  "footer.multi_day": { "ka": "მრავალდღიანი ლაშქრობები", "en": "Multi-Day Hikes" },
  "footer.cultural": { "ka": "კულტურული ტურები", "en": "Cultural Tours" },
  "footer.adventures": { "ka": "თავგადასავლები", "en": "Adventures" },
  "footer.company": { "ka": "კომპანია", "en": "Company" },
  "footer.about": { "ka": "ჩვენს შესახებ", "en": "About Us" },
  "footer.reviews": { "ka": "შეფასებები", "en": "Reviews" },
  "footer.contact": { "ka": "კონტაქტი", "en": "Contact" },
  "footer.get_in_touch": { "ka": "დაგვიკავშირდით", "en": "Get in Touch" },
  "footer.location": { "ka": "თბილისი, საქართველო", "en": "Tbilisi, Georgia" },
  "footer.rights": { "ka": "ყველა უფლება დაცულია.", "en": "All rights reserved." },
  "footer.tagline": { "ka": "აღმოაჩინეთ საქართველოს მთების ველური სილამაზე ადგილობრივ ექსპერტ გიდებთან ერთად.", "en": "Discover the wild beauty of Georgia's mountains with local expert guides." },
  "page.not_found": { "ka": "გვერდი ვერ მოიძებნა", "en": "Page Not Found" },
  "page.not_found_text": { "ka": "სამწუხაროდ, ეს გვერდი ვერ მოიძებნა.", "en": "Sorry, this page could not be found." },
  "page.back_home": { "ka": "მთავარ გვერდზე დაბრუნება", "en": "Back to Home" },
  "review.rating": { "ka": "შეფასება", "en": "Rating" },
  "review.avg_rating": { "ka": "საშუალო შეფასება", "en": "Average Rating" },
  "about.title": { "ka": "ჩვენი გუნდი", "en": "Our Team" },
  "map.title": { "ka": "ლაშქრობების რუკა", "en": "Hikes Map" },
  "map.all_hikes": { "ka": "ყველა ლაშქრობა რუკაზე", "en": "All hikes on the map" },
  "blog.title": { "ka": "ბლოგი", "en": "Blog" },
  "blog.read_more": { "ka": "წაიკითხე მეტი", "en": "Read More" },
  "blog.published": { "ka": "გამოქვეყნდა", "en": "Published" },
  "blog.by": { "ka": "ავტორი", "en": "By" },
  "blog.tags": { "ka": "ტეგები", "en": "Tags" },
  "blog.related_hikes": { "ka": "დაკავშირებული ლაშქრობები", "en": "Related Hikes" }
}
```

**Step 2: Commit**

```bash
git add data/translations.json
git commit -m "feat: add translations data file for EN/KA bilingual support"
```

---

### Task 2: Create i18n middleware

**Files:**
- Create: `helpers/i18n.js`

**Step 1: Create the i18n helper**

```js
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const translationsPath = join(__dirname, '..', 'data', 'translations.json');
let translations = JSON.parse(readFileSync(translationsPath, 'utf-8'));

// Reload translations in development
export function reloadTranslations() {
  translations = JSON.parse(readFileSync(translationsPath, 'utf-8'));
}

/**
 * Returns localized value for a content field.
 * If lang is 'en', tries field_en first, falls back to field.
 * If lang is 'ka', returns field directly.
 */
export function localize(obj, field, lang) {
  if (lang === 'en') {
    return obj[field + '_en'] || obj[field] || '';
  }
  return obj[field] || '';
}

/**
 * Express middleware that sets lang, t(), and l() on res.locals.
 * Detects language from URL prefix /en/...
 */
export function i18nMiddleware(req, res, next) {
  // Detect language from URL
  const lang = req.path.startsWith('/en') ? 'en' : 'ka';

  // Strip /en prefix for downstream routing
  if (lang === 'en' && req.path.startsWith('/en')) {
    req.url = req.url.replace(/^\/en/, '') || '/';
  }

  res.locals.lang = lang;
  res.locals.langPrefix = lang === 'en' ? '/en' : '';

  // t() — translate a UI string key
  res.locals.t = (key) => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry['ka'] || key;
  };

  // l() — localize a data field
  res.locals.l = (obj, field) => localize(obj, field, lang);

  // Set cookie for preference
  res.cookie('lang', lang, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: false, sameSite: 'Lax' });

  next();
}
```

**Step 2: Commit**

```bash
git add helpers/i18n.js
git commit -m "feat: add i18n middleware with t() and l() template helpers"
```

---

### Task 3: Wire i18n middleware into server.js

**Files:**
- Modify: `server.js`

**Step 1: Add import and middleware**

At the top of `server.js`, add the import:
```js
import { i18nMiddleware } from './helpers/i18n.js';
```

Add the middleware BEFORE the `res.locals` middleware (before line 32) and BEFORE route mounting:
```js
// i18n — must be before routes
app.use(i18nMiddleware);
```

**Step 2: Mount routes with /en prefix**

After the existing route mounts, add duplicates for English:
```js
// English routes (same handlers, /en prefix stripped by middleware)
app.use('/en', indexRouter);
app.use('/en/hikes', hikesRouter);
app.use('/en/about', aboutRouter);
app.use('/en/contact', contactRouter);
app.use('/en/gallery', galleryRouter);
app.use('/en/reviews', reviewsRouter);
```

Note: Admin routes stay at `/admin` only (no `/en/admin`).

**Step 3: Verify the server starts**

Run: `npm run dev`
Expected: Server starts without errors at http://localhost:3000

**Step 4: Commit**

```bash
git add server.js
git commit -m "feat: wire i18n middleware and /en route prefix into server"
```

---

### Task 4: Update header partial for i18n

**Files:**
- Modify: `views/partials/_header.ejs`

**Step 1: Replace hardcoded Georgian nav labels with t() calls**

Replace each nav link text:
- `მთავარი` → `<%= t('nav.home') %>`
- `ლაშქრობები` → `<%= t('nav.hikes') %>`
- `ჩვენს შესახებ` → `<%= t('nav.about') %>`
- `თავგადასავლები` → `<%= t('nav.gallery') %>`
- `შეფასებები` → `<%= t('nav.reviews') %>`
- `კონტაქტი` → `<%= t('nav.contact') %>`

Update all `href` values to use `langPrefix`:
- `href="/"` → `href="<%= langPrefix %>/"`
- `href="/hikes"` → `href="<%= langPrefix %>/hikes"`
- etc.

Update active class checks to handle both prefixed and non-prefixed paths. Since the middleware strips `/en` from `req.url` but `currentPath` is set from `req.path` (original), we need to adjust. Change the `res.locals.currentPath` in `server.js` to use the stripped path:

In `server.js`, move `res.locals.currentPath = req.path;` to AFTER the i18n middleware, or better: set it inside i18n middleware after stripping. Actually simpler: in the existing `server.js` locals middleware (which runs after i18n), change:
```js
res.locals.currentPath = req.path;
```
to:
```js
res.locals.currentPath = req.url.split('?')[0];
```
Since `req.url` is already stripped of `/en` by the i18n middleware, this gives the correct path for nav active checks.

**Step 2: Add language toggle button**

After the `.nav-social` div, add:
```html
<div class="nav-lang">
  <% if (lang === 'ka') { %>
    <a href="/en<%= currentPath %>" class="lang-switch">EN</a>
  <% } else { %>
    <a href="<%= currentPath %>" class="lang-switch">KA</a>
  <% } %>
</div>
```

**Step 3: Verify in browser**

Run: `npm run dev`
- Visit http://localhost:3000 — nav should show Georgian text
- Visit http://localhost:3000/en — nav should show English text
- Language toggle link should appear and switch between languages

**Step 4: Commit**

```bash
git add views/partials/_header.ejs server.js
git commit -m "feat: add i18n to header nav and language toggle"
```

---

### Task 5: Update footer partial for i18n

**Files:**
- Modify: `views/partials/_footer.ejs`

**Step 1: Replace hardcoded text with t() calls and langPrefix hrefs**

Replace all Georgian text in footer with corresponding `t()` calls:
- Section headings: `აღმოაჩინე` → `<%= t('footer.discover') %>`, etc.
- Link text: `ყველა ლაშქრობა` → `<%= t('footer.all_hikes') %>`, etc.
- Footer tagline, location, copyright text
- All `href` attributes get `<%= langPrefix %>` prefix

**Step 2: Commit**

```bash
git add views/partials/_footer.ejs
git commit -m "feat: add i18n to footer partial"
```

---

### Task 6: Update page templates for i18n

**Files:**
- Modify: `views/pages/home.ejs`
- Modify: `views/pages/hikes.ejs`
- Modify: `views/pages/hike-detail.ejs`
- Modify: `views/pages/about.ejs`
- Modify: `views/pages/contact.ejs`
- Modify: `views/pages/gallery.ejs`
- Modify: `views/pages/gallery-detail.ejs`
- Modify: `views/pages/reviews.ejs`
- Modify: `views/pages/404.ejs`

**Step 1: Update each template**

For each page, apply these patterns:

**Static UI text:** Replace with `t('key')`:
```ejs
<h1><%= t('section.featured') %></h1>
```

**Dynamic content fields (hike names, descriptions, etc.):** Replace with `l()`:
```ejs
<h2><%= l(hike, 'name') %></h2>
<p><%= l(hike, 'summary') %></p>
<p><%= l(hike, 'description') %></p>
```

**Links:** Add `langPrefix`:
```ejs
<a href="<%= langPrefix %>/hikes/<%= hike.id %>">
```

**Partials that receive data:** The `l()` function is available in all partials via `res.locals`, so partials can use it directly.

Do this template by template — each one is a small change. Start with `home.ejs`, verify in browser, then proceed.

**Step 2: Update partials that display content**

- Modify: `views/partials/_hike-card.ejs` — use `l(hike, 'name')`, `l(hike, 'summary')`, add `langPrefix` to link
- Modify: `views/partials/_review-card.ejs` — use `l(review, 'text')` if reviews get translated
- Modify: `views/partials/_gallery-item.ejs` — use `l(item, 'title')`

**Step 3: Verify each page in both languages**

Run: `npm run dev`
- Visit each page at `/` and `/en/` prefix
- UI strings should translate; content stays Georgian until `_en` fields are added

**Step 4: Commit**

```bash
git add views/
git commit -m "feat: add i18n to all page templates and partials"
```

---

### Task 7: Add `_en` fields to existing JSON data

**Files:**
- Modify: `data/hikes.json`
- Modify: `data/guides.json`
- Modify: `data/gallery.json`
- Modify: `data/pricing.json`

**Step 1: Add empty `_en` fields to each data file**

For each hike in `hikes.json`, add:
```json
"name_en": "",
"summary_en": "",
"description_en": "",
"highlights_en": [],
"included_en": [],
"notIncluded_en": []
```

For each guide in `guides.json`:
```json
"name_en": "",
"role_en": "",
"bio_en": "",
"specialties_en": []
```

For each gallery item in `gallery.json`:
```json
"title_en": "",
"description_en": ""
```

For each pricing tier in `pricing.json`:
```json
"tier_en": "",
"description_en": "",
"priceLabel_en": "",
"unit_en": "",
"features_en": [],
"cta_en": ""
```

**Step 2: Commit**

```bash
git add data/
git commit -m "feat: add empty _en fields to all data files for bilingual support"
```

---

### Task 8: Update admin forms for dual-language fields

**Files:**
- Modify: `views/admin/hikes-form.ejs`
- Modify: `views/admin/guides-form.ejs`
- Modify: `views/admin/pricing-form.ejs`
- Modify: `views/admin/gallery-form.ejs`
- Modify: `routes/admin.js`

**Step 1: Add English fields to hike form**

For each text field in `hikes-form.ejs`, add an English counterpart below it. Example pattern:
```html
<div class="form-group">
  <label for="name">Name (KA)</label>
  <input type="text" id="name" name="name" value="<%= hike.name || '' %>">
</div>
<div class="form-group">
  <label for="name_en">Name (EN)</label>
  <input type="text" id="name_en" name="name_en" value="<%= hike.name_en || '' %>">
</div>
```

Apply to: `name`, `summary`, `description`, `highlights`, `included`, `notIncluded`.

**Step 2: Update admin.js hike CRUD to save `_en` fields**

In both `router.post('/hikes')` and `router.post('/hikes/edit/:id')`, add to the hike object:
```js
name_en: b.name_en || '',
summary_en: b.summary_en || '',
description_en: b.description_en || '',
highlights_en: textToArray(b.highlights_en),
included_en: textToArray(b.included_en),
notIncluded_en: textToArray(b.notIncluded_en),
```

**Step 3: Repeat for guides, pricing, gallery forms**

Same pattern — add `_en` input fields and update the route handlers.

**Step 4: Add admin CSS for side-by-side language fields**

Add to `public/css/admin.css`:
```css
.form-lang-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 768px) {
  .form-lang-row { grid-template-columns: 1fr; }
}
```

Wrap KA/EN field pairs in `<div class="form-lang-row">`.

**Step 5: Verify in admin panel**

Run: `npm run dev`
- Go to `/admin/hikes/edit/<any-hike-id>`
- English fields should appear next to Georgian fields
- Save and verify data persists in JSON

**Step 6: Commit**

```bash
git add views/admin/ routes/admin.js public/css/admin.css
git commit -m "feat: add dual-language fields to all admin forms"
```

---

### Task 9: Add language toggle CSS

**Files:**
- Modify: `public/css/main.css`

**Step 1: Add styles for language toggle**

```css
.nav-lang {
  margin-left: 1rem;
}
.lang-switch {
  display: inline-block;
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-decoration: none;
  transition: var(--transition);
}
.lang-switch:hover {
  background: var(--accent-orange);
  border-color: var(--accent-orange);
  color: #fff;
}
```

**Step 2: Commit**

```bash
git add public/css/main.css
git commit -m "feat: add language toggle CSS styles"
```

---

## Phase 2: Interactive Maps

### Task 10: Install @tmcw/togeojson and add Leaflet CDN

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `views/layout.ejs`

**Step 1: Install togeojson**

Run: `npm install @tmcw/togeojson`

**Step 2: Add Leaflet CSS/JS to layout.ejs**

In `views/layout.ejs`, add to `<head>` (after the Google Fonts link):
```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
```

Before `</body>`, add (before `main.js`):
```html
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
```

**Step 3: Commit**

```bash
git add package.json package-lock.json views/layout.ejs
git commit -m "feat: install togeojson and add Leaflet CDN to layout"
```

---

### Task 11: Create geo helper for KML/GPX parsing

**Files:**
- Create: `helpers/geo.js`

**Step 1: Create the geo helper**

```js
import { DOMParser } from '@tmcw/togeojson';
import * as toGeoJSON from '@tmcw/togeojson';
import { JSDOM } from 'jsdom';

// Note: @tmcw/togeojson needs a DOMParser. In Node.js we use jsdom.
// If jsdom is too heavy, we can parse manually. Let's check if togeojson
// works with a minimal XML parser.

/**
 * Parse a KML or GPX string into a simplified route object.
 * Returns: { coordinates: [[lat, lng], ...], pois: [] }
 */
export function parseRouteFile(content, format) {
  const dom = new JSDOM(content, { contentType: 'text/xml' });
  const doc = dom.window.document;

  let geojson;
  if (format === 'kml') {
    geojson = toGeoJSON.kml(doc);
  } else if (format === 'gpx') {
    geojson = toGeoJSON.gpx(doc);
  } else {
    throw new Error('Unsupported format: ' + format);
  }

  const coordinates = [];
  const pois = [];

  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (geom.type === 'LineString') {
      // GeoJSON is [lng, lat], we store as [lat, lng] for Leaflet
      for (const coord of geom.coordinates) {
        coordinates.push([coord[1], coord[0]]);
      }
    } else if (geom.type === 'MultiLineString') {
      for (const line of geom.coordinates) {
        for (const coord of line) {
          coordinates.push([coord[1], coord[0]]);
        }
      }
    } else if (geom.type === 'Point') {
      pois.push({
        name: feature.properties?.name || 'Point',
        type: 'marker',
        lat: geom.coordinates[1],
        lng: geom.coordinates[0]
      });
    }
  }

  return { coordinates, pois };
}
```

**Step 2: Install jsdom**

Run: `npm install jsdom`

**Step 3: Commit**

```bash
git add helpers/geo.js package.json package-lock.json
git commit -m "feat: add geo helper for KML/GPX route file parsing"
```

---

### Task 12: Add route file upload to admin hike form

**Files:**
- Modify: `routes/admin.js`
- Modify: `views/admin/hikes-form.ejs`

**Step 1: Add route file upload endpoint to admin.js**

After the existing `/upload` endpoint, add:
```js
import { parseRouteFile } from '../helpers/geo.js';

router.post('/upload-route', (req, res) => {
  try {
    const { filename, data } = req.body;
    if (!filename || !data) {
      return res.status(400).json({ error: 'Missing filename or data' });
    }

    // Validate extension
    const ext = filename.split('.').pop().toLowerCase();
    if (!['kml', 'gpx', 'kmz'].includes(ext)) {
      return res.status(400).json({ error: 'Only KML, KMZ, and GPX files are supported' });
    }

    // Decode base64 content
    const match = data.match(/^data:[^;]+;base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    const content = Buffer.from(match[1], 'base64').toString('utf-8');
    const format = ext === 'kmz' ? 'kml' : ext;
    const route = parseRouteFile(content, format);

    res.json({ route });
  } catch (err) {
    console.error('Route parse error:', err);
    res.status(500).json({ error: 'Failed to parse route file' });
  }
});
```

**Step 2: Add route fields to hike form**

In `hikes-form.ejs`, add a section after the images:
```html
<div class="form-group">
  <label>Trail Route</label>
  <div class="hint">Upload a KML or GPX file exported from MAPS.ME or other apps</div>
  <input type="file" id="route-file" accept=".kml,.gpx,.kmz">
  <button type="button" id="parse-route-btn" class="btn btn-secondary btn-sm" style="margin-top:0.5rem">Parse Route</button>
  <span id="route-status"></span>
  <input type="hidden" name="routeData" id="routeData" value='<%= JSON.stringify(hike.route || {}) %>'>
  <div id="route-preview" style="height:300px;margin-top:1rem;border-radius:var(--admin-radius);overflow:hidden;<%= (hike.route && hike.route.coordinates && hike.route.coordinates.length) ? '' : 'display:none' %>"></div>
</div>
```

**Step 3: Update hike CRUD in admin.js to save route data**

In both POST handlers for hikes, add:
```js
route: b.routeData ? JSON.parse(b.routeData) : (hike.route || {}),
```

**Step 4: Add route upload JS to admin**

Add to `public/js/admin-upload.js` (or create inline in the form):
```js
// Route file parsing
const routeFile = document.getElementById('route-file');
const parseBtn = document.getElementById('parse-route-btn');
const routeData = document.getElementById('routeData');
const routeStatus = document.getElementById('route-status');
const routePreview = document.getElementById('route-preview');

if (parseBtn && routeFile) {
  parseBtn.addEventListener('click', async () => {
    const file = routeFile.files[0];
    if (!file) { routeStatus.textContent = 'Select a file first'; return; }

    routeStatus.textContent = 'Parsing...';
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const resp = await fetch('/admin/upload-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, data: e.target.result })
        });
        const result = await resp.json();
        if (result.error) { routeStatus.textContent = 'Error: ' + result.error; return; }
        routeData.value = JSON.stringify(result.route);
        routeStatus.textContent = `Parsed: ${result.route.coordinates.length} points, ${result.route.pois.length} POIs`;
        // Show preview map
        routePreview.style.display = 'block';
        if (window.L) {
          routePreview.innerHTML = '';
          const map = L.map(routePreview).setView([42.3, 43.5], 7);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
          }).addTo(map);
          if (result.route.coordinates.length) {
            const line = L.polyline(result.route.coordinates, { color: '#E8811A', weight: 3 }).addTo(map);
            map.fitBounds(line.getBounds(), { padding: [20, 20] });
          }
          result.route.pois.forEach(p => {
            L.marker([p.lat, p.lng]).addTo(map).bindPopup(p.name);
          });
        }
      } catch (err) { routeStatus.textContent = 'Parse failed'; }
    };
    reader.readAsDataURL(file);
  });

  // Show existing route on page load
  if (routeData.value && routeData.value !== '{}') {
    try {
      const route = JSON.parse(routeData.value);
      if (route.coordinates && route.coordinates.length && window.L) {
        routePreview.style.display = 'block';
        setTimeout(() => {
          const map = L.map(routePreview).setView([42.3, 43.5], 7);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
          }).addTo(map);
          const line = L.polyline(route.coordinates, { color: '#E8811A', weight: 3 }).addTo(map);
          map.fitBounds(line.getBounds(), { padding: [20, 20] });
          route.pois?.forEach(p => {
            L.marker([p.lat, p.lng]).addTo(map).bindPopup(p.name);
          });
        }, 100);
      }
    } catch {}
  }
}
```

**Step 5: Add Leaflet CDN to admin layout**

In `views/admin/layout.ejs`, add in `<head>`:
```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
```
And before `</body>`:
```html
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
```

**Step 6: Verify route upload**

Run: `npm run dev`
- Go to admin → edit a hike → upload a KML/GPX file
- Should see parsed point count and a preview map

**Step 7: Commit**

```bash
git add routes/admin.js views/admin/hikes-form.ejs views/admin/layout.ejs public/js/admin-upload.js
git commit -m "feat: add KML/GPX route file upload with preview map in admin"
```

---

### Task 13: Create frontend map component

**Files:**
- Create: `public/js/map.js`

**Step 1: Create the map JavaScript**

```js
(function () {
  'use strict';

  // POI type → icon config
  const POI_ICONS = {
    viewpoint: { icon: '👁️', color: '#E8811A' },
    water: { icon: '💧', color: '#3B82F6' },
    campsite: { icon: '⛺', color: '#10B981' },
    marker: { icon: '📍', color: '#E8811A' }
  };

  function createPOIIcon(type) {
    const config = POI_ICONS[type] || POI_ICONS.marker;
    return L.divIcon({
      html: `<span style="font-size:1.5rem">${config.icon}</span>`,
      className: 'poi-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }

  /**
   * Initialize a trail map in the given container.
   * @param {string} containerId - DOM element ID
   * @param {object} route - { coordinates: [[lat,lng],...], pois: [...] }
   * @param {object} [options] - { zoom, interactive }
   */
  window.initTrailMap = function (containerId, route, options = {}) {
    const el = document.getElementById(containerId);
    if (!el || !window.L || !route || !route.coordinates || !route.coordinates.length) return null;

    const map = L.map(containerId, {
      scrollWheelZoom: options.interactive !== false
    }).setView([42.3, 43.5], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
    }).addTo(map);

    // Trail polyline
    const line = L.polyline(route.coordinates, {
      color: '#E8811A',
      weight: 4,
      opacity: 0.9
    }).addTo(map);

    // Start/End markers
    const start = route.coordinates[0];
    const end = route.coordinates[route.coordinates.length - 1];

    L.marker(start, {
      icon: L.divIcon({
        html: '<span style="font-size:1.5rem">🟢</span>',
        className: 'poi-icon', iconSize: [28, 28], iconAnchor: [14, 14]
      })
    }).addTo(map).bindPopup('Start');

    L.marker(end, {
      icon: L.divIcon({
        html: '<span style="font-size:1.5rem">🏁</span>',
        className: 'poi-icon', iconSize: [28, 28], iconAnchor: [14, 14]
      })
    }).addTo(map).bindPopup('End');

    // POI markers
    if (route.pois) {
      route.pois.forEach(poi => {
        L.marker([poi.lat, poi.lng], { icon: createPOIIcon(poi.type) })
          .addTo(map)
          .bindPopup(`<strong>${poi.name}</strong>`);
      });
    }

    map.fitBounds(line.getBounds(), { padding: [30, 30] });

    return map;
  };

  /**
   * Initialize an overview map with multiple hike markers.
   * @param {string} containerId
   * @param {Array} hikes - array of hike objects with .route and .id, .name
   * @param {string} langPrefix - '' or '/en'
   */
  window.initOverviewMap = function (containerId, hikes, langPrefix) {
    const el = document.getElementById(containerId);
    if (!el || !window.L) return null;

    const map = L.map(containerId).setView([42.3, 43.5], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
    }).addTo(map);

    const bounds = L.latLngBounds();
    let hasMarkers = false;

    hikes.forEach(hike => {
      if (!hike.route || !hike.route.coordinates || !hike.route.coordinates.length) return;

      hasMarkers = true;

      // Draw trail line
      const line = L.polyline(hike.route.coordinates, {
        color: '#E8811A', weight: 3, opacity: 0.7
      }).addTo(map);

      bounds.extend(line.getBounds());

      // Add clickable marker at start of trail
      const start = hike.route.coordinates[0];
      L.marker(start)
        .addTo(map)
        .bindPopup(`
          <strong>${hike.displayName}</strong><br>
          <a href="${langPrefix}/hikes/${hike.id}">View Details →</a>
        `);
    });

    if (hasMarkers) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    return map;
  };
})();
```

**Step 2: Add map.js to layout.ejs**

In `views/layout.ejs`, add before `</body>` (after leaflet.js, before main.js):
```html
<script src="/js/map.js"></script>
```

**Step 3: Commit**

```bash
git add public/js/map.js views/layout.ejs
git commit -m "feat: add frontend map component with trail and overview modes"
```

---

### Task 14: Add map to hike detail page

**Files:**
- Modify: `views/pages/hike-detail.ejs`
- Modify: `public/css/pages.css`

**Step 1: Add map section to hike-detail.ejs**

After the description/highlights section and before reviews, add:
```html
<% if (hike.route && hike.route.coordinates && hike.route.coordinates.length) { %>
<section class="detail-section">
  <h2 class="detail-section-title"><%= t('map.title') %></h2>
  <div id="hike-trail-map" class="trail-map"></div>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      initTrailMap('hike-trail-map', <%- JSON.stringify(hike.route) %>);
    });
  </script>
</section>
<% } %>
```

**Step 2: Add map CSS**

In `public/css/pages.css`, add:
```css
.trail-map {
  height: 450px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-top: 1rem;
}
.poi-icon {
  background: none !important;
  border: none !important;
}
@media (max-width: 768px) {
  .trail-map { height: 300px; }
}
```

**Step 3: Verify**

Run: `npm run dev`
- Edit a hike in admin, upload a KML/GPX file
- Visit that hike's detail page
- Map should render with trail line and markers

**Step 4: Commit**

```bash
git add views/pages/hike-detail.ejs public/css/pages.css
git commit -m "feat: add interactive trail map to hike detail page"
```

---

### Task 15: Create overview map page

**Files:**
- Create: `routes/map.js`
- Create: `views/pages/map.ejs`
- Modify: `server.js`
- Modify: `views/partials/_header.ejs`

**Step 1: Create map route**

```js
import { Router } from 'express';
import { readJSON } from '../helpers/data.js';

const router = Router();

router.get('/', async (req, res) => {
  const hikes = await readJSON('hikes.json');
  res.render('pages/map', { title: res.locals.t('map.title'), hikes });
});

export default router;
```

**Step 2: Create map page template**

```html
<section class="page-hero" style="min-height: 200px">
  <div class="page-hero-bg" style="background-image: url('/images/hero-hikes.jpg'); background-position: center 65%"></div>
  <div class="page-hero-overlay" style="background: linear-gradient(180deg, rgba(13,13,13,0.7) 0%, rgba(13,13,13,0.5) 100%)"></div>
  <div class="page-hero-content container">
    <h1><%= t('map.title') %></h1>
    <p><%= t('map.all_hikes') %></p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div id="overview-map" class="overview-map"></div>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        var hikes = <%- JSON.stringify(hikes.map(h => ({
          id: h.id,
          displayName: l(h, 'name'),
          route: h.route || {}
        }))) %>;
        initOverviewMap('overview-map', hikes, '<%= langPrefix %>');
      });
    </script>
  </div>
</section>
```

**Step 3: Add map CSS for overview**

In `public/css/pages.css`:
```css
.overview-map {
  height: 600px;
  border-radius: var(--radius-lg);
  overflow: hidden;
}
@media (max-width: 768px) {
  .overview-map { height: 400px; }
}
```

**Step 4: Mount route in server.js**

Add import:
```js
import mapRouter from './routes/map.js';
```

Mount (for both languages):
```js
app.use('/map', mapRouter);
app.use('/en/map', mapRouter);
```

**Step 5: Add nav link**

In `_header.ejs`, add a nav item for map (after gallery):
```html
<li><a href="<%= langPrefix %>/map" class="nav-link<%= currentPath === '/map' ? ' active' : '' %>"><%= t('nav.map') %></a></li>
```

Also add to footer links.

**Step 6: Verify**

Run: `npm run dev`
- Visit `/map` — overview map of Georgia should show
- Any hikes with route data should appear as markers

**Step 7: Commit**

```bash
git add routes/map.js views/pages/map.ejs public/css/pages.css server.js views/partials/_header.ejs views/partials/_footer.ejs
git commit -m "feat: add overview map page showing all hikes on a single map"
```

---

## Phase 3: Blog

### Task 16: Install marked and create blog data file

**Files:**
- Modify: `package.json` (via npm install)
- Create: `data/blog.json`

**Step 1: Install marked**

Run: `npm install marked`

**Step 2: Create empty blog data file**

```json
[]
```

**Step 3: Commit**

```bash
git add package.json package-lock.json data/blog.json
git commit -m "feat: install marked and create blog data file"
```

---

### Task 17: Create blog routes

**Files:**
- Create: `routes/blog.js`
- Modify: `server.js`

**Step 1: Create blog route**

```js
import { Router } from 'express';
import { marked } from 'marked';
import { readJSON } from '../helpers/data.js';

const router = Router();

router.get('/', async (req, res) => {
  const posts = await readJSON('blog.json');
  const { tag } = req.query;

  let published = posts.filter(p => p.published);
  // Sort by date descending
  published.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  if (tag) {
    published = published.filter(p => p.tags && p.tags.includes(tag));
  }

  // Collect all unique tags
  const allTags = [...new Set(posts.flatMap(p => p.tags || []))];

  res.render('pages/blog', {
    title: res.locals.t('blog.title'),
    posts: published,
    allTags,
    activeTag: tag || ''
  });
});

router.get('/:slug', async (req, res) => {
  const posts = await readJSON('blog.json');
  const post = posts.find(p => p.slug === req.params.slug && p.published);
  if (!post) return res.status(404).render('pages/404', { title: 'Not Found' });

  const lang = res.locals.lang;
  const contentField = lang === 'en' && post.content_en ? post.content_en : post.content;
  const renderedContent = marked(contentField || '');

  // Get related hikes if any
  let relatedHikes = [];
  if (post.relatedHikeIds && post.relatedHikeIds.length) {
    const hikes = await readJSON('hikes.json');
    relatedHikes = hikes.filter(h => post.relatedHikeIds.includes(h.id));
  }

  // Get author info
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
});

export default router;
```

**Step 2: Mount in server.js**

Add import:
```js
import blogRouter from './routes/blog.js';
```

Mount:
```js
app.use('/blog', blogRouter);
app.use('/en/blog', blogRouter);
```

**Step 3: Commit**

```bash
git add routes/blog.js server.js
git commit -m "feat: add blog routes with tag filtering and markdown rendering"
```

---

### Task 18: Create blog listing page

**Files:**
- Create: `views/pages/blog.ejs`
- Modify: `public/css/pages.css`
- Modify: `public/css/components.css`

**Step 1: Create blog listing template**

```html
<section class="page-hero">
  <div class="page-hero-bg" style="background-image: url('/images/hero-hikes.jpg'); background-position: center 65%"></div>
  <div class="page-hero-overlay" style="background: linear-gradient(180deg, rgba(13,13,13,0.7) 0%, rgba(13,13,13,0.5) 100%)"></div>
  <div class="page-hero-content container">
    <h1><%= t('blog.title') %></h1>
  </div>
</section>

<section class="section">
  <div class="container">
    <% if (allTags.length) { %>
    <div class="blog-tags-filter">
      <a href="<%= langPrefix %>/blog" class="tag-btn<%= !activeTag ? ' active' : '' %>">All</a>
      <% allTags.forEach(tag => { %>
        <a href="<%= langPrefix %>/blog?tag=<%= encodeURIComponent(tag) %>" class="tag-btn<%= activeTag === tag ? ' active' : '' %>"><%= tag %></a>
      <% }) %>
    </div>
    <% } %>

    <% if (posts.length) { %>
    <div class="blog-grid">
      <% posts.forEach(post => { %>
      <article class="blog-card">
        <% if (post.coverImage) { %>
        <a href="<%= langPrefix %>/blog/<%= post.slug %>" class="blog-card-image">
          <img src="<%= post.coverImage %>" alt="<%= l(post, 'title') %>" loading="lazy">
        </a>
        <% } %>
        <div class="blog-card-body">
          <div class="blog-card-meta">
            <time><%= new Date(post.publishedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'ka-GE', { year: 'numeric', month: 'long', day: 'numeric' }) %></time>
            <% if (post.tags && post.tags.length) { %>
              <% post.tags.forEach(tag => { %>
                <span class="blog-tag"><%= tag %></span>
              <% }) %>
            <% } %>
          </div>
          <h2 class="blog-card-title">
            <a href="<%= langPrefix %>/blog/<%= post.slug %>"><%= l(post, 'title') %></a>
          </h2>
          <p class="blog-card-excerpt"><%= (l(post, 'content') || '').split('\n')[0].replace(/^#+\s*/, '').substring(0, 200) %>...</p>
          <a href="<%= langPrefix %>/blog/<%= post.slug %>" class="btn btn-secondary btn-sm"><%= t('blog.read_more') %></a>
        </div>
      </article>
      <% }) %>
    </div>
    <% } else { %>
    <p class="text-center" style="color: var(--text-muted); padding: 3rem 0;">No posts yet.</p>
    <% } %>
  </div>
</section>
```

**Step 2: Add blog CSS to components.css**

```css
/* Blog */
.blog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 2rem;
}
.blog-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: transform var(--transition), box-shadow var(--transition);
}
.blog-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
.blog-card-image img {
  width: 100%;
  height: 220px;
  object-fit: cover;
  display: block;
}
.blog-card-body {
  padding: 1.5rem;
}
.blog-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}
.blog-tag {
  background: rgba(232, 129, 26, 0.15);
  color: var(--accent-orange);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}
.blog-card-title {
  font-size: 1.3rem;
  margin-bottom: 0.75rem;
}
.blog-card-title a {
  color: var(--text-primary);
  text-decoration: none;
}
.blog-card-title a:hover {
  color: var(--accent-orange);
}
.blog-card-excerpt {
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 1rem;
}
.blog-tags-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
}
.tag-btn {
  padding: 0.4rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.85rem;
  transition: var(--transition);
}
.tag-btn:hover, .tag-btn.active {
  background: var(--accent-orange);
  border-color: var(--accent-orange);
  color: #fff;
}
```

**Step 3: Commit**

```bash
git add views/pages/blog.ejs public/css/components.css public/css/pages.css
git commit -m "feat: add blog listing page with tag filtering"
```

---

### Task 19: Create blog detail page

**Files:**
- Create: `views/pages/blog-detail.ejs`
- Modify: `public/css/pages.css`

**Step 1: Create blog detail template**

```html
<section class="page-hero" style="min-height: 300px">
  <% if (post.coverImage) { %>
  <div class="page-hero-bg" style="background-image: url('<%= post.coverImage %>'); background-position: center 50%"></div>
  <% } %>
  <div class="page-hero-overlay" style="background: linear-gradient(180deg, rgba(13,13,13,0.8) 0%, rgba(13,13,13,0.5) 100%)"></div>
  <div class="page-hero-content container">
    <h1><%= l(post, 'title') %></h1>
    <div class="blog-detail-meta">
      <time><%= new Date(post.publishedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'ka-GE', { year: 'numeric', month: 'long', day: 'numeric' }) %></time>
      <% if (author) { %>
        <span>&middot; <%= t('blog.by') %> <%= l(author, 'name') %></span>
      <% } %>
    </div>
  </div>
</section>

<section class="section">
  <div class="container blog-content-wrap">
    <article class="blog-content">
      <%- renderedContent %>
    </article>

    <% if (post.tags && post.tags.length) { %>
    <div class="blog-detail-tags">
      <strong><%= t('blog.tags') %>:</strong>
      <% post.tags.forEach(tag => { %>
        <a href="<%= langPrefix %>/blog?tag=<%= encodeURIComponent(tag) %>" class="blog-tag"><%= tag %></a>
      <% }) %>
    </div>
    <% } %>

    <% if (relatedHikes.length) { %>
    <div class="blog-related">
      <h3><%= t('blog.related_hikes') %></h3>
      <div class="hike-grid">
        <% relatedHikes.forEach(hike => { %>
          <%- include('../partials/_hike-card', { hike }) %>
        <% }) %>
      </div>
    </div>
    <% } %>

    <a href="<%= langPrefix %>/blog" class="btn btn-secondary" style="margin-top: 2rem">&larr; <%= t('blog.title') %></a>
  </div>
</section>
```

**Step 2: Add blog detail CSS to pages.css**

```css
/* Blog detail */
.blog-detail-meta {
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin-top: 0.5rem;
}
.blog-content-wrap {
  max-width: 800px;
}
.blog-content {
  font-size: 1.05rem;
  line-height: 1.8;
  color: var(--text-primary);
}
.blog-content h2 {
  margin-top: 2rem;
  margin-bottom: 1rem;
}
.blog-content h3 {
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}
.blog-content p {
  margin-bottom: 1rem;
}
.blog-content img {
  max-width: 100%;
  border-radius: var(--radius);
  margin: 1rem 0;
}
.blog-content blockquote {
  border-left: 3px solid var(--accent-orange);
  padding-left: 1rem;
  margin: 1.5rem 0;
  color: var(--text-secondary);
  font-style: italic;
}
.blog-content ul, .blog-content ol {
  margin: 1rem 0;
  padding-left: 1.5rem;
}
.blog-content li {
  margin-bottom: 0.5rem;
}
.blog-detail-tags {
  margin-top: 2rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.blog-related {
  margin-top: 3rem;
}
.blog-related h3 {
  margin-bottom: 1.5rem;
}
```

**Step 3: Commit**

```bash
git add views/pages/blog-detail.ejs public/css/pages.css
git commit -m "feat: add blog detail page with markdown rendering"
```

---

### Task 20: Add blog to nav and footer

**Files:**
- Modify: `views/partials/_header.ejs`
- Modify: `views/partials/_footer.ejs`

**Step 1: Add blog nav link**

In `_header.ejs`, add after the reviews nav item:
```html
<li><a href="<%= langPrefix %>/blog" class="nav-link<%= currentPath.startsWith('/blog') ? ' active' : '' %>"><%= t('nav.blog') %></a></li>
```

**Step 2: Add blog to footer**

In the "Company" footer links section, add:
```html
<li><a href="<%= langPrefix %>/blog"><%= t('nav.blog') %></a></li>
```

**Step 3: Commit**

```bash
git add views/partials/_header.ejs views/partials/_footer.ejs
git commit -m "feat: add blog link to nav and footer"
```

---

### Task 21: Add blog admin CRUD

**Files:**
- Modify: `routes/admin.js`
- Create: `views/admin/blog-list.ejs`
- Create: `views/admin/blog-form.ejs`
- Modify: `views/admin/layout.ejs`
- Modify: `views/admin/dashboard.ejs`

**Step 1: Add blog CRUD routes to admin.js**

Add after gallery CRUD section:

```js
// ═══════════════════════════════════════════
//  BLOG CRUD
// ═══════════════════════════════════════════

router.get('/blog', async (req, res) => {
  const posts = await readJSON('blog.json');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'blog-list.ejs'), { title: 'Blog', posts });
});

router.get('/blog/new', async (req, res) => {
  const guides = await readJSON('guides.json');
  const hikes = await readJSON('hikes.json');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'blog-form.ejs'), {
    title: 'New Post', editing: false, post: {}, guides, hikes
  });
});

router.post('/blog', async (req, res) => {
  const posts = await readJSON('blog.json');
  const b = req.body;
  const nextId = posts.length ? Math.max(...posts.map(p => p.id)) + 1 : 1;
  posts.push({
    id: nextId,
    slug: b.slug || b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    title: b.title,
    title_en: b.title_en || '',
    content: b.content,
    content_en: b.content_en || '',
    coverImage: b.coverImage || '',
    tags: textToArray(b.tags),
    author: b.author || '',
    relatedHikeIds: textToArray(b.relatedHikeIds),
    publishedAt: b.publishedAt || new Date().toISOString().split('T')[0],
    published: b.published === 'true'
  });
  await writeJSON('blog.json', posts);
  res.redirect('/admin/blog');
});

router.get('/blog/edit/:id', async (req, res) => {
  const [posts, guides, hikes] = await Promise.all([
    readJSON('blog.json'),
    readJSON('guides.json'),
    readJSON('hikes.json')
  ]);
  const post = posts.find(p => p.id === Number(req.params.id));
  if (!post) return res.redirect('/admin/blog');
  renderAdmin(res, join(__dirname, '..', 'views', 'admin', 'blog-form.ejs'), {
    title: 'Edit Post', editing: true, post, guides, hikes
  });
});

router.post('/blog/edit/:id', async (req, res) => {
  const posts = await readJSON('blog.json');
  const idx = posts.findIndex(p => p.id === Number(req.params.id));
  if (idx === -1) return res.redirect('/admin/blog');
  const b = req.body;
  posts[idx] = {
    id: Number(req.params.id),
    slug: b.slug || posts[idx].slug,
    title: b.title,
    title_en: b.title_en || '',
    content: b.content,
    content_en: b.content_en || '',
    coverImage: b.coverImage || '',
    tags: textToArray(b.tags),
    author: b.author || '',
    relatedHikeIds: textToArray(b.relatedHikeIds),
    publishedAt: b.publishedAt || posts[idx].publishedAt,
    published: b.published === 'true'
  };
  await writeJSON('blog.json', posts);
  res.redirect('/admin/blog');
});

router.post('/blog/delete/:id', async (req, res) => {
  const posts = await readJSON('blog.json');
  const filtered = posts.filter(p => p.id !== Number(req.params.id));
  await writeJSON('blog.json', filtered);
  res.redirect('/admin/blog');
});
```

**Step 2: Create blog-list.ejs**

```html
<div class="admin-header">
  <h1>Blog Posts</h1>
  <a href="/admin/blog/new" class="btn btn-primary">+ New Post</a>
</div>
<div class="admin-table-wrap">
  <table class="admin-table">
    <thead>
      <tr>
        <th>Title</th>
        <th>Date</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <% posts.forEach(post => { %>
      <tr>
        <td><%= post.title %></td>
        <td><%= post.publishedAt %></td>
        <td><%= post.published ? 'Published' : 'Draft' %></td>
        <td class="actions">
          <a href="/admin/blog/edit/<%= post.id %>" class="btn btn-secondary btn-sm">Edit</a>
          <form method="POST" action="/admin/blog/delete/<%= post.id %>" onsubmit="return confirm('Delete this post?')" style="display:inline">
            <button type="submit" class="btn btn-danger btn-sm">Delete</button>
          </form>
        </td>
      </tr>
      <% }) %>
      <% if (!posts.length) { %>
      <tr><td colspan="4" style="text-align:center;color:var(--admin-text-muted)">No posts yet</td></tr>
      <% } %>
    </tbody>
  </table>
</div>
```

**Step 3: Create blog-form.ejs**

```html
<div class="admin-header">
  <h1><%= editing ? 'Edit Post' : 'New Post' %></h1>
</div>
<form class="admin-form" method="POST" action="<%= editing ? '/admin/blog/edit/' + post.id : '/admin/blog' %>">
  <div class="form-lang-row">
    <div class="form-group">
      <label for="title">Title (KA)</label>
      <input type="text" id="title" name="title" value="<%= post.title || '' %>" required>
    </div>
    <div class="form-group">
      <label for="title_en">Title (EN)</label>
      <input type="text" id="title_en" name="title_en" value="<%= post.title_en || '' %>">
    </div>
  </div>

  <div class="form-group">
    <label for="slug">Slug</label>
    <div class="hint">URL-friendly name. Auto-generated from title if left empty.</div>
    <input type="text" id="slug" name="slug" value="<%= post.slug || '' %>">
  </div>

  <div class="form-lang-row">
    <div class="form-group">
      <label for="content">Content (KA) — Markdown</label>
      <textarea name="content" id="content" rows="15"><%= post.content || '' %></textarea>
    </div>
    <div class="form-group">
      <label for="content_en">Content (EN) — Markdown</label>
      <textarea name="content_en" id="content_en" rows="15"><%= post.content_en || '' %></textarea>
    </div>
  </div>

  <div class="form-group">
    <label for="coverImage">Cover Image</label>
    <input type="text" id="coverImage" name="coverImage" value="<%= post.coverImage || '' %>" data-upload="single">
  </div>

  <div class="form-group">
    <label for="tags">Tags</label>
    <div class="hint">One per line</div>
    <textarea name="tags" rows="3"><%= (post.tags || []).join('\n') %></textarea>
  </div>

  <div class="form-group">
    <label for="author">Author</label>
    <select name="author" id="author">
      <option value="">— None —</option>
      <% guides.forEach(g => { %>
        <option value="<%= g.id %>" <%= String(post.author) === String(g.id) ? 'selected' : '' %>><%= g.name %></option>
      <% }) %>
    </select>
  </div>

  <div class="form-group">
    <label for="relatedHikeIds">Related Hikes</label>
    <div class="hint">One hike ID per line</div>
    <textarea name="relatedHikeIds" rows="3"><%= (post.relatedHikeIds || []).join('\n') %></textarea>
  </div>

  <div class="form-group">
    <label for="publishedAt">Publish Date</label>
    <input type="date" id="publishedAt" name="publishedAt" value="<%= post.publishedAt || '' %>">
  </div>

  <div class="form-group">
    <label>
      <input type="checkbox" name="published" value="true" <%= post.published ? 'checked' : '' %>>
      Published
    </label>
  </div>

  <div class="form-actions">
    <button type="submit" class="btn btn-primary"><%= editing ? 'Update' : 'Create' %></button>
    <a href="/admin/blog" class="btn btn-secondary">Cancel</a>
  </div>
</form>
```

**Step 4: Update admin layout sidebar**

In `views/admin/layout.ejs`, add to the `<nav>`:
```html
<a href="/admin/blog" class="<%= currentPath.startsWith('/admin/blog') ? 'active' : '' %>">Blog</a>
```

**Step 5: Update admin dashboard**

In `views/admin/dashboard.ejs`, add a blog stat card and quick action:
- Add `blog` to the counts: `counts.blog`
- Add `<a href="/admin/blog/new" class="btn btn-primary">+ New Post</a>`

Update admin.js dashboard route to include blog count:
```js
const [hikes, guides, pricing, gallery, blog] = await Promise.all([
  readJSON('hikes.json'),
  readJSON('guides.json'),
  readJSON('pricing.json'),
  readJSON('gallery.json'),
  readJSON('blog.json')
]);
// ... counts: { ..., blog: blog.length }
```

**Step 6: Verify**

Run: `npm run dev`
- Go to `/admin/blog` → should show empty list
- Create a new post with markdown content
- Visit `/blog` → post should appear
- Visit `/blog/<slug>` → rendered markdown

**Step 7: Commit**

```bash
git add routes/admin.js views/admin/blog-list.ejs views/admin/blog-form.ejs views/admin/layout.ejs views/admin/dashboard.ejs
git commit -m "feat: add blog CRUD to admin panel"
```

---

### Task 22: Final integration and verification

**Step 1: Run the server and test all features**

Run: `npm run dev`

Test checklist:
- [ ] Visit `/` — Georgian homepage, language toggle visible
- [ ] Click EN toggle → `/en/` — English UI strings
- [ ] Visit `/en/hikes` — English hike listing
- [ ] Visit `/map` — overview map page
- [ ] Visit `/blog` — blog listing
- [ ] Admin: create a blog post with markdown, verify it renders
- [ ] Admin: upload a KML/GPX file to a hike, verify map on detail page
- [ ] Admin: edit a hike with English fields, verify `/en/hikes/:id` shows English content
- [ ] All nav links work in both languages
- [ ] 404 page works for both `/nonexistent` and `/en/nonexistent`

**Step 2: Final commit**

```bash
git add -A
git commit -m "feat: complete maps, blog, and i18n integration"
```

---

## Dependency Summary

| Package | Purpose | Install command |
|---------|---------|----------------|
| `@tmcw/togeojson` | Parse KML/GPX to GeoJSON | `npm install @tmcw/togeojson` |
| `jsdom` | XML DOM parsing for togeojson | `npm install jsdom` |
| `marked` | Render markdown to HTML | `npm install marked` |
| Leaflet.js | Interactive maps (CDN) | No install — loaded via `<script>` tag |

## Files Created/Modified Summary

**New files:**
- `data/translations.json` — UI string translations
- `data/blog.json` — Blog post storage
- `helpers/i18n.js` — Language detection middleware
- `helpers/geo.js` — KML/GPX parser
- `routes/map.js` — Overview map route
- `routes/blog.js` — Blog routes
- `views/pages/map.ejs` — Overview map page
- `views/pages/blog.ejs` — Blog listing page
- `views/pages/blog-detail.ejs` — Blog post page
- `views/admin/blog-list.ejs` — Admin blog list
- `views/admin/blog-form.ejs` — Admin blog form
- `public/js/map.js` — Leaflet map component

**Modified files:**
- `server.js` — i18n middleware, new route mounts
- `routes/admin.js` — Blog CRUD, route upload, `_en` field saving
- `views/layout.ejs` — Leaflet CDN
- `views/admin/layout.ejs` — Leaflet CDN, blog nav link
- `views/admin/dashboard.ejs` — Blog stat card
- `views/partials/_header.ejs` — i18n, lang toggle, blog/map nav
- `views/partials/_footer.ejs` — i18n, blog link
- `views/pages/*.ejs` — All pages updated for i18n
- `views/partials/_hike-card.ejs` — i18n
- `views/admin/hikes-form.ejs` — Route upload, `_en` fields
- `views/admin/guides-form.ejs` — `_en` fields
- `views/admin/pricing-form.ejs` — `_en` fields
- `views/admin/gallery-form.ejs` — `_en` fields
- `public/css/main.css` — Lang toggle styles
- `public/css/components.css` — Blog card styles
- `public/css/pages.css` — Map and blog detail styles
- `public/css/admin.css` — Dual-language form row
- `public/js/admin-upload.js` — Route file upload JS
- `data/hikes.json` — `_en` fields + `route` field
- `data/guides.json` — `_en` fields
- `data/gallery.json` — `_en` fields
- `data/pricing.json` — `_en` fields
