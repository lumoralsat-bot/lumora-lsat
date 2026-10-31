// Cancel the SIGNED-IN student's subscription at the end of the billing period.
// Previously anyone could cancel any subscriber by typing their email; identity now comes from the access token.
import { getAuthUser, getProfileByAuthId, sameOriginOnly } from './_lib/supabase.js';

export default async function handler(req, res) {
  sameOriginOnly(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: 'Payments are not configured.' });
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in again.' });

  const S = (path, init = {}) => fetch('https://api.stripe.com/v1' + path, { ...init, headers: { Authorization: 'Bearer ' + stripeKey, ...(init.headers || {}) } }).then(async r => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));
  try {
    const profile = await getProfileByAuthId(user.id);
    let subId = profile?.stripe_subscription_id || null;
    if (!subId) {
      let customerId = profile?.stripe_customer_id || null;
      if (!customerId) {
        const c = await S(`/customers?email=${encodeURIComponent(user.email)}&limit=5`); // verified email only
        customerId = c.data?.data?.[0]?.id || null;
      }
      if (customerId) {
        for (const status of ['active', 'trialing', 'past_due']) {
          const s = await S(`/subscriptions?customer=${encodeURIComponent(customerId)}&status=${status}&limit=1`);
          if (s.data?.data?.[0]) { subId = s.data.data[0].id; break; }
        }
      }
    }
    if (!subId) return res.status(404).json({ error: 'No active subscription found for your account.' });
    const r = await S(`/subscriptions/${encodeURIComponent(subId)}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'cancel_at_period_end=true' });
    if (!r.ok) { console.warn('[cancel] stripe error'); return res.status(400).json({ error: r.data?.error?.message || 'Cancellation failed.' }); }
    const cancelAt = new Date((r.data.current_period_end || r.data.cancel_at || 0) * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    console.log('[cancel] scheduled');
    return res.status(200).json({ ok: true, cancelAt });
  } catch {
    console.warn('[cancel] error');
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
