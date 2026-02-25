import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  const raw = await readFile(filepath, 'utf-8');
  return JSON.parse(raw);
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
  await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
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

  let data;
  try {
    data = await readJSON(filename);
  } catch {
    data = [];
  }
  data.push(entry);
  const filepath = join(dataDir, filename);
  await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}
