import { createHmac, timingSafeEqual } from 'node:crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'wanderer-admin-2025';
const SECRET = process.env.COOKIE_SECRET || 'wanderer-hmac-secret-key-2025';
const COOKIE_NAME = 'wanderer_admin';
const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

function sign(value) {
  const sig = createHmac('sha256', SECRET).update(value).digest('base64url');
  return `${value}.${sig}`;
}

function verify(signed) {
  const idx = signed.lastIndexOf('.');
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const expected = sign(value);
  try {
    if (timingSafeEqual(Buffer.from(signed), Buffer.from(expected))) return value;
  } catch { /* length mismatch */ }
  return null;
}

export function checkPassword(password) {
  return password === ADMIN_PASSWORD;
}

export function setAuthCookie(res) {
  const token = sign(`admin:${Date.now()}`);
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/admin; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE / 1000}`
  );
}

export function clearAuthCookie(res) {
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=; Path=/admin; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  header.split(';').forEach(pair => {
    const [name, ...rest] = pair.trim().split('=');
    if (name) cookies[name] = rest.join('=');
  });
  return cookies;
}

export function requireAdmin(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token || !verify(token)) {
    return res.redirect('/admin/login');
  }
  next();
}
