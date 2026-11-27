import crypto from 'crypto';

/**
 * Resolves the configured admin secret on the server only.
 * Never expose or return this value to client components.
 */
export function getConfiguredAdminSecret() {
  return process.env.ADMIN_SESSION_TOKEN || process.env.ADMIN_SECRET_KEY || 'teacher123';
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Verifies admin requests via httpOnly session cookie or x-admin-secret header.
 */
export function verifyAdmin(req) {
  const configured = getConfiguredAdminSecret();
  const token =
    req.cookies.get('admin_session')?.value ||
    req.cookies.get('admin_secret')?.value ||
    req.headers.get('x-admin-secret') ||
    '';

  return Boolean(token) && safeEqual(token, configured);
}
