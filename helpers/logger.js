import { appendFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIT_PATH = join(__dirname, '..', 'data', 'audit-log.json');
const isProd = process.env.NODE_ENV === 'production';

export function log(level, message, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta
  };
  if (isProd && level === 'error') {
    delete entry.stack;
  }
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(entry));
}

export async function audit(action, details = {}) {
  const entry = {
    ts: new Date().toISOString(),
    action,
    ...details
  };
  try {
    await appendFile(AUDIT_PATH, JSON.stringify(entry) + '\n', 'utf-8');
  } catch {
    log('error', 'Failed to write audit log', { action });
  }
}
