import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

// Simple in-memory mutex per file
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
  const filepath = join(dataDir, filename);
  await withLock(filename, async () => {
    await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
  });
}

export async function appendJSON(filename, entry) {
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
