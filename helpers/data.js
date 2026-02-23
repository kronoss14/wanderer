import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

export async function readJSON(filename) {
  const filepath = join(dataDir, filename);
  const raw = await readFile(filepath, 'utf-8');
  return JSON.parse(raw);
}

export async function writeJSON(filename, data) {
  const filepath = join(dataDir, filename);
  await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function appendJSON(filename, entry) {
  let data;
  try {
    data = await readJSON(filename);
  } catch {
    data = [];
  }
  data.push(entry);
  await writeJSON(filename, data);
  return data;
}
