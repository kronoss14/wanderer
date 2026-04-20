(function () {
  'use strict';

  var DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  var DARK_ATTR = '&copy; OpenStreetMap &copy; CARTO';

  var CATEGORY_ICONS = {
    hiking:      { emoji: '\uD83E\uDD7E', color: '#E8811A' },
    sightseeing: { emoji: '\uD83D\uDCCD', color: '#3B82F6' },
    monastery:   { emoji: '\u26EA',       color: '#A855F7' },
    fortress:    { emoji: '\uD83C\uDFF0', color: '#EF4444' },
    canyon:      { emoji: '\uD83C\uDFDE\uFE0F', color: '#10B981' },
    waterfall:   { emoji: '\uD83D\uDCA7', color: '#06B6D4' },
    cave:        { emoji: '\uD83D\uDD73\uFE0F', color: '#6B7280' },
    stone:       { emoji: '\uD83E\uDEA8', color: '#8B7355' },
    volcano:     { emoji: '\uD83C\uDF0B', color: '#D4380D' },
    nature:      { emoji: '\uD83C\uDF3F', color: '#52C41A' }
  };

  var TP_ICONS = {
    water: '\uD83D\uDCA7', campsite: '\u26FA', pass: '\uD83C\uDFD4\uFE0F',
    toilet: '\uD83D\uDEBB', viewpoint: '\uD83D\uDC41\uFE0F', shelter: '\uD83D\uDED6',
    danger: '\u26A0\uFE0F', parking: '\uD83C\uDD7F\uFE0F', food: '\uD83C\uDF7D\uFE0F',
    start: '\uD83D\uDFE2', end: '\uD83D\uDD34', photo_spot: '\uD83D\uDCF8',
    historical: '\uD83C\uDFDB\uFE0F', bridge: '\uD83C\uDF09', cave: '\uD83D\uDD73\uFE0F'
  };

  var csrfToken = document.querySelector('input[name="_csrf"]').value;
  var points = window.__MAP_POINTS__ || [];
  var hikes = window.__HIKES__ || [];

  // State
  var map, pointMarkers = [], trailLayer = null, trailPointMarkers = [];
  var selectedHikeId = null, currentTrailCoords = [], currentTrailPoints = [];
  var drawingMode = false, drawLayer = null;
  var clickMode = null; // 'point', 'trailpoint', or null

  // ─── Init Map ───
  map = L.map('adminMap', { zoomControl: true }).setView([42.3, 43.5], 8);
  L.tileLayer(DARK_TILE, { attribution: DARK_ATTR, maxZoom: 19 }).addTo(map);

  // Draw control group
  var drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  // ─── Render existing map points ───
  function createCatIcon(cat) {
    var info = CATEGORY_ICONS[cat] || CATEGORY_ICONS.sightseeing;
    return L.divIcon({
      html: '<div style="background:' + info.color + ';width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)">' + info.emoji + '</div>',
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }

  function renderPoints() {
    pointMarkers.forEach(function (m) { map.removeLayer(m); });
    pointMarkers = [];
    points.forEach(function (p) {
      var m = L.marker([p.lat, p.lng], { icon: createCatIcon(p.category) })
        .addTo(map)
        .bindPopup('<strong>' + (p.name_en || p.name) + '</strong><br>' + p.category);
      m._pointId = p.id;
      m.on('click', function () { openPointModal(p); });
      pointMarkers.push(m);
    });
  }
  renderPoints();

  // Render existing hike trails
  function renderHikeTrails() {
    hikes.forEach(function (h) {
      if (h.route && h.route.coordinates && h.route.coordinates.length) {
        L.polyline(h.route.coordinates, {
          color: '#E8811A', weight: 3, opacity: 0.35, dashArray: '8,4'
        }).addTo(map);
      }
    });
  }
  renderHikeTrails();

  // ─── Tabs ───
  var tabBtns = document.querySelectorAll('.map-tabs button');
  var panels = {
    points: document.getElementById('panel-points'),
    trails: document.getElementById('panel-trails'),
    trailpoints: document.getElementById('panel-trailpoints')
  };
  var pointsActions = document.getElementById('pointsActions');

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var tab = btn.getAttribute('data-tab');
      Object.keys(panels).forEach(function (k) {
        panels[k].classList.toggle('active', k === tab);
      });
      pointsActions.style.display = tab === 'points' ? '' : 'none';
    });
  });

  // ─── Map click handler ───
  map.on('click', function (e) {
    if (drawingMode) return;
    if (clickMode === 'point') {
      clickMode = null;
      document.getElementById('adminMap').style.cursor = '';
      openPointModal({ lat: e.latlng.lat, lng: e.latlng.lng });
    } else if (clickMode === 'trailpoint') {
      clickMode = null;
      document.getElementById('adminMap').style.cursor = '';
      openTrailPointModal({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });

  // ─── Add Point button ───
  document.getElementById('addPointBtn').addEventListener('click', function () {
    clickMode = 'point';
    document.getElementById('adminMap').style.cursor = 'crosshair';
  });

  // ─── Point list clicks ───
  document.querySelectorAll('.point-list-item').forEach(function (el) {
    el.addEventListener('click', function () {
      var id = el.getAttribute('data-id');
      var p = points.find(function (pt) { return pt.id === id; });
      if (p) {
        map.flyTo([p.lat, p.lng], 13, { duration: 0.8 });
        openPointModal(p);
      }
    });
  });

  // ─── Point Modal ───
  var pointModal = document.getElementById('pointModal');
  var pointForm = document.getElementById('pointForm');
  var pointPhotos = [];

  function openPointModal(data) {
    data = data || {};
    var isEdit = !!data.id;
    document.getElementById('pointModalTitle').textContent = isEdit ? 'Edit Map Point' : 'Add Map Point';
    document.getElementById('deletePointBtn').style.display = isEdit ? '' : 'none';

    pointForm.name.value = data.name || '';
    pointForm.name_en.value = data.name_en || '';
    pointForm.category.value = data.category || 'hiking';
    pointForm.desc.value = data.desc || '';
    pointForm.desc_en.value = data.desc_en || '';
    pointForm.linkedHikeId.value = data.linkedHikeId || '';
    pointForm.lat.value = data.lat != null ? data.lat : '';
    pointForm.lng.value = data.lng != null ? data.lng : '';
    pointForm.id.value = data.id || '';
    pointPhotos = data.photos ? data.photos.slice() : [];
    renderPointPhotos();
    pointModal.classList.add('open');
  }

  function closePointModal() {
    pointModal.classList.remove('open');
    pointPhotos = [];
  }

  document.getElementById('cancelPointBtn').addEventListener('click', closePointModal);
  pointModal.addEventListener('click', function (e) {
    if (e.target === pointModal) closePointModal();
  });

  function renderPointPhotos() {
    var area = document.getElementById('pointPhotosArea');
    var thumbs = area.querySelectorAll('.photo-thumb');
    thumbs.forEach(function (t) { t.remove(); });
    var uploadWrap = area.querySelector('.upload-wrap');
    pointPhotos.forEach(function (url) {
      var img = document.createElement('img');
      img.className = 'photo-thumb';
      img.src = url;
      area.insertBefore(img, uploadWrap);
    });
    pointForm.photos.value = JSON.stringify(pointPhotos);
  }

  // Photo upload for points
  var pointUploadBtn = document.getElementById('pointUploadBtn');
  var pointFileInput = document.getElementById('pointFileInput');
  var pointUploadStatus = document.getElementById('pointUploadStatus');

  pointUploadBtn.addEventListener('click', function () { pointFileInput.click(); });
  pointFileInput.addEventListener('change', function () {
    var files = Array.from(this.files);
    if (!files.length) return;
    var done = 0;
    pointUploadStatus.textContent = 'Uploading 0/' + files.length + '...';
    files.forEach(function (file) {
      uploadFile(file, function (url) {
        pointPhotos.push(url);
        done++;
        pointUploadStatus.textContent = done === files.length ? 'Done' : 'Uploading ' + done + '/' + files.length + '...';
        renderPointPhotos();
      }, pointUploadStatus);
    });
    this.value = '';
  });

  // Save point
  pointForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var body = {
      id: pointForm.id.value || '',
      name: pointForm.name.value,
      name_en: pointForm.name_en.value,
      category: pointForm.category.value,
      lat: parseFloat(pointForm.lat.value),
      lng: parseFloat(pointForm.lng.value),
      desc: pointForm.desc.value,
      desc_en: pointForm.desc_en.value,
      linkedHikeId: pointForm.linkedHikeId.value,
      photos: pointPhotos
    };

    fetch('/admin/map/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify(body)
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.ok) {
          window.location.reload();
        } else {
          alert(res.error || 'Save failed');
        }
      })
      .catch(function () { alert('Save failed'); });
  });

  // Delete point
  document.getElementById('deletePointBtn').addEventListener('click', function () {
    var id = pointForm.id.value;
    if (!id || !confirm('Delete this map point?')) return;
    fetch('/admin/map/points/delete/' + encodeURIComponent(id), {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken }
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.ok) window.location.reload();
        else alert(res.error || 'Delete failed');
      })
      .catch(function () { alert('Delete failed'); });
  });

  // ─── Trails Tab ───
  var hikeSelect = document.getElementById('hikeSelect');
  var drawTrailBtn = document.getElementById('drawTrailBtn');
  var clearTrailBtn = document.getElementById('clearTrailBtn');
  var saveTrailBtn = document.getElementById('saveTrailBtn');
  var deleteTrailBtn = document.getElementById('deleteTrailBtn');
  var trailInfo = document.getElementById('trailInfo');

  hikeSelect.addEventListener('change', function () {
    selectedHikeId = this.value;
    if (!selectedHikeId) {
      drawTrailBtn.disabled = true;
      clearTrailBtn.disabled = true;
      saveTrailBtn.disabled = true;
      deleteTrailBtn.disabled = true;
      trailInfo.textContent = 'Select a hike to begin.';
      clearCurrentTrail();
      updateTrailPointsPanel();
      return;
    }

    drawTrailBtn.disabled = false;
    var hike = hikes.find(function (h) { return h.id === selectedHikeId; });
    if (hike && hike.route && hike.route.coordinates && hike.route.coordinates.length) {
      currentTrailCoords = hike.route.coordinates.slice();
      currentTrailPoints = hike.route.trailPoints ? hike.route.trailPoints.slice() : [];
      trailInfo.textContent = currentTrailCoords.length + ' coordinates loaded.';
      deleteTrailBtn.disabled = false;
      clearTrailBtn.disabled = false;
      saveTrailBtn.disabled = false;
      renderCurrentTrail();
    } else {
      currentTrailCoords = [];
      currentTrailPoints = [];
      trailInfo.textContent = 'No trail data. Click "Draw Trail" to start.';
      deleteTrailBtn.disabled = true;
      clearCurrentTrail();
    }
    updateTrailPointsPanel();
    document.getElementById('addTrailPointBtn').disabled = currentTrailCoords.length === 0;
  });

  function clearCurrentTrail() {
    if (trailLayer) { map.removeLayer(trailLayer); trailLayer = null; }
    trailPointMarkers.forEach(function (m) { map.removeLayer(m); });
    trailPointMarkers = [];
    currentTrailCoords = [];
    currentTrailPoints = [];
  }

  function renderCurrentTrail() {
    if (trailLayer) map.removeLayer(trailLayer);
    trailPointMarkers.forEach(function (m) { map.removeLayer(m); });
    trailPointMarkers = [];

    if (currentTrailCoords.length > 1) {
      trailLayer = L.polyline(currentTrailCoords, {
        color: '#E8811A', weight: 4, opacity: 0.9
      }).addTo(map);
      map.fitBounds(trailLayer.getBounds(), { padding: [50, 50] });
    }

    currentTrailPoints.forEach(function (tp, idx) {
      var emoji = TP_ICONS[tp.type] || '\uD83D\uDCCD';
      var m = L.marker([tp.lat, tp.lng], {
        icon: L.divIcon({
          html: '<span style="font-size:1.4rem">' + emoji + '</span>',
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(map).bindPopup('<strong>' + (tp.name_en || tp.name) + '</strong><br>' + tp.type);
      m.on('click', function () { openTrailPointModal(tp, idx); });
      trailPointMarkers.push(m);
    });
  }

  // Draw trail
  drawTrailBtn.addEventListener('click', function () {
    if (drawingMode) return;
    drawingMode = true;
    drawTrailBtn.disabled = true;
    trailInfo.textContent = 'Click on map to draw trail. Double-click to finish.';

    var polyDrawer = new L.Draw.Polyline(map, {
      shapeOptions: { color: '#E8811A', weight: 4, opacity: 0.9 },
      allowIntersection: true
    });
    polyDrawer.enable();

    map.once('draw:created', function (e) {
      drawingMode = false;
      drawTrailBtn.disabled = false;
      var layer = e.layer;
      var latlngs = layer.getLatLngs();
      currentTrailCoords = latlngs.map(function (ll) { return [ll.lat, ll.lng]; });
      trailInfo.textContent = currentTrailCoords.length + ' points drawn.';
      clearTrailBtn.disabled = false;
      saveTrailBtn.disabled = false;
      renderCurrentTrail();
      document.getElementById('addTrailPointBtn').disabled = false;
    });
  });

  // Clear trail
  clearTrailBtn.addEventListener('click', function () {
    clearCurrentTrail();
    trailInfo.textContent = 'Trail cleared. Click "Draw Trail" to redraw.';
    clearTrailBtn.disabled = true;
    saveTrailBtn.disabled = true;
    document.getElementById('addTrailPointBtn').disabled = true;
    updateTrailPointsPanel();
  });

  // Save trail
  saveTrailBtn.addEventListener('click', function () {
    if (!selectedHikeId) return;
    var body = {
      hikeId: selectedHikeId,
      trail: currentTrailCoords,
      trailPoints: currentTrailPoints
    };
    fetch('/admin/map/trail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify(body)
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.ok) {
          trailInfo.textContent = 'Trail saved successfully!';
          // Update local hike data
          var hike = hikes.find(function (h) { return h.id === selectedHikeId; });
          if (hike) {
            hike.route = { coordinates: currentTrailCoords, trailPoints: currentTrailPoints };
          }
          deleteTrailBtn.disabled = false;
        } else {
          alert(res.error || 'Save failed');
        }
      })
      .catch(function () { alert('Save failed'); });
  });

  // Delete trail
  deleteTrailBtn.addEventListener('click', function () {
    if (!selectedHikeId || !confirm('Delete trail data for this hike?')) return;
    fetch('/admin/map/trail/delete/' + encodeURIComponent(selectedHikeId), {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken }
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.ok) {
          clearCurrentTrail();
          trailInfo.textContent = 'Trail deleted.';
          deleteTrailBtn.disabled = true;
          clearTrailBtn.disabled = true;
          saveTrailBtn.disabled = true;
          var hike = hikes.find(function (h) { return h.id === selectedHikeId; });
          if (hike) hike.route = {};
          document.getElementById('addTrailPointBtn').disabled = true;
          updateTrailPointsPanel();
        } else {
          alert(res.error || 'Delete failed');
        }
      })
      .catch(function () { alert('Delete failed'); });
  });

  // ─── Trail Points Tab ───
  var addTrailPointBtn = document.getElementById('addTrailPointBtn');
  addTrailPointBtn.addEventListener('click', function () {
    clickMode = 'trailpoint';
    document.getElementById('adminMap').style.cursor = 'crosshair';
  });

  function updateTrailPointsPanel() {
    var list = document.getElementById('trailPointsList');
    if (!selectedHikeId || currentTrailCoords.length === 0) {
      list.innerHTML = '<div class="empty-state">Select a hike with a trail first.</div>';
      return;
    }
    if (currentTrailPoints.length === 0) {
      list.innerHTML = '<div class="empty-state">No trail points. Click "+ Add Trail Point" then click on the map.</div>';
      return;
    }
    list.innerHTML = currentTrailPoints.map(function (tp, idx) {
      var emoji = TP_ICONS[tp.type] || '\uD83D\uDCCD';
      return '<div class="trail-point-item" data-idx="' + idx + '">' +
        '<span>' + emoji + ' ' + (tp.name_en || tp.name) + '</span>' +
        '<div style="font-size:0.72rem;color:var(--admin-text-muted)">' + tp.type +
        (tp.elevation ? ' &middot; ' + tp.elevation + 'm' : '') + '</div></div>';
    }).join('');

    list.querySelectorAll('.trail-point-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var idx = parseInt(el.getAttribute('data-idx'));
        var tp = currentTrailPoints[idx];
        if (tp) {
          map.flyTo([tp.lat, tp.lng], 14, { duration: 0.6 });
          openTrailPointModal(tp, idx);
        }
      });
    });
  }

  // ─── Trail Point Modal ───
  var tpModal = document.getElementById('trailPointModal');
  var tpForm = document.getElementById('trailPointForm');
  var tpPhotos = [];

  function openTrailPointModal(data, idx) {
    data = data || {};
    var isEdit = idx != null && idx >= 0;
    document.getElementById('trailPointModalTitle').textContent = isEdit ? 'Edit Trail Point' : 'Add Trail Point';
    document.getElementById('deleteTrailPointBtn').style.display = isEdit ? '' : 'none';

    tpForm.type.value = data.type || 'water';
    tpForm.name.value = data.name || '';
    tpForm.name_en.value = data.name_en || '';
    tpForm.desc.value = data.desc || '';
    tpForm.desc_en.value = data.desc_en || '';
    tpForm.elevation.value = data.elevation || '';
    tpForm.lat.value = data.lat != null ? data.lat : '';
    tpForm.lng.value = data.lng != null ? data.lng : '';
    tpForm.tpIndex.value = isEdit ? idx : -1;
    tpPhotos = data.photos ? data.photos.slice() : [];
    renderTpPhotos();
    tpModal.classList.add('open');
  }

  function closeTpModal() {
    tpModal.classList.remove('open');
    tpPhotos = [];
  }

  document.getElementById('cancelTrailPointBtn').addEventListener('click', closeTpModal);
  tpModal.addEventListener('click', function (e) {
    if (e.target === tpModal) closeTpModal();
  });

  function renderTpPhotos() {
    var area = document.getElementById('tpPhotosArea');
    var thumbs = area.querySelectorAll('.photo-thumb');
    thumbs.forEach(function (t) { t.remove(); });
    var uploadWrap = area.querySelector('.upload-wrap');
    tpPhotos.forEach(function (url) {
      var img = document.createElement('img');
      img.className = 'photo-thumb';
      img.src = url;
      area.insertBefore(img, uploadWrap);
    });
    tpForm.photos.value = JSON.stringify(tpPhotos);
  }

  // Photo upload for trail points
  var tpUploadBtn = document.getElementById('tpUploadBtn');
  var tpFileInput = document.getElementById('tpFileInput');
  var tpUploadStatus = document.getElementById('tpUploadStatus');

  tpUploadBtn.addEventListener('click', function () { tpFileInput.click(); });
  tpFileInput.addEventListener('change', function () {
    var files = Array.from(this.files);
    if (!files.length) return;
    var done = 0;
    tpUploadStatus.textContent = 'Uploading 0/' + files.length + '...';
    files.forEach(function (file) {
      uploadFile(file, function (url) {
        tpPhotos.push(url);
        done++;
        tpUploadStatus.textContent = done === files.length ? 'Done' : 'Uploading ' + done + '/' + files.length + '...';
        renderTpPhotos();
      }, tpUploadStatus);
    });
    this.value = '';
  });

  // Save trail point
  tpForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var idx = parseInt(tpForm.tpIndex.value);
    var tp = {
      type: tpForm.type.value,
      name: tpForm.name.value,
      name_en: tpForm.name_en.value,
      desc: tpForm.desc.value,
      desc_en: tpForm.desc_en.value,
      lat: parseFloat(tpForm.lat.value),
      lng: parseFloat(tpForm.lng.value),
      elevation: tpForm.elevation.value ? parseFloat(tpForm.elevation.value) : null,
      photos: tpPhotos
    };

    if (idx >= 0 && idx < currentTrailPoints.length) {
      currentTrailPoints[idx] = tp;
    } else {
      currentTrailPoints.push(tp);
    }

    closeTpModal();
    renderCurrentTrail();
    updateTrailPointsPanel();
    // Enable save since we changed data
    saveTrailBtn.disabled = false;
  });

  // Delete trail point
  document.getElementById('deleteTrailPointBtn').addEventListener('click', function () {
    var idx = parseInt(tpForm.tpIndex.value);
    if (idx < 0 || !confirm('Delete this trail point?')) return;
    currentTrailPoints.splice(idx, 1);
    closeTpModal();
    renderCurrentTrail();
    updateTrailPointsPanel();
    saveTrailBtn.disabled = false;
  });

  // ─── Shared upload helper ───
  function uploadFile(file, onSuccess, statusEl) {
    if (file.size > 10 * 1024 * 1024) {
      statusEl.textContent = 'File too large (max 10 MB)';
      statusEl.className = 'upload-status upload-error';
      return;
    }
    var formData = new FormData();
    formData.append('file', file);
    fetch('/admin/upload', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
      body: formData
    })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (json.url) {
          onSuccess(json.url);
        } else {
          statusEl.textContent = json.error || 'Upload failed';
          statusEl.className = 'upload-status upload-error';
        }
      })
      .catch(function () {
        statusEl.textContent = 'Upload failed';
        statusEl.className = 'upload-status upload-error';
      });
  }

  // ─── Keyboard shortcuts ───
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closePointModal();
      closeTpModal();
      if (clickMode) {
        clickMode = null;
        document.getElementById('adminMap').style.cursor = '';
      }
    }
  });

})();
