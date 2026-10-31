// Server-validated promo codes that grant Pro (replaces the codes that were readable in the website's code).
// Configure in Vercel: PROMO_CODES = comma-separated codes, e.g. "EARLYACCESS,DEMO2026". Leave unset to disable.
// For discounts on paid plans, create Promotion Codes in Stripe instead — Checkout already accepts them.
import crypto from 'node:crypto';
import { parseBody, clientIp, limited, serviceFetch, getAuthUser, sameOriginOnly } from './_lib/supabase.js';

function codeMatches(input) {
  const codes = (process.env.PROMO_CODES || '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
  const a = crypto.createHash('sha256').update(String(input || '').trim().toUpperCase()).digest();
  let hit = false;
  for (const c of codes) { if (crypto.timingSafeEqual(a, crypto.createHash('sha256').update(c).digest())) hit = true; }
  return hit;
}

export default async function handler(req, res) {
  sameOriginOnly(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in again.' });
  if (limited('promo:' + user.id, 5, 60 * 60_000) || limited('promoip:' + clientIp(req), 20, 60 * 60_000)) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  const body = parseBody(req) || {};
  if (typeof body.code !== 'string' || body.code.length > 64 || !codeMatches(body.code)) return res.status(200).json({ ok: false, error: 'Invalid promo code.' });
  const r = await serviceFetch(`/rest/v1/users?auth_id=eq.${encodeURIComponent(user.id)}`, { method: 'PATCH', prefer: 'return=minimal', body: { is_pro: true, subscription_status: 'promo' } });
  if (!r.ok) { console.warn('[redeem-promo] update failed', { status: r.status }); return res.status(500).json({ error: 'Could not apply the code. Please try again.' }); }
  console.log('[redeem-promo] applied');
  return res.status(200).json({ ok: true });
}
