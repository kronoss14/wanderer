(function () {
  'use strict';

  var CATEGORY_ICONS = {
    hiking: { emoji: '\uD83E\uDD7E', color: '#E8811A' },
    sightseeing: { emoji: '\uD83D\uDCCD', color: '#3B82F6' },
    monastery: { emoji: '\u26EA', color: '#A855F7' },
    fortress: { emoji: '\uD83C\uDFF0', color: '#EF4444' },
    canyon: { emoji: '\uD83C\uDFDE\uFE0F', color: '#10B981' },
    waterfall: { emoji: '\uD83D\uDCA7', color: '#06B6D4' },
    cave: { emoji: '\uD83D\uDD73\uFE0F', color: '#6B7280' },
    stone: { emoji: '\uD83E\uDEA8', color: '#8B7355' },
    volcano: { emoji: '\uD83C\uDF0B', color: '#D4380D' },
    nature: { emoji: '\uD83C\uDF3F', color: '#52C41A' }
  };

  var POI_ICONS = {
    viewpoint: '\uD83D\uDC41\uFE0F',
    water: '\uD83D\uDCA7',
    campsite: '\u26FA',
    marker: '\uD83D\uDCCD'
  };

  var DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  var DARK_ATTR = '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

  var markerIndex = 0;

  function _gk() {
    var a = [119,52,110,100,51,114,51,114,95,109,48,117,110,116,52,49,110,95,116,114,52,49,108,115,95,103,51,48,114,103,49,52];
    var k = '';
    for (var i = 0; i < a.length; i++) k += String.fromCharCode(a[i]);
    return k;
  }

  function _decode(encoded) {
    var key = _gk();
    var raw = atob(encoded);
    var bytes = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) {
      bytes[i] = raw.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function createCategoryIcon(category, delay) {
    var info = CATEGORY_ICONS[category] || CATEGORY_ICONS.sightseeing;
    var d = delay || 0;
    return L.divIcon({
      html: '<div class="map-marker" style="--marker-color:' + info.color + ';--delay:' + d + 'ms">' +
            '<span class="marker-emoji">' + info.emoji + '</span></div>',
      className: 'map-marker-wrap',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
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

  // --- Info Panel ---
  function getInfoPanel() {
    return document.getElementById('map-info-panel');
  }

  function openInfoPanel(data) {
    var panel = getInfoPanel();
    if (!panel) return;

    var info = CATEGORY_ICONS[data.category] || CATEGORY_ICONS.sightseeing;
    panel.querySelector('.info-panel-emoji').textContent = info.emoji;
    panel.querySelector('.info-panel-name').textContent = data.name;

    var catBadge = panel.querySelector('.info-panel-category');
    catBadge.textContent = data.category;
    catBadge.style.setProperty('--cat-color', info.color);

    var body = panel.querySelector('.info-panel-body');
    var html = '';
    if (data.description) {
      html += '<p class="info-panel-desc">' + data.description + '</p>';
    }
    if (data.link) {
      html += '<a href="' + data.link + '" class="info-panel-link">View Details <span>&rarr;</span></a>';
    }
    body.innerHTML = html;

    panel.classList.add('open');
  }

  function closeInfoPanel() {
    var panel = getInfoPanel();
    if (panel) panel.classList.remove('open');
  }

  function setupInfoPanelClose(map) {
    var panel = getInfoPanel();
    if (!panel) return;

    panel.querySelector('.info-panel-close').addEventListener('click', function (e) {
      e.stopPropagation();
      closeInfoPanel();
    });

    map.on('click', function () {
      closeInfoPanel();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeInfoPanel();
    });
  }

  function bindMarkerClick(marker, map, zoomLevel) {
    marker.on('click', function (e) {
      L.DomEvent.stopPropagation(e);
      var el = marker.getElement();
      if (el) {
        var markerDiv = el.querySelector('.map-marker');
        if (markerDiv) {
          markerDiv.classList.add('marker-bounce');
          setTimeout(function () { markerDiv.classList.remove('marker-bounce'); }, 400);
        }
      }
      map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), zoomLevel), { duration: 0.8 });
      openInfoPanel(marker._markerData);
    });
  }

  // --- Trail Map (individual hike detail page) ---
  window.initTrailMap = function (containerId, route, options) {
    options = options || {};
    var el = document.getElementById(containerId);
    if (!el || !window.L || !route || !route.coordinates || !route.coordinates.length) return null;

    var map = L.map(containerId, {
      scrollWheelZoom: options.interactive !== false
    }).setView([42.3, 43.5], 7);

    L.tileLayer(DARK_TILE, {
      attribution: DARK_ATTR,
      maxZoom: 19
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

  // --- Overview Map ---
  window.initOverviewMap = function (containerId, hikes, langPrefix) {
    var el = document.getElementById(containerId);
    if (!el || !window.L) return null;

    // Fade-in entrance
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';

    var map = L.map(containerId, { zoomControl: false }).setView([42.15, 43.85], 7);

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Dark tiles
    L.tileLayer(DARK_TILE, {
      attribution: DARK_ATTR,
      maxZoom: 19
    }).addTo(map);

    // Marker cluster group
    var clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function (cluster) {
        var count = cluster.getChildCount();
        var size = count < 10 ? 'small' : count < 50 ? 'medium' : 'large';
        return L.divIcon({
          html: '<div class="marker-cluster marker-cluster-' + size + '"><span>' + count + '</span></div>',
          className: 'marker-cluster-wrap',
          iconSize: [40, 40]
        });
      }
    });

    var allMarkers = [];
    var allMarkerData = [];
    var hikeCount = 0;
    markerIndex = 0;

    // Setup info panel close handlers
    setupInfoPanelClose(map);

    // Add hike routes
    hikes.forEach(function (hike) {
      if (!hike.route || !hike.route.coordinates || !hike.route.coordinates.length) return;

      L.polyline(hike.route.coordinates, {
        color: '#E8811A', weight: 3, opacity: 0.5
      }).addTo(map);

      var start = hike.route.coordinates[0];
      var delay = markerIndex * 30;
      var marker = L.marker(start, {
        icon: createCategoryIcon('hiking', delay)
      });

      marker._category = 'hiking';
      marker._markerData = {
        name: hike.displayName,
        category: 'hiking',
        description: '',
        link: langPrefix + '/hikes/' + hike.id
      };

      bindMarkerClick(marker, map, 11);

      clusterGroup.addLayer(marker);
      allMarkers.push(marker);
      allMarkerData.push(marker._markerData);
      hikeCount++;
      markerIndex++;
    });

    // Fetch encrypted map data
    var basePath = langPrefix || '';
    fetch(basePath + '/map/gf')
      .then(function (r) { return r.json(); })
      .then(function (resp) {
        var data = _decode(resp.d);

        // Add curated map points
        data.p.forEach(function (point) {
          var delay = markerIndex * 30;
          var marker = L.marker([point.a, point.g], {
            icon: createCategoryIcon(point.c, delay)
          });

          marker._category = point.c;
          marker._markerData = {
            name: point.n,
            category: point.c,
            description: point.d || ''
          };

          bindMarkerClick(marker, map, 13);

          clusterGroup.addLayer(marker);
          allMarkers.push(marker);
          allMarkerData.push(marker._markerData);
          markerIndex++;
        });

        // Add geo features
        data.f.forEach(function (feat) {
          var delay = markerIndex * 30;
          var marker = L.marker([feat.a, feat.g], {
            icon: createCategoryIcon(feat.c, delay)
          });

          marker._category = feat.c;
          marker._markerData = {
            name: feat.n,
            category: feat.c,
            description: feat.d || ''
          };

          bindMarkerClick(marker, map, 13);

          clusterGroup.addLayer(marker);
          allMarkers.push(marker);
          allMarkerData.push(marker._markerData);
          markerIndex++;
        });

        map.addLayer(clusterGroup);

        // Set up filtering after data loaded
        setupFiltering(map, allMarkers, clusterGroup);
        setupSearch(map, allMarkers, hikes, data, hikeCount);

        // Trigger entrance animation
        requestAnimationFrame(function () {
          el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        });
      })
      .catch(function (err) {
        console.error('Map data load error:', err);
        map.addLayer(clusterGroup);
        setupFiltering(map, allMarkers, clusterGroup);
        // Still animate in
        requestAnimationFrame(function () {
          el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        });
      });

    return map;
  };

  function setupFiltering(map, allMarkers, clusterGroup) {
    var filterBtns = document.querySelectorAll('.map-filter');
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');

        var cat = btn.getAttribute('data-category');

        // Close info panel when filtering
        closeInfoPanel();

        clusterGroup.clearLayers();
        allMarkers.forEach(function (m) {
          if (cat === 'all' || m._category === cat) {
            clusterGroup.addLayer(m);
          }
        });
      });
    });
  }

  function setupSearch(map, allMarkers, hikes, data, hikeCount) {
    var searchInput = document.getElementById('map-search');
    var searchResults = document.getElementById('map-search-results');
    if (!searchInput || !searchResults) return;

    var searchItems = [];
    var markerOffset = hikeCount;

    // Add curated points
    data.p.forEach(function (p, idx) {
      searchItems.push({
        name: p.n,
        category: p.c,
        emoji: (CATEGORY_ICONS[p.c] || CATEGORY_ICONS.sightseeing).emoji,
        lat: p.a,
        lng: p.g,
        marker: allMarkers[markerOffset + idx]
      });
    });
    markerOffset += data.p.length;

    // Add geo features
    data.f.forEach(function (f, idx) {
      searchItems.push({
        name: f.n,
        category: f.c,
        emoji: (CATEGORY_ICONS[f.c] || CATEGORY_ICONS.sightseeing).emoji,
        lat: f.a,
        lng: f.g,
        marker: allMarkers[markerOffset + idx]
      });
    });

    // Add hikes
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

        var resultEls = searchResults.querySelectorAll('.map-search-result');
        resultEls.forEach(function (el, i) {
          el.addEventListener('click', function () {
            var match = matches[i];
            map.flyTo([match.lat, match.lng], 13, { duration: 1.2 });
            if (match.marker && match.marker._markerData) {
              setTimeout(function () {
                openInfoPanel(match.marker._markerData);
              }, 600);
            }
            searchResults.classList.remove('open');
            searchInput.value = match.name;
          });
        });
      }, 200);
    });

    document.addEventListener('click', function (e) {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.remove('open');
      }
    });

    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        searchResults.classList.remove('open');
        searchInput.blur();
      }
    });
  }
})();
