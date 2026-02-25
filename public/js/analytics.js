(function() {
  'use strict';

  // ─── Session cookie ───
  function getSessionId() {
    var match = document.cookie.match(/(?:^|;\s*)wanderer_sid=([^;]+)/);
    if (match) return match[1];
    var id = Math.random().toString(16).slice(2, 10);
    setSessionCookie(id);
    return id;
  }

  function setSessionCookie(id) {
    document.cookie = 'wanderer_sid=' + id + '; Path=/; SameSite=Lax; Max-Age=1800';
  }

  // ─── Device detection ───
  function getDeviceType() {
    var w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  function parseBrowser(ua) {
    if (/Edg\/(\d+)/.test(ua)) return 'Edge ' + RegExp.$1;
    if (/OPR\/(\d+)/.test(ua)) return 'Opera ' + RegExp.$1;
    if (/Chrome\/(\d+)/.test(ua)) return 'Chrome ' + RegExp.$1;
    if (/Safari\/.*Version\/(\d+)/.test(ua)) return 'Safari ' + RegExp.$1;
    if (/Firefox\/(\d+)/.test(ua)) return 'Firefox ' + RegExp.$1;
    return 'Other';
  }

  function parseOS(ua) {
    if (/Android (\d+[\d.]*)/.test(ua)) return 'Android ' + RegExp.$1;
    if (/iPhone|iPad/.test(ua)) {
      var m = ua.match(/OS (\d+[_\d]*)/);
      return 'iOS ' + (m ? m[1].replace(/_/g, '.') : '');
    }
    if (/Windows NT 10/.test(ua)) return 'Windows 10+';
    if (/Windows NT/.test(ua)) return 'Windows';
    if (/Mac OS X (\d+[_\d]*)/.test(ua)) return 'macOS ' + RegExp.$1.replace(/_/g, '.');
    if (/Linux/.test(ua)) return 'Linux';
    return 'Other';
  }

  function getDeviceModel() {
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      return '';
    }
    var ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    var m = ua.match(/;\s*([^;)]+)\s*Build\//);
    return m ? m[1].trim() : '';
  }

  // ─── Traffic source ───
  function getSource(referrer) {
    if (!referrer) return 'direct';
    try {
      var host = new URL(referrer).hostname.toLowerCase();
      if (host.includes('google')) return 'google';
      if (host.includes('facebook') || host.includes('fb.com')) return 'facebook';
      if (host.includes('instagram')) return 'instagram';
      if (host.includes('tiktok')) return 'tiktok';
      if (host.includes('twitter') || host.includes('x.com')) return 'twitter';
      if (host.includes('youtube')) return 'youtube';
      if (host.includes('linkedin')) return 'linkedin';
      return host;
    } catch(e) {
      return 'other';
    }
  }

  // ─── UTM params ───
  function getUTM() {
    var params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source') || null,
      medium: params.get('utm_medium') || null,
      campaign: params.get('utm_campaign') || null
    };
  }

  // ─── Send event ───
  function send(payload) {
    var data = JSON.stringify(payload);
    if (payload.type === 'pageduration' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', new Blob([data], { type: 'application/json' }));
      return;
    }
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data
    }).catch(function() { /* silent fail */ });
  }

  // ─── Main ───
  var sessionId = getSessionId();
  setSessionCookie(sessionId); // renew expiry
  var ua = navigator.userAgent;
  var conn = navigator.connection || navigator.mozConnection || null;

  send({
    type: 'pageview',
    sessionId: sessionId,
    path: window.location.pathname,
    referrer: document.referrer,
    source: getSource(document.referrer),
    utm: getUTM(),
    device: {
      type: getDeviceType(),
      browser: parseBrowser(ua),
      os: parseOS(ua),
      screen: screen.width + 'x' + screen.height,
      connection: conn ? conn.effectiveType || '' : '',
      model: getDeviceModel()
    },
    language: (navigator.language || '').slice(0, 10)
  });

  // Track time on page
  var startTime = Date.now();
  var durationSent = false;

  function sendDuration() {
    if (durationSent) return;
    durationSent = true;
    var seconds = Math.round((Date.now() - startTime) / 1000);
    if (seconds < 1) return;
    send({
      type: 'pageduration',
      sessionId: sessionId,
      path: window.location.pathname,
      duration: seconds
    });
  }

  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') sendDuration();
  });
  window.addEventListener('pagehide', sendDuration);
})();
