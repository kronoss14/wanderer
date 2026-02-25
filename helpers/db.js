import { MongoClient } from 'mongodb';

let client = null;
let db = null;

export async function getDb() {
  if (!process.env.MONGODB_URI) return null;
  if (db) return db;

  client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });
  await client.connect();
  db = client.db();
  return db;
}

export async function closeDb() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
