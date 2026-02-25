#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

const FILES = {
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

async function loadJSON(filename) {
  try {
    const raw = await readFile(join(dataDir, filename), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db();
  console.log('Connected to MongoDB');

  for (const [filename, collectionName] of Object.entries(FILES)) {
    const data = await loadJSON(filename);
    const collection = db.collection(collectionName);

    await collection.deleteMany({});
    if (data.length > 0) {
      const result = await collection.insertMany(data);
      console.log(`  ${collectionName}: inserted ${result.insertedCount} documents`);
    } else {
      console.log(`  ${collectionName}: empty (skipped)`);
    }
  }

  console.log('Seed complete');
  await client.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
