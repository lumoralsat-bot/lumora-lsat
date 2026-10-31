// Creates a Stripe Checkout session for the SIGNED-IN student.
// Identity comes from the verified access token (not from the request body). Price ids are allow-listed and
// redirect URLs are fixed to this site, so the endpoint cannot be used to bill someone else or redirect elsewhere.
import { parseBody, getAuthUser, sameOriginOnly } from './_lib/supabase.js';

export default async function handler(req, res) {
  sameOriginOnly(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: 'Payments are not configured.' });

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in again.' });

  const body = parseBody(req) || {};
  const allowed = [process.env.STRIPE_PRICE_MONTHLY || process.env.VITE_STRIPE_PRICE_MONTHLY, process.env.STRIPE_PRICE_YEARLY || process.env.VITE_STRIPE_PRICE_YEARLY].filter(Boolean);
  if (!body.priceId || !allowed.includes(body.priceId)) return res.status(400).json({ error: 'Unknown plan.' });

  const origin = siteOrigin(req);
  if (!origin) return res.status(400).json({ error: 'Bad origin.' });

  const params = new URLSearchParams();
  params.append('mode', 'subscription');
  params.append('customer_email', user.email);
  params.append('client_reference_id', user.id); // lets the webhook link payment → account without trusting emails
  params.append('success_url', origin + '/?checkout=success');
  params.append('cancel_url', origin + '/?checkout=cancelled');
  params.append('allow_promotion_codes', 'true');
  params.append('line_items[0][price]', body.priceId);
  params.append('line_items[0][quantity]', '1');
  params.append('subscription_data[metadata][auth_id]', user.id);

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + stripeKey, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2023-10-16' },
      body: params.toString(),
    });
    const session = await r.json().catch(() => ({}));
    if (!r.ok || !session.url) { console.warn('[checkout] stripe error', { status: r.status }); return res.status(400).json({ error: session.error?.message || 'Could not start checkout.' }); }
    return res.status(200).json({ url: session.url });
  } catch {
    console.warn('[checkout] network error');
    return res.status(502).json({ error: 'Could not reach the payment provider.' });
  }
}

function siteOrigin(req) {
  const configured = (process.env.SITE_URL || '').replace(/\/+$/, '');
  if (configured) return configured;
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host;
  if (!host) return null;
  const proto = req.headers?.['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}
