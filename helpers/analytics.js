import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const analyticsDir = join(__dirname, '..', 'data', 'analytics');

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

let dirEnsured = false;
async function ensureDir() {
  if (dirEnsured) return;
  await mkdir(analyticsDir, { recursive: true });
  dirEnsured = true;
}

// Serialize writes to prevent race conditions under concurrent requests
let writeQueue = Promise.resolve();

export function recordEvent(event) {
  writeQueue = writeQueue.then(async () => {
    await ensureDir();
    const file = join(analyticsDir, `${todayString()}.json`);
    let events = [];
    try {
      events = JSON.parse(await readFile(file, 'utf-8'));
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`Analytics: corrupt file ${file}`, err.message);
      }
    }
    events.push(event);
    await writeFile(file, JSON.stringify(events, null, 2), 'utf-8');
  }).catch(err => {
    console.error('Analytics write failed:', err);
  });
  return writeQueue;
}

export async function readEventsForRange(fromDate, toDate) {
  await ensureDir();
  const files = await readdir(analyticsDir);
  const events = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const date = f.replace('.json', '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (date >= fromDate && date <= toDate) {
      try {
        const data = JSON.parse(await readFile(join(analyticsDir, f), 'utf-8'));
        events.push(...data);
      } catch { /* skip corrupt files */ }
    }
  }
  return events;
}

export function aggregateEvents(events) {
  const pageviews = events.filter(e => e.type === 'pageview');
  const durations = events.filter(e => e.type === 'pageduration');

  // Build duration lookup: sessionId:path -> duration
  const durationMap = {};
  for (const d of durations) {
    durationMap[`${d.sessionId}:${d.path}`] = d.duration;
  }

  // Unique sessions
  const sessionIds = new Set(pageviews.map(e => e.sessionId));

  // Bounce rate: sessions with only 1 pageview
  const sessionPageCounts = {};
  for (const pv of pageviews) {
    sessionPageCounts[pv.sessionId] = (sessionPageCounts[pv.sessionId] || 0) + 1;
  }
  const totalSessions = Object.keys(sessionPageCounts).length;
  const bouncedSessions = Object.values(sessionPageCounts).filter(c => c === 1).length;
  const bounceRate = totalSessions > 0 ? Math.round((bouncedSessions / totalSessions) * 100) : 0;

  // Avg duration
  const allDurations = Object.values(durationMap);
  const avgDuration = allDurations.length > 0
    ? Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length)
    : 0;

  // Traffic sources
  const sources = {};
  for (const pv of pageviews) {
    const src = pv.source || 'direct';
    sources[src] = (sources[src] || 0) + 1;
  }
  const sourceList = Object.entries(sources)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / pageviews.length) * 100) }))
    .sort((a, b) => b.count - a.count);

  // UTM campaigns
  const campaigns = {};
  for (const pv of pageviews) {
    if (pv.utm && pv.utm.campaign) {
      const key = pv.utm.campaign;
      if (!campaigns[key]) campaigns[key] = { campaign: key, source: pv.utm.source || '', medium: pv.utm.medium || '', count: 0 };
      campaigns[key].count++;
    }
  }
  const campaignList = Object.values(campaigns).sort((a, b) => b.count - a.count);

  // Top pages
  const pages = {};
  for (const pv of pageviews) {
    if (!pages[pv.path]) pages[pv.path] = { path: pv.path, views: 0, durations: [], entries: 0, exits: 0 };
    pages[pv.path].views++;
    const dur = durationMap[`${pv.sessionId}:${pv.path}`];
    if (dur !== undefined) pages[pv.path].durations.push(dur);
  }

  // Entry/exit pages: first and last pageview per session (by timestamp)
  const sessionEvents = {};
  for (const pv of pageviews) {
    if (!sessionEvents[pv.sessionId]) sessionEvents[pv.sessionId] = [];
    sessionEvents[pv.sessionId].push(pv);
  }
  for (const evts of Object.values(sessionEvents)) {
    evts.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const entry = evts[0].path;
    const exit = evts[evts.length - 1].path;
    if (pages[entry]) pages[entry].entries++;
    if (pages[exit]) pages[exit].exits++;
  }

  const pageList = Object.values(pages).map(p => ({
    path: p.path,
    views: p.views,
    avgDuration: p.durations.length > 0 ? Math.round(p.durations.reduce((a, b) => a + b, 0) / p.durations.length) : 0,
    entries: p.entries,
    exits: p.exits
  })).sort((a, b) => b.views - a.views);

  // Device types
  const deviceTypes = {};
  const browsers = {};
  const operatingSystems = {};
  const screens = {};
  const connections = {};

  for (const pv of pageviews) {
    if (pv.device) {
      const dt = pv.device.type || 'unknown';
      deviceTypes[dt] = (deviceTypes[dt] || 0) + 1;
      const br = pv.device.browser || 'unknown';
      browsers[br] = (browsers[br] || 0) + 1;
      const os = pv.device.os || 'unknown';
      operatingSystems[os] = (operatingSystems[os] || 0) + 1;
      if (pv.device.screen) screens[pv.device.screen] = (screens[pv.device.screen] || 0) + 1;
      if (pv.device.connection) connections[pv.device.connection] = (connections[pv.device.connection] || 0) + 1;
    }
  }

  const toSortedList = (obj) => Object.entries(obj)
    .map(([name, count]) => ({ name, count, pct: pageviews.length > 0 ? Math.round((count / pageviews.length) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  // Languages
  const languages = {};
  for (const pv of pageviews) {
    const lang = pv.language || 'unknown';
    languages[lang] = (languages[lang] || 0) + 1;
  }

  // User journeys: build path sequences per session
  const journeys = {};
  for (const evts of Object.values(sessionEvents)) {
    const path = evts.map(e => e.path).join(' → ');
    journeys[path] = (journeys[path] || 0) + 1;
  }
  const journeyList = Object.entries(journeys)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    totalPageviews: pageviews.length,
    uniqueVisitors: sessionIds.size,
    avgDuration,
    bounceRate,
    sources: sourceList,
    campaigns: campaignList,
    pages: pageList,
    devices: toSortedList(deviceTypes),
    browsers: toSortedList(browsers),
    operatingSystems: toSortedList(operatingSystems),
    screens: toSortedList(screens),
    connections: toSortedList(connections),
    languages: toSortedList(languages),
    journeys: journeyList
  };
}
