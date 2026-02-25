(function () {
  'use strict';

  var POI_ICONS = {
    viewpoint: '\uD83D\uDC41\uFE0F',
    water: '\uD83D\uDCA7',
    campsite: '\u26FA',
    marker: '\uD83D\uDCCD'
  };

  function createPOIIcon(type) {
    var emoji = POI_ICONS[type] || POI_ICONS.marker;
    return L.divIcon({
      html: '<span style="font-size:1.5rem">' + emoji + '</span>',
      className: 'poi-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }

  window.initTrailMap = function (containerId, route, options) {
    options = options || {};
    var el = document.getElementById(containerId);
    if (!el || !window.L || !route || !route.coordinates || !route.coordinates.length) return null;

    var map = L.map(containerId, {
      scrollWheelZoom: options.interactive !== false
    }).setView([42.3, 43.5], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
    }).addTo(map);

    var line = L.polyline(route.coordinates, {
      color: '#E8811A',
      weight: 4,
      opacity: 0.9
    }).addTo(map);

    // Start/End markers
    var start = route.coordinates[0];
    var end = route.coordinates[route.coordinates.length - 1];

    L.marker(start, {
      icon: L.divIcon({
        html: '<span style="font-size:1.5rem">\uD83D\uDFE2</span>',
        className: 'poi-icon', iconSize: [28, 28], iconAnchor: [14, 14]
      })
    }).addTo(map).bindPopup('Start');

    L.marker(end, {
      icon: L.divIcon({
        html: '<span style="font-size:1.5rem">\uD83C\uDFC1</span>',
        className: 'poi-icon', iconSize: [28, 28], iconAnchor: [14, 14]
      })
    }).addTo(map).bindPopup('End');

    if (route.pois) {
      route.pois.forEach(function (poi) {
        L.marker([poi.lat, poi.lng], { icon: createPOIIcon(poi.type) })
          .addTo(map)
          .bindPopup('<strong>' + poi.name + '</strong>');
      });
    }

    map.fitBounds(line.getBounds(), { padding: [30, 30] });
    return map;
  };

  window.initOverviewMap = function (containerId, hikes, langPrefix) {
    var el = document.getElementById(containerId);
    if (!el || !window.L) return null;

    var map = L.map(containerId).setView([42.3, 43.5], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
    }).addTo(map);

    var bounds = L.latLngBounds();
    var hasMarkers = false;

    hikes.forEach(function (hike) {
      if (!hike.route || !hike.route.coordinates || !hike.route.coordinates.length) return;
      hasMarkers = true;

      var line = L.polyline(hike.route.coordinates, {
        color: '#E8811A', weight: 3, opacity: 0.7
      }).addTo(map);

      bounds.extend(line.getBounds());

      var start = hike.route.coordinates[0];
      L.marker(start)
        .addTo(map)
        .bindPopup('<strong>' + hike.displayName + '</strong><br><a href="' + langPrefix + '/hikes/' + hike.id + '">View Details \u2192</a>');
    });

    if (hasMarkers) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    return map;
  };
})();
