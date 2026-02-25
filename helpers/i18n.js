import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const translationsPath = join(__dirname, '..', 'data', 'translations.json');
let translations = JSON.parse(readFileSync(translationsPath, 'utf-8'));

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

  // Save preference to session
  req.session.lang = lang;

  next();
}
