// Permanently delete the signed-in student's account and data.
// Order: cancel any Stripe subscription (so they are not billed again) → delete the profile row →
// delete the Supabase Auth login. Identity comes only from the verified access token.
import { parseBody, serviceFetch, getAuthUser, getProfileByAuthId, sameOriginOnly } from './_lib/supabase.js';

export default async function handler(req, res) {
  sameOriginOnly(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in again.' });
  const body = parseBody(req) || {};
  if (body.confirm !== 'DELETE') return res.status(400).json({ error: 'Confirmation required.' });

  try {
    const profile = await getProfileByAuthId(user.id);
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (profile?.stripe_subscription_id && stripeKey && ['active', 'trialing', 'past_due'].includes(profile.subscription_status)) {
      const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(profile.stripe_subscription_id)}`, {
        method: 'DELETE', headers: { Authorization: 'Bearer ' + stripeKey },
      });
      if (!r.ok && r.status !== 404) return res.status(502).json({ error: 'Could not cancel your subscription, so nothing was deleted. Please try again or contact support.' });
    }
    if (profile) {
      const d = await serviceFetch(`/rest/v1/users?auth_id=eq.${encodeURIComponent(user.id)}`, { method: 'DELETE', prefer: 'return=minimal' });
      if (!d.ok) throw Object.assign(new Error('profile_delete_failed'), { status: d.status });
    }
    const a = await serviceFetch(`/auth/v1/admin/users/${encodeURIComponent(user.id)}`, { method: 'DELETE' });
    if (!a.ok && a.status !== 404) throw Object.assign(new Error('auth_delete_failed'), { status: a.status });
    console.log('[delete-account] deleted');
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.warn('[delete-account] error', { status: e?.status || 500 });
    return res.status(500).json({ error: 'Deletion did not complete. Please try again or contact support.' });
  }
}
