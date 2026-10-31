// Server-only Supabase helpers. Files under api/_lib are not exposed as endpoints by Vercel.
// PRIVACY RULES for everything that imports this file:
//   • The service_role key never leaves the server and is never logged.
//   • Never log emails, names, passwords, tokens, or study content. Log event names and status codes only.
//   • Identity always comes from a verified access token, never from an email in the request body.
import crypto from 'node:crypto';

export function env() {
  return {
    url: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, ''),
    anon: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    service: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

export function parseBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { return null; } }
  return b && typeof b === 'object' ? b : {};
}

export function clientIp(req) {
  return (req.headers?.['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

// Best-effort in-memory limiter (per serverless instance). Keys are hashed so no raw email/IP is retained.
const buckets = new Map();
export function limited(key, max, windowMs) {
  const k = crypto.createHash('sha256').update(String(key)).digest('base64').slice(0, 22);
  const now = Date.now(); const b = buckets.get(k) || { start: now, n: 0 };
  if (now - b.start > windowMs) { b.start = now; b.n = 0; }
  b.n += 1; buckets.set(k, b);
  if (buckets.size > 10000) buckets.clear();
  return b.n > max;
}

/** Call PostgREST / GoTrue admin with the service_role key. */
export async function serviceFetch(path, { method = 'GET', body, prefer } = {}) {
  const { url, service } = env();
  if (!url || !service) throw Object.assign(new Error('server_not_configured'), { status: 503 });
  // Legacy service_role keys are JWTs and go in both headers. New-style secret keys (sb_secret_…) are not JWTs:
  // they belong only in the apikey header.
  const headers = { apikey: service, 'Content-Type': 'application/json' };
  if (service.startsWith('eyJ')) headers.Authorization = 'Bearer ' + service;
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(url + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  return { ok: r.ok, status: r.status, data };
}

/** Verify the caller's Supabase access token. Returns {id, email, emailConfirmed} or null. */
export async function getAuthUser(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return null;
  const { url, anon } = env();
  if (!url || !anon) return null;
  try {
    const r = await fetch(url + '/auth/v1/user', { headers: { apikey: anon, Authorization: 'Bearer ' + m[1] } });
    if (!r.ok) return null;
    const u = await r.json();
    if (!u?.id) return null;
    return { id: u.id, email: (u.email || '').toLowerCase(), emailConfirmed: !!(u.email_confirmed_at || u.confirmed_at) };
  } catch { return null; }
}

/** Load the caller's profile row (server view, includes billing ids). */
export async function getProfileByAuthId(authId, select = 'id,email,is_pro,stripe_customer_id,stripe_subscription_id,subscription_status') {
  const r = await serviceFetch(`/rest/v1/users?auth_id=eq.${encodeURIComponent(authId)}&select=${select}&limit=1`);
  return r.ok && Array.isArray(r.data) ? r.data[0] || null : null;
}

// ── Legacy password check (the app's old client-side scheme), used ONLY to migrate accounts. ──
// Old scheme: sha256("lumora_v1_" + password.length + password) as hex; very old accounts stored plaintext.
export function verifyLegacyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string' || !stored) return false;
  const isHash = stored.length === 64 && /^[0-9a-f]+$/i.test(stored);
  const candidate = isHash
    ? crypto.createHash('sha256').update('lumora_v1_' + password.length + password, 'utf8').digest('hex')
    : password;
  const a = Buffer.from(candidate, 'utf8');
  const b = Buffer.from(isHash ? stored.toLowerCase() : stored, 'utf8');
  if (a.length !== b.length) { crypto.timingSafeEqual(b, b); return false; }
  return crypto.timingSafeEqual(a, b);
}

export function isEmail(s) { return typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

export function sameOriginOnly(res) {
  // No permissive CORS: endpoints are called from this site only.
  res.setHeader('Cache-Control', 'no-store');
}
