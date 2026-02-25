# Analytics System Design

## Goal

Add self-hosted, client-side analytics tracking to the Wanderer website with a dashboard in the admin panel. Focus: marketing insights — traffic sources, referrers, UTM campaigns, device data, page popularity, user journeys.

## Approach

Client-side tracking script sends events to a server API endpoint. Data stored in daily JSON files. Admin dashboard aggregates and displays metrics with date range filtering.

## Data Collection

The tracking script (`public/js/analytics.js`) loads on all public pages and captures:

### Page View Event

| Field | Source | Example |
|---|---|---|
| Session ID | Anonymous cookie (`wanderer_sid`, 30-min sliding expiry) | `a8f3c2d1` |
| Page path | `window.location.pathname` | `/hikes/kazbegi` |
| Referrer | `document.referrer` | `google.com` |
| Traffic source | Parsed from referrer | `google`, `facebook`, `direct` |
| UTM source | `url.searchParams.get('utm_source')` | `facebook` |
| UTM medium | `url.searchParams.get('utm_medium')` | `cpc` |
| UTM campaign | `url.searchParams.get('utm_campaign')` | `spring-2026` |
| Device type | Screen width heuristic | `mobile`, `tablet`, `desktop` |
| Browser | Parsed from `navigator.userAgent` | `Chrome 120` |
| OS | Parsed from `navigator.userAgent` | `Android 14` |
| Device model | `navigator.userAgentData` (if available) | `Samsung Galaxy` |
| Screen resolution | `screen.width x screen.height` | `1920x1080` |
| Connection type | `navigator.connection.effectiveType` (if available) | `4g` |
| Language | `navigator.language` | `ka` |
| Timestamp | `new Date().toISOString()` | `2026-02-25T14:30:12Z` |

### Page Duration Event

Sent on `visibilitychange` / `beforeunload` with session ID, path, and seconds spent.

### Session Cookie

- Name: `wanderer_sid`
- Value: random 8-char hex
- HttpOnly: no (needs JS access)
- SameSite: Lax
- Path: /
- Max-Age: 1800 (30 minutes, renewed on each page view)

## API Endpoint

`POST /api/analytics` — receives events, validates required fields, appends to daily JSON file. No authentication required (public endpoint, but validates event structure).

`GET /admin/analytics/data?from=YYYY-MM-DD&to=YYYY-MM-DD` — protected by `requireAdmin`, returns aggregated analytics JSON for the dashboard.

## Data Storage

```
data/
  analytics/
    2026-02-25.json
    2026-02-24.json
    ...
```

Each daily file is an array of event objects:

```json
[
  {
    "type": "pageview",
    "sessionId": "a8f3c2d1",
    "path": "/hikes/kazbegi",
    "referrer": "https://google.com/search?q=georgia+hiking",
    "source": "google",
    "utm": { "source": null, "medium": null, "campaign": null },
    "device": {
      "type": "mobile",
      "browser": "Chrome 120",
      "os": "Android 14",
      "screen": "412x915",
      "connection": "4g",
      "model": "Samsung Galaxy"
    },
    "language": "ka",
    "timestamp": "2026-02-25T14:30:12.456Z"
  },
  {
    "type": "pageduration",
    "sessionId": "a8f3c2d1",
    "path": "/hikes/kazbegi",
    "duration": 45,
    "timestamp": "2026-02-25T14:31:00.000Z"
  }
]
```

At ~100 visits/day, daily files stay under 50KB. Old files can be archived or deleted.

## Admin Dashboard

Located at `/admin/analytics`, protected by `requireAdmin`.

### Stat Cards (top row)
- Total visits (today + vs yesterday)
- Unique visitors
- Avg. time on page
- Bounce rate (single-page sessions)

### Traffic Sources
- Table: source name, visit count, percentage of total
- UTM campaign breakdown when campaigns are active

### Top Pages
- Table sorted by views: page path, view count, avg duration, entry count, exit count

### Devices & Tech
- Mobile vs Tablet vs Desktop percentages
- Top browsers
- Top operating systems
- Screen resolutions
- Connection types

### Visitor Languages
- Language breakdown (Georgian vs English vs others)

### User Journeys
- Most common page sequences grouped by frequency
- Entry to exit path visualization
- Drop-off identification

### Date Filter
- Presets: Today, Last 7 days, Last 30 days
- Custom date range picker

## Files

| Action | File | Purpose |
|---|---|---|
| Create | `public/js/analytics.js` | Client-side tracking script |
| Create | `helpers/analytics.js` | Event recording + aggregation logic |
| Create | `routes/analytics.js` | API endpoint + admin dashboard route |
| Create | `views/admin/analytics.ejs` | Dashboard template |
| Modify | `views/layout.ejs` | Add tracking script to public pages |
| Modify | `views/admin/layout.ejs` | Add "Analytics" nav item |
| Modify | `server.js` | Mount analytics routes |
| Modify | `public/css/admin.css` | Dashboard-specific styles |

## Constraints

- No external dependencies — vanilla JS, existing Express + EJS stack
- No personal data — fully anonymous session tracking
- JSON file storage — no database required
- Follows existing admin patterns (sidebar nav, stat cards, tables, green theme)
