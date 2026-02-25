import bcrypt from 'bcrypt';

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

export async function checkPassword(password) {
  if (!password || !ADMIN_PASSWORD_HASH) return false;
  return bcrypt.compare(password, ADMIN_PASSWORD_HASH);
}

export function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect('/admin/login');
}
