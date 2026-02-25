# Wanderer: Interactive Maps, Blog, and Language Toggle

Design document for three new features for the Wanderer hiking tourism site.

## Feature 1: Interactive Maps

### Goal

Show interactive trail maps on hike detail pages and an overview map of all hikes across Georgia. Serves as both a marketing showcase and a practical navigation aid.

### Tech Stack

- Leaflet.js (CDN) with OpenStreetMap tiles
- Trail data sourced from MAPS.ME exports (KML/GPX files)
- Server-side parsing to GeoJSON, stored in hikes.json

### Components

**Route parser (`helpers/geo.js`):** Parses uploaded KML/GPX files, extracts trail coordinates and POI markers, outputs GeoJSON-compatible data.

**Map component (`public/js/map.js`):** Initializes Leaflet maps, renders trail polylines, adds POI markers with popups (viewpoints, water sources, campsites).

**Hike detail map:** Embedded interactive map on each hike page showing that hike's route and POIs.

**Overview map page (`/map`):** Dedicated page with all hikes as markers on a map of Georgia. Clicking a marker navigates to the hike detail page.

### Data Structure

Addition to each hike object in `hikes.json`:

```json
{
  "route": {
    "coordinates": [[42.3, 44.8], [42.31, 44.82]],
    "pois": [
      { "name": "Viewpoint", "type": "viewpoint", "lat": 42.3, "lng": 44.8 }
    ]
  }
}
```

### Admin Panel Changes

- Hike form gets "Upload Route File" (KML/GPX) field
- After upload, route is parsed and preview map displayed
- POI data auto-extracted from file or manually editable

---

## Feature 2: Blog / Articles

### Goal

A blog section for trip reports, travel tips, and general content about hiking in Georgia. Manageable from the admin panel.

### Tech Stack

- JSON storage (`data/blog.json`)
- Markdown content rendered with `marked` library
- Image uploads reuse existing upload infrastructure

### Data Structure (`data/blog.json`)

```json
{
  "id": "uuid",
  "slug": "hiking-tips-for-beginners",
  "title": "Georgian title",
  "title_en": "English title",
  "content": "## Georgian markdown...",
  "content_en": "## English markdown...",
  "coverImage": "/images/uploads/blog-cover.jpg",
  "tags": ["tips", "beginners"],
  "author": "guide-id",
  "publishedAt": "2026-02-25",
  "published": true
}
```

### Pages

- **Blog listing (`/blog`):** Cards with cover image, title, date, tags, auto-generated excerpt
- **Blog post (`/blog/:slug`):** Full rendered markdown, cover image, author info, related hikes
- **Admin list (`/admin/blog`):** Table of all posts with edit/delete/publish toggle
- **Admin form (`/admin/blog/new`, `/admin/blog/edit/:id`):** Title, slug (auto-generated), markdown textarea, cover image upload, tags, author selection, publish toggle

### Features

- Tag-based filtering on the listing page
- Auto-generated excerpt from first paragraph
- Optional linking to related hikes

---

## Feature 3: Language Toggle (EN/KA)

### Goal

Full bilingual site. All content translatable: UI labels, hike descriptions, blog posts, reviews.

### URL Scheme

- `/...` (no prefix) = Georgian (default)
- `/en/...` = English
- Language preference saved in cookie
- Detection order: URL prefix > cookie > default (Georgian)

### Implementation

**i18n middleware (`helpers/i18n.js`):**
- Reads language from URL prefix
- Sets `res.locals.lang` (`ka` or `en`)
- Provides `t()` helper function for UI strings
- Saves preference to cookie

**UI strings (`data/translations.json`):**

```json
{
  "nav.home": { "ka": "მთავარი", "en": "Home" },
  "nav.hikes": { "ka": "ლაშქრობები", "en": "Hikes" },
  "btn.register": { "ka": "რეგისტრაცია", "en": "Register" }
}
```

**Content fields:** All JSON data objects get `_en` suffix fields. `title` = Georgian, `title_en` = English.

**Template usage:** `<%= t('nav.home') %>` for UI strings, `<%= lang === 'en' ? hike.title_en : hike.title %>` for content.

**Route mounting:** All existing routes duplicated under `/en` prefix via Express router.

### Admin Changes

- All content forms get dual-language fields (Georgian + English side by side)
- Admin panel itself stays in English (no translation needed)

### Migration Strategy

- Existing data retains current Georgian values unchanged
- English fields (`_en`) start empty
- If an English field is empty, fall back to Georgian content

---

## Implementation Order

1. Language Toggle (foundational — other features build on it)
2. Interactive Maps
3. Blog / Articles

## Dependencies

- `leaflet` (CDN, no npm install)
- `marked` (npm) for markdown rendering
- `@tmcw/togeojson` (npm) for KML/GPX parsing
