import { Router } from 'express';
import { readJSON } from '../helpers/data.js';
import { asyncHandler } from '../helpers/async-handler.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeMapData } from '../helpers/map-crypto.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TYPE_MAP = {
  'Cave': 'cave', 'Cavern': 'cave',
  'Canyon/Valley': 'canyon', 'Waterfall': 'waterfall',
  'Stone': 'stone', 'Column': 'stone', 'Gap': 'stone', 'Travertine': 'stone',
  'Volcanic Crater': 'volcano', 'Fossils Fauna': 'nature'
};

let geoFeaturesCache = null;
function loadGeoFeatures() {
  if (!geoFeaturesCache) {
    const raw = readFileSync(join(__dirname, '..', 'data', 'geo-features.json'), 'utf-8');
    geoFeaturesCache = JSON.parse(raw);
  }
  return geoFeaturesCache;
}

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const hikes = await readJSON('hikes.json');
  res.render('pages/map', { title: res.locals.t('map.title'), hikes });
}));

router.get('/gf', asyncHandler(async (req, res) => {
  const [mapPoints, geoData] = await Promise.all([
    readJSON('map-points.json'),
    Promise.resolve(loadGeoFeatures())
  ]);

  const lang = res.locals.lang || 'ka';
  const l = (obj, key) => lang === 'ka' ? obj[key] : (obj[key + '_en'] || obj[key]);

  const points = mapPoints.map(p => ({
    n: l(p, 'name'),
    d: l(p, 'desc'),
    c: p.category,
    a: p.lat,
    g: p.lng
  }));

  const features = geoData.features
    .filter(f => f.properties.name_ge !== 'N_A')
    .map(f => ({
      n: lang === 'ka' ? f.properties.name_ge : f.properties.name_en,
      d: lang === 'ka' ? f.properties.type_ge : f.properties.type_en,
      c: TYPE_MAP[f.properties.type_en] || 'sightseeing',
      a: f.geometry.coordinates[1],
      g: f.geometry.coordinates[0]
    }));

  res.set('Cache-Control', 'public, max-age=3600');
  res.json({ d: encodeMapData({ p: points, f: features }) });
}));

export default router;
