import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from './logger.js';
import { getDb } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

// Map JSON filenames to MongoDB collection names
const COLLECTION_MAP = {
  'hikes.json': 'hikes',
  'guides.json': 'guides',
  'pricing.json': 'pricing',
  'gallery.json': 'gallery',
  'blog.json': 'blog',
  'reviews.json': 'reviews',
  'contact-submissions.json': 'contactSubmissions',
  'registrations.json': 'registrations',
  'booking-inquiries.json': 'bookingInquiries'
};

// Static files always read from disk
const DISK_ONLY = new Set(['translations.json', 'map-points.json']);

function stripId(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest;
}

// Simple in-memory mutex per file (used for filesystem fallback)
const locks = new Map();

async function withLock(filename, fn) {
  while (locks.get(filename)) {
    await locks.get(filename);
  }
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  locks.set(filename, promise);
  try {
    return await fn();
  } finally {
    locks.delete(filename);
    resolve();
  }
}

export async function readJSON(filename) {
  if (!DISK_ONLY.has(filename)) {
    const db = await getDb();
    if (db) {
      const col = COLLECTION_MAP[filename];
      if (col) {
        const docs = await db.collection(col).find().toArray();
        return docs.map(stripId);
      }
    }
  }

  const filepath = join(dataDir, filename);
  try {
    const raw = await readFile(filepath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    log('error', `Failed to read ${filename}`, { error: err.message });
    return [];
  }
}

export async function writeJSON(filename, data) {
  const db = await getDb();
  const col = COLLECTION_MAP[filename];

  if (db && col) {
    const collection = db.collection(col);
    await collection.deleteMany({});
    if (data.length > 0) {
      await collection.insertMany(data);
    }
    return;
  }

  const filepath = join(dataDir, filename);
  await withLock(filename, async () => {
    await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
  });
}

export async function appendJSON(filename, entry) {
  const db = await getDb();
  const col = COLLECTION_MAP[filename];

  if (db && col) {
    const collection = db.collection(col);
    await collection.insertOne(entry);
    const docs = await collection.find().toArray();
    return docs.map(stripId);
  }

  return withLock(filename, async () => {
    const filepath = join(dataDir, filename);
    let data;
    try {
      const raw = await readFile(filepath, 'utf-8');
      data = JSON.parse(raw);
    } catch {
      data = [];
    }
    data.push(entry);
    await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
    return data;
  });
}
