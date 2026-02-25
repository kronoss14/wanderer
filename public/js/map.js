(function () {
  'use strict';

  var CATEGORY_ICONS = {
    hiking: { emoji: '\uD83E\uDD7E', color: '#E8811A' },
    sightseeing: { emoji: '\uD83D\uDCCD', color: '#3B82F6' },
    monastery: { emoji: '\u26EA', color: '#A855F7' },
    fortress: { emoji: '\uD83C\uDFF0', color: '#EF4444' },
    canyon: { emoji: '\uD83C\uDFDE\uFE0F', color: '#10B981' },
    waterfall: { emoji: '\uD83D\uDCA7', color: '#06B6D4' },
    cave: { emoji: '\uD83D\uDD73\uFE0F', color: '#6B7280' }
  };

  var POI_ICONS = {
    viewpoint: '\uD83D\uDC41\uFE0F',
    water: '\uD83D\uDCA7',
    campsite: '\u26FA',
    marker: '\uD83D\uDCCD'
  };

  function createCategoryIcon(category) {
    var info = CATEGORY_ICONS[category] || CATEGORY_ICONS.sightseeing;
    return L.divIcon({
      html: '<span style="font-size:1.4rem;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))">' + info.emoji + '</span>',
      className: 'poi-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }

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

  window.initOverviewMap = function (containerId, hikes, points, langPrefix) {
    var el = document.getElementById(containerId);
    if (!el || !window.L) return null;

    var map = L.map(containerId).setView([42.15, 43.85], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
    }).addTo(map);

    var allMarkers = [];

    // Add hike routes
    hikes.forEach(function (hike) {
      if (!hike.route || !hike.route.coordinates || !hike.route.coordinates.length) return;

      var line = L.polyline(hike.route.coordinates, {
        color: '#E8811A', weight: 3, opacity: 0.7
      }).addTo(map);

      var start = hike.route.coordinates[0];
      var marker = L.marker(start)
        .addTo(map)
        .bindPopup('<strong>' + hike.displayName + '</strong><br><a href="' + langPrefix + '/hikes/' + hike.id + '">\u2192</a>');
      marker._category = 'hiking';
      allMarkers.push(marker);
    });

    // Add map points
    points.forEach(function (point) {
      var marker = L.marker([point.lat, point.lng], {
        icon: createCategoryIcon(point.category)
      }).addTo(map);

      marker.bindPopup(
        '<div class="map-popup">' +
          '<strong>' + point.name + '</strong>' +
          '<p>' + point.desc + '</p>' +
        '</div>'
      );

      marker._category = point.category;
      allMarkers.push(marker);
    });

    // Category filtering
    var filterBtns = document.querySelectorAll('.map-filter');
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');

        var cat = btn.getAttribute('data-category');
        allMarkers.forEach(function (m) {
          if (cat === 'all' || m._category === cat) {
            map.addLayer(m);
          } else {
            map.removeLayer(m);
          }
        });
      });
    });

    // Search functionality
    var searchInput = document.getElementById('map-search');
    var searchResults = document.getElementById('map-search-results');
    if (searchInput && searchResults) {
      // Build searchable list from points + hikes
      var searchItems = [];
      points.forEach(function (p, idx) {
        searchItems.push({
          name: p.name,
          category: p.category,
          emoji: (CATEGORY_ICONS[p.category] || CATEGORY_ICONS.sightseeing).emoji,
          lat: p.lat,
          lng: p.lng,
          marker: allMarkers[hikes.length + idx]
        });
      });
      hikes.forEach(function (h, idx) {
        if (h.route && h.route.coordinates && h.route.coordinates.length) {
          searchItems.push({
            name: h.displayName,
            category: 'hiking',
            emoji: CATEGORY_ICONS.hiking.emoji,
            lat: h.route.coordinates[0][0],
            lng: h.route.coordinates[0][1],
            marker: allMarkers[idx]
          });
        }
      });

      var debounceTimer;
      searchInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          var query = searchInput.value.trim().toLowerCase();
          if (!query) {
            searchResults.classList.remove('open');
            searchResults.innerHTML = '';
            return;
          }

          var matches = searchItems.filter(function (item) {
            return item.name.toLowerCase().indexOf(query) !== -1;
          }).slice(0, 8);

          if (matches.length === 0) {
            searchResults.innerHTML = '<div class="map-search-no-results">' +
              (document.documentElement.lang === 'ka' ? '\u10D5\u10D4\u10E0 \u10DB\u10DD\u10D8\u10EB\u10D4\u10D1\u10DC\u10D0' : 'No results found') +
              '</div>';
            searchResults.classList.add('open');
            return;
          }

          searchResults.innerHTML = matches.map(function (item) {
            return '<div class="map-search-result" data-lat="' + item.lat + '" data-lng="' + item.lng + '">' +
              '<span class="result-emoji">' + item.emoji + '</span>' +
              '<span class="result-name">' + item.name + '</span>' +
              '<span class="result-category">' + item.category + '</span>' +
              '</div>';
          }).join('');
          searchResults.classList.add('open');

          // Attach click handlers
          var resultEls = searchResults.querySelectorAll('.map-search-result');
          resultEls.forEach(function (el, i) {
            el.addEventListener('click', function () {
              var match = matches[i];
              map.flyTo([match.lat, match.lng], 13, { duration: 1.2 });
              if (match.marker) {
                setTimeout(function () { match.marker.openPopup(); }, 600);
              }
              searchResults.classList.remove('open');
              searchInput.value = match.name;
            });
          });
        }, 200);
      });

      // Close dropdown on outside click
      document.addEventListener('click', function (e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
          searchResults.classList.remove('open');
        }
      });

      // Close on Escape
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          searchResults.classList.remove('open');
          searchInput.blur();
        }
      });
    }

    return map;
  };
})();
