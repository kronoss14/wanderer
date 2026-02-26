const DOMAIN = 'https://wanderer.ge';
const DEFAULT_OG_IMAGE = '/images/hero-home.jpeg';

/**
 * Build a complete SEO metadata object for a page.
 *
 * @param {object} opts
 * @param {string} opts.title       - Page title (used in og:title, twitter:title)
 * @param {string} opts.description - Meta description (max ~160 chars)
 * @param {string} opts.path        - URL path without lang prefix, e.g. '/hikes'
 * @param {string} opts.lang        - 'ka' or 'en'
 * @param {string} [opts.ogImage]   - OG image path (absolute or relative to domain)
 * @param {string} [opts.ogType]    - OG type, defaults to 'website'
 * @param {object} [opts.jsonLd]    - JSON-LD structured data object
 * @param {boolean} [opts.noindex]  - If true, adds noindex meta
 * @returns {object} SEO object for res.locals.seo
 */
export function buildSeo({ title, description, path, lang, ogImage, ogType, jsonLd, noindex }) {
  const cleanPath = path === '/' ? '' : path;
  const kaUrl = `${DOMAIN}${cleanPath}`;
  const enUrl = `${DOMAIN}/en${cleanPath}`;
  const canonical = lang === 'en' ? enUrl : kaUrl;

  const imageUrl = ogImage
    ? (ogImage.startsWith('http') ? ogImage : `${DOMAIN}${ogImage}`)
    : `${DOMAIN}${DEFAULT_OG_IMAGE}`;

  return {
    title,
    description,
    canonical,
    noindex: noindex || false,
    hreflang: [
      { lang: 'ka', url: kaUrl },
      { lang: 'en', url: enUrl },
      { lang: 'x-default', url: kaUrl }
    ],
    og: {
      type: ogType || 'website',
      title,
      description,
      image: imageUrl,
      url: canonical,
      siteName: 'Wanderer — მოხეტიალე',
      locale: lang === 'en' ? 'en_US' : 'ka_GE'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      image: imageUrl
    },
    jsonLd: jsonLd || null
  };
}
