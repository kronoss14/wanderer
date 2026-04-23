# Wanderer — Redesign notes

**Date:** 2026-04-23
**Stack preserved:** Express + EJS + MongoDB (untouched). Routes, helpers, data, auth, server.js — all unchanged.

---

## What changed

### Public site (consumer-facing)

New premium outdoor brand aesthetic:

- **Palette:** forest greens (`--forest-*`) + warm amber accent (`--amber-500`) + cream background
- **Typography:** Playfair Display (headings) + Inter (body) + Noto Sans Georgian (bilingual support intact)
- **Design tokens:** `public/css/main.css` has full CSS-variable design system — change once, updates everywhere
- **Layout:** mobile-first, generous whitespace, modern grid system
- **Header:** sticky with backdrop blur, improved mobile drawer
- **Footer:** 4-column grid with contact block, trust signals, language switch

Pages rewritten:

- `index` (home) — hero, floating search form, trust bar, featured hikes, categories, why-us (dark), gear preview, transfers strip, reviews, CTA banner
- `hikes` (list) — chip filters, count display, modern card grid
- `hike-detail` — immersive hero, feature tiles, checklists, sticky booking sidebar with form + WhatsApp link
- `shop` — clean ecommerce grid with category chips
- `product-detail` — gallery with thumbs, qty picker, trust bullets
- `cart` — two-column layout with order summary
- `checkout` — stacked sections, payment radio cards, terms modal
- `order-confirmation` — success state with bank details card
- `contact` — two-column with sidebar info, transfer callout anchor
- `about` — story section, values grid, team
- `reviews` — rating breakdown with bars + star picker for new review form
- `gallery` + `gallery-detail` — masonry-style photo grid
- `blog` + `blog-detail` — clean list and article layout
- `map` — modernized toolbar
- `404` + `error` — branded

### Admin panel

**Separate** design system — dense, dashboard-grade, intentionally different from the public site:

- Dark forest palette (`--a-bg` etc.)
- Sidebar navigation with grouped sections and SVG icons
- Sticky top with mobile toggle
- Responsive — manage orders from a phone
- All 18 admin views refreshed: dashboard, login, hikes/products/blog/gallery/guides/pricing (list + form), orders list + detail, analytics, map

Uses its own CSS at `public/css/admin.css`. Does not touch the public design tokens.

### Map — Russian labels fixed

- **Was:** OpenTopoMap tiles → rendered Georgia place names in Cyrillic (Russian) because OSM has `name:ru` entries
- **Now:** CARTO Voyager tiles → English/Latin labels, cleaner cartographic style
- Changed in `public/js/map.js` (`DARK_TILE` const) — both the overview map and trail map updated
- No API key required

### Minimal route change

One tiny change to `routes/index.js`: the home route now also loads `products.json` to power the homepage gear-preview strip. Everything else in routes is untouched.

### Backup

Originals copied to:
- `views.backup-20260423/`
- `public/css.backup-20260423/`

Restore with `mv views views.new && mv views.backup-20260423 views` if needed.

---

## Local testing checklist

Start the dev server (you run it — not me):

```bash
cd ~/wanderer
npm run dev
```

Then browse to **http://localhost:3000** and walk through this list. Expected behavior noted for each.

### 🔍 Visual / mobile
- [ ] Homepage hero + floating search form renders correctly
- [ ] Stats bar under hero shows 4 numbers
- [ ] Trust bar has 4 items with green check icons
- [ ] Resize browser to phone width (375px) — header collapses to hamburger, nav drawer opens on tap
- [ ] Language switch (KA ↔ EN) works — visible as a pill in top nav
- [ ] All text renders in both KA and EN (existing translations still used via `t()` helper)

### 🥾 Hiking tours flow (PRIMARY)
- [ ] `/hikes` — filter chips work (click "Day hikes", URL gets `?type=day`)
- [ ] Existing hike card for Chitakhevi Shelter shows cardImage, price, metadata
- [ ] Click into `/hikes/kazbegi-gergeti` — detail renders fully (gallery, features, highlights, included/not-included, reviews block, booking sidebar)
- [ ] Booking form sidebar posts to `/hikes/:id/register` (unchanged endpoint)
- [ ] WhatsApp button appears because `whatsappLink` is set in data
- [ ] Clicking an image in the gallery opens the lightbox

### 🛒 Shop flow
- [ ] `/shop` shows category chips + existing product card
- [ ] Click product → `/shop/:id` detail renders with gallery thumbs and qty picker
- [ ] "Add to cart" button still talks to existing cart JS (uses same `data-*` attrs)
- [ ] `/cart` shows empty state OR existing cart items (depends on `localStorage`)
- [ ] `/cart/checkout` has new layout with payment method cards + terms modal

### 🚗 Transfers
- [ ] Homepage has a "Transfers & logistics" section (subtle, not dominant)
- [ ] Footer link `#transfer` jumps to a callout on `/contact`

### 🗺️ Map — CRITICAL: no Russian
- [ ] `/map` — open it. **Scroll around Georgia. Confirm all labels are in English or Latin script.**
- [ ] NOT in Russian/Cyrillic: city names, mountain names, country labels, road names
- [ ] Filters still work (All, Hiking, Sightseeing, etc.)
- [ ] Markers for map-points still appear
- [ ] Hike trails still render if a hike has a `route`

If you see ANY Russian/Cyrillic text on the map, let me know — we might need to switch to Mapbox or a different provider.

### ⚙️ Admin
- [ ] `/admin` — login page renders with dark theme
- [ ] Log in — sidebar with grouped nav appears
- [ ] Dashboard — stats grid shows counts, quick actions visible
- [ ] `/admin/hikes` — table with the 2 existing hikes, thumbnails, badges
- [ ] Click "Edit" — form opens with all fields, card sections, tabbed KA/EN inputs
- [ ] Same check for products, blog, gallery, guides, pricing
- [ ] `/admin/orders` — empty state if no orders; detail page if clicked
- [ ] `/admin/map` — complex draw tool — most important: it LOADS (no JS error)
- [ ] `/admin/analytics` — loads today's data or shows "Loading…"
- [ ] Mobile: sidebar toggles with the top-left button
- [ ] Logout works

### 🎯 Behavior preserved
- [ ] CSRF tokens still work (all forms include `_csrf`)
- [ ] Image uploads still work (data-upload attributes preserved)
- [ ] Language switching still works
- [ ] Search (if any) still works
- [ ] Cart in localStorage still works
- [ ] Order confirmation page renders bank details

### 🚨 If something's broken
1. **Templates broken?** Restore: `mv views views.broken && mv views.backup-20260423 views`
2. **CSS broken?** Restore: `mv public/css/admin.css public/css.backup-20260423/admin.css`
3. **Map still Cyrillic?** The tile URL in `public/js/map.js` line 36 — we switched to CARTO but a heavy cache could still hit OpenTopoMap briefly. Hard refresh (Ctrl+Shift+R).

---

## What was NOT done (so you know)

- No changes to `server.js`, `routes/*.js`, `helpers/*`, `data/*.json` (except one line in `routes/index.js` to pass products to home)
- No new npm dependencies (no React, no build step added)
- No new translation keys added in `translations.json` — new copy uses inline bilingual ternaries (`lang === 'en' ? 'X' : 'Y'`). You can migrate to `t()` keys later if you want, by adding entries to `data/translations.json`
- Admin login still uses the same auth flow
- Unsplash / new hero photography NOT swapped in — still using your existing `/images/*-hero.jpeg` assets. You can swap images later; the CSS references them by path

## Small improvements you might want to make

1. Add 3–6 more hikes to `data/hikes.json` — the homepage "Featured" only shows 1 right now because only `kazbegi-gergeti` is featured
2. Populate `data/reviews.json` — it's empty; placeholder reviews render on homepage otherwise
3. Add a few products to `data/products.json` — only 1 exists right now
4. Add real hero photography via admin or drop new files into `/public/images/`
5. Add SEO-friendly slug pages (`/kazbegi-hiking-tour`, `/best-hikes-in-georgia`) — these are new routes, would need a small addition to `routes/index.js` or a new router file
