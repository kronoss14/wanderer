import * as toGeoJSON from '@tmcw/togeojson';
import { JSDOM } from 'jsdom';

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
